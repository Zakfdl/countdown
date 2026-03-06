import express from 'express';
import { config } from '../config.js';
import { updateMerchant } from '../lib/store.js';

export const authRouter = express.Router();

authRouter.get('/install', (req, res) => {
  const merchantId = req.query.merchantId || 'demo-merchant';
  const redirectUri = `${config.appUrl}/auth/callback`;
  const state = Buffer.from(JSON.stringify({ merchantId })).toString('base64url');

  const oauthUrl = new URL(config.sallaOAuthUrl);
  oauthUrl.searchParams.set('client_id', config.sallaClientId);
  oauthUrl.searchParams.set('response_type', 'code');
  oauthUrl.searchParams.set('scope', 'offline_access settings.write settings.read');
  oauthUrl.searchParams.set('redirect_uri', redirectUri);
  oauthUrl.searchParams.set('state', state);

  res.json({
    message: 'Redirect merchant to Salla OAuth URL',
    oauthUrl: oauthUrl.toString()
  });
});

authRouter.get('/callback', (req, res) => {
  const code = req.query.code || 'mock-code';
  const statePayload = req.query.state ? JSON.parse(Buffer.from(req.query.state, 'base64url').toString('utf8')) : { merchantId: 'demo-merchant' };
  const merchantId = statePayload.merchantId;

  updateMerchant(merchantId, (merchant) => ({
    ...merchant,
    token: {
      accessToken: `mock-token-${code}`,
      refreshToken: 'mock-refresh-token',
      expiresAt: new Date(Date.now() + 3600 * 1000).toISOString()
    }
  }));

  res.redirect(`/dashboard?merchantId=${merchantId}`);
});
