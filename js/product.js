/**
 * product.js — Morrow Supply Product Detail Page
 * Handles: loading a single product by URL ?id=, populating detail view,
 *          quantity selector, add-to-cart
 */

(function () {
  'use strict';

  let currentProduct = null;

  // ─── Init ─────────────────────────────────────────────────────────────────

  document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const productId = params.get('id');

    if (!productId) {
      showError();
      return;
    }

    showLoading();

    try {
      const xmlDoc = await loadXML();
      const product = findProductById(xmlDoc, productId);

      if (!product) {
        showError();
        return;
      }

      currentProduct = product;
      populateProduct(product);
      bindEvents(product);
      hideLoading();
      showDetail();
    } catch (err) {
      console.error('Product page error:', err);
      showError();
    }
  });

  // ─── Populate Product Detail ───────────────────────────────────────────────

  function populateProduct(product) {
    // Page title
    document.title = `${product.name} — Morrow Supply`;

    // Breadcrumb
    const breadcrumbName = document.getElementById('breadcrumb-product-name');
    if (breadcrumbName) breadcrumbName.textContent = product.name;

    // Image
    const img = document.getElementById('product-image');
    if (img) {
      img.src = product.image;
      img.alt = product.name;
      img.onerror = function () {
        this.src = './assets/images/placeholder.svg';
        this.onerror = null;
      };
    }

    // Category
    const catEl = document.getElementById('product-category');
    if (catEl) catEl.textContent = product.category;

    // Name
    const nameEl = document.getElementById('product-name');
    if (nameEl) nameEl.textContent = product.name;

    // Price
    const priceEl = document.getElementById('product-price');
    if (priceEl) {
      const priceFormatted = typeof inrFormatter !== 'undefined'
        ? inrFormatter.format(product.price)
        : '₹' + product.price.toLocaleString('en-IN');
      priceEl.textContent = priceFormatted;
    }

    // Badge
    const badgeEl = document.getElementById('product-badge');
    if (badgeEl) {
      if (product.badge) {
        badgeEl.textContent = product.badge;
        badgeEl.hidden = false;
      } else {
        badgeEl.hidden = true;
      }
    }

    // Description
    const descEl = document.getElementById('product-description');
    if (descEl) descEl.textContent = product.description || product.shortDescription || '';

    // Stock
    const stockEl = document.getElementById('product-stock');
    if (stockEl) {
      if (product.stock > 0) {
        stockEl.textContent = `In stock: ${product.stock} units`;
        stockEl.classList.remove('out-of-stock');
        stockEl.classList.add('in-stock');
      } else {
        stockEl.textContent = 'Out of stock';
        stockEl.classList.remove('in-stock');
        stockEl.classList.add('out-of-stock');
      }
    }

    // Quantity input max
    const qtyInput = document.getElementById('qty-input');
    if (qtyInput) {
      qtyInput.max = product.stock;
      qtyInput.value = 1;
    }

    // Disable add-to-cart if out of stock
    const addBtn = document.getElementById('add-to-cart-btn');
    if (addBtn && product.stock <= 0) {
      addBtn.disabled = true;
      addBtn.textContent = 'Out of Stock';
    }
  }

  // ─── Quantity Selector ────────────────────────────────────────────────────

  function bindEvents(product) {
    const qtyInput = document.getElementById('qty-input');
    const decreaseBtn = document.getElementById('qty-decrease');
    const increaseBtn = document.getElementById('qty-increase');
    const addBtn = document.getElementById('add-to-cart-btn');

    function getQty() {
      return parseInt(qtyInput?.value, 10) || 1;
    }

    function setQty(val) {
      if (!qtyInput) return;
      const min = parseInt(qtyInput.min, 10) || 1;
      const max = parseInt(qtyInput.max, 10) || product.stock;
      const numeric = Number(val);
      const clamped = Math.max(min, Math.min(max, Number.isFinite(numeric) ? Math.trunc(numeric) : min));
      qtyInput.value = clamped;
      // Update button states
      if (decreaseBtn) decreaseBtn.disabled = clamped <= min;
      if (increaseBtn) increaseBtn.disabled = clamped >= max;
    }

    if (decreaseBtn) {
      decreaseBtn.addEventListener('click', () => setQty(getQty() - 1));
    }

    if (increaseBtn) {
      increaseBtn.addEventListener('click', () => setQty(getQty() + 1));
    }

    if (qtyInput) {
      qtyInput.addEventListener('change', () => setQty(getQty()));
      qtyInput.addEventListener('input', () => setQty(getQty()));
    }

    if (addBtn) {
      addBtn.addEventListener('click', () => {
        const qty = getQty();
        if (typeof addToCart === 'function') {
          if (!addToCart(product.id, qty, product.stock)) return;
        }
        if (typeof updateCartCount === 'function') {
          updateCartCount();
        }
        if (typeof showToast === 'function') {
          showToast(`${qty > 1 ? qty + '× ' : ''}"${product.name}" added to cart`);
        }
      });
    }

    // Init button states
    setQty(1);
  }

  // ─── State Helpers ────────────────────────────────────────────────────────

  function showLoading() {
    const el = document.getElementById('product-loading');
    if (el) el.hidden = false;
    hideDetail();
    hideError();
  }

  function hideLoading() {
    const el = document.getElementById('product-loading');
    if (el) el.hidden = true;
  }

  function showDetail() {
    const el = document.getElementById('product-detail');
    if (el) el.hidden = false;
  }

  function hideDetail() {
    const el = document.getElementById('product-detail');
    if (el) el.hidden = true;
  }

  function showError() {
    hideLoading();
    hideDetail();
    const el = document.getElementById('product-error');
    if (el) el.hidden = false;
  }

  function hideError() {
    const el = document.getElementById('product-error');
    if (el) el.hidden = true;
  }

})();
