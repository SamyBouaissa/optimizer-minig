const express = require('express')
const cors = require('cors')
const path = require('path')
const fs = require('fs')
const multer = require('multer')
const { analyzeInventoryScreenshot, invalidateCache: invalidateIconCache } = require('./analyzeScreenshot')

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } })

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

  const timestamp = new Date().toISOString()
  // Update prices
  prices.minerals[id] = {
    x1: newPrices.x1 || 0,
    x10: newPrices.x10 || 0,
    x100: newPrices.x100 || 0,
    x1000: newPrices.x1000 || 0,
    lastUpdated: timestamp
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

  const timestamp = new Date().toISOString()
  // Update prices
  prices.alloys[id] = {
    x1: newPrices.x1 || 0,
    x10: newPrices.x10 || 0,
    x100: newPrices.x100 || 0,
    x1000: newPrices.x1000 || 0,
    lastUpdated: timestamp
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

// ==================
// SUGGESTIONS ROUTE
// ==================
// Returns 3 levels of "what-if" suggestions:
//   small  : alloys you're 1-10% short on (per ingredient)
//   medium : alloys reachable with up to 25% more resources
//   large  : convert ALL remaining minerals to best alloys possible
app.post('/api/optimize/suggestions', (req, res) => {
  const { inventory } = req.body
  const minerals = readJSON(MINERALS_FILE)
  const alloys   = readJSON(ALLOYS_FILE)
  const prices   = readJSON(PRICES_FILE)
  if (!minerals || !alloys || !prices) return res.status(500).json({ error: 'Error loading data' })

  function getMineralUnitPrice(id) {
    const p = prices.minerals[id]; if (!p) return 0
    if (p.x100 > 0) return p.x100 / 100
    if (p.x10  > 0) return p.x10  / 10
    return p.x1 || 0
  }
  function getAlloyUnitPrice(id) {
    const p = prices.alloys[id]; if (!p) return 0
    if (p.x100 > 0) return p.x100 / 100
    if (p.x10  > 0) return p.x10  / 10
    return p.x1 || 0
  }
  function craftCost(alloy) {
    return alloy.recipe.reduce((s, i) => s + i.quantity * getMineralUnitPrice(i.mineralId), 0)
  }

  // Run base optimisation to get remaining inventory after crafts
  const base = calculateOptimalStrategy(inventory, minerals, alloys, prices)
  const remaining = {}
  // rebuild remaining from base
  const inv = { ...inventory }
  for (const rec of base.recommendations) {
    if (rec.action === 'craft') {
      const alloy = alloys.find(a => a.id === rec.itemId)
      if (alloy) {
        for (const ing of alloy.recipe) {
          inv[ing.mineralId] = (inv[ing.mineralId] || 0) - ing.quantity * rec.quantity
        }
      }
    }
  }
  Object.assign(remaining, inv)

  // For each alloy with profit > 0, compute how many we could craft and what's missing
  const profitable = alloys.map(alloy => {
    const sp = getAlloyUnitPrice(alloy.id)
    const cc = craftCost(alloy)
    return { alloy, sellPrice: sp, cost: cc, profit: sp - cc }
  }).filter(a => a.profit > 0 && a.sellPrice > 0)
    .sort((a, b) => b.profit - a.profit)

  function missingFor(alloy, inv, extraPct) {
    const missing = {}
    let canCraft = Infinity
    for (const ing of alloy.recipe) {
      const have = (inv[ing.mineralId] || 0)
      const need = ing.quantity
      if (have < need) missing[ing.mineralId] = need - have
      canCraft = Math.min(canCraft, Math.floor(have / need))
    }
    if (canCraft === Infinity) canCraft = 0
    // How many more could we craft if we had extraPct% more of each resource
    const boosted = {}
    for (const [k, v] of Object.entries(inv)) boosted[k] = Math.floor(v * (1 + extraPct))
    let boostedCraft = Infinity
    for (const ing of alloy.recipe) boostedCraft = Math.min(boostedCraft, Math.floor((boosted[ing.mineralId] || 0) / ing.quantity))
    if (boostedCraft === Infinity) boostedCraft = 0
    return { missing, canCraft, boostedCraft }
  }

  // SMALL: t'as ≥ 90% de chaque ingrédient pour 1 craft (manque ≤ 10% de chaque)
  const small = []
  for (const { alloy, profit } of profitable) {
    let qualifies = true
    const missingDetails = {}
    let anyMissing = false

    for (const ing of alloy.recipe) {
      const have = remaining[ing.mineralId] || 0
      const need = ing.quantity
      const pct = need > 0 ? (need - have) / need : 0
      if (pct > 0.10) { qualifies = false; break }
      if (have < need) {
        anyMissing = true
        missingDetails[ing.mineralId] = {
          need: need - have,
          name: minerals.find(m => m.id === ing.mineralId)?.name || ing.mineralId,
          pct: Math.round(pct * 100)
        }
      }
    }

    if (qualifies && anyMissing) {
      const parts = Object.values(missingDetails).map(d => `${d.need} ${d.name}`).join(', ')
      small.push({
        alloyId: alloy.id, alloyName: alloy.name,
        profit: Math.round(profit),
        missing: missingDetails,
        message: `Il te manque seulement ${parts} pour 1 craft`
      })
    }
  }

  // MEDIUM: t'as ≥ 75% de chaque ingrédient pour 1 craft (manque ≤ 25% de chaque)
  const medium = []
  for (const { alloy, profit } of profitable) {
    let qualifies = true
    const missingDetails = {}
    let anyMissing = false

    for (const ing of alloy.recipe) {
      const have = remaining[ing.mineralId] || 0
      const need = ing.quantity
      const pct = need > 0 ? (need - have) / need : 0
      if (pct > 0.25) { qualifies = false; break }
      if (have < need) {
        anyMissing = true
        missingDetails[ing.mineralId] = {
          need: need - have,
          name: minerals.find(m => m.id === ing.mineralId)?.name || ing.mineralId,
          pct: Math.round(pct * 100)
        }
      }
    }

    // Exclude items already in small
    const alreadySmall = small.some(s => s.alloyId === alloy.id)
    if (qualifies && anyMissing && !alreadySmall) {
      // How many crafts currently possible
      let canCraft = Infinity
      for (const ing of alloy.recipe) canCraft = Math.min(canCraft, Math.floor((remaining[ing.mineralId] || 0) / ing.quantity))
      if (canCraft === Infinity) canCraft = 0

      medium.push({
        alloyId: alloy.id, alloyName: alloy.name,
        currentCraftable: canCraft,
        boostedCraftable: canCraft + 1,
        gainIfBoosted: Math.round(profit),
        extraNeeded: missingDetails,
        profitPerUnit: Math.round(profit)
      })
    }
  }

  // LARGE: t'as 100% de tout pour au moins 1 craft complet
  const large = []
  for (const { alloy, profit } of profitable) {
    let maxC = Infinity
    for (const ing of alloy.recipe) {
      const have = remaining[ing.mineralId] || 0
      maxC = Math.min(maxC, Math.floor(have / ing.quantity))
    }
    if (maxC === Infinity) maxC = 0
    if (maxC >= 1) {
      large.push({
        alloyId: alloy.id, alloyName: alloy.name,
        craftable: maxC,
        totalProfit: Math.round(profit * maxC),
        profitPerUnit: Math.round(profit),
        missing: {}
      })
    }
  }

  res.json({ small, medium, large: large.slice(0, 8) })
})

// ==================
// IMPACT ANALYSIS
// ==================
app.get('/api/analyze/impact', (req, res) => {
  const minerals = readJSON(MINERALS_FILE)
  const alloys   = readJSON(ALLOYS_FILE)
  const prices   = readJSON(PRICES_FILE)
  if (!minerals || !alloys || !prices) return res.status(500).json({ error: 'Error loading data' })

  function getMineralUnitPrice(id) {
    const p = prices.minerals[id]; if (!p) return 0
    if (p.x100 > 0) return p.x100 / 100
    if (p.x10  > 0) return p.x10  / 10
    return p.x1 || 0
  }
  function getAlloyUnitPrice(id) {
    const p = prices.alloys[id]; if (!p) return 0
    if (p.x100 > 0) return p.x100 / 100
    if (p.x10  > 0) return p.x10  / 10
    return p.x1 || 0
  }

  const impact = minerals.map(mineral => {
    const directPrice = getMineralUnitPrice(mineral.id)
    // Which alloys use this mineral?
    const usedIn = alloys.filter(a => a.recipe.some(i => i.mineralId === mineral.id))

    const alloyUsages = usedIn.map(alloy => {
      const sp = getAlloyUnitPrice(alloy.id)
      const totalCost = alloy.recipe.reduce((s, i) => s + i.quantity * getMineralUnitPrice(i.mineralId), 0)
      const qty = alloy.recipe.find(i => i.mineralId === mineral.id)?.quantity || 0
      const ingredientCost = qty * directPrice
      const profit = sp - totalCost
      // Value of this mineral in this alloy context (alloy sell / total ingredients)
      const effectiveValueInAlloy = totalCost > 0 ? (sp / totalCost) * directPrice : directPrice
      return {
        alloyId: alloy.id, alloyName: alloy.name,
        quantityNeeded: qty,
        alloyProfit: Math.round(profit),
        alloySellPrice: Math.round(sp),
        ingredientWeight: totalCost > 0 ? Math.round((ingredientCost / totalCost) * 100) : 0,
        effectiveValue: Math.round(effectiveValueInAlloy),
        isWorthCrafting: profit > 0
      }
    }).sort((a, b) => b.alloySellPrice - a.alloySellPrice)

    // Best effective value across all usages
    const bestAlloyUsage = alloyUsages.find(u => u.isWorthCrafting)
    const bestEffectiveValue = bestAlloyUsage ? bestAlloyUsage.effectiveValue : directPrice
    const worthSelling = directPrice >= bestEffectiveValue || !bestAlloyUsage
    const gainIfCrafted = bestAlloyUsage ? Math.round(bestEffectiveValue - directPrice) : 0

    return {
      id: mineral.id, name: mineral.name, level: mineral.level,
      directPrice: Math.round(directPrice),
      usedInCount: usedIn.length,
      usedIn: alloyUsages,
      bestEffectiveValue: Math.round(bestEffectiveValue),
      worthSelling,
      gainIfCrafted,
      warning: !worthSelling && gainIfCrafted > 0
        ? `+${gainIfCrafted.toLocaleString('fr-FR')} K/unité si utilisé dans ${bestAlloyUsage?.alloyName}`
        : null
    }
  }).filter(m => m.directPrice > 0)
    .sort((a, b) => b.directPrice - a.directPrice)

  res.json(impact)
})

// ==================
// SCREENSHOT ANALYSIS
// ==================

app.post('/api/analyze/screenshot', upload.single('screenshot'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' })

  const target = req.query.target || 'minerals' // 'minerals' | 'alloys' | 'all'

  const minerals = readJSON(MINERALS_FILE) || []
  const alloys = readJSON(ALLOYS_FILE) || []

  let knownItems = []
  if (target === 'minerals') knownItems = minerals
  else if (target === 'alloys') knownItems = alloys
  else knownItems = [...minerals, ...alloys]

  try {
    const results = await analyzeInventoryScreenshot(req.file.buffer, knownItems)
    res.json({ results })
  } catch (err) {
    console.error('Screenshot analysis error:', err)
    res.status(500).json({ error: 'Analysis failed', detail: err.message })
  }
})

// Start server
app.listen(PORT, () => {
  console.log(`🎮 Dofus Optimizer API running on http://localhost:${PORT}`)
  console.log(`📁 Data directory: ${DATA_DIR}`)
})
