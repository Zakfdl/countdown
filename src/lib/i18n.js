export const DEFAULT_LOCALE = 'ar';

export const localeDictionary = {
  ar: {
    countdown_offer_ends_in: 'ينتهي العرض خلال',
    countdown_starts_in: 'يبدأ خلال',
    countdown_time_left: 'الوقت المتبقي',
    countdown_days: 'الأيام',
    countdown_hours: 'الساعات',
    countdown_minutes: 'الدقائق',
    countdown_seconds: 'الثواني',
    cta_shop_now: 'تسوق الآن',
    status_offer_ended: 'انتهى العرض',
    urgency_low_stock: 'الكمية محدودة'
  },
  en: {
    countdown_offer_ends_in: 'Offer ends in',
    countdown_starts_in: 'Starts in',
    countdown_time_left: 'Time left',
    countdown_days: 'Days',
    countdown_hours: 'Hours',
    countdown_minutes: 'Minutes',
    countdown_seconds: 'Seconds',
    cta_shop_now: 'Shop now',
    status_offer_ended: 'Offer ended',
    urgency_low_stock: 'Low stock available'
  }
};

export function resolveLocale(preferredLocale) {
  if (preferredLocale === 'en') return 'en';
  return DEFAULT_LOCALE;
}

export function t(key, preferredLocale = DEFAULT_LOCALE) {
  const locale = resolveLocale(preferredLocale);
  return localeDictionary[locale]?.[key] || localeDictionary[DEFAULT_LOCALE][key] || key;
}

export function pickLocalizedText(value, locale = DEFAULT_LOCALE) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (locale === 'en' && value.en && value.en.trim()) return value.en;
  return value.ar || value.en || '';
}
