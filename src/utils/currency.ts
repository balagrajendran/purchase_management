// Currency conversion utilities for FedHub Software Solutions
// Exchange rates are mock values - in production, these would come from a live API

export interface CurrencyInfo {
  code: string;
  symbol: string;
  name: string;
  rate: number; // Rate relative to INR (base currency)
}

export const SUPPORTED_CURRENCIES: CurrencyInfo[] = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', rate: 1 },
  { code: 'USD', symbol: '$', name: 'US Dollar', rate: 0.012 },
  { code: 'EUR', symbol: '€', name: 'Euro', rate: 0.011 },
  { code: 'GBP', symbol: '£', name: 'British Pound', rate: 0.009 },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', rate: 1.8 },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', rate: 0.018 },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', rate: 0.016 },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', rate: 0.016 },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc', rate: 0.011 },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', rate: 0.087 },
];

export const DEFAULT_CURRENCY = 'INR';

export function getCurrencyInfo(currencyCode: string): CurrencyInfo {
  return SUPPORTED_CURRENCIES.find(currency => currency.code === currencyCode) || SUPPORTED_CURRENCIES[0];
}

export function convertCurrency(amount: number, fromCurrency: string, toCurrency: string): number {
  const fromRate = getCurrencyInfo(fromCurrency).rate;
  const toRate = getCurrencyInfo(toCurrency).rate;
  
  // Convert to INR first, then to target currency
  const inrAmount = amount / fromRate;
  return inrAmount * toRate;
}

export function formatCurrency(amount: number, currencyCode: string): string {
  const currency = getCurrencyInfo(currencyCode);
  
  // Format based on currency
  switch (currencyCode) {
    case 'INR':
      return `${currency.symbol}${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    case 'USD':
    case 'AUD':
    case 'CAD':
    case 'SGD':
      return `${currency.symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    case 'EUR':
      return `${currency.symbol}${amount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    case 'GBP':
      return `${currency.symbol}${amount.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    case 'JPY':
    case 'CNY':
      return `${currency.symbol}${amount.toLocaleString('ja-JP', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    case 'CHF':
      return `${amount.toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency.symbol}`;
    default:
      return `${currency.symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
}

export function getCurrencySymbol(currencyCode: string): string {
  return getCurrencyInfo(currencyCode).symbol;
}

export function getAllCurrencies(): CurrencyInfo[] {
  return SUPPORTED_CURRENCIES;
}

// Get exchange rate disclaimer
export function getExchangeRateDisclaimer(): string {
  return "Exchange rates are indicative and may vary. Please verify current rates for actual transactions.";
}