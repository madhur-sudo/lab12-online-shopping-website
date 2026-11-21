/**
 * cart.js — Morrow Supply Cart Page
 * Loads cart from localStorage, retrieves live product data from XML,
 * renders cart rows, handles qty changes, removal, and totals.
 * Depends on: main.js, products.js
 */

(function () {
  'use strict';

  /* ─── Init ──────────────────────────────────────────────────────────────── */

  document.addEventListener('DOMContentLoaded', async function () {
    try {
      var xmlDoc = await loadXML();
      bindCartEvents(xmlDoc);
      renderCart(xmlDoc);
    } catch (err) {
      console.error('[Morrow Supply] Cart XML error:', err);
      showCartError();
    }
  });

  /* ─── Render Cart ───────────────────────────────────────────────────────── */

  function renderCart(xmlDoc) {
    var cartObj   = getCart();          // { productId: quantity }
    var cartItems = document.getElementById('cart-items');
    var cartLayout = document.getElementById('cart-layout');
    var sidebar    = document.getElementById('cart-summary-sidebar');

    // Remove loading state
    var loading = document.getElementById('cart-loading');
    if (loading) loading.remove();

    var ids = Object.keys(cartObj);

    // ── Empty cart ──────────────────────────────────────────────────────────
    if (ids.length === 0) {
      if (cartItems) {
        cartItems.innerHTML = buildEmptyCartHTML();
      }
      if (sidebar) sidebar.hidden = true;
      return;
    }

    // ── Build cart rows ─────────────────────────────────────────────────────
    var rowsHTML = '';
    var subtotal = 0;
    var validCart = {};

    ids.forEach(function (id) {
      var product = findProductById(xmlDoc, id);
      if (!product || product.stock <= 0) return;

      var qty = parseInt(cartObj[id], 10) || 1;
      // Clamp qty to available stock
      qty = Math.max(1, Math.min(qty, product.stock));
      validCart[id] = qty;

      var lineTotal = product.price * qty;
      subtotal += lineTotal;

      rowsHTML += buildCartRowHTML(product, qty, lineTotal);
    });

    // If cart had stale IDs, clean them up
      saveCart(validCart);
    updateCartCount();

    if (!rowsHTML) {
      // All products were stale
      if (cartItems) cartItems.innerHTML = buildEmptyCartHTML();
      if (sidebar) sidebar.hidden = true;
      return;
    }

    // ── Render rows ─────────────────────────────────────────────────────────
    if (cartItems) {
      cartItems.innerHTML =
        '<div class="cart-header-row">' +
          '<span class="cart-col-product">Product</span>' +
          '<span class="cart-col-price">Price</span>' +
          '<span class="cart-col-qty">Qty</span>' +
          '<span class="cart-col-total">Total</span>' +
          '<span class="cart-col-remove"></span>' +
        '</div>' +
        rowsHTML;
    }

    // ── Totals ───────────────────────────────────────────────────────────────
    var shipping = subtotal >= SHIPPING_THRESHOLD ? 0 : SHIPPING_CHARGE;
    var total    = subtotal + shipping;

    setElement('summary-subtotal', formatINR(subtotal));
    setElement('summary-shipping', shipping === 0
      ? '<span class="free-delivery-label">Free</span>'
      : formatINR(shipping)
    );
    setElement('summary-total', formatINR(total));

    // Delivery note
    var noteEl = document.getElementById('delivery-note');
    if (noteEl) {
      if (shipping === 0) {
        noteEl.innerHTML = '<span class="delivery-free-msg">✓ Free delivery applied</span>';
      } else {
        var needed = SHIPPING_THRESHOLD - subtotal;
        noteEl.textContent = 'Add ' + formatINR(needed) + ' more for free delivery.';
      }
    }

    // Show sidebar
    if (sidebar) sidebar.hidden = false;

  }

  /* ─── Delegate events on cart items (bound once) ───────────────────────── */

  var _cartEventsBound = false;
  function bindCartEvents(xmlDoc) {
    if (_cartEventsBound) return;
    _cartEventsBound = true;

    var cartItems = document.getElementById('cart-items');
    if (!cartItems) return;

    cartItems.addEventListener('click', function (e) {
      var cartObj = getCart();

      // Decrease button
      var decreaseBtn = e.target.closest('.qty-decrease-btn[data-id]');
      if (decreaseBtn) {
        var id = decreaseBtn.dataset.id;
        var cur = parseInt(cartObj[id], 10) || 1;
        if (cur > 1) {
          cartObj[id] = cur - 1;
          saveCart(cartObj);
          renderCart(xmlDoc);
        }
        return;
      }

      // Increase button
      var increaseBtn = e.target.closest('.qty-increase-btn[data-id]');
      if (increaseBtn) {
        var id = increaseBtn.dataset.id;
        var product = findProductById(xmlDoc, id);
        if (!product) return;
        var cur = parseInt(cartObj[id], 10) || 1;
        if (cur < product.stock) {
          cartObj[id] = cur + 1;
          saveCart(cartObj);
          renderCart(xmlDoc);
        } else {
          showToast('Maximum stock reached for this item (' + product.stock + ' available).');
        }
        return;
      }

      // Remove button
      var removeBtn = e.target.closest('.cart-remove-btn[data-id]');
      if (removeBtn) {
        var id = removeBtn.dataset.id;
        delete cartObj[id];
        saveCart(cartObj);
        renderCart(xmlDoc);
        showToast('Item removed from cart.');
        return;
      }
    });
  }

  /* ─── Build HTML ─────────────────────────────────────────────────────────── */

  function buildCartRowHTML(product, qty, lineTotal) {
    var esc = function (s) {
      return String(s || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    };

    return (
      '<div class="cart-row" data-id="' + esc(product.id) + '">' +

        '<div class="cart-col-product cart-product-info">' +
          '<a href="./product.html?id=' + encodeURIComponent(product.id) + '" class="cart-product-img-link">' +
            '<img src="' + esc(product.image) + '" alt="' + esc(product.name) + '" class="cart-product-img" onerror="this.src=\'./assets/images/placeholder.svg\'" />' +
          '</a>' +
          '<div class="cart-product-text">' +
            '<a href="./product.html?id=' + encodeURIComponent(product.id) + '" class="cart-product-name">' + esc(product.name) + '</a>' +
            '<span class="cart-product-category">' + esc(product.category) + '</span>' +
          '</div>' +
        '</div>' +

        '<div class="cart-col-price" data-label="Price">' +
          '<span class="cart-unit-price">' + formatINR(product.price) + '</span>' +
        '</div>' +

        '<div class="cart-col-qty" data-label="Qty">' +
          '<div class="cart-qty-controls">' +
            '<button class="qty-decrease-btn" data-id="' + esc(product.id) + '" aria-label="Decrease quantity" ' + (qty <= 1 ? 'disabled' : '') + '>−</button>' +
            '<span class="cart-qty-num">' + qty + '</span>' +
            '<button class="qty-increase-btn" data-id="' + esc(product.id) + '" aria-label="Increase quantity" ' + (qty >= product.stock ? 'disabled' : '') + '>+</button>' +
          '</div>' +
        '</div>' +

        '<div class="cart-col-total" data-label="Total">' +
          '<span class="cart-line-total">' + formatINR(lineTotal) + '</span>' +
        '</div>' +

        '<div class="cart-col-remove">' +
          '<button class="cart-remove-btn" data-id="' + esc(product.id) + '" aria-label="Remove ' + esc(product.name) + ' from cart">' +
            '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">' +
              '<path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 9h8l1-9" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>' +
            '</svg>' +
          '</button>' +
        '</div>' +

      '</div>'
    );
  }

  function buildEmptyCartHTML() {
    return (
      '<div class="empty-cart-state">' +
        '<svg width="56" height="56" viewBox="0 0 56 56" fill="none" aria-hidden="true">' +
          '<circle cx="28" cy="28" r="27" stroke="currentColor" stroke-width="1.5" opacity="0.2"/>' +
          '<path d="M12 16h4l4.8 21.6a2 2 0 0 0 2 1.4h16.4a2 2 0 0 0 2-1.6L44 26H18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>' +
          '<circle cx="22" cy="43" r="2" fill="currentColor"/>' +
          '<circle cx="38" cy="43" r="2" fill="currentColor"/>' +
        '</svg>' +
        '<h2 class="empty-cart-heading">Your cart is empty</h2>' +
        '<p class="empty-cart-text">You haven\'t added anything yet. Head to the shop to find something useful.</p>' +
        '<a href="./shop.html" class="btn btn-primary">Browse the Shop</a>' +
      '</div>'
    );
  }

  /* ─── Error State ────────────────────────────────────────────────────────── */

  function showCartError() {
    var cartItems = document.getElementById('cart-items');
    var sidebar   = document.getElementById('cart-summary-sidebar');
    if (cartItems) {
      cartItems.innerHTML =
        '<div class="empty-state error-state">' +
          '<p>We couldn\'t load product information right now. Please refresh the page.</p>' +
          '<button class="btn btn-outline" id="cart-refresh-btn">Refresh</button>' +
        '</div>';
    }
    var refresh = document.getElementById('cart-refresh-btn');
    if (refresh) refresh.addEventListener('click', function () { location.reload(); });
    if (sidebar) sidebar.hidden = true;
  }

  /* ─── Helper ─────────────────────────────────────────────────────────────── */

  function setElement(id, html) {
    var el = document.getElementById(id);
    if (el) el.innerHTML = html;
  }

})();
