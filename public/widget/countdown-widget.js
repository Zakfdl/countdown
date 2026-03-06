(function initCountdownWidget() {
  const script = document.currentScript;
  const merchantId = script?.dataset.merchantId || 'demo-merchant';
  const pageType = script?.dataset.pageType || 'all';
  const productId = script?.dataset.productId || '';
  const collectionId = script?.dataset.collectionId || '';
  const storeLocale = resolveStoreLocale(script);

  const url = new URL(`${script?.dataset.apiBase || window.location.origin}/api/widget-config`);
  url.searchParams.set('merchantId', merchantId);
  url.searchParams.set('pageType', pageType);
  url.searchParams.set('locale', storeLocale);
  if (productId) url.searchParams.set('productId', productId);
  if (collectionId) url.searchParams.set('collectionId', collectionId);

  fetch(url)
    .then((res) => res.json())
    .then((payload) => {
      payload.campaigns.forEach((campaign) => renderCampaign(campaign, payload.analyticsHookUrl));
    });

  function resolveStoreLocale(activeScript) {
    const fromData = activeScript?.dataset.locale;
    if (fromData === 'en') return 'en';
    const fromHtml = document.documentElement.lang?.toLowerCase();
    if (fromHtml?.startsWith('en')) return 'en';
    return 'ar';
  }

  function renderCampaign(campaign, analyticsHookUrl) {
    const target = resolveTarget(campaign.layout);
    if (!target) return;

    const root = document.createElement('section');
    root.className = `countdown-widget countdown-${campaign.layout}`;
    root.dir = campaign.direction || (campaign.locale === 'en' ? 'ltr' : 'rtl');
    root.style.cssText = `
      background:${campaign.style.backgroundColor};
      color:${campaign.style.textColor};
      font-family:${campaign.style.fontFamily};
      border-bottom: 3px solid ${campaign.style.accentColor};
      padding: 12px 16px;
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:12px;
      z-index:9999;
      ${campaign.layout === 'top_bar' ? 'position:sticky;top:0;' : ''}
    `;

    const content = document.createElement('div');
    content.style.display = 'flex';
    content.style.alignItems = 'center';
    content.style.gap = '8px';
    content.style.flexWrap = 'wrap';

    const textNode = document.createElement('strong');
    const urgency = document.createElement('small');
    const countdown = document.createElement('span');
    countdown.style.direction = 'ltr';
    countdown.style.display = 'inline-flex';
    countdown.style.gap = '6px';

    urgency.textContent = campaign.urgencyMessage || '';
    textNode.textContent = campaign.title;
    content.append(textNode, urgency, countdown);

    const cta = document.createElement('a');
    if (campaign.cta?.enabled) {
      cta.href = campaign.cta.url;
      cta.textContent = campaign.cta.label;
      cta.style.cssText = `padding:8px 12px;border-radius:8px;text-decoration:none;background:${campaign.style.accentColor};color:${campaign.style.ctaTextColor || '#0f172a'};`;
      cta.addEventListener('click', () => emitAnalytics('cta_click', campaign, analyticsHookUrl));
    }

    root.append(content);
    if (campaign.cta?.enabled) root.append(cta);
    target.prepend(root);

    const endAt = new Date(campaign.timer.endAt).getTime();
    const timer = setInterval(() => {
      const left = endAt - Date.now();
      if (left <= 0) {
        clearInterval(timer);
        if (campaign.timer.expirationBehavior === 'show_message') {
          countdown.textContent = campaign.expiredMessage;
          return;
        }
        if (campaign.timer.expirationBehavior === 'restart') {
          location.reload();
          return;
        }
        root.remove();
        return;
      }

      const d = Math.floor(left / (1000 * 60 * 60 * 24));
      const h = Math.floor((left % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const m = Math.floor((left % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((left % (1000 * 60)) / 1000);
      countdown.textContent = `${campaign.labels.timeLeft}: ${d} ${campaign.labels.days} • ${String(h).padStart(2, '0')} ${campaign.labels.hours} • ${String(m).padStart(2, '0')} ${campaign.labels.minutes} • ${String(s).padStart(2, '0')} ${campaign.labels.seconds}`;
    }, 1000);

    emitAnalytics('impression', campaign, analyticsHookUrl);
  }

  function resolveTarget(layout) {
    if (layout === 'homepage_banner') return document.querySelector('[data-countdown-home]') || document.body;
    if (layout === 'product_inline') return document.querySelector('[data-countdown-product]') || document.body;
    if (layout === 'announcement') return document.querySelector('[data-countdown-announcement]') || document.body;
    return document.body;
  }

  function emitAnalytics(type, campaign, hookUrl) {
    if (!hookUrl) return;
    navigator.sendBeacon(hookUrl, JSON.stringify({ type, campaignId: campaign.id, at: new Date().toISOString() }));
  }
})();
