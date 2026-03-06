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
      row.innerHTML=`<span class="suggestion-star ${p.favorite?'suggestion-star--favorite':''}">${p.favorite?'★':'☆'}</span><span class="suggestion-text">${this.esc(p.name)} — ${p.price}${CONFIG.DEFAULT_CURRENCY}</span>`;
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
      sum=
