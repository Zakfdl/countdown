import express from "express";
import {
  createCampaign,
  deleteCampaign,
  getCampaign,
  getMerchant,
  listCampaigns,
  setActiveCampaign,
  updateCampaign,
  updateMerchant,
} from "../lib/store.js";
import {
  createApiError,
  normalizeCampaignPayload,
  normalizeMerchantSettings,
  resolveMerchantId,
  sanitizeCampaignPatch,
} from "../lib/validators.js";
import { resolveActiveCampaigns } from "../services/campaign-engine.js";

export const apiRouter = express.Router();

function success(res, data, status = 200) {
  return res.status(status).json({
    ok: true,
    data,
    requestId: res.locals.requestId,
  });
}

function merchantIdFrom(req) {
  return resolveMerchantId(
    req.query.merchantId ||
      req.headers["x-merchant-id"] ||
      req.body?.merchantId ||
      "demo-merchant",
  );
}

apiRouter.get("/health", (_req, res) => {
  success(res, {
    service: "countdown-salla-app",
    timestamp: new Date().toISOString(),
  });
});

apiRouter.get("/merchant", (req, res, next) => {
  try {
    const merchant = getMerchant(merchantIdFrom(req));
    success(res, { merchant });
  } catch (error) {
    next(error);
  }
});

apiRouter.put("/settings", (req, res, next) => {
  try {
    const merchantId = merchantIdFrom(req);
    const normalized = normalizeMerchantSettings(req.body || {});

    const merchant = updateMerchant(merchantId, (prev) => ({
      ...prev,
      locale: normalized.locale,
      timezone: normalized.timezone || prev.timezone,
      settings: {
        ...prev.settings,
        ...normalized.settings,
      },
    }));

    success(res, { merchant });
  } catch (error) {
    next(error);
  }
});

apiRouter.get("/campaigns", (req, res, next) => {
  try {
    const campaigns = listCampaigns(merchantIdFrom(req));
    success(res, { campaigns });
  } catch (error) {
    next(error);
  }
});

apiRouter.post("/campaigns", (req, res, next) => {
  try {
    const merchantId = merchantIdFrom(req);
    const payload = normalizeCampaignPayload(req.body || {});
    const campaigns = createCampaign(merchantId, payload);
    success(res, { campaigns }, 201);
  } catch (error) {
    next(error);
  }
});

apiRouter.put("/campaigns/:id", (req, res, next) => {
  try {
    const merchantId = merchantIdFrom(req);
    const existing = getCampaign(merchantId, req.params.id);

    if (!existing) {
      throw createApiError("CAMPAIGN_NOT_FOUND", "الحملة غير موجودة.", 404);
    }

    const payload = normalizeCampaignPayload(
      { ...(req.body || {}), id: req.params.id },
      { requireId: true },
    );

    const campaigns = updateCampaign(merchantId, req.params.id, payload);
    success(res, { campaigns });
  } catch (error) {
    next(error);
  }
});

apiRouter.patch("/campaigns/:id/active", (req, res, next) => {
  try {
    const merchantId = merchantIdFrom(req);
    const existing = getCampaign(merchantId, req.params.id);

    if (!existing) {
      throw createApiError("CAMPAIGN_NOT_FOUND", "الحملة غير موجودة.", 404);
    }

    const patch = sanitizeCampaignPatch(req.body || {});

    if (typeof patch.isActive !== "boolean") {
      throw createApiError(
        "INVALID_ACTIVE_STATE",
        "حالة التفعيل غير صالحة.",
        400,
      );
    }

    const campaigns = setActiveCampaign(
      merchantId,
      req.params.id,
      patch.isActive,
    );
    success(res, { campaigns });
  } catch (error) {
    next(error);
  }
});

apiRouter.delete("/campaigns/:id", (req, res, next) => {
  try {
    const merchantId = merchantIdFrom(req);
    const existing = getCampaign(merchantId, req.params.id);

    if (!existing) {
      throw createApiError("CAMPAIGN_NOT_FOUND", "الحملة غير موجودة.", 404);
    }

    const campaigns = deleteCampaign(merchantId, req.params.id);
    success(res, { campaigns });
  } catch (error) {
    next(error);
  }
});

apiRouter.get("/widget-config", (req, res, next) => {
  try {
    const merchant = getMerchant(merchantIdFrom(req));

    const pageContext = {
      pageType:
        typeof req.query.pageType === "string" ? req.query.pageType : "",
      productId:
        typeof req.query.productId === "string" ? req.query.productId : "",
      collectionId:
        typeof req.query.collectionId === "string"
          ? req.query.collectionId
          : "",
      timezone:
        typeof req.query.timezone === "string"
          ? req.query.timezone
          : merchant.timezone,
      locale:
        req.query.locale || req.headers["x-store-locale"] || merchant.locale,
    };

    const campaigns = resolveActiveCampaigns(merchant, pageContext);

    success(res, {
      merchantId: merchant.id,
      locale: pageContext.locale,
      timezone: merchant.timezone,
      analyticsHookUrl: merchant.settings.analyticsHookUrl,
      campaigns,
    });
  } catch (error) {
    next(error);
  }
});
