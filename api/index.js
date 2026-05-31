import express from 'express';
import cors from 'cors';
import axios from 'axios';

const app = express();

app.use(cors());
app.use(express.json());

// Stocks Price proxy endpoint
app.get('/api/stocks/price', async (req, res) => {
  const { symbol } = req.query;
  if (!symbol) {
    return res.status(400).json({ error: 'Symbol is required' });
  }
  
  const cleanSymbol = symbol.trim().toUpperCase();
  
  try {
    const response = await axios.get(`https://query1.finance.yahoo.com/v8/finance/chart/${cleanSymbol}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 4000
    });
    
    const result = response.data?.chart?.result?.[0];
    if (result && result.meta && result.meta.regularMarketPrice !== undefined) {
      const price = result.meta.regularMarketPrice;
      return res.json({ symbol: cleanSymbol, price: parseFloat(price.toFixed(4)), source: 'yahoo' });
    }
    
    throw new Error('Symbol details not found in API response');
  } catch (error) {
    console.warn(`Yahoo API failed for ${cleanSymbol}: ${error.message}. Returning intelligent mock price.`);
    
    // Deterministic mock price based on symbol characters
    let sum = 0;
    for (let i = 0; i < cleanSymbol.length; i++) {
      sum += cleanSymbol.charCodeAt(i) * (i + 1);
    }
    
    // Create a price between $10 and $800 based on the letters
    const mockPrice = 10 + (sum % 790) + (sum % 97) / 100;
    
    return res.json({ 
      symbol: cleanSymbol, 
      price: parseFloat(mockPrice.toFixed(4)), 
      source: 'mock',
      warning: 'Yahoo finance request timed out or returned empty. Deterministic mock price used.'
    });
  }
});

// Fallback error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Start Express server locally only (Vercel runs it as serverless)
if (!process.env.VERCEL) {
  const port = process.env.PORT || 3001;
  app.listen(port, () => {
    console.log(`Express server running locally on port ${port}`);
  });
}

export default app;
