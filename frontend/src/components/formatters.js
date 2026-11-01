const currencyLocales = {
  EUR: 'en-IE',
  GBP: 'en-GB',
  INR: 'en-IN',
  USD: 'en-US',
}

export function formatCurrency(amount, currency = 'INR', compact = false, maximumFractionDigits = 0) {
  const value = Number(amount) || 0
  return new Intl.NumberFormat(currencyLocales[currency] ?? 'en', {
    style: 'currency',
    currency,
    maximumFractionDigits,
    notation: compact && Math.abs(value) >= 1_000_000 ? 'compact' : 'standard',
  }).format(value)
}
