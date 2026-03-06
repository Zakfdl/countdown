# Deployment Guide

## Runtime
- Node.js 18+
- Persistent volume for `data/store.json` (or replace with DB)

## Environment Variables
Use `.env.example`.

## Deploy on Render / Railway / Fly.io
1. Create service from repository.
2. Build command: `npm install`
3. Start command: `npm start`
4. Add env vars from `.env.example`.
5. Set `APP_URL` to public HTTPS app URL.
6. Mount persistent storage for `/data`.

## Production Hardening Checklist
- Put app behind HTTPS and WAF.
- Add request validation and rate limiting.
- Replace file store with Postgres.
- Add structured logging + error monitoring.
- Encrypt tokens at rest.
- Add background job for recurring campaign cache.
