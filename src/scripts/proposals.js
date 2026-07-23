/**
 * Proposals List & Builder View Controller
 */

let currentEditingProposalId = null;

function renderProposalsList() {
  const proposals = window.DB.getProposals();
  const search = (document.getElementById('proposal-search-input')?.value || '').toLowerCase();
  const statusFilter = document.getElementById('proposal-status-filter')?.value || 'all';

  const filtered = proposals.filter(p => {
    const matchSearch = p.number.toLowerCase().includes(search) || 
                        (p.clientName || '').toLowerCase().includes(search);
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const tbody = document.getElementById('proposals-table-tbody');
  if (!tbody) return;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 32px;">Kriterlere uygun teklif bulunamadı.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(p => {
    const totals = calculateProposalTotals(p);
    const dateStr = new Date(p.date).toLocaleDateString('tr-TR');
    const validUntilStr = new Date(p.validUntil).toLocaleDateString('tr-TR');
    const currSymbol = getCurrencySymbol(p.currency);
    const statusBadge = getStatusBadgeHTML(p.status);

    return `
      <tr>
        <td><strong>${p.number}</strong></td>
        <td>${escapeHTML(p.clientName || 'Belirtilmedi')}</td>
        <td>${dateStr}</td>
        <td>${validUntilStr}</td>
        <td><strong>${currSymbol} ${totals.grandTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</strong></td>
        <td>${statusBadge}</td>
        <td>
          <div style="display: flex; gap: 6px;">
            <button class="btn btn-secondary btn-sm btn-icon" onclick="viewProposalPDF('${p.id}')" title="PDF / Yazdır">
              <i class="ri-file-pdf-line"></i>
            </button>
            <button class="btn btn-secondary btn-sm btn-icon" onclick="editProposal('${p.id}')" title="Düzenle">
              <i class="ri-edit-line"></i>
            </button>
            <button class="btn btn-secondary btn-sm btn-icon" onclick="duplicateProposal('${p.id}')" title="Kopyala">
              <i class="ri-file-copy-line"></i>
            </button>
            <button class="btn btn-danger btn-sm btn-icon" onclick="confirmDeleteProposal('${p.id}')" title="Sil">
              <i class="ri-delete-bin-line"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function openProposalBuilder(proposalId = null) {
  currentEditingProposalId = proposalId;
  const company = window.DB.getCompany();
  const clients = window.DB.getClients();
  const catalog = window.DB.getCatalog();

  // Populate client dropdown
  const clientSelect = document.getElementById('builder-client-select');
  if (clientSelect) {
    clientSelect.innerHTML = `<option value="">-- Müşteri Seçin --</option>` +
      clients.map(c => `<option value="${c.id}">${escapeHTML(c.name)}</option>`).join('');
  }

  // Populate catalog quick select (Grouped by Ürünler & Hizmetler)
  const catalogSelect = document.getElementById('builder-catalog-select');
  if (catalogSelect) {
    const products = catalog.filter(c => c.type === 'product');
    const services = catalog.filter(c => c.type === 'service');

    let options = `<option value="">+ Kataloktan Ekle</option>`;
    if (products.length > 0) {
      options += `<optgroup label="Fiziksel Ürünler">` + 
        products.map(cat => `<option value="${cat.id}">[Ürün] ${escapeHTML(cat.title)} (${cat.unitPrice} ₺)</option>`).join('') +
        `</optgroup>`;
    }
    if (services.length > 0) {
      options += `<optgroup label="Hizmetler & Danışmanlık">` + 
        services.map(cat => `<option value="${cat.id}">[Hizmet] ${escapeHTML(cat.title)} (${cat.unitPrice} ₺)</option>`).join('') +
        `</optgroup>`;
    }
    catalogSelect.innerHTML = options;
  }

  const titleEl = document.getElementById('builder-title');

  if (proposalId) {
    // Edit Mode
    const p = window.DB.getProposal(proposalId);
    if (!p) return;

    if (titleEl) titleEl.textContent = `Teklif Düzenle: ${p.number}`;
    document.getElementById('builder-proposal-number').value = p.number;
    document.getElementById('builder-client-select').value = p.clientId || '';
    document.getElementById('builder-date').value = p.date;
    document.getElementById('builder-valid-until').value = p.validUntil;
    document.getElementById('builder-currency').value = p.currency || 'TRY';
    document.getElementById('builder-status').value = p.status || 'draft';
    document.getElementById('builder-discount').value = p.discountRate || 0;
    document.getElementById('builder-terms').value = p.terms || company.notes || '';

    renderProposalItemRows(p.items || []);
  } else {
    // New Proposal Mode
    if (titleEl) titleEl.textContent = 'Yeni Teklif Oluştur';
    
    // Auto generate proposal code
    const existing = window.DB.getProposals();
    const count = existing.length + 1;
    const year = new Date().getFullYear();
    const autoNumber = `TKL-${year}-${String(count).padStart(3, '0')}`;

    const todayStr = new Date().toISOString().slice(0, 10);
    const next15Days = new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10);

    document.getElementById('builder-proposal-number').value = autoNumber;
    document.getElementById('builder-client-select').value = clients.length > 0 ? clients[0].id : '';
    document.getElementById('builder-date').value = todayStr;
    document.getElementById('builder-valid-until').value = next15Days;
    document.getElementById('builder-currency').value = 'TRY';
    document.getElementById('builder-status').value = 'draft';
    document.getElementById('builder-discount').value = 0;
    document.getElementById('builder-terms').value = company.notes || '';

    // Add default row if catalog exists or empty row
    if (catalog.length > 0) {
      renderProposalItemRows([{
        title: catalog[0].title,
        unit: catalog[0].unit || 'Adet',
        quantity: 1,
        unitPrice: catalog[0].unitPrice || 0,
        vatRate: catalog[0].vatRate || 20
      }]);
    } else {
      renderProposalItemRows([{
        title: 'Örnek Hizmet Kalemi',
        unit: 'Adet',
        quantity: 1,
        unitPrice: 1000,
        vatRate: 20
      }]);
    }
  }

  recalculateBuilderTotals();
  switchTab('view-proposal-builder');
}

function renderProposalItemRows(items) {
  const container = document.getElementById('builder-items-tbody');
  if (!container) return;

  container.innerHTML = '';

  items.forEach((item, index) => {
    addProposalItemRow(item);
  });
}

function updateCatalogDatalist() {
  let datalist = document.getElementById('catalog-suggestions');
  if (!datalist) {
    datalist = document.createElement('datalist');
    datalist.id = 'catalog-suggestions';
    document.body.appendChild(datalist);
  }
  const catalog = window.DB.getCatalog();
  datalist.innerHTML = catalog.map(cat => `<option value="${escapeHTML(cat.title)}"></option>`).join('');
}

function addProposalItemRow(data = {}) {
  const container = document.getElementById('builder-items-tbody');
  if (!container) return;

  updateCatalogDatalist();

  const tr = document.createElement('tr');
  tr.className = 'item-row';
  
  const detailTr = document.createElement('tr');
  detailTr.className = 'item-detail-row';
  const hasDetail = !!(data.description || data.image);
  detailTr.style.display = hasDetail ? 'table-row' : 'none';
  detailTr.style.background = 'rgba(0, 0, 0, 0.12)';

  tr.innerHTML = `
    <td style="position: relative;">
      <input type="text" class="form-control item-title" list="catalog-suggestions" value="${escapeHTML(data.title || '')}" placeholder="Hizmet veya ürün yazın / seçin..." oninput="handleItemTitleInput(this); recalculateBuilderTotals()">
    </td>
    <td style="width: 100px;">
      <select class="form-control item-unit" onchange="recalculateBuilderTotals()">
        <option value="Adet" ${data.unit === 'Adet' ? 'selected' : ''}>Adet</option>
        <option value="Saat" ${data.unit === 'Saat' ? 'selected' : ''}>Saat</option>
        <option value="Gün" ${data.unit === 'Gün' ? 'selected' : ''}>Gün</option>
        <option value="Ay" ${data.unit === 'Ay' ? 'selected' : ''}>Ay</option>
        <option value="Proje" ${data.unit === 'Proje' ? 'selected' : ''}>Proje</option>
        <option value="Paket" ${data.unit === 'Paket' ? 'selected' : ''}>Paket</option>
      </select>
    </td>
    <td style="width: 90px;">
      <input type="number" class="form-control item-quantity" value="${data.quantity || 1}" min="1" step="0.5" oninput="recalculateBuilderTotals()">
    </td>
    <td style="width: 130px;">
      <input type="number" class="form-control item-price" value="${data.unitPrice || 0}" min="0" step="10" oninput="recalculateBuilderTotals()">
    </td>
    <td style="width: 100px;">
      <select class="form-control item-vat" onchange="recalculateBuilderTotals()">
        <option value="20" ${data.vatRate == 20 ? 'selected' : ''}>%20</option>
        <option value="10" ${data.vatRate == 10 ? 'selected' : ''}>%10</option>
        <option value="1" ${data.vatRate == 1 ? 'selected' : ''}>%1</option>
        <option value="0" ${data.vatRate == 0 ? 'selected' : ''}>%0</option>
      </select>
    </td>
    <td style="width: 130px; text-align: right; font-weight: 600;" class="item-linetotal">
      0.00 ₺
    </td>
    <td style="width: 80px; text-align: center;">
      <div style="display: flex; gap: 4px; justify-content: center;">
        <button type="button" class="btn btn-secondary btn-sm btn-icon" onclick="toggleItemDetail(this)" title="Açıklama & Resim Ekle/Düzenle">
          <i class="ri-file-text-line"></i>
        </button>
        <button type="button" class="btn btn-danger btn-sm btn-icon" onclick="removeProposalItemRow(this)" title="Satırı Sil">
          <i class="ri-subtract-line"></i>
        </button>
      </div>
    </td>
  `;

  detailTr.innerHTML = `
    <td colspan="7" style="padding: 12px 16px; border-bottom: 1px solid var(--border-color);">
      <div style="display: flex; gap: 16px; align-items: flex-start; flex-wrap: wrap;">
        <div style="flex: 1; min-width: 280px;">
          <label style="font-size: 0.78rem; font-weight: 600; color: var(--text-muted); display: block; margin-bottom: 4px;">Detaylı Açıklama / Özellikler (Teklifte Görünür)</label>
          <textarea class="form-control item-description" rows="2" placeholder="Teknik detay, açıklama veya dipnot...">${escapeHTML(data.description || '')}</textarea>
        </div>
        <div style="width: 230px;">
          <label style="font-size: 0.78rem; font-weight: 600; color: var(--text-muted); display: block; margin-bottom: 4px;">Ürün Görseli (Teklif PDF'inde Görünür)</label>
          <div style="display: flex; align-items: center; gap: 8px;">
            <img class="item-image-preview" src="${data.image || ''}" style="width: 44px; height: 44px; object-fit: cover; display: ${data.image ? 'block' : 'none'}; border-radius: 6px; border: 1px solid var(--border-color); background: #fff;">
            <input type="file" class="item-image-file" accept="image/*" style="display: none;" onchange="handleRowImageUpload(this)">
            <button type="button" class="btn btn-secondary btn-sm" onclick="this.previousElementSibling.click()">
              <i class="ri-image-add-line"></i> Resim
            </button>
            <button type="button" class="btn btn-danger btn-sm btn-icon" onclick="removeRowImage(this)" title="Resmi Kaldır">
              <i class="ri-close-line"></i>
            </button>
          </div>
        </div>
      </div>
    </td>
  `;

  container.appendChild(tr);
  container.appendChild(detailTr);
  recalculateBuilderTotals();
}

function toggleItemDetail(btn) {
  const tr = btn.closest('tr');
  const nextTr = tr ? tr.nextElementSibling : null;
  if (nextTr && nextTr.classList.contains('item-detail-row')) {
    const isHidden = nextTr.style.display === 'none';
    nextTr.style.display = isHidden ? 'table-row' : 'none';
  }
}

function handleRowImageUpload(inputEl) {
  const file = inputEl.files[0];
  if (!file) return;

  if (file.size > 3 * 1024 * 1024) {
    window.showToast('Görsel 3MB\'tan küçük olmalıdır.', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    const container = inputEl.closest('td');
    const imgPreview = container ? container.querySelector('.item-image-preview') : null;
    if (imgPreview) {
      imgPreview.src = e.target.result;
      imgPreview.style.display = 'block';
    }
  };
  reader.readAsDataURL(file);
}

function removeRowImage(btn) {
  const container = btn.closest('td');
  if (container) {
    const imgPreview = container.querySelector('.item-image-preview');
    const fileInput = container.querySelector('.item-image-file');
    if (imgPreview) {
      imgPreview.src = '';
      imgPreview.style.display = 'none';
    }
    if (fileInput) fileInput.value = '';
  }
}

function handleItemTitleInput(inputEl) {
  const val = inputEl.value.trim();
  if (!val) return;

  const catalog = window.DB.getCatalog();
  const match = catalog.find(c => c.title.toLowerCase() === val.toLowerCase());
  if (match) {
    const tr = inputEl.closest('tr');
    if (tr) {
      const unitSelect = tr.querySelector('.item-unit');
      const priceInput = tr.querySelector('.item-price');
      const vatSelect = tr.querySelector('.item-vat');

      if (unitSelect && match.unit) unitSelect.value = match.unit;
      if (priceInput && match.unitPrice !== undefined) priceInput.value = match.unitPrice;
      if (vatSelect && match.vatRate !== undefined) vatSelect.value = match.vatRate;

      const detailTr = tr.nextElementSibling;
      if (detailTr && detailTr.classList.contains('item-detail-row')) {
        const descTextarea = detailTr.querySelector('.item-description');
        const imgPreview = detailTr.querySelector('.item-image-preview');

        if (descTextarea && match.description) {
          descTextarea.value = match.description;
          detailTr.style.display = 'table-row';
        }
        if (imgPreview && match.image) {
          imgPreview.src = match.image;
          imgPreview.style.display = 'block';
          detailTr.style.display = 'table-row';
        }
      }
    }
  }
}

function addCatalogItemToProposal() {
  const select = document.getElementById('builder-catalog-select');
  const catId = select.value;
  if (!catId) return;

  const catalog = window.DB.getCatalog();
  const found = catalog.find(c => c.id === catId);
  if (found) {
    const proposalCurrency = document.getElementById('builder-currency')?.value || 'TRY';
    const itemCurrency = found.currency || 'TRY';

    let finalPrice = found.unitPrice || 0;
    if (itemCurrency !== proposalCurrency && window.CurrencyEngine) {
      finalPrice = Math.round(window.CurrencyEngine.convert(found.unitPrice, itemCurrency, proposalCurrency) * 100) / 100;
    }

    addProposalItemRow({
      title: found.title,
      description: found.description || '',
      image: found.image || '',
      unit: found.unit || 'Adet',
      quantity: 1,
      unitPrice: finalPrice,
      vatRate: found.vatRate || 20
    });

    if (itemCurrency !== proposalCurrency) {
      const fromSym = window.getCurrencySymbol(itemCurrency);
      const toSym = window.getCurrencySymbol(proposalCurrency);
      window.showToast(`"${found.title}" (${found.unitPrice} ${fromSym} ➔ ${finalPrice} ${toSym} kur çevrimi yapıldı).`, 'info');
    }
  }
  select.value = '';
}

function openCatalogPickerModal() {
  renderCatalogPickerList();
  const modal = document.getElementById('catalog-picker-modal');
  if (modal) modal.classList.add('active');
}

function closeCatalogPickerModal() {
  const modal = document.getElementById('catalog-picker-modal');
  if (modal) modal.classList.remove('active');
}

function renderCatalogPickerList() {
  const catalog = window.DB.getCatalog();
  const search = (document.getElementById('catalog-picker-search')?.value || '').toLowerCase().trim();
  const typeFilter = document.getElementById('catalog-picker-type')?.value || 'all';

  const filtered = catalog.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(search) ||
      (c.description && c.description.toLowerCase().includes(search));
    const matchesType = typeFilter === 'all' || (c.type || 'product') === typeFilter;
    return matchesSearch && matchesType;
  });

  const tbody = document.getElementById('catalog-picker-tbody');
  if (!tbody) return;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 28px;">Arama kriterlerine uygun ürün veya hizmet bulunamadı.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(item => {
    const isService = item.type === 'service';
    const typeBadge = isService 
      ? `<span class="badge" style="background: rgba(139, 92, 246, 0.15); color: #a78bfa; border: 1px solid rgba(139, 92, 246, 0.3);">Hizmet</span>`
      : `<span class="badge" style="background: rgba(14, 165, 233, 0.15); color: #38bdf8; border: 1px solid rgba(14, 165, 233, 0.3);">Ürün</span>`;
    const currSym = window.getCurrencySymbol ? window.getCurrencySymbol(item.currency || 'TRY') : '₺';

    const descSnippet = item.description 
      ? `<div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 280px;">${escapeHTML(item.description)}</div>`
      : '';

    return `
      <tr>
        <td>
          <div style="display: flex; align-items: center; gap: 8px;">
            ${typeBadge}
            <div>
              <strong>${escapeHTML(item.title)}</strong>
              ${descSnippet}
            </div>
          </div>
        </td>
        <td><span class="badge badge-draft">${escapeHTML(item.unit || 'Adet')}</span></td>
        <td><strong>${(item.unitPrice || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ${currSym}</strong></td>
        <td>%${item.vatRate || 20}</td>
        <td style="text-align: right;">
          <button type="button" class="btn btn-primary btn-sm" onclick="selectItemFromCatalogPicker('${item.id}')">
            <i class="ri-add-line"></i> Teklife Ekle
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function selectItemFromCatalogPicker(id) {
  const catalog = window.DB.getCatalog();
  const found = catalog.find(c => c.id === id);
  if (found) {
    const proposalCurrency = document.getElementById('builder-currency')?.value || 'TRY';
    const itemCurrency = found.currency || 'TRY';

    let finalPrice = found.unitPrice || 0;
    if (itemCurrency !== proposalCurrency && window.CurrencyEngine) {
      finalPrice = Math.round(window.CurrencyEngine.convert(found.unitPrice, itemCurrency, proposalCurrency) * 100) / 100;
    }

    const rows = document.querySelectorAll('.item-row');
    let targetRow = null;
    if (rows.length > 0) {
      const lastRow = rows[rows.length - 1];
      const lastTitle = lastRow.querySelector('.item-title')?.value.trim();
      if (!lastTitle) {
        targetRow = lastRow;
      }
    }

    if (targetRow) {
      targetRow.querySelector('.item-title').value = found.title;
      targetRow.querySelector('.item-unit').value = found.unit || 'Adet';
      targetRow.querySelector('.item-price').value = finalPrice;
      targetRow.querySelector('.item-vat').value = found.vatRate || 20;

      const detailTr = targetRow.nextElementSibling;
      if (detailTr && detailTr.classList.contains('item-detail-row')) {
        const descInput = detailTr.querySelector('.item-description');
        const imgPreview = detailTr.querySelector('.item-image-preview');
        if (descInput && found.description) descInput.value = found.description;
        if (imgPreview && found.image) {
          imgPreview.src = found.image;
          imgPreview.style.display = 'block';
        }
        if (found.description || found.image) detailTr.style.display = 'table-row';
      }
    } else {
      addProposalItemRow({
        title: found.title,
        description: found.description || '',
        image: found.image || '',
        unit: found.unit || 'Adet',
        quantity: 1,
        unitPrice: finalPrice,
        vatRate: found.vatRate || 20
      });
    }

    recalculateBuilderTotals();

    if (itemCurrency !== proposalCurrency) {
      const fromSym = window.getCurrencySymbol(itemCurrency);
      const toSym = window.getCurrencySymbol(proposalCurrency);
      window.showToast(`"${found.title}" (${found.unitPrice} ${fromSym} ➔ ${finalPrice} ${toSym} kur çevrimi yapıldı).`, 'info');
    } else {
      window.showToast(`"${found.title}" teklife eklendi.`, 'success');
    }
  }
}

function removeProposalItemRow(btn) {
  const rows = document.querySelectorAll('.item-row');
  if (rows.length <= 1) {
    window.showToast('En az bir teklif kalemi olmalıdır.', 'info');
    return;
  }
  const tr = btn.closest('tr');
  const nextTr = tr ? tr.nextElementSibling : null;
  if (nextTr && nextTr.classList.contains('item-detail-row')) {
    nextTr.remove();
  }
  if (tr) tr.remove();
  recalculateBuilderTotals();
}

function recalculateBuilderTotals() {
  const currency = document.getElementById('builder-currency')?.value || 'TRY';
  const currSymbol = getCurrencySymbol(currency);
  const rows = document.querySelectorAll('.item-row');

  let subtotal = 0;
  let vatTotal = 0;

  rows.forEach(tr => {
    const qty = parseFloat(tr.querySelector('.item-quantity')?.value || 0);
    const price = parseFloat(tr.querySelector('.item-price')?.value || 0);
    const vatRate = parseFloat(tr.querySelector('.item-vat')?.value || 0);

    const lineSub = qty * price;
    const lineVat = lineSub * (vatRate / 100);

    subtotal += lineSub;
    vatTotal += lineVat;

    const lineTotalCell = tr.querySelector('.item-linetotal');
    if (lineTotalCell) {
      lineTotalCell.textContent = `${currSymbol} ${(lineSub + lineVat).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
  });

  const discountRate = parseFloat(document.getElementById('builder-discount')?.value || 0);
  const discountAmount = subtotal * (discountRate / 100);
  const subtotalAfterDiscount = subtotal - discountAmount;
  const finalVat = subtotal > 0 ? vatTotal * (subtotalAfterDiscount / subtotal) : 0;
  const grandTotal = subtotalAfterDiscount + finalVat;

  document.getElementById('calc-subtotal').textContent = `${currSymbol} ${subtotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`;
  document.getElementById('calc-discount').textContent = `- ${currSymbol} ${discountAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`;
  document.getElementById('calc-vat').textContent = `${currSymbol} ${finalVat.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`;
  document.getElementById('calc-grand-total').textContent = `${currSymbol} ${grandTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`;
}

function saveCurrentProposal() {
  const number = document.getElementById('builder-proposal-number').value.trim();
  const clientId = document.getElementById('builder-client-select').value;
  const date = document.getElementById('builder-date').value;
  const validUntil = document.getElementById('builder-valid-until').value;
  const currency = document.getElementById('builder-currency').value;
  const status = document.getElementById('builder-status').value;
  const discountRate = parseFloat(document.getElementById('builder-discount').value || 0);
  const terms = document.getElementById('builder-terms').value;

  if (!number) {
    window.showToast('Lütfen teklif numarasını girin.', 'error');
    return;
  }

  const clients = window.DB.getClients();
  const selectedClient = clients.find(c => c.id === clientId);
  const clientName = selectedClient ? selectedClient.name : 'Müşteri Belirtilmedi';

  const itemRows = document.querySelectorAll('.item-row');
  const items = [];

  itemRows.forEach((tr, i) => {
    const title = tr.querySelector('.item-title').value.trim();
    if (title) {
      const detailTr = tr.nextElementSibling;
      let description = '';
      let image = '';

      if (detailTr && detailTr.classList.contains('item-detail-row')) {
        description = detailTr.querySelector('.item-description')?.value.trim() || '';
        const imgPreview = detailTr.querySelector('.item-image-preview');
        image = (imgPreview && imgPreview.style.display !== 'none') ? imgPreview.src : '';
      }

      items.push({
        id: 'item_' + (i + 1),
        title,
        description,
        image,
        unit: tr.querySelector('.item-unit').value,
        quantity: parseFloat(tr.querySelector('.item-quantity').value || 1),
        unitPrice: parseFloat(tr.querySelector('.item-price').value || 0),
        vatRate: parseFloat(tr.querySelector('.item-vat').value || 20)
      });
    }
  });

  if (items.length === 0) {
    window.showToast('Lütfen en az 1 kalem açıklama girin.', 'error');
    return;
  }

  const proposalObj = {
    id: currentEditingProposalId || undefined,
    number,
    clientId,
    clientName,
    date,
    validUntil,
    currency,
    status,
    discountRate,
    terms,
    items
  };

  const saved = window.DB.saveProposal(proposalObj);
  window.showToast(`Teklif başarıyla kaydedildi: ${saved.number}`, 'success');

  renderProposalsList();
  renderDashboard();
  switchTab('view-proposals-list');
}

function editProposal(id) {
  openProposalBuilder(id);
}

function duplicateProposal(id) {
  const source = window.DB.getProposal(id);
  if (!source) return;

  const copy = JSON.parse(JSON.stringify(source));
  delete copy.id;
  copy.number = `${source.number}-KOPYA`;
  copy.date = new Date().toISOString().slice(0, 10);
  copy.status = 'draft';

  window.DB.saveProposal(copy);
  window.showToast(`Teklif kopyalandı: ${copy.number}`, 'success');
  renderProposalsList();
  renderDashboard();
}

function confirmDeleteProposal(id) {
  const p = window.DB.getProposal(id);
  if (!p) return;

  if (confirm(`"${p.number}" teklifini silmek istediğinize emin misiniz?`)) {
    window.DB.deleteProposal(id);
    window.showToast('Teklif silindi.', 'info');
    renderProposalsList();
    renderDashboard();
  }
}

window.renderProposalsList = renderProposalsList;
window.openProposalBuilder = openProposalBuilder;
window.addProposalItemRow = addProposalItemRow;
window.addCatalogItemToProposal = addCatalogItemToProposal;
window.openCatalogPickerModal = openCatalogPickerModal;
window.closeCatalogPickerModal = closeCatalogPickerModal;
window.renderCatalogPickerList = renderCatalogPickerList;
window.selectItemFromCatalogPicker = selectItemFromCatalogPicker;
window.handleItemTitleInput = handleItemTitleInput;
window.removeProposalItemRow = removeProposalItemRow;
window.recalculateBuilderTotals = recalculateBuilderTotals;
window.saveCurrentProposal = saveCurrentProposal;
window.editProposal = editProposal;
window.duplicateProposal = duplicateProposal;
window.confirmDeleteProposal = confirmDeleteProposal;
window.toggleItemDetail = toggleItemDetail;
window.handleRowImageUpload = handleRowImageUpload;
window.removeRowImage = removeRowImage;


