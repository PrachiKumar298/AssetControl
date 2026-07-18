// Vercel serverless function: GET /api/stocks/price?symbol=RELIANCE.NS
// - Indian stocks (NSE/BSE): append .NS or .BO suffix → Yahoo returns INR directly
// - US stocks (no suffix):   Yahoo returns USD → auto-converted to INR via live rate
// Uses CommonJS so it works regardless of the root package "type": "module"

const https = require('https');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Simple deterministic fallback so the app never fully breaks */
function mockPrice(symbol) {
  let sum = 0;
  for (let i = 0; i < symbol.length; i++) sum += symbol.charCodeAt(i) * (i + 1);
  return parseFloat((10 + (sum % 4000) + (sum % 97) / 100).toFixed(2));
}

/**
 * Fetch from Yahoo Finance v8 chart endpoint.
 * Returns { price, currency } on success, throws on failure.
 */
function fetchYahoo(symbol) {
  return new Promise((resolve, reject) => {
    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`;
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      timeout: 6000,
    };

    const req = https.get(url, options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          const meta = json?.chart?.result?.[0]?.meta;
          const price = meta?.regularMarketPrice;
          const currency = meta?.currency || 'USD';

          if (price !== undefined && price !== null) {
            resolve({ price: parseFloat(price), currency });
          } else {
            reject(new Error(`Price not found in response for ${symbol}`));
          }
        } catch (e) {
          reject(new Error(`Parse error: ${e.message}`));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timed out')); });
  });
}

/**
 * Fetch current USD → INR exchange rate from Yahoo Finance (USDINR=X ticker).
 * Returns a number like 83.52 on success, falls back to a reasonable static rate.
 */
async function fetchUSDtoINR() {
  try {
    const { price } = await fetchYahoo('USDINR=X');
    if (price && price > 70 && price < 120) return price; // sanity check
    throw new Error('Rate out of expected range');
  } catch (e) {
    console.warn('Could not fetch live USD/INR rate, using fallback:', e.message);
    return 84; // conservative fallback — close to the long-run rate
  }
}

// ─── Main handler ─────────────────────────────────────────────────────────────

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const symbol = (req.query.symbol || '').trim().toUpperCase();
  if (!symbol) return res.status(400).json({ error: 'symbol query parameter is required' });

  try {
    const { price: rawPrice, currency } = await fetchYahoo(symbol);

    let priceINR = rawPrice;
    let usdToInr = null;
    let converted = false;

    // If Yahoo returned a USD price, convert it to INR using the live rate
    if (currency === 'USD') {
      usdToInr = await fetchUSDtoINR();
      priceINR = parseFloat((rawPrice * usdToInr).toFixed(2));
      converted = true;
    }

    return res.status(200).json({
      symbol,
      price: priceINR,           // always in INR
      currency_original: currency,
      currency_returned: 'INR',
      converted,
      usd_to_inr: usdToInr,
      source: 'yahoo',
      // Tips for the frontend:
      // - Indian stocks (NSE): add suffix .NS  e.g. RELIANCE.NS, INFY.NS
      // - Indian stocks (BSE): add suffix .BO  e.g. RELIANCE.BO
      // - US stocks: no suffix e.g. AAPL, MSFT  (will be auto-converted to INR)
    });

  } catch (err) {
    console.warn(`Yahoo Finance failed for ${symbol}: ${err.message}. Using mock price.`);
    return res.status(200).json({
      symbol,
      price: mockPrice(symbol),
      currency_original: 'UNKNOWN',
      currency_returned: 'INR',
      converted: false,
      usd_to_inr: null,
      source: 'mock',
      warning: 'Live price unavailable — deterministic mock price used. Check symbol (add .NS for NSE, .BO for BSE).',
    });
  }
};
