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
export async function calculateOptimal(inventory) {
  return fetchJSON(`${API_BASE}/optimize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ inventory })
  })
}
