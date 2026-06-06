/**
 * Utility helper to format numbers and prices in French locale ('fr-FR')
 * using Latin digits, standard comma decimals, and spaces for thousands grouping.
 */
export function formatFr(value: number | string | null | undefined, decimals: number = 2): string {
  if (value === null || value === undefined) return '';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0,00';
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}
