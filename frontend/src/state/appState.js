export const PAGE_IDS = Object.freeze([
  'text',
  'image',
  'voice',
  'multimodal',
  'coach',
  'analysis',
  'history',
  'settings',
]);

export const DEFAULT_PAGE = 'text';

export function normalizePage(page) {
  return PAGE_IDS.includes(page) ? page : DEFAULT_PAGE;
}