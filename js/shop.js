/**
 * shop.js — Morrow Supply Shop Page
 * Handles: loading products from XML, search, category filter, sort, rendering grid
 */

(function () {
  'use strict';

  let allProducts = [];
  let xmlDoc = null;

  // ─── Init ─────────────────────────────────────────────────────────────────

  document.addEventListener('DOMContentLoaded', async () => {
    try {
      xmlDoc = await loadXML();
      allProducts = parseProducts(xmlDoc);

      populateCategoryFilter(allProducts);
      applyURLParams();
      bindEvents();
      updateDisplay();
    } catch (err) {
      console.error('Shop init error:', err);
      handleXMLError(err);
    }
  });

  // ─── URL Params ───────────────────────────────────────────────────────────

  function applyURLParams() {
    const params = new URLSearchParams(window.location.search);
    const cat = params.get('category');
    if (cat) {
      const sel = document.getElementById('category-filter');
      if (sel) {
        // Try to find matching option
        for (let i = 0; i < sel.options.length; i++) {
          if (sel.options[i].value === cat) {
            sel.selectedIndex = i;
            break;
          }
        }
      }
    }
    const q = params.get('q');
    if (q) {
      const searchInput = document.getElementById('search-input');
      if (searchInput) {
        searchInput.value = q;
      }
    }
    const sort = params.get('sort');
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect && Array.from(sortSelect.options).some(option => option.value === sort)) sortSelect.value = sort;
  }

  // ─── Category Filter Population ───────────────────────────────────────────

  function populateCategoryFilter(products) {
    const sel = document.getElementById('category-filter');
    if (!sel) return;

    const categories = [...new Set(products.map(p => p.category))].sort();
    categories.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      sel.appendChild(opt);
    });
  }

  // ─── Event Binding ────────────────────────────────────────────────────────

  function bindEvents() {
    const searchInput = document.getElementById('search-input');
    const categoryFilter = document.getElementById('category-filter');
    const sortSelect = document.getElementById('sort-select');
    const clearBtn = document.getElementById('clear-filters-btn');

    if (searchInput) {
      searchInput.addEventListener('input', updateDisplay);
    }
    if (categoryFilter) {
      categoryFilter.addEventListener('change', updateDisplay);
    }
    if (sortSelect) {
      sortSelect.addEventListener('change', updateDisplay);
    }
    if (clearBtn) {
      clearBtn.addEventListener('click', clearFilters);
    }
    [searchInput, categoryFilter, sortSelect].forEach(el => el && el.addEventListener('change', syncURL));
    if (searchInput) searchInput.addEventListener('input', syncURL);

    // Event delegation for Add to Cart buttons
    const grid = document.getElementById('products-grid');
    if (grid) {
      grid.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-product-id]');
        if (btn && btn.classList.contains('btn-add-to-cart')) {
          const productId = btn.dataset.productId;
          handleAddToCart(productId);
        }
      });
    }
  }

  // ─── Filters & Sort ───────────────────────────────────────────────────────

  function getFilteredProducts() {
    const query = (document.getElementById('search-input')?.value || '').toLowerCase().trim();
    const category = document.getElementById('category-filter')?.value || '';
    const sort = document.getElementById('sort-select')?.value || 'featured';

    let filtered = allProducts.slice();

    // Search filter
    if (query) {
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(query) ||
        (p.shortDescription || '').toLowerCase().includes(query) ||
        (p.description || '').toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query)
      );
    }

    // Category filter
    if (category) {
      filtered = filtered.filter(p => p.category === category);
    }

    // Sort
    switch (sort) {
      case 'price-asc':
        filtered.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        filtered.sort((a, b) => b.price - a.price);
        break;
      case 'name-asc':
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'featured':
      default:
        // Featured first, then alphabetical
        filtered.sort((a, b) => {
          if (a.featured && !b.featured) return -1;
          if (!a.featured && b.featured) return 1;
          return a.name.localeCompare(b.name);
        });
        break;
    }

    return filtered;
  }

  // ─── Display Update ───────────────────────────────────────────────────────

  function updateDisplay() {
    const filtered = getFilteredProducts();
    updateCount(filtered.length);
    renderGrid(filtered);
  }

  function syncURL() {
    const params = new URLSearchParams();
    const q = document.getElementById('search-input')?.value.trim();
    const category = document.getElementById('category-filter')?.value;
    const sort = document.getElementById('sort-select')?.value;
    if (q) params.set('q', q);
    if (category) params.set('category', category);
    if (sort && sort !== 'featured') params.set('sort', sort);
    history.replaceState(null, '', './shop.html' + (params.size ? '?' + params.toString() : ''));
  }

  function updateCount(n) {
    const el = document.getElementById('product-count');
    if (el) el.textContent = n;
  }

  function showEmptyState() {
    const el = document.getElementById('empty-state');
    if (el) el.hidden = false;
  }

  function hideEmptyState() {
    const el = document.getElementById('empty-state');
    if (el) el.hidden = true;
  }

  // ─── Render Grid ─────────────────────────────────────────────────────────

  function renderGrid(products) {
    const grid = document.getElementById('products-grid');
    const loadingState = document.getElementById('loading-state');

    if (!grid) return;

    // Remove loading state
    if (loadingState) loadingState.remove();

    if (products.length === 0) {
      grid.innerHTML = '';
      showEmptyState();
      return;
    }

    hideEmptyState();
    grid.innerHTML = products.map(p => renderShopCard(p)).join('');
  }

  function renderShopCard(product) {
    const badgeHtml = product.badge
      ? `<span class="product-badge">${escapeHtml(product.badge)}</span>`
      : '';

    const priceFormatted = typeof inrFormatter !== 'undefined'
      ? inrFormatter.format(product.price)
      : '₹' + product.price.toLocaleString('en-IN');

    return `
      <article class="product-card">
        <a href="./product.html?id=${encodeURIComponent(product.id)}" class="product-card-image-link" tabindex="-1" aria-hidden="true">
          <div class="product-card-image-wrap">
            <img
              src="./${escapeHtml(product.image)}"
              alt="${escapeHtml(product.name)}"
              class="product-card-img"
              loading="lazy"
              onerror="this.src='./assets/images/placeholder.svg'"
            />
            ${badgeHtml}
          </div>
        </a>
        <div class="product-card-body">
          <span class="product-card-category">${escapeHtml(product.category)}</span>
          <h3 class="product-card-name">
            <a href="./product.html?id=${encodeURIComponent(product.id)}" class="product-card-name-link">
              ${escapeHtml(product.name)}
            </a>
          </h3>
          <p class="product-card-desc">${escapeHtml(product.shortDescription || '')}</p>
          <div class="product-card-footer">
            <span class="product-card-price">${priceFormatted}</span>
            <button
              class="btn btn-primary btn-add-to-cart btn-sm"
              data-product-id="${escapeHtml(product.id)}"
              data-stock="${product.stock}"
              aria-label="Add ${escapeHtml(product.name)} to cart"
              ${product.stock === 0 ? 'disabled' : ''}
            >
              ${product.stock === 0 ? 'Out of stock' : 'Add to Cart'}
            </button>
          </div>
        </div>
      </article>
    `.trim();
  }

  // ─── Add to Cart Handler ──────────────────────────────────────────────────

  function handleAddToCart(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;

    if (!addToCart(productId, 1, product.stock)) return;
    if (typeof updateCartCount === 'function') {
      updateCartCount();
    }
    if (typeof showToast === 'function') {
      showToast(`"${product.name}" added to cart`);
    }
  }

  // ─── Clear Filters ────────────────────────────────────────────────────────

  function clearFilters() {
    const searchInput = document.getElementById('search-input');
    const categoryFilter = document.getElementById('category-filter');
    const sortSelect = document.getElementById('sort-select');

    if (searchInput) searchInput.value = '';
    if (categoryFilter) categoryFilter.selectedIndex = 0;
    if (sortSelect) sortSelect.selectedIndex = 0;

    updateDisplay();
    syncURL();
  }

  // ─── Utility ──────────────────────────────────────────────────────────────

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

})();
