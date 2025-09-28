const CONFIG = {
  VERSION: '3.2.6',
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

const Safe = {
  g:(k,f=null)=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v):f}catch{return f}},
  s:(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true}catch{return false}},
  gr:(k,f='')=>{try{return localStorage.getItem(k)??f}catch{return f}},
  sr:(k,v)=>{try{localStorage.setItem(k,v);return true}catch{return false}}
};

class App {
  constructor(){
    this.data = {
      products: Safe.g(CONFIG.STORAGE_KEYS.PRODUCTS, []),
      entries: Safe.g(CONFIG.STORAGE_KEYS.ENTRIES, []),
      shifts: Safe.g(CONFIG.STORAGE_KEYS.SHIFTS, []),
      salary: Safe.g(CONFIG.STORAGE_KEYS.SALARY, {
        baseSalary:50000,
        taxRate:13,
        advanceAmount:0,
        workSchedule:'off',
        hoursPerShift:12,
        scheduleStartDate:'2025-09-01'
      }),
      log: Safe.g(CONFIG.STORAGE_KEYS.LOG, []),
      presets: Safe.g(CONFIG.STORAGE_KEYS.PRESETS, [1,5,10,25,50]),
      theme: Safe.gr(CONFIG.STORAGE_KEYS.THEME, 'classic'),
      backup: Safe.g(CONFIG.STORAGE_KEYS.BACKUP, {
        autoBackup:false,backupPeriod:'weekly',backupService:'email',lastBackup:null,backupHistory:[]
      })
    };

    if(!this.data.products.length){
      this.data.products = [{id:1,name:'Изделие А',price:100,archived:false,created:new Date().toISOString(),favorite:false}];
    }
    this.data.products.forEach(p=>{ if(p.favorite===undefined) p.favorite=false; });

    this.q = sel => document.querySelector(sel);
    this.qa = sel => document.querySelectorAll(sel);

    this.cacheDOM();
    this.bindEvents();
    this.applyTheme(this.data.theme);

    // Ensure initial screen
    if(!Array.from(this.screens).some(s=>s.classList.contains('screen--active'))){
      this.switchScreen('records');
    }

    // Initial render
    this.renderPresets();
    this.applyManualDefaultHours();
    this.updateProductSuggestions();
    this.renderRecords();
    this.renderStatistics();
    this.renderHistory();
  }

  cacheDOM(){
    // Header
    this.monthSumHeader = this.q('#monthSumHeader');
    this.finalAmountHeader = this.q('#finalAmountHeader');
    this.settingsBtn = this.q('#settingsBtn');
    this.exportJsonBtn = this.q('#exportJsonBtn');
    this.reloadBtn = this.q('#reloadBtn');

    // Navigation
    this.navTabs = this.qa('.nav__tab');
    this.screens = this.qa('.screen');

    // Records
    this.productSearch = this.q('#productSearch');
    this.clearSearchBtn = this.q('#clearSearchBtn');
    this.productSuggestions = this.q('#productSuggestions');
    this.quantityInput = this.q('#quantityInput');
    this.decreaseBtn = this.q('#decreaseBtn');
    this.increaseBtn = this.q('#increaseBtn');
    this.presetsContainer = this.q('#presetsContainer');
    this.sumAmount = this.q('#sumAmount');
    this.addRecordBtn = this.q('#addRecordBtn');
    this.recordsList = this.q('#recordsList');
    this.exportCsvBtn = this.q('#exportCsvBtn');
    this.manualShiftHours = this.q('#manualShiftHours');
    this.addManualShiftBtn = this.q('#addManualShiftBtn');

    // Stats & History
    this.statsGrid = this.q('#statsGrid');
    this.filterDate = this.q('#filterDate');
    this.filterAction = this.q('#filterAction');
    this.historyList = this.q('#historyList');
    this.exportHistoryBtn = this.q('#exportHistoryBtn');

    // Settings
    this.settingsModal = this.q('#settingsModal');
    this.closeSettingsBtn = this.q('#closeSettingsBtn');
    this.saveSettingsBtn = this.q('#saveSettingsBtn');
    this.cancelSettingsBtn = this.q('#cancelSettingsBtn');
    this.settingsTabs = this.qa('.settings-tab');
    this.settingsPanels = this.qa('.settings-panel');
    this.baseSalary = this.q('#baseSalary');
    this.taxRate = this.q('#taxRate');
    this.advanceAmount = this.q('#advanceAmount');
    this.workSchedule = this.q('#workSchedule');
    this.hoursPerShift = this.q('#hoursPerShift');
    this.scheduleStartDate = this.q('#scheduleStartDate');
    this.addProductBtn = this.q('#addProductBtn');
    this.importProductsBtn = this.q('#importProductsBtn');
    this.importProductsFile = this.q('#importProductsFile');
    this.productsList = this.q('#productsList');
    this.themeSelect = this.q('#themeSelect');
    this.presetsInput = this.q('#presetsInput');

    // Product modal
    this.productModal = this.q('#productModal');
    this.closeProductBtn = this.q('#closeProductBtn');
    this.cancelProductBtn = this.q('#cancelProductBtn');
    this.saveProductBtn = this.q('#saveProductBtn');
    this.productModalTitle = this.q('#productModalTitle');
    this.productNameInput = this.q('#productNameInput');
    this.productPriceInput = this.q('#productPriceInput');

    // Backup buttons
    this.emailBackupBtn = this.q('#emailBackupBtn');
    this.yandexBackupBtn = this.q('#yandexBackupBtn');
    this.googleBackupBtn = this.q('#googleBackupBtn');
  }

  bindEvents(){
    // Nav
    this.navTabs.forEach(tab=>
      tab.addEventListener('click', e=>this.switchScreen(e.currentTarget.dataset.tab))
    );

    // Header
    this.settingsBtn.addEventListener('click', ()=>this.openSettings());
    this.exportJsonBtn.addEventListener('click', ()=>this.exportJson());
    this.reloadBtn.addEventListener('click', ()=>location.reload());

    // Product search
    this.productSearch.addEventListener('input', ()=>this.updateProductSuggestions());
    this.productSearch.addEventListener('focus', ()=>this.updateProductSuggestions());
    this.clearSearchBtn.addEventListener('click', ()=>this.clearSearch());
    document.addEventListener('click', e=>{
      if(!this.productSuggestions.contains(e.target) 
         && e.target!==this.productSearch 
         && e.target!==this.clearSearchBtn){
        this.hideSuggestions();
      }
    });

    // Quantity
    this.quantityInput.setAttribute('step','1');
    this.quantityInput.setAttribute('min','1');
    this.quantityInput.addEventListener('input', ()=>{
      const v = Math.max(1, Math.floor(parseFloat(this.quantityInput.value)||1));
      this.quantityInput.value = v; this.calculateSum();
    });
    this.decreaseBtn.addEventListener('click', ()=>{
      const c= Math.max(1, Math.floor(parseFloat(this.quantityInput.value)||1));
      this.quantityInput.value = Math.max(1,c-1); this.calculateSum();
    });
    this.increaseBtn.addEventListener('click', ()=>{
      const c= Math.max(1, Math.floor(parseFloat(this.quantityInput.value)||1));
      this.quantityInput.value = c+1; this.calculateSum();
    });
    this.addRecordBtn.addEventListener('click', ()=>this.addRecord());
    this.exportCsvBtn.addEventListener('click', ()=>this.exportCsv());

    // Manual shift
    this.addManualShiftBtn.addEventListener('click', ()=>this.addManualShift());

    // History
    this.filterDate.addEventListener('change', ()=>this.renderHistory());
    this.filterAction.addEventListener('change', ()=>this.renderHistory());
    this.exportHistoryBtn.addEventListener('click', ()=>this.exportHistory());

    // Settings
    this.closeSettingsBtn.addEventListener('click', ()=>this.closeSettings());
    this.cancelSettingsBtn.addEventListener('click', ()=>this.closeSettings());
    this.saveSettingsBtn.addEventListener('click', ()=>this.saveSettings());
    this.settingsTabs.forEach(tab=>
      tab.addEventListener('click', e=>this.switchSettingsPanel(e.currentTarget.dataset.tab))
    );
    this.settingsModal.addEventListener('click', e=>{
      if(e.target===this.settingsModal || e.target.classList.contains('modal__backdrop')){
        this.closeSettings();
      }
    });

    // Products
    this.addProductBtn.addEventListener('click', ()=>this.openProductModal());
    this.importProductsBtn.addEventListener('click', ()=>this.importProductsFile.click());
    this.importProductsFile.addEventListener('change', e=>this.importProducts(e.target.files[0]));

    // Product modal
    this.closeProductBtn.addEventListener('click', ()=>this.closeProductModal());
    this.cancelProductBtn.addEventListener('click', ()=>this.closeProductModal());
    this.saveProductBtn.addEventListener('click', ()=>this.saveProduct());
    this.productModal.addEventListener('click', e=>{
      if(e.target===this.productModal || e.target.classList.contains('modal__backdrop')){
        this.closeProductModal();
      }
    });

    // Backup
    this.emailBackupBtn.addEventListener('click', ()=>this.shareBackup('email'));
    this.yandexBackupBtn.addEventListener('click', ()=>this.shareBackup('yandex'));
    this.googleBackupBtn.addEventListener('click', ()=>this.shareBackup('google'));
  }

  switchScreen(name){
    this.navTabs.forEach(tab=>
      tab.classList.toggle('nav__tab--active', tab.dataset.tab===name)
    );
    this.screens.forEach(screen=>{
      const active = screen.dataset.screen===name;
      screen.classList.toggle('screen--active', active);
      screen.style.display = active ? 'block' : 'none';
    });
    if(name==='records'){ this.updateProductSuggestions(); this.applyManualDefaultHours(); this.renderRecords(); }
    if(name==='statistics'){ this.renderStatistics(); }
    if(name==='history'){ this.renderHistory(); }
  }

  // ... все остальные методы ... shareBackup, openSettings, saveSettings, etc.
}

let app;
document.addEventListener('DOMContentLoaded', ()=>{ app=new App(); });
