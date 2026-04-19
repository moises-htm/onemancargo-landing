# Cloudflare Pages Deployment Guide

## Prerequisites
1. Cloudflare account with Workers KV (free tier supports 100K reads/day)
2. Domain `onemancargo.ai` proxied via Cloudflare

## Deploy Steps

### Option A: Manual Deploy (quick)
```bash
# 1. Create KV namespace in Cloudflare Dashboard
#    Workers → KV → Add Namespace → name: "omc-leads"
#    Note the namespace ID

# 2. Deploy worker
wrangler deploy

# OR copy-paste the code from forms/leaderboard.js into
# Workers → Create Worker → paste code → save & deploy
```

### Option B: GitHub Actions (automated)
Create `.github/workflows/deploy-cloudflare.yml` in the repo:
```yaml
name: Deploy to Cloudflare Pages
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          environment: production
```

### Option C: Fix the existing Cloudflare Pages build
If the auto-deploy from GitHub is broken:
1. Go to Cloudflare Dashboard → Pages → onemancargo.ai → Settings
2. Check the **Build** section — framework preset should be "None" (static site)
3. Check **Environment** — confirm `PUBLIC_SITE_URL` is set
4. Check **Git integration** — confirm it's linked to `moises-htm/onemancargo-landing` and `main` branch
5. Click **Redeploy** to trigger a fresh build
6. If still broken, try unlinking and relinking the repo

## Lead Capture Status
- Email waitlist → ✅ Captured to Cloudflare KV (if worker deployed)
- Phone callbacks → ✅ Captured to Cloudflare KV
- WhatsApp → ✅ Working (wa.me link, no backend needed)

## Next: Connect to a real CRM
Replace `WEBHOOK_URL` in `forms/leaderboard.js` with:
- Google Sheets via Make.com webhook
- n8n self-hosted webhook
- Discord webhook for instant notifications
- Airtable webhook
