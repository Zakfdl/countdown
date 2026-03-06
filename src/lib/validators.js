import { DEFAULT_LOCALE } from "./i18n.js";

const HEX_COLOR = /^#([0-9a-fA-F]{6})$/;
const SAFE_MERCHANT_ID = /^[a-zA-Z0-9_-]{3,64}$/;
const SAFE_TIMEZONE = /^[A-Za-z_]+\/[A-Za-z_]+(?:\/[A-Za-z_]+)?$/;

function stripHtml(value = "") {
  return String(value)
    .replace(/<[^>]*>/g, "")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .trim();
}

function cleanString(value, max = 200) {
  if (typeof value !== "string") return "";
  return stripHtml(value).slice(0, max);
}

function cleanArray(value, maxItems = 100) {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => cleanString(String(v), 80))
    .filter(Boolean)
    .slice(0, maxItems);
}

function safeHexColor(value, fallback) {
  const cleaned = cleanString(value, 7);
  return HEX_COLOR.test(cleaned) ? cleaned : fallback;
}

function safeUrl(value, fallback = "/collections/all") {
  const cleaned = cleanString(value, 300);
  if (!cleaned) return fallback;

  if (cleaned.startsWith("/")) return cleaned;

  try {
    const url = new URL(cleaned);
    if (url.protocol === "http:" || url.protocol === "https:")
      return url.toString();
    return fallback;
  } catch {
    return fallback;
  }
}

function safeIsoDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function safeTimezone(value, fallback = "Asia/Riyadh") {
  const cleaned = cleanString(value, 64);
  return SAFE_TIMEZONE.test(cleaned) ? cleaned : fallback;
}

export function createApiError(code, message, status = 400, details = null) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  error.details = details;
  return error;
}

export function resolveMerchantId(input, fallback = "demo-merchant") {
  const value = cleanString(String(input || fallback), 64);
  if (!SAFE_MERCHANT_ID.test(value)) {
    throw createApiError("INVALID_MERCHANT_ID", "معرّف المتجر غير صالح.", 400);
  }
  return value;
}

export function resolveLocale(input) {
  return input === "en" ? "en" : DEFAULT_LOCALE;
}

export function normalizeMerchantSettings(body = {}) {
  return {
    locale: resolveLocale(body.locale),
    timezone: safeTimezone(body.timezone || "Asia/Riyadh"),
    settings: {
      analyticsHookUrl: safeUrl(body.settings?.analyticsHookUrl || "", ""),
    },
  };
}

export function normalizeCampaignPayload(
  body = {},
  opts = { requireId: false },
) {
  const id = cleanString(body.id || "", 40);
  if (opts.requireId && !id) {
    throw createApiError("INVALID_CAMPAIGN_ID", "معرّف الحملة مطلوب.", 400);
  }

  const mode = body.timer?.mode === "fixed" ? "fixed" : "evergreen";
  const recurrence = ["none", "daily", "weekly", "monthly"].includes(
    body.timer?.recurrence,
  )
    ? body.timer.recurrence
    : "none";
  const durationHoursRaw = Number(body.timer?.durationHours);
  const durationHours = Number.isFinite(durationHoursRaw)
    ? Math.max(1, Math.min(720, Math.floor(durationHoursRaw)))
    : 24;
  const endAt = safeIsoDate(body.timer?.endAt || body.schedule?.endAt);

  if (mode === "fixed" && !endAt) {
    throw createApiError("INVALID_END_DATE", "تاريخ الانتهاء غير صالح.", 400);
  }

  const titleAr = cleanString(
    body.title?.ar || body.titleAr || body.text?.ar || "ينتهي العرض خلال",
    120,
  );
  const titleEn = cleanString(
    body.title?.en || body.titleEn || body.text?.en || "",
    120,
  );

  return {
    id: id || undefined,
    name: cleanString(body.name || titleAr, 120),
    enabled: body.enabled !== false,
    isActive: body.isActive === true,
    locale: resolveLocale(body.locale),
    timezone: safeTimezone(body.timezone || "Asia/Riyadh"),
    layout: [
      "top_bar",
      "product_inline",
      "homepage_banner",
      "announcement",
    ].includes(body.layout)
      ? body.layout
      : "top_bar",
    timer: {
      mode,
      recurrence,
      durationHours,
      startAt: safeIsoDate(body.timer?.startAt || body.schedule?.startAt),
      endAt,
    },
    schedule: {
      startAt: safeIsoDate(body.schedule?.startAt || body.timer?.startAt),
      endAt,
    },
    title: {
      ar: titleAr,
      en: titleEn,
    },
    urgency: {
      enabled: body.urgency?.enabled !== false,
      text: {
        ar: cleanString(
          body.urgency?.text?.ar || body.urgency?.textAr || "الكمية محدودة",
          120,
        ),
        en: cleanString(
          body.urgency?.text?.en || body.urgency?.textEn || "",
          120,
        ),
      },
    },
    cta: {
      enabled: body.cta?.enabled !== false,
      label: {
        ar: cleanString(
          body.cta?.label?.ar || body.ctaAr || body.cta?.labelAr || "تسوق الآن",
          80,
        ),
        en: cleanString(
          body.cta?.label?.en || body.ctaEn || body.cta?.labelEn || "",
          80,
        ),
      },
      url: safeUrl(body.cta?.url || body.ctaUrl || "/collections/all"),
    },
    style: {
      textColor: safeHexColor(
        body.style?.textColor || body.textColor,
        "#ffffff",
      ),
      backgroundColor: safeHexColor(
        body.style?.backgroundColor || body.bgColor,
        "#0f172a",
      ),
      accentColor: safeHexColor(
        body.style?.accentColor || body.accentColor,
        "#f43f5e",
      ),
      fontFamily: cleanString(
        body.style?.fontFamily || body.fontFamily || "Tajawal, sans-serif",
        120,
      ),
    },
    displayRules: {
      pages: cleanArray(body.displayRules?.pages || body.pages || ["all"]),
      productIds: cleanArray(
        body.displayRules?.productIds || body.productIds || [],
      ),
      collectionIds: cleanArray(
        body.displayRules?.collectionIds || body.collectionIds || [],
      ),
    },
    expired: {
      behavior: ["hide", "show_message", "restart"].includes(
        body.expired?.behavior || body.expiryBehavior,
      )
        ? body.expired?.behavior || body.expiryBehavior
        : "show_message",
      message: {
        ar: cleanString(
          body.expired?.message?.ar ||
            body.expiredAr ||
            body.expired?.textAr ||
            "انتهى العرض",
          120,
        ),
        en: cleanString(
          body.expired?.message?.en ||
            body.expiredEn ||
            body.expired?.textEn ||
            "",
          120,
        ),
      },
    },
  };
}

export function sanitizeCampaignPatch(body = {}) {
  return {
    enabled: typeof body.enabled === "boolean" ? body.enabled : undefined,
    isActive: typeof body.isActive === "boolean" ? body.isActive : undefined,
  };
}
