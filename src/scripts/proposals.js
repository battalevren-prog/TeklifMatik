/**
 * Proposals List & Builder View Controller
 */

let currentEditingProposalId = null;

function updateCompanyFilterDropdown() {
  const filterSelect = document.getElementById('proposal-company-filter');
  if (!filterSelect) return;
  const currentVal = filterSelect.value || 'all';
  const companies = window.DB.getCompanies ? window.DB.getCompanies() : [];

  let options = `<option value="all">Tüm Firmalar</option>`;
  companies.forEach(c => {
    options += `<option value="${c.id}">${escapeHTML(c.name)}</option>`;
  });

  filterSelect.innerHTML = options;
  filterSelect.value = currentVal;
}

function renderProposalsList() {
  updateCompanyFilterDropdown();
  const proposals = window.DB.getProposals();
  const search = (document.getElementById('proposal-search-input')?.value || '').trim();
  const statusFilter = document.getElementById('proposal-status-filter')?.value || 'all';
  const companyFilter = document.getElementById('proposal-company-filter')?.value || 'all';

  // 1. Sıralama: En son tekliften en eskiye (DESC)
  const sorted = [...proposals].sort((a, b) => {
    const dateA = new Date(a.date || a.createdAt || 0).getTime();
    const dateB = new Date(b.date || b.createdAt || 0).getTime();
    if (dateB !== dateA) {
      return dateB - dateA;
    }
    const idA = parseInt(String(a.id).replace(/\D/g, '')) || 0;
    const idB = parseInt(String(b.id).replace(/\D/g, '')) || 0;
    return idB - idA;
  });

  const isFiltered = search !== '' || statusFilter !== 'all' || companyFilter !== 'all';

  let filtered = sorted.filter(p => {
    const matchSearch = window.matchSearchPattern(p.number, search) || 
                        window.matchSearchPattern(p.clientName, search);
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    const pCompId = p.companyId || 'comp_1';
    const matchCompany = companyFilter === 'all' || pCompId === companyFilter;
    return matchSearch && matchStatus && matchCompany;
  });

  // 2. Filtreleme yapılmadığında varsayılan son 100 teklif
  if (!isFiltered && filtered.length > 100) {
    filtered = filtered.slice(0, 100);
  }

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

    // Dynamic Quick Status Dropdown HTML
    const statusSelectHTML = `
      <select class="form-control form-control-sm quick-status-select" style="width: auto; padding: 4px 8px; font-size: 0.78rem; font-weight: 600;" onchange="quickChangeProposalStatus('${p.id}', this.value)">
        <option value="draft" ${p.status === 'draft' ? 'selected' : ''}>Taslak</option>
        <option value="sent" ${p.status === 'sent' ? 'selected' : ''}>Gönderildi</option>
        <option value="approved" ${p.status === 'approved' ? 'selected' : ''}>Onaylandı</option>
        <option value="rejected" ${p.status === 'rejected' ? 'selected' : ''}>Reddedildi</option>
        <option value="invoiced" ${p.status === 'invoiced' ? 'selected' : ''}>Faturalandı</option>
      </select>
    `;

    return `
      <tr>
        <td><strong>${p.number}</strong></td>
        <td>${escapeHTML(p.clientName || 'Belirtilmedi')}</td>
        <td>${dateStr}</td>
        <td>${validUntilStr}</td>
        <td><strong>${currSymbol} ${totals.grandTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</strong></td>
        <td>${statusSelectHTML}</td>
        <td>
          <div style="display: flex; gap: 4px; flex-wrap: nowrap;">
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

function quickChangeProposalStatus(proposalId, newStatus) {
  const updated = window.DB.updateProposalStatus(proposalId, newStatus);
  if (updated) {
    const statusLabels = { draft: 'Taslak', sent: 'Gönderildi', approved: 'Onaylandı', rejected: 'Reddedildi', invoiced: 'Faturalandı' };
    window.showToast(`Teklif durumu güncellendi: ${statusLabels[newStatus] || newStatus}`, 'success');
    renderProposalsList();
    if (window.renderDashboard) window.renderDashboard();
  }
}

function shareProposalWhatsApp(proposalId) {
  const p = window.DB.getProposal(proposalId);
  if (!p) return;

  const clients = window.DB.getClients();
  const client = clients.find(c => c.id === p.clientId);
  const phone = client ? (client.phone || '').replace(/[^0-9]/g, '') : '';

  const totals = calculateProposalTotals(p);
  const currSym = getCurrencySymbol(p.currency);

  const messageText = `Sayın ${p.clientName || 'Yetkili'},\n\n${p.number} numaralı teklifimiz hazırlanmıştır.\nToplam Tutar: ${currSym} ${totals.grandTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}\nGeçerlilik Tarihi: ${new Date(p.validUntil).toLocaleDateString('tr-TR')}\n\nTeklif detaylarını görüşmek üzere iyi çalışmalar dileriz.`;

  const encodedMsg = encodeURIComponent(messageText);
  const waUrl = phone ? `https://wa.me/${phone}?text=${encodedMsg}` : `https://wa.me/?text=${encodedMsg}`;

  if (window.electronAPI && window.electronAPI.openExternal) {
    window.electronAPI.openExternal(waUrl);
  } else {
    window.open(waUrl, '_blank');
  }

  window.showToast('WhatsApp mesaj taslağı hazırlandı.', 'info');
}

function shareProposalEmail(proposalId) {
  const p = window.DB.getProposal(proposalId);
  if (!p) return;

  const clients = window.DB.getClients();
  const client = clients.find(c => c.id === p.clientId);
  const email = client ? (client.email || '') : '';

  const totals = calculateProposalTotals(p);
  const currSym = getCurrencySymbol(p.currency);
  const subject = encodeURIComponent(`Teklif Bilgilendirmesi: ${p.number}`);

  const bodyText = `Sayın ${p.clientName || 'Yetkili'},\n\nFiltremiz altında yer alan ${p.number} numaralı teklifimizin özeti aşağıdaki gibidir:\n\nTeklif No: ${p.number}\nToplam Tutar: ${currSym} ${totals.grandTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}\nSon Geçerlilik: ${new Date(p.validUntil).toLocaleDateString('tr-TR')}\n\nTeklif belgesi ekte tarafınıza sunulmuştur.\nİncelemenize sunar, iyi çalışmalar dileriz.`;

  const encodedBody = encodeURIComponent(bodyText);
  const mailtoUrl = `mailto:${email}?subject=${subject}&body=${encodedBody}`;

  if (window.electronAPI && window.electronAPI.openExternal) {
    window.electronAPI.openExternal(mailtoUrl);
  } else {
    window.location.href = mailtoUrl;
  }

  window.showToast('E-posta taslağı açıldı.', 'info');
}

function exportProposalsToExcel() {
  const proposals = window.DB.getProposals();
  if (proposals.length === 0) {
    window.showToast('Aktarılacak teklif bulunamadı.', 'info');
    return;
  }

  const exportData = proposals.map(p => {
    const totals = calculateProposalTotals(p);
    return {
      'Teklif No': p.number,
      'Müşteri / Firma': p.clientName || 'Belirtilmedi',
      'Tarih': p.date,
      'Son Geçerlilik': p.validUntil,
      'Para Birimi': p.currency || 'TRY',
      'Ara Toplam': totals.subtotal,
      'İskonto Tutarı': totals.discountAmount,
      'KDV Tutarı': totals.vatTotal,
      'Genel Toplam': totals.grandTotal,
      'Durum': p.status
    };
  });

  if (window.XLSX) {
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Teklifler');
    XLSX.writeFile(wb, `TeklifMatik_Teklifler_${new Date().toISOString().slice(0, 10)}.xlsx`);
    window.showToast('Teklifler Excel dosyası olarak indirildi.', 'success');
  } else {
    window.showToast('Excel kütüphanesi yüklenemedi.', 'error');
  }
}

function openProposalBuilder(proposalId = null) {
  currentEditingProposalId = proposalId;
  window.currentEditingIsProforma = false;
  const company = window.DB.getCompany();
  const companies = window.DB.getCompanies ? window.DB.getCompanies() : [];
  const clients = window.DB.getClients();
  const catalog = window.DB.getCatalog();

  const companySelect = document.getElementById('builder-company-select');
  if (companySelect) {
    companySelect.innerHTML = companies.map(c => 
      `<option value="${c.id}">${escapeHTML(c.name)} ${c.isDefault ? '(Varsayılan)' : ''}</option>`
    ).join('');
  }

  const clientSelect = document.getElementById('builder-client-select');
  if (clientSelect) {
    clientSelect.innerHTML = `<option value="">-- Müşteri Seçin --</option>` +
      clients.map(c => `<option value="${c.id}">${escapeHTML(c.name)}</option>`).join('');
  }

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
    const p = window.DB.getProposal(proposalId);
    if (!p) return;

    if (titleEl) titleEl.textContent = `Teklif Düzenle: ${p.number}`;
    if (companySelect) companySelect.value = p.companyId || 'comp_1';
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
    if (titleEl) titleEl.textContent = 'Yeni Teklif Oluştur';
    if (companySelect) companySelect.value = 'comp_1';
    
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
  items.forEach((item) => {
    addProposalItemRow(item);
  });
}

function handleCustomItemSearch(inputEl) {
  const container = inputEl.closest('td');
  if (!container) return;

  let dropdown = container.querySelector('.item-autocomplete-dropdown');
  if (!dropdown) {
    dropdown = document.createElement('div');
    dropdown.className = 'item-autocomplete-dropdown';
    container.appendChild(dropdown);
  }

  const query = inputEl.value.trim();
  const catalog = window.DB.getCatalog();

  let matches = [];
  if (query) {
    matches = catalog.filter(c => window.matchSearchPattern(c.title, query));
  } else {
    matches = catalog.slice(0, 30);
  }

  if (matches.length === 0) {
    dropdown.innerHTML = `<div class="item-autocomplete-option" style="color: var(--text-muted); cursor: default;">Katalokta uyumlu kayıt bulunamadı.</div>`;
    dropdown.style.display = 'block';
    return;
  }

  const proposalCurrency = document.getElementById('builder-currency')?.value || 'TRY';

  dropdown.innerHTML = matches.slice(0, 40).map((cat, index) => {
    const isService = cat.type === 'service';
    const typeLabel = isService 
      ? '<span style="color: #c084fc; font-weight: 700; font-size: 0.75rem; margin-right: 6px;">[Hizmet]</span>' 
      : '<span style="color: #38bdf8; font-weight: 700; font-size: 0.75rem; margin-right: 6px;">[Ürün]</span>';
    
    let price = cat.unitPrice || 0;
    const catCurr = cat.currency || 'TRY';
    if (catCurr !== proposalCurrency && window.CurrencyEngine) {
      price = Math.round(window.CurrencyEngine.convert(price, catCurr, proposalCurrency) * 100) / 100;
    }
    const currSym = window.getCurrencySymbol ? window.getCurrencySymbol(proposalCurrency) : '₺';

    return `
      <div class="item-autocomplete-option ${index === 0 ? 'selected' : ''}" data-id="${cat.id}" onmousedown="selectItemFromAutocomplete(this, '${cat.id}')">
        <div style="min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          ${typeLabel}<strong style="font-size: 0.88rem;">${escapeHTML(cat.title)}</strong>
        </div>
        <div style="font-weight: 700; color: #34d399; font-size: 0.9rem; white-space: nowrap; flex-shrink: 0; margin-left: 12px;">${price.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ${currSym}</div>
      </div>
    `;
  }).join('');

  dropdown.style.display = 'block';
}

function selectItemFromAutocomplete(elementInOption, catId) {
  const container = elementInOption.closest('td');
  const inputEl = container ? container.querySelector('.item-title') : null;
  const dropdown = container ? container.querySelector('.item-autocomplete-dropdown') : null;

  if (!inputEl) return;

  const catalog = window.DB.getCatalog();
  const match = catalog.find(c => c.id === catId);

  if (match) {
    inputEl.value = match.title;
    const tr = inputEl.closest('tr');
    if (tr) {
      const proposalCurrency = document.getElementById('builder-currency')?.value || 'TRY';
      const itemCurrency = match.currency || 'TRY';

      let finalPrice = match.unitPrice || 0;
      if (itemCurrency !== proposalCurrency && window.CurrencyEngine) {
        finalPrice = Math.round(window.CurrencyEngine.convert(match.unitPrice, itemCurrency, proposalCurrency) * 100) / 100;
      }

      const unitSelect = tr.querySelector('.item-unit');
      const priceInput = tr.querySelector('.item-price');
      const vatSelect = tr.querySelector('.item-vat');

      if (unitSelect && match.unit) unitSelect.value = match.unit;
      if (priceInput && match.unitPrice !== undefined) priceInput.value = finalPrice;
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

      if (itemCurrency !== proposalCurrency) {
        const fromSym = window.getCurrencySymbol(itemCurrency);
        const toSym = window.getCurrencySymbol(proposalCurrency);
        window.showToast(`"${match.title}" (${match.unitPrice} ${fromSym} ➔ ${finalPrice} ${toSym} kur çevrimi yapıldı).`, 'info');
      }
    }
  }

  if (dropdown) dropdown.style.display = 'none';
  recalculateBuilderTotals();
}

function handleCustomItemKeyDown(event, inputEl) {
  const container = inputEl.closest('td');
  const dropdown = container ? container.querySelector('.item-autocomplete-dropdown') : null;

  if (!dropdown || dropdown.style.display === 'none') return;

  const options = Array.from(dropdown.querySelectorAll('.item-autocomplete-option[data-id]'));
  if (options.length === 0) return;

  let selectedIdx = options.findIndex(opt => opt.classList.contains('selected'));

  if (event.key === 'ArrowDown') {
    event.preventDefault();
    if (selectedIdx >= 0) options[selectedIdx].classList.remove('selected');
    selectedIdx = (selectedIdx + 1) % options.length;
    options[selectedIdx].classList.add('selected');
    options[selectedIdx].scrollIntoView({ block: 'nearest' });
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    if (selectedIdx >= 0) options[selectedIdx].classList.remove('selected');
    selectedIdx = (selectedIdx - 1 + options.length) % options.length;
    options[selectedIdx].classList.add('selected');
    options[selectedIdx].scrollIntoView({ block: 'nearest' });
  } else if (event.key === 'Enter') {
    event.preventDefault();
    if (selectedIdx >= 0) {
      const catId = options[selectedIdx].getAttribute('data-id');
      selectItemFromAutocomplete(options[selectedIdx], catId);
    }
  } else if (event.key === 'Escape') {
    dropdown.style.display = 'none';
  }
}

function addProposalItemRow(data = {}) {
  const container = document.getElementById('builder-items-tbody');
  if (!container) return;

  const tr = document.createElement('tr');
  tr.className = 'item-row';
  
  const detailTr = document.createElement('tr');
  detailTr.className = 'item-detail-row';
  const hasDetail = !!(data.description || data.image);
  detailTr.style.display = hasDetail ? 'table-row' : 'none';
  detailTr.style.background = 'rgba(0, 0, 0, 0.12)';

  tr.innerHTML = `
    <td style="position: relative;">
      <input type="text" class="form-control item-title" autocomplete="off" value="${escapeHTML(data.title || '')}" placeholder="Hizmet veya ürün yazın (jokere * uygundur)..." oninput="handleCustomItemSearch(this); recalculateBuilderTotals()" onfocus="handleCustomItemSearch(this)" onkeydown="handleCustomItemKeyDown(event, this)">
      <div class="item-autocomplete-dropdown"></div>
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
    <td style="width: 110px; text-align: center;">
      <div style="display: flex; gap: 4px; justify-content: center;">
        <button type="button" class="btn btn-secondary btn-sm btn-icon" onclick="moveProposalItemRowUp(this)" title="Yukarı Taşı">
          <i class="ri-arrow-up-line"></i>
        </button>
        <button type="button" class="btn btn-secondary btn-sm btn-icon" onclick="moveProposalItemRowDown(this)" title="Aşağı Taşı">
          <i class="ri-arrow-down-line"></i>
        </button>
        <button type="button" class="btn btn-secondary btn-sm btn-icon" onclick="toggleItemDetail(this)" title="Açıklama & Resim Ekle">
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

function moveProposalItemRowUp(btn) {
  const tr = btn.closest('tr');
  const detailTr = tr ? tr.nextElementSibling : null;
  const prevDetailTr = tr ? tr.previousElementSibling : null;
  const prevTr = prevDetailTr ? prevDetailTr.previousElementSibling : null;

  if (tr && prevTr && prevTr.classList.contains('item-row')) {
    const parent = tr.parentNode;
    parent.insertBefore(tr, prevTr);
    if (detailTr) parent.insertBefore(detailTr, prevTr);
    recalculateBuilderTotals();
  }
}

function moveProposalItemRowDown(btn) {
  const tr = btn.closest('tr');
  const detailTr = tr ? tr.nextElementSibling : null;
  const nextTr = detailTr ? detailTr.nextElementSibling : null;
  const nextDetailTr = nextTr ? nextTr.nextElementSibling : null;

  if (tr && nextTr && nextTr.classList.contains('item-row')) {
    const parent = tr.parentNode;
    if (nextDetailTr) {
      parent.insertBefore(tr, nextDetailTr.nextElementSibling);
      if (detailTr) parent.insertBefore(detailTr, tr.nextElementSibling);
    } else {
      parent.appendChild(tr);
      if (detailTr) parent.appendChild(detailTr);
    }
    recalculateBuilderTotals();
  }
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

function handleItemTitleInput(inputEl, isChange = false) {
  const val = inputEl.value.trim();
  if (!val) {
    updateCatalogDatalist();
    return;
  }

  // Live update datalist with wildcard match
  updateCatalogDatalist(val);

  const catalog = window.DB.getCatalog();
  
  // Exact match or wildcard pattern match
  let match = catalog.find(c => c.title.toLowerCase() === val.toLowerCase());
  
  // If no exact match and user typed wildcard or changed field, find first matching pattern
  if (!match && (val.includes('*') || isChange)) {
    match = catalog.find(c => window.matchSearchPattern(c.title, val));
  }

  if (match) {
    const tr = inputEl.closest('tr');
    if (tr) {
      const proposalCurrency = document.getElementById('builder-currency')?.value || 'TRY';
      const itemCurrency = match.currency || 'TRY';

      let finalPrice = match.unitPrice || 0;
      if (itemCurrency !== proposalCurrency && window.CurrencyEngine) {
        finalPrice = Math.round(window.CurrencyEngine.convert(match.unitPrice, itemCurrency, proposalCurrency) * 100) / 100;
      }

      if (val.includes('*') || (isChange && match.title.toLowerCase() !== val.toLowerCase())) {
        inputEl.value = match.title;
      }

      const unitSelect = tr.querySelector('.item-unit');
      const priceInput = tr.querySelector('.item-price');
      const vatSelect = tr.querySelector('.item-vat');

      if (unitSelect && match.unit) unitSelect.value = match.unit;
      if (priceInput && match.unitPrice !== undefined) priceInput.value = finalPrice;
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

      if (itemCurrency !== proposalCurrency) {
        const fromSym = window.getCurrencySymbol(itemCurrency);
        const toSym = window.getCurrencySymbol(proposalCurrency);
        window.showToast(`"${match.title}" (${match.unitPrice} ${fromSym} ➔ ${finalPrice} ${toSym} kur çevrimi yapıldı).`, 'info');
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
  const search = document.getElementById('catalog-picker-search')?.value || '';

  const filtered = catalog.filter(c => window.matchSearchPattern(c.title, search));
  const tbody = document.getElementById('catalog-picker-tbody');
  if (!tbody) return;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 24px;">Ürün bulunamadı.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(item => {
    const isService = item.type === 'service';
    const typeBadge = isService 
      ? `<span class="badge" style="background: rgba(139, 92, 246, 0.15); color: #a78bfa; border: 1px solid rgba(139, 92, 246, 0.3);">Hizmet</span>`
      : `<span class="badge" style="background: rgba(14, 165, 233, 0.15); color: #38bdf8; border: 1px solid rgba(14, 165, 233, 0.3);">Ürün</span>`;
    const currSym = window.getCurrencySymbol ? window.getCurrencySymbol(item.currency || 'TRY') : '₺';

    return `
      <tr>
        <td>
          <div style="display: flex; align-items: center; gap: 8px;">
            ${typeBadge}
            <strong>${escapeHTML(item.title)}</strong>
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
  const companyId = document.getElementById('builder-company-select')?.value || 'comp_1';
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
    companyId,
    clientId,
    clientName,
    date,
    validUntil,
    currency,
    status,
    discountRate,
    terms,
    isProforma: window.currentEditingIsProforma || false,
    items
  };

  const saved = window.DB.saveProposal(proposalObj);
  const docType = window.currentEditingIsProforma ? 'Proforma Fatura' : 'Teklif';
  window.showToast(`${docType} başarıyla kaydedildi: ${saved.number}`, 'success');

  renderProposalsList();
  if (window.renderProformasList) window.renderProformasList();
  if (window.renderDashboard) window.renderDashboard();
  switchTab(window.currentEditingIsProforma ? 'view-proformas-list' : 'view-proposals-list');
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
  if (window.renderDashboard) window.renderDashboard();
}

function confirmDeleteProposal(id) {
  const p = window.DB.getProposal(id);
  if (!p) return;

  if (confirm(`"${p.number}" teklifini silmek istediğinize emin misiniz?`)) {
    window.DB.deleteProposal(id);
    window.showToast('Teklif silindi.', 'info');
    renderProposalsList();
    if (window.renderDashboard) window.renderDashboard();
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
window.moveProposalItemRowUp = moveProposalItemRowUp;
window.moveProposalItemRowDown = moveProposalItemRowDown;
window.recalculateBuilderTotals = recalculateBuilderTotals;
window.saveCurrentProposal = saveCurrentProposal;
window.editProposal = editProposal;
window.duplicateProposal = duplicateProposal;
window.confirmDeleteProposal = confirmDeleteProposal;
window.toggleItemDetail = toggleItemDetail;
window.handleRowImageUpload = handleRowImageUpload;
window.removeRowImage = removeRowImage;
window.quickChangeProposalStatus = quickChangeProposalStatus;
window.shareProposalWhatsApp = shareProposalWhatsApp;
window.shareProposalEmail = shareProposalEmail;
window.exportProposalsToExcel = exportProposalsToExcel;
