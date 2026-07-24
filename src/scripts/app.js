/**
 * Main Application Orchestrator
 */

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initNavigation();
  initModalListeners();
  initKeyboardShortcuts();
  
  // Render initial dashboard view
  window.renderDashboard();
  window.renderProposalsList();
  window.renderClientsList();
  window.renderCatalogList();
  window.loadSettingsForm();
  if (window.renderProformasList) window.renderProformasList();
});

// Keyboard Shortcuts Integration
function initKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Ctrl + N (New Proposal)
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
      e.preventDefault();
      if (window.openProposalBuilder) {
        window.openProposalBuilder();
        showToast('Yeni teklif oluşturucu açıldı (Ctrl+N)', 'info');
      }
    }

    // Ctrl + S (Save Proposal or Settings)
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      const activeSection = document.querySelector('.view-section.active');
      if (activeSection) {
        if (activeSection.id === 'view-proposal-builder') {
          if (window.saveCurrentProposal) window.saveCurrentProposal();
        } else if (activeSection.id === 'view-settings') {
          if (window.saveSettingsForm) window.saveSettingsForm();
        }
      }
    }

    // Escape (Close Modals)
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.active, .modal.active').forEach(m => {
        m.classList.remove('active');
      });
      if (window.closeClientHistoryModal) window.closeClientHistoryModal();
    }

    // Ctrl + F (Search Focus)
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
      const activeSection = document.querySelector('.view-section.active');
      if (activeSection) {
        const searchInput = activeSection.querySelector('input[type="text"][placeholder*="ara"]');
        if (searchInput) {
          e.preventDefault();
          searchInput.focus();
          searchInput.select();
        }
      }
    }
  });
}

// Navigation & Tab Switching
function switchTab(viewId) {
  const views = document.querySelectorAll('.view-section');
  views.forEach(v => v.classList.remove('active'));

  const target = document.getElementById(viewId);
  if (target) {
    target.classList.add('active');
  }

  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    if (item.getAttribute('data-view') === viewId) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  const titleMap = {
    'view-dashboard': 'Ana Sayfa & Özet',
    'view-proposals-list': 'Teklif Yönetimi',
    'view-proposal-builder': 'Teklif Oluşturucu',
    'view-clients-list': 'Müşteri Rehberi',
    'view-products-catalog': 'Ürün Kataloğu',
    'view-services-catalog': 'Hizmet Kataloğu',
    'view-settings': 'Firma Ayarları & Özelleştirme',
    'view-pdf-preview': 'Teklif Önizleme & PDF',
    'view-proformas': 'Proforma Fatura Yönetimi'
  };

  const headerTitle = document.getElementById('header-title-text');
  if (headerTitle && titleMap[viewId]) {
    headerTitle.textContent = titleMap[viewId];
  }

  if (viewId === 'view-dashboard' && window.renderDashboard) window.renderDashboard();
  if (viewId === 'view-proposals-list' && window.renderProposalsList) window.renderProposalsList();
  if (viewId === 'view-clients-list' && window.renderClientsList) window.renderClientsList();
  if ((viewId === 'view-products-catalog' || viewId === 'view-services-catalog') && window.renderCatalogList) window.renderCatalogList();
  if (viewId === 'view-settings' && window.loadSettingsForm) window.loadSettingsForm();
  if (viewId === 'view-proformas' && window.renderProformasList) window.renderProformasList();
}

function initNavigation() {
  const navItems = document.querySelectorAll('.nav-item[data-view]');
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const viewId = item.getAttribute('data-view');
      switchTab(viewId);
    });
  });
}

function initTheme() {
  const savedTheme = localStorage.getItem('teklifmatik_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeButtonUI(savedTheme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('teklifmatik_theme', next);
  updateThemeButtonUI(next);
}

function updateThemeButtonUI(theme) {
  const btn = document.getElementById('theme-toggle-btn');
  if (!btn) return;
  if (theme === 'light') {
    btn.innerHTML = `<i class="ri-moon-line"></i> Koyu Tema`;
  } else {
    btn.innerHTML = `<i class="ri-sun-line"></i> Açık Tema`;
  }
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  let icon = 'ri-information-line';
  if (type === 'success') icon = 'ri-checkbox-circle-line';
  if (type === 'error') icon = 'ri-error-warning-line';

  toast.innerHTML = `<i class="${icon}"></i> <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

async function handleExportBackup() {
  const jsonStr = window.DB.exportAll();
  
  if (window.electronAPI && window.electronAPI.exportBackup) {
    const res = await window.electronAPI.exportBackup(jsonStr);
    if (res.success) {
      showToast(`Yedek dosyası oluşturuldu: ${res.filePath}`, 'success');
    } else if (!res.cancelled) {
      showToast(`Yedekleme hatası: ${res.error}`, 'error');
    }
  } else {
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TeklifMatik_Yedek_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Yedek JSON dosyası indirildi.', 'success');
  }
}

async function handleImportBackup() {
  if (window.electronAPI && window.electronAPI.importBackup) {
    const res = await window.electronAPI.importBackup();
    if (res.success && res.data) {
      const ok = window.DB.importAll(res.data);
      if (ok) {
        showToast('Veriler başarıyla içe aktarıldı!', 'success');
        if (window.renderDashboard) window.renderDashboard();
        if (window.renderProposalsList) window.renderProposalsList();
      } else {
        showToast('Geçersiz yedek dosyası formatı.', 'error');
      }
    }
  } else {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const parsed = JSON.parse(evt.target.result);
          const ok = window.DB.importAll(parsed);
          if (ok) {
            showToast('Veriler içeri aktarıldı!', 'success');
            if (window.renderDashboard) window.renderDashboard();
            if (window.renderProposalsList) window.renderProposalsList();
          } else {
            showToast('Geçersiz yedek formatı.', 'error');
          }
        } catch (err) {
          showToast('JSON okuma hatası.', 'error');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }
}

function initModalListeners() {
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.remove('active');
      }
    });
  });
}

window.switchTab = switchTab;
window.toggleTheme = toggleTheme;
window.showToast = showToast;
window.handleExportBackup = handleExportBackup;
window.handleImportBackup = handleImportBackup;
