/** Checkout: validates customer details and places a frontend-only demo order. */
(function () {
  'use strict';
  document.addEventListener('DOMContentLoaded', async function () {
    const initialCart = getCart();
    if (!Object.keys(initialCart).length) { location.replace('./cart.html'); return; }
    try {
      const xml = await loadXML();
      const products = parseProducts(xml);
      const normalized = normalizeCart(initialCart, products);
      if (!Object.keys(normalized).length) { saveCart({}); location.replace('./cart.html'); return; }
      if (JSON.stringify(normalized) !== JSON.stringify(initialCart)) saveCart(normalized);
      const summary = renderSummary(products, normalized);
      const form = document.getElementById('checkout-form');
      if (form) form.addEventListener('submit', async event => {
        event.preventDefault();
        if (placing || !validateForm(form)) return;
        placing = true;
        try {
          // Refresh both storage and XML at submit time to catch changed stock and prices.
          const freshProducts = parseProducts(await loadXML());
          const latestCart = getCart();
          const latest = normalizeCart(latestCart, freshProducts);
          if (!Object.keys(latest).length || Object.keys(latest).length !== Object.keys(latestCart).length ||
              Object.keys(latest).some(id => latest[id] !== latestCart[id])) {
            placing = false;
            showToast('Cart availability changed. Please review your cart and try again.');
            location.replace('./cart.html'); return;
          }
          const freshSummary = renderSummary(freshProducts, latest);
          commitOrder(form, freshProducts, latest, freshSummary);
        } catch (error) {
          console.error('[Morrow Supply] Could not recheck checkout inventory:', error);
          placing = false;
          showToast('We could not verify current product availability. Please try again.');
        }
      });
    } catch (error) {
      console.error('[Morrow Supply] Checkout load error:', error);
      const list = document.getElementById('checkout-items-list');
      if (list) list.textContent = 'Could not load order details. Please refresh and try again.';
      const button = document.getElementById('place-order-btn'); if (button) button.disabled = true;
    }
  });
  let placing = false;
  function normalizeCart(cart, products) {
    const byId = new Map(products.map(p => [p.id, p]));
    const result = {};
    Object.keys(cart).forEach(id => {
      const p = byId.get(id), qty = Number(cart[id]);
      if (p && p.stock > 0 && Number.isSafeInteger(qty) && qty > 0 && qty <= p.stock) result[id] = qty;
    });
    return result;
  }
  function renderSummary(products, cart) {
    const list = document.getElementById('checkout-items-list');
    let subtotal = 0;
    if (list) list.replaceChildren();
    Object.keys(cart).forEach(id => {
      const p = products.find(item => item.id === id), qty = cart[id], amount = p.price * qty;
      subtotal += amount;
      const li = document.createElement('li'); li.className = 'checkout-item-row';
      [[p.name, 'checkout-item-name'], ['× ' + qty, 'checkout-item-qty'], [formatINR(amount), 'checkout-item-price']].forEach(pair => {
        const span = document.createElement('span'); span.className = pair[1]; span.textContent = pair[0]; li.appendChild(span);
      });
      if (list) list.appendChild(li);
    });
    const shipping = subtotal >= SHIPPING_THRESHOLD ? 0 : SHIPPING_CHARGE;
    document.getElementById('co-subtotal').textContent = formatINR(subtotal);
    document.getElementById('co-shipping').textContent = shipping ? formatINR(shipping) : 'Free';
    document.getElementById('co-total').textContent = formatINR(subtotal + shipping);
    return { subtotal, shipping, total: subtotal + shipping };
  }
  function validateForm(form) {
    clearAllErrors();
    const checks = [
      ['name', v => v.trim().length >= 2, 'Please enter your full name (at least 2 characters).'],
      ['email', v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()), 'Please enter a valid email address.'],
      ['mobile', v => /^[6-9]\d{9}$/.test(v.trim()), 'Please enter a valid 10-digit Indian mobile number.'],
      ['address', v => v.trim().length >= 5, 'Please enter your complete delivery address.'],
      ['city', v => v.trim().length >= 2, 'Please enter your city.'],
      ['pin', v => /^\d{6}$/.test(v.trim()), 'Please enter a valid 6-digit PIN code.'],
      ['state', v => !!v, 'Please select your state.']
    ];
    let first = null;
    checks.forEach(([key, test, message]) => {
      const input = form.querySelector('#field-' + key);
      if (!input || !test(input.value)) { showError('error-' + key, message); if (!first) first = input; }
    });
    if (first) first.focus();
    return !first;
  }
  function showError(id, message) {
    const error = document.getElementById(id);
    if (error) { error.textContent = message; error.style.display = 'block'; }
    const field = document.getElementById(id.replace('error-', 'field-'));
    if (field) { field.classList.add('input-error'); field.setAttribute('aria-invalid', 'true'); }
  }
  function clearAllErrors() {
    document.querySelectorAll('.form-error').forEach(el => { el.textContent = ''; el.style.display = 'none'; });
    document.querySelectorAll('.form-input.input-error').forEach(el => { el.classList.remove('input-error'); el.removeAttribute('aria-invalid'); });
  }
  function commitOrder(form, products, cart, totals) {
    const now = new Date();
    const suffix = (window.crypto && crypto.randomUUID ? crypto.randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase() : Date.now().toString(36).toUpperCase());
    const items = Object.keys(cart).map(id => {
      const product = products.find(p => p.id === id);
      return { name: product.name, qty: cart[id], lineTotal: formatINR(product.price * cart[id]) };
    });
    const order = { orderSuffix: suffix, customerName: form.querySelector('#field-name').value.trim(), dateFormatted: now.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }), items,
      subtotal: totals.subtotal, subtotalFormatted: formatINR(totals.subtotal), shipping: totals.shipping, shippingFormatted: totals.shipping ? formatINR(totals.shipping) : 'Free', total: totals.total, totalFormatted: formatINR(totals.total) };
    const button = document.getElementById('place-order-btn');
    try {
      sessionStorage.setItem('morrow_order', JSON.stringify(order));
    } catch (error) {
      console.error('Order storage error:', error); placing = false; showToast('Order details could not be saved. Your cart is unchanged.'); return;
    }
    if (!saveCart({})) {
      sessionStorage.removeItem('morrow_order'); placing = false; return;
    }
    if (button) { button.disabled = true; button.textContent = 'Placing order…'; }
    location.assign('./order-success.html');
  }
})();
