const CONFIG = {
  VERSION: '3.2.1',
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
        baseSalary: 50000, taxRate: 13, advanceAmount: 0,
        workSchedule: 'off', hoursPerShift: 12, scheduleStartDate: '2025-09-01'
      }),
      log: Safe.g(CONFIG.STORAGE_KEYS.LOG, []),
      presets: Safe.g(CONFIG.STORAGE_KEYS.PRESETS, [1,5,10,25,50]),
      theme: Safe.gr(CONFIG.STORAGE_KEYS.THEME, 'classic'),
      backup: Safe.g(CONFIG.STORAGE_KEYS.BACKUP, {autoBackup:false,backupPeriod:'weekly',backupService:'email',lastBackup:null,backupHistory:[]})
    };
    if(!this.data.products?.length){
      this.data.products = [{id:1,name:'Изделие А',price:100,archived:false,created:new Date().toISOString()}];
    }

    this.q = (sel)=>document.querySelector(sel);
    this.qa = (sel)=>document.querySelectorAll(sel);

    this.bindDOM();
    this.bindEvents();
    this.applyTheme(this.data.theme);
    this.renderPresets();
    this.applyManualDefaultHours();
    this.updateProductSuggestions();
    this.renderRecords();
    this.renderStatistics();
    this.renderHistory();
  }

  bindDOM(){
    // Шапка
    this.monthSumHeader = this.q('#monthSumHeader');
    this.settingsBtn = this.q('#settingsBtn');
    this.exportJsonBtn = this.q('#exportJsonBtn');
    this.reloadBtn = this.q('#reloadBtn');

    // Нав
    this.navTabs = this.qa('.nav__tab');
    this.screens = this.qa('.screen');

    // Поиск продукта
    this.productSearch = this.q('#productSearch');
    this.productSuggestions = this.q('#productSuggestions');
    this.selectedProductId = null;

    // Количество
    this.quantityInput = this.q('#quantityInput');
    this.decreaseBtn = this.q('#decreaseBtn');
    this.increaseBtn = this.q('#increaseBtn');
    this.presetsContainer = this.q('#presetsContainer');
    this.sumAmount = this.q('#sumAmount');
    this.addRecordBtn = this.q('#addRecordBtn');
    this.recordsList = this.q('#recordsList');
    this.exportCsvBtn = this.q('#exportCsvBtn');

    // Ручная смена
    this.manualShiftHours = this.q('#manualShiftHours');
    this.addManualShiftBtn = this.q('#addManualShiftBtn');

    // Статистика/история
    this.statsGrid = this.q('#statsGrid');
    this.filterDate = this.q('#filterDate');
    this.filterAction = this.q('#filterAction');
    this.historyList = this.q('#historyList');
    this.exportHistoryBtn = this.q('#exportHistoryBtn');

    // Настройки
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
  }

  bindEvents(){
    // Нав
    this.navTabs.forEach(t=>t.addEventListener('click',(e)=>this.switchScreen(e.currentTarget.dataset.tab)));

    // Шапка
    this.settingsBtn?.addEventListener('click',()=>this.openSettings());
    this.exportJsonBtn?.addEventListener('click',()=>this.exportJson());
    this.reloadBtn?.addEventListener('click',()=>location.reload());

    // Поиск продукта
    this.productSearch?.addEventListener('input',()=>this.updateProductSuggestions());
    this.productSearch?.addEventListener('focus',()=>this.updateProductSuggestions());
    document.addEventListener('click',(e)=>{
      if (!this.productSuggestions.contains(e.target) && e.target!==this.productSearch){
        this.hideSuggestions();
      }
    });

    // Количество шаг 1
    this.quantityInput?.setAttribute('step','1');
    this.quantityInput?.setAttribute('min','1');
    this.quantityInput?.addEventListener('input',()=>{
      const v = Math.max(1, Math.floor(parseFloat(this.quantityInput.value)||1));
      this.quantityInput.value = v;
      this.calculateSum();
    });
    this.decreaseBtn?.addEventListener('click',()=>{
      const cur = Math.max(1, Math.floor(parseFloat(this.quantityInput.value)||1));
      this.quantityInput.value = Math.max(1, cur-1);
      this.calculateSum();
    });
    this.increaseBtn?.addEventListener('click',()=>{
      const cur = Math.max(1, Math.floor(parseFloat(this.quantityInput.value)||1));
      this.quantityInput.value = cur+1;
      this.calculateSum();
    });

    // Действия
    this.addRecordBtn?.addEventListener('click',()=>this.addRecord());
    this.exportCsvBtn?.addEventListener('click',()=>this.exportCsv());
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
    this.addProductBtn?.addEventListener('click',()=>this.addProductPrompt());
    this.importProductsBtn?.addEventListener('click',()=>this.importProductsFile.click());
    this.importProductsFile?.addEventListener('change',(e)=>this.importProducts(e.target.files[0]));
  }

  switchScreen(name){
    this.navTabs.forEach(t=>t.classList.toggle('nav__tab--active',t.dataset.tab===name));
    this.screens.forEach(s=>s.classList.toggle('screen--active',s.dataset.screen===name));
    if(name==='records'){ this.updateProductSuggestions(); this.applyManualDefaultHours(); this.renderRecords(); }
    if(name==='statistics'){ this.renderStatistics(); }
    if(name==='history'){ this.renderHistory(); }
  }
  switchSettingsPanel(name){
    this.settingsTabs.forEach(t=>t.classList.toggle('settings-tab--active',t.dataset.tab===name));
    this.settingsPanels.forEach(p=>p.classList.toggle('settings-panel--active',p.dataset.panel===name));
  }

  // Тема
  applyTheme(theme){ document.body.dataset.theme = theme; Safe.sr(CONFIG.STORAGE_KEYS.THEME, theme); }

  // Продукты: поиск/подсказки
  updateProductSuggestions(){
    const q = (this.productSearch?.value||'').trim().toLowerCase();
    const all = (this.data.products||[]).filter(p=>!p.archived);
    const list = q ? all.filter(p=>p.name.toLowerCase().includes(q)) : all;
    const limited = list.slice(0, 30);
    this.renderSuggestions(limited);
  }
  renderSuggestions(items){
    if(!this.productSuggestions) return;
    if(!items.length){
      this.productSuggestions.innerHTML = '';
      this.productSuggestions.classList.add('hidden');
      this.selectedProductId = null;
      this.calculateSum();
      return;
    }
    this.productSuggestions.classList.remove('hidden');
    this.productSuggestions.innerHTML = '';
    items.forEach(p=>{
      const row = document.createElement('div');
      row.className = 'suggestion-item';
      row.textContent = `${p.name} — ${p.price}${CONFIG.DEFAULT_CURRENCY}`;
      row.addEventListener('click', ()=>{
        this.productSearch.value = p.name;
        this.selectedProductId = p.id;
        this.hideSuggestions();
        this.calculateSum();
      });
      this.productSuggestions.appendChild(row);
    });
    const exact = items.find(p=>p.name.toLowerCase()===this.productSearch.value.trim().toLowerCase());
    this.selectedProductId = exact ? exact.id : null;
  }
  hideSuggestions(){ this.productSuggestions?.classList.add('hidden'); }

  // Количество пресеты
  renderPresets(){
    if(!this.presetsContainer) return;
    this.presetsContainer.innerHTML='';
    (this.data.presets||[]).forEach(v=>{
      const b=document.createElement('button');
      b.className='preset-btn';
      b.textContent=v;
      b.addEventListener('click',()=>{
        const base = Math.max(1, Math.floor(parseFloat(this.quantityInput.value)||0));
        this.quantityInput.value = base + Number(v);
        this.calculateSum();
      });
      this.presetsContainer.appendChild(b);
    });
  }

  // Часы по умолчанию для ручной смены — из hoursPerShift
  applyManualDefaultHours(){
    if(!this.manualShiftHours) return;
    const h = this.data.salary?.hoursPerShift ?? 8;
    this.manualShiftHours.value = h;
  }

  // Текущий продукт
  currentProduct(){
    if(this.selectedProductId){
      return (this.data.products||[]).find(p=>p.id===this.selectedProductId) || null;
    }
    const q = (this.productSearch?.value||'').trim().toLowerCase();
    if(!q) return null;
    return (this.data.products||[]).find(p=>!p.archived && p.name.toLowerCase()===q) || null;
  }

  // Сумма
  calculateSum(){
    const p = this.currentProduct();
    const qty = Math.max(1, Math.floor(parseFloat(this.quantityInput?.value)||1));
    this.sumAmount.textContent = p ? `${(qty*p.price).toFixed(2)} ${CONFIG.DEFAULT_CURRENCY}` : `0 ${CONFIG.DEFAULT_CURRENCY}`;
  }

  // Записи
  addRecord(){
    const p = this.currentProduct();
    const qty = Math.max(1, Math.floor(parseFloat(this.quantityInput?.value)||1));
    if(!p) return alert('Выберите продукт (начните вводить и выберите из списка)');
    const rec = { id: Date.now(), productId: p.id, quantity: qty, price: p.price, sum: qty*p.price, date: new Date().toISOString() };
    (this.data.entries=this.data.entries||[]).push(rec);
    this.log('add_record', rec, 'Добавлена запись');
    this.save();
    this.quantityInput.value='1';
    this.calculateSum();
    this.renderRecords(); this.renderStatistics();
  }
  renderRecords(){
    if(!this.recordsList) return;
    const now=new Date(); const ym=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    const list=(this.data.entries||[]).filter(e=>{const d=new Date(e.date);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`===ym;}).sort((a,b)=>new Date(b.date)-new Date(a.date));
    const income=list.reduce((s,r)=>s+r.sum,0);
    if(this.monthSumHeader) this.monthSumHeader.textContent=`${income.toFixed(2)} ${CONFIG.DEFAULT_CURRENCY}`;
    this.recordsList.innerHTML = list.length? '' : `<div class="record-item"><div class="record-info"><div class="record-title">Записей за текущий месяц нет</div></div></div>`;
    list.forEach(r=>{
      const p=(this.data.products||[]).find(x=>x.id===r.productId);
      const name=p? p.name:'Неизвестный продукт';
      const d=new Date(r.date);
      const item=document.createElement('div');
      item.className='record-item';
      item.innerHTML=`
        <div class="record-info">
          <div class="record-title">${this.esc(name)}</div>
          <div class="record-details">${r.quantity} × ${r.price}${CONFIG.DEFAULT_CURRENCY} = ${r.sum.toFixed(2)}${CONFIG.DEFAULT_CURRENCY}</div>
          <div class="record-details">${d.toLocaleDateString(CONFIG.DATE_FORMAT)} ${d.toLocaleTimeString(CONFIG.DATE_FORMAT,{hour:'2-digit',minute:'2-digit'})}</div>
        </div>
        <div class="record-actions">
          <button class="btn btn--sm btn--danger">🗑️</button>
        </div>`;
      item.querySelector('button').addEventListener('click',()=>this.deleteRecord(r.id));
      this.recordsList.appendChild(item);
    });
  }
  deleteRecord(id){
    if(!confirm('Удалить запись?')) return;
    const i=(this.data.entries||[]).findIndex(r=>r.id===id);
    if(i>=0){
      const old=this.data.entries[i];
      this.data.entries.splice(i,1);
      this.log('delete_record', old, 'Удалена запись');
      this.save(); this.renderRecords(); this.renderStatistics();
    }
  }

  // Ручная смена
  addManualShift(){
    const h=parseFloat(this.manualShiftHours?.value);
    if(!h||h<=0) return alert('Введите часы (>0)');
    const sh={id:Date.now(),date:new Date().toISOString().slice(0,10),hours:h,type:'work',comment:'',auto:false};
    (this.data.shifts=this.data.shifts||[]).push(sh);
    this.log('add_shift', sh, `Добавлена смена: ${h} ч`);
    this.save(); this.applyManualDefaultHours(); this.renderStatistics();
  }

  // Статистика: ставка = (Оклад + Выручка)/Факт.часы
  renderStatistics(){
    if(!this.statsGrid) return;
    const now=new Date(); const y=now.getFullYear(); const m=now.getMonth()+1;
    const monthEntries=(this.data.entries||[]).filter(e=>{const d=new Date(e.date);return d.getFullYear()===y && (d.getMonth()+1)===m;});
    const income=monthEntries.reduce((s,r)=>s+r.sum,0);

    const manual=(this.data.shifts||[]).filter(s=>{const d=new Date(s.date);return d.getFullYear()===y&&(d.getMonth()+1)===m&&!s.auto;}).reduce((s,a)=>s+(parseFloat(a.hours)||0),0);
    let auto=0;
    if(this.data.salary.workSchedule!=='off' && typeof WorkScheduleManager==='function'){
      const ws=new WorkScheduleManager(); ws.updateSettings(this.data.salary); auto=ws.calculateAutoHours(y,m);
    }
    const hours = manual + auto;

    const base = parseFloat(this.data.salary.baseSalary)||0;
    const tax = (parseFloat(this.data.salary.taxRate)||0)/100;
    const adv = parseFloat(this.data.salary.advanceAmount)||0;

    const hourly = hours>0 ? (base+income)/hours : 0;
    const taxAmount = (base+income)*tax;
    const finalAmount = (base+income)-taxAmount-adv;

    const cards = [
      {label:'Доход (выручка)', value:`${income.toFixed(2)} ${CONFIG.DEFAULT_CURRENCY}`, type:'income'},
      {label:'Оклад', value:`${base.toFixed(2)} ${CONFIG.DEFAULT_CURRENCY}`, type:'neutral'},
      {label:'Часы отработано', value:`${hours.toFixed(1)} ч`, type:'neutral'},
      {label:'Почасовая ставка', value:`${hourly.toFixed(2)} ${CONFIG.DEFAULT_CURRENCY}/ч`, type:'neutral'},
      {label:'Налог', value:`${taxAmount.toFixed(2)} ${CONFIG.DEFAULT_CURRENCY}`, type:'expense'},
      {label:'На руки (итог)', value:`${finalAmount.toFixed(2)} ${CONFIG.DEFAULT_CURRENCY}`, type: finalAmount>=0?'income':'expense'}
    ];
    this.statsGrid.innerHTML='';
    cards.forEach(c=>{
      const el=document.createElement('div');
      el.className=`stat-card stat-card--${c.type}`;
      el.innerHTML=`<div class="stat-value">${c.value}</div><div class="stat-label">${c.label}</div>`;
      this.statsGrid.appendChild(el);
    });
    if(this.monthSumHeader) this.monthSumHeader.textContent = `${income.toFixed(2)} ${CONFIG.DEFAULT_CURRENCY}`;
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
    this.scheduleStartDate.value=s.scheduleStartDate??'';
    this.themeSelect.value=this.data.theme||'classic';
    this.presetsInput.value=(this.data.presets||[]).join(',');
    this.renderProductsList();
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
      scheduleStartDate: this.scheduleStartDate.value || new Date().toISOString().slice(0,10)
    };
    const theme=this.themeSelect.value;
    if(theme!==this.data.theme){ this.data.theme=theme; this.applyTheme(theme); }
    const presets=(this.presetsInput.value||'').split(',').map(x=>parseFloat(x.trim())).filter(x=>!isNaN(x)&&x>0);
    this.data.presets=presets.length?presets:[1,5,10,25,50];
    this.log('settings', this.data.salary, 'Изменены настройки');
    this.save(); this.closeSettings();
    this.renderPresets(); this.applyManualDefaultHours(); this.renderStatistics();
  }

  renderProductsList(){
    if(!this.productsList) return;
    this.productsList.innerHTML='';
    (this.data.products||[]).forEach(p=>{
      const row=document.createElement('div');
      row.className='record-item';
      row.innerHTML=`
        <div class="record-info">
          <div class="record-title">${this.esc(p.name)}</div>
          <div class="record-details">${p.price}${CONFIG.DEFAULT_CURRENCY}</div>
        </div>
        <div class="record-actions">
          <button class="btn btn--sm btn--outline" data-a="edit">Изменить</button>
          <button class="btn btn--sm btn--outline" data-a="toggle">${p.archived?'Восстановить':'Архив'}</button>
          <button class="btn btn--sm btn--danger" data-a="del">Удалить</button>
        </div>`;
      row.querySelector('[data-a="edit"]').addEventListener('click',()=>this.editProductPrompt(p.id));
      row.querySelector('[data-a="toggle"]').addEventListener('click',()=>this.toggleProduct(p.id));
      row.querySelector('[data-a="del"]').addEventListener('click',()=>this.deleteProduct(p.id));
      this.productsList.appendChild(row);
    });
  }

  addProductPrompt(){
    const name=prompt('Название продукта:'); if(!name) return;
    const price=parseFloat(prompt('Цена:')); if(isNaN(price)||price<=0) return alert('Некорректная цена');
    const p={id:Date.now(),name:name.trim(),price,archived:false,created:new Date().toISOString()};
    (this.data.products=this.data.products||[]).push(p);
    this.log('add_product', p, 'Добавлен продукт');
    this.save(); this.renderProductsList(); this.updateProductSuggestions();
  }
  editProductPrompt(id){
    const p=(this.data.products||[]).find(x=>x.id===id); if(!p) return;
    const name=prompt('Название:', p.name); if(!name) return;
    const price=parseFloat(prompt('Цена:', p.price)); if(isNaN(price)||price<=0) return alert('Некорректная цена');
    p.name=name.trim(); p.price=price;
    this.log('edit_product', p, 'Изменён продукт');
    this.save(); this.renderProductsList(); this.updateProductSuggestions();
  }
  toggleProduct(id){
    const p=(this.data.products||[]).find(x=>x.id===id); if(!p) return;
    p.archived=!p.archived;
    this.log('edit_product', p, p.archived?'Архивирован':'Восстановлен');
    this.save(); this.renderProductsList(); this.updateProductSuggestions();
  }
  deleteProduct(id){
    if((this.data.entries||[]).some(e=>e.productId===id)) return alert('Нельзя удалить продукт с записями. Переведите его в архив.');
    if(!confirm('Удалить продукт?')) return;
    const i=(this.data.products||[]).findIndex(p=>p.id===id);
    if(i>=0){
      const old=this.data.products[i];
      this.data.products.splice(i,1);
      this.log('delete_product', old, 'Удалён продукт');
      this.save(); this.renderProductsList(); this.updateProductSuggestions();
    }
  }

  // История/экспорт
  renderHistory(){
    if(!this.historyList) return;
    const df=this.filterDate?.value;
    const af=this.filterAction?.value;
    let list=[...(this.data.log||[])];
    if(df) list=list.filter(e=>new Date(e.timestamp).toISOString().slice(0,10)===df);
    if(af) list=list.filter(e=>e.action===af);
    list.sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp));
    this.historyList.innerHTML='';
    if(!list.length){
      this.historyList.innerHTML='<div class="record-item"><div class="record-info"><div class="record-title">История пуста</div></div></div>';
      return;
    }
    list.forEach(e=>{
      const d=new Date(e.timestamp);
      const row=document.createElement('div');
      row.className='record-item';
      row.innerHTML=`<div class="record-info"><div class="record-title">${this.esc(this.actionName(e.action))}</div><div class="record-details">${d.toLocaleDateString(CONFIG.DATE_FORMAT)} ${d.toLocaleTimeString(CONFIG.DATE_FORMAT,{hour:'2-digit',minute:'2-digit'})}</div><div class="record-details">${this.esc(e.details||'')}</div></div>`;
      this.historyList.appendChild(row);
    });
  }
  exportCsv(){
    const now=new Date(); const ym=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    const list=(this.data.entries||[]).filter(e=>{const d=new Date(e.date);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`===ym;});
    if(!list.length) return alert('Нет записей для экспорта');
    let csv='\ufeffДата,Продукт,Количество,Цена,Сумма\n';
    list.forEach(r=>{
      const p=(this.data.products||[]).find(x=>x.id===r.productId);
      const name=p?p.name:'Неизвестный продукт';
      const date=new Date(r.date).toLocaleDateString(CONFIG.DATE_FORMAT);
      csv+=`"${date}","${name}","${r.quantity}","${r.price}","${r.sum.toFixed(2)}"\n`;
    });
    this.download(csv, `export-${ym}.csv`, 'text/csv;charset=utf-8;');
  }
  exportJson(){
    const payload={version:CONFIG.VERSION,timestamp:new Date().toISOString(),data:this.data};
    this.download(JSON.stringify(payload,null,2),`backup-${new Date().toISOString().slice(0,10)}.json`,'application/json');
  }
  exportHistory(){
    const payload={version:CONFIG.VERSION,timestamp:new Date().toISOString(),history:this.data.log};
    this.download(JSON.stringify(payload,null,2),`history-${new Date().toISOString().slice(0,10)}.json`,'application/json');
  }
  download(content, name, type){
    const blob=new Blob([content],{type});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=url; a.download=name;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }

  // Служебные
  save(){
    Safe.s(CONFIG.STORAGE_KEYS.PRODUCTS, this.data.products);
    Safe.s(CONFIG.STORAGE_KEYS.ENTRIES, this.data.entries);
    Safe.s(CONFIG.STORAGE_KEYS.SHIFTS, this.data.shifts);
    Safe.s(CONFIG.STORAGE_KEYS.SALARY, this.data.salary);
    Safe.s(CONFIG.STORAGE_KEYS.LOG, (this.data.log||[]).slice(-CONFIG.MAX_LOG));
    Safe.s(CONFIG.STORAGE_KEYS.PRESETS, this.data.presets);
    Safe.sr(CONFIG.STORAGE_KEYS.THEME, this.data.theme||'classic');
    Safe.s(CONFIG.STORAGE_KEYS.BACKUP, this.data.backup);
  }
  log(action,item,details){ (this.data.log=this.data.log||[]).push({id:Date.now()+Math.random()*1000|0,timestamp:new Date().toISOString(),action,item,details}); }
  actionName(a){ const m={add_record:'Добавление записи',delete_record:'Удаление записи',add_product:'Добавление продукта',edit_product:'Изменение продукта',delete_product:'Удаление продукта',settings:'Изменение настроек',add_shift:'Добавление смены'}; return m[a]||a; }
  esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#x27;'); }
}

let app; document.addEventListener('DOMContentLoaded', ()=>{ app=new App(); });
