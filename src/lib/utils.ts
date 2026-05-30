export function cn(...inputs: (string | null | undefined | false)[]): string {
  return inputs.filter(Boolean).join(' ');
}

export function uid(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export function getRiskColor(level: string): string {
  switch (level?.toLowerCase()) {
    case 'critical': return 'text-red-600 bg-red-50 border-red-200';
    case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
    case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    case 'low': return 'text-green-600 bg-green-50 border-green-200';
    default: return 'text-gray-600 bg-gray-50 border-gray-200';
  }
}

export function getScoreColor(score: number): string {
  if (score >= 80) return 'text-red-600';
  if (score >= 50) return 'text-orange-600';
  if (score >= 20) return 'text-yellow-600';
  return 'text-green-600';
}

const idrCurrencyFormatter = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 });
const dateTimeFormatter = new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' });

export function formatCurrency(value: number | null | undefined, currency: string | null): string {
  if (value == null) return '---';
  const c = currency || 'IDR';
  if (c === 'IDR') return idrCurrencyFormatter.format(value);
  return `${c} ${value.toLocaleString('id-ID')}`;
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return '---';
  return dateTimeFormatter.format(new Date(date));
}
