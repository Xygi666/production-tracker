/**
 * Обновлённая логика:
 * - Новая ставка: (Оклад + Выручка месяца) / Факт.часы месяца
 * - Ручные смены: простая форма (часы) на главном экране
 * - Убраны “нормочасы” из расчётов ставки и переработки
 * - “Доход за месяц” показан в шапке, “Записей за день” удалено
 * - Название “Учёт продукции”
 */

const CONFIG = {
  VERSION: '3.1.0',
  STORAGE_KEYS: {
    PRODUCTS: 'pt_products_v3',
    ENTRIES: 'pt_entries_v3',
    SHIFTS: 'pt_shifts_v3',
    SALARY: 'pt_salary_v3',
    THEME: 'pt_theme_v3',
    LOG: 'pt_log_v3',
    PRESETS: 'pt_presets_v3',
    BACKUP: 'pt_backup_v3'
  },
  DEFAULT_CURRENCY: '₽',
  DATE_FORMAT: 'ru-RU',
  MAX_LOG: 1000
};

const SafeStorage = {
  get(key, fallback = null) {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
    catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch { alert('Ошибка сохранения данных'); return false; }
  },
  getRaw(key, fallback = '') { try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; } },
  setRaw(key, value) { try { localStorage.setItem(key, value); return true; } catch { return false; } }
};

class ProductionAccountingApp {
  constructor() {
    this.data = {
      products: SafeStorage.get(CONFIG.STORAGE_KEYS.PRODUCTS, []),
      entries: SafeStorage.get(CONFIG.STORAGE_KEYS.ENTRIES, []),
      shifts: SafeStorage.get(CONFIG.STORAGE_KEYS.SHIFTS, []),
      salary: SafeStorage.get(CONFIG.STORAGE_KEYS.SALARY, {
        baseSalary: 50000, taxRate: 13, advanceAmount: 20000,
        workSchedule: 'off', hoursPerShift: 12, scheduleStartDate: '2025-09-01'
      }),
      log: SafeStorage.get(CONFIG.STORAGE_KEYS.LOG, []),
      presets: SafeStorage.get(CONFIG.STORAGE_KEYS.PRESETS, [1,5,10,25,50]),
      theme: SafeStorage.getRaw(CONFIG.STORAGE_KEYS.THEME, 'classic'),
      backup: SafeStorage.get(CONFIG.STORAGE_KEYS.BACKUP, { autoBackup: false, backupPeriod: 'weekly', backupService: 'email', lastBackup: null, backupHistory: [] })
    };
    if (!this.data.products?.length) {
      this.data.products = [
        { id: 1, name: 'Изделие А', price: 100, archived: false, created: new Date().toISOString() }
      ];
    }

    this.initDOM();
    this.bindEvents();
    this.applyTheme(this.data.theme);
    this.renderProducts();
    this.renderPresets();
    this.renderRecords();
    this.renderStatistics();
    this.renderHistory();
  }

  initDOM() {
    // Навигация/экраны
    this.navTabs = document.querySelectorAll('.nav__tab');
    this.screens = document.querySelectorAll('.screen');

    // Шапка
    this.monthSumHeader = document.getElementById('monthSumHeader');
    this.settingsBtn = document.getElementById('settingsBtn');
    this.exportJsonBtn = document.getElementById('exportJsonBtn');
    this.reloadBtn = document.getElementById('reloadBtn');

    // Учёт продукции
    this.productSelect = document.getElementById('productSelect');
    this.quantityInput = document.getElementById('quantityInput');
    this.decreaseBtn = document.getElementById('decreaseBtn');
    this.increaseBtn = document.getElementById('increaseBtn');
    this.presetsContainer = document.getElementById('presetsContainer');
    this.sumAmount = document.getElementById('sumAmount');
    this.addRecordBtn = document.getElementById('addRecordBtn');
    this.recordsList = document.getElementById('recordsList');
    this.exportCsvBtn = document.getElementById('exportCsvBtn');

    // Ручная смена (упрощённо)
    this.manualShiftHours = document.getElementById('manualShiftHours');
    this.addManualShiftBtn = document.getElementById('addManualShiftBtn');

    // Статистика
    this.statsGrid = document.getElementById('statsGrid');

    // История
    this.filterDate = document.getElementById('filterDate');
    this.filterAction = document.getElementById('filterAction');
    this.historyList = document.getElementById('historyList');
    this.exportHistoryBtn = document.getElementById('exportHistoryBtn');

    // Настройки
    this.settingsModal = document.getElementById('settingsModal');
    this.closeSettingsBtn = document.getElementById('closeSettingsBtn');
    this.saveSettingsBtn = document.getElementById('saveSettingsBtn');
    this.cancelSettingsBtn = document.getElementById('cancelSettingsBtn');

    this.settingsTabs = document.querySelectorAll('.settings-tab');
    this.settingsPanels = document.querySelectorAll('.settings-panel');

    this.baseSalary = document.getElementById('baseSalary');
    this.taxRate = document.getElementById('taxRate');
    this.advanceAmount = document.getElementById('advanceAmount');
    this.workSchedule = document.getElementById('workSchedule');
    this.hoursPerShift = document.getElementById('hoursPerShift');
    this.scheduleStartDate = document.getElementById('scheduleStartDate');

    this.addProductBtn = document.getElementById('addProductBtn');
    this.importProductsBtn = document.getElementById('importProductsBtn');
    this.importProductsFile = document.getElementById('importProductsFile');
    this.productsList = document.getElementById('productsList');

    this.themeSelect = document.getElementById('themeSelect');
    this.presetsInput = document.getElementById('presetsInput');

    this.emailBackupBtn = document.getElementById('emailBackupBtn');
    this.yandexBackupBtn = document.getElementById('yandexBackupBtn');
    this.googleBackupBtn = document.getElementById('googleBackupBtn');
    this.autoBackupEnabled = document.getElementById('autoBackupEnabled');
    this.backupPeriod = document.getElementById('backupPeriod');
    this.backupService = document.getElementById('backupService');
    this.restoreBackupBtn = document.getElementById('restoreBackupBtn');
    this.restoreBackupFile = document.getElementById('restoreBackupFile');

    // Модалка подтверждения
    this.confirmModal = document.getElementById('confirmModal');
    this.confirmTitle = document.getElementById('confirmTitle');
    this.confirmMessage = document.getElementById('confirmMessage');
    this.confirmYesBtn = document.getElementById('confirmYesBtn');
    this.confirmNoBtn = document.getElementById('confirmNoBtn');
  }

  bindEvents() {
    // Навигация
    this.navTabs.forEach(t => t.addEventListener('click', (e) => this.switchScreen(e.currentTarget.dataset.tab)));

    // Шапка
    this.settingsBtn?.addEventListener('click', () => this.openSettings());
    this.exportJsonBtn?.addEventListener('click', () => this.exportJson());
    this.reloadBtn?.addEventListener('click', () => location.reload());

    // Учёт продукции
    this.productSelect?.addEventListener('change', () => this.calculateSum());
    this.quantityInput?.addEventListener('input', () => this.calculateSum());
    this.decreaseBtn?.addEventListener('click', () => {
      const current = parseFloat(this.quantityInput.value) || 0;
      const step = parseFloat(this.quantityInput.step) || 1;
      const min = parseFloat(this.quantityInput.min) || 0.01;
      this.quantityInput.value = Math.max(min, current - step);
      this.calculateSum();
    });
    this.increaseBtn?.addEventListener('click', () => {
      const current = parseFloat(this.quantityInput.value) || 0;
      const step = parseFloat(this.quantityInput.step) || 1;
      this.quantityInput.value = current + step;
      this.calculateSum();
    });
    this.addRecordBtn?.addEventListener('click', () => this.addRecord());
    this.exportCsvBtn?.addEventListener('click', () => this.exportCsv());

    // Ручные смены (минимальная форма)
    this.addManualShiftBtn?.addEventListener('click', () => this.addManualShift());

    // История
    this.filterDate?.addEventListener('change', () => this.renderHistory());
    this.filterAction?.addEventListener('change', () => this.renderHistory());
    this.exportHistoryBtn?.addEventListener('click', () => this.exportHistory());

    // Настройки
    this.closeSettingsBtn?.addEventListener('click', () => this.closeSettings());
    this.cancelSettingsBtn?.addEventListener('click', () => this.closeSettings());
    this.saveSettingsBtn?.addEventListener('click', () => this.saveSettings());
    this.settingsModal?.addEventListener('click', (e) => {
      if (e.target === this.settingsModal || e.target.classList.contains('modal__backdrop')) this.closeSettings();
    });
    this.settingsTabs?.forEach(t => t.addEventListener('click', (e) => this.switchSettingsPanel(e.currentTarget.dataset.tab)));

    // Продукты
    this.addProductBtn?.addEventListener('click', () => this.addProductViaPrompts());
    this.importProductsBtn?.addEventListener('click', () => this.importProductsFile.click());
    this.importProductsFile?.addEventListener('change', (e) => this.importProducts(e.target.files[0]));

    // Бэкап
    this.emailBackupBtn?.addEventListener('click', () => this.showInfo('Сначала экспортируйте JSON и отправьте на почту.'));
    this.yandexBackupBtn?.addEventListener('click', () => window.open('https://disk.yandex.ru', '_blank'));
    this.googleBackupBtn?.addEventListener('click', () => window.open('https://drive.google.com', '_blank'));
    this.restoreBackupBtn?.addEventListener('click', () => this.restoreBackupFile.click());
    this.restoreBackupFile?.addEventListener('change', (e) => this.restoreBackup(e.target.files[0]));
  }

  // Навигация/темы
  switchScreen(name) {
    this.navTabs.forEach(t => t.classList.toggle('nav__tab--active', t.dataset.tab === name));
    this.screens.forEach(s => s.classList.toggle('screen--active', s.dataset.screen === name));
    if (name === 'records') this.renderRecords();
    if (name === 'statistics') this.renderStatistics();
    if (name === 'history') this.renderHistory();
  }
  switchSettingsPanel(name) {
    this.settingsTabs.forEach(t => t.classList.toggle('settings-tab--active', t.dataset.tab === name));
    this.settingsPanels.forEach(p => p.classList.toggle('settings-panel--active', p.dataset.panel === name));
  }
  applyTheme(theme) { document.body.dataset.theme = theme; SafeStorage.setRaw(CONFIG.STORAGE_KEYS.THEME, theme); }

  // Продукты/записи
  renderProducts() {
    if (this.productSelect) {
      this.productSelect.innerHTML = '<option value="">Выберите продукт</option>';
      this.data.products.filter(p => !p.archived).forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id; opt.textContent = `${p.name} - ${p.price}${CONFIG.DEFAULT_CURRENCY}`;
        this.productSelect.appendChild(opt);
      });
    }
    // Список в настройках
    if (this.productsList) {
      this.productsList.innerHTML = '';
      this.data.products.forEach(p => {
        const row = document.createElement('div');
        row.className = 'product-item';
        row.innerHTML = `
          <div class="product-info">
            <div class="product-name">${this.escape(p.name)}</div>
            <div class="product-price">${p.price}${CONFIG.DEFAULT_CURRENCY}</div>
          </div>
          <div class="product-actions">
            <button class="btn btn--sm btn--outline" data-act="edit">Изменить</button>
            <button class="btn btn--sm btn--outline" data-act="toggle">${p.archived?'Восстановить':'Архив'}</button>
            <button class="btn btn--sm btn--danger" data-act="del">Удалить</button>
          </div>`;
        row.querySelector('[data-act="edit"]').addEventListener('click', () => this.editProductViaPrompts(p.id));
        row.querySelector('[data-act="toggle"]').addEventListener('click', () => this.toggleArchiveProduct(p.id));
        row.querySelector('[data-act="del"]').addEventListener('click', () => this.deleteProduct(p.id));
        this.productsList.appendChild(row);
      });
    }
  }

  renderPresets() {
    if (!this.presetsContainer) return;
    this.presetsContainer.innerHTML = '';
    (this.data.presets||[]).forEach(v => {
      const b = document.createElement('button');
      b.className = 'preset-btn'; b.textContent = v;
      b.addEventListener('click', () => { this.quantityInput.value = v; this.calculateSum(); });
      this.presetsContainer.appendChild(b);
    });
  }

  calculateSum() {
    const pid = parseInt(this.productSelect?.value);
    const qty = parseFloat(this.quantityInput?.value) || 0;
    if (pid && qty>0) {
      const p = this.data.products.find(x => x.id === pid);
      if (p) { this.sumAmount.textContent = `${(qty*p.price).toFixed(2)} ${CONFIG.DEFAULT_CURRENCY}`; return; }
    }
    this.sumAmount.textContent = `0 ${CONFIG.DEFAULT_CURRENCY}`;
  }

  addRecord() {
    const pid = parseInt(this.productSelect?.value);
    const qty = parseFloat(this.quantityInput?.value);
    if (!pid) return this.alert('Выберите продукт');
    if (!qty || qty<=0) return this.alert('Введите корректное количество');
    const p = this.data.products.find(x => x.id === pid);
    if (!p) return this.alert('Продукт не найден');

    const rec = { id: Date.now(), productId: pid, quantity: qty, price: p.price, sum: qty*p.price, date: new Date().toISOString() };
    this.data.entries.push(rec);
    this.log('add_record', rec, 'Добавлена запись');
    this.saveAll();

    this.quantityInput.value = '';
    this.productSelect.value = '';
    this.calculateSum();
    this.renderRecords();
    this.renderStatistics();
  }

  renderRecords() {
    if (!this.recordsList) return;
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    const monthRecords = this.data.entries.filter(e => {
      const d = new Date(e.date);
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}` === ym;
    }).sort((a,b)=>new Date(b.date)-new Date(a.date));

    const income = monthRecords.reduce((s,r)=>s+r.sum,0);
    if (this.monthSumHeader) this.monthSumHeader.textContent = `${income.toFixed(2)} ${CONFIG.DEFAULT_CURRENCY}`;

    this.recordsList.innerHTML = monthRecords.length? '' :
      `<div class="text-center" style="padding:40px;color:var(--text-secondary);">Записей за текущий месяц нет</div>`;

    monthRecords.forEach(r => {
      const p = this.data.products.find(x=>x.id===r.productId);
      const name = p? p.name : 'Неизвестный продукт';
      const d = new Date(r.date);
      const dateStr = d.toLocaleDateString(CONFIG.DATE_FORMAT);
      const timeStr = d.toLocaleTimeString(CONFIG.DATE_FORMAT, {hour:'2-digit', minute:'2-digit'});
      const item = document.createElement('div');
      item.className = 'record-item';
      item.innerHTML = `
        <div class="record-info">
          <div class="record-title">${this.escape(name)}</div>
          <div class="record-details">${r.quantity} × ${r.price}${CONFIG.DEFAULT_CURRENCY} = ${r.sum.toFixed(2)}${CONFIG.DEFAULT_CURRENCY}</div>
          <div class="record-details">${dateStr} ${timeStr}</div>
        </div>
        <div class="record-actions">
          <button class="btn btn--sm btn--danger">🗑️</button>
        </div>`;
      item.querySelector('button').addEventListener('click', () => this.deleteRecord(r.id));
      this.recordsList.appendChild(item);
    });
  }

  deleteRecord(id) {
    if (!confirm('Удалить запись?')) return;
    const idx = (this.data.entries||[]).findIndex(r=>r.id===id);
    if (idx>=0) {
      const rec = this.data.entries[idx];
      this.data.entries.splice(idx,1);
      this.log('delete_record', rec, 'Удалена запись');
      this.saveAll();
      this.renderRecords();
      this.renderStatistics();
    }
  }

  // Ручные смены
  addManualShift() {
    const hours = parseFloat(this.manualShiftHours?.value);
    if (!hours || hours<=0) return this.alert('Введите часы смены (>0)');
    const shift = {
      id: Date.now(),
      date: new Date().toISOString().slice(0,10),
      hours, type: 'work', comment: '', auto: false
    };
    this.data.shifts.push(shift);
    this.log('add_shift', shift, `Добавлена смена: ${shift.hours} ч`);
    this.saveAll();
    this.manualShiftHours.value = '';
    this.renderStatistics();
  }

  // Статистика
  renderStatistics() {
    if (!this.statsGrid) return;
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth()+1;

    // Выручка за месяц
    const monthRecords = this.data.entries.filter(e => {
      const d = new Date(e.date); return d.getFullYear()===year && (d.getMonth()+1)===month;
    });
    const income = monthRecords.reduce((s,r)=>s+r.sum,0);

    // Факт.часы: ручные + (опционально) авто
    const manualHours = (this.data.shifts||[]).filter(s => {
      const d = new Date(s.date); return d.getFullYear()===year && (d.getMonth()+1)===month && !s.auto;
    }).reduce((s,sft)=>s+(parseFloat(sft.hours)||0),0);

    let autoHours = 0;
    if (this.data.salary.workSchedule !== 'off' && typeof WorkScheduleManager==='function') {
      const ws = new WorkScheduleManager();
      ws.updateSettings(this.data.salary);
      autoHours = ws.calculateAutoHours(year, month);
    }
    const workedHours = manualHours + autoHours;

    // Новая почасовая ставка
    const baseSalary = parseFloat(this.data.salary.baseSalary)||0;
    const hourlyRate = workedHours>0 ? (baseSalary + income)/workedHours : 0;

    // Налог/итог оставим как ориентир (налог с оклада+выручки)
    const taxAmount = (baseSalary + income) * ((parseFloat(this.data.salary.taxRate)||0)/100);
    const finalAmount = (baseSalary + income) - taxAmount - (parseFloat(this.data.salary.advanceAmount)||0);

    const stats = [
      { label:'Доход (выручка)', value:`${income.toFixed(2)} ${CONFIG.DEFAULT_CURRENCY}`, type:'income' },
      { label:'Оклад', value:`${baseSalary.toFixed(2)} ${CONFIG.DEFAULT_CURRENCY}`, type:'neutral' },
      { label:'Часы отработано', value:`${workedHours.toFixed(1)} ч`, type:'neutral' },
      { label:'Почасовая ставка', value:`${hourlyRate.toFixed(2)} ${CONFIG.DEFAULT_CURRENCY}/ч`, type:'neutral' },
      { label:'Налог', value:`${taxAmount.toFixed(2)} ${CONFIG.DEFAULT_CURRENCY}`, type:'expense' },
      { label:'На руки (итог)', value:`${finalAmount.toFixed(2)} ${CONFIG.DEFAULT_CURRENCY}`, type: finalAmount>=0?'income':'expense' }
    ];

    this.statsGrid.innerHTML = '';
    stats.forEach(s => {
      const c = document.createElement('div');
      c.className = `stat-card stat-card--${s.type}`;
      c.innerHTML = `<div class="stat-value">${s.value}</div><div class="stat-label">${s.label}</div>`;
      this.statsGrid.appendChild(c);
    });

    // Обновить доход в шапке
    if (this.monthSumHeader) this.monthSumHeader.textContent = `${income.toFixed(2)} ${CONFIG.DEFAULT_CURRENCY}`;
  }

  // Настройки
  openSettings() {
    if (!this.settingsModal) return;
    const s = this.data.salary||{};
    this.baseSalary.value = s.baseSalary??0;
    this.taxRate.value = s.taxRate??13;
    this.advanceAmount.value = s.advanceAmount??0;
    this.workSchedule.value = s.workSchedule??'off';
    this.hoursPerShift.value = s.hoursPerShift??12;
    this.scheduleStartDate.value = s.scheduleStartDate??'';
    this.themeSelect.value = this.data.theme||'classic';
    this.presetsInput.value = (this.data.presets||[]).join(',');
    this.renderProducts();
    this.settingsModal.classList.add('modal--active');
  }
  closeSettings() { this.settingsModal?.classList.remove('modal--active'); }
  saveSettings() {
    this.data.salary = {
      baseSalary: parseFloat(this.baseSalary.value)||0,
      taxRate: parseFloat(this.taxRate.value)||0,
      advanceAmount: parseFloat(this.advanceAmount.value)||0,
      workSchedule: this.workSchedule.value,
      hoursPerShift: parseFloat(this.hoursPerShift.value)||12,
      scheduleStartDate: this.scheduleStartDate.value||new Date().toISOString().slice(0,10)
    };
    const theme = this.themeSelect.value;
    if (theme !== this.data.theme) { this.data.theme = theme; this.applyTheme(theme); }
    const presets = (this.presetsInput.value||'').split(',').map(x=>parseFloat(x.trim())).filter(x=>!isNaN(x)&&x>0);
    this.data.presets = presets.length? presets : [1,5,10,25,50];
    this.log('settings', this.data.salary, 'Изменены настройки');
    this.saveAll();
    this.closeSettings();
    this.renderPresets();
    this.renderStatistics();
  }

  // Продукты (пока через prompt для простоты)
  addProductViaPrompts() {
    const name = prompt('Название продукта:'); if (!name) return;
    const price = parseFloat(prompt('Цена:')); if (isNaN(price)||price<=0) return alert('Некорректная цена');
    const p = { id: Date.now(), name: name.trim(), price, archived:false, created:new Date().toISOString() };
    this.data.products.push(p);
    this.log('add_product', p, `Добавлен продукт: ${p.name}`);
    this.saveAll();
    this.renderProducts();
  }
  editProductViaPrompts(id) {
    const p = this.data.products.find(x=>x.id===id); if (!p) return;
    const name = prompt('Название:', p.name); if (!name) return;
    const price = parseFloat(prompt('Цена:', p.price)); if (isNaN(price)||price<=0) return alert('Некорректная цена');
    const old = p.name; p.name = name.trim(); p.price = price;
    this.log('edit_product', p, `Изменён продукт: ${old} → ${p.name}`);
    this.saveAll();
    this.renderProducts();
  }
  toggleArchiveProduct(id) {
    const p = this.data.products.find(x=>x.id===id); if (!p) return;
    p.archived = !p.archived;
    this.log('edit_product', p, `${p.archived?'Архивирован':'Восстановлен'} продукт: ${p.name}`);
    this.saveAll();
    this.renderProducts();
  }
  deleteProduct(id) {
    const hasRecords = (this.data.entries||[]).some(e=>e.productId===id);
    if (hasRecords) return alert('Нельзя удалить продукт, по которому есть записи. Переведите его в архив.');
    if (!confirm('Удалить продукт?')) return;
    const idx = (this.data.products||[]).findIndex(p=>p.id===id);
    if (idx>=0) {
      const old = this.data.products[idx];
      this.data.products.splice(idx,1);
      this.log('delete_product', old, `Удалён продукт: ${old.name}`);
      this.saveAll();
      this.renderProducts();
    }
  }

  // Экспорт/импорт/история и утилиты
  exportCsv() {
    const now=new Date(); const ym=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    const list=(this.data.entries||[]).filter(e=>{const d=new Date(e.date);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`===ym;});
    if (!list.length) return alert('Нет записей для экспорта');
    let csv = '\ufeffДата,Продукт,Количество,Цена,Сумма\n';
    list.forEach(r=>{
      const p=this.data.products.find(x=>x.id===r.productId);
      const name=p? p.name:'Неизвестный продукт';
      const date=new Date(r.date).toLocaleDateString(CONFIG.DATE_FORMAT);
      csv+=`"${date}","${name}","${r.quantity}","${r.price}","${r.sum.toFixed(2)}"\n`;
    });
    this.download(csv, `export-${ym}.csv`, 'text/csv;charset=utf-8;');
    this.log('export', {type:'csv', count:list.length}, `Экспорт CSV: ${list.length} записей`);
  }
  exportJson() {
    const payload={version:CONFIG.VERSION,timestamp:new Date().toISOString(),data:this.data};
    this.download(JSON.stringify(payload,null,2), `backup-${new Date().toISOString().slice(0,10)}.json`, 'application/json');
    this.log('export', {type:'json'}, 'Полный экспорт JSON');
  }
  exportHistory() {
    const payload={version:CONFIG.VERSION,timestamp:new Date().toISOString(),history:this.data.log};
    this.download(JSON.stringify(payload,null,2), `history-${new Date().toISOString().slice(0,10)}.json`, 'application/json');
  }
  restoreBackup(file) {
    if (!file) return;
    const fr = new FileReader();
    fr.onload = () => {
      try {
        const b = JSON.parse(fr.result);
        if (!b.data) return alert('Неверный файл');
        this.data = b.data;
        this.saveAll();
        this.applyTheme(this.data.theme||'classic');
        this.renderProducts(); this.renderPresets(); this.renderRecords(); this.renderStatistics(); this.renderHistory();
      } catch { alert('Ошибка чтения файла'); }
    };
    fr.readAsText(file);
  }
  renderHistory() {
    if (!this.historyList) return;
    const dateFilter = this.filterDate?.value;
    const actionFilter = this.filterAction?.value;
    let list=[...(this.data.log||[])];
    if (dateFilter) list=list.filter(e=>new Date(e.timestamp).toISOString().slice(0,10)===dateFilter);
    if (actionFilter) list=list.filter(e=>e.action===actionFilter);
    list.sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp));
    this.historyList.innerHTML = list.length? '' : `<div class="text-center" style="padding:40px;color:var(--text-secondary);">История действий пуста</div>`;
    list.forEach(e=>{
      const d=new Date(e.timestamp);
      const item=document.createElement('div'); item.className='history-item';
      item.innerHTML=`
        <div class="history-header-item">
          <div class="history-action">${this.actionName(e.action)}</div>
          <div class="history-time">${d.toLocaleDateString(CONFIG.DATE_FORMAT)} ${d.toLocaleTimeString(CONFIG.DATE_FORMAT,{hour:'2-digit',minute:'2-digit'})}</div>
        </div>
        <div class="history-details">${this.escape(e.details||'')}</div>`;
      this.historyList.appendChild(item);
    });
  }

  saveAll() {
    SafeStorage.set(CONFIG.STORAGE_KEYS.PRODUCTS, this.data.products);
    SafeStorage.set(CONFIG.STORAGE_KEYS.ENTRIES, this.data.entries);
    SafeStorage.set(CONFIG.STORAGE_KEYS.SHIFTS, this.data.shifts);
    SafeStorage.set(CONFIG.STORAGE_KEYS.SALARY, this.data.salary);
    SafeStorage.set(CONFIG.STORAGE_KEYS.LOG, this.data.log.slice(-CONFIG.MAX_LOG));
    SafeStorage.set(CONFIG.STORAGE_KEYS.PRESETS, this.data.presets);
    SafeStorage.setRaw(CONFIG.STORAGE_KEYS.THEME, this.data.theme||'classic');
    SafeStorage.set(CONFIG.STORAGE_KEYS.BACKUP, this.data.backup);
  }

  log(action, item, details) {
    this.data.log = this.data.log||[];
    this.data.log.push({ id: Date.now()+Math.floor(Math.random()*1000), timestamp:new Date().toISOString(), action, item, details });
  }

  actionName(a){ const m={add_record:'Добавление записи',delete_record:'Удаление записи',add_product:'Добавление продукта',edit_product:'Изменение продукта',delete_product:'Удаление продукта',settings:'Изменение настроек',add_shift:'Добавление смены',export:'Экспорт',import:'Импорт'}; return m[a]||a;}
  escape(s){ return (''+s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#x27;'); }
  alert(m){ alert(m); }
  showInfo(m){ alert(m); }
  download(content, filename, mime){ const blob=new Blob([content],{type:mime}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=filename; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); }
}

let app; document.addEventListener('DOMContentLoaded', ()=>{ app=new ProductionAccountingApp(); });
