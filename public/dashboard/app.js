const merchantId =
  new URLSearchParams(window.location.search).get("merchantId") ||
  "demo-merchant";

const form = document.querySelector("#campaignForm");
const statusBox = document.querySelector("#statusBox");
const presetButtons = document.querySelectorAll(".preset-btn");
const campaignList = document.querySelector("#campaignList");

const timerType = document.querySelector("#timerType");
const hoursField = document.querySelector("#hoursField");
const endDateField = document.querySelector("#endDateField");
const layoutSelect = document.querySelector("#layoutSelect");
const enableEnglish = document.querySelector("#enableEnglish");
const englishFields = document.querySelector("#englishFields");
const saveBtn = document.querySelector("#saveBtn");
const publishBtn = document.querySelector("#publishBtn");

const previewFrame = document.querySelector("#previewFrame");
const previewTop = document.querySelector("#previewTop");
const previewProduct = document.querySelector("#previewProduct");
const previewCard = document.querySelector("#previewCard");

const deviceSwitch = document.querySelector("#deviceSwitch");
const placementSwitch = document.querySelector("#placementSwitch");
const previewLangSwitch = document.querySelector("#previewLangSwitch");

let campaigns = [];
let merchantTimezone = "Asia/Riyadh";
let previewLanguage = "ar";
let currentPlacement = "top";
let previewTimerInterval = null;

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
    titleAr: "Flash Sale ينتهي قريبًا",
    titleEn: "Flash sale ends soon",
    ctaAr: "احصل على العرض",
    ctaEn: "Get deal",
    bgColor: "#991b1b",
    textColor: "#ffffff",
    accentColor: "#fb7185",
    layout: "announcement",
  },
  announcement_bar: {
    titleAr: "عرض اليوم ينتهي خلال",
    titleEn: "Today offer ends in",
    ctaAr: "تسوق الآن",
    ctaEn: "Shop now",
    bgColor: "#0f172a",
    textColor: "#ffffff",
    accentColor: "#38bdf8",
    layout: "top_bar",
  },
};

function notify(message, type = "success") {
  statusBox.textContent = message;
  statusBox.classList.remove("hidden", "success", "error");
  statusBox.classList.add(type);
  window.setTimeout(() => statusBox.classList.add("hidden"), 2600);
}

function cleanText(value) {
  return String(value || "")
    .replace(/[<>]/g, "")
    .trim();
}

function safeJson(payload) {
  return payload && typeof payload === "object" ? payload : null;
}

async function api(path, options = {}) {
  const url = `/api${path}${path.includes("?") ? "&" : "?"}merchantId=${encodeURIComponent(merchantId)}`;
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  const json = safeJson(await response.json().catch(() => null));
  if (!response.ok || !json || json.ok === false) {
    throw new Error(json?.error?.message || "حدث خطأ أثناء تنفيذ الطلب.");
  }

  return json.data;
}

function toDateTimeLocal(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function normalizeHex(value, fallback) {
  const input = String(value || "").trim();
  return /^#([0-9a-fA-F]{6})$/.test(input) ? input : fallback;
}

function localizedText(ar, en = "") {
  const arText = cleanText(ar);
  const enText = cleanText(en);
  if (previewLanguage === "en" && enText) return enText;
  return arText;
}

function formatCountdown(ms) {
  const safe = Math.max(0, ms);
  const totalSeconds = Math.floor(safe / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(days)} : ${pad(hours)} : ${pad(minutes)} : ${pad(seconds)}`;
}

function getPreviewTargetTimestamp() {
  if (timerType.value === "fixed") {
    const ts = new Date(form.endAt.value).getTime();
    return Number.isFinite(ts) ? ts : Date.now();
  }

  const hours = Math.max(1, Number(form.durationHours.value || 24));
  return Date.now() + hours * 60 * 60 * 1000;
}

function setTimerMode() {
  const isFixed = timerType.value === "fixed";
  hoursField.classList.toggle("hidden", isFixed);
  endDateField.classList.toggle("hidden", !isFixed);
}

function setEnglishMode() {
  englishFields.classList.toggle("hidden", !enableEnglish.checked);

  if (!enableEnglish.checked) {
    form.titleEn.value = "";
    form.ctaEn.value = "";
    form.expiredEn.value = "";
    if (previewLanguage === "en") setPreviewLanguage("ar");
  }
}

function setDevice(device) {
  previewFrame.classList.toggle("mobile", device === "mobile");
  previewFrame.classList.toggle("desktop", device !== "mobile");

  deviceSwitch.querySelectorAll("button").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.device === device);
  });
}

function setPlacement(placement) {
  currentPlacement = placement;

  placementSwitch.querySelectorAll("button").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.placement === placement);
  });

  previewTop.classList.toggle("active", placement === "top");
  previewProduct.classList.toggle("active", placement === "product");
  previewCard.classList.toggle("active", placement === "card");

  if (placement === "top") layoutSelect.value = "top_bar";
  if (placement === "product") layoutSelect.value = "product_inline";
  if (placement === "card") layoutSelect.value = "announcement";
}

function setPlacementFromLayout(layout) {
  if (layout === "product_inline") return setPlacement("product");
  if (layout === "announcement") return setPlacement("card");
  return setPlacement("top");
}

function setPreviewLanguage(lang) {
  previewLanguage = lang === "en" ? "en" : "ar";

  previewLangSwitch.querySelectorAll("button").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.lang === previewLanguage);
  });

  renderPreview();
}

function setActivePreset(presetName) {
  presetButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.preset === presetName);
  });
}

function syncColorUI(name, value) {
  const picker = document.querySelector(`[data-color-picker="${name}"]`);
  const hex = document.querySelector(`[data-color-hex="${name}"]`);
  const square = document.querySelector(`[data-color-square="${name}"]`);

  if (picker) picker.value = value;
  if (hex) hex.value = value;
  if (square) square.style.background = value;
}

function syncAllColorUI() {
  syncColorUI("bgColor", normalizeHex(form.bgColor.value, "#0f172a"));
  syncColorUI("textColor", normalizeHex(form.textColor.value, "#ffffff"));
  syncColorUI("accentColor", normalizeHex(form.accentColor.value, "#f43f5e"));
}

function applyPreset(name) {
  const preset = presets[name];
  if (!preset) return;

  form.titleAr.value = preset.titleAr;
  form.titleEn.value = preset.titleEn;
  form.ctaAr.value = preset.ctaAr;
  form.ctaEn.value = preset.ctaEn;
  form.bgColor.value = preset.bgColor;
  form.textColor.value = preset.textColor;
  form.accentColor.value = preset.accentColor;
  form.layout.value = preset.layout;

  setPlacementFromLayout(preset.layout);
  setActivePreset(name);
  syncAllColorUI();
  renderPreview();
}

function createWidgetEl() {
  const el = document.createElement("div");
  el.className = "preview-widget";
  el.dir = previewLanguage === "en" ? "ltr" : "rtl";
  el.style.backgroundColor = normalizeHex(form.bgColor.value, "#0f172a");
  el.style.color = normalizeHex(form.textColor.value, "#ffffff");
  el.style.fontFamily =
    cleanText(form.fontFamily.value) || "Tajawal, sans-serif";

  const title = document.createElement("div");
  title.className = "preview-message";
  title.textContent =
    localizedText(form.titleAr.value, form.titleEn.value) || "ينتهي العرض خلال";

  const timer = document.createElement("div");
  timer.className = "preview-timer";
  timer.dataset.previewTimer = "1";

  const cta = document.createElement("a");
  cta.className = "preview-cta";
  cta.href = "#";
  cta.style.backgroundColor = normalizeHex(form.accentColor.value, "#f43f5e");
  cta.textContent =
    localizedText(form.ctaAr.value, form.ctaEn.value) || "تسوق الآن";

  el.append(title, timer, cta);
  return el;
}

function mountPreview(target, headingText = "", productText = "") {
  target.textContent = "";

  if (headingText) {
    const heading = document.createElement("h4");
    heading.textContent = headingText;
    target.appendChild(heading);
  }

  if (productText) {
    const product = document.createElement("div");
    product.className = "product-box";
    product.textContent = productText;
    target.appendChild(product);
  }

  target.appendChild(createWidgetEl());
}

function stopPreviewTimer() {
  if (previewTimerInterval) {
    window.clearInterval(previewTimerInterval);
    previewTimerInterval = null;
  }
}

function startPreviewTimer() {
  stopPreviewTimer();

  const timerNodes = document.querySelectorAll('[data-previewTimer="1"]');
  if (!timerNodes.length) return;

  const target = getPreviewTargetTimestamp();
  const expiredAr = cleanText(form.expiredAr.value) || "انتهى العرض";
  const expiredEn = cleanText(form.expiredEn.value);

  const tick = () => {
    const left = target - Date.now();

    if (left <= 0) {
      const endMsg = localizedText(expiredAr, expiredEn);
      timerNodes.forEach((node) => {
        node.textContent = endMsg;
      });
      stopPreviewTimer();
      return;
    }

    const label = previewLanguage === "en" ? "Time left" : "الوقت المتبقي";
    const value = `${label}: ${formatCountdown(left)}`;

    timerNodes.forEach((node) => {
      node.textContent = value;
    });
  };

  tick();
  previewTimerInterval = window.setInterval(tick, 1000);
}

function renderPreview() {
  mountPreview(previewTop, "", "");
  mountPreview(
    previewProduct,
    previewLanguage === "en" ? "Product page" : "صفحة المنتج",
    previewLanguage === "en"
      ? "Pro Headphone · SAR 299"
      : "سماعات احترافية · 299 ر.س",
  );
  mountPreview(
    previewCard,
    previewLanguage === "en" ? "Product card" : "بطاقة منتج",
    previewLanguage === "en"
      ? "Fast seller · SAR 149"
      : "منتج سريع البيع · 149 ر.س",
  );

  startPreviewTimer();
}

function serializeForm() {
  const timerMode = form.timerType.value === "fixed" ? "fixed" : "evergreen";

  return {
    id: form.id.value || undefined,
    name: cleanText(form.titleAr.value) || "حملة عد تنازلي",
    enabled: true,
    timezone: merchantTimezone,
    layout: form.layout.value,
    timer: {
      mode: timerMode,
      recurrence: form.recurrence.value,
      durationHours: Math.max(1, Number(form.durationHours.value || 24)),
      startAt: form.startAt.value || null,
      endAt: timerMode === "fixed" ? form.endAt.value : null,
    },
    schedule: {
      startAt: form.startAt.value || null,
      endAt: timerMode === "fixed" ? form.endAt.value : null,
    },
    title: {
      ar: cleanText(form.titleAr.value),
      en: enableEnglish.checked ? cleanText(form.titleEn.value) : "",
    },
    cta: {
      enabled: true,
      label: {
        ar: cleanText(form.ctaAr.value),
        en: enableEnglish.checked ? cleanText(form.ctaEn.value) : "",
      },
      url: cleanText(form.ctaUrl.value),
    },
    style: {
      textColor: normalizeHex(form.textColor.value, "#ffffff"),
      backgroundColor: normalizeHex(form.bgColor.value, "#0f172a"),
      accentColor: normalizeHex(form.accentColor.value, "#f43f5e"),
      fontFamily: cleanText(form.fontFamily.value) || "Tajawal, sans-serif",
    },
    displayRules: {
      pages: (form.pages.value || "all")
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean),
      productIds: [],
      collectionIds: [],
    },
    expired: {
      behavior: "show_message",
      message: {
        ar: cleanText(form.expiredAr.value) || "انتهى العرض",
        en: enableEnglish.checked ? cleanText(form.expiredEn.value) : "",
      },
    },
    urgency: {
      enabled: true,
      text: {
        ar: "الكمية محدودة",
        en: "",
      },
    },
  };
}

function fillForm(campaign) {
  form.id.value = campaign.id || "";
  form.titleAr.value = campaign.title?.ar || "ينتهي العرض خلال";
  form.titleEn.value = campaign.title?.en || "";
  form.ctaAr.value = campaign.cta?.label?.ar || "تسوق الآن";
  form.ctaEn.value = campaign.cta?.label?.en || "";
  form.ctaUrl.value = campaign.cta?.url || "/collections/all";

  const fixed = campaign.timer?.mode === "fixed";
  form.timerType.value = fixed ? "fixed" : "hours";
  form.durationHours.value = campaign.timer?.durationHours || 24;
  form.endAt.value = toDateTimeLocal(
    campaign.timer?.endAt || campaign.schedule?.endAt,
  );

  form.layout.value = campaign.layout || "top_bar";
  setPlacementFromLayout(form.layout.value);

  form.bgColor.value = campaign.style?.backgroundColor || "#0f172a";
  form.textColor.value = campaign.style?.textColor || "#ffffff";
  form.accentColor.value = campaign.style?.accentColor || "#f43f5e";
  form.fontFamily.value = campaign.style?.fontFamily || "Tajawal, sans-serif";

  form.expiredAr.value = campaign.expired?.message?.ar || "انتهى العرض";
  form.expiredEn.value = campaign.expired?.message?.en || "";
  form.startAt.value = toDateTimeLocal(campaign.schedule?.startAt);
  form.recurrence.value = campaign.timer?.recurrence || "none";
  form.pages.value = (campaign.displayRules?.pages || ["all"]).join(",");

  enableEnglish.checked = Boolean(
    form.titleEn.value || form.ctaEn.value || form.expiredEn.value,
  );
  setEnglishMode();
  setTimerMode();
  syncAllColorUI();
  renderPreview();
}

function resetFormDefaults() {
  form.reset();
  form.id.value = "";
  form.titleAr.value = "ينتهي العرض خلال";
  form.ctaAr.value = "تسوق الآن";
  form.ctaUrl.value = "/collections/all";
  form.expiredAr.value = "انتهى العرض";
  form.pages.value = "all";
  form.fontFamily.value = "Tajawal, sans-serif";
  form.bgColor.value = "#0f172a";
  form.textColor.value = "#ffffff";
  form.accentColor.value = "#f43f5e";
  form.durationHours.value = "24";
  form.timerType.value = "hours";
  form.layout.value = "top_bar";
  form.recurrence.value = "none";
  enableEnglish.checked = false;
  setEnglishMode();
  setTimerMode();
  setPlacement("top");
  syncAllColorUI();
  renderPreview();
}

function renderCampaignList() {
  campaignList.textContent = "";

  if (!campaigns.length) {
    const empty = document.createElement("div");
    empty.className = "loading";
    empty.textContent = "لا توجد حملات بعد. أنشئ حملتك الأولى.";
    campaignList.appendChild(empty);
    return;
  }

  campaigns.forEach((campaign) => {
    const item = document.createElement("article");
    item.className = "campaign-item";

    const header = document.createElement("header");
    const title = document.createElement("strong");
    title.textContent = campaign.title?.ar || campaign.name || "حملة";

    const badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = campaign.isActive ? "مفعّلة" : "غير مفعّلة";

    header.append(title, badge);

    const meta = document.createElement("div");
    meta.textContent = `${campaign.layout} • ${campaign.timer?.mode || "evergreen"}`;

    const actions = document.createElement("div");
    actions.className = "item-actions";

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.textContent = "تعديل";
    editBtn.addEventListener("click", () => fillForm(campaign));

    const toggleBtn = document.createElement("button");
    toggleBtn.type = "button";
    toggleBtn.textContent = campaign.isActive ? "إيقاف" : "تفعيل";
    toggleBtn.addEventListener("click", async () => {
      try {
        await api(`/campaigns/${campaign.id}/active`, {
          method: "PATCH",
          body: JSON.stringify({ isActive: !campaign.isActive }),
        });
        notify("تم تحديث حالة الحملة.");
        await loadCampaigns();
      } catch (error) {
        notify(error.message, "error");
      }
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.textContent = "حذف";
    deleteBtn.addEventListener("click", async () => {
      try {
        await api(`/campaigns/${campaign.id}`, { method: "DELETE" });
        notify("تم حذف الحملة.");
        if (form.id.value === campaign.id) resetFormDefaults();
        await loadCampaigns();
      } catch (error) {
        notify(error.message, "error");
      }
    });

    actions.append(editBtn, toggleBtn, deleteBtn);
    item.append(header, meta, actions);
    campaignList.appendChild(item);
  });
}

async function loadCampaigns() {
  const data = await api("/campaigns");
  campaigns = Array.isArray(data.campaigns) ? data.campaigns : [];
  renderCampaignList();
}

async function saveCampaign(mode = "save") {
  const payload = serializeForm();

  saveBtn.disabled = true;
  publishBtn.disabled = true;

  try {
    await api("/settings", {
      method: "PUT",
      body: JSON.stringify({
        locale: "ar",
        timezone: merchantTimezone,
        settings: { analyticsHookUrl: cleanText(form.analyticsHookUrl.value) },
      }),
    });

    if (form.id.value) {
      await api(`/campaigns/${form.id.value}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    } else {
      await api("/campaigns", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    }

    notify(
      mode === "publish"
        ? "تم حفظ الحملة محليًا (جاهزة للربط مع سلة API)."
        : "تم حفظ الحملة محليًا.",
    );
    await loadCampaigns();
  } catch (error) {
    notify(error.message, "error");
  } finally {
    saveBtn.disabled = false;
    publishBtn.disabled = false;
  }
}

async function bootstrap() {
  previewTop.textContent = "";
  const loading = document.createElement("div");
  loading.className = "loading";
  loading.textContent = "جاري تحميل البيانات...";
  previewTop.appendChild(loading);

  try {
    const data = await api("/merchant");
    merchantTimezone = data.merchant?.timezone || "Asia/Riyadh";
    form.analyticsHookUrl.value =
      data.merchant?.settings?.analyticsHookUrl || "";

    await loadCampaigns();

    if (campaigns[0]) fillForm(campaigns[0]);
    else resetFormDefaults();
  } catch (error) {
    notify(error.message, "error");
    resetFormDefaults();
  }
}

/* Events */
presetButtons.forEach((btn) => {
  btn.addEventListener("click", () => applyPreset(btn.dataset.preset));
});

form.addEventListener("input", renderPreview);
form.addEventListener("change", renderPreview);

timerType.addEventListener("change", () => {
  setTimerMode();
  renderPreview();
});

layoutSelect.addEventListener("change", () => {
  setPlacementFromLayout(layoutSelect.value);
  renderPreview();
});

enableEnglish.addEventListener("change", () => {
  setEnglishMode();
  renderPreview();
});

saveBtn.addEventListener("click", async () => {
  await saveCampaign("save");
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  await saveCampaign("publish");
});

deviceSwitch.addEventListener("click", (event) => {
  const btn = event.target.closest("[data-device]");
  if (!btn) return;
  setDevice(btn.dataset.device);
});

placementSwitch.addEventListener("click", (event) => {
  const btn = event.target.closest("[data-placement]");
  if (!btn) return;
  setPlacement(btn.dataset.placement);
  renderPreview();
});

previewLangSwitch.addEventListener("click", (event) => {
  const btn = event.target.closest("[data-lang]");
  if (!btn) return;

  if (btn.dataset.lang === "en" && !enableEnglish.checked) {
    enableEnglish.checked = true;
    setEnglishMode();
  }

  setPreviewLanguage(btn.dataset.lang);
});

/* Color controls */
document.querySelectorAll("[data-color-square]").forEach((squareBtn) => {
  squareBtn.addEventListener("click", () => {
    const key = squareBtn.dataset.colorSquare;
    const picker = document.querySelector(`[data-color-picker="${key}"]`);
    if (picker) picker.click();
  });
});

document.querySelectorAll("[data-color-picker]").forEach((picker) => {
  picker.addEventListener("input", () => {
    const key = picker.dataset.colorPicker;
    const value = normalizeHex(picker.value, "#000000");
    if (form[key]) form[key].value = value;
    syncColorUI(key, value);
    renderPreview();
  });
});

document.querySelectorAll("[data-color-hex]").forEach((hexInput) => {
  hexInput.addEventListener("input", () => {
    const key = hexInput.dataset.colorHex;
    const fallback = form[key]?.value || "#000000";
    const value = normalizeHex(hexInput.value, fallback);
    if (form[key]) form[key].value = value;
    syncColorUI(key, value);
    renderPreview();
  });
});

document.querySelectorAll("[data-swatch]").forEach((swatch) => {
  swatch.addEventListener("click", () => {
    const value = normalizeHex(swatch.dataset.swatch, "#f43f5e");
    form.accentColor.value = value;
    syncColorUI("accentColor", value);
    renderPreview();
  });
});

window.addEventListener("beforeunload", () => stopPreviewTimer());

/* Init */
setDevice("desktop");
setPlacement(currentPlacement);
setPreviewLanguage("ar");
setTimerMode();
setEnglishMode();
syncAllColorUI();
bootstrap();
