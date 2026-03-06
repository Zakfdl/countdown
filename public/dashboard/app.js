const merchantId =
  new URLSearchParams(window.location.search).get("merchantId") ||
  "demo-merchant";

const simpleForm = document.querySelector("#simpleForm");
const timerType = document.querySelector("#timerType");
const hoursField = document.querySelector("#hoursField");
const dateField = document.querySelector("#dateField");
const layoutSelect = document.querySelector("#layoutSelect");
const enableEnglish = document.querySelector("#enableEnglish");
const englishFields = document.querySelector("#englishFields");
const presetGrid = document.querySelector("#presetGrid");
const saveBtn = document.querySelector("#saveBtn");

const previewFrame = document.querySelector("#previewFrame");
const previewTop = document.querySelector("#previewTop");
const previewProduct = document.querySelector("#previewProduct");
const previewCard = document.querySelector("#previewCard");

const deviceSwitch = document.querySelector("#deviceSwitch");
const placementSwitch = document.querySelector("#placementSwitch");
const languageSwitch = document.querySelector("#languageSwitch");

let merchantTimezone = "Asia/Riyadh";
let activeCampaignId = null;
let currentPlacement = "top";
let previewLanguage = "ar";

const presets = {
  ramadan: {
    titleAr: "ينتهي عرض رمضان خلال",
    titleEn: "Ramadan offer ends in",
    ctaAr: "تسوق الآن",
    ctaEn: "Shop now",
    bgColor: "#065f46",
    textColor: "#ffffff",
    accentColor: "#facc15",
    layout: "top_bar",
  },
  white_friday: {
    titleAr: "عروض وايت فرايدي تنتهي خلال",
    titleEn: "White Friday ends in",
    ctaAr: "اطلب الآن",
    ctaEn: "Order now",
    bgColor: "#111827",
    textColor: "#ffffff",
    accentColor: "#ffffff",
    layout: "top_bar",
  },
  product_launch: {
    titleAr: "إطلاق المنتج يبدأ خلال",
    titleEn: "Product launch starts in",
    ctaAr: "اكتشف المنتج",
    ctaEn: "View product",
    bgColor: "#7c3aed",
    textColor: "#ffffff",
    accentColor: "#f59e0b",
    layout: "product_inline",
  },
  flash_sale: {
    titleAr: "Flash Sale لفترة محدودة",
    titleEn: "Flash sale ends soon",
    ctaAr: "احصل على العرض",
    ctaEn: "Get the deal",
    bgColor: "#991b1b",
    textColor: "#ffffff",
    accentColor: "#fb7185",
    layout: "announcement",
  },
  top_bar: {
    titleAr: "عرض اليوم ينتهي خلال",
    titleEn: "Today offer ends in",
    ctaAr: "تسوّق الآن",
    ctaEn: "Shop now",
    bgColor: "#0f172a",
    textColor: "#ffffff",
    accentColor: "#38bdf8",
    layout: "top_bar",
  },
};

function csvToArray(value) {
  return value
    ? value
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean)
    : [];
}

function orEmpty(value) {
  return value?.trim?.() ? value.trim() : "";
}

function pickText(ar, en) {
  if (previewLanguage === "en" && en && en.trim()) return en;
  return ar;
}

async function api(path, options = {}) {
  const response = await fetch(
    `/api${path}${path.includes("?") ? "&" : "?"}merchantId=${merchantId}`,
    {
      headers: { "Content-Type": "application/json" },
      ...options,
    },
  );
  return response.json();
}

function toDateTimeLocal(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function setTimerVisibility() {
  const fixedMode = timerType.value === "fixed";
  hoursField.classList.toggle("hidden", fixedMode);
  dateField.classList.toggle("hidden", !fixedMode);
}

function setEnglishVisibility() {
  englishFields.classList.toggle("hidden", !enableEnglish.checked);
  if (!enableEnglish.checked) {
    simpleForm.titleEn.value = "";
    simpleForm.ctaEn.value = "";
    simpleForm.expiredEn.value = "";
    if (previewLanguage === "en") setPreviewLanguage("ar");
  }
}

function setDevice(device) {
  previewFrame.classList.toggle("mobile", device === "mobile");
  previewFrame.classList.toggle("desktop", device !== "mobile");
  [...deviceSwitch.querySelectorAll("button")].forEach((button) => {
    button.classList.toggle("active", button.dataset.device === device);
  });
}

function setPreviewLanguage(language) {
  previewLanguage = language === "en" ? "en" : "ar";
  [...languageSwitch.querySelectorAll("button")].forEach((button) => {
    button.classList.toggle(
      "active",
      button.dataset.language === previewLanguage,
    );
  });
  renderPreview();
}

function setPlacement(placement) {
  currentPlacement = placement;
  [...placementSwitch.querySelectorAll("button")].forEach((button) => {
    button.classList.toggle("active", button.dataset.placement === placement);
  });

  previewTop.classList.toggle("active", placement === "top");
  previewProduct.classList.toggle("active", placement === "product");
  previewCard.classList.toggle("active", placement === "card");

  if (placement === "top") layoutSelect.value = "top_bar";
  if (placement === "product") layoutSelect.value = "product_inline";
  if (placement === "card") layoutSelect.value = "announcement";
}

function setPlacementFromLayout(layout) {
  if (layout === "product_inline") setPlacement("product");
  else if (layout === "announcement") setPlacement("card");
  else setPlacement("top");
}

function markActivePreset(name) {
  [...presetGrid.querySelectorAll(".preset-btn")].forEach((button) => {
    button.classList.toggle("active", button.dataset.preset === name);
  });
}

function countdownMarkup(state) {
  return `
    <div class="preview-widget" dir="${previewLanguage === "en" ? "ltr" : "rtl"}" style="background:${state.bgColor};color:${state.textColor};font-family:${state.fontFamily};">
      <div class="preview-message">${state.title}</div>
      <div class="preview-timer">${state.timerText}</div>
      <a class="preview-cta" href="#" style="background:${state.accentColor};">${state.cta}</a>
    </div>
  `;
}

function readPreviewState() {
  const fixedMode = timerType.value === "fixed";
  const hours = Number(simpleForm.durationHours.value || 24);
  const title = pickText(
    simpleForm.titleAr.value || "ينتهي العرض خلال",
    simpleForm.titleEn.value,
  );
  const cta = pickText(
    simpleForm.ctaAr.value || "تسوق الآن",
    simpleForm.ctaEn.value,
  );

  const timerText =
    previewLanguage === "en"
      ? fixedMode
        ? `Ends on ${simpleForm.endAt.value || "date not selected"}`
        : `Ends in ${hours} hours`
      : fixedMode
        ? `ينتهي في ${simpleForm.endAt.value || "تاريخ غير محدد"}`
        : `ينتهي خلال ${hours} ساعة`;

  return {
    title,
    cta,
    bgColor: simpleForm.bgColor.value,
    textColor: simpleForm.textColor.value,
    accentColor: simpleForm.accentColor.value,
    fontFamily: simpleForm.fontFamily.value || "Tajawal, sans-serif",
    timerText,
  };
}

function renderPreview() {
  const state = readPreviewState();
  const markup = countdownMarkup(state);
  previewTop.innerHTML = markup;
  previewProduct.innerHTML = `<h4>${previewLanguage === "en" ? "Product page" : "صفحة منتج"}</h4><div class="product-box">${previewLanguage === "en" ? "Pro Headphone · SAR 299" : "سماعات احترافية · 299 ر.س"}</div>${markup}`;
  previewCard.innerHTML = `<h4>${previewLanguage === "en" ? "Product card" : "بطاقة منتج"}</h4><div class="product-box">${previewLanguage === "en" ? "Fast seller · SAR 149" : "منتج سريع البيع · 149 ر.س"}</div>${markup}`;
}

function applyPreset(name) {
  const preset = presets[name];
  if (!preset) return;

  simpleForm.titleAr.value = preset.titleAr;
  simpleForm.titleEn.value = preset.titleEn;
  simpleForm.ctaAr.value = preset.ctaAr;
  simpleForm.ctaEn.value = preset.ctaEn;
  simpleForm.bgColor.value = preset.bgColor;
  simpleForm.textColor.value = preset.textColor;
  simpleForm.accentColor.value = preset.accentColor;
  setPlacementFromLayout(preset.layout);
  markActivePreset(name);

  if (enableEnglish.checked) {
    setPreviewLanguage("en");
  }

  renderPreview();
}

function fillFormFromCampaign(campaign, analyticsHookUrl) {
  if (!campaign) return;
  activeCampaignId = campaign.id;
  simpleForm.titleAr.value = campaign.title?.ar || "ينتهي العرض خلال";
  simpleForm.titleEn.value = campaign.title?.en || "";
  simpleForm.ctaAr.value = campaign.cta?.label?.ar || "تسوق الآن";
  simpleForm.ctaEn.value = campaign.cta?.label?.en || "";
  simpleForm.ctaUrl.value = campaign.cta?.url || "/collections/all";

  const isFixed = campaign.timer?.mode === "fixed";
  timerType.value = isFixed ? "fixed" : "hours";
  simpleForm.durationHours.value = campaign.timer?.durationHours || 24;
  simpleForm.endAt.value = toDateTimeLocal(
    campaign.timer?.endAt || campaign.schedule?.endAt,
  );

  simpleForm.bgColor.value = campaign.style?.backgroundColor || "#0f172a";
  simpleForm.textColor.value = campaign.style?.textColor || "#ffffff";
  simpleForm.accentColor.value = campaign.style?.accentColor || "#f43f5e";
  simpleForm.fontFamily.value =
    campaign.style?.fontFamily || "Tajawal, sans-serif";

  simpleForm.expiredAr.value = campaign.expired?.message?.ar || "انتهى العرض";
  simpleForm.expiredEn.value = campaign.expired?.message?.en || "";
  simpleForm.pages.value = (campaign.displayRules?.pages || ["all"]).join(",");
  simpleForm.recurrence.value = campaign.timer?.recurrence || "none";
  simpleForm.startAt.value = toDateTimeLocal(campaign.schedule?.startAt);

  enableEnglish.checked = Boolean(
    simpleForm.titleEn.value ||
    simpleForm.ctaEn.value ||
    simpleForm.expiredEn.value,
  );
  setEnglishVisibility();

  setPlacementFromLayout(campaign.layout);
  simpleForm.analyticsHookUrl.value = analyticsHookUrl || "";
  setTimerVisibility();
  renderPreview();
}

async function saveCampaign({ publish }) {
  await api("/settings", {
    method: "PUT",
    body: JSON.stringify({
      locale: "ar",
      timezone: merchantTimezone,
      settings: { analyticsHookUrl: simpleForm.analyticsHookUrl.value.trim() },
    }),
  });

  const fixedMode = timerType.value === "fixed";
  const endAt = fixedMode ? simpleForm.endAt.value : null;

  const payload = {
    id: activeCampaignId || undefined,
    name: simpleForm.titleAr.value.trim() || "حملة عد تنازلي",
    enabled: true,
    locale: "ar",
    timezone: merchantTimezone,
    layout: layoutSelect.value,
    timer: {
      mode: fixedMode ? "fixed" : "evergreen",
      recurrence: simpleForm.recurrence.value,
      durationHours: Number(simpleForm.durationHours.value || 24),
      startAt: simpleForm.startAt.value || null,
      endAt,
    },
    schedule: {
      startAt: simpleForm.startAt.value || null,
      endAt,
    },
    title: {
      ar: simpleForm.titleAr.value.trim(),
      en: enableEnglish.checked ? orEmpty(simpleForm.titleEn.value) : "",
    },
    urgency: {
      enabled: true,
      text: {
        ar: "الكمية محدودة",
        en: "",
      },
    },
    cta: {
      enabled: true,
      label: {
        ar: simpleForm.ctaAr.value.trim(),
        en: enableEnglish.checked ? orEmpty(simpleForm.ctaEn.value) : "",
      },
      url: simpleForm.ctaUrl.value.trim(),
    },
    style: {
      textColor: simpleForm.textColor.value,
      backgroundColor: simpleForm.bgColor.value,
      accentColor: simpleForm.accentColor.value,
      fontFamily: simpleForm.fontFamily.value || "Tajawal, sans-serif",
    },
    displayRules: {
      pages: csvToArray(simpleForm.pages.value),
      productIds: [],
      collectionIds: [],
    },
    expired: {
      behavior: "show_message",
      message: {
        ar: simpleForm.expiredAr.value.trim() || "انتهى العرض",
        en: enableEnglish.checked ? orEmpty(simpleForm.expiredEn.value) : "",
      },
    },
  };

  await api("/campaigns", { method: "POST", body: JSON.stringify(payload) });
  alert(publish ? "تم النشر في سلة بنجاح" : "تم الحفظ بنجاح");
  await bootstrap();
}

async function bootstrap() {
  const { merchant } = await api("/merchant");
  merchantTimezone = merchant.timezone || "Asia/Riyadh";

  const [campaign] = merchant.campaigns || [];
  if (campaign) {
    fillFormFromCampaign(campaign, merchant.settings?.analyticsHookUrl || "");
  } else {
    simpleForm.analyticsHookUrl.value =
      merchant.settings?.analyticsHookUrl || "";
    setTimerVisibility();
    setEnglishVisibility();
    renderPreview();
  }
}

presetGrid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-preset]");
  if (!button) return;
  applyPreset(button.dataset.preset);
});

layoutSelect.addEventListener("change", () => {
  setPlacementFromLayout(layoutSelect.value);
  renderPreview();
});

timerType.addEventListener("change", () => {
  setTimerVisibility();
  renderPreview();
});

enableEnglish.addEventListener("change", () => {
  setEnglishVisibility();
  renderPreview();
});

simpleForm.addEventListener("input", renderPreview);
simpleForm.addEventListener("change", renderPreview);

placementSwitch.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-placement]");
  if (!button) return;
  setPlacement(button.dataset.placement);
  renderPreview();
});

deviceSwitch.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-device]");
  if (!button) return;
  setDevice(button.dataset.device);
});

languageSwitch.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-language]");
  if (!button) return;
  if (button.dataset.language === "en" && !enableEnglish.checked) {
    enableEnglish.checked = true;
    setEnglishVisibility();
  }
  setPreviewLanguage(button.dataset.language);
});

saveBtn.addEventListener("click", async () => {
  await saveCampaign({ publish: false });
});

simpleForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await saveCampaign({ publish: true });
});

setDevice("desktop");
setPlacement(currentPlacement);
setPreviewLanguage("ar");
bootstrap();
