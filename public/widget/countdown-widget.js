(function initCountdownWidget() {
  const script = document.currentScript;
  const merchantId = script?.dataset.merchantId || "demo-merchant";
  const pageType = script?.dataset.pageType || "all";
  const productId = script?.dataset.productId || "";
  const collectionId = script?.dataset.collectionId || "";
  const storeLocale = resolveStoreLocale(script);
  const apiBase = script?.dataset.apiBase || window.location.origin;

  const url = new URL(`${apiBase}/api/widget-config`);
  url.searchParams.set("merchantId", merchantId);
  url.searchParams.set("pageType", pageType);
  url.searchParams.set("locale", storeLocale);
  if (productId) url.searchParams.set("productId", productId);
  if (collectionId) url.searchParams.set("collectionId", collectionId);

  fetch(url)
    .then((res) => res.json())
    .then((payload) => {
      const data = payload?.data || payload || {};
      const campaigns = Array.isArray(data.campaigns) ? data.campaigns : [];
      const analyticsHookUrl = data.analyticsHookUrl || "";

      campaigns.forEach((campaign) =>
        renderCampaign(campaign, analyticsHookUrl),
      );
    })
    .catch((error) => {
      console.error("Countdown widget failed to load:", error);
    });

  function resolveStoreLocale(activeScript) {
    const fromData = activeScript?.dataset.locale;
    if (fromData === "en") return "en";

    const fromHtml = document.documentElement.lang?.toLowerCase();
    if (fromHtml?.startsWith("en")) return "en";

    return "ar";
  }

  function renderCampaign(campaign, analyticsHookUrl) {
    const target = resolveTarget(campaign.layout);
    if (!target) return;

    const root = document.createElement("section");
    root.className = `countdown-widget countdown-${campaign.layout}`;
    root.dir = campaign.direction || (campaign.locale === "en" ? "ltr" : "rtl");
    root.style.cssText = `
      background: ${campaign.style.backgroundColor};
      color: ${campaign.style.textColor};
      font-family: ${campaign.style.fontFamily};
      border-bottom: 3px solid ${campaign.style.accentColor};
      padding: 12px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      z-index: 9999;
      ${campaign.layout === "top_bar" ? "position: sticky; top: 0;" : ""}
    `;

    const content = document.createElement("div");
    content.style.display = "flex";
    content.style.alignItems = "center";
    content.style.gap = "8px";
    content.style.flexWrap = "wrap";

    const textNode = document.createElement("strong");
    textNode.textContent = campaign.title || "";

    const urgency = document.createElement("small");
    urgency.textContent = campaign.urgencyMessage || "";

    const countdown = document.createElement("span");
    countdown.style.direction = "ltr";
    countdown.style.display = "inline-flex";
    countdown.style.gap = "6px";

    content.append(textNode, urgency, countdown);

    let cta = null;
    if (campaign.cta?.enabled) {
      cta = document.createElement("a");
      cta.href = campaign.cta.url;
      cta.textContent = campaign.cta.label;
      cta.style.cssText = `
        padding: 8px 12px;
        border-radius: 8px;
        text-decoration: none;
        background: ${campaign.style.accentColor};
        color: ${campaign.style.ctaTextColor || "#0f172a"};
      `;
      cta.addEventListener("click", () =>
        emitAnalytics("cta_click", campaign, analyticsHookUrl),
      );
    }

    root.append(content);
    if (cta) root.append(cta);
    target.prepend(root);

    const endAt = new Date(campaign.timer.endAt).getTime();

    function tick() {
      const left = endAt - Date.now();

      if (left <= 0) {
        if (campaign.timer.expirationBehavior === "show_message") {
          countdown.textContent = campaign.expiredMessage || "";
          return true;
        }

        if (campaign.timer.expirationBehavior === "restart") {
          window.location.reload();
          return true;
        }

        root.remove();
        return true;
      }

      const parts = formatCountdown(left);
      countdown.textContent =
        `${campaign.labels.timeLeft}: ` +
        `${String(parts.d).padStart(2, "0")} ${campaign.labels.days} • ` +
        `${String(parts.h).padStart(2, "0")} ${campaign.labels.hours} • ` +
        `${String(parts.m).padStart(2, "0")} ${campaign.labels.minutes} • ` +
        `${String(parts.s).padStart(2, "0")} ${campaign.labels.seconds}`;

      return false;
    }

    const finishedImmediately = tick();
    if (!finishedImmediately) {
      const intervalId = window.setInterval(() => {
        const finished = tick();
        if (finished) {
          window.clearInterval(intervalId);
        }
      }, 1000);
    }

    emitAnalytics("impression", campaign, analyticsHookUrl);
  }

  function resolveTarget(layout) {
    if (layout === "homepage_banner") {
      return document.querySelector("[data-countdown-home]") || document.body;
    }

    if (layout === "product_inline") {
      return (
        document.querySelector("[data-countdown-product]") || document.body
      );
    }

    if (layout === "announcement") {
      return (
        document.querySelector("[data-countdown-announcement]") || document.body
      );
    }

    return document.body;
  }

  function formatCountdown(ms) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const d = Math.floor(totalSeconds / 86400);
    const h = Math.floor((totalSeconds % 86400) / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;

    return { d, h, m, s };
  }

  function emitAnalytics(type, campaign, hookUrl) {
    if (!hookUrl || !navigator.sendBeacon) return;

    const payload = JSON.stringify({
      type,
      campaignId: campaign.id,
      at: new Date().toISOString(),
    });

    navigator.sendBeacon(hookUrl, payload);
  }
})();
