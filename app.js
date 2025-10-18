const CONFIG = { /* ...оставьте как в вашей версии... */ };

class App {
  constructor() {
    // ...все предыдущие свойства и DOM элементы без изменений...
    this.q = s=>document.querySelector(s); this.qa=s=>document.querySelectorAll(s);
    this.cacheDOM(); this.bindEvents(); this.applyTheme('classic');
    // ...ваши renderPresets, инициализации...
    this.renderRecords();
  }

  // ...cacheDOM, bindEvents...

  // Добавлено: получение поля input для цены брака
  cacheDOM() {
    // ...другой ваш код...
    this.productDefectPriceInput = this.q('#productDefectPriceInput');
  }

  // calculateSum с учётом цены брака
  calculateSum() {
    const p = this.currentProduct();
    let qty = parseFloat(this.quantityInput?.value || 1);
    if (isNaN(qty)) qty = 1;
    let price = p ? p.price : 0;
    if (qty < 0 && typeof p?.priceDefect === 'number' && !isNaN(p.priceDefect)) {
      price = p.priceDefect;
    }
    this.sumAmount.textContent = p ? `${(qty * price).toFixed(2)} ₽` : `0 ₽`;
  }

  addRecord() {
    const p = this.currentProduct();
    let qty = parseFloat(this.quantityInput?.value || 1);
    if (!p) return alert('Выберите продукт');
    let price = p.price;
    if (qty < 0 && typeof p.priceDefect === 'number' && !isNaN(p.priceDefect)) {
      price = p.priceDefect;
    }
    const sum = qty * price;
    const rec = {id: Date.now(), productId: p.id, quantity: qty, price, sum, date: new Date().toISOString()};
    this.data.entries = (this.data.entries||[]); this.data.entries.push(rec);
    // ...save, clear, render...
    this.save(); this.quantityInput.value = ""; this.calculateSum(); this.renderRecords();
  }

  // Редактирование продукта с ценой брака
  openProductModal(productId=null) {
    this.editingProductId = productId;
    if(productId){
      const p = (this.data.products||[]).find(x=>x.id===productId);
      this.productNameInput.value=p.name;
      this.productPriceInput.value=p.price;
      this.productDefectPriceInput.value=(typeof p.priceDefect==='number' ? p.priceDefect : '');
    } else {
      this.productNameInput.value = '';
      this.productPriceInput.value = '';
      this.productDefectPriceInput.value = '';
    }
    this.productModal.classList.add('modal--active');
  }
  saveProduct() {
    const name = this.productNameInput.value.trim();
    const price = parseFloat(this.productPriceInput.value);
    const defectPrice = parseFloat(this.productDefectPriceInput.value);
    if(!name) return alert('Введите название');
    if(isNaN(price)||price<=0) return alert('Некорректная цена');
    let priceDefect = isNaN(defectPrice) ? null : defectPrice;
    if(this.editingProductId){
      const p = (this.data.products||[]).find(x=>x.id===this.editingProductId);
      p.name = name; p.price = price; p.priceDefect = priceDefect;
    } else {
      const p = {id:Date.now(),name,price,priceDefect,archived:false,created:new Date().toISOString(),favorite:false};
      (this.data.products=this.data.products||[]).push(p);
    }
    this.save(); this.closeProductModal(); this.renderProductsList(); this.updateProductSuggestions();
  }

  // В renderRecords выделяем сумму цветом
  renderRecords() {
    if(!this.recordsList) return;
    const now = new Date(); const ym = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    const list=(this.data.entries||[]).filter(e=>{const d=new Date(e.date);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`===ym;}).sort((a,b)=>new Date(b.date)-new Date(a.date));
    this.recordsList.innerHTML='';
    for(const r of list){
      const p = (this.data.products||[]).find(x=>x.id===r.productId); const name = p?p.name:'?';
      const d = new Date(r.date);
      const amountClass = r.sum >= 0 ? 'plus' : 'minus';
      const row = document.createElement('div'); row.className='record-item';
      row.innerHTML=`
        <div class="record-info">
          <div class="record-title">${name}</div>
          <div class="record-details">${r.quantity} × ${r.price}₽ = <span class="record-amount ${amountClass}">${r.sum.toFixed(2)}₽</span></div>
          <div class="record-details">${d.toLocaleDateString()} ${d.toLocaleTimeString().slice(0,5)}</div>
        </div>
        <div class="record-actions"><button class="btn btn--sm btn--danger">🗑️</button></div>
      `;
      row.querySelector('button').onclick=()=>this.deleteRecord(r.id);
      this.recordsList.appendChild(row);
    }
  }

  // ... остальные методы как в старой версии ...
}

let app;
document.addEventListener('DOMContentLoaded', ()=>{app=new App();});
