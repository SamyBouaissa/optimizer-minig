import { useEffect, useState } from 'react'
import { Search, Save, History, ChevronDown, ChevronUp } from 'lucide-react'
import { getAlloys, getMinerals, getAlloyPrices, updateAlloyPrice } from '../services/api'
import PriceHistoryModal from '../components/PriceHistoryModal'

// DofusDB API for item images
const getDofusDBImage = (dofusdbId) => 
  `https://api.dofusdb.fr/img/items/${dofusdbId}.png`

export default function Alloys() {
  const [alloys, setAlloys] = useState([])
  const [minerals, setMinerals] = useState([])
  const [prices, setPrices] = useState({})
  const [editingPrices, setEditingPrices] = useState({})
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState({})
  const [expandedRecipes, setExpandedRecipes] = useState({})
  const [historyModal, setHistoryModal] = useState({ open: false, alloy: null })

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
          initialEditing[a.id] = pricesData[a.id] || { x1: 0, x10: 0, x100: 0 }
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
      [alloyId]: {
        ...prev[alloyId],
        [lot]: parseInt(value) || 0
      }
    }))
  }

  const handleSave = async (alloyId) => {
    setSaving(prev => ({ ...prev, [alloyId]: true }))
    try {
      await updateAlloyPrice(alloyId, editingPrices[alloyId])
      setPrices(prev => ({
        ...prev,
        [alloyId]: editingPrices[alloyId]
      }))
    } catch (err) {
      console.error('Error saving price:', err)
    } finally {
      setSaving(prev => ({ ...prev, [alloyId]: false }))
    }
  }

  const toggleRecipe = (alloyId) => {
    setExpandedRecipes(prev => ({
      ...prev,
      [alloyId]: !prev[alloyId]
    }))
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
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-white mb-2">
            Alliages
          </h1>
          <p className="text-gray-400">
            Consulte les recettes et gère les prix ({alloys.length} alliages)
          </p>
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

      {/* Alloys Grid */}
      <div className="grid grid-cols-1 gap-4">
        {filteredAlloys.map((alloy, index) => {
          const currentPrices = editingPrices[alloy.id] || { x1: 0, x10: 0, x100: 0 }
          const hasChanges = JSON.stringify(currentPrices) !== JSON.stringify(prices[alloy.id] || { x1: 0, x10: 0, x100: 0 })
          const isExpanded = expandedRecipes[alloy.id]
          
          return (
            <div
              key={alloy.id}
              className="bg-dofus-dark/50 backdrop-blur-sm rounded-xl border border-dofus-stone/30 overflow-hidden card-hover"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="p-4">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="w-14 h-14 rounded-lg bg-dofus-darker/50 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {alloy.dofusdbId ? (
                      <img 
                        src={getDofusDBImage(alloy.dofusdbId)} 
                        alt={alloy.name}
                        className="w-12 h-12 object-contain"
                        onError={(e) => {
                          e.target.style.display = 'none'
                          e.target.parentElement.innerHTML = `<span class="text-white text-xl font-bold">${alloy.name.charAt(0)}</span>`
                        }}
                      />
                    ) : (
                      <span className="text-white text-xl font-bold">
                        {alloy.name.charAt(0)}
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-white text-lg">{alloy.name}</h3>
                        <p className="text-sm text-gray-400">
                          Niveau {alloy.level} • Mineur Niv. {alloy.minerLevel}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setHistoryModal({ open: true, alloy })}
                          className="p-2 text-gray-400 hover:text-dofus-gold transition-colors"
                          title="Voir l'historique"
                        >
                          <History className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Price Inputs */}
                    <div className="grid grid-cols-3 gap-3 mb-3">
                      {['x1', 'x10', 'x100'].map(lot => (
                        <div key={lot}>
                          <label className="text-xs text-gray-500 block mb-1">
                            {lot === 'x1' ? 'Unité' : lot === 'x10' ? 'Lot 10' : 'Lot 100'}
                          </label>
                          <input
                            type="number"
                            value={currentPrices[lot] || ''}
                            onChange={(e) => handlePriceChange(alloy.id, lot, e.target.value)}
                            placeholder="0"
                            className="w-full px-3 py-2 bg-dofus-darker/50 border border-dofus-stone/30 rounded-lg text-white text-sm focus:outline-none focus:border-dofus-gold/50"
                          />
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Recipe Toggle */}
                      <button
                        onClick={() => toggleRecipe(alloy.id)}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-dofus-stone/20 border border-dofus-stone/30 rounded-lg text-gray-300 hover:bg-dofus-stone/30 transition-colors"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        <span>Recette ({alloy.recipe.length} ingrédients)</span>
                      </button>

                      {/* Save Button */}
                      {hasChanges && (
                        <button
                          onClick={() => handleSave(alloy.id)}
                          disabled={saving[alloy.id]}
                          className="flex items-center justify-center gap-2 px-4 py-2 bg-dofus-gold/20 border border-dofus-gold/30 rounded-lg text-dofus-gold hover:bg-dofus-gold/30 transition-colors disabled:opacity-50"
                        >
                          {saving[alloy.id] ? (
                            <div className="w-4 h-4 border-2 border-dofus-gold border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <>
                              <Save className="w-4 h-4" />
                              <span>Sauvegarder</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Recipe Details */}
              {isExpanded && (
                <div className="border-t border-dofus-stone/30 bg-dofus-darker/30 p-4">
                  <h4 className="text-sm font-semibold text-gray-400 mb-3">Ingrédients requis :</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {alloy.recipe.map((ingredient, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 px-3 py-2 bg-dofus-dark/50 rounded-lg"
                      >
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

      {/* Price History Modal */}
      <PriceHistoryModal
        isOpen={historyModal.open}
        onClose={() => setHistoryModal({ open: false, alloy: null })}
        item={historyModal.alloy}
        type="alloys"
      />
    </div>
  )
}
