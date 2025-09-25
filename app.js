/**
 * Обновления:
 * - Поле manualDefaultHours в настройках зарплаты
 * - Автоподстановка дефолтных часов в форму ручной смены
 * - Ставка = (Оклад + Выручка) / Факт.часы
 * - Упрощённая форма смен, упрощённая статистика
 */

const CONFIG = {
  VERSION: '3.1.1',
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
  get(k,f=null){try{const r=localStorage.getItem(k);return r?JSON.parse(r):f;}catch{return f}},
  set(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true;}catch{return false}},
  getRaw(k,f=''){try{return localStorage.getItem(k)??f;}catch{return f}},
  setRaw(k,v){try{localStorage.setItem(k,v);return true;}catch{return false}}
};

class App {
  constructor() {
    this.data = {
      products: SafeStorage.get(CONFIG.STORAGE_KEYS.PRODUCTS, []),
      entries: SafeStorage.get(CONFIG.STORAGE_KEYS.ENTRIES, []),
      shifts: SafeStorage.get(CONFIG.STORAGE_KEYS.SHIFTS, []),
      salary: SafeStorage.get(CONFIG.STORAGE_KEYS.SALARY, {
        baseSalary: 50000, taxRate: 13, advanceAmount: 0,
        workSchedule: 'off', hoursPerShift: 12, manualDefaultHours: 12, scheduleStartDate: '2025-09-01'
      }),
      log: SafeStorage.get(CONFIG.STORAGE_KEYS.LOG, []),
      presets: SafeStorage.get(CONFIG.STORAGE_KEYS.PRESETS, [1,5,10,25,50]),
      theme: SafeStorage.getRaw(CONFIG.STORAGE_KEYS.THEME, 'classic'),
      backup: SafeStorage.get(CONFIG.STORAGE_KEYS.BACKUP, {autoBackup:false,backupPeriod:'weekly',backupService:'email',lastBackup:null,backupHistory:[]})
    };
    if (this.data.salary.manualDefaultHours == null) {
      this.data.salary.manualDefaultHours = this.data.salary.hoursPerShift || 8;
    }
    if (!this.data.products?.length) {
      this.data.products = [{id:1,name:'Изделие А',price:100,archived:false,created:new Date().toISOString()}];
    }

    this.initDOM();
    this.bindEvents();
    this.applyTheme(this.data.theme);
    this.renderProducts();
    this.renderPresets();
    this.renderRecords();
    this.renderStatistics();
    this.renderHistory();
    this.applyManualDefaultHours();
  }

  initDOM() {
    // Нав/экраны
    this.navTabs=document.querySelectorAll('.nav__tab');
    this.screens=document.querySelectorAll('.screen');

    // Шапка
    this.monthSumHeader=document.getElementById('monthSumHeader');
    this.settingsBtn=document.getElementById('settingsBtn');
    this.exportJsonBtn=document.getElementById('exportJsonBtn');
    this.reloadBtn=document.getElementById('reloadBtn');

    // Учёт
    this.productSelect=document.getElementById('productSelect');
    this.quantityInput=document.getElementById('quantityInput');
    this.decreaseBtn=document.getElementById('decreaseBtn');
    this.increaseBtn=document.getElementById('increaseBtn');
    this.presetsContainer=document.getElementById('presetsContainer');
    this.sumAmount=document.getElementById('sumAmount');
    this.addRecordBtn=document.getElementById('addRecordBtn');
    this.recordsList=document.getElementById('recordsList');
    this.exportCsvBtn=document.getElementById('exportCsvBtn');

    // Ручная смена
    this.manualShiftHours=document.getElementById('manualShiftHours');
    this.addManualShiftBtn=document.getElementById('addManualShiftBtn');

    // Статистика
    this.statsGrid=document.getElementById('statsGrid');

    // История
    this.filterDate=document.getElementById('filterDate');
    this.filterAction=document.getElementById('filterAction');
    this.historyList=document.getElementById('historyList');
    this.exportHistoryBtn=document.getElementById('exportHistoryBtn');

    // Настройки
    this.settingsModal=document.getElementById('settingsModal');
    this.closeSettingsBtn=document.getElementById('closeSettingsBtn');
    this.saveSettingsBtn=document.getElementById('saveSettingsBtn');
    this.cancelSettingsBtn=document.getElementById('cancelSettingsBtn');

    this.settingsTabs=document.querySelectorAll('.settings-tab');
    this.settingsPanels=document.querySelectorAll('.settings-panel');

    this.baseSalary=document.getElementById('baseSalary');
    this.taxRate=document.getElementById('taxRate');
    this.advanceAmount=document.getElementById('advanceAmount');
    this.workSchedule=document.getElementById('workSchedule');
    this.hoursPerShift=document.getElementById('hoursPerShift');
    this.manualDefaultHoursInput=document.getElementById('manualDefaultHours');
    this.scheduleStartDate=document.getElementById('scheduleStartDate');

    this.addProductBtn=document.getElementById('addProductBtn');
    this.importProductsBtn=document.getElementById('importProductsBtn');
    this.importProductsFile=document.getElementById('importProductsFile');
    this.productsList=document.getElementById('productsList');

    this.themeSelect=document.getElementById('themeSelect');
    this.presetsInput=document.getElementById('presetsInput');

    // Модал подтверждения (минимально)
    this.confirmModal=document.getElementById('confirmModal');
    this.confirmYesBtn=document.getElementById('confirmYesBtn');
    this.confirmNoBtn=document.getElementById('confirmNoBtn');
  }

  bindEvents() {
    this.navTabs.forEach(t=>t.addEventListener('click',(e)=>this.switchScreen(e.currentTarget.dataset.tab)));
    this.settingsBtn?.addEventListener('click',()=>this.openSettings());
    this.exportJsonBtn?.addEventListener('click',()=>this.exportJson());
    this.reloadBtn?.addEventListener('click',()=>location.reload());

    // Учёт
    this.productSelect?.addEventListener('change',()=>this.calculateSum());
    this.quantityInput?.addEventListener('input',()=>this.calculateSum());
    this.decreaseBtn?.addEventListener('click',()=>{const c=parseFloat(this.quantityInput.value)||0;const s=parseFloat(this.quantityInput.step)||1;const m=parseFloat(this.quantityInput.min)||0.01;this.quantityInput.value=Math.max(m,c-s);this.calculateSum();});
    this.increaseBtn?.addEventListener('click',()=>{const c=parseFloat(this.quantityInput.value)||0;const s=parseFloat(this.quantityInput.step)||1;this.quantityInput.value=c+s;this.calculateSum();});
    this.addRecordBtn?.addEventListener('click',()=>this.addRecord());
    this.exportCsvBtn?.addEventListener('click',()=>this.exportCsv());

    // Ручная смена
    this.addManualShiftBtn?.addEventListener('click',()=>this.addManualShift());

    // История
    this.filterDate?.addEventListener('change',()=>this.renderHistory());
    this.filterAction?.addEventListener('change',()=>this.renderHistory());
    this.exportHistoryBtn?.addEventListener('click',()=>this.exportHistory());

    // Настройки
    this.closeSettingsBtn?.addEventListener('click',()=>this.closeSettings());
    this.cancelSettingsBtn?.addEventListener('click',()=>this.closeSettings());
    this.saveSettingsBtn?.addEventListener('click',()=>this.saveSettings());
    this.settingsTabs?.forEach(t=>t.addEventListener('click',(e)=>this.switchSettingsPanel(e.currentTarget.dataset.tab)));
    this.settingsModal?.addEventListener('click',(e)=>{ if(e.target===this.settingsModal||e.target.classList.contains('modal__backdrop')) this.closeSettings(); });

    // Продукты
    this.addProductBtn?.addEventListener('click',()=>this.addProductViaPrompts());
    this.importProductsBtn?.addEventListener('click',()=>this.importProductsFile.click());
    this.importProductsFile?.addEventListener('change',(e)=>this.importProducts(e.target.files[0]));
  }

  // Нав/экраны
  switchScreen(name){
    this.navTabs.forEach(t=>t.classList.toggle('nav__tab--active',t.dataset.tab===name));
    this.screens.forEach(s=>s.classList.toggle('screen--active',s.dataset.screen===name));
    if(name==='records'){ this.renderRecords(); this.applyManualDefaultHours(); }
    if(name==='statistics'){ this.renderStatistics(); }
    if(name==='history'){ this.renderHistory(); }
  }
  switchSettingsPanel(name){
    this.settingsTabs.forEach(t=>t.classList.toggle('settings-tab--active',t.dataset.tab===name));
    this.settingsPanels.forEach(p=>p.classList.toggle('settings-panel--active',p.dataset.panel===name));
  }
  applyTheme(theme){ document.body.dataset.theme=theme; SafeStorage.setRaw(CONFIG.STORAGE_KEYS.THEME,theme); }

  // Учёт
  renderProducts(){
    if(this.productSelect){
      this.productSelect.innerHTML='<option value="">Выберите продукт</option>';
      (this.data.products||[]).filter(p=>!p.archived).forEach(p=>{
        const o=document.createElement('option'); o.value=p.id; o.textContent=`${p.name} - ${p.price}${CONFIG.DEFAULT_CURRENCY}`; this.productSelect.appendChild(o);
      });
    }
    if(this.productsList){
      this.productsList.innerHTML='';
      (this.data.products||[]).forEach(p=>{
        const row=document.createElement('div'); row.className='product-item';
        row.innerHTML=`<div class="product-info"><div class="product-name">${this.escape(p.name)}</div><div class="product-price">${p.price}${CONFIG.DEFAULT_CURRENCY}</div></div><div class="product-actions"><button class="btn btn--sm btn--outline" data-a="edit">Изменить</button><button class="btn btn--sm btn--outline" data-a="toggle">${p.archived?'Восстановить':'Архив'}</button><button class="btn btn--sm btn--danger" data-a="del">Удалить</button></div>`;
        row.querySelector('[data-a="edit"]').addEventListener('click',()=>this.editProductViaPrompts(p.id));
        row.querySelector('[data-a="toggle"]').addEventListener('click',()=>this.toggleArchiveProduct(p.id));
        row.querySelector('[data-a="del"]').addEventListener('click',()=>this.deleteProduct(p.id));
        this.productsList.appendChild(row);
      });
    }
  }
  renderPresets(){
    if(!this.presetsContainer) return;
    this.presetsContainer.innerHTML='';
    (this.data.presets||[]).forEach(v=>{
      const b=document.createElement('button'); b.className='preset-btn'; b.textContent=v;
      b.addEventListener('click',()=>{this.quantityInput.value=v; this.calculateSum();});
      this.presetsContainer.appendChild(b);
    });
  }
  calculateSum(){
    const pid=parseInt(this.productSelect?.value); const qty=parseFloat(this.quantityInput?.value)||0;
    if(pid&&qty>0){ const p=(this.data.products||[]).find(x=>x.id===pid); if(p){ this.sumAmount.textContent=`${(qty*p.price).toFixed(2)} ${CONFIG.DEFAULT_CURRENCY}`; return; } }
    this.sumAmount.textContent=`0 ${CONFIG.DEFAULT_CURRENCY}`;
  }
  addRecord(){
    const pid=parseInt(this.productSelect?.value); const qty=parseFloat(this.quantityInput?.value);
    if(!pid) return alert('Выберите продукт'); if(!qty||qty<=0) return alert('Введите корректное количество');
    const p=(this.data.products||[]).find(x=>x.id===pid); if(!p) return alert('Продукт не найден');
    const rec={id:Date.now(),productId:pid,quantity:qty,price:p.price,sum:qty*p.price,date:new Date().toISOString()};
    this.data.entries.push(rec); this.log('add_record',rec,'Добавлена запись'); this.saveAll();
    this.quantityInput.value=''; this.productSelect.value=''; this.calculateSum(); this.renderRecords(); this.renderStatistics();
  }
  renderRecords(){
    if(!this.recordsList) return;
    const now=new Date(); const ym=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    const list=(this.data.entries||[]).filter(e=>{const d=new Date(e.date);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`===ym;}).sort((a,b)=>new Date(b.date)-new Date(a.date));
    const income=list.reduce((s,r)=>s+r.sum,0); if(this.monthSumHeader) this.monthSumHeader.textContent=`${income.toFixed(2)} ${CONFIG.DEFAULT_CURRENCY}`;
    this.recordsList.innerHTML = list.length? '' : `<div class="text-center" style="padding:40px;color:var(--text-secondary);">Записей за текущий месяц нет</div>`;
    list.forEach(r=>{
      const p=(this.data.products||[]).find(x=>x.id===r.productId); const name=p? p.name:'Неизвестный продукт';
      const d=new Date(r.date); const ds=d.toLocaleDateString(CONFIG.DATE_FORMAT); const ts=d.toLocaleTimeString(CONFIG.DATE_FORMAT,{hour:'2-digit',minute:'2-digit'});
      const item=document.createElement('div'); item.className='record-item';
      item.innerHTML=`<div class="record-info"><div class="record-title">${this.escape(name)}</div><div class="record-details">${r.quantity} × ${r.price}${CONFIG.DEFAULT_CURRENCY} = ${r.sum.toFixed(2)}${CONFIG.DEFAULT_CURRENCY}</div><div class="record-details">${ds} ${ts}</div></div><div class="record-actions"><button class="btn btn--sm btn--danger">🗑️</button></div>`;
      item.querySelector('button').addEventListener('click',()=>this.deleteRecord(r.id));
      this.recordsList.appendChild(item);
    });
  }
  deleteRecord(id){
    if(!confirm('Удалить запись?')) return; const idx=(this.data.entries||[]).findIndex(r=>r.id===id); if(idx>=0){ const rec=this.data.entries[idx]; this.data.entries.splice(idx,1); this.log('delete_record',rec,'Удалена запись'); this.saveAll(); this.renderRecords(); this.renderStatistics(); }
  }

  // Ручная смена
  applyManualDefaultHours(){
    if(!this.manualShiftHours) return;
    const d = this.data.salary?.manualDefaultHours ?? this.data.salary?.hoursPerShift ?? 8;
    this.manualShiftHours.value = d;
  }
  addManualShift(){
    const h=parseFloat(this.manualShiftHours?.value); if(!h||h<=0) return alert('Введите часы (>0)');
    const shift={id:Date.now(),date:new Date().toISOString().slice(0,10),hours:h,type:'work',comment:'',auto:false};
    this.data.shifts.push(shift); this.log('add_shift',shift,`Добавлена смена: ${h} ч`); this.saveAll(); this.applyManualDefaultHours(); this.renderStatistics();
  }

  // Статистика
  renderStatistics(){
    if(!this.statsGrid) return;
    const now=new Date(); const y=now.getFullYear(); const m=now.getMonth()+1;
    const monthEntries=(this.data.entries||[]).filter(e=>{const d=new Date(e.date);return d.getFullYear()===y && (d.getMonth()+1)===m;});
    const income=monthEntries.reduce((s,r)=>s+r.sum,0);

    const manualHours=(this.data.shifts||[]).filter(s=>{const d=new Date(s.date);return d.getFullYear()===y && (d.getMonth()+1)===m && !s.auto;}).reduce((s,sh)=>s+(parseFloat(sh.hours)||0),0);

    let autoHours=0;
    if(this.data.salary.workSchedule!=='off' && typeof WorkScheduleManager==='function'){
      const ws=new WorkScheduleManager(); ws.updateSettings(this.data.salary); autoHours=ws.calculateAutoHours(y,m);
    }
    const workedHours=manualHours+autoHours;
    const base= parseFloat(this.data.salary.baseSalary)||0;
    const taxRate = (parseFloat(this.data.salary.taxRate)||0)/100;
    const advance = parseFloat(this.data.salary.advanceAmount)||0;

    const hourly = workedHours>0 ? (base+income)/workedHours : 0;
    const taxAmount = (base+income)*taxRate;
    const finalAmount = (base+income) - taxAmount - advance;

    const stats=[
      {label:'Доход (выручка)', value:`${income.toFixed(2)} ${CONFIG.DEFAULT_CURRENCY}`, type:'income'},
      {label:'Оклад', value:`${base.toFixed(2)} ${CONFIG.DEFAULT_CURRENCY}`, type:'neutral'},
      {label:'Часы отработано', value:`${workedHours.toFixed(1)} ч`, type:'neutral'},
      {label:'Почасовая ставка', value:`${hourly.toFixed(2)} ${CONFIG.DEFAULT_CURRENCY}/ч`, type:'neutral'},
      {label:'Налог', value:`${taxAmount.toFixed(2)} ${CONFIG.DEFAULT_CURRENCY}`, type:'expense'},
      {label:'На руки (итог)', value:`${finalAmount.toFixed(2)} ${CONFIG.DEFAULT_CURRENCY}`, type: finalAmount>=0?'income':'expense'}
    ];
    this.statsGrid.innerHTML=''; stats.forEach(s=>{ const c=document.createElement('div'); c.className=`stat-card stat-card--${s.type}`; c.innerHTML=`<div class="stat-value">${s.value}</div><div class="stat-label">${s.label}</div>`; this.statsGrid.appendChild(c); });
    if(this.monthSumHeader) this.monthSumHeader.textContent=`${income.toFixed(2)} ${CONFIG.DEFAULT_CURRENCY}`;
  }

  // Настройки
  openSettings(){
    if(!this.settingsModal) return;
    const s=this.data.salary||{};
    this.baseSalary.value=s.baseSalary??0;
    this.taxRate.value=s.taxRate??13;
    this.advanceAmount.value=s.advanceAmount??0;
    this.workSchedule.value=s.workSchedule??'off';
    this.hoursPerShift.value=s.hoursPerShift??12;
    this.manualDefaultHoursInput.value=s.manualDefaultHours ?? s.hoursPerShift ?? 8;
    this.scheduleStartDate.value=s.scheduleStartDate??'';
    this.themeSelect.value=this.data.theme||'classic';
    this.presetsInput.value=(this.data.presets||[]).join(',');
    this.renderProducts();
    this.settingsModal.classList.add('modal--active');
  }
  closeSettings(){ this.settingsModal?.classList.remove('modal--active'); }
  saveSettings(){
    this.data.salary = {
      baseSalary: parseFloat(this.baseSalary.value)||0,
      taxRate: parseFloat(this.taxRate.value)||0,
      advanceAmount: parseFloat(this.advanceAmount.value)||0,
      workSchedule: this.workSchedule.value,
      hoursPerShift: parseFloat(this.hoursPerShift.value)||12,
      manualDefaultHours: parseFloat(this.manualDefaultHoursInput.value)|| (parseFloat(this.hoursPerShift.value)||12),
      scheduleStartDate: this.scheduleStartDate.value || new Date().toISOString().slice(0,10)
    };
    const theme=this.themeSelect.value;
    if(theme!==this.data.theme){ this.data.theme=theme; this.applyTheme(theme); }
    const presets=(this.presetsInput.value||'').split(',').map(x=>parseFloat(x.trim())).filter(x=>!isNaN(x)&&x>0);
    this.data.presets=presets.length?presets:[1,5,10,25,50];
    this.log('settings',this.data.salary,'Изменены настройки'); this.saveAll(); this.closeSettings(); this.renderPresets(); this.renderStatistics(); this.applyManualDefaultHours();
  }

  // Продукты
  addProductViaPrompts(){ const n=prompt('Название продукта:'); if(!n) return; const pr=parseFloat(prompt('Цена:')); if(isNaN(pr)||pr<=0) return alert('Некорректная цена'); const p={id:Date.now(),name:n.trim(),price:pr,archived:false,created:new Date().toISOString()}; (this.data.products=this.data.products||[]).push(p); this.log('add_product',p,'Добавлен продукт'); this.saveAll(); this.renderProducts(); }
  editProductViaPrompts(id){ const p=(this.data.products||[]).find(x=>x.id===id); if(!p) return; const n=prompt('Название:',p.name); if(!n) return; const pr=parseFloat(prompt('Цена:',p.price)); if(isNaN(pr)||pr<=0) return alert('Некорректная цена'); p.name=n.trim(); p.price=pr; this.log('edit_product',p,'Изменён продукт'); this.saveAll(); this.renderProducts(); }
  toggleArchiveProduct(id){ const p=(this.data.products||[]).find(x=>x.id===id); if(!p) return; p.archived=!p.archived; this.log('edit_product',p, p.archived?'Архивирован продукт':'Восстановлен продукт'); this.saveAll(); this.renderProducts(); }
  deleteProduct(id){ if((this.data.entries||[]).some(e=>e.productId===id)) return alert('Нельзя удалить продукт с записями. Переведите в архив.'); if(!confirm('Удалить продукт?')) return; const i=(this.data.products||[]).findIndex(p=>p.id===id); if(i>=0){ const old=this.data.products[i]; this.data.products.splice(i,1); this.log('delete_product',old,'Удалён продукт'); this.saveAll(); this.renderProducts(); } }

  // История/Экспорт/Импорт/Утилиты
  renderHistory(){ if(!this.historyList) return; const df=this.filterDate?.value; const af=this.filterAction?.value; let list=[...(this.data.log||[])]; if(df) list=list.filter(e=>new Date(e.timestamp).toISOString().slice(0,10)===df); if(af) list=list.filter(e=>e.action===af); list.sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp)); this.historyList.innerHTML=list.length?'':`<div class="text-center" style="padding:40px;color:var(--text-secondary);">История действий пуста</div>`; list.forEach(e=>{ const d=new Date(e.timestamp); const item=document.createElement('div'); item.className='history-item'; item.innerHTML=`<div class="history-header-item"><div class="history-action">${this.actionName(e.action)}</div><div class="history-time">${d.toLocaleDateString(CONFIG.DATE_FORMAT)} ${d.toLocaleTimeString(CONFIG.DATE_FORMAT,{hour:'2-digit',minute:'2-digit'})}</div></div><div class="history-details">${this.escape(e.details||'')}</div>`; this.historyList.appendChild(item); }); }
  exportCsv(){ const now=new Date(); const ym=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`; const list=(this.data.entries||[]).filter(e=>{const d=new Date(e.date);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`===ym;}); if(!list.length) return alert('Нет записей для экспорта'); let csv='\ufeffДата,Продукт,Количество,Цена,Сумма\n'; list.forEach(r=>{ const p=(this.data.products||[]).find(x=>x.id===r.productId); const name=p?p.name:'Неизвестный продукт'; const date=new Date(r.date).toLocaleDateString(CONFIG.DATE_FORMAT); csv+=`"${date}","${name}","${r.quantity}","${r.price}","${r.sum.toFixed(2)}"\n`; }); this.download(JSON.stringify(csv), `export-${ym}.csv`, 'text/csv;charset=utf-8;'); }
  exportJson(){ const payload={version:CONFIG.VERSION,timestamp:new Date().toISOString(),data:this.data}; this.download(JSON.stringify(payload,null,2),`backup-${new Date().toISOString().slice(0,10)}.json`,'application/json'); }
  exportHistory(){ const payload={version:CONFIG.VERSION,timestamp:new Date().toISOString(),history:this.data.log}; this.download(JSON.stringify(payload,null,2),`history-${new Date().toISOString().slice(0,10)}.json`,'application/json'); }
  download(content,filename,mime){ const blob=new Blob([content],{type:mime}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=filename; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); }
  saveAll(){ SafeStorage.set(CONFIG.STORAGE_KEYS.PRODUCTS,this.data.products); SafeStorage.set(CONFIG.STORAGE_KEYS.ENTRIES,this.data.entries); SafeStorage.set(CONFIG.STORAGE_KEYS.SHIFTS,this.data.shifts); SafeStorage.set(CONFIG.STORAGE_KEYS.SALARY,this.data.salary); SafeStorage.set(CONFIG.STORAGE_KEYS.LOG,(this.data.log||[]).slice(-CONFIG.MAX_LOG)); SafeStorage.set(CONFIG.STORAGE_KEYS.PRESETS,this.data.presets); SafeStorage.setRaw(CONFIG.STORAGE_KEYS.THEME,this.data.theme||'classic'); SafeStorage.set(CONFIG.STORAGE_KEYS.BACKUP,this.data.backup); }
  log(a,item,details){ this.data.log=this.data.log||[]; this.data.log.push({id:Date.now()+Math.floor(Math.random()*1000),timestamp:new Date().toISOString(),action:a,item,details}); }
  actionName(a){const m={add_record:'Добавление записи',delete_record:'Удаление записи',add_product:'Добавление продукта',edit_product:'Изменение продукта',delete_product:'Удаление продукта',settings:'Изменение настроек',add_shift:'Добавление смены',export:'Экспорт',import:'Импорт'};return m[a]||a;}
  escape(s){return (''+s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#x27;');}
}

let app; document.addEventListener('DOMContentLoaded',()=>{app=new App();});
