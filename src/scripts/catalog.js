/**
 * Product & Service Catalog View Controller
 */

let editingCatalogId = null;

function renderCatalogList() {
  const catalog = window.DB.getCatalog();
  
  // Render Products Table
  const productsSearch = document.getElementById('products-search-input')?.value || '';
  const products = catalog.filter(cat => 
    cat.type === 'product' && window.matchSearchPattern(cat.title, productsSearch)
  );

  const getCurrSym = (curr) => window.getCurrencySymbol ? window.getCurrencySymbol(curr) : (curr === 'USD' ? '$' : (curr === 'EUR' ? '€' : '₺'));

  const productsTbody = document.getElementById('products-table-tbody');
  if (productsTbody) {
    if (products.length === 0) {
      productsTbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 32px;">Kriterlere uygun ürün bulunamadı.</td></tr>`;
    } else {
      productsTbody.innerHTML = products.map(cat => `
        <tr>
          <td><strong>${escapeHTML(cat.title)}</strong></td>
          <td><span class="badge badge-draft">${escapeHTML(cat.unit || 'Adet')}</span></td>
          <td><strong>${(cat.unitPrice || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ${getCurrSym(cat.currency)}</strong></td>
          <td>%${cat.vatRate || 20}</td>
          <td>
            <div style="display: flex; gap: 6px;">
              <button class="btn btn-secondary btn-sm btn-icon" onclick="openCatalogModal('${cat.id}')" title="Düzenle">
                <i class="ri-edit-line"></i>
              </button>
              <button class="btn btn-danger btn-sm btn-icon" onclick="confirmDeleteCatalog('${cat.id}')" title="Sil">
                <i class="ri-delete-bin-line"></i>
              </button>
            </div>
          </td>
        </tr>
      `).join('');
    }
  }

  // Render Services Table
  const servicesSearch = document.getElementById('services-search-input')?.value || '';
  const services = catalog.filter(cat => 
    cat.type === 'service' && window.matchSearchPattern(cat.title, servicesSearch)
  );

  const servicesTbody = document.getElementById('services-table-tbody');
  if (servicesTbody) {
    if (services.length === 0) {
      servicesTbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 32px;">Kayıtlı hizmet bulunamadı.</td></tr>`;
    } else {
      servicesTbody.innerHTML = services.map(cat => `
        <tr>
          <td><strong>${escapeHTML(cat.title)}</strong></td>
          <td><span class="badge badge-draft">${escapeHTML(cat.unit || 'Adet')}</span></td>
          <td><strong>${(cat.unitPrice || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ${getCurrSym(cat.currency)}</strong></td>
          <td>%${cat.vatRate || 20}</td>
          <td>
            <div style="display: flex; gap: 6px;">
              <button class="btn btn-secondary btn-sm btn-icon" onclick="openCatalogModal('${cat.id}')" title="Düzenle">
                <i class="ri-edit-line"></i>
              </button>
              <button class="btn btn-danger btn-sm btn-icon" onclick="confirmDeleteCatalog('${cat.id}')" title="Sil">
                <i class="ri-delete-bin-line"></i>
              </button>
            </div>
          </td>
        </tr>
      `).join('');
    }
  }
}

function openCatalogModal(id = null, defaultType = 'product') {
  editingCatalogId = id;
  const modal = document.getElementById('catalog-modal');
  const title = document.getElementById('catalog-modal-title');
  const typeSelect = document.getElementById('modal-catalog-type');
  const currencySelect = document.getElementById('modal-catalog-currency');

  const imgPreview = document.getElementById('modal-catalog-image-preview');

  if (id) {
    const catalog = window.DB.getCatalog();
    const cat = catalog.find(item => item.id === id);
    if (!cat) return;

    if (title) title.textContent = cat.type === 'service' ? 'Hizmet Düzenle' : 'Ürün Düzenle';
    if (typeSelect) typeSelect.value = cat.type || 'product';
    if (currencySelect) currencySelect.value = cat.currency || 'TRY';
    document.getElementById('modal-catalog-title').value = cat.title || '';
    document.getElementById('modal-catalog-unit').value = cat.unit || 'Adet';
    document.getElementById('modal-catalog-price').value = cat.unitPrice || 0;
    document.getElementById('modal-catalog-vat').value = cat.vatRate || 20;
    document.getElementById('modal-catalog-description').value = cat.description || '';

    if (imgPreview) {
      if (cat.image) {
        imgPreview.src = cat.image;
        imgPreview.style.display = 'block';
      } else {
        imgPreview.src = '';
        imgPreview.style.display = 'none';
      }
    }
  } else {
    if (title) title.textContent = defaultType === 'service' ? 'Yeni Hizmet Ekle' : 'Yeni Ürün Ekle';
    if (typeSelect) typeSelect.value = defaultType;
    if (currencySelect) currencySelect.value = 'TRY';
    document.getElementById('modal-catalog-title').value = '';
    document.getElementById('modal-catalog-unit').value = defaultType === 'service' ? 'Saat' : 'Adet';
    document.getElementById('modal-catalog-price').value = '';
    document.getElementById('modal-catalog-vat').value = 20;
    document.getElementById('modal-catalog-description').value = '';

    if (imgPreview) {
      imgPreview.src = '';
      imgPreview.style.display = 'none';
    }
  }

  modal.classList.add('active');
}

function closeCatalogModal() {
  document.getElementById('catalog-modal')?.classList.remove('active');
}

function handleCatalogImageUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (file.size > 3 * 1024 * 1024) {
    window.showToast('Görsel boyutu 3MB\'tan küçük olmalıdır.', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    const imgPreview = document.getElementById('modal-catalog-image-preview');
    if (imgPreview) {
      imgPreview.src = e.target.result;
      imgPreview.style.display = 'block';
    }
  };
  reader.readAsDataURL(file);
}

function removeCatalogImage() {
  const imgPreview = document.getElementById('modal-catalog-image-preview');
  if (imgPreview) {
    imgPreview.src = '';
    imgPreview.style.display = 'none';
  }
  const input = document.getElementById('modal-catalog-image-input');
  if (input) input.value = '';
}

function saveCatalogForm() {
  const title = document.getElementById('modal-catalog-title').value.trim();
  if (!title) {
    window.showToast('Lütfen başlık girin.', 'error');
    return;
  }

  const type = document.getElementById('modal-catalog-type')?.value || 'product';
  const currency = document.getElementById('modal-catalog-currency')?.value || 'TRY';
  const description = document.getElementById('modal-catalog-description')?.value.trim() || '';
  const imgPreview = document.getElementById('modal-catalog-image-preview');
  const image = (imgPreview && imgPreview.style.display !== 'none') ? imgPreview.src : '';

  const catalogData = {
    id: editingCatalogId || undefined,
    title,
    type,
    currency,
    description,
    image,
    unit: document.getElementById('modal-catalog-unit').value,
    unitPrice: parseFloat(document.getElementById('modal-catalog-price').value || 0),
    vatRate: parseFloat(document.getElementById('modal-catalog-vat').value || 20)
  };

  window.DB.saveCatalogItem(catalogData);
  window.showToast(type === 'service' ? 'Hizmet kaydedildi.' : 'Ürün kaydedildi.', 'success');
  closeCatalogModal();
  renderCatalogList();
}

function confirmDeleteCatalog(id) {
  const catalog = window.DB.getCatalog();
  const cat = catalog.find(item => item.id === id);
  if (!cat) return;

  if (confirm(`"${cat.title}" kalemini silmek istediğinize emin misiniz?`)) {
    window.DB.deleteCatalogItem(id);
    window.showToast('Kalem silindi.', 'info');
    renderCatalogList();
  }
}

function exportCatalogToExcel(targetType = null) {
  if (typeof XLSX === 'undefined') {
    window.showToast('Excel kütüphanesi yüklenemedi.', 'error');
    return;
  }

  let catalog = window.DB.getCatalog();
  if (targetType) {
    catalog = catalog.filter(c => c.type === targetType);
  }

  if (catalog.length === 0) {
    window.showToast('Dışa aktarılacak veri bulunamadı.', 'info');
    return;
  }

  const exportData = catalog.map(cat => ({
    'Başlık / Açıklama': cat.title || '',
    'Tür': cat.type === 'service' ? 'Hizmet' : 'Ürün',
    'Birim': cat.unit || 'Adet',
    'Birim Fiyat': cat.unitPrice || 0,
    'Para Birimi': cat.currency || 'TRY',
    'KDV Oranı (%)': cat.vatRate || 20
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  const sheetName = targetType === 'service' ? 'Hizmet Kataloğu' : (targetType === 'product' ? 'Ürün Kataloğu' : 'Katalog');
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  worksheet['!cols'] = [
    { wch: 35 },
    { wch: 12 },
    { wch: 12 },
    { wch: 16 },
    { wch: 14 },
    { wch: 15 }
  ];

  const filename = targetType === 'service' ? `TeklifMatik_Hizmet_Katalogu.xlsx` : `TeklifMatik_Urun_Katalogu.xlsx`;
  XLSX.writeFile(workbook, filename);
  window.showToast('Excel dosyası indirildi.', 'success');
}

function downloadCatalogTemplate(targetType = 'product') {
  if (typeof XLSX === 'undefined') {
    window.showToast('Excel kütüphanesi yüklenemedi.', 'error');
    return;
  }

  const sampleData = targetType === 'service' ? [
    {
      'Başlık / Açıklama': 'Özel Web Yazılım Geliştirme',
      'Birim': 'Proje',
      'Birim Fiyat': 50000,
      'Para Birimi': 'TRY',
      'KDV Oranı (%)': 20
    },
    {
      'Başlık / Açıklama': 'Danışmanlık & Bakım Hizmeti',
      'Birim': 'Saat',
      'Birim Fiyat': 50,
      'Para Birimi': 'USD',
      'KDV Oranı (%)': 20
    }
  ] : [
    {
      'Başlık / Açıklama': 'Endüstriyel El Terminali',
      'Birim': 'Adet',
      'Birim Fiyat': 400,
      'Para Birimi': 'USD',
      'KDV Oranı (%)': 20
    },
    {
      'Başlık / Açıklama': 'Termal Etiket Yazıcı',
      'Birim': 'Adet',
      'Birim Fiyat': 6200,
      'Para Birimi': 'TRY',
      'KDV Oranı (%)': 20
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Şablon');

  worksheet['!cols'] = [
    { wch: 35 },
    { wch: 12 },
    { wch: 16 },
    { wch: 14 },
    { wch: 15 }
  ];

  const filename = targetType === 'service' ? 'TeklifMatik_Hizmet_Sablonu.xlsx' : 'TeklifMatik_Urun_Sablonu.xlsx';
  XLSX.writeFile(workbook, filename);
  window.showToast('Excel şablon dosyası indirildi.', 'info');
}

function importCatalogFromExcel(event, defaultType = 'product') {
  if (typeof XLSX === 'undefined') {
    window.showToast('Excel kütüphanesi yüklenemedi.', 'error');
    return;
  }

  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      if (!jsonData || jsonData.length === 0) {
        window.showToast('Excel dosyasında veri bulunamadı.', 'error');
        return;
      }

      let count = 0;
      jsonData.forEach(row => {
        const titleKey = Object.keys(row).find(k => 
          /başlık|title|ürün|hizmet|name|ad/i.test(k)
        );
        const typeKey = Object.keys(row).find(k => 
          /tür|type|kategori/i.test(k)
        );
        const unitKey = Object.keys(row).find(k => 
          /birim|unit/i.test(k)
        );
        const priceKey = Object.keys(row).find(k => 
          /fiyat|price|tutar/i.test(k)
        );
        const currKey = Object.keys(row).find(k => 
          /para|birim|curr|döviz/i.test(k) && !/fiyat/i.test(k)
        );
        const vatKey = Object.keys(row).find(k => 
          /kdv|vat/i.test(k)
        );

        const title = titleKey ? String(row[titleKey]).trim() : '';
        if (!title) return;

        let type = defaultType;
        if (typeKey && row[typeKey]) {
          const typeVal = String(row[typeKey]).toLowerCase();
          if (typeVal.includes('hizmet') || typeVal.includes('service')) type = 'service';
          if (typeVal.includes('ürün') || typeVal.includes('urun') || typeVal.includes('product')) type = 'product';
        }

        let currency = 'TRY';
        if (currKey && row[currKey]) {
          const cVal = String(row[currKey]).trim().toUpperCase();
          if (cVal.includes('USD') || cVal.includes('$')) currency = 'USD';
          else if (cVal.includes('EUR') || cVal.includes('€')) currency = 'EUR';
          else if (cVal.includes('GBP') || cVal.includes('£')) currency = 'GBP';
        }

        const unit = unitKey && row[unitKey] ? String(row[unitKey]).trim() : (type === 'service' ? 'Saat' : 'Adet');
        const rawPrice = priceKey ? String(row[priceKey]).replace(/[^0-9.,]/g, '').replace(',', '.') : '0';
        const unitPrice = parseFloat(rawPrice) || 0;
        const rawVat = vatKey ? String(row[vatKey]).replace(/[^0-9.,]/g, '').replace(',', '.') : '20';
        const vatRate = parseFloat(rawVat) || 20;

        window.DB.saveCatalogItem({
          title,
          type,
          currency,
          unit,
          unitPrice,
          vatRate
        });
        count++;
      });

      window.showToast(`${count} adet kalem başarıyla aktarıldı.`, 'success');
      renderCatalogList();

    } catch (err) {
      console.error('Excel okuma hatası:', err);
      window.showToast('Excel dosyası işlenirken hata oluştu.', 'error');
    } finally {
      event.target.value = '';
    }
  };

  reader.readAsArrayBuffer(file);
}

window.renderCatalogList = renderCatalogList;
window.openCatalogModal = openCatalogModal;
window.closeCatalogModal = closeCatalogModal;
window.saveCatalogForm = saveCatalogForm;
window.confirmDeleteCatalog = confirmDeleteCatalog;
window.exportCatalogToExcel = exportCatalogToExcel;
window.downloadCatalogTemplate = downloadCatalogTemplate;
window.importCatalogFromExcel = importCatalogFromExcel;
window.handleCatalogImageUpload = handleCatalogImageUpload;
window.removeCatalogImage = removeCatalogImage;



