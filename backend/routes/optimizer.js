const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const mineralsPath = path.join(__dirname, '../data/minerals.json');
const alloysPath = path.join(__dirname, '../data/alloys.json');
const pricesPath = path.join(__dirname, '../data/prices.json');

const readJson = (filePath) => {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return filePath.includes('prices') ? {} : [];
  }
};

/**
 * Returns the best selling strategy for a given quantity:
 * the combination of lots (x1000, x100, x10, x1) that maximises revenue.
 * If avoidX1000 is true, x1000 lots are ignored.
 */
const getBestSellValue = (quantity, priceData, avoidX1000 = false) => {
  if (!priceData || !priceData.prices) return { total: 0, breakdown: [] };

  const { x1 = 0, x10 = 0, x100 = 0, x1000 = 0 } = priceData.prices;

  const lots = [
    { size: 1000, price: x1000, label: 'x1000' },
    { size: 100,  price: x100,  label: 'x100'  },
    { size: 10,   price: x10,   label: 'x10'   },
    { size: 1,    price: x1,    label: 'x1'    },
  ].filter(l => l.price > 0 && !(avoidX1000 && l.size === 1000));

  // dp[q] = best total for selling exactly q units
  const dp = new Array(quantity + 1).fill(0);
  const choice = new Array(quantity + 1).fill(null);

  for (let q = 1; q <= quantity; q++) {
    for (const lot of lots) {
      if (q >= lot.size) {
        const candidate = dp[q - lot.size] + lot.price;
        if (candidate > dp[q]) {
          dp[q] = candidate;
          choice[q] = lot;
        }
      }
    }
  }

  // Reconstruct breakdown
  const breakdown = {};
  let rem = quantity;
  while (rem > 0 && choice[rem]) {
    const lot = choice[rem];
    breakdown[lot.label] = (breakdown[lot.label] || 0) + 1;
    rem -= lot.size;
  }

  return { total: dp[quantity], breakdown };
};

/**
 * Best unit price for cost calculation (ingredient cost).
 * Uses the cheapest lot per unit (most efficient purchase price).
 * For selling alloys we use getBestSellValue.
 */
const getBestUnitPrice = (priceData, avoidX1000 = false) => {
  if (!priceData || !priceData.prices) return 0;
  const { x1 = 0, x10 = 0, x100 = 0, x1000 = 0 } = priceData.prices;
  const candidates = [
    x1 > 0 ? x1 : null,
    x10 > 0 ? x10 / 10 : null,
    x100 > 0 ? x100 / 100 : null,
    !avoidX1000 && x1000 > 0 ? x1000 / 1000 : null,
  ].filter(v => v !== null);
  return candidates.length > 0 ? Math.max(...candidates) : 0;
};

router.post('/calculate', (req, res) => {
  try {
    const { inventory, avoidX1000 = false } = req.body;

    if (!inventory || Object.keys(inventory).length === 0) {
      return res.status(400).json({ error: 'Inventaire vide' });
    }

    const minerals = readJson(mineralsPath);
    const alloys = readJson(alloysPath);
    const prices = readJson(pricesPath);

    let workingInventory = { ...inventory };
    const recommendations = [];
    let totalKamas = 0;

    // Step 1: unit sell value per mineral (for opportunity cost)
    const mineralValues = {};
    minerals.forEach(mineral => {
      const priceKey = `mineral_${mineral.id}`;
      mineralValues[mineral.id] = getBestUnitPrice(prices[priceKey], avoidX1000);
    });

    // Step 2: alloy profitability
    const alloyProfits = alloys.map(alloy => {
      const priceKey = `alloy_${alloy.id}`;
      const priceData = prices[priceKey];
      // For alloy sell price, use best unit price (we'll compute exact lots at step 3)
      const alloySellUnitPrice = getBestUnitPrice(priceData, avoidX1000);

      let ingredientCost = 0;
      alloy.recipe.forEach(ingredient => {
        ingredientCost += (mineralValues[ingredient.mineralId] || 0) * ingredient.quantity;
      });

      const profit = alloySellUnitPrice - ingredientCost;
      return { alloy, priceData, alloySellUnitPrice, ingredientCost, profit };
    }).filter(a => a.profit > 0).sort((a, b) => b.profit - a.profit);

    // Step 3: greedy crafting
    let crafting = true;
    while (crafting) {
      crafting = false;
      for (const alloyData of alloyProfits) {
        const { alloy } = alloyData;
        let maxCraftable = Infinity;
        for (const ingredient of alloy.recipe) {
          const available = workingInventory[ingredient.mineralId] || 0;
          maxCraftable = Math.min(maxCraftable, Math.floor(available / ingredient.quantity));
        }

        if (maxCraftable > 0 && maxCraftable !== Infinity) {
          crafting = true;

          for (const ingredient of alloy.recipe) {
            workingInventory[ingredient.mineralId] -= ingredient.quantity * maxCraftable;
          }

          const { total: sellTotal, breakdown } = getBestSellValue(
            maxCraftable, alloyData.priceData, avoidX1000
          );

          const existing = recommendations.find(r => r.type === 'craft' && r.itemId === alloy.id);
          if (existing) {
            existing.quantity += maxCraftable;
            existing.totalKamas += sellTotal;
            existing.profit += alloyData.profit * maxCraftable;
          } else {
            recommendations.push({
              type: 'craft',
              itemId: alloy.id,
              itemName: alloy.name,
              quantity: maxCraftable,
              unitPrice: alloyData.alloySellUnitPrice,
              totalKamas: sellTotal,
              profit: alloyData.profit * maxCraftable,
              lotBreakdown: breakdown,
              recipe: alloy.recipe,
            });
          }

          totalKamas += sellTotal;
          break;
        }
      }
    }

    // Step 4: sell remaining minerals with optimal lot breakdown
    for (const [mineralId, quantity] of Object.entries(workingInventory)) {
      if (quantity <= 0) continue;
      const mineral = minerals.find(m => m.id === mineralId);
      const priceKey = `mineral_${mineralId}`;
      const priceData = prices[priceKey];
      const { total: sellTotal, breakdown } = getBestSellValue(quantity, priceData, avoidX1000);

      if (sellTotal > 0) {
        recommendations.push({
          type: 'sell',
          itemId: mineralId,
          itemName: mineral?.name || mineralId,
          quantity,
          unitPrice: mineralValues[mineralId],
          totalKamas: sellTotal,
          lotBreakdown: breakdown,
        });
        totalKamas += sellTotal;
      } else {
        recommendations.push({
          type: 'no_price',
          itemId: mineralId,
          itemName: mineral?.name || mineralId,
          quantity,
          message: 'Aucun prix défini - impossible de calculer la valeur',
        });
      }
    }

    recommendations.sort((a, b) => {
      const order = { craft: 0, sell: 1, no_price: 2 };
      return order[a.type] - order[b.type];
    });

    res.json({
      success: true,
      recommendations,
      totalKamas,
      avoidX1000,
      summary: {
        craftCount: recommendations.filter(r => r.type === 'craft').length,
        sellCount: recommendations.filter(r => r.type === 'sell').length,
        noPriceCount: recommendations.filter(r => r.type === 'no_price').length,
      },
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erreur lors du calcul d'optimisation" });
  }
});

module.exports = router;
