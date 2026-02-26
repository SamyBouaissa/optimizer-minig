const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const mineralsPath = path.join(__dirname, '../data/minerals.json');
const alloysPath = path.join(__dirname, '../data/alloys.json');
const pricesPath = path.join(__dirname, '../data/prices.json');

// Helper to read JSON file
const readJson = (filePath) => {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return filePath.includes('prices') ? {} : [];
  }
};

// Get best unit price for an item (considering lot sizes)
const getBestUnitPrice = (priceData) => {
  if (!priceData || !priceData.prices) return 0;
  
  const { x1, x10, x100, x1000 } = priceData.prices;
  const unitPrices = [
    x1 || 0,
    (x10 || 0) / 10,
    (x100 || 0) / 100,
    (x1000 || 0) / 1000
  ].filter(p => p > 0);
  
  return unitPrices.length > 0 ? Math.max(...unitPrices) : 0;
};

// Calculate optimal selling strategy
router.post('/calculate', (req, res) => {
  try {
    const { inventory } = req.body; // { mineralId: quantity, ... }
    
    if (!inventory || Object.keys(inventory).length === 0) {
      return res.status(400).json({ error: 'Inventaire vide' });
    }
    
    const minerals = readJson(mineralsPath);
    const alloys = readJson(alloysPath);
    const prices = readJson(pricesPath);
    
    // Working copy of inventory
    let workingInventory = { ...inventory };
    
    // Results
    const recommendations = [];
    let totalKamas = 0;
    
    // Step 1: Calculate direct sell value for each mineral
    const mineralValues = {};
    minerals.forEach(mineral => {
      const priceKey = `mineral_${mineral.id}`;
      const priceData = prices[priceKey];
      mineralValues[mineral.id] = getBestUnitPrice(priceData);
    });
    
    // Step 2: Calculate alloy profitability
    const alloyProfits = alloys.map(alloy => {
      const priceKey = `alloy_${alloy.id}`;
      const priceData = prices[priceKey];
      const alloySellPrice = getBestUnitPrice(priceData);
      
      // Calculate cost of ingredients
      let ingredientCost = 0;
      let canCraft = true;
      
      alloy.recipe.forEach(ingredient => {
        const mineralValue = mineralValues[ingredient.mineralId] || 0;
        ingredientCost += mineralValue * ingredient.quantity;
      });
      
      const profit = alloySellPrice - ingredientCost;
      const profitMargin = ingredientCost > 0 ? (profit / ingredientCost) * 100 : 0;
      
      return {
        alloy,
        sellPrice: alloySellPrice,
        ingredientCost,
        profit,
        profitMargin
      };
    }).filter(a => a.profit > 0).sort((a, b) => b.profit - a.profit);
    
    // Step 3: Craft profitable alloys while possible
    let crafting = true;
    while (crafting) {
      crafting = false;
      
      for (const alloyData of alloyProfits) {
        const { alloy } = alloyData;
        
        // Check if we can craft this alloy
        let maxCraftable = Infinity;
        for (const ingredient of alloy.recipe) {
          const available = workingInventory[ingredient.mineralId] || 0;
          const craftableFromThis = Math.floor(available / ingredient.quantity);
          maxCraftable = Math.min(maxCraftable, craftableFromThis);
        }
        
        if (maxCraftable > 0 && maxCraftable !== Infinity) {
          // Craft as many as profitable
          crafting = true;
          
          // Consume ingredients
          for (const ingredient of alloy.recipe) {
            workingInventory[ingredient.mineralId] -= ingredient.quantity * maxCraftable;
          }
          
          // Add recommendation
          const existingRec = recommendations.find(r => r.type === 'craft' && r.itemId === alloy.id);
          if (existingRec) {
            existingRec.quantity += maxCraftable;
            existingRec.totalKamas += alloyData.sellPrice * maxCraftable;
          } else {
            recommendations.push({
              type: 'craft',
              itemId: alloy.id,
              itemName: alloy.name,
              quantity: maxCraftable,
              unitPrice: alloyData.sellPrice,
              totalKamas: alloyData.sellPrice * maxCraftable,
              profit: alloyData.profit * maxCraftable,
              recipe: alloy.recipe
            });
          }
          
          totalKamas += alloyData.sellPrice * maxCraftable;
          break; // Re-evaluate from most profitable
        }
      }
    }
    
    // Step 4: Sell remaining minerals directly
    for (const [mineralId, quantity] of Object.entries(workingInventory)) {
      if (quantity > 0) {
        const mineral = minerals.find(m => m.id === mineralId);
        const unitPrice = mineralValues[mineralId] || 0;
        
        if (unitPrice > 0) {
          recommendations.push({
            type: 'sell',
            itemId: mineralId,
            itemName: mineral?.name || mineralId,
            quantity,
            unitPrice,
            totalKamas: unitPrice * quantity
          });
          totalKamas += unitPrice * quantity;
        } else {
          recommendations.push({
            type: 'no_price',
            itemId: mineralId,
            itemName: mineral?.name || mineralId,
            quantity,
            message: 'Aucun prix défini - impossible de calculer la valeur'
          });
        }
      }
    }
    
    // Sort recommendations: crafts first, then sells, then no_price
    recommendations.sort((a, b) => {
      const order = { craft: 0, sell: 1, no_price: 2 };
      return order[a.type] - order[b.type];
    });
    
    res.json({
      success: true,
      recommendations,
      totalKamas,
      summary: {
        craftCount: recommendations.filter(r => r.type === 'craft').length,
        sellCount: recommendations.filter(r => r.type === 'sell').length,
        noPriceCount: recommendations.filter(r => r.type === 'no_price').length
      }
    });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur lors du calcul d\'optimisation' });
  }
});

module.exports = router;
