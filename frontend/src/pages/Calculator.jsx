import { useEffect, useState } from 'react'
import { Calculator as CalcIcon, Sparkles, Package, Coins, RotateCcw, AlertCircle } from 'lucide-react'
import { getMinerals, calculateOptimal } from '../services/api'

// DofusDB API for item images
const getDofusDBImage = (dofusdbId) => 
  `https://api.dofusdb.fr/img/items/${dofusdbId}.png`

export default function Calculator() {
  const [minerals, setMinerals] = useState([])
  const [inventory, setInventory] = useState({})
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [calculating, setCalculating] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function loadData() {
      try {
        const mineralsData = await getMinerals()
        setMinerals(mineralsData)
        
        // Initialize inventory with zeros
        const initialInventory = {}
        mineralsData.forEach(m => {
          initialInventory[m.id] = 0
        })
        setInventory(initialInventory)
      } catch (err) {
        console.error('Error loading minerals:', err)
        setError('Erreur de chargement des minerais')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const handleInventoryChange = (mineralId, value) => {
    setInventory(prev => ({
      ...prev,
      [mineralId]: parseInt(value) || 0
    }))
  }

  const handleCalculate = async () => {
    setCalculating(true)
    setError(null)
    try {
      const response = await calculateOptimal(inventory)
      setResult(response)
    } catch (err) {
      console.error('Error calculating:', err)
      setError('Erreur lors du calcul. Vérifie que tous les prix sont renseignés.')
    } finally {
      setCalculating(false)
    }
  }

  const handleReset = () => {
    const resetInventory = {}
    minerals.forEach(m => {
      resetInventory[m.id] = 0
    })
    setInventory(resetInventory)
    setResult(null)
    setError(null)
  }

  const totalMinerals = Object.values(inventory).reduce((sum, val) => sum + val, 0)

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
      <div>
        <h1 className="font-display text-3xl font-bold text-white mb-2">
          Calculateur d'optimisation
        </h1>
        <p className="text-gray-400">
          Entre ton inventaire de minerais et découvre la meilleure stratégie de vente
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inventory Input */}
        <div className="bg-dofus-dark/50 backdrop-blur-sm rounded-xl border border-dofus-stone/30 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-semibold text-white flex items-center gap-2">
              <Package className="w-5 h-5 text-dofus-gold" />
              Ton inventaire
            </h2>
            <span className="text-sm text-gray-400">
              Total: <span className="text-dofus-gold font-bold">{totalMinerals}</span> minerais
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-2">
            {minerals.map(mineral => (
              <div key={mineral.id} className="flex items-center gap-2 bg-dofus-darker/30 rounded-lg p-2">
                {mineral.dofusdbId && (
                  <img 
                    src={getDofusDBImage(mineral.dofusdbId)} 
                    alt={mineral.name}
                    className="w-8 h-8 object-contain flex-shrink-0"
                  />
                )}
                <label className="flex-1 text-sm text-gray-300 truncate" title={mineral.name}>
                  {mineral.name}
                </label>
                <input
                  type="number"
                  min="0"
                  value={inventory[mineral.id] || ''}
                  onChange={(e) => handleInventoryChange(mineral.id, e.target.value)}
                  placeholder="0"
                  className="w-20 px-2 py-1.5 bg-dofus-darker/50 border border-dofus-stone/30 rounded-lg text-white text-sm text-right focus:outline-none focus:border-dofus-gold/50"
                />
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-6 pt-4 border-t border-dofus-stone/30">
            <button
              onClick={handleReset}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-dofus-stone/20 border border-dofus-stone/30 rounded-lg text-gray-300 hover:bg-dofus-stone/30 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Réinitialiser
            </button>
            <button
              onClick={handleCalculate}
              disabled={calculating || totalMinerals === 0}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-dofus-gold to-amber-600 rounded-lg text-dofus-darker font-semibold hover:from-amber-500 hover:to-amber-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {calculating ? (
                <div className="w-5 h-5 border-2 border-dofus-darker border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <CalcIcon className="w-5 h-5" />
                  Calculer
                </>
              )}
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="bg-dofus-dark/50 backdrop-blur-sm rounded-xl border border-dofus-stone/30 p-6">
          <h2 className="font-display text-xl font-semibold text-white flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-dofus-gold" />
            Résultat optimal
          </h2>

          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 mb-4">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {!result && !error && (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <CalcIcon className="w-12 h-12 mb-4 opacity-50" />
              <p>Entre ton inventaire et clique sur "Calculer"</p>
              <p className="text-sm">pour voir la stratégie optimale</p>
            </div>
          )}

          {result && (
            <div className="space-y-6">
              {/* Total Kamas */}
              <div className="p-4 bg-gradient-to-r from-dofus-gold/20 to-amber-600/20 border border-dofus-gold/30 rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Total estimé</span>
                  <div className="flex items-center gap-2">
                    <Coins className="w-6 h-6 text-dofus-gold" />
                    <span className="text-2xl font-bold text-dofus-gold">
                      {result.totalKamas?.toLocaleString('fr-FR')} K
                    </span>
                  </div>
                </div>
              </div>

              {/* Recommendations */}
              {result.recommendations && result.recommendations.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 mb-3">Recommandations :</h3>
                  <div className="space-y-2">
                    {result.recommendations.map((rec, idx) => (
                      <div
                        key={idx}
                        className={`flex items-center gap-3 p-3 rounded-lg ${
                          rec.action === 'craft'
                            ? 'bg-emerald-500/10 border border-emerald-500/30'
                            : 'bg-blue-500/10 border border-blue-500/30'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          rec.action === 'craft' ? 'bg-emerald-500/20' : 'bg-blue-500/20'
                        }`}>
                          {rec.action === 'craft' ? (
                            <Sparkles className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Coins className="w-4 h-4 text-blue-400" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className={`font-medium ${
                            rec.action === 'craft' ? 'text-emerald-400' : 'text-blue-400'
                          }`}>
                            {rec.action === 'craft' ? 'Fabriquer' : 'Vendre'}
                          </p>
                          <p className="text-white">
                            {rec.quantity}x {rec.itemName}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-400">Gain</p>
                          <p className="font-bold text-dofus-gold">{rec.profit?.toLocaleString('fr-FR')} K</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Remaining Minerals */}
              {result.remainingMinerals && Object.keys(result.remainingMinerals).length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 mb-3">Minerais restants à vendre :</h3>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(result.remainingMinerals)
                      .filter(([_, qty]) => qty > 0)
                      .map(([mineralId, qty]) => {
                        const mineral = minerals.find(m => m.id === mineralId)
                        return (
                          <span
                            key={mineralId}
                            className="px-3 py-1 bg-dofus-stone/30 rounded-full text-sm text-white"
                          >
                            {qty}x {mineral?.name || mineralId}
                          </span>
                        )
                      })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
