const API_BASE = '/api'

async function fetchJSON(url, options = {}) {
  try {
    const res = await fetch(url, options)
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`)
    }
    return await res.json()
  } catch (error) {
    console.error(`API Error for ${url}:`, error)
    throw error
  }
}

// Minerals API
export async function getMinerals() {
  return fetchJSON(`${API_BASE}/minerals`)
}

export async function getMineralPrices() {
  return fetchJSON(`${API_BASE}/prices/minerals`)
}

export async function updateMineralPrice(mineralId, prices) {
  return fetchJSON(`${API_BASE}/prices/minerals/${mineralId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(prices)
  })
}

// Alloys API
export async function getAlloys() {
  return fetchJSON(`${API_BASE}/alloys`)
}

export async function getAlloyPrices() {
  return fetchJSON(`${API_BASE}/prices/alloys`)
}

export async function updateAlloyPrice(alloyId, prices) {
  return fetchJSON(`${API_BASE}/prices/alloys/${alloyId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(prices)
  })
}

// Price History API
export async function getPriceHistory(type, itemId) {
  return fetchJSON(`${API_BASE}/prices/history/${type}/${itemId}`)
}

export async function getAllPriceHistory() {
  return fetchJSON(`${API_BASE}/prices/history`)
}

// Optimizer API
export async function calculateOptimal(inventory, avoidX1000 = false) {
  return fetchJSON(`${API_BASE}/optimize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ inventory, avoidX1000 })
  })
}

export async function getSuggestions(inventory) {
  return fetchJSON(`${API_BASE}/optimize/suggestions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ inventory })
  })
}

export async function getImpactAnalysis() {
  return fetchJSON(`${API_BASE}/analyze/impact`)
}

/**
 * Upload a screenshot for automatic inventory recognition.
 * @param {File} file - The image file to analyze
 * @param {'minerals'|'alloys'|'all'} target - Which items to match against
 * @returns {Promise<{results: Array<{itemId, name, quantity, confidence}>}>}
 */
export async function analyzeScreenshot(file, target = 'minerals') {
  const formData = new FormData()
  formData.append('screenshot', file)
  const res = await fetch(`${API_BASE}/analyze/screenshot?target=${target}`, {
    method: 'POST',
    body: formData
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  return res.json()
}
