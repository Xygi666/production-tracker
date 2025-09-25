const CONFIG = {
  VERSION: '3.2.2',
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
      salary: Safe.g(CONFIG.STORAGE_KEYS.SALARY, { baseSalary:50000, taxRate:13, advanceAmount:0, workSchedule:'off', hoursPerShift:12, scheduleStartDate:'2025-09-01' }),
      log: Safe.g(CONFIG.STORAGE_KEYS.LOG, []),
      presets: Safe.g(CONFIG.STORAGE_KEYS.PRESETS, [1,5,10,25,50]),
      theme: Safe.gr(CONFIG.STORAGE_KEYS.THEME, 'classic'),
      backup: Safe.g(CONFIG.STORAGE_KEYS.BACKUP, {autoBackup:false,backupPeriod:'weekly',backupService:'email',lastBackup:null,backupHistory:[]})
    };
    if(!this.data.products?.length){
      this.data.products=[{id:1,name:'Изделие А',price:100,archived:false,created:new Date().toISOString()}];
    }

    this.q=(s)=>document.querySelector(s);
    this.qa=(s)=>document.querySelectorAll(s);

    this.cacheDOM();
    this.bindEvents();
    this.applyTheme(this.data.theme);

    // Инициализация первого экрана
    this.switchScreen('records');

    // Первичный рендер
    this.renderPresets();
    this.applyManualDefaultHours();
    this.updateProductSuggestions();
    this.renderRecords();
    this.renderStatistics();
    this.renderHistory();
  }

  cacheDOM(){
    this.monthSumHeader=this.q('#monthSumHeader');
    this.settingsBtn=this.q('#settingsBtn');
    this.exportJsonBtn=this.q('#exportJsonBtn');
    this.reloadBtn=this.q('#reloadBtn');

    this.navTabs=this.qa('.nav__tab');
    this.screens=this.qa('.screen');

    this.productSearch=this.q('#productSearch');
    this.productSuggestions=this.q('#productSuggestions');
    this.selectedProductId=null;

    this.quantityInput=this.q('#quantityInput');
    this.decreaseBtn=this.q('#decreaseBtn');
    this.increaseBtn=this.q('#increaseBtn');
    this.presetsContainer=this.q('#presetsContainer');
    this.sumAmount=this.q('#sumAmount');
    this.addRecordBtn=this.q('#addRecordBtn');
    this.recordsList=this.q('#recordsList');
    this.exportCsvBtn=this.q('#exportCsvBtn');

    this.manualShiftHours=this.q('#manualShiftHours');
    this.addManualShiftBtn=this.q('#addManualShiftBtn');

    this.statsGrid=this.q('#statsGrid');
    this.filterDate=this.q('#filterDate');
    this.filterAction=this.q('#filterAction');
    this.historyList=this.q('#historyList');
    this.exportHistoryBtn=this.q('#exportHistoryBtn');

    this.settingsModal=this.q('#settingsModal');
    this.closeSettingsBtn=this.q('#closeSettingsBtn');
    this.saveSettingsBtn=this.q('#saveSettingsBtn');
    this.cancelSettingsBtn=this.q('#cancelSettingsBtn');
    this.settingsTabs=this.qa('.settings-tab');
    this.settingsPanels=this.qa('.settings-panel');

    this.baseSalary=this.q('#baseSalary');
    this.taxRate=this.q('#taxRate');
    this.advanceAmount=this.q('#advanceAmount');
    this.workSchedule=this.q('#workSchedule');
    this.hoursPerShift=this.q('#hoursPerShift');
    this.scheduleStartDate=this.q('#scheduleStartDate');

    this.addProductBtn=this.q('#addProductBtn');
    this.importProductsBtn=this.q('#importProductsBtn');
    this.importProductsFile=this.q('#importProductsFile');
    this.productsList=this.q('#productsList');
    this.themeSelect=this.q('#themeSelect');
    this.presetsInput=this.q('#presetsInput');
  }

  bindEvents(){
    this.navTabs.forEach(t=>t.addEventListener('click',(e)=>this.switchScreen(e.currentTarget.dataset.tab)));

    this.settingsBtn?.addEventListener('click',()=>this.openSettings());
    this.exportJsonBtn?.addEventListener('click',()=>this.exportJson());
    this.reloadBtn?.addEventListener('click',()=>location.reload());

    this.productSearch?.addEventListener('input',()=>this.updateProductSuggestions());
    this.productSearch?.addEventListener('focus',()=>this.updateProductSuggestions());
    document.addEventListener('click',(e)=>{ if(!this.productSuggestions.contains(e.target)&&e.target!==this.productSearch){ this.hideSuggestions(); }});

    this.quantityInput?.setAttribute('step','1');
    this.quantityInput?.setAttribute('min','1');
    this.quantityInput?.addEventListener('input',()=>{const v=Math.max(1,Math.floor(parseFloat(this.quantityInput.value)||1)); this.quantityInput.value=v; this.calculateSum();});
    this.decreaseBtn?.addEventListener('click',()=>{const c=Math.max(1,Math.floor(parseFloat(this.quantityInput.value)||1)); this.quantityInput.value=Math.max(1,c-1); this.calculateSum();});
    this.increaseBtn?.addEventListener('click',()=>{const c=Math.max(1,Math.floor(parseFloat(this.quantityInput.value)||1)); this.quantityInput.value=c+1; this.calculateSum();});
    this.addRecordBtn?.addEventListener('click',()=>this.addRecord());
    this.exportCsvBtn?.addEventListener('click',()=>this.exportCsv());
    this.addManualShiftBtn?.addEventListener('click',()=>this.addManualShift());

    this.filterDate?.addEventListener('change',()=>this.renderHistory());
    this.filterAction?.addEventListener('change',()=>this.renderHistory());
    this.exportHistoryBtn?.addEventListener('click',()=>this.exportHistory());

    this.closeSettingsBtn?.addEventListener('click',()=>this.closeSettings());
    this.cancelSettingsBtn?.addEventListener('click',()=>this.closeSettings());
    this.saveSettingsBtn?.addEventListener('click',()=>this.saveSettings());
    this.settingsTabs?.forEach(t=>t.addEventListener('click',(e)=>this.switchSettingsPanel(e.currentTarget.dataset.tab)));
    this.settingsModal?.addEventListener('click',(e)=>{ if(e.target===this.settingsModal||e.target.classList.contains('modal__backdrop')) this.closeSettings(); });

    this.addProductBtn?.addEventListener('click',()=>this.addProductPrompt());
    this.importProductsBtn?.addEventListener('click',()=>this.importProductsFile.click());
    this.importProductsFile?.addEventListener('change',(e)=>this.importProducts(e.target.files[0]));
  }

  // ПЕРЕКЛЮЧЕНИЕ ЭКРАНОВ
  switchScreen(name){
    this.navTabs.forEach(t=>t.classList.toggle('nav__tab--active', t.dataset.tab===name));
    this.screens.forEach(s=>s.classList.toggle('screen--active', s.dataset.screen===name));
    if(name==='records'){ this.updateProductSuggestions(); this.applyManualDefaultHours(); this.renderRecords(); }
    if(name==='statistics'){ this.renderStatistics(); }
    if(name==='history'){ this.renderHistory(); }
  }

  switchSettingsPanel(name){
    this.settingsTabs.forEach(t=>t.classList.toggle('settings-tab--active', t.dataset.tab===name));
    this.settingsPanels.forEach(p=>p.classList.toggle('settings-panel--active', p.dataset.panel===name));
  }

  // Тема
