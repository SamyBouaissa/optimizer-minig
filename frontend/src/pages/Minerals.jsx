import { useEffect, useState } from 'react'
import { Search, Save, History } from 'lucide-react'
import { getMinerals, getMineralPrices, updateMineralPrice } from '../services/api'
import PriceHistoryModal from '../components/PriceHistoryModal'

// DofusDB API for item images
const getDofusDBImage = (dofusdbId) => 
  `https://api.dofusdb.fr/img/items/${dofusdbId}.png`

export default function Minerals() {
  const [minerals, setMinerals] = useState([])
  const [prices, setPrices] = useState({})
  const [editingPrices, setEditingPrices] = useState({})
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState({})
  const [historyModal, setHistoryModal] = useState({ open: false, mineral: null })

  useEffect(() => {
    async function loadData() {
      try {
        const [mineralsData, pricesData] = await Promise.all([
          getMinerals(),
          getMineralPrices()
        ])
        setMinerals(mineralsData)
        setPrices(pricesData)
        
        // Initialize editing prices with current prices
        const initialEditing = {}
        mineralsData.forEach(m => {
          initialEditing[m.id] = pricesData[m.id] || { x1: 0, x10: 0, x100: 0 }
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
      [mineralId]: {
        ...prev[mineralId],
        [lot]: parseInt(value) || 0
      }
    }))
  }

  const handleSave = async (mineralId) => {
    setSaving(prev => ({ ...prev, [mineralId]: true }))
    try {
      await updateMineralPrice(mineralId, editingPrices[mineralId])
      setPrices(prev => ({
        ...prev,
        [mineralId]: editingPrices[mineralId]
      }))
    } catch (err) {
      console.error('Error saving price:', err)
    } finally {
      setSaving(prev => ({ ...prev, [mineralId]: false }))
    }
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
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-white mb-2">
            Minerais
          </h1>
          <p className="text-gray-400">
            Gère les prix de tes minerais ({minerals.length} minerais)
          </p>
        </div>

        {/* Search */}
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

      {/* Minerals Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredMinerals.map((mineral, index) => {
          const currentPrices = editingPrices[mineral.id] || { x1: 0, x10: 0, x100: 0 }
          const hasChanges = JSON.stringify(currentPrices) !== JSON.stringify(prices[mineral.id] || { x1: 0, x10: 0, x100: 0 })
          
          return (
            <div
              key={mineral.id}
              className="bg-dofus-dark/50 backdrop-blur-sm rounded-xl border border-dofus-stone/30 p-4 card-hover"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className="w-12 h-12 rounded-lg bg-dofus-darker/50 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {mineral.dofusdbId ? (
                    <img 
                      src={getDofusDBImage(mineral.dofusdbId)} 
                      alt={mineral.name}
                      className="w-10 h-10 object-contain"
                      onError={(e) => {
                        e.target.style.display = 'none'
                        e.target.parentElement.innerHTML = `<span class="text-white text-lg font-bold">${mineral.name.charAt(0)}</span>`
                      }}
                    />
                  ) : (
                    <span className="text-white text-lg font-bold">
                      {mineral.name.charAt(0)}
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-white">{mineral.name}</h3>
                      <p className="text-sm text-gray-400">Niveau {mineral.level}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setHistoryModal({ open: true, mineral })}
                        className="p-2 text-gray-400 hover:text-dofus-gold transition-colors"
                        title="Voir l'historique"
                      >
                        <History className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Price Inputs */}
                  <div className="grid grid-cols-3 gap-2">
                    {['x1', 'x10', 'x100'].map(lot => (
                      <div key={lot}>
                        <label className="text-xs text-gray-500 block mb-1">
                          {lot === 'x1' ? 'Unité' : lot === 'x10' ? 'Lot 10' : 'Lot 100'}
                        </label>
                        <input
                          type="number"
                          value={currentPrices[lot] || ''}
                          onChange={(e) => handlePriceChange(mineral.id, lot, e.target.value)}
                          placeholder="0"
                          className="w-full px-3 py-2 bg-dofus-darker/50 border border-dofus-stone/30 rounded-lg text-white text-sm focus:outline-none focus:border-dofus-gold/50"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Save Button */}
                  {hasChanges && (
                    <button
                      onClick={() => handleSave(mineral.id)}
                      disabled={saving[mineral.id]}
                      className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2 bg-dofus-gold/20 border border-dofus-gold/30 rounded-lg text-dofus-gold hover:bg-dofus-gold/30 transition-colors disabled:opacity-50"
                    >
                      {saving[mineral.id] ? (
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
          )
        })}
      </div>

      {filteredMinerals.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Aucun minerai trouvé pour "{search}"</p>
        </div>
      )}

      {/* Price History Modal */}
      <PriceHistoryModal
        isOpen={historyModal.open}
        onClose={() => setHistoryModal({ open: false, mineral: null })}
        item={historyModal.mineral}
        type="minerals"
      />
    </div>
  )
}
