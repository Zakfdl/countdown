import dotenv from 'dotenv';

dotenv.config();

export const config = {
  appUrl: process.env.APP_URL || 'http://localhost:3000',
  port: Number(process.env.PORT || 3000),
  sessionSecret: process.env.SESSION_SECRET || 'change-me',
  sallaClientId: process.env.SALLA_CLIENT_ID || 'replace-me',
  sallaClientSecret: process.env.SALLA_CLIENT_SECRET || 'replace-me',
  sallaOAuthUrl: process.env.SALLA_OAUTH_URL || 'https://accounts.salla.sa/oauth2/auth',
  sallaTokenUrl: process.env.SALLA_TOKEN_URL || 'https://accounts.salla.sa/oauth2/token',
  sallaApiBaseUrl: process.env.SALLA_API_BASE_URL || 'https://api.salla.dev/admin/v2',
  dataPath: process.env.DATA_PATH || './data/store.json'
};
