const CONFIG = {
  VERSION: '3.2.5',
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
      this.data.products=[{id:1,name:'Изделие А',price:100,archived:false,created:new Date().toISOString(),favorite:false}];
    }
    this.data.products.forEach(p=>{ if(p.favorite===undefined) p.favorite=false; });

    this.q=(s)=>document.querySelector(s);
    this.qa=(s)=>document.querySelectorAll(s);

    this.cacheDOM();
    this.bindEvents();
    this.applyTheme(this.data.theme);

    const anyActive = Array.from(this.screens).some(s=>s.classList.contains('screen--active'));
    if(!anyActive){ this.switchScreen('records'); }

    this.renderPresets();
    this.applyManualDefaultHours();
    this.updateProductSuggestions();
    this.renderRecords();
    this.renderStatistics();
    this.renderHistory();
  }

  cacheDOM(){
    // ... остальные элементы DOM ...

    // Кнопки бэкапа
    this.emailBackupBtn = this.q('#emailBackupBtn');
    this.yandexBackupBtn = this.q('#yandexBackupBtn');
    this.googleBackupBtn = this.q('#googleBackupBtn');
  }

  bindEvents(){
    // ... другие обработчики ...

    // Бэкап
    this.emailBackupBtn?.addEventListener('click', ()=>this.shareBackup('email'));
    this.yandexBackupBtn?.addEventListener('click', ()=>this.shareBackup('yandex'));
    this.googleBackupBtn?.addEventListener('click', ()=>this.shareBackup('google'));
  }

  // Метод для шаринга/бэкапа
  shareBackup(type) {
    const data = {
      version: CONFIG.VERSION,
      timestamp: new Date().toISOString(),
      data: this.data
    };
    const content = JSON.stringify(data, null, 2);
    const filename = `backup-${new Date().toISOString().slice(0,10)}.json`;

    if (type === 'email') {
      const blob = new Blob([content], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const mailto = `mailto:?subject=Backup Production Tracker&body=Смотрите вложение.&attachment=${encodeURIComponent(url)}`;
      window.location.href = mailto;

    } else if (navigator.share && window.File) {
      // Используем Web Share API
      const file = new File([content], filename, { type: 'application/json' });
      navigator.share({
        title: 'Backup Production Tracker',
        text: 'Файл бэкапа',
        files: [file]
      }).catch(err => console.error('Share failed:', err));

    } else {
      // fallback: скачать файл
      this.download(content, filename, 'application/json');
    }
  }

  // ... остальные методы (download, save, log, действия по продуктам и т.д.) ...
}

let app;
document.addEventListener('DOMContentLoaded', ()=>{ app=new App(); });
