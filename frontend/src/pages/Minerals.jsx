import { useEffect, useState } from 'react'
import { Search, Camera } from 'lucide-react'
import { getMinerals, getMineralPrices, updateMineralPrice } from '../services/api'
import { getItemIcon } from '../services/icons'
import ScreenshotImport from '../components/ScreenshotImport'

const LOT_LABELS = { x1: 'Unité', x10: 'Lot 10', x100: 'Lot 100', x1000: 'Lot 1000' }

export default function Minerals() {
  const [minerals, setMinerals] = useState([])
  const [prices, setPrices] = useState({})
  const [editingPrices, setEditingPrices] = useState({})
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState({})
  const [showScreenshot, setShowScreenshot] = useState(false)

  const formatDate = (iso) => {
    if (!iso) return null
    const d = new Date(iso)
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getFullYear()).slice(-2)} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
  }

  useEffect(() => {
    async function loadData() {
      try {
        const [mineralsData, pricesData] = await Promise.all([
          getMinerals(),
          getMineralPrices()
        ])
        setMinerals(mineralsData)
        setPrices(pricesData)
        const initialEditing = {}
        mineralsData.forEach(m => {
          const p = pricesData[m.id] || {}
          initialEditing[m.id] = { x1: p.x1 || 0, x10: p.x10 || 0, x100: p.x100 || 0, x1000: p.x1000 || 0 }
        })
        setEditingPrices(initialEditing)
      } catch (err) {
        console.error('Error loading minerals:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const handlePriceChange = (mineralId, lot, value) => {
    setEditingPrices(prev => ({
      ...prev,
      [mineralId]: { ...prev[mineralId], [lot]: parseInt(value) || 0 }
    }))
  }

  const handleBlur = async (mineralId) => {
      const current = editingPrices[mineralId]
    const saved = prices[mineralId] || {}
    const hasChanges = ['x1','x10','x100','x1000'].some(k => (current[k] || 0) !== (saved[k] || 0))
    if (!hasChanges) return

    setSaving(prev => ({ ...prev, [mineralId]: true }))
    try {
      await updateMineralPrice(mineralId, current)
      setPrices(prev => ({ ...prev, [mineralId]: { ...current, lastUpdated: new Date().toISOString() } }))
    } catch (err) {
      console.error('Error saving price:', err)
    } finally {
      setSaving(prev => ({ ...prev, [mineralId]: false }))
    }
  }

  const handleScreenshotResult = (detectedItems) => {
    if (!detectedItems || detectedItems.length === 0) return
    // For minerals page: screenshot fills x1 price field with detected quantity
    setEditingPrices(prev => {
      const updated = { ...prev }
      detectedItems.forEach(({ itemId, quantity }) => {
        if (updated[itemId] !== undefined) {
          updated[itemId] = { ...updated[itemId], x1: quantity }
        }
      })
      return updated
    })
  }

  const filteredMinerals = minerals.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-dofus-gold border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-white mb-2">Minerais</h1>
          <p className="text-gray-400">Gère les prix de tes minerais ({minerals.length} minerais)</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher un minerai..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full md:w-64 pl-10 pr-4 py-2 bg-dofus-dark/50 border border-dofus-stone/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-dofus-gold/50"
          />
        </div>
      </div>

      {/* Screenshot import toggle */}
      <div>
        <button
          onClick={() => setShowScreenshot(v => !v)}
          className={`flex items-center gap-2 text-sm px-4 py-2 rounded-lg border transition-colors ${
            showScreenshot
              ? 'bg-blue-500/20 border-blue-500/40 text-blue-300'
              : 'bg-dofus-stone/10 border-dofus-stone/30 text-gray-400 hover:text-gray-200'
          }`}
        >
          <Camera className="w-4 h-4" />
          {showScreenshot ? 'Masquer import screenshot' : 'Importer quantités depuis screenshot'}
        </button>
        {showScreenshot && (
          <div className="mt-3">
            <ScreenshotImport
              target="minerals"
              onResult={handleScreenshotResult}
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredMinerals.map((mineral, index) => {
          const currentPrices = editingPrices[mineral.id] || { x1: 0, x10: 0, x100: 0, x1000: 0 }
          return (
            <div
              key={mineral.id}
              className="bg-dofus-dark/50 backdrop-blur-sm rounded-xl border border-dofus-stone/30 p-4 card-hover"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-dofus-darker/50 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {getItemIcon(mineral.id) ? (
                    <img
                      src={getItemIcon(mineral.id)}
                      alt={mineral.name}
                      className="w-10 h-10 object-contain"
                      onError={(e) => {
                        e.target.style.display = 'none'
                        e.target.parentElement.innerHTML = `<span class="text-white text-lg font-bold">${mineral.name.charAt(0)}</span>`
                      }}
                    />
                  ) : (
                    <span className="text-white text-lg font-bold">{mineral.name.charAt(0)}</span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="mb-3 flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-white">{mineral.name}</h3>
                      <p className="text-sm text-gray-400">Niveau {mineral.level}</p>
                    </div>
                    {prices[mineral.id]?.lastUpdated && (
                      <span className="text-xs text-gray-500 flex-shrink-0 ml-2 mt-0.5">
                        {formatDate(prices[mineral.id].lastUpdated)}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    {['x1', 'x10', 'x100', 'x1000'].map(lot => (
                      <div key={lot}>
                        <label className="text-xs text-gray-500 block mb-1">{LOT_LABELS[lot]}</label>
                        <div className="relative">
                          <input
                            type="number"
                            value={currentPrices[lot] || ''}
                            onChange={(e) => handlePriceChange(mineral.id, lot, e.target.value)}
                            onBlur={() => handleBlur(mineral.id)}
                            placeholder="0"
                            className="w-full px-2 py-2 bg-dofus-darker/50 border border-dofus-stone/30 rounded-lg text-white text-sm focus:outline-none focus:border-dofus-gold/50"
                          />
                          {saving[mineral.id] && (
                            <div className="absolute right-1 top-1/2 -translate-y-1/2 w-3 h-3 border-2 border-dofus-gold border-t-transparent rounded-full animate-spin" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {filteredMinerals.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Aucun minerai trouvé pour "{search}"</p>
        </div>
      )}
    </div>
  )
}
