/**
 * Café de la Esquina — Main JavaScript
 * Vanilla ES modules, zero dependencies, mobile-first
 * Handles: Header/Drawer, Menu filters, Cart, Location bar, Admin trigger
 */

// ========================================
// STATE MANAGEMENT
// ========================================

const state = {
  menu: [],
  categories: [],
  cart: [],
  favorites: new Set(JSON.parse(localStorage.getItem('cafe-favorites') || '[]')),
  filters: {
    search: '',
    category: 'all',
    allergens: new Set(),
    dietary: new Set(),
    favoritesOnly: false
  },
  viewMode: localStorage.getItem('cafe-view-mode') || 'grid',
  isOpen: false,
  adminClicks: 0,
  lastAdminClick: 0
};

// ========================================
// UTILITY FUNCTIONS
// ========================================

const $ = (selector, context = document) => context.querySelector(selector);
const $$ = (selector, context = document) => [...context.querySelectorAll(selector)];

const formatPrice = (price) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(price);

const debounce = (fn, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
};

const saveFavorites = () => localStorage.setItem('cafe-favorites', JSON.stringify([...state.favorites]));

const saveViewMode = () => localStorage.setItem('cafe-view-mode', state.viewMode);

const saveCart = () => localStorage.setItem('cafe-cart', JSON.stringify(state.cart));

const loadCart = () => {
  const saved = localStorage.getItem('cafe-cart');
  if (saved) state.cart = JSON.parse(saved);
};

const generateWhatsAppMessage = () => {
  if (state.cart.length === 0) return '';
  const items = state.cart.map(item => `${item.qty}x ${item.name} (${formatPrice(item.price)})`).join(', ');
  const total = state.cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  return `Hola! Quiero pedir: ${items}. Total: ${formatPrice(total)}. Para recoger en 10 min. ¡Gracias!`;
};

const openWhatsApp = (message = generateWhatsAppMessage()) => {
  const phone = '34600000000'; // Replace with real WhatsApp number
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
};

// ========================================
// HEADER & DRAWER
// ========================================

const header = {
  init() {
    this.el = $('.header');
    this.hamburger = $('.header__hamburger');
    this.drawer = $('.drawer');
    this.backdrop = $('.drawer-backdrop');
    this.navLinks = $$('.drawer__nav-link, .header__nav-link');
    this.whatsappBtns = $$('.header__btn-whatsapp, .drawer__btn-whatsapp, .location-bar__item--whatsapp');
    this.logo = $('.header__logo');

    this.bindEvents();
    this.handleScroll();
    this.checkAdminTrigger();
  },

  bindEvents() {
    this.hamburger?.addEventListener('click', () => this.toggleDrawer());
    this.backdrop?.addEventListener('click', () => this.closeDrawer());
    this.drawer?.addEventListener('click', (e) => {
      if (e.target.closest('.drawer__nav-link')) this.closeDrawer();
      if (e.target.closest('.drawer__btn-whatsapp')) this.closeDrawer();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.drawer?.classList.contains('drawer--open')) this.closeDrawer();
    });

    window.addEventListener('scroll', debounce(() => this.handleScroll(), 10), { passive: true });

    // Admin trigger: 5 clicks on logo
    this.logo?.addEventListener('click', (e) => {
      const now = Date.now();
      if (now - this.lastAdminClick < 500) {
        this.adminClicks++;
      } else {
        this.adminClicks = 1;
      }
      this.lastAdminClick = now;

      if (this.adminClicks >= 5) {
        e.preventDefault();
        this.openAdmin();
        this.adminClicks = 0;
      }
    });

    // Check for ?admin=1 param
    if (new URLSearchParams(window.location.search).has('admin')) {
      this.openAdmin();
    }
  },

  toggleDrawer() {
    const isOpen = this.drawer.classList.toggle('drawer--open');
    this.backdrop.classList.toggle('drawer-backdrop--open', isOpen);
    this.hamburger.setAttribute('aria-expanded', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
    if (isOpen) {
      this.drawer.querySelector('.drawer__close')?.focus();
    }
  },

  closeDrawer() {
    this.drawer.classList.remove('drawer--open');
    this.backdrop.classList.remove('drawer-backdrop--open');
    this.hamburger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  },

  handleScroll() {
    if (window.scrollY > 50) {
      this.el.classList.add('header--scrolled');
    } else {
      this.el.classList.remove('header--scrolled');
    }
  },

  checkAdminTrigger() {
    // Already handled in bindEvents
  },

  openAdmin() {
    const event = new CustomEvent('cafe:admin-open');
    document.dispatchEvent(event);
  },

  updateActiveLink(pathname) {
    this.navLinks.forEach(link => {
      const href = link.getAttribute('href');
      const isActive = href === pathname || (pathname === '/' && href === '/index.html') || (pathname.endsWith('/') && href === '/index.html');
      link.setAttribute('aria-current', isActive ? 'page' : 'false');
    });
  }
};

// ========================================
// MENU DATA & RENDERING
// ========================================

const menu = {
  async init() {
    try {
      // Try to load from localStorage first (admin edits)
      const saved = localStorage.getItem('cafe-menu-data');
      if (saved) {
        const data = JSON.parse(saved);
        state.menu = data.items || [];
        state.categories = data.categories || [];
      } else {
        // Fetch from JSON file
        const response = await fetch('/assets/data/menu.json');
        const data = await response.json();
        state.menu = data.items;
        state.categories = data.categories;
      }
      this.render();
      this.initFilters();
      this.initViewToggle();
    } catch (error) {
      console.error('Error loading menu:', error);
      this.showError();
    }
  },

  render() {
    const container = $('.menu-grid');
    if (!container) return;

    const filtered = this.getFilteredItems();
    const grouped = this.groupByCategory(filtered);

    if (filtered.length === 0) {
      container.innerHTML = this.emptyState();
      return;
    }

    container.innerHTML = Object.entries(grouped).map(([catId, items]) => {
      const category = state.categories.find(c => c.id === catId);
      if (!category || items.length === 0) return '';

      return `
        <section class="menu-section" data-category="${catId}" aria-labelledby="section-${catId}">
          <header class="menu-section__header">
            <h2 class="menu-section__title" id="section-${catId}">
              <span class="menu-section__icon" aria-hidden="true">${category.icon}</span>
              ${category.name}
              <span class="menu-section__count">${items.length}</span>
            </h2>
          </header>
          <div class="menu-grid ${state.viewMode === 'list' ? 'menu-grid--list' : ''}" role="list">
            ${items.map(item => this.renderItem(item)).join('')}
          </div>
        </section>
      `;
    }).join('');

    this.bindItemEvents();
  },

  getFilteredItems() {
    return state.menu.filter(item => {
      if (!item.available) return false;
      if (state.filters.search && !item.name.toLowerCase().includes(state.filters.search.toLowerCase()) &&
          !item.description.toLowerCase().includes(state.filters.search.toLowerCase())) return false;
      if (state.filters.category !== 'all' && item.category !== state.filters.category) return false;
      if (state.filters.allergens.size > 0 && !Array.from(state.filters.allergens).every(a => item.allergens.includes(a))) return false;
      if (state.filters.dietary.size > 0 && !Array.from(state.filters.dietary).every(d => item.dietary.includes(d))) return false;
      if (state.filters.favoritesOnly && !state.favorites.has(item.id)) return false;
      return true;
    });
  },

  groupByCategory(items) {
    const grouped = {};
    state.categories.forEach(cat => { grouped[cat.id] = []; });
    items.forEach(item => { if (grouped[item.category]) grouped[item.category].push(item); });
    return grouped;
  },

  renderItem(item) {
    const isFav = state.favorites.has(item.id);
    const badges = [];
    if (item.badges?.includes('nuevo')) badges.push('<span class="badge badge--new-item" aria-label="Nuevo">Nuevo</span>');
    if (item.badges?.includes('popular')) badges.push('<span class="badge badge--popular" aria-label="Popular">⭐ Popular</span>');
    if (item.badges?.includes('dia')) badges.push('<span class="badge badge--day" aria-label="Especial del día">🔥 Día</span>');
    if (item.dietary?.includes('vegan')) badges.push('<span class="badge badge--vegan" aria-label="Vegano">🌱 Vegano</span>');
    if (item.dietary?.includes('gluten-free')) badges.push('<span class="badge badge--gf" aria-label="Sin gluten">🌾 Sin gluten</span>');

    return `
      <article class="menu-card card" data-id="${item.id}" role="listitem">
        <div class="card__media">
          <img class="card__image" 
               src="/assets/images/${item.image}" 
               alt="" 
               loading="lazy"
               width="400" height="300"
               data-lqip="${item.lqip || ''}"
               onload="this.classList.add('loaded')"
               onerror="this.src='/assets/images/placeholder.webp'">
          ${badges.length ? `<div class="card__badge" aria-hidden="true">${badges.join('')}</div>` : ''}
        </div>
        <div class="card__content">
          <h3 class="card__name">${this.escapeHtml(item.name)}</h3>
          <p class="card__description">${this.escapeHtml(item.description)}</p>
          <div class="card__footer">
            <span class="card__price text-price">${formatPrice(item.price)}</span>
            <div class="card__actions">
              <button class="btn btn--sm btn--ghost btn--add" data-id="${item.id}" aria-label="Añadir ${this.escapeHtml(item.name)} al pedido" ${!item.available ? 'disabled' : ''}>
                <svg class="btn__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                <span>Añadir</span>
              </button>
              <button class="btn btn--sm btn--ghost btn--fav ${isFav ? 'btn--fav-active' : ''}" data-id="${item.id}" aria-label="${isFav ? 'Quitar de favoritos' : 'Añadir a favoritos'} ${this.escapeHtml(item.name)}" aria-pressed="${isFav}">
                <svg class="btn__icon" width="18" height="18" viewBox="0 0 24 24" fill="${isFav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
              </button>
            </div>
          </div>
        </div>
      </article>
    `;
  },

  emptyState() {
    return `
      <div class="menu-empty" role="status" aria-live="polite">
        <div class="menu-empty__icon" aria-hidden="true">🔍</div>
        <h3 class="menu-empty__title">No hay resultados</h3>
        <p class="text-caption">Prueba a cambiar los filtros o busca otro término</p>
        <button class="btn btn--secondary btn--sm" id="clear-filters">Limpiar filtros</button>
      </div>
    `;
  },

  bindItemEvents() {
    $$('.btn--add').forEach(btn => {
      btn.addEventListener('click', (e) => cart.add(e.currentTarget.dataset.id));
    });
    $$('.btn--fav').forEach(btn => {
      btn.addEventListener('click', (e) => this.toggleFavorite(e.currentTarget.dataset.id, e.currentTarget));
    });
    $('#clear-filters')?.addEventListener('click', () => this.clearFilters());
  },

  toggleFavorite(id, btn) {
    if (state.favorites.has(id)) {
      state.favorites.delete(id);
      btn.classList.remove('btn--fav-active');
      btn.setAttribute('aria-pressed', 'false');
      btn.querySelector('svg').setAttribute('fill', 'none');
    } else {
      state.favorites.add(id);
      btn.classList.add('btn--fav-active');
      btn.setAttribute('aria-pressed', 'true');
      btn.querySelector('svg').setAttribute('fill', 'currentColor');
    }
    saveFavorites();
    this.render(); // Re-render to update badge counts
  },

  clearFilters() {
    state.filters = { search: '', category: 'all', allergens: new Set(), dietary: new Set(), favoritesOnly: false };
    $$('.menu-filters__input').forEach(i => i.value = '');
    $$('.menu-filters__category').forEach(c => c.classList.toggle('menu-filters__category--active', c.dataset.category === 'all'));
    $$('.menu-filters__chip').forEach(c => c.classList.remove('menu-filters__chip--active'));
    this.render();
  },

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  showError() {
    const container = $('.menu-grid');
    if (container) container.innerHTML = '<p class="text-caption" style="text-align:center;padding:2rem">Error cargando la carta. Recarga la página.</p>';
  },

  initFilters() {
    // Search
    const searchInput = $('.menu-filters__input');
    if (searchInput) {
      searchInput.addEventListener('input', debounce((e) => {
        state.filters.search = e.target.value.trim();
        this.render();
      }, 300));
    }

    // Category chips
    $$('.menu-filters__category').forEach(btn => {
      btn.addEventListener('click', () => {
        state.filters.category = btn.dataset.category;
        $$('.menu-filters__category').forEach(b => b.classList.toggle('menu-filters__category--active', b.dataset.category === state.filters.category));
        this.render();
      });
    });

    // Advanced filters toggle
    const moreBtn = $('.menu-filters__more');
    if (moreBtn) {
      moreBtn.addEventListener('click', () => {
        const expanded = moreBtn.getAttribute('aria-expanded') === 'true';
        moreBtn.setAttribute('aria-expanded', !expanded);
        $('.menu-filters__advanced')?.classList.toggle('menu-filters__advanced--open', !expanded);
      });
    }

    // Allergen chips
    $$('.menu-filters__chip[data-filter="allergen"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const allergen = btn.dataset.value;
        if (state.filters.allergens.has(allergen)) state.filters.allergens.delete(allergen);
        else state.filters.allergens.add(allergen);
        btn.classList.toggle('menu-filters__chip--active', state.filters.allergens.has(allergen));
        this.render();
      });
    });

    // Dietary chips
    $$('.menu-filters__chip[data-filter="dietary"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const dietary = btn.dataset.value;
        if (state.filters.dietary.has(dietary)) state.filters.dietary.delete(dietary);
        else state.filters.dietary.add(dietary);
        btn.classList.toggle('menu-filters__chip--active', state.filters.dietary.has(dietary));
        this.render();
      });
    });

    // Favorites toggle
    $('#filter-favorites')?.addEventListener('change', (e) => {
      state.filters.favoritesOnly = e.target.checked;
      this.render();
    });
  },

  initViewToggle() {
    $$('.menu-view-toggle__btn').forEach(btn => {
      btn.addEventListener('click', () => {
        state.viewMode = btn.dataset.view;
        saveViewMode();
        $$('.menu-view-toggle__btn').forEach(b => b.classList.toggle('menu-view-toggle__btn--active', b.dataset.view === state.viewMode));
        $$('.menu-grid').forEach(g => g.classList.toggle('menu-grid--list', state.viewMode === 'list'));
      });
    });

    // Set initial active state
    $$('.menu-view-toggle__btn').forEach(btn => {
      btn.classList.toggle('menu-view-toggle__btn--active', btn.dataset.view === state.viewMode);
    });
  }
};

// ========================================
// CART
// ========================================

const cart = {
  init() {
    loadCart();
    this.el = $('.cart');
    this.trigger = $('#cart-trigger');
    this.closeBtn = $('.cart__close');
    this.itemsEl = $('.cart__items');
    this.totalEl = $('.cart__total-amount');
    this.emptyEl = $('.cart__empty');
    this.whatsappBtn = $('.cart__btn-whatsapp');
    this.clearBtn = $('.cart__btn-clear');

    this.bindEvents();
    this.render();
    this.updateTrigger();
  },

  bindEvents() {
    this.trigger?.addEventListener('click', () => this.toggle());
    this.closeBtn?.addEventListener('click', () => this.close());
    this.whatsappBtn?.addEventListener('click', () => openWhatsApp());
    this.clearBtn?.addEventListener('click', () => this.clear());

    // Close on backdrop click (mobile)
    document.addEventListener('click', (e) => {
      if (this.el?.classList.contains('cart--open') && !this.el.contains(e.target) && !this.trigger.contains(e.target)) {
        this.close();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.el?.classList.contains('cart--open')) this.close();
    });
  },

  add(itemId) {
    const item = state.menu.find(i => i.id === itemId);
    if (!item || !item.available) return;

    const existing = state.cart.find(i => i.id === itemId);
    if (existing) {
      existing.qty++;
    } else {
      state.cart.push({ id: item.id, name: item.name, price: item.price, qty: 1 });
    }
    saveCart();
    this.render();
    this.open();
    this.animateAdd(itemId);
  },

  remove(itemId) {
    state.cart = state.cart.filter(i => i.id !== itemId);
    saveCart();
    this.render();
    this.updateTrigger();
  },

  updateQty(itemId, delta) {
    const item = state.cart.find(i => i.id === itemId);
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) this.remove(itemId);
    else {
      saveCart();
      this.render();
      this.updateTrigger();
    }
  },

  clear() {
    state.cart = [];
    saveCart();
    this.render();
    this.updateTrigger();
    this.close();
  },

  toggle() {
    this.el.classList.toggle('cart--open');
    document.body.style.overflow = this.el.classList.contains('cart--open') ? 'hidden' : '';
  },

  open() {
    this.el.classList.add('cart--open');
    document.body.style.overflow = 'hidden';
  },

  close() {
    this.el.classList.remove('cart--open');
    document.body.style.overflow = '';
  },

  animateAdd(itemId) {
    const btn = $(`.btn--add[data-id="${itemId}"]`);
    if (btn) {
      btn.classList.add('btn--added');
      setTimeout(() => btn.classList.remove('btn--added'), 600);
    }
  },

  render() {
    if (!this.itemsEl) return;

    if (state.cart.length === 0) {
      this.itemsEl.innerHTML = '';
      this.emptyEl?.classList.remove('hidden');
      this.whatsappBtn?.classList.add('hidden');
      this.clearBtn?.classList.add('hidden');
    } else {
      this.emptyEl?.classList.add('hidden');
      this.whatsappBtn?.classList.remove('hidden');
      this.clearBtn?.classList.remove('hidden');
      this.itemsEl.innerHTML = state.cart.map(item => `
        <div class="cart__item" data-id="${item.id}">
          <div class="cart__item-info">
            <div class="cart__item-name">${this.escapeHtml(item.name)}</div>
            <div class="cart__item-meta">
              <div class="cart__item-qty">
                <button class="cart__qty-btn" data-action="decrease" aria-label="Disminuir cantidad">−</button>
                <span class="cart__qty-value">${item.qty}</span>
                <button class="cart__qty-btn" data-action="increase" aria-label="Aumentar cantidad">+</button>
              </div>
              <span class="cart__item-price text-price">${formatPrice(item.price * item.qty)}</span>
            </div>
          </div>
          <button class="cart__item-remove" aria-label="Eliminar ${this.escapeHtml(item.name)}">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      `).join('');

      this.bindItemEvents();

      const total = state.cart.reduce((sum, item) => sum + item.price * item.qty, 0);
      this.totalEl.textContent = formatPrice(total);
    }
  },

  bindItemEvents() {
    $$('.cart__qty-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const itemId = btn.closest('.cart__item').dataset.id;
        const action = btn.dataset.action;
        this.updateQty(itemId, action === 'increase' ? 1 : -1);
      });
    });
    $$('.cart__item-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        const itemId = btn.closest('.cart__item').dataset.id;
        this.remove(itemId);
      });
    });
  },

  updateTrigger() {
    const count = state.cart.reduce((sum, item) => sum + item.qty, 0);
    const badge = this.trigger?.querySelector('.header__cart-count');
    if (badge) {
      badge.textContent = count;
      badge.style.display = count > 0 ? 'flex' : 'none';
    }
  },

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};

// ========================================
// LOCATION BAR (Open/Closed status)
// ========================================

const locationBar = {
  init() {
    this.mobileBar = $('.location-bar--mobile');
    this.desktopBar = $('.location-bar--desktop');
    this.statusEl = $('#location-status');
    this.hoursEl = $('#location-hours');
    this.updateStatus();
    setInterval(() => this.updateStatus(), 60000); // Check every minute
  },

  updateStatus() {
    const now = new Date();
    const day = now.getDay(); // 0 = Sunday, 6 = Saturday
    const hour = now.getHours();
    const minute = now.getMinutes();
    const currentMinutes = hour * 60 + minute;

    // Schedule: Mon-Fri 7:30-21:00, Sat 8:00-21:00, Sun 9:00-15:00
    const schedule = {
      0: { open: 9 * 60, close: 15 * 60 },      // Sunday
      1: { open: 7.5 * 60, close: 21 * 60 },    // Monday
      2: { open: 7.5 * 60, close: 21 * 60 },    // Tuesday
      3: { open: 7.5 * 60, close: 21 * 60 },    // Wednesday
      4: { open: 7.5 * 60, close: 21 * 60 },    // Thursday
      5: { open: 7.5 * 60, close: 21 * 60 },    // Friday
      6: { open: 8 * 60, close: 21 * 60 }       // Saturday
    };

    const today = schedule[day];
    const isOpen = currentMinutes >= today.open && currentMinutes < today.close;

    const statusText = isOpen ? 'Abierto ahora' : 'Cerrado';
    const statusClass = isOpen ? 'location-bar__status--open' : 'location-bar__status--closed';

    if (this.statusEl) {
      this.statusEl.textContent = statusText;
      this.statusEl.className = `location-bar__status ${statusClass}`;
    }

    // Update hours display
    if (this.hoursEl) {
      const openStr = this.formatTime(today.open);
      const closeStr = this.formatTime(today.close);
      this.hoursEl.textContent = `${openStr} - ${closeStr}`;
    }

    // Update schema.org
    this.updateSchema(day, today.open, today.close, isOpen);
  },

  formatTime(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}:${m.toString().padStart(2, '0')}`;
  },

  updateSchema(day, open, close, isOpen) {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const schema = document.querySelector('script[type="application/ld+json"]');
    if (schema) {
      try {
        const data = JSON.parse(schema.textContent);
        if (data['@type'] === 'LocalBusiness' && data.openingHoursSpecification) {
          data.openingHoursSpecification.forEach(spec => {
            if (spec.dayOfWeek === dayNames[day]) {
              spec.opens = this.formatTime(open);
              spec.closes = this.formatTime(close);
            }
          });
          schema.textContent = JSON.stringify(data, null, 2);
        }
      } catch (e) {
        console.warn('Schema update failed:', e);
      }
    }
  }
};

// ========================================
// LQIP (Low Quality Image Placeholders)
// ========================================

const lqip = {
  init() {
    document.addEventListener('load', (e) => {
      if (e.target.tagName === 'IMG' && e.target.dataset.lqip) {
        e.target.style.backgroundImage = `url(${e.target.dataset.lqip})`;
        e.target.style.filter = 'blur(20px)';
        e.target.style.transition = 'filter 0.3s ease';
        // The onload handler in HTML will remove the blur
      }
    }, true);
  }
};

// ========================================
// ADMIN PANEL TRIGGER
// ========================================

let adminPanel = null;

document.addEventListener('cafe:admin-open', async () => {
  if (!adminPanel) {
    const module = await import('./admin.js');
    adminPanel = module.default;
    adminPanel.init();
  }
  adminPanel.open();
});

// ========================================
// INITIALIZATION
// ========================================

document.addEventListener('DOMContentLoaded', () => {
  header.init();
  locationBar.init();
  lqip.init();

  // Page-specific init
  if (document.body.classList.contains('page-carta')) {
    menu.init();
    cart.init();
  }

  if (document.body.classList.contains('page-contacto')) {
    contact.init();
  }

  // Update active nav link
  header.updateActiveLink(window.location.pathname);
});

// ========================================
// CONTACT FORM
// ========================================

const contact = {
  init() {
    this.form = $('#contact-form');
    if (!this.form) return;
    this.bindEvents();
  },

  bindEvents() {
    this.form.addEventListener('submit', (e) => this.handleSubmit(e));
  },

  async handleSubmit(e) {
    e.preventDefault();
    const submitBtn = this.form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;

    const formData = new FormData(this.form);
    const data = Object.fromEntries(formData);

    // Basic validation
    if (!data.name || !data.phone || !data.message) {
      this.showError('Por favor completa todos los campos obligatorios');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Enviando...';

    // Send via WhatsApp
    const message = `Nuevo mensaje de ${data.name} (${data.phone})${data.email ? `, ${data.email}` : ''}:\n\n${data.message}`;
    openWhatsApp(message);

    this.showSuccess('¡Mensaje enviado! Te responderemos por WhatsApp.');
    this.form.reset();
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  },

  showError(message) {
    this.showToast(message, 'error');
  },

  showSuccess(message) {
    this.showToast(message, 'success');
  },

  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `admin-toast admin-toast--${type} admin-toast--show`;
    toast.textContent = message;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'polite');
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.classList.remove('admin-toast--show');
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }
};

// Export for potential module usage
export { state, formatPrice, openWhatsApp, menu, cart, header, locationBar };