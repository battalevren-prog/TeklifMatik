/**
 * TeklifMatik Storage Engine
 * Manages JSON data in localStorage with initial seed data
 */

const STORAGE_KEY = 'teklifmatik_db_v3';

const DEFAULT_DB = window.INITIAL_DATABASE || {
  company: {
    name: 'TeknoSoft Yazılım ve Danışmanlık A.Ş.',
    subTitle: 'Web, Mobil & Kurumsal Yazılım Çözümleri',
    taxOffice: 'Maslak V.D.',
    taxNo: '8370492812',
    phone: '+90 (212) 555 0199',
    email: 'teklif@teknosoft.com.tr',
    website: 'https://teknosoft.com.tr',
    address: 'Büyükdere Cad. No: 195, Kat: 8, Levent, İstanbul',
    iban: 'TR68 0006 2000 0001 2345 6789 01 - Garanti BBVA',
    notes: '• Fiyatlarımıza KDV dahil değildir.\n• Teklifimiz 15 gün süreyle geçerlidir.\n• %50 ön ödeme sipariş onayında, %50 teslimatta tahsil edilir.',
    logo: '',
    pdfAccentColor: '#3b82f6',
    pdfTemplate: 'modern',
    pdfShowWatermark: true
  },
  clients: [],
  catalog: [],
  proposals: []
};

class StorageEngine {
  constructor() {
    this.data = this.load();
  }

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        this.saveData(DEFAULT_DB);
        return JSON.parse(JSON.stringify(DEFAULT_DB));
      }
      return JSON.parse(raw);
    } catch (e) {
      console.error('Storage parse error, using default database', e);
      return JSON.parse(JSON.stringify(DEFAULT_DB));
    }
  }

  saveData(data) {
    this.data = data;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
  }

  getCompanies() {
    if (!this.data.companies || !Array.isArray(this.data.companies) || this.data.companies.length === 0) {
      const mainComp = this.data.company || DEFAULT_DB.company;
      const comp1 = {
        id: 'comp_1',
        isDefault: true,
        ...mainComp
      };
      const comp2 = {
        id: 'comp_2',
        isDefault: false,
        name: 'İkinci Firma Unvanı Ltd. Şti.',
        subTitle: 'Danışmanlık ve Hizmet Çözümleri',
        taxOffice: 'Kadıköy V.D.',
        taxNo: '1234567890',
        phone: '+90 (216) 555 0100',
        email: 'info@ikincifirma.com.tr',
        website: 'https://ikincifirma.com.tr',
        address: 'Bağdat Cad. No: 120 Kadıköy / İstanbul',
        iban: 'TR12 0006 2000 0001 9876 5432 10 - Yapı Kredi',
        notes: '• Fiyatlarımıza KDV dahil değildir.\n• Teklifimiz 15 gün süreyle geçerlidir.',
        logo: '',
        pdfAccentColor: '#10b981',
        pdfTemplate: 'modern',
        pdfShowWatermark: true
      };
      this.data.companies = [comp1, comp2];
      this.saveData(this.data);
    }
    return this.data.companies;
  }

  getCompany(id = null) {
    const companies = this.getCompanies();
    if (!id) {
      return companies.find(c => c.isDefault) || companies[0];
    }
    return companies.find(c => c.id === id) || companies[0];
  }

  saveCompany(companyData) {
    const id = companyData.id || 'comp_1';
    const companies = this.getCompanies();
    const idx = companies.findIndex(c => c.id === id);
    if (idx !== -1) {
      companies[idx] = { ...companies[idx], ...companyData };
    } else {
      companies.push(companyData);
    }
    this.data.companies = companies;
    if (id === 'comp_1' || companies[idx]?.isDefault) {
      this.data.company = { ...this.data.company, ...companyData };
    }
    this.saveData(this.data);
    return companies[idx !== -1 ? idx : companies.length - 1];
  }

  getClients() {
    return this.data.clients || [];
  }

  saveClient(client) {
    if (!client.id) {
      client.id = 'cli_' + Date.now();
      this.data.clients.push(client);
    } else {
      const idx = this.data.clients.findIndex(c => c.id === client.id);
      if (idx !== -1) this.data.clients[idx] = client;
      else this.data.clients.push(client);
    }
    this.saveData(this.data);
    return client;
  }

  deleteClient(id) {
    this.data.clients = this.data.clients.filter(c => c.id !== id);
    this.saveData(this.data);
  }

  getCatalog() {
    const raw = this.data.catalog || [];
    return raw.map(item => ({
      ...item,
      type: item.type || (['Adet', 'Paket'].includes(item.unit) ? 'product' : 'service'),
      currency: item.currency || 'TRY'
    }));
  }

  saveCatalogItem(item) {
    if (!item.type) item.type = 'product';
    if (!item.currency) item.currency = 'TRY';
    if (!item.id) {
      item.id = 'cat_' + Date.now();
      this.data.catalog.push(item);
    } else {
      const idx = this.data.catalog.findIndex(c => c.id === item.id);
      if (idx !== -1) this.data.catalog[idx] = item;
      else this.data.catalog.push(item);
    }
    this.saveData(this.data);
    return item;
  }

  deleteCatalogItem(id) {
    this.data.catalog = this.data.catalog.filter(c => c.id !== id);
    this.saveData(this.data);
  }

  getExchangeRates() {
    return this.data.rates || { USD: 38.50, EUR: 41.20, GBP: 48.50, TRY: 1, lastUpdated: new Date().toISOString().slice(0,10) };
  }

  saveExchangeRates(rates, lastUpdated = null) {
    this.data.rates = {
      ...this.data.rates,
      ...rates,
      lastUpdated: lastUpdated || new Date().toISOString().slice(0,10)
    };
    this.saveData(this.data);
  }

  getProposals() {
    const all = this.data.proposals || [];
    return all.filter(p => !p.isProforma);
  }

  getProformas() {
    const all = this.data.proposals || [];
    return all.filter(p => p.isProforma === true);
  }

  getProposal(id) {
    const all = this.data.proposals || [];
    return all.find(p => p.id === id);
  }

  saveProposal(proposal) {
    if (!proposal.id) {
      proposal.id = 'tkl_' + Date.now();
      proposal.createdAt = new Date().toISOString();
      this.data.proposals.unshift(proposal);
    } else {
      const idx = this.data.proposals.findIndex(p => p.id === proposal.id);
      if (idx !== -1) this.data.proposals[idx] = proposal;
      else this.data.proposals.unshift(proposal);
    }
    this.saveData(this.data);
    return proposal;
  }

  updateProposalStatus(id, newStatus) {
    const proposal = this.getProposal(id);
    if (proposal) {
      proposal.status = newStatus;
      this.saveProposal(proposal);
      return proposal;
    }
    return null;
  }

  deleteProposal(id) {
    this.data.proposals = this.data.proposals.filter(p => p.id !== id);
    this.saveData(this.data);
  }

  exportAll() {
    return JSON.stringify(this.data, null, 2);
  }

  importAll(parsedData) {
    if (parsedData && parsedData.company && parsedData.proposals) {
      this.saveData(parsedData);
      return true;
    }
    return false;
  }
}

window.DB = new StorageEngine();
