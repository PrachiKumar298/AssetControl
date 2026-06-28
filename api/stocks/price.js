// Vercel serverless function: GET /api/stocks/price?symbol=AAPL
// Uses CommonJS so it works regardless of the root package "type": "module"

const https = require('https');

/**
 * Deterministic fallback price generator so the app is never broken
 * even when Yahoo Finance is unavailable.
 */
function mockPrice(symbol) {
  let sum = 0;
  for (let i = 0; i < symbol.length; i++) {
    sum += symbol.charCodeAt(i) * (i + 1);
  }
  const price = 10 + (sum % 790) + (sum % 97) / 100;
  return parseFloat(price.toFixed(4));
}

/**
 * Fetch price from Yahoo Finance v8 chart API.
 * Returns { price } on success, throws on failure.
 */
function fetchYahoo(symbol) {
  return new Promise((resolve, reject) => {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`;
    const options = {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'application/json',
      },
      timeout: 5000,
    };

    const req = https.get(url, options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          const price = json?.chart?.result?.[0]?.meta?.regularMarketPrice;
          if (price !== undefined && price !== null) {
            resolve(parseFloat(price.toFixed(4)));
          } else {
            reject(new Error('Price not found in response'));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });
  });
}

module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const symbol = (req.query.symbol || '').trim().toUpperCase();
  if (!symbol) {
    return res.status(400).json({ error: 'symbol query parameter is required' });
  }

  try {
    const price = await fetchYahoo(symbol);
    return res.status(200).json({ symbol, price, source: 'yahoo' });
  } catch (err) {
    console.warn(`Yahoo Finance failed for ${symbol}: ${err.message}. Using mock price.`);
    return res.status(200).json({
      symbol,
      price: mockPrice(symbol),
      source: 'mock',
      warning: 'Live price unavailable; deterministic mock price used.',
    });
  }
};
