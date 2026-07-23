/**
 * Clients View Controller
 */

let editingClientId = null;

function renderClientsList() {
  const clients = window.DB.getClients();
  const search = document.getElementById('client-search-input')?.value || '';

  const filtered = clients.filter(c => 
    window.matchSearchPattern(c.name, search) || 
    window.matchSearchPattern(c.contactPerson, search) ||
    window.matchSearchPattern(c.taxNo, search)
  );

  const tbody = document.getElementById('clients-table-tbody');
  if (!tbody) return;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 32px;">Kayıtlı müşteri bulunamadı.</td></tr>`;
    return;
  }

  const proposals = window.DB.getProposals();

  tbody.innerHTML = filtered.map(c => {
    const clientProposals = proposals.filter(p => p.clientId === c.id);
    const clientProposalsCount = clientProposals.length;

    return `
      <tr>
        <td><strong>${escapeHTML(c.name)}</strong></td>
        <td>${escapeHTML(c.contactPerson || '-')}</td>
        <td>${escapeHTML(c.phone || '-')}</td>
        <td>${escapeHTML(c.email || '-')}</td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="viewClientHistoryModal('${c.id}')">
            <i class="ri-history-line"></i> ${clientProposalsCount} Teklif
          </button>
        </td>
        <td>
          <div style="display: flex; gap: 6px;">
            <button class="btn btn-secondary btn-sm btn-icon" onclick="openClientModal('${c.id}')" title="Düzenle">
              <i class="ri-edit-line"></i>
            </button>
            <button class="btn btn-danger btn-sm btn-icon" onclick="confirmDeleteClient('${c.id}')" title="Sil">
              <i class="ri-delete-bin-line"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function viewClientHistoryModal(clientId) {
  const clients = window.DB.getClients();
  const client = clients.find(c => c.id === clientId);
  if (!client) return;

  const proposals = window.DB.getProposals().filter(p => p.clientId === clientId);

  const modal = document.getElementById('client-history-modal');
  const title = document.getElementById('client-history-title');
  const body = document.getElementById('client-history-body');

  if (title) title.textContent = `Müşteri Geçmişi: ${client.name}`;

  if (body) {
    if (proposals.length === 0) {
      body.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 24px;">Bu müşteriye ait henüz hiç teklif bulunmuyor.</div>`;
    } else {
      let totalApprovedVal = 0;
      const rowsHTML = proposals.map(p => {
        const totals = calculateProposalTotals(p);
        if (p.status === 'approved' || p.status === 'invoiced') {
          totalApprovedVal += totals.grandTotal;
        }
        const currSym = getCurrencySymbol(p.currency);
        return `
          <tr>
            <td><strong>${p.number}</strong></td>
            <td>${new Date(p.date).toLocaleDateString('tr-TR')}</td>
            <td><strong>${currSym} ${totals.grandTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</strong></td>
            <td>${getStatusBadgeHTML(p.status)}</td>
            <td style="text-align: right;">
              <button class="btn btn-secondary btn-sm btn-icon" onclick="closeClientHistoryModal(); viewProposalPDF('${p.id}');" title="PDF Görüntüle">
                <i class="ri-file-pdf-line"></i>
              </button>
            </td>
          </tr>
        `;
      }).join('');

      body.innerHTML = `
        <div style="margin-bottom: 16px; padding: 12px; background: rgba(59, 130, 246, 0.1); border-left: 4px solid var(--primary-color); border-radius: 4px;">
          <div style="font-size: 0.85rem; color: var(--text-muted);">Onaylanan / Faturalandırılan Toplam Hacim:</div>
          <div style="font-size: 1.25rem; font-weight: 700; color: var(--primary-color);">
            ${totalApprovedVal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
          </div>
        </div>
        <table class="data-table">
          <thead>
            <tr>
              <th>Teklif No</th>
              <th>Tarih</th>
              <th>Tutar</th>
              <th>Durum</th>
              <th style="text-align: right;">İşlem</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHTML}
          </tbody>
        </table>
      `;
    }
  }

  modal?.classList.add('active');
}

function closeClientHistoryModal() {
  document.getElementById('client-history-modal')?.classList.remove('active');
}

function exportClientsToExcel() {
  const clients = window.DB.getClients();
  if (clients.length === 0) {
    window.showToast('Aktarılacak müşteri bulunamadı.', 'info');
    return;
  }

  const exportData = clients.map(c => ({
    'Firma / Müşteri Adı': c.name,
    'Yetkili Kişi': c.contactPerson || '',
    'Telefon': c.phone || '',
    'E-posta': c.email || '',
    'Vergi Dairesi': c.taxOffice || '',
    'Vergi No': c.taxNo || '',
    'Adres': c.address || ''
  }));

  if (window.XLSX) {
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Müşteriler');
    XLSX.writeFile(wb, `TeklifMatik_Musteriler_${new Date().toISOString().slice(0, 10)}.xlsx`);
    window.showToast('Müşteriler Excel dosyası olarak indirildi.', 'success');
  } else {
    window.showToast('Excel kütüphanesi yüklenemedi.', 'error');
  }
}

function openClientModal(id = null) {
  editingClientId = id;
  const modal = document.getElementById('client-modal');
  const title = document.getElementById('client-modal-title');

  if (id) {
    const clients = window.DB.getClients();
    const c = clients.find(item => item.id === id);
    if (!c) return;

    if (title) title.textContent = 'Müşteri Düzenle';
    document.getElementById('modal-client-name').value = c.name || '';
    document.getElementById('modal-client-contact').value = c.contactPerson || '';
    document.getElementById('modal-client-phone').value = c.phone || '';
    document.getElementById('modal-client-email').value = c.email || '';
    document.getElementById('modal-client-tax-office').value = c.taxOffice || '';
    document.getElementById('modal-client-tax-no').value = c.taxNo || '';
    document.getElementById('modal-client-address').value = c.address || '';
  } else {
    if (title) title.textContent = 'Yeni Müşteri Ekle';
    document.getElementById('modal-client-name').value = '';
    document.getElementById('modal-client-contact').value = '';
    document.getElementById('modal-client-phone').value = '';
    document.getElementById('modal-client-email').value = '';
    document.getElementById('modal-client-tax-office').value = '';
    document.getElementById('modal-client-tax-no').value = '';
    document.getElementById('modal-client-address').value = '';
  }

  modal?.classList.add('active');
}

function closeClientModal() {
  document.getElementById('client-modal')?.classList.remove('active');
}

function saveClientForm() {
  const name = document.getElementById('modal-client-name').value.trim();
  if (!name) {
    window.showToast('Lütfen müşteri / firma adını girin.', 'error');
    return;
  }

  const clientData = {
    id: editingClientId || undefined,
    name,
    contactPerson: document.getElementById('modal-client-contact').value.trim(),
    phone: document.getElementById('modal-client-phone').value.trim(),
    email: document.getElementById('modal-client-email').value.trim(),
    taxOffice: document.getElementById('modal-client-tax-office').value.trim(),
    taxNo: document.getElementById('modal-client-tax-no').value.trim(),
    address: document.getElementById('modal-client-address').value.trim()
  };

  window.DB.saveClient(clientData);
  window.showToast('Müşteri kaydedildi.', 'success');
  closeClientModal();
  renderClientsList();
}

function confirmDeleteClient(id) {
  const clients = window.DB.getClients();
  const c = clients.find(item => item.id === id);
  if (!c) return;

  if (confirm(`"${c.name}" müşterisini silmek istediğinize emin misiniz?`)) {
    window.DB.deleteClient(id);
    window.showToast('Müşteri silindi.', 'info');
    renderClientsList();
  }
}

window.renderClientsList = renderClientsList;
window.openClientModal = openClientModal;
window.closeClientModal = closeClientModal;
window.saveClientForm = saveClientForm;
window.confirmDeleteClient = confirmDeleteClient;
window.exportClientsToExcel = exportClientsToExcel;
window.viewClientHistoryModal = viewClientHistoryModal;
window.closeClientHistoryModal = closeClientHistoryModal;
