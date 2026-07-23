/**
 * Proforma Invoices Controller & Management Engine
 */

let currentEditingProformaId = null;

function updateProformaCompanyFilterDropdown() {
  const filterSelect = document.getElementById('proforma-company-filter');
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

function renderProformasList() {
  updateProformaCompanyFilterDropdown();
  const proformas = window.DB.getProformas();
  const search = (document.getElementById('proforma-search-input')?.value || '').trim();
  const statusFilter = document.getElementById('proforma-status-filter')?.value || 'all';
  const companyFilter = document.getElementById('proforma-company-filter')?.value || 'all';

  // 1. Sort: Newest to Oldest (DESC)
  const sorted = [...proformas].sort((a, b) => {
    const dateA = new Date(a.date || a.createdAt || 0).getTime();
    const dateB = new Date(b.date || b.createdAt || 0).getTime();
    if (dateB !== dateA) return dateB - dateA;
    const idA = parseInt(String(a.id).replace(/\D/g, '')) || 0;
    const idB = parseInt(String(b.id).replace(/\D/g, '')) || 0;
    return idB - idA;
  });

  // Calculate Metrics
  const totalCount = sorted.length;
  const pendingCount = sorted.filter(p => p.status === 'sent' || p.status === 'draft').length;
  const approvedCount = sorted.filter(p => p.status === 'approved' || p.status === 'invoiced').length;

  let totalTryValue = 0;
  sorted.forEach(p => {
    const totals = window.calculateProposalTotals ? window.calculateProposalTotals(p) : { grandTotal: 0 };
    const curr = p.currency || 'TRY';
    if (curr === 'TRY') {
      totalTryValue += totals.grandTotal;
    } else if (window.CurrencyEngine) {
      totalTryValue += window.CurrencyEngine.convert(totals.grandTotal, curr, 'TRY');
    }
  });

  if (document.getElementById('proforma-stat-total')) document.getElementById('proforma-stat-total').textContent = totalCount;
  if (document.getElementById('proforma-stat-pending')) document.getElementById('proforma-stat-pending').textContent = pendingCount;
  if (document.getElementById('proforma-stat-approved')) document.getElementById('proforma-stat-approved').textContent = approvedCount;
  if (document.getElementById('proforma-stat-value')) document.getElementById('proforma-stat-value').textContent = `${Math.round(totalTryValue).toLocaleString('tr-TR')} ₺`;

  // Filtering
  const isFiltered = search !== '' || statusFilter !== 'all' || companyFilter !== 'all';
  let filtered = sorted.filter(p => {
    const matchSearch = window.matchSearchPattern(p.number, search) || 
                        window.matchSearchPattern(p.clientName, search);
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    const pCompId = p.companyId || 'comp_1';
    const matchCompany = companyFilter === 'all' || pCompId === companyFilter;
    return matchSearch && matchStatus && matchCompany;
  });

  if (!isFiltered && filtered.length > 100) {
    filtered = filtered.slice(0, 100);
  }

  const tbody = document.getElementById('proformas-table-tbody');
  if (!tbody) return;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 32px;">Kriterlere uygun proforma fatura bulunamadı.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(p => {
    const totals = window.calculateProposalTotals ? window.calculateProposalTotals(p) : { grandTotal: 0 };
    const dateStr = new Date(p.date).toLocaleDateString('tr-TR');
    const validUntilStr = new Date(p.validUntil).toLocaleDateString('tr-TR');
    const currSymbol = window.getCurrencySymbol ? window.getCurrencySymbol(p.currency) : '₺';
    const compObj = window.DB.getCompany(p.companyId);
    const compBadge = `<span class="badge" style="background: rgba(255,255,255,0.06); border: 1px solid var(--border-color); font-size: 0.72rem;">${escapeHTML(compObj.name.substring(0, 18))}...</span>`;

    const statusSelectHTML = `
      <select class="form-control form-control-sm quick-status-select" style="width: auto; padding: 4px 8px; font-size: 0.78rem; font-weight: 600;" onchange="quickChangeProformaStatus('${p.id}', this.value)">
        <option value="draft" ${p.status === 'draft' ? 'selected' : ''}>Taslak</option>
        <option value="sent" ${p.status === 'sent' ? 'selected' : ''}>Gönderildi</option>
        <option value="approved" ${p.status === 'approved' ? 'selected' : ''}>Onaylandı</option>
        <option value="rejected" ${p.status === 'rejected' ? 'selected' : ''}>Reddedildi</option>
        <option value="invoiced" ${p.status === 'invoiced' ? 'selected' : ''}>Faturalandı</option>
      </select>
    `;

    return `
      <tr>
        <td><strong style="color: #38bdf8;">${p.number}</strong></td>
        <td>${escapeHTML(p.clientName || 'Belirtilmedi')}</td>
        <td>${compBadge}</td>
        <td>${dateStr}</td>
        <td>${validUntilStr}</td>
        <td><strong>${currSymbol} ${totals.grandTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</strong></td>
        <td>${statusSelectHTML}</td>
        <td>
          <div style="display: flex; gap: 4px; flex-wrap: nowrap;">
            <button class="btn btn-secondary btn-sm btn-icon" onclick="viewProposalPDF('${p.id}')" title="PDF / Yazdır">
              <i class="ri-file-pdf-line"></i>
            </button>
            <button class="btn btn-secondary btn-sm btn-icon" onclick="editProforma('${p.id}')" title="Düzenle">
              <i class="ri-edit-line"></i>
            </button>
            <button class="btn btn-secondary btn-sm btn-icon" onclick="convertProformaToProposal('${p.id}')" title="Teklife Dönüştür" style="color: #a78bfa;">
              <i class="ri-exchange-line"></i>
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

function quickChangeProformaStatus(id, newStatus) {
  window.DB.updateProposalStatus(id, newStatus);
  window.showToast('Proforma durumu güncellendi.', 'success');
  renderProformasList();
}

function openProformaBuilder(proformaId = null) {
  window.openProposalBuilder(proformaId);
  
  // Set as Proforma
  const numberInput = document.getElementById('builder-proposal-number');
  if (!proformaId && numberInput) {
    const existing = window.DB.getProformas();
    const count = existing.length + 1;
    const year = new Date().getFullYear();
    numberInput.value = `PRF-${year}-${String(count).padStart(3, '0')}`;
  }

  const titleEl = document.getElementById('builder-title');
  if (titleEl && !proformaId) {
    titleEl.textContent = 'Yeni Proforma Fatura Oluştur';
  }
  
  // Tag current editing as proforma
  window.currentEditingIsProforma = true;
}

function editProforma(id) {
  window.openProposalBuilder(id);
  window.currentEditingIsProforma = true;
}

function convertProposalToProforma(id) {
  const p = window.DB.getProposal(id);
  if (!p) return;

  p.isProforma = true;
  if (!p.number.startsWith('PRF-')) {
    const year = new Date().getFullYear();
    const count = window.DB.getProformas().length + 1;
    p.number = `PRF-${year}-${String(count).padStart(3, '0')}`;
  }
  window.DB.saveProposal(p);
  window.showToast(`${p.number} proforma faturaya dönüştürüldü.`, 'success');
  if (window.renderProposalsList) window.renderProposalsList();
  renderProformasList();
}

function convertProformaToProposal(id) {
  const p = window.DB.getProposal(id);
  if (!p) return;

  p.isProforma = false;
  if (p.number.startsWith('PRF-')) {
    const year = new Date().getFullYear();
    const count = window.DB.getProposals().length + 1;
    p.number = `TKL-${year}-${String(count).padStart(3, '0')}`;
  }
  window.DB.saveProposal(p);
  window.showToast(`${p.number} teklife dönüştürüldü.`, 'success');
  if (window.renderProposalsList) window.renderProposalsList();
  renderProformasList();
}

function exportProformasToExcel() {
  const proformas = window.DB.getProformas();
  if (proformas.length === 0) {
    window.showToast('İndirilecek proforma faturası bulunamadı.', 'warning');
    return;
  }

  const rows = proformas.map(p => {
    const totals = window.calculateProposalTotals ? window.calculateProposalTotals(p) : { grandTotal: 0 };
    return {
      'Proforma No': p.number,
      'Müşteri Adı': p.clientName || 'Belirtilmedi',
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

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Proforma Faturalar");
  XLSX.writeFile(wb, `Proforma_Faturalar_${new Date().toISOString().slice(0,10)}.xlsx`);
  window.showToast('Proforma fatura listesi Excel olarak indirildi.', 'success');
}

window.renderProformasList = renderProformasList;
window.openProformaBuilder = openProformaBuilder;
window.editProforma = editProforma;
window.quickChangeProformaStatus = quickChangeProformaStatus;
window.convertProposalToProforma = convertProposalToProforma;
window.convertProformaToProposal = convertProformaToProposal;
window.exportProformasToExcel = exportProformasToExcel;
