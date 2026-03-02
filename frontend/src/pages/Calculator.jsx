import { useEffect, useState, useCallback } from 'react'
import {
  Calculator as CalcIcon, Sparkles, Package, Coins, RotateCcw,
  AlertCircle, Ban, ChevronDown, ChevronUp, Lightbulb, TrendingUp,
  ArrowRight, Info
} from 'lucide-react'
import { getMinerals, calculateOptimal, getSuggestions } from '../services/api'
import { getItemIcon } from '../services/icons'
import ScreenshotImport from '../components/ScreenshotImport'

const STORAGE_KEY = 'dofus_inventory'
const STORAGE_RESULT_KEY = 'dofus_result'
const STORAGE_AVOID_KEY = 'dofus_avoid_x1000'

// ── helpers ─────────────────────────────────────────────────────────────────
function fmtK(n) {
  if (!n) return '0'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000)     return (n / 1_000).toFixed(0) + 'k'
  return n.toLocaleString('fr-FR')
}

// ── sub-components ───────────────────────────────────────────────────────────
function RecLine({ rec, minerals }) {
  const kind   = rec.action || rec.type
  const kamas  = rec.profit || rec.totalKamas || 0
  const icon   = getItemIcon(rec.itemId)
  const isWarn = rec.warning

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
      kind === 'craft'
        ? 'bg-emerald-500/10 border border-emerald-500/20'
        : 'bg-blue-500/10 border border-blue-500/20'
    }`}>
      {icon
        ? <img src={icon} alt={rec.itemName} className="w-7 h-7 object-contain flex-shrink-0" />
        : <div className="w-7 h-7 rounded bg-dofus-stone/30 flex items-center justify-center text-xs font-bold flex-shrink-0">
            {rec.itemName?.charAt(0)}
          </div>
      }
      <div className="flex-1 min-w-0">
        <span className="text-white text-sm font-medium">
          {rec.quantity}× {rec.itemName}
        </span>
        {isWarn && (
          <span className="ml-2 inline-flex items-center gap-1 text-xs text-amber-400">
            <AlertCircle className="w-3 h-3" /> {rec.warning}
          </span>
        )}
      </div>
      {kamas > 0 && (
        <span className={`text-xs font-bold flex-shrink-0 ${kind === 'craft' ? 'text-emerald-400' : 'text-blue-400'}`}>
          {fmtK(kamas)} K
        </span>
      )}
    </div>
  )
}

function SuggestionCard({ level, title, color, icon: Icon, items, minerals }) {
  const [open, setOpen] = useState(true)
  if (!items || items.length === 0) return null
  return (
    <div className={`rounded-xl border ${color.border} overflow-hidden`}>
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between px-4 py-3 ${color.bg}`}
      >
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${color.text}`} />
          <span className={`font-semibold text-sm ${color.text}`}>{title}</span>
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${color.badge}`}>{items.length}</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {open && (
        <div className="p-3 space-y-2 bg-dofus-darker/30">
          {level === 'small' && items.map((s, i) => (
            <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-dofus-dark/50">
              {getItemIcon(s.alloyId) && <img src={getItemIcon(s.alloyId)} alt={s.alloyName} className="w-6 h-6 object-contain mt-0.5 flex-shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className="text-white text-xs font-medium">{s.alloyName}</p>
                <p className="text-gray-400 text-xs">{s.message}</p>
              </div>
              <span className="text-emerald-400 text-xs font-bold flex-shrink-0">+{fmtK(s.profit)} K</span>
            </div>
          ))}
          {level === 'medium' && items.map((s, i) => (
            <div key={i} className="p-2 rounded-lg bg-dofus-dark/50">
              <div className="flex items-center gap-2 mb-1">
                {getItemIcon(s.alloyId) && <img src={getItemIcon(s.alloyId)} alt={s.alloyName} className="w-6 h-6 object-contain flex-shrink-0" />}
                <span className="text-white text-xs font-medium">{s.alloyName}</span>
                <span className="ml-auto text-emerald-400 text-xs font-bold">+{fmtK(s.gainIfBoosted)} K</span>
              </div>
              <p className="text-gray-400 text-xs mb-1">
                {s.currentCraftable} craft{s.currentCraftable > 1 ? 's' : ''} actuellement → {s.boostedCraftable} avec les ressources manquantes
              </p>
              <div className="flex flex-wrap gap-1">
                {Object.entries(s.extraNeeded).map(([id, { need, name }]) => (
                  <span key={id} className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded text-xs text-amber-300">
                    {getItemIcon(id) && <img src={getItemIcon(id)} alt={name} className="w-3 h-3 object-contain" />}
                    +{need} {name}
                  </span>
                ))}
              </div>
            </div>
          ))}
          {level === 'large' && items.map((s, i) => (
            <div key={i} className="p-2 rounded-lg bg-dofus-dark/50">
              <div className="flex items-center gap-2 mb-1">
                {getItemIcon(s.alloyId) && <img src={getItemIcon(s.alloyId)} alt={s.alloyName} className="w-6 h-6 object-contain flex-shrink-0" />}
                <span className="text-white text-xs font-medium">{s.alloyName}</span>
                <span className="text-gray-400 text-xs">{s.craftable}× craftable</span>
                <span className="ml-auto text-emerald-400 text-xs font-bold">{fmtK(s.totalProfit)} K</span>
              </div>
              {Object.keys(s.missing).length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  <span className="text-xs text-gray-500 self-center">Manque :</span>
                  {Object.entries(s.missing).map(([id, { need, name }]) => (
                    <span key={id} className="flex items-center gap-1 px-1.5 py-0.5 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-300">
                      {getItemIcon(id) && <img src={getItemIcon(id)} alt={name} className="w-3 h-3 object-contain" />}
                      {need} {name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── main component ────────────────────────────────────────────────────────────
export default function Calculator() {
  const [minerals, setMinerals]     = useState([])
  const [inventory, setInventory]   = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {} } catch { return {} }
  })
  const [result, setResult]         = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_RESULT_KEY)) || null } catch { return null }
  })
  const [suggestions, setSuggestions] = useState(null)
  const [loading, setLoading]       = useState(true)
  const [calculating, setCalculating] = useState(false)
  const [loadingSugg, setLoadingSugg] = useState(false)
  const [error, setError]           = useState(null)
  const [avoidX1000, setAvoidX1000] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_AVOID_KEY)) || false } catch { return false }
  })
  const [showSuggestions, setShowSuggestions] = useState(false)

  // Persist inventory & result
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(inventory)) }, [inventory])
  useEffect(() => { localStorage.setItem(STORAGE_RESULT_KEY, JSON.stringify(result)) }, [result])
  useEffect(() => { localStorage.setItem(STORAGE_AVOID_KEY, JSON.stringify(avoidX1000)) }, [avoidX1000])

  useEffect(() => {
    async function loadData() {
      try {
        const mineralsData = await getMinerals()
        setMinerals(mineralsData)
        // Only init inventory if nothing stored yet
        setInventory(prev => {
          const merged = {}
          mineralsData.forEach(m => { merged[m.id] = prev[m.id] ?? 0 })
          return merged
        })
      } catch (err) {
        setError('Erreur de chargement des minerais')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const handleInventoryChange = (mineralId, value) => {
    setInventory(prev => ({ ...prev, [mineralId]: parseInt(value) || 0 }))
  }

  const handleCalculate = async () => {
    setCalculating(true)
    setError(null)
    setSuggestions(null)
    setShowSuggestions(false)
    try {
      const response = await calculateOptimal(inventory, avoidX1000)
      setResult(response)
    } catch (err) {
      setError('Erreur lors du calcul. Vérifie que les prix sont renseignés.')
    } finally {
      setCalculating(false)
    }
  }

  const handleLoadSuggestions = async () => {
    setLoadingSugg(true)
    try {
      const sugg = await getSuggestions(inventory)
      setSuggestions(sugg)
      setShowSuggestions(true)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingSugg(false)
    }
  }

  const handleScreenshotResult = (detectedItems) => {
    if (!detectedItems || detectedItems.length === 0) return
    setInventory(prev => {
      const updated = { ...prev }
      detectedItems.forEach(({ itemId, quantity }) => {
        if (updated[itemId] !== undefined) {
          updated[itemId] = quantity
        }
      })
      return updated
    })
  }

  const handleReset = () => {
    const reset = {}
    minerals.forEach(m => { reset[m.id] = 0 })
    setInventory(reset)
    setResult(null)
    setError(null)
    setSuggestions(null)
    setShowSuggestions(false)
    localStorage.removeItem(STORAGE_RESULT_KEY)
  }

  const totalMinerals = Object.values(inventory).reduce((s, v) => s + (v || 0), 0)

  // Split recommendations
  const crafts = (result?.recommendations || []).filter(r => (r.action || r.type) === 'craft')
  const sells  = (result?.recommendations || []).filter(r => (r.action || r.type) === 'sell')
  const totalCraftK = crafts.reduce((s, r) => s + (r.profit || r.totalKamas || 0), 0)
  const totalSellK  = sells.reduce((s, r) => s + (r.profit || r.totalKamas || 0), 0)

  // Warnings: minerals appearing in profitable alloys where direct sell > alloy value
  // (simplified: flag any sell rec whose mineral is used in at least one profitable craft)
  const craftedIngredients = new Set(crafts.flatMap(r => {
    // We don't have recipe here, but we can flag sells that share a mineral used in crafts
    return []
  }))

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-dofus-gold border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-white mb-1">Calculateur</h1>
          <p className="text-gray-400 text-sm">Entre ton inventaire pour obtenir la stratégie optimale</p>
        </div>
        <button
          onClick={handleReset}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-dofus-stone/20 border border-dofus-stone/30 text-gray-400 hover:text-white hover:bg-dofus-stone/30 transition-colors text-sm"
        >
          <RotateCcw className="w-4 h-4" />
          Reset
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* ── LEFT: Inventory ── */}
        <div className="bg-dofus-dark/50 backdrop-blur-sm rounded-xl border border-dofus-stone/30 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-semibold text-white flex items-center gap-2">
              <Package className="w-5 h-5 text-dofus-gold" />
              Inventaire
            </h2>
            <span className="text-sm text-gray-400">
              <span className="text-dofus-gold font-bold">{totalMinerals.toLocaleString('fr-FR')}</span> minerais
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 max-h-[440px] overflow-y-auto pr-1">
            {minerals.map(mineral => (
              <div key={mineral.id} className="flex items-center gap-2 bg-dofus-darker/40 rounded-lg px-2 py-1.5">
                {getItemIcon(mineral.id)
                  ? <img src={getItemIcon(mineral.id)} alt={mineral.name} className="w-7 h-7 object-contain flex-shrink-0" onError={e => e.target.style.display='none'} />
                  : <div className="w-7 h-7 rounded bg-dofus-stone/30 flex items-center justify-center text-xs font-bold flex-shrink-0 text-white">{mineral.name.charAt(0)}</div>
                }
                <label className="flex-1 text-xs text-gray-300 truncate">{mineral.name}</label>
                <input
                  type="number" min="0"
                  value={inventory[mineral.id] || ''}
                  onChange={e => handleInventoryChange(mineral.id, e.target.value)}
                  placeholder="0"
                  className="w-16 px-1.5 py-1 bg-dofus-darker/60 border border-dofus-stone/30 rounded text-white text-xs text-right focus:outline-none focus:border-dofus-gold/50"
                />
              </div>
            ))}
          </div>

          {/* Screenshot import — toujours visible, clic direct */}
          <div className="mt-3">
            <ScreenshotImport
              target="minerals"
              onResult={handleScreenshotResult}
              compact
            />
          </div>

          {/* Options */}
          <div className="mt-4 pt-3 border-t border-dofus-stone/20 flex items-center gap-3">
            <button
              onClick={() => setAvoidX1000(v => !v)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                avoidX1000
                  ? 'bg-red-500/15 border-red-500/30 text-red-400'
                  : 'bg-dofus-stone/10 border-dofus-stone/30 text-gray-500 hover:text-gray-300'
              }`}
            >
              <Ban className="w-3.5 h-3.5" />
              Sans lots ×1000
            </button>
          </div>

          {/* Actions */}
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleCalculate}
              disabled={calculating || totalMinerals === 0}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-dofus-gold to-amber-600 rounded-lg text-dofus-darker font-semibold text-sm hover:from-amber-500 hover:to-amber-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {calculating
                ? <div className="w-4 h-4 border-2 border-dofus-darker border-t-transparent rounded-full animate-spin" />
                : <><CalcIcon className="w-4 h-4" />Calculer</>
              }
            </button>
            <button
              onClick={handleLoadSuggestions}
              disabled={loadingSugg || totalMinerals === 0}
              className="flex items-center gap-2 px-3 py-2.5 bg-purple-500/20 border border-purple-500/30 rounded-lg text-purple-300 hover:bg-purple-500/30 transition-colors text-sm disabled:opacity-50"
              title="Suggestions d'optimisation"
            >
              {loadingSugg
                ? <div className="w-4 h-4 border-2 border-purple-300 border-t-transparent rounded-full animate-spin" />
                : <Lightbulb className="w-4 h-4" />
              }
              Suggestions
            </button>
          </div>
        </div>

        {/* ── RIGHT: Results ── */}
        <div className="space-y-4">
          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              {error}
            </div>
          )}

          {!result && !error && (
            <div className="bg-dofus-dark/50 rounded-xl border border-dofus-stone/30 flex flex-col items-center justify-center h-48 text-gray-400">
              <CalcIcon className="w-10 h-10 mb-3 opacity-40" />
              <p className="text-sm">Entre ton inventaire et clique sur Calculer</p>
            </div>
          )}

          {result && (
            <div className="space-y-3">
              {/* Total banner */}
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-dofus-gold/20 to-amber-600/20 border border-dofus-gold/30 rounded-xl">
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Total estimé</p>
                  <div className="flex items-center gap-2">
                    <Coins className="w-5 h-5 text-dofus-gold" />
                    <span className="text-2xl font-bold text-dofus-gold">
                      {fmtK(result.totalKamas)} K
                    </span>
                  </div>
                </div>
                <div className="text-right text-xs text-gray-400 space-y-0.5">
                  {crafts.length > 0 && <div className="text-emerald-400">{fmtK(totalCraftK)} K craft</div>}
                  {sells.length  > 0 && <div className="text-blue-400">{fmtK(totalSellK)} K vente</div>}
                </div>
              </div>

              {/* CRAFT section */}
              {crafts.length > 0 && (
                <div className="bg-dofus-dark/50 rounded-xl border border-emerald-500/20 overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500/10 border-b border-emerald-500/20">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <span className="font-semibold text-emerald-400 text-sm">Fabriquer</span>
                    <span className="ml-auto text-xs text-emerald-400/70">{crafts.length} alliage{crafts.length>1?'s':''} · {fmtK(totalCraftK)} K</span>
                  </div>
                  <div className="p-2 space-y-1 max-h-64 overflow-y-auto">
                    {crafts.map((rec, i) => <RecLine key={i} rec={rec} minerals={minerals} />)}
                  </div>
                </div>
              )}

              {/* SELL section */}
              {sells.length > 0 && (
                <div className="bg-dofus-dark/50 rounded-xl border border-blue-500/20 overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-500/10 border-b border-blue-500/20">
                    <Coins className="w-4 h-4 text-blue-400" />
                    <span className="font-semibold text-blue-400 text-sm">Vendre directement</span>
                    <span className="ml-auto text-xs text-blue-400/70">{sells.length} item{sells.length>1?'s':''} · {fmtK(totalSellK)} K</span>
                  </div>
                  <div className="p-2 space-y-1 max-h-64 overflow-y-auto">
                    {sells.map((rec, i) => <RecLine key={i} rec={rec} minerals={minerals} />)}
                  </div>
                </div>
              )}

              {/* No-price minerals */}
              {result.remainingMinerals && Object.keys(result.remainingMinerals).length > 0 && (
                <div className="flex flex-wrap gap-2 p-3 bg-yellow-500/5 border border-yellow-500/20 rounded-xl">
                  <span className="w-full text-xs text-yellow-400/70 flex items-center gap-1 mb-1">
                    <AlertCircle className="w-3 h-3" /> Sans prix (non calculés) :
                  </span>
                  {Object.entries(result.remainingMinerals).map(([id, qty]) => {
                    const min = minerals.find(m => m.id === id)
                    return (
                      <span key={id} className="flex items-center gap-1 px-2 py-0.5 bg-yellow-500/10 border border-yellow-500/20 rounded text-xs text-yellow-300">
                        {getItemIcon(id) && <img src={getItemIcon(id)} alt={id} className="w-3.5 h-3.5 object-contain" />}
                        {qty}× {min?.name || id}
                      </span>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── SUGGESTIONS PANEL ── */}
          {showSuggestions && suggestions && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-purple-400" />
                <h3 className="font-semibold text-white text-sm">Suggestions d'optimisation</h3>
                <button onClick={() => setShowSuggestions(false)} className="ml-auto text-xs text-gray-500 hover:text-gray-300">×</button>
              </div>

              <SuggestionCard
                level="small"
                title="Petite modif — ≥ 90% de chaque ingrédient"
                color={{ border: 'border-green-500/30', bg: 'bg-green-500/10', text: 'text-green-400', badge: 'bg-green-500/20 text-green-300' }}
                icon={TrendingUp}
                items={suggestions.small}
              />
              <SuggestionCard
                level="medium"
                title="Modif moyenne — ≥ 75% de chaque ingrédient"
                color={{ border: 'border-amber-500/30', bg: 'bg-amber-500/10', text: 'text-amber-400', badge: 'bg-amber-500/20 text-amber-300' }}
                icon={ArrowRight}
                items={suggestions.medium}
              />
              <SuggestionCard
                level="large"
                title="Grosse conversion — 100% craftable"
                color={{ border: 'border-purple-500/30', bg: 'bg-purple-500/10', text: 'text-purple-400', badge: 'bg-purple-500/20 text-purple-300' }}
                icon={Sparkles}
                items={suggestions.large}
              />

              {suggestions.small.length === 0 && suggestions.medium.length === 0 && suggestions.large.length === 0 && (
                <div className="text-center py-4 text-gray-400 text-sm">
                  Aucune suggestion disponible — ton inventaire est déjà optimisé !
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
