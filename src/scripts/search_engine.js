/**
 * Advanced Search & Wildcard Matching Engine for TeklifMatik
 */

function normalizeSearchText(str) {
  if (str === null || str === undefined) return '';
  return str.toString()
    .toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/ş/g, 's')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/İ/g, 'i')
    .replace(/Ş/g, 's')
    .replace(/Ğ/g, 'g')
    .replace(/Ü/g, 'u')
    .replace(/Ö/g, 'o')
    .replace(/Ç/g, 'c')
    .trim();
}

function matchSearchPattern(targetText, queryStr) {
  if (!queryStr || !queryStr.trim()) return true;
  if (!targetText) return false;

  const normTarget = normalizeSearchText(targetText);
  const normQuery = normalizeSearchText(queryStr);

  // Wildcard '*' Joker Matching
  if (normQuery.includes('*')) {
    try {
      const regexPattern = normQuery
        .split('*')
        .map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('.*');
      const regex = new RegExp(regexPattern, 'i');
      return regex.test(normTarget);
    } catch (e) {
      // Fallback if regex fails
    }
  }

  // Multi-word AND Matching
  const tokens = normQuery.split(/\s+/).filter(Boolean);
  return tokens.every(token => normTarget.includes(token));
}

window.normalizeSearchText = normalizeSearchText;
window.matchSearchPattern = matchSearchPattern;
