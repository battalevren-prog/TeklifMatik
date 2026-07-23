/**
 * PDF Preview & Multi-Template Export Controller
 */

let activePreviewProposalId = null;
let currentPdfTemplate = 'modern'; // modern, minimalist, executive
let currentPdfShowWatermark = true;
let currentPdfConvertToTRY = false;

/**
 * Builds a TRY conversion summary HTML block for use inside PDF templates.
 * Returns empty string when conversion is disabled or currency is already TRY.
 */
function buildTRYConversionHTML(p, totals) {
  if (!currentPdfConvertToTRY) return '';
  const currency = p.currency || 'TRY';
  if (currency === 'TRY') return '';

  const rates = (window.CurrencyEngine && window.CurrencyEngine.cachedRates) || {};
  const rateToTRY = rates[currency];
  if (!rateToTRY || rateToTRY <= 0) {
    return `<tr><td colspan="2" style="padding: 8px; font-size: 10px; color: #92400e; background: rgba(245,158,11,0.08); border-top: 1px dashed #f59e0b;">
      &#9888; TL kar&#351;&#305;l&#305;&#287;&#305; i&#231;in Kur G&#252;ncelle butonuna bas&#305;n.
    </td></tr>`;
  }

  const rateDate = (window.CurrencyEngine && window.CurrencyEngine.lastFetchedDate) || '';
  const grandTotalTRY = totals.grandTotal * rateToTRY;

  return `
    <tr style="background: rgba(59,130,246,0.05); border-top: 1px solid rgba(59,130,246,0.2);">
      <td style="padding: 7px 10px; font-size: 10px; color: #475569;">
        &#8378; TL Kar&#351;&#305;l&#305;&#287;&#305;
        <span style="color: #94a3b8; font-size: 9.5px;">&nbsp;(1 ${currency} = ${rateToTRY.toLocaleString('tr-TR', { minimumFractionDigits: 4 })} &#8378;${rateDate ? ' &middot; ' + rateDate : ''})</span>
      </td>
      <td class="text-right" style="padding: 7px 10px; font-size: 12px; font-weight: 700; color: #1e40af; white-space: nowrap;">
        &#8378; ${grandTotalTRY.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
      </td>
    </tr>`;
}


function viewProposalPDF(proposalId) {
  activePreviewProposalId = proposalId;
  const p = window.DB.getProposal(proposalId);
  if (!p) return;

  const company = window.DB.getCompany(p.companyId);
  if (company.pdfTemplate) {
    currentPdfTemplate = company.pdfTemplate;
  }
  if (company.pdfShowWatermark !== undefined) {
    currentPdfShowWatermark = company.pdfShowWatermark;
  }

  // Update UI Selectors if present
  const templateSelect = document.getElementById('pdf-template-select');
  if (templateSelect) templateSelect.value = currentPdfTemplate;

  const watermarkCheckbox = document.getElementById('pdf-watermark-toggle');
  if (watermarkCheckbox) watermarkCheckbox.checked = currentPdfShowWatermark;

  renderPDFDocument();
  document.getElementById('pdf-preview-title').textContent = `Teklif Önizleme: ${p.number}`;
  switchTab('view-pdf-preview');
}

function setPdfTemplate(templateName) {
  currentPdfTemplate = templateName;
  renderPDFDocument();
}

function setPdfWatermarkToggle(show) {
  currentPdfShowWatermark = show;
  renderPDFDocument();
}

function setPdfConvertToTRY(enabled) {
  currentPdfConvertToTRY = enabled;
  renderPDFDocument();
}

function renderPDFDocument() {
  if (!activePreviewProposalId) return;

  const p = window.DB.getProposal(activePreviewProposalId);
  if (!p) return;

  const company = window.DB.getCompany(p.companyId);
  const clients = window.DB.getClients();
  const client = clients.find(c => c.id === p.clientId) || {
    name: p.clientName || 'Müşteri Belirtilmedi',
    taxOffice: '',
    taxNo: '',
    address: '',
    phone: '',
    email: '',
    contactPerson: ''
  };

  const container = document.getElementById('pdf-document-container');
  if (!container) return;

  const totals = calculateProposalTotals(p);
  const currSymbol = getCurrencySymbol(p.currency);
  const dateStr = new Date(p.date).toLocaleDateString('tr-TR');
  const validUntilStr = new Date(p.validUntil).toLocaleDateString('tr-TR');
  const accentColor = company.pdfAccentColor || '#3b82f6';

  container.style.setProperty('--pdf-accent', accentColor);

  // Watermark Stamp HTML
  let watermarkHTML = '';
  if (currentPdfShowWatermark && p.status) {
    const statusMap = {
      draft: { text: 'TASLAK', color: '#94a3b8' },
      sent: { text: 'GÖNDERİLDİ', color: '#0284c7' },
      approved: { text: 'ONAYLANDI', color: '#16a34a' },
      rejected: { text: 'REDDEDİLDİ', color: '#dc2626' },
      invoiced: { text: 'FATURALANDI', color: '#7c3aed' }
    };
    const st = statusMap[p.status] || statusMap.draft;
    watermarkHTML = `
      <div class="pdf-watermark-stamp" style="color: ${st.color}; border-color: ${st.color};">
        ${st.text}
      </div>
    `;
  }

  let logoHTML = '';
  if (company.logo) {
    logoHTML = `<img src="${company.logo}" class="pdf-logo" alt="${escapeHTML(company.name)}">`;
  }

  // Generate Table Rows
  const itemRowsHTML = (p.items || []).map((item, idx) => {
    const qty = item.quantity || 1;
    const price = item.unitPrice || 0;
    const lineSub = qty * price;
    const vatRate = item.vatRate || 0;

    const imgHTML = item.image 
      ? `<img src="${item.image}" style="width: 44px; height: 44px; object-fit: cover; border-radius: 4px; border: 1px solid #cbd5e1; flex-shrink: 0;">`
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

  // TEMPLATE RENDER logic
  let templateHTML = '';

  if (currentPdfTemplate === 'minimalist') {
    // ---------------- MINIMALIST TEMPLATE ----------------
    templateHTML = `
      <div class="pdf-document pdf-tpl-minimalist" style="position: relative;">
        ${watermarkHTML}
        
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 20px; margin-bottom: 24px;">
          <div>
            ${company.logo ? `<img src="${company.logo}" style="max-height: 50px; margin-bottom: 10px;">` : ''}
            <h2 style="font-size: 20px; font-weight: 700; color: #0f172a; margin: 0;">${escapeHTML(company.name)}</h2>
            <div style="font-size: 11px; color: #64748b; margin-top: 4px;">${escapeHTML(company.phone || '')} | ${escapeHTML(company.email || '')}</div>
          </div>
          <div style="text-align: right;">
            <h1 style="font-size: 26px; font-weight: 800; letter-spacing: -0.5px; color: #0f172a; margin: 0;">TEKLİF</h1>
            <div style="font-size: 13px; font-weight: 600; color: #475569; margin-top: 4px;">No: ${p.number}</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Tarih: ${dateStr}</div>
            <div style="font-size: 11px; color: #64748b;">Son Geçerlilik: ${validUntilStr}</div>
          </div>
        </div>

        <!-- Client info -->
        <div style="background: #f8fafc; padding: 14px; border-radius: 6px; margin-bottom: 24px; border-left: 3px solid #0f172a;">
          <div style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; tracking: 1px;">SAYIN / MÜŞTERİ</div>
          <div style="font-size: 15px; font-weight: 700; color: #0f172a; margin-top: 2px;">${escapeHTML(client.name)}</div>
          <div style="font-size: 11px; color: #475569; margin-top: 4px; line-height: 1.4;">
            ${client.contactPerson ? `<strong>Yetkili:</strong> ${escapeHTML(client.contactPerson)}<br>` : ''}
            ${client.address ? `${escapeHTML(client.address)}<br>` : ''}
            ${client.phone ? `Tel: ${escapeHTML(client.phone)} ` : ''} ${client.email ? `| ${escapeHTML(client.email)}` : ''}
            ${client.taxNo ? `<br>Vergi D.: ${escapeHTML(client.taxOffice || '')} - V.No: ${escapeHTML(client.taxNo)}` : ''}
          </div>
        </div>

        <!-- Table -->
        <table class="pdf-items-table" style="border-top: 1px solid #0f172a;">
          <thead>
            <tr style="background: #f1f5f9; color: #0f172a;">
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

        <!-- Totals -->
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
            <tr class="total-row" style="border-top: 2px solid #0f172a; border-bottom: 2px solid #0f172a; background: transparent; color: #0f172a;">
              <td>GENEL TOPLAM:</td>
              <td class="text-right">${currSymbol} ${totals.grandTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</td>
            </tr>
            ${buildTRYConversionHTML(p, totals)}
          </table>
        </div>

        <!-- Notes -->
        ${(p.terms || company.iban) ? `
          <div class="pdf-notes-section" style="border-left: 3px solid #64748b;">
            <div class="pdf-notes-title">TEKLİF KOŞULLARI VE ÖDEME BİLGİLERİ</div>
            <div class="pdf-notes-content">${escapeHTML(p.terms || '')}</div>
            ${company.iban ? `<div class="pdf-notes-content" style="margin-top: 8px; font-weight: 600;">Banka IBAN: ${escapeHTML(company.iban)}</div>` : ''}
          </div>
        ` : ''}

        <!-- Footer -->
        <div class="pdf-footer" style="border-top: 1px solid #e2e8f0; margin-top: 30px;">
          <div>TeklifMatik • ${escapeHTML(company.name)}</div>
          <div class="pdf-signature-box">
            <div class="pdf-signature-line"></div>
            <strong>Kaşe / Yetkili İmza</strong>
          </div>
        </div>
      </div>
    `;

  } else if (currentPdfTemplate === 'executive') {
    // ---------------- EXECUTIVE COVER PAGE TEMPLATE ----------------
    templateHTML = `
      <div class="pdf-document pdf-tpl-executive" style="position: relative; padding: 0; min-height: auto;">
        
        <!-- Page 1: COVER PAGE -->
        <div class="pdf-cover-page" style="min-height: 265mm; display: flex; flex-direction: column; justify-content: space-between; padding: 40px 30px; background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: #ffffff; border-radius: 8px; page-break-after: always; break-after: page; position: relative; box-sizing: border-box;">
          ${watermarkHTML}
          
          <div>
            ${company.logo ? `<img src="${company.logo}" style="max-height: 70px; background: #fff; padding: 8px; border-radius: 6px;">` : ''}
            <div style="font-size: 22px; font-weight: 700; margin-top: 16px; color: #f8fafc;">${escapeHTML(company.name)}</div>
            <div style="font-size: 13px; color: #94a3b8;">${escapeHTML(company.subTitle || '')}</div>
          </div>

          <div style="margin: 50px 0; border-left: 5px solid ${accentColor}; padding-left: 24px;">
            <div style="font-size: 14px; font-weight: 700; color: ${accentColor}; letter-spacing: 2px; text-transform: uppercase;">HİZMET VE FİYAT TEKLİFİ</div>
            <h1 style="font-size: 38px; font-weight: 800; margin: 10px 0; color: #ffffff; line-height: 1.2;">TEKLİF DOKÜMANI</h1>
            <div style="font-size: 16px; color: #cbd5e1;">Teklif No: <strong style="color: #ffffff;">${p.number}</strong></div>
          </div>

          <div style="background: rgba(255, 255, 255, 0.07); padding: 24px; border-radius: 8px; backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.1);">
            <div style="font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin-bottom: 8px;">HAZIRLANAN MÜŞTERİ</div>
            <div style="font-size: 20px; font-weight: 700; color: #ffffff;">${escapeHTML(client.name)}</div>
            ${client.contactPerson ? `<div style="font-size: 13px; color: #cbd5e1; margin-top: 4px;">Yetkili: ${escapeHTML(client.contactPerson)}</div>` : ''}
            
            <div style="display: flex; gap: 30px; margin-top: 20px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 16px; font-size: 12px; color: #cbd5e1;">
              <div><strong>Teklif Tarihi:</strong> ${dateStr}</div>
              <div><strong>Geçerlilik Tarihi:</strong> ${validUntilStr}</div>
              <div><strong>Para Birimi:</strong> ${p.currency || 'TRY'}</div>
            </div>
          </div>
        </div>

        <!-- Page 2: DETAILS & TABLE -->
        <div style="position: relative; padding: 20px 10px; page-break-before: always; break-before: page;">
          ${watermarkHTML}
          
          <!-- Header -->
          <div class="pdf-header">
            <div class="pdf-company-info">
              <div class="pdf-company-title">${escapeHTML(company.name)}</div>
              <div class="pdf-company-sub">${escapeHTML(company.subTitle || '')}</div>
            </div>
            <div class="pdf-meta-box">
              <div class="pdf-proposal-badge">DETAY LİSTESİ</div>
              <div class="pdf-meta-row"><strong>Teklif No:</strong> ${p.number}</div>
              <div class="pdf-meta-row"><strong>Tarih:</strong> ${dateStr}</div>
            </div>
          </div>

          <!-- Items Table -->
          <table class="pdf-items-table" style="margin-top: 20px;">
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
              ${buildTRYConversionHTML(p, totals)}
            </table>
          </div>

          <!-- Notes -->
          ${(p.terms || company.iban) ? `
            <div class="pdf-notes-section">
              <div class="pdf-notes-title">TEKLİF KOŞULLARI VE ÖDEME BİLGİLERİ</div>
              <div class="pdf-notes-content">${escapeHTML(p.terms || '')}</div>
              ${company.iban ? `<div class="pdf-notes-content" style="margin-top: 8px; font-weight: 600;">Banka IBAN: ${escapeHTML(company.iban)}</div>` : ''}
            </div>
          ` : ''}

          <!-- Footer -->
          <div class="pdf-footer">
            <div>${escapeHTML(company.name)} • TeklifMatik</div>
            <div class="pdf-signature-box">
              <div class="pdf-signature-line"></div>
              <strong>Kaşe / Yetkili İmza</strong>
            </div>
          </div>
        </div>
      </div>
    `;

  } else {
    // ---------------- DEFAULT / MODERN TEMPLATE ----------------
    templateHTML = `
      <div class="pdf-document pdf-tpl-modern" style="position: relative;">
        ${watermarkHTML}
        
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
            ${buildTRYConversionHTML(p, totals)}
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
  }

  container.innerHTML = templateHTML;
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
    window.print();
  }
}

function printProposal() {
  window.print();
}

window.viewProposalPDF = viewProposalPDF;
window.setPdfTemplate = setPdfTemplate;
window.setPdfWatermarkToggle = setPdfWatermarkToggle;
window.setPdfConvertToTRY = setPdfConvertToTRY;
window.downloadProposalPDF = downloadProposalPDF;
window.printProposal = printProposal;
