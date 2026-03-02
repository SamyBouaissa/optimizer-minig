import { useEffect, useState } from 'react'
import { Search, ChevronDown, ChevronUp, Camera } from 'lucide-react'
import { getAlloys, getMinerals, getAlloyPrices, updateAlloyPrice } from '../services/api'
import { getItemIcon } from '../services/icons'
import ScreenshotImport from '../components/ScreenshotImport'

const LOT_LABELS = { x1: 'Unité', x10: 'Lot 10', x100: 'Lot 100', x1000: 'Lot 1000' }

const formatDate = (iso) => {
  if (!iso) return null
  const d = new Date(iso)
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getFullYear()).slice(-2)} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

export default function Alloys() {
  const [alloys, setAlloys] = useState([])
  const [minerals, setMinerals] = useState([])
  const [prices, setPrices] = useState({})
  const [editingPrices, setEditingPrices] = useState({})
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState({})
  const [expandedRecipes, setExpandedRecipes] = useState({})
  const [showScreenshot, setShowScreenshot] = useState(false)

  useEffect(() => {
    async function loadData() {
      try {
        const [alloysData, mineralsData, pricesData] = await Promise.all([
          getAlloys(),
          getMinerals(),
          getAlloyPrices()
        ])
        setAlloys(alloysData)
        setMinerals(mineralsData)
        setPrices(pricesData)
        const initialEditing = {}
        alloysData.forEach(a => {
          const p = pricesData[a.id] || {}
          initialEditing[a.id] = { x1: p.x1 || 0, x10: p.x10 || 0, x100: p.x100 || 0, x1000: p.x1000 || 0 }
        })
        setEditingPrices(initialEditing)
      } catch (err) {
        console.error('Error loading alloys:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const getMineralName = (mineralId) => {
    const mineral = minerals.find(m => m.id === mineralId)
    return mineral ? mineral.name : mineralId
  }

  const handlePriceChange = (alloyId, lot, value) => {
    setEditingPrices(prev => ({
      ...prev,
      [alloyId]: { ...prev[alloyId], [lot]: parseInt(value) || 0 }
    }))
  }

  const handleBlur = async (alloyId) => {
    const current = editingPrices[alloyId]
    const saved = prices[alloyId] || {}
    const hasChanges = ['x1','x10','x100','x1000'].some(k => (current[k] || 0) !== (saved[k] || 0))
    if (!hasChanges) return

    setSaving(prev => ({ ...prev, [alloyId]: true }))
    try {
      await updateAlloyPrice(alloyId, current)
      setPrices(prev => ({ ...prev, [alloyId]: { ...current, lastUpdated: new Date().toISOString() } }))
    } catch (err) {
      console.error('Error saving price:', err)
    } finally {
      setSaving(prev => ({ ...prev, [alloyId]: false }))
    }
  }

  const toggleRecipe = (alloyId) => {
    setExpandedRecipes(prev => ({ ...prev, [alloyId]: !prev[alloyId] }))
  }

  const handleScreenshotResult = (detectedItems) => {
    if (!detectedItems || detectedItems.length === 0) return
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

  const filteredAlloys = alloys.filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase())
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
          <h1 className="font-display text-3xl font-bold text-white mb-2">Alliages</h1>
          <p className="text-gray-400">Consulte les recettes et gère les prix ({alloys.length} alliages)</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher un alliage..."
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
              target="alloys"
              onResult={handleScreenshotResult}
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredAlloys.map((alloy, index) => {
          const currentPrices = editingPrices[alloy.id] || { x1: 0, x10: 0, x100: 0, x1000: 0 }
          const isExpanded = expandedRecipes[alloy.id]

          return (
            <div
              key={alloy.id}
              className="bg-dofus-dark/50 backdrop-blur-sm rounded-xl border border-dofus-stone/30 overflow-hidden card-hover"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="p-4">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-lg bg-dofus-darker/50 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {getItemIcon(alloy.id) ? (
                      <img
                        src={getItemIcon(alloy.id)}
                        alt={alloy.name}
                        className="w-12 h-12 object-contain"
                        onError={(e) => {
                          e.target.style.display = 'none'
                          e.target.parentElement.innerHTML = `<span class="text-white text-xl font-bold">${alloy.name.charAt(0)}</span>`
                        }}
                      />
                    ) : (
                      <span className="text-white text-xl font-bold">{alloy.name.charAt(0)}</span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-white text-lg">{alloy.name}</h3>
                        <p className="text-sm text-gray-400">
                          Niveau {alloy.level} • Mineur Niv. {alloy.minerLevel}
                          {saving[alloy.id] && (
                            <span className="ml-2 inline-flex items-center gap-1 text-dofus-gold text-xs">
                              <span className="w-2 h-2 border border-dofus-gold border-t-transparent rounded-full animate-spin inline-block" />
                              Sauvegarde...
                            </span>
                          )}
                        </p>
                      </div>
                      {prices[alloy.id]?.lastUpdated && (
                        <span className="text-xs text-gray-500 flex-shrink-0 ml-2 mt-0.5">
                          {formatDate(prices[alloy.id].lastUpdated)}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-4 gap-2 mb-3">
                      {['x1', 'x10', 'x100', 'x1000'].map(lot => (
                        <div key={lot}>
                          <label className="text-xs text-gray-500 block mb-1">{LOT_LABELS[lot]}</label>
                          <input
                            type="number"
                            value={currentPrices[lot] || ''}
                            onChange={(e) => handlePriceChange(alloy.id, lot, e.target.value)}
                            onBlur={() => handleBlur(alloy.id)}
                            placeholder="0"
                            className="w-full px-2 py-2 bg-dofus-darker/50 border border-dofus-stone/30 rounded-lg text-white text-sm focus:outline-none focus:border-dofus-gold/50"
                          />
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => toggleRecipe(alloy.id)}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-dofus-stone/20 border border-dofus-stone/30 rounded-lg text-gray-300 hover:bg-dofus-stone/30 transition-colors w-full"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      <span>Recette ({alloy.recipe.length} ingrédients)</span>
                    </button>
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-dofus-stone/30 bg-dofus-darker/30 p-4">
                  <h4 className="text-sm font-semibold text-gray-400 mb-3">Ingrédients requis :</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {alloy.recipe.map((ingredient, idx) => (
                      <div key={idx} className="flex items-center gap-2 px-3 py-2 bg-dofus-dark/50 rounded-lg">
                        <span className="text-dofus-gold font-bold">{ingredient.quantity}x</span>
                        <span className="text-white">{getMineralName(ingredient.mineralId)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {filteredAlloys.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Aucun alliage trouvé pour "{search}"</p>
        </div>
      )}
    </div>
  )
}
