import { DEFAULT_LOCALE } from './i18n.js';

function cleanString(value, max = 200) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, max);
}

function cleanArray(value) {
  if (!Array.isArray(value)) return [];
  return value.map((v) => cleanString(String(v), 80)).filter(Boolean);
}

export function normalizeMerchantSettings(body = {}) {
  return {
    locale: body.locale === 'en' ? 'en' : DEFAULT_LOCALE,
    timezone: cleanString(body.timezone || 'Asia/Riyadh', 60),
    settings: {
      analyticsHookUrl: cleanString(body.settings?.analyticsHookUrl || '', 300)
    }
  };
}

export function normalizeCampaignPayload(body = {}) {
  const titleAr = cleanString(body.title?.ar || body.titleAr || body.text?.ar || 'ينتهي العرض خلال', 120);
  const titleEn = cleanString(body.title?.en || body.titleEn || body.text?.en || '', 120);

  return {
    id: cleanString(body.id || '', 40) || undefined,
    name: cleanString(body.name || titleAr, 120),
    enabled: body.enabled !== false,
    locale: body.locale === 'en' ? 'en' : DEFAULT_LOCALE,
    timezone: cleanString(body.timezone || 'Asia/Riyadh', 60),
    layout: ['top_bar', 'product_inline', 'homepage_banner', 'announcement'].includes(body.layout) ? body.layout : 'top_bar',
    timer: {
      mode: body.timer?.mode === 'fixed' ? 'fixed' : 'evergreen',
      recurrence: ['none', 'daily', 'weekly', 'monthly'].includes(body.timer?.recurrence) ? body.timer.recurrence : 'none',
      durationHours: Number.isFinite(Number(body.timer?.durationHours)) ? Math.max(1, Math.min(720, Number(body.timer.durationHours))) : 24,
      startAt: body.timer?.startAt || null,
      endAt: body.timer?.endAt || null
    },
    schedule: {
      startAt: body.schedule?.startAt || null,
      endAt: body.schedule?.endAt || null
    },
    title: { ar: titleAr, en: titleEn },
    urgency: {
      enabled: body.urgency?.enabled !== false,
      text: {
        ar: cleanString(body.urgency?.text?.ar || body.urgency?.textAr || 'الكمية محدودة', 120),
        en: cleanString(body.urgency?.text?.en || body.urgency?.textEn || '', 120)
      }
    },
    cta: {
      enabled: body.cta?.enabled !== false,
      label: {
        ar: cleanString(body.cta?.label?.ar || body.cta?.labelAr || 'تسوق الآن', 80),
        en: cleanString(body.cta?.label?.en || body.cta?.labelEn || '', 80)
      },
      url: cleanString(body.cta?.url || '/collections/all', 300)
    },
    style: {
      textColor: cleanString(body.style?.textColor || '#ffffff', 30),
      backgroundColor: cleanString(body.style?.backgroundColor || '#0f172a', 30),
      accentColor: cleanString(body.style?.accentColor || '#f43f5e', 30),
      fontFamily: cleanString(body.style?.fontFamily || 'Tajawal, sans-serif', 120)
    },
    displayRules: {
      pages: cleanArray(body.displayRules?.pages || ['all']),
      productIds: cleanArray(body.displayRules?.productIds || []),
      collectionIds: cleanArray(body.displayRules?.collectionIds || [])
    },
    expired: {
      behavior: ['hide', 'show_message', 'restart'].includes(body.expired?.behavior) ? body.expired.behavior : 'hide',
      message: {
        ar: cleanString(body.expired?.message?.ar || body.expired?.textAr || 'انتهى العرض', 120),
        en: cleanString(body.expired?.message?.en || body.expired?.textEn || '', 120)
      }
    }
  };
}
