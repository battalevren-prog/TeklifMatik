/**
 * Company & System Settings View Controller (Multi-Company Support)
 */

let activeCompanySettingsId = 'comp_1';

function switchCompanySettingsTab(companyId) {
  activeCompanySettingsId = companyId;
  
  document.querySelectorAll('.company-settings-tab').forEach(tab => {
    if (tab.getAttribute('data-company-id') === companyId) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });

  loadSettingsForm(companyId);
}

function updateSettingsCompanyTabsUI() {
  const companies = window.DB.getCompanies ? window.DB.getCompanies() : [];
  companies.forEach((c) => {
    const tab = document.querySelector(`.company-settings-tab[data-company-id="${c.id}"]`);
    if (tab) {
      const isCurrentActive = tab.getAttribute('data-company-id') === activeCompanySettingsId;
      tab.innerHTML = `<i class="ri-building-line"></i> ${escapeHTML(c.name)} ${c.isDefault ? '(Varsayılan)' : ''}`;
      if (isCurrentActive) tab.classList.add('active');
    }
  });
}

function loadSettingsForm(companyId = activeCompanySettingsId) {
  activeCompanySettingsId = companyId;
  updateSettingsCompanyTabsUI();
  const company = window.DB.getCompany(companyId);

  const compIdInput = document.getElementById('setting-company-id');
  if (compIdInput) compIdInput.value = company.id || 'comp_1';

  document.getElementById('setting-company-name').value = company.name || '';
  document.getElementById('setting-company-sub').value = company.subTitle || '';
  document.getElementById('setting-tax-office').value = company.taxOffice || '';
  document.getElementById('setting-tax-no').value = company.taxNo || '';
  document.getElementById('setting-phone').value = company.phone || '';
  document.getElementById('setting-email').value = company.email || '';
  document.getElementById('setting-website').value = company.website || '';
  document.getElementById('setting-address').value = company.address || '';
  document.getElementById('setting-iban').value = company.iban || '';
  document.getElementById('setting-notes').value = company.notes || '';
  document.getElementById('setting-pdf-color').value = company.pdfAccentColor || '#3b82f6';
  
  if (document.getElementById('setting-pdf-template')) {
    document.getElementById('setting-pdf-template').value = company.pdfTemplate || 'modern';
  }
  if (document.getElementById('setting-pdf-watermark')) {
    document.getElementById('setting-pdf-watermark').checked = company.pdfShowWatermark !== false;
  }

  const logoPreview = document.getElementById('setting-logo-preview');
  if (logoPreview) {
    if (company.logo) {
      logoPreview.src = company.logo;
      logoPreview.style.display = 'block';
    } else {
      logoPreview.src = '';
      logoPreview.style.display = 'none';
    }
  }

  const stampPreview = document.getElementById('setting-stamp-preview');
  if (stampPreview) {
    if (company.stamp) {
      stampPreview.src = company.stamp;
      stampPreview.style.display = 'block';
    } else {
      stampPreview.src = '';
      stampPreview.style.display = 'none';
    }
  }

  // Load exchange rates
  const rates = window.DB.getExchangeRates();
  if (rates) {
    const usdInput = document.getElementById('setting-rate-usd');
    const eurInput = document.getElementById('setting-rate-eur');
    const gbpInput = document.getElementById('setting-rate-gbp');
    const lastUpdateText = document.getElementById('rate-last-updated-text');

    if (usdInput) usdInput.value = rates.USD || 38.50;
    if (eurInput) eurInput.value = rates.EUR || 41.20;
    if (gbpInput) gbpInput.value = rates.GBP || 48.50;
    if (lastUpdateText && rates.lastUpdated) {
      lastUpdateText.textContent = `Son Güncelleme: ${rates.lastUpdated}`;
    }
  }
}

function saveSettingsForm() {
  const companyId = document.getElementById('setting-company-id')?.value || activeCompanySettingsId;
  const name = document.getElementById('setting-company-name').value.trim();
  if (!name) {
    window.showToast('Firma Unvanı boş olamaz.', 'error');
    return;
  }

  const logoPreview = document.getElementById('setting-logo-preview');
  const logoData = logoPreview && logoPreview.style.display !== 'none' ? logoPreview.src : '';

  const companyData = {
    id: companyId,
    name,
    subTitle: document.getElementById('setting-company-sub').value.trim(),
    taxOffice: document.getElementById('setting-tax-office').value.trim(),
    taxNo: document.getElementById('setting-tax-no').value.trim(),
    phone: document.getElementById('setting-phone').value.trim(),
    email: document.getElementById('setting-email').value.trim(),
    website: document.getElementById('setting-website').value.trim(),
    address: document.getElementById('setting-address').value.trim(),
    iban: document.getElementById('setting-iban').value.trim(),
    notes: document.getElementById('setting-notes').value.trim(),
    pdfAccentColor: document.getElementById('setting-pdf-color').value,
    pdfTemplate: document.getElementById('setting-pdf-template')?.value || 'modern',
    pdfShowWatermark: document.getElementById('setting-pdf-watermark')?.checked !== false,
    logo: logoData,
    stamp: (() => {
      const sp = document.getElementById('setting-stamp-preview');
      return (sp && sp.style.display !== 'none' && sp.src) ? sp.src : '';
    })()
  };

  window.DB.saveCompany(companyData);

  // Save exchange rates
  const usdRate = parseFloat(document.getElementById('setting-rate-usd')?.value || 38.50);
  const eurRate = parseFloat(document.getElementById('setting-rate-eur')?.value || 41.20);
  const gbpRate = parseFloat(document.getElementById('setting-rate-gbp')?.value || 48.50);

  window.DB.saveExchangeRates({
    USD: usdRate,
    EUR: eurRate,
    GBP: gbpRate,
    TRY: 1
  });

  if (window.CurrencyEngine) {
    window.CurrencyEngine.cachedRates.USD = usdRate;
    window.CurrencyEngine.cachedRates.EUR = eurRate;
    window.CurrencyEngine.cachedRates.GBP = gbpRate;
  }

  updateSettingsCompanyTabsUI();
  if (window.renderProposalsList) window.renderProposalsList();

  window.showToast(`Firma profili kaydedildi: ${name}`, 'success');
}

async function fetchAndDisplayTCMBRates() {
  if (!window.CurrencyEngine) return;

  window.showToast('TCMB kurları çekiliyor...', 'info');
  const res = await window.CurrencyEngine.fetchTCMBRates();

  if (res.success) {
    document.getElementById('setting-rate-usd').value = res.rates.USD;
    document.getElementById('setting-rate-eur').value = res.rates.EUR;
    document.getElementById('setting-rate-gbp').value = res.rates.GBP;
    document.getElementById('rate-last-updated-text').textContent = `Son Güncelleme: ${res.date} (TCMB Canlı)`;
    window.showToast('TCMB kurları güncellendi!', 'success');
  } else {
    window.showToast(`TCMB kurları çekilemedi: ${res.error}. Kayıtlı kurlar yüklendi.`, 'error');
  }
}

function handleLogoUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (file.size > 2 * 1024 * 1024) {
    window.showToast('Logo resmi 2MB\'tan küçük olmalıdır.', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = function (e) {
    const logoPreview = document.getElementById('setting-logo-preview');
    if (logoPreview) {
      logoPreview.src = e.target.result;
      logoPreview.style.display = 'block';
    }
  };
  reader.readAsDataURL(file);
}

function removeLogo() {
  const logoPreview = document.getElementById('setting-logo-preview');
  if (logoPreview) {
    logoPreview.src = '';
    logoPreview.style.display = 'none';
  }
  document.getElementById('setting-logo-input').value = '';
}

function handleStampUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (file.size > 3 * 1024 * 1024) {
    window.showToast('Kaşe resmi 3MB\'tan küçük olmalıdır.', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = function (e) {
    const stampPreview = document.getElementById('setting-stamp-preview');
    if (stampPreview) {
      stampPreview.src = e.target.result;
      stampPreview.style.display = 'block';
    }
  };
  reader.readAsDataURL(file);
}

function removeStamp() {
  const stampPreview = document.getElementById('setting-stamp-preview');
  if (stampPreview) {
    stampPreview.src = '';
    stampPreview.style.display = 'none';
  }
  document.getElementById('setting-stamp-input').value = '';
}

window.loadSettingsForm = loadSettingsForm;
window.saveSettingsForm = saveSettingsForm;
window.switchCompanySettingsTab = switchCompanySettingsTab;
window.fetchAndDisplayTCMBRates = fetchAndDisplayTCMBRates;
window.handleLogoUpload = handleLogoUpload;
window.removeLogo = removeLogo;
window.handleStampUpload = handleStampUpload;
window.removeStamp = removeStamp;
