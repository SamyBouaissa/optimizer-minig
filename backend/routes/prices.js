const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const pricesPath = path.join(__dirname, '../data/prices.json');
const historyPath = path.join(__dirname, '../data/price_history.json');

// Helper to read JSON file
const readJson = (filePath) => {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return {};
  }
};

// Helper to write JSON file
const writeJson = (filePath, data) => {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
};

// Get all prices
router.get('/', (req, res) => {
  try {
    const prices = readJson(pricesPath);
    res.json(prices);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la lecture des prix' });
  }
});

// Get price for a specific item
router.get('/:type/:id', (req, res) => {
  try {
    const { type, id } = req.params;
    const prices = readJson(pricesPath);
    const key = `${type}_${id}`;
    
    if (!prices[key]) {
      return res.json({ 
        itemId: id, 
        itemType: type,
        prices: { x1: 0, x10: 0, x100: 0, x1000: 0 },
        lastUpdated: null 
      });
    }
    res.json(prices[key]);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la lecture du prix' });
  }
});

// Update price for an item
router.put('/:type/:id', (req, res) => {
  try {
    const { type, id } = req.params;
    const { x1, x10, x100, x1000 } = req.body;
    const key = `${type}_${id}`;
    const timestamp = new Date().toISOString();
    
    // Update current prices
    const prices = readJson(pricesPath);
    const oldPrice = prices[key];
    
    prices[key] = {
      itemId: id,
      itemType: type,
      prices: { 
        x1: x1 || 0, 
        x10: x10 || 0, 
        x100: x100 || 0, 
        x1000: x1000 || 0 
      },
      lastUpdated: timestamp
    };
    writeJson(pricesPath, prices);
    
    // Add to history
    const history = readJson(historyPath);
    if (!history[key]) {
      history[key] = [];
    }
    
    history[key].push({
      prices: { x1: x1 || 0, x10: x10 || 0, x100: x100 || 0, x1000: x1000 || 0 },
      timestamp
    });
    
    // Keep only last 100 entries per item
    if (history[key].length > 100) {
      history[key] = history[key].slice(-100);
    }
    
    writeJson(historyPath, history);
    
    res.json({ 
      success: true, 
      data: prices[key],
      message: 'Prix mis à jour avec succès'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du prix' });
  }
});

// Get price history for an item
router.get('/history/:type/:id', (req, res) => {
  try {
    const { type, id } = req.params;
    const key = `${type}_${id}`;
    const history = readJson(historyPath);
    
    res.json(history[key] || []);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la lecture de l\'historique' });
  }
});

// Get all price history
router.get('/history', (req, res) => {
  try {
    const history = readJson(historyPath);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la lecture de l\'historique' });
  }
});

module.exports = router;
