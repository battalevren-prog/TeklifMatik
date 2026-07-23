/**
 * TeklifMatik Currency & TCMB Exchange Rates Controller
 */

class CurrencyEngine {
  constructor() {
    this.cachedRates = {
      TRY: 1,
      USD: 38.50,
      EUR: 41.20,
      GBP: 48.50
    };
    this.lastFetchedDate = null;
  }

  getCurrencySymbol(currency = 'TRY') {
    switch (currency) {
      case 'USD': return '$';
      case 'EUR': return '€';
      case 'GBP': return '£';
      case 'TRY':
      default: return '₺';
    }
  }

  /**
   * Formats TCMB date format from YYYY-MM-DD to YYYYMM/DDMMYYYY.xml
   */
  getTCMBUrlForDate(dateStr) {
    if (!dateStr) return 'https://www.tcmb.gov.tr/kurlar/today.xml';

    const parts = dateStr.split('-');
    if (parts.length !== 3) return 'https://www.tcmb.gov.tr/kurlar/today.xml';

    const year = parts[0];
    const month = parts[1];
    const day = parts[2];

    const todayStr = new Date().toISOString().slice(0, 10);
    if (dateStr === todayStr) {
      return 'https://www.tcmb.gov.tr/kurlar/today.xml';
    }

    return `https://www.tcmb.gov.tr/kurlar/${year}${month}/${day}${month}${year}.xml`;
  }

  /**
   * Fetches exchange rates from TCMB XML
   */
  async fetchTCMBRates(dateStr = null) {
    const url = this.getTCMBUrlForDate(dateStr);

    try {
      const response = await fetch(url);
      if (!response.ok) {
        if (url !== 'https://www.tcmb.gov.tr/kurlar/today.xml') {
          return await this.fetchTCMBRates(null);
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const xmlText = await response.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

      const usdNode = xmlDoc.querySelector('Currency[CurrencyCode="USD"]');
      const eurNode = xmlDoc.querySelector('Currency[CurrencyCode="EUR"]');
      const gbpNode = xmlDoc.querySelector('Currency[CurrencyCode="GBP"]');

      const parseVal = (node, selector) => {
        if (!node) return null;
        const el = node.querySelector(selector);
        if (!el || !el.textContent) return null;
        return parseFloat(el.textContent.replace(',', '.'));
      };

      const usdRate = parseVal(usdNode, 'ForexSelling') || parseVal(usdNode, 'BanknoteSelling');
      const eurRate = parseVal(eurNode, 'ForexSelling') || parseVal(eurNode, 'BanknoteSelling');
      const gbpRate = parseVal(gbpNode, 'ForexSelling') || parseVal(gbpNode, 'BanknoteSelling');

      if (usdRate) this.cachedRates.USD = usdRate;
      if (eurRate) this.cachedRates.EUR = eurRate;
      if (gbpRate) this.cachedRates.GBP = gbpRate;

      this.lastFetchedDate = dateStr || new Date().toISOString().slice(0, 10);
      
      if (window.DB) {
        window.DB.saveExchangeRates(this.cachedRates, this.lastFetchedDate);
      }

      return {
        success: true,
        rates: this.cachedRates,
        date: this.lastFetchedDate
      };
    } catch (error) {
      console.warn('TCMB kur çekme hatası, kayıtlı kurlar kullanılıyor:', error);
      
      if (window.DB) {
        const dbRates = window.DB.getExchangeRates();
        if (dbRates && dbRates.rates) {
          this.cachedRates = { ...this.cachedRates, ...dbRates.rates };
        }
      }

      return {
        success: false,
        error: error.message,
        rates: this.cachedRates,
        date: this.lastFetchedDate
      };
    }
  }

  /**
   * Converts an amount between two currencies
   */
  convert(amount, fromCurr = 'TRY', toCurr = 'TRY', rates = null) {
    const activeRates = rates || this.cachedRates;
    const num = parseFloat(amount) || 0;

    if (fromCurr === toCurr) return num;

    const fromRateInTRY = activeRates[fromCurr] || 1;
    const toRateInTRY = activeRates[toCurr] || 1;

    const amountInTRY = num * fromRateInTRY;
    const converted = amountInTRY / toRateInTRY;

    return converted;
  }
}

window.CurrencyEngine = new CurrencyEngine();
window.getCurrencySymbol = window.CurrencyEngine.getCurrencySymbol.bind(window.CurrencyEngine);
