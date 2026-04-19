/**
 * OMC Lead Capture — Cloudflare Worker
 * Replaces the broken Loops TODO endpoint.
 * Stores leads in Cloudflare KV or returns webhook to a real destination.
 * 
 * If KV is configured, stores in KV. Otherwise, forwards to a webhook URL
 * (Google Sheets webhook, Make.com, n8n, etc.)
 */

const KV_NAMESPACE = 'omc-leads'
const KV_KEY = 'leads'
const WEBHOOK_URL = '' // <-- Set this to your Make.com/n8n/Google Sheets webhook

export default {
  async fetch(request, env) {
    // CORS for browser POST
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders })
    }

    // GET — return stats
    if (request.method === 'GET') {
      let count = 0
      let latest = []
      try {
        const raw = await env[KV_NAMESPACE].get(KV_KEY)
        const data = raw ? JSON.parse(raw) : []
        count = data.length
        latest = data.slice(-10)
      } catch (e) {
        // KV not configured, return empty
      }
      return new Response(JSON.stringify({ count, latest }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    // POST — capture lead
    if (request.method === 'POST') {
      try {
        const body = await request.json()
        const source = body.source || 'unknown'
        const email = body.email || ''
        const phone = body.phone || ''
        const ts = new Date().toISOString()
        const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || ''

        if (!email && !phone) {
          return new Response(JSON.stringify({ error: 'Need email or phone' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          })
        }

        const lead = { source, email, phone, ts, ip }

        // Store in KV
        if (env[KV_NAMESPACE]) {
          const raw = await env[KV_NAMESPACE].get(KV_KEY).catch(() => null)
          const data = raw ? JSON.parse(raw) : []
          data.push(lead)
          await env[KV_NAMESPACE].put(KV_KEY, JSON.stringify(data), {
            expirationTtl: 60 * 60 * 24 * 30, // 30 days
          })
        }

        // Forward to webhook if configured
        if (WEBHOOK_URL) {
          try {
            await fetch(WEBHOOK_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(lead),
            })
          } catch (e) {
            // Webhook failure is non-fatal
          }
        }

        return new Response(JSON.stringify({ ok: true, id: ts }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        })
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        })
      }
    }

    return new Response('Method not allowed', {
      status: 405,
      headers: corsHeaders,
    })
  }
}
