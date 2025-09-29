const CONFIG = {
  VERSION: '3.2.8',
  STORAGE_KEYS: {
    THEME: 'pt_theme_v3',
    BACKUP: 'pt_backup_v3',
    // ... остальное без изменений ...
  },
  // ...
};

class App {
  constructor(){
    this.data = {
      theme: localStorage.getItem(CONFIG.STORAGE_KEYS.THEME) || 'classic',
      backup: Safe.g(CONFIG.STORAGE_KEYS.BACKUP, { autoBackup: false }),
      // ... остальное без изменений ...
    };
    this.q = s => document.querySelector(s);
    this.qa = s => document.querySelectorAll(s);
    this.cacheDOM();
    this.bindEvents();
    this.applyTheme(this.data.theme);
    // ... остальное без изменений ...
  }

  cacheDOM(){
    this.themeSelect = this.q('#themeSelect');
    this.emailBackupBtn = this.q('#emailBackupBtn');
    this.autoBackupEnabled = this.q('#autoBackupEnabled');
    // ... остальные элементы ...
  }

  bindEvents(){
    this.themeSelect.addEventListener('change', ()=>{
      this.data.theme = this.themeSelect.value;
      this.applyTheme(this.data.theme);
      localStorage.setItem(CONFIG.STORAGE_KEYS.THEME, this.data.theme);
    });

    this.emailBackupBtn.addEventListener('click', ()=>this.shareBackup('email'));
    this.autoBackupEnabled.addEventListener('change', ()=>{
      this.data.backup.autoBackup = this.autoBackupEnabled.checked;
      Safe.s(CONFIG.STORAGE_KEYS.BACKUP, this.data.backup);
    });

    // ... остальные обработчики без изменений ...
  }

  applyTheme(theme){
    document.body.setAttribute('data-theme', theme);
  }

  shareBackup(type){
    // Только Email
    const backup = { version: CONFIG.VERSION, timestamp: new Date().toISOString(), data: this.data };
    const content = JSON.stringify(backup, null, 2);
    const subject = encodeURIComponent('Backup Production Tracker');
    const body = encodeURIComponent('Бэкап данных:\n\n' + content);
    window.open(`mailto:?subject=${subject}&body=${body}`, '_self');
  }

  // ... остальной код приложения без изменений ...
}

document.addEventListener('DOMContentLoaded', ()=>new App());
