/**
 * main.js — Morrow Supply shared utilities
 * Loaded on every page. Provides: INR formatter, cart helpers,
 * XML loader, navigation activation, mobile menu, and toast notifications.
 */

'use strict';

/* ─────────────────────────────────────────────
   CONFIGURATION
───────────────────────────────────────────── */
const SHIPPING_THRESHOLD = 2500;
const SHIPPING_CHARGE    = 99;
const XML_PATH           = './data/products.xml'; // relative — works on GitHub Pages
const CART_KEY           = 'morrowCart';
const LEGACY_CART_KEY     = 'morrow_cart';

/* ─────────────────────────────────────────────
   INR CURRENCY FORMATTER
───────────────────────────────────────────── */
const inrFormatter = new Intl.NumberFormat('en-IN', {
  style              : 'currency',
  currency           : 'INR',
  maximumFractionDigits: 0,
});

/**
 * Format a number as INR currency string.
 * @param {number} amount
 * @returns {string}  e.g. "₹1,499"
 */
function formatINR(amount) {
  return inrFormatter.format(amount);
}

/* ─────────────────────────────────────────────
   CART — localStorage  { productId: quantity }
───────────────────────────────────────────── */

/**
 * Read cart from localStorage.
 * @returns {Object.<string, number>}
 */
function getCart() {
  try {
    const currentRaw = localStorage.getItem(CART_KEY);
    if (currentRaw !== null) return parseStoredCart(currentRaw);
    const legacyRaw = localStorage.getItem(LEGACY_CART_KEY);
    const legacy = parseStoredCart(legacyRaw);
    if (legacyRaw !== null) {
      try { localStorage.setItem(CART_KEY, JSON.stringify(legacy)); }
      catch { showToast('Your saved cart was read, but the storage migration could not be completed.'); }
    }
    return legacy;
  } catch {
    showToast('Saved cart data could not be read. Your stored data was left untouched.');
    return {};
  }
}

function parseStoredCart(raw) {
  if (raw === null) return {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Invalid cart shape');
    return Object.keys(parsed).reduce((cart, id) => {
      const qty = Number(parsed[id]);
      if (/^[\w-]+$/.test(id) && Number.isSafeInteger(qty) && qty > 0) cart[id] = qty;
      return cart;
    }, {});
  } catch {
    showToast('Some saved cart data could not be read and was left untouched.');
    return {};
  }
}

/**
 * Persist cart to localStorage.
 * @param {Object.<string, number>} cart
 */
function saveCart(cart) {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    updateCartCount();
    return true;
  } catch (error) {
    showToast('Your cart could not be saved. Check browser storage settings and try again.');
    return false;
  }
}

/**
 * Add `qty` units of `productId` to cart.
 * @param {string} productId
 * @param {number} qty
 */
function addToCart(productId, qty = 1, stock = Infinity) {
  qty = Number(qty);
  stock = Number(stock);
  if (!/^[\w-]+$/.test(String(productId)) || !Number.isSafeInteger(qty) || qty < 1 || !(stock > 0)) return false;
  const cart = getCart();
  if ((cart[productId] || 0) + qty > stock) {
    showToast('Only ' + stock + ' available. Reduce the quantity in your cart first.');
    return false;
  }
  cart[productId] = (cart[productId] || 0) + qty;
  return saveCart(cart);
}

/**
 * Remove a product from the cart entirely.
 * @param {string} productId
 */
function removeFromCart(productId) {
  const cart = getCart();
  delete cart[productId];
  saveCart(cart);
  updateCartCount();
}

/**
 * Update the quantity of a product already in the cart.
 * Pass 0 to remove it.
 * @param {string} productId
 * @param {number} qty
 */
function setCartQty(productId, qty) {
  const cart = getCart();
  if (qty <= 0) {
    delete cart[productId];
  } else {
    cart[productId] = qty;
  }
  saveCart(cart);
  updateCartCount();
}

/**
 * Total number of items (sum of all quantities) in the cart.
 * @returns {number}
 */
function cartItemCount() {
  return Object.values(getCart()).reduce((sum, q) => sum + q, 0);
}

/**
 * Reflect current cart count in every `.cart-count` badge element.
 */
function updateCartCount() {
  const count = cartItemCount();
  document.querySelectorAll('.cart-count').forEach(el => {
    el.textContent = count;
    el.hidden = count === 0;
  });
}

/* ─────────────────────────────────────────────
   XML LOADER
───────────────────────────────────────────── */

/**
 * Fetch and parse the products XML file.
 * @param {string} [path] Override default XML_PATH.
 * @returns {Promise<XMLDocument>}
 */
async function loadXML(path = XML_PATH) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to load products: HTTP ${response.status}`);
  }
  const text   = await response.text();
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(text, 'application/xml');

  // Check for parse errors
  const parseError = xmlDoc.querySelector('parsererror');
  if (parseError) {
    throw new Error('XML parse error: ' + parseError.textContent.trim().slice(0, 120));
  }
  if (xmlDoc.documentElement.nodeName !== 'products') throw new Error('Product catalogue has an invalid root element.');
  return xmlDoc;
}

/**
 * Extract the text content of a child element by tag name.
 * @param {Element} parent
 * @param {string}  tag
 * @returns {string}
 */
function getXMLText(parent, tag) {
  const el = parent.querySelector(tag);
  return el ? el.textContent.trim() : '';
}

/**
 * Convert an XML <product> element into a plain object.
 * @param {Element} el
 * @returns {Object}
 */
function xmlProductToObject(el) {
  return {
    id              : getXMLText(el, 'id'),
    name            : getXMLText(el, 'name'),
    category        : getXMLText(el, 'category'),
    price           : Number(getXMLText(el, 'price')),
    image           : getXMLText(el, 'image'),
    shortDescription: getXMLText(el, 'shortDescription'),
    description     : getXMLText(el, 'description'),
    stock           : Number(getXMLText(el, 'stock')),
    featured        : getXMLText(el, 'featured') === 'true',
    badge           : getXMLText(el, 'badge') || null,
  };
}

/**
 * Parse all products from an XMLDocument.
 * @param {XMLDocument} xmlDoc
 * @returns {Array<Object>}
 */
function parseProducts(xmlDoc) {
  const seen = new Set();
  return Array.from(xmlDoc.querySelectorAll('products > product')).map(xmlProductToObject).filter(p => {
    if (!p.id || seen.has(p.id) || !p.name || !p.category || !Number.isFinite(p.price) || p.price < 0 ||
        !Number.isSafeInteger(p.stock) || p.stock < 0 || !/^assets\/images\/[\w.-]+\.svg$/i.test(p.image)) return false;
    seen.add(p.id);
    return true;
  });
}

/**
 * Find a single product by id in an XMLDocument.
 * @param {XMLDocument} xmlDoc
 * @param {string}      id
 * @returns {Object|null}
 */
function findProductById(xmlDoc, id) {
  return parseProducts(xmlDoc).find(product => product.id === id) || null;
}

/* ─────────────────────────────────────────────
   NAVIGATION HELPERS
───────────────────────────────────────────── */

/**
 * Mark the nav link that matches the current page as active.
 */
function setActiveNav() {
  const path    = window.location.pathname;
  const page    = path.split('/').pop() || 'index.html';
  const navLinks = document.querySelectorAll('.nav-links a');

  navLinks.forEach(link => {
    const href = (link.getAttribute('href') || '').split('/').pop();
    if (href === page || (page === '' && href === 'index.html')) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
    } else {
      link.classList.remove('active');
      link.removeAttribute('aria-current');
    }
  });
}

/**
 * Wire up the mobile hamburger menu button.
 */
function initMobileMenu() {
  const toggle  = document.getElementById('menu-toggle');
  const navMenu = document.getElementById('nav-menu');
  if (!toggle || !navMenu) return;

  toggle.addEventListener('click', () => {
    const isOpen = navMenu.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(isOpen));
    toggle.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
  });

  // Close menu when a link inside it is clicked (single-page feel)
  navMenu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      navMenu.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Open menu');
    });
  });

  // Close menu on Escape
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && navMenu.classList.contains('open')) {
      navMenu.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Open menu');
      toggle.focus();
    }
  });
}

/* ─────────────────────────────────────────────
   TOAST NOTIFICATIONS
───────────────────────────────────────────── */
let _toastTimer = null;

/**
 * Show a brief toast notification.
 * @param {string} message
 * @param {number} [duration=2800]  milliseconds before auto-dismiss
 */
function showToast(message, duration = 2800) {
  let toast = document.getElementById('ms-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id              = 'ms-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.classList.add('visible');

  if (_toastTimer) clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => {
    toast.classList.remove('visible');
  }, duration);
}

/* ─────────────────────────────────────────────
   SHIPPING BANNER HELPER
───────────────────────────────────────────── */

/**
 * Return a shipping message string based on order total.
 * @param {number} subtotal
 * @returns {string}
 */
function shippingMessage(subtotal) {
  if (subtotal >= SHIPPING_THRESHOLD) {
    return 'You qualify for free delivery on this order.';
  }
  const remaining = SHIPPING_THRESHOLD - subtotal;
  return `Add ${formatINR(remaining)} more for free delivery.`;
}

/* ─────────────────────────────────────────────
   INIT ON DOM READY
───────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  updateCartCount();
  setActiveNav();
  initMobileMenu();
});

window.addEventListener('storage', event => {
  if (event.key === CART_KEY || event.key === LEGACY_CART_KEY) updateCartCount();
});
