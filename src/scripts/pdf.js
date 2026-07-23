/**
 * PDF Preview & Export View Controller
 */

let activePreviewProposalId = null;

function viewProposalPDF(proposalId) {
  activePreviewProposalId = proposalId;
  const p = window.DB.getProposal(proposalId);
  if (!p) return;

  const company = window.DB.getCompany();
  const clients = window.DB.getClients();
  const client = clients.find(c => c.id === p.clientId) || {
    name: p.clientName || 'Müşteri Belirtilmedi',
    taxOffice: '',
    taxNo: '',
    address: '',
    phone: '',
    email: ''
  };

  const container = document.getElementById('pdf-document-container');
  if (!container) return;

  const totals = calculateProposalTotals(p);
  const currSymbol = getCurrencySymbol(p.currency);

  const dateStr = new Date(p.date).toLocaleDateString('tr-TR');
  const validUntilStr = new Date(p.validUntil).toLocaleDateString('tr-TR');

  // Set accent color variable dynamically
  const accentColor = company.pdfAccentColor || '#3b82f6';
  container.style.setProperty('--pdf-accent', accentColor);

  // Logo or Company Title
  let logoHTML = '';
  if (company.logo) {
    logoHTML = `<img src="${company.logo}" class="pdf-logo" alt="${escapeHTML(company.name)}">`;
  }

  // Items table rows
  const itemRowsHTML = (p.items || []).map((item, idx) => {
    const qty = item.quantity || 1;
    const price = item.unitPrice || 0;
    const lineSub = qty * price;
    const vatRate = item.vatRate || 0;

    const imgHTML = item.image 
      ? `<img src="${item.image}" style="width: 48px; height: 48px; object-fit: cover; border-radius: 4px; border: 1px solid #cbd5e1; flex-shrink: 0;">`
      : '';

    const descHTML = item.description 
      ? `<div style="font-size: 11px; color: #475569; margin-top: 3px; white-space: pre-line; line-height: 1.3;">${escapeHTML(item.description)}</div>`
      : '';

    return `
      <tr>
        <td class="text-center" style="width: 30px; vertical-align: top;">${idx + 1}</td>
        <td style="vertical-align: top;">
          <div style="display: flex; gap: 10px; align-items: flex-start;">
            ${imgHTML}
            <div style="flex: 1;">
              <strong>${escapeHTML(item.title)}</strong>
              ${descHTML}
            </div>
          </div>
        </td>
        <td class="text-center" style="width: 70px; vertical-align: top;">${qty} ${escapeHTML(item.unit || 'Adet')}</td>
        <td class="text-right" style="width: 100px; vertical-align: top;">${currSymbol} ${price.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</td>
        <td class="text-center" style="width: 60px; vertical-align: top;">%${vatRate}</td>
        <td class="text-right" style="width: 110px; vertical-align: top;"><strong>${currSymbol} ${lineSub.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</strong></td>
      </tr>
    `;
  }).join('');

  container.innerHTML = `
    <div class="pdf-document">
      <div>
        <!-- PDF Header -->
        <div class="pdf-header">
          <div class="pdf-company-info">
            ${logoHTML}
            <div class="pdf-company-title">${escapeHTML(company.name)}</div>
            <div class="pdf-company-sub">${escapeHTML(company.subTitle || '')}</div>
            <div style="font-size: 11.5px; color: #475569; margin-top: 6px;">
              ${escapeHTML(company.address || '')}<br>
              Tel: ${escapeHTML(company.phone || '')} | ${escapeHTML(company.email || '')}
              ${company.taxNo ? `<br>Vergi Dairesi: ${escapeHTML(company.taxOffice || '')} - No: ${escapeHTML(company.taxNo)}` : ''}
            </div>
          </div>
          <div class="pdf-meta-box">
            <div class="pdf-proposal-badge">TEKLİF</div>
            <div class="pdf-meta-row"><strong>Teklif No:</strong> ${p.number}</div>
            <div class="pdf-meta-row"><strong>Tarih:</strong> ${dateStr}</div>
            <div class="pdf-meta-row"><strong>Geçerlilik:</strong> ${validUntilStr}</div>
            <div class="pdf-meta-row"><strong>Para Birimi:</strong> ${p.currency || 'TRY'}</div>
          </div>
        </div>

        <!-- Client Section -->
        <div class="pdf-client-section">
          <div class="pdf-client-box">
            <h4>TEKLİF SUNULAN MÜŞTERİ / FİRMA</h4>
            <div class="pdf-client-name">${escapeHTML(client.name)}</div>
            <div class="pdf-client-details">
              ${client.contactPerson ? `<strong>Yetkili:</strong> ${escapeHTML(client.contactPerson)}<br>` : ''}
              ${client.address ? `${escapeHTML(client.address)}<br>` : ''}
              ${client.phone ? `Tel: ${escapeHTML(client.phone)} ` : ''} ${client.email ? `| E-posta: ${escapeHTML(client.email)}` : ''}
              ${client.taxNo ? `<br>Vergi D.: ${escapeHTML(client.taxOffice || '')} - V.No: ${escapeHTML(client.taxNo)}` : ''}
            </div>
          </div>
        </div>

        <!-- Items Table -->
        <table class="pdf-items-table">
          <thead>
            <tr>
              <th class="text-center">#</th>
              <th>HİZMET / ÜRÜN AÇIKLAMASI</th>
              <th class="text-center">MİKTAR</th>
              <th class="text-right">BİRİM FİYAT</th>
              <th class="text-center">KDV</th>
              <th class="text-right">TOPLAM</th>
            </tr>
          </thead>
          <tbody>
            ${itemRowsHTML}
          </tbody>
        </table>

        <!-- Totals Table -->
        <div class="pdf-totals-container">
          <table class="pdf-totals-table">
            <tr>
              <td>Ara Toplam:</td>
              <td class="text-right">${currSymbol} ${totals.subtotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</td>
            </tr>
            ${totals.discountAmount > 0 ? `
              <tr>
                <td>İskonto (%${p.discountRate}):</td>
                <td class="text-right" style="color: #ef4444;">- ${currSymbol} ${totals.discountAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</td>
              </tr>
            ` : ''}
            <tr>
              <td>KDV Toplamı:</td>
              <td class="text-right">${currSymbol} ${totals.vatTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</td>
            </tr>
            <tr class="total-row">
              <td>GENEL TOPLAM:</td>
              <td class="text-right">${currSymbol} ${totals.grandTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</td>
            </tr>
          </table>
        </div>

        <!-- Notes & Bank Info -->
        ${(p.terms || company.iban) ? `
          <div class="pdf-notes-section">
            <div class="pdf-notes-title">TEKLİF KOŞULLARI VE ÖDEME BİLGİLERİ</div>
            <div class="pdf-notes-content">${escapeHTML(p.terms || '')}</div>
            ${company.iban ? `<div class="pdf-notes-content" style="margin-top: 8px; font-weight: 600;">Banka IBAN: ${escapeHTML(company.iban)}</div>` : ''}
          </div>
        ` : ''}
      </div>

      <!-- Signature & Footer -->
      <div class="pdf-footer">
        <div>
          Bu teklif belgesi TeklifMatik ile dijital olarak oluşturulmuştur.
        </div>
        <div class="pdf-signature-box">
          <div class="pdf-signature-line"></div>
          <strong>Teklif Veren Kaşe / İmza</strong>
        </div>
      </div>
    </div>
  `;

  document.getElementById('pdf-preview-title').textContent = `Teklif Önizleme: ${p.number}`;
  switchTab('view-pdf-preview');
}

async function downloadProposalPDF() {
  const p = window.DB.getProposal(activePreviewProposalId);
  const filename = p ? `${p.number}_Teklif.pdf` : 'Teklif.pdf';

  if (window.electronAPI && window.electronAPI.printToPDF) {
    const res = await window.electronAPI.printToPDF(filename);
    if (res.success) {
      window.showToast(`PDF kaydedildi: ${res.filePath}`, 'success');
    } else if (!res.cancelled) {
      window.showToast(`PDF hatası: ${res.error}`, 'error');
    }
  } else {
    // Web fallback
    window.print();
  }
}

function printProposal() {
  window.print();
}

window.viewProposalPDF = viewProposalPDF;
window.downloadProposalPDF = downloadProposalPDF;
window.printProposal = printProposal;
