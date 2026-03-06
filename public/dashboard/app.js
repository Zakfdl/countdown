const merchantId = new URLSearchParams(window.location.search).get('merchantId') || 'demo-merchant';

const merchantForm = document.querySelector('#merchantForm');
const campaignForm = document.querySelector('#campaignForm');
const campaignList = document.querySelector('#campaignList');

const templates = {
  ramadan: { titleAr: 'ينتهي عرض رمضان خلال', titleEn: 'Ramadan offer ends in', bgColor: '#065f46', accentColor: '#facc15' },
  eid: { titleAr: 'عروض العيد تنتهي خلال', titleEn: 'Eid deal ends in', bgColor: '#1d4ed8', accentColor: '#f9a8d4' },
  white_friday: { titleAr: 'الوايت فرايدي ينتهي خلال', titleEn: 'White Friday ends in', bgColor: '#111827', accentColor: '#ffffff' },
  product_launch: { titleAr: 'إطلاق المنتج يبدأ خلال', titleEn: 'Launch starts in', bgColor: '#7c3aed', accentColor: '#f59e0b' },
  clearance: { titleAr: 'تصفية المخزون تنتهي خلال', titleEn: 'Clearance ends in', bgColor: '#7f1d1d', accentColor: '#f97316' }
};

function csvToArray(value) {
  return value ? value.split(',').map((v) => v.trim()).filter(Boolean) : [];
}

function orEmpty(value) {
  return value?.trim?.() ? value.trim() : '';
}

async function api(path, options = {}) {
  const response = await fetch(`/api${path}${path.includes('?') ? '&' : '?'}merchantId=${merchantId}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  return response.json();
}

function getLocalizedText(entry, locale) {
  if (!entry) return '';
  if (locale === 'en' && entry.en?.trim()) return entry.en;
  return entry.ar || entry.en || '';
}

function renderCampaigns(campaigns, locale) {
  campaignList.innerHTML = '';
  campaigns.forEach((campaign) => {
    const item = document.createElement('div');
    item.className = 'item';
    const title = getLocalizedText(campaign.title, locale);
    item.innerHTML = `
      <div>
        <strong>${title || campaign.name}</strong>
        <div class="small">${campaign.layout} · ${campaign.timer.mode} · ${campaign.enabled ? 'مفعلة' : 'متوقفة'}</div>
      </div>
      <div class="item-actions">
        <button data-action="edit" data-id="${campaign.id}">تعديل</button>
        <button data-action="delete" data-id="${campaign.id}">حذف</button>
      </div>`;
    campaignList.appendChild(item);
  });
}

function populateCampaignForm(campaign) {
  campaignForm.id.value = campaign.id;
  campaignForm.name.value = campaign.name || '';
  campaignForm.layout.value = campaign.layout;
  campaignForm.timerMode.value = campaign.timer.mode;
  campaignForm.recurrence.value = campaign.timer.recurrence || 'none';
  campaignForm.durationHours.value = campaign.timer.durationHours || 24;
  campaignForm.startAt.value = campaign.schedule?.startAt || '';
  campaignForm.endAt.value = campaign.schedule?.endAt || '';
  campaignForm.titleAr.value = campaign.title?.ar || '';
  campaignForm.titleEn.value = campaign.title?.en || '';
  campaignForm.urgencyAr.value = campaign.urgency?.text?.ar || '';
  campaignForm.urgencyEn.value = campaign.urgency?.text?.en || '';
  campaignForm.ctaAr.value = campaign.cta?.label?.ar || '';
  campaignForm.ctaEn.value = campaign.cta?.label?.en || '';
  campaignForm.ctaUrl.value = campaign.cta?.url || '';
  campaignForm.textColor.value = campaign.style?.textColor || '#ffffff';
  campaignForm.bgColor.value = campaign.style?.backgroundColor || '#0f172a';
  campaignForm.accentColor.value = campaign.style?.accentColor || '#f43f5e';
  campaignForm.fontFamily.value = campaign.style?.fontFamily || 'Tajawal, sans-serif';
  campaignForm.pages.value = (campaign.displayRules?.pages || []).join(',');
  campaignForm.productIds.value = (campaign.displayRules?.productIds || []).join(',');
  campaignForm.collectionIds.value = (campaign.displayRules?.collectionIds || []).join(',');
  campaignForm.expiryBehavior.value = campaign.expired?.behavior || 'hide';
  campaignForm.expiredAr.value = campaign.expired?.message?.ar || '';
  campaignForm.expiredEn.value = campaign.expired?.message?.en || '';
  campaignForm.enabled.checked = campaign.enabled;
}

function applyUiDirection(locale) {
  document.body.dataset.uiLocale = locale === 'en' ? 'en' : 'ar';
  document.documentElement.lang = locale === 'en' ? 'en' : 'ar';
  document.documentElement.dir = locale === 'en' ? 'ltr' : 'rtl';
}

async function bootstrap() {
  const { merchant } = await api('/merchant');
  merchantForm.locale.value = merchant.locale || 'ar';
  merchantForm.timezone.value = merchant.timezone;
  merchantForm.analyticsHookUrl.value = merchant.settings.analyticsHookUrl || '';
  applyUiDirection(merchant.locale);
  renderCampaigns(merchant.campaigns, merchant.locale);
}

merchantForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const locale = merchantForm.locale.value === 'en' ? 'en' : 'ar';
  await api('/settings', {
    method: 'PUT',
    body: JSON.stringify({
      locale,
      timezone: merchantForm.timezone.value,
      settings: { analyticsHookUrl: merchantForm.analyticsHookUrl.value }
    })
  });
  applyUiDirection(locale);
  alert(locale === 'en' ? 'Merchant settings updated' : 'تم تحديث إعدادات التاجر');
});

campaignForm.template.addEventListener('change', () => {
  const chosen = templates[campaignForm.template.value];
  if (!chosen) return;
  campaignForm.titleAr.value = chosen.titleAr;
  campaignForm.titleEn.value = chosen.titleEn;
  campaignForm.bgColor.value = chosen.bgColor;
  campaignForm.accentColor.value = chosen.accentColor;
});

campaignForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const payload = {
    id: campaignForm.id.value || undefined,
    name: campaignForm.name.value,
    enabled: campaignForm.enabled.checked,
    locale: merchantForm.locale.value === 'en' ? 'en' : 'ar',
    timezone: merchantForm.timezone.value,
    layout: campaignForm.layout.value,
    timer: {
      mode: campaignForm.timerMode.value,
      recurrence: campaignForm.recurrence.value,
      durationHours: Number(campaignForm.durationHours.value),
      startAt: campaignForm.startAt.value || null,
      endAt: campaignForm.endAt.value || null
    },
    schedule: {
      startAt: campaignForm.startAt.value || null,
      endAt: campaignForm.endAt.value || null
    },
    title: { ar: campaignForm.titleAr.value.trim(), en: orEmpty(campaignForm.titleEn.value) },
    urgency: {
      enabled: true,
      text: { ar: campaignForm.urgencyAr.value.trim(), en: orEmpty(campaignForm.urgencyEn.value) }
    },
    cta: {
      enabled: true,
      label: { ar: campaignForm.ctaAr.value.trim(), en: orEmpty(campaignForm.ctaEn.value) },
      url: campaignForm.ctaUrl.value
    },
    style: {
      textColor: campaignForm.textColor.value,
      backgroundColor: campaignForm.bgColor.value,
      accentColor: campaignForm.accentColor.value,
      fontFamily: campaignForm.fontFamily.value
    },
    displayRules: {
      pages: csvToArray(campaignForm.pages.value),
      productIds: csvToArray(campaignForm.productIds.value),
      collectionIds: csvToArray(campaignForm.collectionIds.value)
    },
    expired: {
      behavior: campaignForm.expiryBehavior.value,
      message: { ar: campaignForm.expiredAr.value.trim(), en: orEmpty(campaignForm.expiredEn.value) }
    }
  };

  await api('/campaigns', { method: 'POST', body: JSON.stringify(payload) });
  campaignForm.reset();
  campaignForm.template.value = 'custom';
  await bootstrap();
});

campaignList.addEventListener('click', async (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  const { action, id } = button.dataset;
  const { merchant } = await api('/merchant');
  const campaign = merchant.campaigns.find((entry) => entry.id === id);

  if (action === 'edit' && campaign) {
    populateCampaignForm(campaign);
  }

  if (action === 'delete') {
    await api(`/campaigns/${id}`, { method: 'DELETE' });
    await bootstrap();
  }
});

bootstrap();
