/**
 * products.js — Morrow Supply product utilities
 * Depends on main.js (loadXML, parseProducts, findProductById, formatINR, addToCart).
 * Provides: loadXML(), parseProducts(), findProductById(),
 *           renderProductCard(), handleXMLError(), getProductImageAlt()
 */

'use strict';

/* ─────────────────────────────────────────────
   RE-EXPORT FOR PAGES THAT ONLY LOAD products.js
   (main.js must be loaded before this file)
───────────────────────────────────────────── */
// loadXML, parseProducts, findProductById are defined in main.js and
// available as globals. Products.js adds the UI-rendering layer.

/* ─────────────────────────────────────────────
   IMAGE ALT TEXT
───────────────────────────────────────────── */

/**
 * Return a descriptive alt string for a product image.
 * @param {Object} product
 * @returns {string}
 */
function getProductImageAlt(product) {
  return `${product.name} — ${product.category}`;
}

/* ─────────────────────────────────────────────
   PRODUCT CARD RENDERER
───────────────────────────────────────────── */

/**
 * Render an HTML string for a single product card.
 * Cards link to product.html?id=<id>.
 * @param {Object} product
 * @returns {string}  HTML string ready for innerHTML
 */
function renderProductCard(product) {
  const price     = formatINR(product.price);
  const badgeHTML = product.badge
    ? `<span class="product-badge">${escapeHTML(product.badge)}</span>`
    : '';
  const stockNote = product.stock <= 5
    ? `<span class="stock-low">Only ${product.stock} left</span>`
    : '';
  const alt = getProductImageAlt(product);

  return `
    <article class="product-card" data-id="${escapeHTML(product.id)}">
      <a href="./product.html?id=${encodeURIComponent(product.id)}" class="product-card__image-link" tabindex="-1" aria-hidden="true">
        <div class="product-card__image-wrap">
          <img
            src="./${escapeHTML(product.image)}"
            alt="${escapeHTML(alt)}"
            class="product-card__image"
            loading="lazy"
            onerror="this.src='./assets/images/placeholder.svg'; this.onerror=null;"
          />
          ${badgeHTML}
        </div>
      </a>
      <div class="product-card__body">
        <p class="product-card__category">${escapeHTML(product.category)}</p>
        <h3 class="product-card__name">
          <a href="./product.html?id=${encodeURIComponent(product.id)}">${escapeHTML(product.name)}</a>
        </h3>
        <p class="product-card__desc">${escapeHTML(product.shortDescription)}</p>
        <div class="product-card__footer">
          <span class="product-card__price">${price}</span>
          ${stockNote}
          <button
            class="btn btn--primary product-card__add"
            data-id="${escapeHTML(product.id)}"
            data-stock="${product.stock}"
            aria-label="Add ${escapeHTML(product.name)} to cart"
            ${product.stock === 0 ? 'disabled' : ''}
          >${product.stock === 0 ? 'Out of stock' : 'Add to cart'}</button>
        </div>
      </div>
    </article>
  `.trim();
}

/* ─────────────────────────────────────────────
   ERROR HANDLER
───────────────────────────────────────────── */

/**
 * Display a user-friendly error message in the products container.
 * Falls back to appending to <main> if no container found.
 * @param {Error} error
 * @param {string} [containerId='products-grid']
 */
function handleXMLError(error, containerId = 'products-grid') {
  console.error('[Morrow Supply] XML load error:', error);

  const container = document.getElementById(containerId) || document.querySelector('main');
  if (!container) return;

  container.innerHTML = `
    <div class="empty-state error-state">
      <svg class="empty-state__icon" width="48" height="48" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5"/>
        <path d="M12 7v5M12 16h.01" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
      <h2 class="empty-state__heading">Products unavailable</h2>
      <p class="empty-state__text">We could not load the product catalogue right now. Please try refreshing the page.</p>
      <button class="btn btn--outline" onclick="location.reload()">Refresh page</button>
    </div>
  `;
}

/* ─────────────────────────────────────────────
   HTML ESCAPE UTILITY
───────────────────────────────────────────── */

/**
 * Escape a string for safe insertion into HTML.
 * @param {string} str
 * @returns {string}
 */
function escapeHTML(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ─────────────────────────────────────────────
   ADD-TO-CART DELEGATION
   Attach once on a product grid container.
───────────────────────────────────────────── */

/**
 * Attach a delegated click listener on `container` for all
 * [data-id] "Add to cart" buttons inside it.
 * @param {HTMLElement} container
 */
function initAddToCartButtons(container) {
  if (!container) return;
  container.addEventListener('click', e => {
    const btn = e.target.closest('.product-card__add[data-id]');
    if (!btn) return;
    const id = btn.dataset.id;
    const added = addToCart(id, 1, Number(btn.dataset.stock));
    if (!added) return;
    showToast('Item added to your cart.');

    // Brief visual feedback
    btn.textContent = 'Added!';
    btn.disabled    = true;
    setTimeout(() => {
      btn.textContent = 'Add to cart';
      btn.disabled    = false;
    }, 1200);
  });
}

/* ─────────────────────────────────────────────
   FEATURED PRODUCT FILTER
───────────────────────────────────────────── */

/**
 * Filter an array of products to featured ones only.
 * @param {Array<Object>} products
 * @returns {Array<Object>}
 */
function getFeaturedProducts(products) {
  return products.filter(p => p.featured);
}

/* ─────────────────────────────────────────────
   CATEGORY LIST
───────────────────────────────────────────── */

/**
 * Return a sorted unique list of category names from a product array.
 * @param {Array<Object>} products
 * @returns {string[]}
 */
function getCategories(products) {
  const cats = new Set(products.map(p => p.category));
  return Array.from(cats).sort();
}
