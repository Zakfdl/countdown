import express from 'express';
import { deleteCampaign, getMerchant, updateMerchant, upsertCampaign } from '../lib/store.js';
import { normalizeCampaignPayload, normalizeMerchantSettings } from '../lib/validators.js';
import { resolveActiveCampaigns } from '../services/campaign-engine.js';

export const apiRouter = express.Router();

function merchantIdFrom(req) {
  return req.query.merchantId || req.headers['x-merchant-id'] || req.body.merchantId || 'demo-merchant';
}

apiRouter.get('/health', (_, res) => {
  res.json({ ok: true, service: 'countdown-salla-app', timestamp: new Date().toISOString() });
});

apiRouter.get('/merchant', (req, res) => {
  const merchant = getMerchant(merchantIdFrom(req));
  res.json({ merchant });
});

apiRouter.put('/settings', (req, res) => {
  const merchantId = merchantIdFrom(req);
  const normalized = normalizeMerchantSettings(req.body || {});

  const merchant = updateMerchant(merchantId, (prev) => ({
    ...prev,
    locale: normalized.locale,
    timezone: normalized.timezone || prev.timezone,
    settings: {
      ...prev.settings,
      ...normalized.settings
    }
  }));

  res.json({ merchant });
});

apiRouter.post('/campaigns', (req, res) => {
  const merchantId = merchantIdFrom(req);
  const payload = normalizeCampaignPayload(req.body || {});
  const campaigns = upsertCampaign(merchantId, payload);
  res.status(201).json({ campaigns });
});

apiRouter.put('/campaigns/:id', (req, res) => {
  const merchantId = merchantIdFrom(req);
  const payload = normalizeCampaignPayload({ ...(req.body || {}), id: req.params.id });
  const campaigns = upsertCampaign(merchantId, payload);
  res.json({ campaigns });
});

apiRouter.delete('/campaigns/:id', (req, res) => {
  const merchantId = merchantIdFrom(req);
  const campaigns = deleteCampaign(merchantId, req.params.id);
  res.json({ campaigns });
});

apiRouter.get('/widget-config', (req, res) => {
  const merchant = getMerchant(merchantIdFrom(req));
  const pageContext = {
    pageType: req.query.pageType,
    productId: req.query.productId,
    collectionId: req.query.collectionId,
    timezone: req.query.timezone,
    locale: req.query.locale || req.headers['x-store-locale'] || merchant.locale
  };

  const activeCampaigns = resolveActiveCampaigns(merchant, pageContext);

  res.json({
    merchantId: merchant.id,
    locale: pageContext.locale,
    timezone: merchant.timezone,
    analyticsHookUrl: merchant.settings.analyticsHookUrl,
    campaigns: activeCampaigns
  });
});
