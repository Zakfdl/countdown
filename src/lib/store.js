import fs from 'fs';
import path from 'path';
import { nanoid } from 'nanoid';
import { config } from '../config.js';
import { DEFAULT_LOCALE, t } from './i18n.js';

const baseState = {
  merchants: {}
};

function ensureStoreFile() {
  const dir = path.dirname(config.dataPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(config.dataPath)) fs.writeFileSync(config.dataPath, JSON.stringify(baseState, null, 2));
}

function loadState() {
  ensureStoreFile();
  return JSON.parse(fs.readFileSync(config.dataPath, 'utf-8'));
}

function saveState(state) {
  fs.writeFileSync(config.dataPath, JSON.stringify(state, null, 2));
}

function merchantDefaults(merchantId) {
  return {
    id: merchantId,
    locale: DEFAULT_LOCALE,
    timezone: 'Asia/Riyadh',
    token: null,
    shopDomain: null,
    createdAt: new Date().toISOString(),
    settings: {
      analyticsHookUrl: '',
      defaultText: {
        ar: t('countdown_offer_ends_in', 'ar'),
        en: ''
      },
      defaultExpiredText: {
        ar: t('status_offer_ended', 'ar'),
        en: ''
      },
      defaultCtaText: {
        ar: t('cta_shop_now', 'ar'),
        en: ''
      }
    },
    campaigns: []
  };
}

export function getMerchant(merchantId) {
  const state = loadState();
  if (!state.merchants[merchantId]) {
    state.merchants[merchantId] = merchantDefaults(merchantId);
    saveState(state);
  }
  return state.merchants[merchantId];
}

export function updateMerchant(merchantId, updater) {
  const state = loadState();
  const merchant = state.merchants[merchantId] || merchantDefaults(merchantId);
  const updated = updater(merchant);
  state.merchants[merchantId] = updated;
  saveState(state);
  return updated;
}

export function upsertCampaign(merchantId, payload) {
  return updateMerchant(merchantId, (merchant) => {
    const next = { ...merchant };
    const now = new Date().toISOString();
    if (payload.id) {
      next.campaigns = merchant.campaigns.map((campaign) =>
        campaign.id === payload.id ? { ...campaign, ...payload, updatedAt: now } : campaign
      );
    } else {
      next.campaigns = [
        ...merchant.campaigns,
        {
          ...payload,
          id: nanoid(10),
          createdAt: now,
          updatedAt: now
        }
      ];
    }
    return next;
  }).campaigns;
}

export function deleteCampaign(merchantId, campaignId) {
  return updateMerchant(merchantId, (merchant) => ({
    ...merchant,
    campaigns: merchant.campaigns.filter((campaign) => campaign.id !== campaignId)
  })).campaigns;
}
