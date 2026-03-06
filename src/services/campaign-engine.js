import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';
import { DEFAULT_LOCALE, pickLocalizedText, t } from '../lib/i18n.js';

dayjs.extend(utc);
dayjs.extend(timezone);

const layouts = {
  top_bar: { position: 'top', preset: 'sticky' },
  product_inline: { position: 'product', preset: 'inline' },
  homepage_banner: { position: 'home', preset: 'banner' },
  announcement: { position: 'announcement', preset: 'pill' }
};

function isWithinSchedule(campaign, nowTz) {
  if (!campaign.schedule?.startAt && !campaign.schedule?.endAt) return true;
  const startsOk = campaign.schedule.startAt ? nowTz.isAfter(dayjs.tz(campaign.schedule.startAt, campaign.timezone)) : true;
  const endsOk = campaign.schedule.endAt ? nowTz.isBefore(dayjs.tz(campaign.schedule.endAt, campaign.timezone)) : true;
  return startsOk && endsOk;
}

function pageMatches(campaign, pageContext) {
  const pages = campaign.displayRules?.pages || ['all'];
  if (pages.includes('all')) return true;
  if (pageContext.pageType && pages.includes(pageContext.pageType)) return true;
  if (pageContext.productId && (campaign.displayRules?.productIds || []).includes(pageContext.productId)) return true;
  if (pageContext.collectionId && (campaign.displayRules?.collectionIds || []).includes(pageContext.collectionId)) return true;
  return false;
}

function nextRecurringTarget(campaign, nowTz) {
  const recurrence = campaign.timer?.recurrence;
  if (!recurrence || recurrence === 'none') return null;
  if (recurrence === 'daily') return nowTz.endOf('day');
  if (recurrence === 'weekly') return nowTz.endOf('week');
  if (recurrence === 'monthly') return nowTz.endOf('month');
  return null;
}

function resolveTimer(campaign, nowTz) {
  if (campaign.timer.mode === 'fixed' && campaign.timer.endAt) {
    const endAt = dayjs.tz(campaign.timer.endAt, campaign.timezone);
    if (endAt.isValid()) {
      return { endAt, startedAt: dayjs.tz(campaign.timer.startAt || campaign.schedule?.startAt || nowTz.toISOString(), campaign.timezone) };
    }
  }

  const recurring = nextRecurringTarget(campaign, nowTz);
  if (recurring) {
    const durationHours = campaign.timer.durationHours || 24;
    return { endAt: recurring, startedAt: recurring.subtract(durationHours, 'hour') };
  }

  const durationHours = campaign.timer.durationHours || 24;
  return { endAt: nowTz.add(durationHours, 'hour'), startedAt: nowTz };
}

export function normalizeCampaign(campaign, merchant) {
  return {
    ...campaign,
    timezone: campaign.timezone || merchant.timezone || 'Asia/Riyadh',
    locale: campaign.locale || merchant.locale || DEFAULT_LOCALE,
    enabled: campaign.enabled !== false,
    layout: campaign.layout || 'top_bar',
    title: {
      ar: campaign.title?.ar || campaign.text?.ar || t('countdown_offer_ends_in', 'ar'),
      en: campaign.title?.en || campaign.text?.en || ''
    },
    urgency: {
      enabled: campaign.urgency?.enabled !== false,
      text: {
        ar: campaign.urgency?.text?.ar || campaign.urgency?.textAr || t('urgency_low_stock', 'ar'),
        en: campaign.urgency?.text?.en || campaign.urgency?.textEn || ''
      }
    },
    cta: {
      enabled: campaign.cta?.enabled !== false,
      label: {
        ar: campaign.cta?.label?.ar || campaign.cta?.labelAr || t('cta_shop_now', 'ar'),
        en: campaign.cta?.label?.en || campaign.cta?.labelEn || ''
      },
      url: campaign.cta?.url || '/collections/all'
    },
    expired: {
      behavior: campaign.expired?.behavior || 'hide',
      message: {
        ar: campaign.expired?.message?.ar || campaign.expired?.textAr || t('status_offer_ended', 'ar'),
        en: campaign.expired?.message?.en || campaign.expired?.textEn || ''
      }
    },
    style: {
      textColor: '#ffffff',
      backgroundColor: '#0f172a',
      accentColor: '#f43f5e',
      fontFamily: 'Tajawal, sans-serif',
      ctaTextColor: '#0f172a',
      ctaBackgroundColor: '#facc15',
      ...(campaign.style || {})
    }
  };
}

export function resolveActiveCampaigns(merchant, pageContext = {}) {
  const locale = pageContext.locale === 'en' ? 'en' : DEFAULT_LOCALE;
  const nowTz = dayjs().tz(pageContext.timezone || merchant.timezone || 'Asia/Riyadh');

  return merchant.campaigns
    .map((campaign) => normalizeCampaign(campaign, merchant))
    .filter((campaign) => campaign.enabled)
    .filter((campaign) => pageMatches(campaign, pageContext))
    .filter((campaign) => isWithinSchedule(campaign, nowTz))
    .map((campaign) => {
      const timer = resolveTimer(campaign, nowTz);
      const expired = timer.endAt.isBefore(nowTz);
      const expirationBehavior = campaign.expired.behavior || 'hide';
      if (expired && expirationBehavior === 'hide') return null;

      return {
        id: campaign.id,
        name: campaign.name,
        locale,
        direction: locale === 'ar' ? 'rtl' : 'ltr',
        timezone: campaign.timezone,
        layout: campaign.layout,
        layoutMeta: layouts[campaign.layout] || layouts.top_bar,
        title: pickLocalizedText(campaign.title, locale),
        expiredMessage: pickLocalizedText(campaign.expired.message, locale),
        urgencyMessage: campaign.urgency.enabled ? pickLocalizedText(campaign.urgency.text, locale) : '',
        cta: {
          ...campaign.cta,
          label: pickLocalizedText(campaign.cta.label, locale)
        },
        labels: {
          days: t('countdown_days', locale),
          hours: t('countdown_hours', locale),
          minutes: t('countdown_minutes', locale),
          seconds: t('countdown_seconds', locale),
          timeLeft: t('countdown_time_left', locale)
        },
        style: campaign.style,
        timer: {
          mode: campaign.timer.mode,
          endAt: timer.endAt.toISOString(),
          startedAt: timer.startedAt.toISOString(),
          recurrence: campaign.timer.recurrence || 'none',
          expired,
          expirationBehavior
        },
        displayRules: campaign.displayRules,
        analytics: {
          campaignId: campaign.id,
          merchantId: merchant.id
        }
      };
    })
    .filter(Boolean);
}
