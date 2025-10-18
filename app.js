const CONFIG={VERSION:'3.4.2',STORAGE_KEYS:{PRODUCTS:'pt_products_v3',ENTRIES:'pt_entries_v3',SALARY:'pt_salary_v3',THEME:'pt_theme_v3',LOG:'pt_log_v3',PRESETS:'pt_presets_v3'},DEFAULT_CURRENCY:'₽',DATE_FORMAT:'ru-RU',MAX_LOG:1000};

const Safe={
  g:(k,f=null)=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v):f}catch(e){console.warn('Safe.g',k,e);return f}},
  s:(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){console.warn('Safe.s',k,e);return false}},
  gr:(k,f='')=>{try{return localStorage.getItem(k)??f}catch(e){console.warn('Safe.gr',k,e);return f}},
  sr:(k,v)=>{try{localStorage.setItem(k,v);return true}catch(e){console.warn('Safe.sr',k,e);return false}}
};

class App{
  constructor(){
    this.data={
      products:Safe.g(CONFIG.STORAGE_KEYS.PRODUCTS,[]),
      entries:Safe.g(CONFIG.STORAGE_KEYS.ENTRIES,[]),
      salary:Safe.g(CONFIG.STORAGE_KEYS.SALARY,{baseSalary:50000,taxRate:13,advanceAmount:0}),
      log:Safe.g(CONFIG.STORAGE_KEYS.LOG,[]),
      presets:Safe.g(CONFIG.STORAGE_KEYS.PRESETS,[1,5,10,25,50]),
      theme:Safe.gr(CONFIG.STORAGE_KEYS.THEME,'classic')
    };
    
    if(!this.data.products?.length){
      this.data.products=[{id:1,name:'Изделие А',price:100,priceDefect:null,archived:false,created:new Date().toISOString(),favorite:false}];
    }else{
      this.data.products.forEach(p=>{
        if(p.priceDefect===undefined) p.priceDefect=null;
        if(p.favorite===undefined) p.favorite=false;
      });
    }

    this.q=s=>document.querySelector(s);
    this.qa=s=>document.querySelectorAll(s);
    
    this.cacheDOM();
    this.bindEvents();
    this.applyTheme(this.data.theme);
    
    if(!Array.from(this.screens).some(s=>s.classList.contains('screen--active'))){
      this.switchScreen('records');
    }
    
    this.renderPresets();
    this.updateProductSuggestions();
    this.renderRecords();
    this.renderStatistics();
    this.renderHistory();
    
    console.log('[App] v'+CONFIG.VERSION+' ready');
  }

  cacheDOM(){
    this.monthSumHeader=this.q('#monthSumHeader');
    this.finalAmountHeader=this.q('#finalAmountHeader');
    this.settingsBtn=this.q('#settingsBtn');
    this.exportJsonBtn=this.q('#exportJsonBtn');
    this.reloadBtn=this.q('#reloadBtn');
    this.navTabs=this.qa('.nav__tab');
    this.screens=this.qa('.screen');
    this.productSearch=this.q('#productSearch');
    this.clearSearchBtn=this.q('#clearSearchBtn');
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
    this.addProductBtn=this.q('#addProductBtn');
    this.importProductsBtn=this.q('#importProductsBtn');
    this.importProductsFile=this.q('#importProductsFile');
    this.productsList=this.q('#productsList');
    this.themeSelect=this.q('#themeSelect');
    this.presetsInput=this.q('#presetsInput');
    this.productModal=this.q('#productModal');
    this.productModalTitle=this.q('#productModalTitle');
    this.productNameInput=this.q('#productNameInput');
    this.productPriceInput=this.q('#productPriceInput');
    this.productDefectPriceInput=this.q('#productDefectPriceInput');
    this.closeProductBtn=this.q('#closeProductBtn');
    this.saveProductBtn=this.q('#saveProductBtn');
    this.cancelProductBtn=this.q('#cancelProductBtn');
    this.emailBackupBtn=this.q('#emailBackupBtn');
  }

  bindEvents(){
    this.navTabs.forEach(t=>t.addEventListener('click',e=>this.switchScreen(e.currentTarget.dataset.tab)));
    this.settingsBtn?.addEventListener('click',()=>this.openSettings());
    this.exportJsonBtn?.addEventListener('click',()=>this.exportJson());
    this.reloadBtn?.addEventListener('click',()=>location.reload());
    this.productSearch?.addEventListener('input',()=>this.updateProductSuggestions());
    this.productSearch?.addEventListener('focus',()=>this.updateProductSuggestions());
    this.clearSearchBtn?.addEventListener('click',()=>this.clearSearch());
    document.addEventListener('click',e=>{
      if(!this.productSuggestions) return;
      if(!this.productSuggestions.contains(e.target) && e.target!==this.productSearch && e.target!==this.clearSearchBtn){
        this.hideSuggestions();
      }
    });
    if(this.quantityInput){
      this.quantityInput.addEventListener('input',()=>this.calculateSum());
    }
    this.decreaseBtn?.addEventListener('click',()=>{
      let v=parseFloat(this.quantityInput?.value||0);
      if(isNaN(v)) v=0;
      v-=1;
      this.quantityInput.value=v;
      this.calculateSum();
    });
    this.increaseBtn?.addEventListener('click',()=>{
      let v=parseFloat(this.quantityInput?.value||0);
      if(isNaN(v)) v=0;
      v+=1;
      this.quantityInput.value=v;
      this.calculateSum();
    });
    this.addRecordBtn?.addEventListener('click',()=>this.addRecord());
    this.exportCsvBtn?.addEventListener('click',()=>this.exportCsv());
    this.filterDate?.addEventListener('change',()=>this.renderHistory());
    this.filterAction?.addEventListener('change',()=>this.renderHistory());
    this.exportHistoryBtn?.addEventListener('click',()=>this.exportHistory());
    this.closeSettingsBtn?.addEventListener('click',()=>this.closeSettings());
    this.cancelSettingsBtn?.addEventListener('click',()=>this.closeSettings());
    this.saveSettingsBtn?.addEventListener('click',()=>this.saveSettings());
    this.settingsModal?.addEventListener('click',e=>{
      if(e.target===this.settingsModal || e.target.classList.contains('modal__backdrop')){
        this.closeSettings();
      }
    });
    this.settingsTabs.forEach(tab=>{
      tab.addEventListener('click',()=>{
        const name=tab.dataset.tab;
        this.settingsTabs.forEach(t=>t.classList.toggle('settings-tab--active',t===tab));
        this.settingsPanels.forEach(p=>p.classList.toggle('settings-panel--active',p.dataset.panel===name));
        if(name==='products') this.renderProductsList();
      });
    });
    this.themeSelect?.addEventListener('change',()=>{
      this.data.theme=this.themeSelect.value;
      this.applyTheme(this.data.theme);
      Safe.sr(CONFIG.STORAGE_KEYS.THEME,this.data.theme);
    });
    this.addProductBtn?.addEventListener('click',()=>this.openProductModal());
    this.importProductsBtn?.addEventListener('click',()=>this.importProductsFile?.click());
    this.importProductsFile?.addEventListener('change',e=>this.importProducts(e.target.files[0]));
    this.closeProductBtn?.addEventListener('click',()=>this.closeProductModal());
    this.cancelProductBtn?.addEventListener('click',()=>this.closeProductModal());
    this.saveProductBtn?.addEventListener('click',()=>this.saveProduct());
    this.productModal?.addEventListener('click',e=>{
      if(e.target===this.productModal || e.target.classList.contains('modal__backdrop')){
        this.closeProductModal();
      }
    });
    this.emailBackupBtn?.addEventListener('click',()=>this.shareBackup());
  }

  switchScreen(name){
    this.navTabs.forEach(t=>t.classList.toggle('nav__tab--active',t.dataset.tab===name));
    this.screens.forEach(s=>{
      const active=s.dataset.screen===name;
      s.classList.toggle('screen--active',active);
    });
    if(name==='records'){
      this.updateProductSuggestions();
      this.renderRecords();
    }
    if(name==='statistics') this.renderStatistics();
    if(name==='history') this.renderHistory();
  }

  applyTheme(theme){document.body.setAttribute('data-theme',theme)}
  
  clearSearch(){
    if(!this.productSearch) return;
    this.productSearch.value='';
    this.selectedProductId=null;
    this.updateProductSuggestions();
    this.calculateSum();
    this.updateClearButton();
  }

  updateClearButton(){
    if(!this.clearSearchBtn || !this.productSearch) return;
    this.productSearch.value.trim() ? this.clearSearchBtn.classList.remove('hidden') : this.clearSearchBtn.classList.add('hidden');
  }

  updateProductSuggestions(){
    if(!this.productSuggestions) return;
    this.updateClearButton();
    const q=(this.productSearch?.value||'').trim().toLowerCase();
    const all=(this.data.products||[]).filter(p=>!p.archived);
    all.sort((a,b)=>(a.favorite===b.favorite)?0:(a.favorite?-1:1));
    const list=q?all.filter(p=>p.name.toLowerCase().includes(q)):all;
    this.renderSuggestions(list.slice(0,30));
  }

  renderSuggestions(items){
    if(!this.productSuggestions) return;
    if(!items.length){
      this.productSuggestions.innerHTML='';
      this.productSuggestions.classList.add('hidden');
      this.selectedProductId=null;
      this.calculateSum();
      return;
    }
    this.productSuggestions.classList.remove('hidden');
    this.productSuggestions.innerHTML='';
    items.forEach(p=>{
      const row=document.createElement('div');
      row.className='suggestion-item';
      row.innerHTML=`<span class="suggestion-star ${p.favorite?'suggestion-star--favorite':''}" data-id="${p.id}">★</span><span class="suggestion-text">${this.esc(p.name)} — ${p.price}${CONFIG.DEFAULT_CURRENCY}</span>`;
      row.querySelector('.suggestion-text').addEventListener('click',()=>{
        if(this.productSearch) this.productSearch.value=p.name;
        this.selectedProductId=p.id;
        this.hideSuggestions();
        this.calculateSum();
        this.updateClearButton();
      });
      row.querySelector('.suggestion-star').addEventListener('click',e=>{
        e.stopPropagation();
        this.toggleFavorite(p.id);
      });
      this.productSuggestions.appendChild(row);
    });
    const exact=items.find(p=>p.name.toLowerCase()===(this.productSearch?.value||'').trim().toLowerCase());
    this.selectedProductId=exact?exact.id:null;
  }

  hideSuggestions(){this.productSuggestions?.classList.add('hidden')}

  toggleFavorite(productId){
    const p=(this.data.products||[]).find(x=>x.id===productId);
    if(!p) return;
    p.favorite=!p.favorite;
    this.save();
    this.updateProductSuggestions();
    this.renderProductsList();
    this.log('edit_product',p,p.favorite?'Добавлен в избранное':'Убран из избранного');
  }

  renderPresets(){
    if(!this.presetsContainer) return;
    this.presetsContainer.innerHTML='';
    (this.data.presets||[]).forEach(v=>{
      const b=document.createElement('button');
      b.className='preset-btn';
      b.textContent=v;
      b.addEventListener('click',()=>{
        const base=parseFloat(this.quantityInput?.value)||0;
        this.quantityInput.value=base===0?v:base+v;
        this.calculateSum();
      });
      this.presetsContainer.appendChild(b);
    });
  }

  currentProduct(){
    if(this.selectedProductId){
      return (this.data.products||[]).find(p=>p.id===this.selectedProductId)||null;
    }
    const q=(this.productSearch?.value||'').trim().toLowerCase();
    if(!q) return null;
    return (this.data.products||[]).find(p=>!p.archived && p.name.toLowerCase()===q)||null;
  }

  calculateSum(){
    const p=this.currentProduct();
    let qty=parseFloat(this.quantityInput?.value||1);
    if(isNaN(qty)) qty=1;
    let sum=0;
    if(qty<0 && typeof p?.priceDefect==='number' && !isNaN(p.priceDefect)){
      sum=Math.abs(qty)*p.priceDefect;
    }else if(p){
      sum=qty*p.price;
    }
    if(this.sumAmount){
      this.sumAmount.textContent=p?`${sum.toFixed(2)} ${CONFIG.DEFAULT_CURRENCY}`:`0 ${CONFIG.DEFAULT_CURRENCY}`;
    }
  }

  addRecord(){
    const p=this.currentProduct();
    let qty=parseFloat(this.quantityInput?.value||1);
    if(isNaN(qty)) qty=1;
    if(!p) return alert('Выберите продукт (начните ввод и выберите из списка)');
    let price=p.price;
    let sum=0;
    if(qty<0 && typeof p.priceDefect==='number' && !isNaN(p.priceDefect)){
      price=p.priceDefect;
      sum=Math.abs(qty)*p.priceDefect;
    }else{
      sum=qty*p.price;
    }
    const rec={id:Date.now(),productId:p.id,quantity:qty,price,sum,date:new Date().toISOString()};
    (this.data.entries=this.data.entries||[]).push(rec);
    this.log('add_record',rec,'Добавлена запись');
    this.save();
    if(this.quantityInput) this.quantityInput.value='';
    this.calculateSum();
    this.renderRecords();
    this.renderStatistics();
  }

  renderRecords(){
    if(!this.recordsList) return;
    const now=new Date();
    const ym=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    const list=(this.data.entries||[]).filter(e=>{
      const d=new Date(e.date);
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`===ym;
    }).sort((a,b)=>new Date(b.date)-new Date(a.date));
    const income=list.reduce((s,r)=>s+r.sum,0);
    if(this.monthSumHeader) this.monthSumHeader.textContent=`${income.toFixed(2)} ${CONFIG.DEFAULT_CURRENCY}`;
    this.recordsList.innerHTML=list.length?'':'<div class="record-item"><div class="record-info"><div class="record-title">Записей за текущий месяц нет</div></div></div>';
    list.forEach(r=>{
      const p=(this.data.products||[]).find(x=>x.id===r.productId);
      const name=p?p.name:'Неизвестный продукт';
      const d=new Date(r.date);
      const amountClass=r.sum>=0?'plus':'minus';
      const row=document.createElement('div');
      row.className='record-item';
      row.innerHTML=`<div class="record-info"><div class="record-title">${this.esc(name)}</div><div class="record-details">${r.quantity} × ${r.price}${CONFIG.DEFAULT_CURRENCY} = <span class="record-amount ${amountClass}">${r.sum.toFixed(2)}${CONFIG.DEFAULT_CURRENCY}</span></div><div class="record-details">${d.toLocaleDateString(CONFIG.DATE_FORMAT)} ${d.toLocaleTimeString(CONFIG.DATE_FORMAT,{hour:'2-digit',minute:'2-digit'})}</div></div><div class="record-actions"><button class="btn btn--sm btn--danger">🗑️</button></div>`;
      row.querySelector('button').addEventListener('click',()=>this.deleteRecord(r.id));
      this.recordsList.appendChild(row);
    });
  }

  deleteRecord(id){
    if(!confirm('Удалить запись?')) return;
    const i=(this.data.entries||[]).findIndex(r=>r.id===id);
    if(i>=0){
      const old=this.data.entries[i];
      this.data.entries.splice(i,1);
      this.log('delete_record',old,'Удалена запись');
      this.save();
      this.renderRecords();
      this.renderStatistics();
    }
  }

  renderStatistics(){
    if(!this.statsGrid) return;
    const now=new Date();
    const y=now.getFullYear();
    const m=now.getMonth()+1;
    const month=(this.data.entries||[]).filter(e=>{
      const d=new Date(e.date);
      return d.getFullYear()===y && (d.getMonth()+1)===m;
    });
    const income=month.reduce((s,r)=>s+r.sum,0);
    const base=+this.data.salary.baseSalary||0;
    const tax=(+this.data.salary.taxRate||0)/100;
    const adv=+this.data.salary.advanceAmount||0;
    const taxAmount=(base+income)*tax;
    const finalAmount=(base+income)-taxAmount-adv;
    const cards=[
      {label:'Доход (выручка)',value:`${income.toFixed(2)} ${CONFIG.DEFAULT_CURRENCY}`,type:'income'},
      {label:'Оклад',value:`${base.toFixed(2)} ${CONFIG.DEFAULT_CURRENCY}`,type:'neutral'},
      {label:'Налог',value:`${taxAmount.toFixed(2)} ${CONFIG.DEFAULT_CURRENCY}`,type:'expense'},
      {label:'Аванс',value:`${adv.toFixed(2)} ${CONFIG.DEFAULT_CURRENCY}`,type:'expense'},
      {label:'На руки (итог)',value:`${finalAmount.toFixed(2)} ${CONFIG.DEFAULT_CURRENCY}`,type:finalAmount>=0?'income':'expense'}
    ];
    this.statsGrid.innerHTML='';
    cards.forEach(c=>{
      const el=document.createElement('div');
      el.className=`stat-card stat-card--${c.type}`;
      el.innerHTML=`<div class="stat-value">${c.value}</div><div class="stat-label">${c.label}</div>`;
      this.statsGrid.appendChild(el);
    });
    if(this.monthSumHeader) this.monthSumHeader.textContent=`${income.toFixed(2)} ${CONFIG.DEFAULT_CURRENCY}`;
    if(this.finalAmountHeader) this.finalAmountHeader.textContent=`${finalAmount.toFixed(2)} ${CONFIG.DEFAULT_CURRENCY}`;
  }

  openSettings(){
    if(!this.settingsModal) return;
    const s=this.data.salary||{};
    if(this.baseSalary) this.baseSalary.value=s.baseSalary??0;
    if(this.taxRate) this.taxRate.value=s.taxRate??13;
    if(this.advanceAmount) this.advanceAmount.value=s.advanceAmount??0;
    if(this.themeSelect) this.themeSelect.value=this.data.theme||'classic';
    if(this.presetsInput) this.presetsInput.value=(this.data.presets||[1,5,10,25,50]).join(',');
    this.renderProductsList();
    this.settingsModal.classList.add('modal--active');
  }

  closeSettings(){this.settingsModal?.classList.remove('modal--active')}

  saveSettings(){
    this.data.salary={
      baseSalary:parseFloat(this.baseSalary?.value)||0,
      taxRate:parseFloat(this.taxRate?.value)||0,
      advanceAmount:parseFloat(this.advanceAmount?.value)||0
    };
    const theme=this.themeSelect?.value||this.data.theme;
    if(theme!==this.data.theme){
      this.data.theme=theme;
      this.applyTheme(theme);
      Safe.sr(CONFIG.STORAGE_KEYS.THEME,theme);
    }
    const presets=(this.presetsInput?.value||'').split(',').map(x=>parseFloat(x.trim())).filter(x=>!isNaN(x)&&x>0);
    this.data.presets=presets.length?presets:[1,5,10,25,50];
    this.log('settings',this.data.salary,'Изменены настройки');
    this.save();
    this.closeSettings();
    this.renderPresets();
    this.renderStatistics();
  }

  openProductModal(productId=null){
    this.editingProductId=productId;
    if(productId){
      const p=(this.data.products||[]).find(x=>x.id===productId);
      if(p){
        this.productModalTitle.textContent='Изменить продукт';
        this.productNameInput.value=p.name;
        this.productPriceInput.value=p.price;
        this.productDefectPriceInput.value=(typeof p.priceDefect==='number'?p.priceDefect:'');
      }
    }else{
      this.productModalTitle.textContent='Добавить продукт';
      this.productNameInput.value='';
      this.productPriceInput.value='';
      this.productDefectPriceInput.value='';
    }
    this.productModal.classList.add('modal--active');
    setTimeout(()=>this.productNameInput?.focus(),100);
  }

  closeProductModal(){
    this.productModal?.classList.remove('modal--active');
    this.editingProductId=null;
  }

  saveProduct(){
    const name=this.productNameInput?.value?.trim();
    const price=parseFloat(this.productPriceInput?.value);
    const defectPrice=parseFloat(this.productDefectPriceInput?.value);
    if(!name) return alert('Введите название продукта');
    if(isNaN(price)||price<=0) return alert('Введите корректную цену');
    const priceDefect=isNaN(defectPrice)?null:defectPrice;
    if(this.editingProductId){
      const p=(this.data.products||[]).find(x=>x.id===this.editingProductId);
      if(p){
        p.name=name;
        p.price=price;
        p.priceDefect=priceDefect;
        this.log('edit_product',p,'Изменён продукт');
      }
    }else{
      const p={id:Date.now(),name,price,priceDefect,archived:false,created:new Date().toISOString(),favorite:false};
      (this.data.products=this.data.products||[]).push(p);
      this.log('add_product',p,'Добавлен продукт');
    }
    this.save();
    this.closeProductModal();
    this.renderProductsList();
    this.updateProductSuggestions();
  }

  renderProductsList(){
    if(!this.productsList) return;
    this.productsList.innerHTML='';
    (this.data.products||[]).forEach(p=>{
      const row=document.createElement('div');
      row.className='record-item';
      const star=p.favorite?'⭐':'☆';
      row.innerHTML=`<div class="record-info"><div class="record-title">${star} ${this.esc(p.name)}</div><div class="record-details">Цена: ${p.price}${CONFIG.DEFAULT_CURRENCY}${typeof p.priceDefect==='number'?' | Брак: '+p.priceDefect+CONFIG.DEFAULT_CURRENCY:''}</div></div><div class="record-actions"><button class="btn btn--sm btn--outline" data-a="fav">${p.favorite?'Убрать':'Избранное'}</button><button class="btn btn--sm btn--outline" data-a="edit">Изменить</button><button class="btn btn--sm btn--outline" data-a="toggle">${p.archived?'Восстановить':'Архив'}</button><button class="btn btn--sm btn--danger" data-a="del">Удалить</button></div>`;
      row.querySelector('[data-a="fav"]').addEventListener('click',()=>this.toggleFavorite(p.id));
      row.querySelector('[data-a="edit"]').addEventListener('click',()=>this.openProductModal(p.id));
      row.querySelector('[data-a="toggle"]').addEventListener('click',()=>this.toggleProduct(p.id));
      row.querySelector('[data-a="del"]').addEventListener('click',()=>this.deleteProduct(p.id));
      this.productsList.appendChild(row);
    });
  }

  toggleProduct(id){
    const p=(this.data.products||[]).find(x=>x.id===id);
    if(!p) return;
    p.archived=!p.archived;
    this.log('edit_product',p,p.archived?'Архивирован':'Восстановлен');
    this.save();
    this.renderProductsList();
    this.updateProductSuggestions();
  }

  deleteProduct(id){
    if((this.data.entries||[]).some(e=>e.productId===id)){
      return alert('Нельзя удалить продукт с записями. Переведите его в архив.');
    }
    if(!confirm('Удалить продукт?')) return;
    const i=(this.data.products||[]).findIndex(p=>p.id===id);
    if(i>=0){
      const old=this.data.products[i];
      this.data.products.splice(i,1);
      this.log('delete_product',old,'Удалён продукт');
      this.save();
      this.renderProductsList();
      this.updateProductSuggestions();
    }
  }

  shareBackup(){
    const data={version:CONFIG.VERSION,timestamp:new Date().toISOString(),data:this.data};
    const content=JSON.stringify(data,null,2);
    const subject=encodeURIComponent('Backup Production Tracker');
    const body=encodeURIComponent('Бэкап данных от '+new Date().toLocaleDateString()+':\n\n'+content.substring(0,1000)+'...');
    window.open(`mailto:?subject=${subject}&body=${body}`,'_self');
  }

  renderHistory(){
    if(!this.historyList) return;
    const df=this.filterDate?.value;
    const af=this.filterAction?.value;
    let list=[...(this.data.log||[])];
    if(df) list=list.filter(e=>new Date(e.timestamp).toISOString().slice(0,10)===df);
    if(af) list=list.filter(e=>e.action===af);
    list.sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp));
    this.historyList.innerHTML=list.length?'':'<div class="record-item"><div class="record-info"><div class="record-title">История пуста</div></div></div>';
    list.forEach(e=>{
      const d=new Date(e.timestamp);
      const row=document.createElement('div');
      row.className='record-item';
      row.innerHTML=`<div class="record-info"><div class="record-title">${this.esc(this.actionName(e.action))}</div><div class="record-details">${d.toLocaleDateString(CONFIG.DATE_FORMAT)} ${d.toLocaleTimeString(CONFIG.DATE_FORMAT,{hour:'2-digit',minute:'2-digit'})}</div><div class="record-details">${this.esc(e.details||'')}</div></div>`;
      this.historyList.appendChild(row);
    });
  }

  exportCsv(){
    const now=new Date();
    const ym=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    const list=(this.data.entries||[]).filter(e=>{
      const d=new Date(e.date);
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`===ym;
    });
    if(!list.length) return alert('Нет записей для экспорта');
    let csv='\ufeffДата,Продукт,Количество,Цена,Сумма\n';
    list.forEach(r=>{
      const p=(this.data.products||[]).find(x=>x.id===r.productId);
      const name=p?p.name:'Неизвестный продукт';
      const date=new Date(r.date).toLocaleDateString(CONFIG.DATE_FORMAT);
      csv+=`"${date}","${name}","${r.quantity}","${r.price}","${r.sum.toFixed(2)}"\n`;
    });
    this.download(csv,`export-${ym}.csv`,'text/csv;charset=utf-8;');
  }

  exportJson(){
    const payload={version:CONFIG.VERSION,timestamp:new Date().toISOString(),data:this.data};
    this.download(JSON.stringify(payload,null,2),`backup-${new Date().toISOString().slice(0,10)}.json`,'application/json');
  }

  exportHistory(){
    const payload={version:CONFIG.VERSION,timestamp:new Date().toISOString(),history:this.data.log};
    this.download(JSON.stringify(payload,null,2),`history-${new Date().toISOString().slice(0,10)}.json`,'application/json');
  }

  download(content,name,type){
    const blob=new Blob([content],{type});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;
    a.download=name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  save(){
    Safe.s(CONFIG.STORAGE_KEYS.PRODUCTS,this.data.products);
    Safe.s(CONFIG.STORAGE_KEYS.ENTRIES,this.data.entries);
    Safe.s(CONFIG.STORAGE_KEYS.SALARY,this.data.salary);
    Safe.s(CONFIG.STORAGE_KEYS.LOG,(this.data.log||[]).slice(-CONFIG.MAX_LOG));
    Safe.s(CONFIG.STORAGE_KEYS.PRESETS,this.data.presets);
    Safe.sr(CONFIG.STORAGE_KEYS.THEME,this.data.theme||'classic');
  }

  log(a,item,details){
    (this.data.log=this.data.log||[]).push({id:Date.now()+Math.random()*1000|0,timestamp:new Date().toISOString(),action:a,item,details});
  }

  actionName(a){
    const m={
      add_record:'Добавление записи',
      delete_record:'Удаление записи',
      add_product:'Добавление продукта',
      edit_product:'Изменение продукта',
      delete_product:'Удаление продукта',
      settings:'Изменение настроек'
    };
    return m[a]||a;
  }

  esc(s){
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#x27;');
  }

  importProducts(file){
    if(!file) return;
    const reader=new FileReader();
    reader.onload=e=>{
      try{
        const csv=e.target.result;
        const lines=csv.split('\n').filter(l=>l.trim());
        if(lines.length<2) return alert('Файл должен содержать заголовки и данные');
        const headers=lines[0].split(',').map(h=>h.trim().replace(/"/g,''));
        const nameIdx=headers.findIndex(h=>h.toLowerCase().includes('назв')||h.toLowerCase().includes('name'));
        const priceIdx=headers.findIndex(h=>h.toLowerCase().includes('цен')||h.toLowerCase().includes('price'));
        if(nameIdx===-1||priceIdx===-1) return alert('Файл должен содержать колонки с названием и ценой');
        let added=0;
        for(let i=1;i<lines.length;i++){
          const cols=lines[i].split(',').map(c=>c.trim().replace(/"/g,''));
          const name=cols[nameIdx]?.trim();
          const price=parseFloat(cols[priceIdx]);
          if(name&&!isNaN(price)&&price>0){
            const exists=(this.data.products||[]).some(p=>p.name.toLowerCase()===name.toLowerCase());
            if(!exists){
              (this.data.products=this.data.products||[]).push({
                id:Date.now()+Math.random(),
                name,
                price,
                priceDefect:null,
                archived:false,
                created:new Date().toISOString(),
                favorite:false
              });
              added++;
            }
          }
        }
        this.save();
        this.renderProductsList();
        this.updateProductSuggestions();
        alert(`Импортировано продуктов: ${added}`);
      }catch(err){
        alert('Ошибка чтения файла');
      }
    };
    reader.readAsText(file);
  }
}

let app;
document.addEventListener('DOMContentLoaded',()=>{app=new App();});
