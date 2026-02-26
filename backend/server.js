const express = require('express')
const cors = require('cors')
const path = require('path')
const fs = require('fs')

const app = express()
const PORT = 3001

// Middleware
app.use(cors())
app.use(express.json())

// Data file paths
const DATA_DIR = path.join(__dirname, 'data')
const MINERALS_FILE = path.join(DATA_DIR, 'minerals.json')
const ALLOYS_FILE = path.join(DATA_DIR, 'alloys.json')
const PRICES_FILE = path.join(DATA_DIR, 'prices.json')
const HISTORY_FILE = path.join(DATA_DIR, 'price_history.json')

// Helper functions
function readJSON(filePath) {
  try {
    const data = fs.readFileSync(filePath, 'utf8')
    return JSON.parse(data)
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err)
    return null
  }
}

function writeJSON(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8')
    return true
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err)
    return false
  }
}

// ==================
// MINERALS ROUTES
// ==================

app.get('/api/minerals', (req, res) => {
  const minerals = readJSON(MINERALS_FILE)
  if (minerals) {
    res.json(minerals)
  } else {
    res.status(500).json({ error: 'Error loading minerals' })
  }
})

// ==================
// ALLOYS ROUTES
// ==================

app.get('/api/alloys', (req, res) => {
  const alloys = readJSON(ALLOYS_FILE)
  if (alloys) {
    res.json(alloys)
  } else {
    res.status(500).json({ error: 'Error loading alloys' })
  }
})

// ==================
// PRICES ROUTES
// ==================

// Get all mineral prices
app.get('/api/prices/minerals', (req, res) => {
  const prices = readJSON(PRICES_FILE)
  if (prices) {
    res.json(prices.minerals || {})
  } else {
    res.status(500).json({ error: 'Error loading prices' })
  }
})

// Get all alloy prices
app.get('/api/prices/alloys', (req, res) => {
  const prices = readJSON(PRICES_FILE)
  if (prices) {
    res.json(prices.alloys || {})
  } else {
    res.status(500).json({ error: 'Error loading prices' })
  }
})

// Update mineral price
app.put('/api/prices/minerals/:id', (req, res) => {
  const { id } = req.params
  const newPrices = req.body

  const prices = readJSON(PRICES_FILE)
  const history = readJSON(HISTORY_FILE)
  const minerals = readJSON(MINERALS_FILE)

  if (!prices || !history) {
    return res.status(500).json({ error: 'Error loading data' })
  }

  // Update prices
  prices.minerals[id] = {
    x1: newPrices.x1 || 0,
    x10: newPrices.x10 || 0,
    x100: newPrices.x100 || 0
  }

  // Add to history
  const mineral = minerals?.find(m => m.id === id)
  history.minerals.push({
    itemId: id,
    name: mineral?.name || id,
    timestamp: new Date().toISOString(),
    prices: prices.minerals[id]
  })

  // Keep only last 100 history entries per type
  if (history.minerals.length > 500) {
    history.minerals = history.minerals.slice(-500)
  }

  if (writeJSON(PRICES_FILE, prices) && writeJSON(HISTORY_FILE, history)) {
    res.json({ success: true, prices: prices.minerals[id] })
  } else {
    res.status(500).json({ error: 'Error saving prices' })
  }
})

// Update alloy price
app.put('/api/prices/alloys/:id', (req, res) => {
  const { id } = req.params
  const newPrices = req.body

  const prices = readJSON(PRICES_FILE)
  const history = readJSON(HISTORY_FILE)
  const alloys = readJSON(ALLOYS_FILE)

  if (!prices || !history) {
    return res.status(500).json({ error: 'Error loading data' })
  }

  // Update prices
  prices.alloys[id] = {
    x1: newPrices.x1 || 0,
    x10: newPrices.x10 || 0,
    x100: newPrices.x100 || 0
  }

  // Add to history
  const alloy = alloys?.find(a => a.id === id)
  history.alloys.push({
    itemId: id,
    name: alloy?.name || id,
    timestamp: new Date().toISOString(),
    prices: prices.alloys[id]
  })

  // Keep only last 500 history entries
  if (history.alloys.length > 500) {
    history.alloys = history.alloys.slice(-500)
  }

  if (writeJSON(PRICES_FILE, prices) && writeJSON(HISTORY_FILE, history)) {
    res.json({ success: true, prices: prices.alloys[id] })
  } else {
    res.status(500).json({ error: 'Error saving prices' })
  }
})

// ==================
// HISTORY ROUTES
// ==================

// Get all price history
app.get('/api/prices/history', (req, res) => {
  const history = readJSON(HISTORY_FILE)
  if (history) {
    res.json(history)
  } else {
    res.status(500).json({ error: 'Error loading history' })
  }
})

// Get price history for a specific item
app.get('/api/prices/history/:type/:id', (req, res) => {
  const { type, id } = req.params
  const history = readJSON(HISTORY_FILE)

  if (!history) {
    return res.status(500).json({ error: 'Error loading history' })
  }

  const itemHistory = (history[type] || []).filter(h => h.itemId === id)
  res.json(itemHistory)
})

// ==================
// OPTIMIZER ROUTES
// ==================

app.post('/api/optimize', (req, res) => {
  const { inventory } = req.body

  const minerals = readJSON(MINERALS_FILE)
  const alloys = readJSON(ALLOYS_FILE)
  const prices = readJSON(PRICES_FILE)

  if (!minerals || !alloys || !prices) {
    return res.status(500).json({ error: 'Error loading data' })
  }

  try {
    const result = calculateOptimalStrategy(inventory, minerals, alloys, prices)
    res.json(result)
  } catch (err) {
    console.error('Optimization error:', err)
    res.status(500).json({ error: 'Error calculating optimization' })
  }
})

// Optimization algorithm
function calculateOptimalStrategy(inventory, minerals, alloys, prices) {
  const recommendations = []
  let totalKamas = 0
  const remainingInventory = { ...inventory }

  // Get unit price for a mineral (prefer x100 price / 100, then x10 / 10, then x1)
  function getMineralUnitPrice(mineralId) {
    const mineralPrices = prices.minerals[mineralId]
    if (!mineralPrices) return 0
    
    if (mineralPrices.x100 > 0) return mineralPrices.x100 / 100
    if (mineralPrices.x10 > 0) return mineralPrices.x10 / 10
    return mineralPrices.x1 || 0
  }

  // Get unit price for an alloy
  function getAlloyUnitPrice(alloyId) {
    const alloyPrices = prices.alloys[alloyId]
    if (!alloyPrices) return 0
    
    if (alloyPrices.x100 > 0) return alloyPrices.x100 / 100
    if (alloyPrices.x10 > 0) return alloyPrices.x10 / 10
    return alloyPrices.x1 || 0
  }

  // Calculate crafting cost for an alloy
  function getCraftingCost(alloy) {
    let cost = 0
    for (const ingredient of alloy.recipe) {
      cost += ingredient.quantity * getMineralUnitPrice(ingredient.mineralId)
    }
    return cost
  }

  // Check if we can craft an alloy with current inventory
  function canCraft(alloy, inv) {
    for (const ingredient of alloy.recipe) {
      if ((inv[ingredient.mineralId] || 0) < ingredient.quantity) {
        return false
      }
    }
    return true
  }

  // Calculate how many of an alloy we can craft
  function maxCraftable(alloy, inv) {
    let max = Infinity
    for (const ingredient of alloy.recipe) {
      const available = inv[ingredient.mineralId] || 0
      const possible = Math.floor(available / ingredient.quantity)
      max = Math.min(max, possible)
    }
    return max === Infinity ? 0 : max
  }

  // Calculate profit per craft for each alloy
  const alloysWithProfit = alloys.map(alloy => {
    const sellPrice = getAlloyUnitPrice(alloy.id)
    const craftCost = getCraftingCost(alloy)
    const profit = sellPrice - craftCost
    const bonusKamas = alloy.bonusKamas || 0
    
    return {
      ...alloy,
      sellPrice,
      craftCost,
      profit: profit + bonusKamas,
      profitPerMineral: alloy.recipe.reduce((sum, i) => sum + i.quantity, 0) > 0
        ? profit / alloy.recipe.reduce((sum, i) => sum + i.quantity, 0)
        : 0
    }
  }).filter(a => a.sellPrice > 0) // Only consider alloys with prices set
    .sort((a, b) => b.profit - a.profit) // Sort by profit descending

  // Greedy algorithm: craft the most profitable alloys first
  let craftedSomething = true
  while (craftedSomething) {
    craftedSomething = false

    for (const alloy of alloysWithProfit) {
      if (alloy.profit <= 0) continue // Skip unprofitable alloys

      const craftable = maxCraftable(alloy, remainingInventory)
      if (craftable > 0) {
        // Craft as many as profitable
        const toCraft = craftable

        // Deduct minerals from inventory
        for (const ingredient of alloy.recipe) {
          remainingInventory[ingredient.mineralId] -= ingredient.quantity * toCraft
        }

        // Calculate earnings
        const earnings = toCraft * alloy.sellPrice + (alloy.bonusKamas || 0) * toCraft
        totalKamas += earnings

        recommendations.push({
          action: 'craft',
          itemId: alloy.id,
          itemName: alloy.name,
          quantity: toCraft,
          profit: Math.round(earnings)
        })

        craftedSomething = true
        break // Re-evaluate from the beginning
      }
    }
  }

  // Sell remaining minerals directly
  for (const [mineralId, quantity] of Object.entries(remainingInventory)) {
    if (quantity > 0) {
      const unitPrice = getMineralUnitPrice(mineralId)
      if (unitPrice > 0) {
        const earnings = quantity * unitPrice
        totalKamas += earnings

        const mineral = minerals.find(m => m.id === mineralId)
        recommendations.push({
          action: 'sell',
          itemId: mineralId,
          itemName: mineral?.name || mineralId,
          quantity,
          profit: Math.round(earnings)
        })
      }
    }
  }

  // Filter out minerals that were fully used
  const remainingMinerals = {}
  for (const [mineralId, quantity] of Object.entries(remainingInventory)) {
    if (quantity > 0 && getMineralUnitPrice(mineralId) === 0) {
      remainingMinerals[mineralId] = quantity
    }
  }

  return {
    totalKamas: Math.round(totalKamas),
    recommendations: recommendations.sort((a, b) => b.profit - a.profit),
    remainingMinerals
  }
}

// Start server
app.listen(PORT, () => {
  console.log(`🎮 Dofus Optimizer API running on http://localhost:${PORT}`)
  console.log(`📁 Data directory: ${DATA_DIR}`)
})
