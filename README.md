# Finance Helper

Personal finance assistant. First feature: extract text from an XP Investimentos credit-card invoice PDF in the browser.

## Privacy

PDF processing runs entirely in the browser with pdf.js. The file and password are not uploaded to a backend.

## Setup

```bash
npm install
npm run dev
```

Open `http://localhost:5173/xp-invoice`.

## Current step

Provide the PDF and its password. The app shows charge rows (card, date, description, BRL amount) and lets you copy them as tab-separated values for Google Sheets.

## Scripts

- `npm run dev` - start the Vite development server
- `npm run build` - typecheck and production build
- `npm run preview` - preview the production build
