/**
 * Café de la Esquina — Admin Panel
 * Inline editing, localStorage persistence, backup/import/export
 * Access: 5x click logo or ?admin=1 in URL
 */

const AdminPanel = {
  // State
  menu: [],
  categories: [],
  settings: {},
  unsavedChanges: false,
  activeTab: 'menu',

  // DOM Elements
  elements: {},

  // ========================================
  // INITIALIZATION
  // ========================================

  init() {
    this.bindLogoClick();
    this.checkUrlParam();
    this.loadData();
    this.render();
    this.bindEvents();
  },

  bindLogoClick() {
    const logo = document.querySelector('.header__logo, .footer__logo');
    if (!logo) return;

    let clicks = 0;
    let lastClick = 0;

    logo.addEventListener('click', (e) => {
      const now = Date.now();
      if (now - lastClick > 1000) clicks = 0;
      clicks++;
      lastClick = now;

      if (clicks >= 5) {
        e.preventDefault();
        this.open();
        clicks = 0;
        this.showToast('Panel admin activado (5 clicks)', 'info');
      }
    });
  },

  checkUrlParam() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('admin') === '1') {
      this.open();
      // Clean URL
      history.replaceState({}, '', window.location.pathname);
    }
  },

  // ========================================
  // DATA MANAGEMENT
  // ========================================

  loadData() {
    // Load from localStorage or fetch from JSON
    const savedMenu = localStorage.getItem('cafe-menu-data');
    const savedCats = localStorage.getItem('cafe-categories-data');
    const savedSettings = localStorage.getItem('cafe-settings-data');

    if (savedMenu) {
      this.menu = JSON.parse(savedMenu);
    } else {
      // Will be loaded from fetch in render()
      this.menu = [];
    }

    if (savedCats) {
      this.categories = JSON.parse(savedCats);
    } else {
      this.categories = [];
    }

    if (savedSettings) {
      this.settings = JSON.parse(savedSettings);
    } else {
      this.settings = {
        whatsappNumber: '34600000000',
        businessName: 'Café de la Esquina',
        address: 'C/ Alcalá 123, 28022 Madrid (Canillejas)',
        openingHours: {
          monday: { open: '07:30', close: '21:00', closed: false },
          tuesday: { open: '07:30', close: '21:00', closed: false },
          wednesday: { open: '07:30', close: '21:00', closed: false },
          thursday: { open: '07:30', close: '21:00', closed: false },
          friday: { open: '07:30', close: '22:00', closed: false },
          saturday: { open: '08:30', close: '22:00', closed: false },
          sunday: { open: '09:00', close: '20:00', closed: false }
        }
      };
    }
  },

  async fetchInitialData() {
    try {
      const response = await fetch('/assets/data/menu.json');
      const data = await response.json();
      if (!localStorage.getItem('cafe-menu-data')) {
        this.menu = data.items || [];
        this.categories = data.categories || [];
        this.settings = { ...this.settings, ...data.settings };
        this.saveAll();
      }
    } catch (e) {
      console.warn('Could not load initial menu.json:', e);
    }
  },

  saveAll() {
    localStorage.setItem('cafe-menu-data', JSON.stringify(this.menu));
    localStorage.setItem('cafe-categories-data', JSON.stringify(this.categories));
    localStorage.setItem('cafe-settings-data', JSON.stringify(this.settings));
    this.unsavedChanges = false;
    this.updateSaveIndicator();
    this.showToast('Cambios guardados en localStorage', 'success');
  },

  // ========================================
  // RENDERING
  // ========================================

  render() {
    this.fetchInitialData().then(() => {
      this.buildPanel();
      this.renderActiveTab();
    });
  },

  buildPanel() {
    const existing = document.getElementById('admin-panel');
    if (existing) existing.remove();

    const panel = document.createElement('div');
    panel.id = 'admin-panel';
    panel.className = 'admin-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', 'Panel de administración');
    panel.innerHTML = this.getPanelHTML();
    document.body.appendChild(panel);

    this.cacheElements();
  },

  getPanelHTML() {
    return `
      <div class="admin-panel__backdrop" data-admin-close></div>
      <div class="admin-panel__drawer">
        <header class="admin-panel__header">
          <h1 class="admin-panel__title">Panel Admin</h1>
          <button class="admin-panel__close" data-admin-close aria-label="Cerrar panel">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </header>
        <nav class="admin-panel__tabs" role="tablist" aria-label="Secciones del panel">
          <button class="admin-panel__tab admin-panel__tab--active" role="tab" aria-selected="true" data-tab="menu">📋 Carta</button>
          <button class="admin-panel__tab" role="tab" aria-selected="false" data-tab="categories">📂 Categorías</button>
          <button class="admin-panel__tab" role="tab" aria-selected="false" data-tab="settings">⚙️ Ajustes</button>
          <button class="admin-panel__tab" role="tab" aria-selected="false" data-tab="tools">🛠️ Herramientas</button>
        </nav>
        <div class="admin-panel__content">
          <!-- Tab panels rendered dynamically -->
        </div>
        <div class="admin-panel__save-bar">
          <span class="admin-panel__save-status" id="admin-save-status">Sin cambios</span>
          <button class="btn btn--primary btn--sm" id="admin-save-btn" disabled>Guardar todo</button>
        </div>
      </div>
    `;
  },

  cacheElements() {
    this.elements = {
      panel: $('#admin-panel'),
      drawer: $('#admin-panel .admin-panel__drawer'),
      backdrop: $('#admin-panel .admin-panel__backdrop'),
      closeBtns: $$('#admin-panel [data-admin-close]'),
      tabs: $$('#admin-panel .admin-panel__tab'),
      content: $('#admin-panel .admin-panel__content'),
      saveBtn: $('#admin-save-btn'),
      saveStatus: $('#admin-save-status')
    };
  },

  bindEvents() {
    // Delegated events on document for dynamic content
    document.addEventListener('click', (e) => this.handleClick(e));
    document.addEventListener('change', (e) => this.handleChange(e));
    document.addEventListener('input', (e) => this.handleInput(e));
    document.addEventListener('keydown', (e) => this.handleKeydown(e));
  },

  handleClick(e) {
    const closeBtn = e.target.closest('[data-admin-close]');
    if (closeBtn) { this.close(); return; }

    const tab = e.target.closest('.admin-panel__tab');
    if (tab) { this.switchTab(tab.dataset.tab); return; }

    const action = e.target.closest('[data-action]');
    if (action) { this.handleAction(action.dataset.action, action, e); return; }

    // Edit inline
    const editBtn = e.target.closest('[data-edit]');
    if (editBtn) { this.startInlineEdit(editBtn); return; }

    const saveBtn = e.target.closest('[data-save]');
    if (saveBtn) { this.saveInlineEdit(saveBtn); return; }

    const cancelBtn = e.target.closest('[data-cancel]');
    if (cancelBtn) { this.cancelInlineEdit(cancelBtn); return; }
  },

  handleChange(e) {
    if (e.target.matches('.admin-table__input, .admin-table__select, .admin-form__input, .admin-form__select, .admin-form__textarea')) {
      this.markUnsaved();
    }
  },

  handleInput(e) {
    if (e.target.matches('[data-live-update]')) {
      const row = e.target.closest('tr');
      const id = row?.dataset.id;
      if (id) this.updateItemLive(id, e.target);
    }
  },

  handleKeydown(e) {
    if (e.key === 'Escape') { this.close(); }
    if (e.key === 'Enter' && e.target.matches('.admin-table__input')) {
      e.target.blur(); // Trigger save
    }
  },

  // ========================================
  // TAB MANAGEMENT
  // ========================================

  switchTab(tabName) {
    this.activeTab = tabName;
    this.elements.tabs.forEach(t => {
      t.classList.toggle('admin-panel__tab--active', t.dataset.tab === tabName);
      t.setAttribute('aria-selected', t.dataset.tab === tabName);
    });
    this.renderActiveTab();
  },

  renderActiveTab() {
    switch (this.activeTab) {
      case 'menu': this.renderMenuTab(); break;
      case 'categories': this.renderCategoriesTab(); break;
      case 'settings': this.renderSettingsTab(); break;
      case 'tools': this.renderToolsTab(); break;
    }
  },

  // ========================================
  // MENU TAB
  // ========================================

  renderMenuTab() {
    this.elements.content.innerHTML = `
      <div class="admin-panel__section">
        <div class="admin-panel__section-header">
          <h2 class="admin-panel__section-title">Items de la carta</h2>
          <button class="btn btn--primary btn--sm admin-panel__btn" data-action="add-item">+ Añadir plato</button>
        </div>
        <div class="admin-table-wrapper">
          <table class="admin-table" role="grid">
            <thead>
              <tr>
                <th scope="col">Foto</th>
                <th scope="col">Nombre</th>
                <th scope="col">Categoría</th>
                <th scope="col">Precio</th>
                <th scope="col">Badges</th>
                <th scope="col">Disponible</th>
                <th scope="col">Destacado</th>
                <th scope="col">Acciones</th>
              </tr>
            </thead>
            <tbody>
              ${this.menu.map(item => this.renderItemRow(item)).join('')}
            </tbody>
          </table>
        </div>
        ${this.menu.length === 0 ? '<p class="admin-empty">No hay items. Pulsa "Añadir plato" para empezar.</p>' : ''}
      </div>
    `;
  },

  renderItemRow(item) {
    const cat = this.categories.find(c => c.id === item.category);
    const badges = this.renderBadges(item);
    return `
      <tr data-id="${item.id}" data-category="${item.category}">
        <td class="admin-table__cell-image">
          <img src="${item.image || ''}" alt="" class="admin-table__cell-image" 
               onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 48 48%22%3E%3Crect fill=%22%23E8DFD6%22 width=%2248%22 height=%2248%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-size=%2210%22 fill=%22%239B8470%22%3E%s%3C/text%3E%3C/svg%22'.replace('%s', encodeURIComponent((this.categories.find(c=>c.id==='${item.category}')?.icon)||'🍽️'))">
        </td>
        <td>
          <span class="admin-table__text" data-field="name">${this.escapeHtml(item.name)}</span>
          <input type="text" class="admin-table__input" data-field="name" value="${this.escapeHtml(item.name)}" style="display:none" aria-label="Nombre">
        </td>
        <td>
          <select class="admin-table__select" data-field="category" aria-label="Categoría">
            ${this.categories.map(c => `<option value="${c.id}" ${c.id === item.category ? 'selected' : ''}>${c.icon} ${c.name}</option>`).join('')}
          </select>
        </td>
        <td>
          <span class="admin-table__text text-price" data-field="price">${this.formatPrice(item.price)}</span>
          <input type="number" step="0.01" min="0" class="admin-table__input admin-table__input--price" data-field="price" value="${item.price}" style="display:none" aria-label="Precio en euros">
        </td>
        <td>
          <div class="admin-badges" data-field="badges">${badges}</div>
        </td>
        <td>
          <label class="form-checkbox">
            <input type="checkbox" class="admin-table__select" data-field="available" ${item.available ? 'checked' : ''} aria-label="Disponible">
            <span class="form-checkbox__check"></span>
          </label>
        </td>
        <td>
          <label class="form-checkbox">
            <input type="checkbox" class="admin-table__select" data-field="popular" ${item.popular ? 'checked' : ''} aria-label="Popular">
            <span class="form-checkbox__check"></span>
          </label>
        </td>
        <td>
          <div class="admin-table__actions">
            <button class="admin-table__action" data-action="edit-image" data-id="${item.id}" aria-label="Cambiar foto" title="Cambiar foto">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
            </button>
            <button class="admin-table__action" data-action="edit" data-id="${item.id}" aria-label="Editar" title="Editar inline">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            </button>
            <button class="admin-table__action admin-table__action--delete" data-action="delete" data-id="${item.id}" aria-label="Eliminar" title="Eliminar">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  },

  renderBadges(item) {
    const badgeMap = {
      new: 'badge--new',
      popular: 'badge--popular',
      dia: 'badge--day',
      vegano: 'badge--vegan',
      'sin-gluten': 'badge--gf'
    };
    return (item.badges || []).map(b => `<span class="badge ${badgeMap[b] || ''}">${this.escapeHtml(b)}</span>`).join(' ') || '<span class="text-caption" style="color:var(--color-text-muted)">—</span>';
  },

  // ========================================
  // CATEGORIES TAB
  // ========================================

  renderCategoriesTab() {
    this.elements.content.innerHTML = `
      <div class="admin-panel__section">
        <h2 class="admin-panel__section-title">Categorías</h2>
        <div class="admin-table-wrapper">
          <table class="admin-table">
            <thead>
              <tr>
                <th scope="col">Icono</th>
                <th scope="col">Nombre</th>
                <th scope="col">Orden</th>
                <th scope="col">Visible</th>
                <th scope="col">Acciones</th>
              </tr>
            </thead>
            <tbody>
              ${this.categories.map(cat => `
                <tr data-id="${cat.id}">
                  <td><span class="admin-table__text" data-field="icon">${cat.icon}</span>
                    <input type="text" class="admin-table__input" data-field="icon" value="${this.escapeHtml(cat.icon)}" style="display:none" maxlength="2" aria-label="Icono"></td>
                  <td><span class="admin-table__text" data-field="name">${this.escapeHtml(cat.name)}</span>
                    <input type="text" class="admin-table__input" data-field="name" value="${this.escapeHtml(cat.name)}" style="display:none" aria-label="Nombre"></td>
                  <td><input type="number" class="admin-table__input admin-table__input--small" data-field="order" value="${cat.order}" min="0" aria-label="Orden"></td>
                  <td><label class="form-checkbox"><input type="checkbox" class="admin-table__select" data-field="visible" ${cat.visible !== false ? 'checked' : ''} aria-label="Visible"><span class="form-checkbox__check"></span></label></td>
                  <td><div class="admin-table__actions">
                    <button class="admin-table__action" data-action="edit-category" data-id="${cat.id}" aria-label="Editar"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button>
                    <button class="admin-table__action admin-table__action--delete" data-action="delete-category" data-id="${cat.id}" aria-label="Eliminar"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
                  </div></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        <button class="btn btn--secondary btn--sm admin-panel__btn" data-action="add-category" style="margin-top: var(--space-4)">+ Añadir categoría</button>
      </div>
    `;
  },

  // ========================================
  // SETTINGS TAB
  // ========================================

  renderSettingsTab() {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const dayLabels = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

    this.elements.content.innerHTML = `
      <div class="admin-panel__section">
        <h2 class="admin-panel__section-title">Información del negocio</h2>
        <form class="admin-form" id="admin-settings-form">
          <div class="admin-form__row admin-form__row--2">
            <div class="form-group">
              <label class="form-label" for="setting-name">Nombre del negocio</label>
              <input type="text" class="form-input admin-form__input" id="setting-name" name="name" value="${this.escapeHtml(this.settings.businessName)}">
            </div>
            <div class="form-group">
              <label class="form-label" for="setting-whatsapp">WhatsApp (solo números, con código país)</label>
              <input type="tel" class="form-input admin-form__input" id="setting-whatsapp" name="whatsapp" value="${this.escapeHtml(this.settings.whatsappNumber)}" pattern="[0-9]+" placeholder="34600000000">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label" for="setting-address">Dirección</label>
            <input type="text" class="form-input admin-form__input" id="setting-address" name="address" value="${this.escapeHtml(this.settings.address)}">
          </div>
        </form>
      </div>

      <div class="admin-panel__section">
        <h2 class="admin-panel__section-title">Horario de apertura</h2>
        <div class="admin-hours-grid">
          ${days.map((day, i) => `
            <div class="admin-hour-row">
              <label class="admin-hour-label">
                <input type="checkbox" class="admin-form__input" name="hours[${day}][closed]" ${this.settings.openingHours[day]?.closed ? 'checked' : ''} data-day="${day}">
                <span>${dayLabels[i]}</span>
              </label>
              <div class="admin-hour-times" data-day="${day}" ${this.settings.openingHours[day]?.closed ? 'style="opacity:0.5;pointer-events:none"' : ''}>
                <input type="time" class="admin-form__input admin-form__input--time" name="hours[${day}][open]" value="${this.settings.openingHours[day]?.open || ''}" aria-label="Apertura">
                <span>–</span>
                <input type="time" class="admin-form__input admin-form__input--time" name="hours[${day}][close]" value="${this.settings.openingHours[day]?.close || ''}" aria-label="Cierre">
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="admin-form__actions">
        <button type="button" class="btn btn--primary" data-action="save-settings">Guardar ajustes</button>
      </div>
    `;

    // Bind checkbox toggles for closed days
    $$('.admin-hour-row input[type="checkbox"]').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const day = e.target.dataset.day;
        const times = $(`[data-day="${day}"].admin-hour-times`);
        if (times) {
          times.style.opacity = e.target.checked ? '0.5' : '1';
          times.style.pointerEvents = e.target.checked ? 'none' : 'auto';
          $$('input', times).forEach(i => i.disabled = e.target.checked);
        }
      });
    });
  },

  // ========================================
  // TOOLS TAB
  // ========================================

  renderToolsTab() {
    this.elements.content.innerHTML = `
      <div class="admin-panel__section">
        <h2 class="admin-panel__section-title">Importar / Exportar</h2>
        <div class="admin-tools__grid">
          <div class="admin-tool-card">
            <h3 class="admin-tool-card__title">Exportar backup</h3>
            <p class="admin-tool-card__desc">Descarga un archivo JSON con toda la carta, categorías y ajustes.</p>
            <button class="btn btn--primary btn--full" data-action="export-backup">Descargar backup.json</button>
          </div>
          <div class="admin-tool-card">
            <h3 class="admin-tool-card__title">Importar backup</h3>
            <p class="admin-tool-card__desc">Restaura datos desde un archivo backup.json previo. <strong>Sobrescribe todo.</strong></p>
            <input type="file" accept=".json" class="admin-form__input" id="import-file" style="margin-bottom: var(--space-3)">
            <button class="btn btn--secondary btn--full" data-action="import-backup">Importar archivo seleccionado</button>
          </div>
          <div class="admin-tool-card">
            <h3 class="admin-tool-card__title">Resetear a datos iniciales</h3>
            <p class="admin-tool-card__desc">Borra todo el localStorage y recarga desde menu.json original.</p>
            <button class="btn btn--ghost btn--full admin-table__action--delete" data-action="reset-data">Resetear todo</button>
          </div>
        </div>
      </div>

      <div class="admin-panel__section">
        <h2 class="admin-panel__section-title">Subir imágenes (base64 → localStorage)</h3>
        <p class="text-caption" style="margin-bottom: var(--space-4)">Las imágenes se guardan como base64 en localStorage. Máx 100KB cada una recomendado.</p>
        <div class="admin-upload">
          <input type="file" accept="image/*" class="admin-form__input" id="upload-image" data-item-id="">
          <select class="admin-form__select" id="upload-target" style="margin-bottom: var(--space-3); width: auto;">
            <option value="">Selecciona un plato...</option>
            ${this.menu.map(item => `<option value="${item.id}">${this.escapeHtml(item.name)}</option>`).join('')}
          </select>
          <button class="btn btn--primary" data-action="upload-image">Subir y asignar</button>
          <div id="upload-preview" class="admin-upload-preview"></div>
        </div>
      </div>
    `;
  },

  // ========================================
  // ACTIONS
  // ========================================

  handleAction(action, el, e) {
    switch (action) {
      case 'add-item': this.addItem(); break;
      case 'add-category': this.addCategory(); break;
      case 'edit': this.startInlineEdit(el); break;
      case 'edit-category': this.startInlineEdit(el); break;
      case 'edit-image': this.openImageUpload(el.dataset.id); break;
      case 'delete': this.deleteItem(el.dataset.id); break;
      case 'delete-category': this.deleteCategory(el.dataset.id); break;
      case 'save-settings': this.saveSettings(); break;
      case 'export-backup': this.exportBackup(); break;
      case 'import-backup': this.importBackup(); break;
      case 'reset-data': this.resetData(); break;
      case 'upload-image': this.uploadImage(); break;
      case 'save': this.saveAll(); break;
    }
  },

  // --- Menu Items ---

  addItem() {
    const newId = 'item-' + Date.now();
    const newItem = {
      id: newId,
      name: 'Nuevo plato',
      description: '',
      price: 0,
      category: this.categories[0]?.id || 'cafes',
      image: '',
      lqip: '',
      badges: [],
      allergens: [],
      dietary: [],
      available: true,
      popular: false,
      dailySpecial: false,
      nutrition: { kcal: 0, size: '' }
    };
    this.menu.unshift(newItem);
    this.markUnsaved();
    this.renderMenuTab();
    // Scroll to new row
    setTimeout(() => {
      const row = document.querySelector(`[data-id="${newId}"]`);
      row?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      this.startInlineEdit(row.querySelector('[data-action="edit"]'));
    }, 50);
  },

  deleteItem(id) {
    if (!confirm('¿Eliminar este plato? No se puede deshacer.')) return;
    this.menu = this.menu.filter(i => i.id !== id);
    this.markUnsaved();
    this.renderMenuTab();
  },

  updateItemLive(id, input) {
    const item = this.menu.find(i => i.id === id);
    if (!item) return;
    const field = input.dataset.field;
    let value = input.type === 'checkbox' ? input.checked : input.value;
    if (field === 'price') value = parseFloat(value) || 0;
    if (field === 'order') value = parseInt(value) || 0;
    item[field] = value;
    this.markUnsaved();
  },

  // --- Categories ---

  addCategory() {
    const newId = 'cat-' + Date.now();
    const newCat = {
      id: newId,
      name: 'Nueva categoría',
      icon: '🍽️',
      order: this.categories.length + 1,
      visible: true
    };
    this.categories.push(newCat);
    this.markUnsaved();
    this.renderCategoriesTab();
    setTimeout(() => {
      const row = document.querySelector(`[data-id="${newId}"]`);
      this.startInlineEdit(row.querySelector('[data-action="edit-category"]'));
    }, 50);
  },

  deleteCategory(id) {
    if (this.menu.some(i => i.category === id)) {
      alert('No se puede eliminar: hay platos en esta categoría. Mueve o borra esos platos primero.');
      return;
    }
    if (!confirm('¿Eliminar esta categoría?')) return;
    this.categories = this.categories.filter(c => c.id !== id);
    this.markUnsaved();
    this.renderCategoriesTab();
  },

  // --- Settings ---

  saveSettings() {
    const form = $('#admin-settings-form');
    const formData = new FormData(form);
    this.settings.businessName = formData.get('name');
    this.settings.whatsappNumber = formData.get('whatsapp');
    this.settings.address = formData.get('address');

    // Hours
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    days.forEach(day => {
      const closed = formData.get(`hours[${day}][closed]`) === 'on';
      this.settings.openingHours[day] = {
        closed,
        open: formData.get(`hours[${day}][open]`) || '00:00',
        close: formData.get(`hours[${day}][close]`) || '00:00'
      };
    });

    this.markUnsaved();
    this.showToast('Ajustes guardados (pendiente de "Guardar todo")', 'info');
  },

  // --- Backup / Import / Export ---

  exportBackup() {
    const data = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      menu: this.menu,
      categories: this.categories,
      settings: this.settings
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cafe-esquina-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.showToast('Backup exportado', 'success');
  },

  importBackup() {
    const fileInput = $('#import-file');
    if (!fileInput?.files?.length) { alert('Selecciona un archivo .json'); return; }
    const file = fileInput.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (data.menu) this.menu = data.menu;
        if (data.categories) this.categories = data.categories;
        if (data.settings) this.settings = { ...this.settings, ...data.settings };
        this.saveAll();
        this.renderActiveTab();
        this.showToast('Backup importado correctamente', 'success');
      } catch (err) {
        console.error(err);
        alert('Archivo JSON inválido');
        this.showToast('Error al importar: JSON inválido', 'error');
      }
    };
    reader.readAsText(file);
  },

  resetData() {
    if (!confirm('¿Seguro? Se borrarán TODOS los cambios y se recargará menu.json original.')) return;
    localStorage.removeItem('cafe-menu-data');
    localStorage.removeItem('cafe-categories-data');
    localStorage.removeItem('cafe-settings-data');
    this.menu = [];
    this.categories = [];
    this.settings = {};
    this.loadData();
    this.renderActiveTab();
    this.showToast('Datos reseteados, recargando...', 'info');
    setTimeout(() => window.location.reload(), 1000);
  },

  // --- Images ---

  openImageUpload(itemId) {
    this.switchTab('tools');
    setTimeout(() => {
      const select = $('#upload-target');
      if (select) select.value = itemId;
    }, 50);
  },

  uploadImage() {
    const fileInput = $('#upload-image');
    const select = $('#upload-target');
    const preview = $('#upload-preview');
    const itemId = select?.value;

    if (!itemId) { alert('Selecciona un plato'); return; }
    if (!fileInput?.files?.length) { alert('Selecciona una imagen'); return; }

    const file = fileInput.files[0];
    if (file.size > 200000) { // 200KB limit for base64
      if (!confirm('La imagen es >200KB. El base64 será grande. ¿Continuar?')) return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target.result;
      const item = this.menu.find(i => i.id === itemId);
      if (item) {
        item.image = base64;
        // Generate LQIP (tiny blurred version)
        this.generateLQIP(base64).then(lqip => {
          item.lqip = lqip;
          this.markUnsaved();
          this.showToast('Imagen subida y asignada', 'success');
          preview.innerHTML = `<img src="${base64}" alt="Preview" style="max-width:100px;border-radius:var(--radius-md)">`;
        });
      }
    };
    reader.readAsDataURL(file);
  },

  generateLQIP(base64) {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 20;
        canvas.height = 20;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, 20, 20);
        // Blur via CSS filter would be applied on img element
        resolve(canvas.toDataURL('image/webp', 0.3));
      };
      img.src = base64;
    });
  },

  // ========================================
  // INLINE EDITING
  // ========================================

  startInlineEdit(btn) {
    const row = btn.closest('tr');
    if (!row) return;

    // Hide text, show inputs
    $$('.admin-table__text', row).forEach(el => el.style.display = 'none');
    $$('.admin-table__input, .admin-table__select', row).forEach(el => el.style.display = '');

    // Swap buttons
    btn.style.display = 'none';
    const saveBtn = row.querySelector('[data-save]');
    const cancelBtn = row.querySelector('[data-cancel]');
    if (saveBtn) saveBtn.style.display = '';
    if (cancelBtn) cancelBtn.style.display = '';

    // Focus first input
    const firstInput = row.querySelector('.admin-table__input, .admin-table__select');
    firstInput?.focus();
  },

  saveInlineEdit(btn) {
    const row = btn.closest('tr');
    if (!row) return;
    const id = row.dataset.id;

    // Show text, hide inputs
    $$('.admin-table__text', row).forEach(el => el.style.display = '');
    $$('.admin-table__input, .admin-table__select', row).forEach(el => el.style.display = 'none');

    // Update text content from inputs
    $$('.admin-table__input, .admin-table__select', row).forEach(input => {
      const field = input.dataset.field;
      const textEl = row.querySelector(`.admin-table__text[data-field="${field}"]`);
      if (textEl) {
        if (input.type === 'checkbox') {
          textEl.textContent = input.checked ? 'Sí' : 'No';
        } else if (field === 'price') {
          textEl.textContent = this.formatPrice(parseFloat(input.value) || 0);
        } else if (input.tagName === 'SELECT') {
          const opt = input.selectedOptions[0];
          textEl.textContent = opt ? opt.textContent : '';
        } else {
          textEl.textContent = input.value;
        }
      }
    });

    // Swap buttons back
    btn.style.display = 'none';
    row.querySelector('[data-cancel]').style.display = 'none';
    row.querySelector('[data-action="edit"]').style.display = '';

    this.markUnsaved();
  },

  cancelInlineEdit(btn) {
    const row = btn.closest('tr');
    if (!row) return;
    const id = row.dataset.id;
    const item = this.menu.find(i => i.id === id) || this.categories.find(c => c.id === id);
    if (!item) return;

    // Reset inputs to original values
    $$('.admin-table__input, .admin-table__select', row).forEach(input => {
      const field = input.dataset.field;
      if (input.type === 'checkbox') input.checked = !!item[field];
      else if (input.tagName === 'SELECT') input.value = item[field] || '';
      else input.value = item[field] ?? '';
    });

    // Show text, hide inputs
    $$('.admin-table__text', row).forEach(el => el.style.display = '');
    $$('.admin-table__input, .admin-table__select', row).forEach(el => el.style.display = 'none');

    // Swap buttons
    btn.style.display = 'none';
    row.querySelector('[data-save]').style.display = 'none';
    row.querySelector('[data-action="edit"]').style.display = '';
  },

  // ========================================
  // PANEL OPEN/CLOSE
  // ========================================

  open() {
    if (!this.elements.panel) this.buildPanel();
    this.elements.panel.classList.add('admin-panel--open');
    document.body.style.overflow = 'hidden';
    // Focus trap
    this.elements.closeBtns[0]?.focus();
  },

  close() {
    if (this.unsavedChanges && !confirm('Hay cambios sin guardar. ¿Cerrar anyway?')) return;
    this.elements.panel?.classList.remove('admin-panel--open');
    document.body.style.overflow = '';
  },

  // ========================================
  // UI HELPERS
  // ========================================

  markUnsaved() {
    this.unsavedChanges = true;
    this.updateSaveIndicator();
  },

  updateSaveIndicator() {
    if (this.elements.saveStatus) {
      this.elements.saveStatus.textContent = this.unsavedChanges ? 'Cambios sin guardar' : 'Todo guardado';
      this.elements.saveStatus.style.color = this.unsavedChanges ? 'var(--color-warning)' : 'var(--color-success)';
    }
    if (this.elements.saveBtn) {
      this.elements.saveBtn.disabled = !this.unsavedChanges;
    }
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
    }, 3000);
  },

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  formatPrice(price) {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(price);
  }
};

// Auto-init if on page with admin param or trigger
if (typeof window !== 'undefined') {
  window.AdminPanel = AdminPanel;
  // Listen for custom event from main.js
  document.addEventListener('cafe:admin-open', () => AdminPanel.open());
}

export default AdminPanel;