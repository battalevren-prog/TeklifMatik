/**
 * Clients View Controller
 */

let editingClientId = null;

function renderClientsList() {
  const clients = window.DB.getClients();
  const search = (document.getElementById('client-search-input')?.value || '').toLowerCase();

  const filtered = clients.filter(c => 
    c.name.toLowerCase().includes(search) || 
    (c.contactPerson || '').toLowerCase().includes(search) ||
    (c.taxNo || '').includes(search)
  );

  const tbody = document.getElementById('clients-table-tbody');
  if (!tbody) return;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 32px;">Kayıtlı müşteri bulunamadı.</td></tr>`;
    return;
  }

  const proposals = window.DB.getProposals();

  tbody.innerHTML = filtered.map(c => {
    const clientProposalsCount = proposals.filter(p => p.clientId === c.id).length;

    return `
      <tr>
        <td><strong>${escapeHTML(c.name)}</strong></td>
        <td>${escapeHTML(c.contactPerson || '-')}</td>
        <td>${escapeHTML(c.phone || '-')}</td>
        <td>${escapeHTML(c.email || '-')}</td>
        <td><span class="badge badge-draft">${clientProposalsCount} Teklif</span></td>
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

  modal.classList.add('active');
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
