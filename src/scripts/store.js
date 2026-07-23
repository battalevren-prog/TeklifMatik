/**
 * TeklifMatik Storage Engine
 * Manages JSON data in localStorage with initial seed data
 */

const STORAGE_KEY = 'teklifmatik_db_v1';

const DEFAULT_DB = {
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
    pdfAccentColor: '#3b82f6'
  },

  clients: [
    {
      id: 'cli_1',
      name: 'Atlas Lojistik Dış Ticaret Ltd. Şti.',
      contactPerson: 'Ahmet Yılmaz (Genel Müdürü)',
      email: 'ahmet@atlaslojistik.com',
      phone: '+90 532 111 2233',
      taxOffice: 'Mecidiyeköy V.D.',
      taxNo: '1234567890',
      address: 'Gülbahar Mah. Avni Dilligil Sok. No:12 Şişli / İstanbul'
    },
    {
      id: 'cli_2',
      name: 'Simya Gıda & Restoran İşletmeleri',
      contactPerson: 'Ayşe Kaya (Operasyon Direktörü)',
      email: 'akaya@simyagida.com',
      phone: '+90 533 444 5566',
      taxOffice: 'Kadıköy V.D.',
      taxNo: '9876543210',
      address: 'Moda Cad. No: 45 Kadıköy / İstanbul'
    }
  ],

  catalog: [
    {
      id: 'cat_1',
      title: 'Özel Web Yazılım Geliştirme',
      type: 'service',
      unit: 'Proje',
      unitPrice: 75000,
      vatRate: 20
    },
    {
      id: 'cat_2',
      title: 'iOS & Android Mobil Uygulama',
      type: 'service',
      unit: 'Proje',
      unitPrice: 120000,
      vatRate: 20
    },
    {
      id: 'cat_3',
      title: 'UI/UX Arayüz & Deneyim Tasarımı',
      type: 'service',
      unit: 'Saat',
      unitPrice: 1500,
      vatRate: 20
    },
    {
      id: 'cat_4',
      title: 'Aylık Sunucu & Bakım Destek Paket',
      type: 'service',
      unit: 'Ay',
      unitPrice: 8500,
      vatRate: 20
    },
    {
      id: 'cat_5',
      title: 'Endüstriyel El Terminali & Barkod Okuyucu',
      type: 'product',
      unit: 'Adet',
      unitPrice: 14500,
      vatRate: 20
    },
    {
      id: 'cat_6',
      title: 'Termal Fiş & Etiket Yazıcı',
      type: 'product',
      unit: 'Adet',
      unitPrice: 6200,
      vatRate: 20
    }
  ],

  proposals: [
    {
      id: 'tkl_101',
      number: 'TKL-2026-001',
      clientId: 'cli_1',
      clientName: 'Atlas Lojistik Dış Ticaret Ltd. Şti.',
      date: '2026-07-20',
      validUntil: '2026-08-04',
      currency: 'TRY',
      status: 'approved', // draft, sent, approved, rejected, invoiced
      discountRate: 5,
      items: [
        {
          id: 'item_1',
          title: 'Özel Web Yazılım Geliştirme (Müşteri Portalı)',
          unit: 'Proje',
          quantity: 1,
          unitPrice: 75000,
          vatRate: 20
        },
        {
          id: 'item_2',
          title: 'Aylık Sunucu & Bakım Destek Paket',
          unit: 'Ay',
          quantity: 6,
          unitPrice: 8500,
          vatRate: 20
        }
      ],
      terms: '• Fiyatlarımıza KDV dahil değildir.\n• Teklifimiz 15 gün süreyle geçerlidir.\n• Ödeme %50 peşin, kalan teslimatta.',
      createdAt: '2026-07-20T10:00:00.000Z'
    },
    {
      id: 'tkl_102',
      number: 'TKL-2026-002',
      clientId: 'cli_2',
      clientName: 'Simya Gıda & Restoran İşletmeleri',
      date: '2026-07-22',
      validUntil: '2026-08-06',
      currency: 'TRY',
      status: 'sent',
      discountRate: 0,
      items: [
        {
          id: 'item_3',
          title: 'iOS & Android Mobil Uygulama (Sipariş Modülü)',
          unit: 'Proje',
          quantity: 1,
          unitPrice: 120000,
          vatRate: 20
        }
      ],
      terms: '• Fiyatlarımıza KDV dahil değildir.\n• %50 ön ödeme alınacaktır.',
      createdAt: '2026-07-22T14:30:00.000Z'
    }
  ]
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

  getCompany() {
    return this.data.company || DEFAULT_DB.company;
  }

  saveCompany(companyData) {
    this.data.company = { ...this.data.company, ...companyData };
    this.saveData(this.data);
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
    return this.data.proposals || [];
  }

  getProposal(id) {
    return this.getProposals().find(p => p.id === id);
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
