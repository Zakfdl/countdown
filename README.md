# Countdown Growth for Salla

Production-ready countdown campaign app scaffold for Salla merchants with **Arabic-first localization** and optional English.

## 1) Current Audit Summary (from original project)

The original project was a single `index.html` page with inline CSS/JS, a local preview timer, and a mock “publish to Salla” button. It had no backend, no OAuth, no merchant persistence, no campaign management, and no storefront widget delivery pipeline.

## 2) Target Architecture

- **Backend**: Node.js + Express API for OAuth placeholders, merchant settings, campaign CRUD, and widget config resolution.
- **Storage**: JSON file persistence (`data/store.json`) for portability; easy to replace with Postgres.
- **Merchant Dashboard**: Arabic-first dashboard (RTL by default) with optional English content fields.
- **Storefront Widget**: Embeddable JS script with locale detection and graceful Arabic fallback.
- **Localization Core**: `src/lib/i18n.js` with translation keys + fallback rules.

## 3) Folder Tree

```txt
.
├── .env.example
├── README.md
├── data/
│   └── store.json
├── docs/
│   ├── APP_STORE_ASSETS.md
│   ├── BUSINESS_PLAN.md
│   ├── DEPLOYMENT.md
│   ├── LEGAL.md
│   ├── MERCHANT_GUIDE.md
│   └── SALLA_PUBLISHING_PLAYBOOK.md
├── package.json
├── public/
│   ├── dashboard/
│   │   ├── app.js
│   │   ├── index.html
│   │   └── styles.css
│   └── widget/
│       └── countdown-widget.js
└── src/
    ├── config.js
    ├── lib/
    │   ├── i18n.js
    │   └── store.js
    ├── routes/
    │   ├── api.js
    │   └── auth.js
    ├── server.js
    └── services/
        └── campaign-engine.js
```

## 4) Local Setup

1. `cp .env.example .env`
2. `npm install`
3. `npm run dev`
4. Open dashboard: `http://localhost:3000/dashboard?merchantId=demo-merchant`

## 5) Storefront Embed Example

```html
<script
  src="https://YOUR_APP_DOMAIN/widget/countdown-widget.js"
  data-api-base="https://YOUR_APP_DOMAIN"
  data-merchant-id="demo-merchant"
  data-page-type="product"
  data-product-id="12345"
  data-locale="ar"
></script>
```

`data-locale="en"` is optional. If English text is missing, Arabic is shown automatically.

## 6) Immediate Next Step

Replace mock OAuth token exchange with real Salla OAuth endpoints and persist merchants in a managed database (PostgreSQL).
