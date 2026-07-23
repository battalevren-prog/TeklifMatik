/**
 * Dashboard View Controller
 */

function renderDashboard() {
  const proposals = window.DB.getProposals();

  const totalCount = proposals.length;
  const pendingCount = proposals.filter(p => p.status === 'sent' || p.status === 'draft').length;
  const approvedCount = proposals.filter(p => p.status === 'approved' || p.status === 'invoiced').length;

  // Currency totals calculation
  const currencyTotals = { TRY: 0, USD: 0, EUR: 0, GBP: 0 };

  proposals.forEach(p => {
    const totals = calculateProposalTotals(p);
    const curr = p.currency || 'TRY';
    if (currencyTotals[curr] !== undefined) {
      currencyTotals[curr] += totals.grandTotal;
    }
  });

  // Render metric cards
  document.getElementById('stat-total-count').textContent = totalCount;
  document.getElementById('stat-pending-count').textContent = pendingCount;
  document.getElementById('stat-approved-count').textContent = approvedCount;
  
  // Format total currency display
  const tryFormatted = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(currencyTotals.TRY);
  document.getElementById('stat-total-value').textContent = tryFormatted;

  // Render Recent Proposals Table
  const tbody = document.getElementById('recent-proposals-tbody');
  if (!tbody) return;

  if (proposals.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 24px;">Henüz teklif oluşturulmadı.</td></tr>`;
    return;
  }

  const sorted = [...proposals].sort((a, b) => {
    const dateA = new Date(a.date || a.createdAt || 0).getTime();
    const dateB = new Date(b.date || b.createdAt || 0).getTime();
    if (dateB !== dateA) return dateB - dateA;
    const idA = parseInt(String(a.id).replace(/\D/g, '')) || 0;
    const idB = parseInt(String(b.id).replace(/\D/g, '')) || 0;
    return idB - idA;
  });

  const recent = sorted.slice(0, 5);
  tbody.innerHTML = recent.map(p => {
    const totals = calculateProposalTotals(p);
    const formattedDate = new Date(p.date).toLocaleDateString('tr-TR');
    const currSymbol = getCurrencySymbol(p.currency);
    const statusBadge = getStatusBadgeHTML(p.status);

    return `
      <tr>
        <td><strong>${p.number}</strong></td>
        <td>${escapeHTML(p.clientName || 'Belirtilmedi')}</td>
        <td>${formattedDate}</td>
        <td><strong>${currSymbol} ${totals.grandTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</strong></td>
        <td>${statusBadge}</td>
        <td>
          <div style="display: flex; gap: 6px;">
            <button class="btn btn-secondary btn-sm btn-icon" onclick="viewProposalPDF('${p.id}')" title="Önizle / PDF">
              <i class="ri-file-pdf-line"></i>
            </button>
            <button class="btn btn-secondary btn-sm btn-icon" onclick="editProposal('${p.id}')" title="Düzenle">
              <i class="ri-edit-line"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function calculateProposalTotals(proposal) {
  let subtotal = 0;
  let vatTotal = 0;

  if (proposal.items && Array.isArray(proposal.items)) {
    proposal.items.forEach(item => {
      const lineSub = (item.quantity || 0) * (item.unitPrice || 0);
      const lineVat = lineSub * ((item.vatRate || 0) / 100);
      subtotal += lineSub;
      vatTotal += lineVat;
    });
  }

  const discountRate = proposal.discountRate || 0;
  const discountAmount = subtotal * (discountRate / 100);
  const subtotalAfterDiscount = subtotal - discountAmount;
  
  // Re-calculate VAT on discounted base if discount is applied
  const finalVat = subtotal > 0 ? vatTotal * (subtotalAfterDiscount / subtotal) : 0;
  const grandTotal = subtotalAfterDiscount + finalVat;

  return {
    subtotal,
    discountAmount,
    subtotalAfterDiscount,
    vatTotal: finalVat,
    grandTotal
  };
}

function getCurrencySymbol(curr) {
  switch (curr) {
    case 'USD': return '$';
    case 'EUR': return '€';
    case 'GBP': return '£';
    default: return '₺';
  }
}

function getStatusBadgeHTML(status) {
  switch (status) {
    case 'draft':
      return `<span class="badge badge-draft"><i class="ri-draft-line"></i> Taslak</span>`;
    case 'sent':
      return `<span class="badge badge-sent"><i class="ri-send-plane-line"></i> Gönderildi</span>`;
    case 'approved':
      return `<span class="badge badge-approved"><i class="ri-checkbox-circle-line"></i> Onaylandı</span>`;
    case 'rejected':
      return `<span class="badge badge-rejected"><i class="ri-close-circle-line"></i> Reddedildi</span>`;
    case 'invoiced':
      return `<span class="badge badge-invoiced"><i class="ri-file-text-line"></i> Faturalandı</span>`;
    default:
      return `<span class="badge badge-draft">${status}</span>`;
  }
}

function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}

window.renderDashboard = renderDashboard;
window.calculateProposalTotals = calculateProposalTotals;
window.getCurrencySymbol = getCurrencySymbol;
window.getStatusBadgeHTML = getStatusBadgeHTML;
window.escapeHTML = escapeHTML;
