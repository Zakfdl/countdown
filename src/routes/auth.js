import express from "express";
import { config } from "../config.js";
import { updateMerchant } from "../lib/store.js";
import { createApiError, resolveMerchantId } from "../lib/validators.js";

export const authRouter = express.Router();

authRouter.get("/install", (req, res, next) => {
  try {
    const merchantId = resolveMerchantId(
      req.query.merchantId || "demo-merchant",
    );
    const redirectUri = `${config.appUrl}/auth/callback`;
    const state = Buffer.from(JSON.stringify({ merchantId })).toString(
      "base64url",
    );

    const oauthUrl = new URL(config.sallaOAuthUrl);
    oauthUrl.searchParams.set("client_id", config.sallaClientId);
    oauthUrl.searchParams.set("response_type", "code");
    oauthUrl.searchParams.set(
      "scope",
      "offline_access settings.write settings.read",
    );
    oauthUrl.searchParams.set("redirect_uri", redirectUri);
    oauthUrl.searchParams.set("state", state);

    res.json({
      ok: true,
      data: {
        message: "استخدم الرابط لبدء تثبيت التطبيق.",
        oauthUrl: oauthUrl.toString(),
      },
      requestId: res.locals.requestId,
    });
  } catch (error) {
    next(error);
  }
});

authRouter.get("/callback", (req, res, next) => {
  try {
    const code =
      typeof req.query.code === "string" ? req.query.code : "mock-code";
    const rawState =
      typeof req.query.state === "string" ? req.query.state : null;
    const statePayload = rawState
      ? JSON.parse(Buffer.from(rawState, "base64url").toString("utf8"))
      : { merchantId: "demo-merchant" };

    const merchantId = resolveMerchantId(statePayload.merchantId);

    updateMerchant(merchantId, (merchant) => ({
      ...merchant,
      token: {
        accessToken: `mock-token-${code}`,
        refreshToken: "mock-refresh-token",
        expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
      },
    }));

    res.redirect(`/dashboard?merchantId=${merchantId}`);
  } catch {
    next(
      createApiError(
        "INVALID_AUTH_CALLBACK",
        "فشل التحقق من بيانات الربط.",
        400,
      ),
    );
  }
});
