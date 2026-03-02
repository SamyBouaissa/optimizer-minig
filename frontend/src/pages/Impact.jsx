import { useEffect, useState, useMemo } from 'react'
import {
  TrendingUp, TrendingDown, AlertTriangle, Info,
  ArrowUpRight, ArrowDownRight, Minus, Search, ChevronDown, ChevronUp
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, ReferenceLine
} from 'recharts'
import { getImpactAnalysis } from '../services/api'
import { getItemIcon } from '../services/icons'

function fmt(n) {
  if (!n && n !== 0) return '—'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M'
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'k'
  return n.toLocaleString('fr-FR')
}

function PriceBadge({ value }) {
  if (!value || value === 0) return <span className="text-gray-600 text-xs">—</span>
  return <span className="text-dofus-gold font-bold text-sm">{fmt(value)} K</span>
}

function TrendIcon({ gain }) {
  if (gain > 0)  return <ArrowUpRight  className="w-4 h-4 text-emerald-400" />
  if (gain < 0)  return <ArrowDownRight className="w-4 h-4 text-red-400" />
  return          <Minus className="w-4 h-4 text-gray-500" />
}

// Ligne compacte de la table principale
function MineralTableRow({ mineral, maxPrice, rank }) {
  const [open, setOpen] = useState(false)
  const icon = getItemIcon(mineral.id)
  const pct = maxPrice > 0 ? (mineral.directPrice / maxPrice) * 100 : 0

  const craftScore = mineral.usedIn.length > 0
    ? Math.round(mineral.usedIn.filter(u => u.isWorthCrafting).length / mineral.usedIn.length * 100)
    : null

  return (
    <>
      <tr
        onClick={() => setOpen(o => !o)}
        className={`border-b border-dofus-stone/10 cursor-pointer transition-colors ${
          open ? 'bg-dofus-gold/5' : 'hover:bg-dofus-stone/10'
        } ${mineral.warning ? 'border-l-2 border-l-amber-500/60' : ''}`}
      >
        {/* Rank */}
        <td className="py-2.5 pl-4 pr-2 text-gray-600 text-xs w-8 text-right">{rank}</td>

        {/* Item */}
        <td className="py-2.5 px-3">
          <div className="flex items-center gap-2.5">
            {icon
              ? <img src={icon} alt={mineral.name} className="w-8 h-8 object-contain flex-shrink-0" />
              : <div className="w-8 h-8 rounded bg-dofus-stone/30 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">{mineral.name.charAt(0)}</div>
            }
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-white text-sm font-medium">{mineral.name}</span>
                {mineral.warning && <AlertTriangle className="w-3 h-3 text-amber-400 flex-shrink-0" />}
              </div>
              <span className="text-gray-600 text-xs">Niv. {mineral.level}</span>
            </div>
          </div>
        </td>

        {/* Prix direct */}
        <td className="py-2.5 px-3 text-right">
          <PriceBadge value={mineral.directPrice} />
        </td>

        {/* Bar prix */}
        <td className="py-2.5 px-3 w-32 hidden md:table-cell">
          <div className="h-1.5 rounded-full bg-dofus-darker overflow-hidden">
            <div
              className={`h-full rounded-full ${mineral.warning ? 'bg-amber-400' : 'bg-dofus-gold'}`}
              style={{ width: pct + '%' }}
            />
          </div>
        </td>

        {/* Valeur en craft */}
        <td className="py-2.5 px-3 text-right">
          {mineral.gainIfCrafted > 0 ? (
            <span className="text-emerald-400 text-sm font-medium">+{fmt(mineral.gainIfCrafted)} K</span>
          ) : (
            <span className="text-gray-600 text-xs">—</span>
          )}
        </td>

        {/* Alliages */}
        <td className="py-2.5 px-3 text-center hidden sm:table-cell">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            mineral.usedInCount > 0 ? 'bg-blue-500/15 text-blue-300' : 'text-gray-600'
          }`}>
            {mineral.usedInCount > 0 ? `${mineral.usedInCount} alliage${mineral.usedInCount > 1 ? 's' : ''}` : '—'}
          </span>
        </td>

        {/* Craft % */}
        <td className="py-2.5 px-3 text-center hidden lg:table-cell">
          {craftScore !== null ? (
            <span className={`text-xs font-bold ${craftScore >= 50 ? 'text-emerald-400' : 'text-gray-400'}`}>
              {craftScore}%
            </span>
          ) : <span className="text-gray-600 text-xs">—</span>}
        </td>

        {/* Toggle */}
        <td className="py-2.5 pr-4 text-gray-500">
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </td>
      </tr>

      {/* Ligne expandée */}
      {open && (
        <tr className="bg-dofus-darker/40">
          <td colSpan={8} className="px-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Métriques */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Métriques financières</h4>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-dofus-dark/60 rounded-lg p-3 text-center">
                    <div className="text-[10px] text-gray-500 mb-1">Prix direct</div>
                    <div className="text-dofus-gold font-bold text-sm">{fmt(mineral.directPrice)} K</div>
                  </div>
                  <div className="bg-dofus-dark/60 rounded-lg p-3 text-center">
                    <div className="text-[10px] text-gray-500 mb-1">Valeur max craft</div>
                    <div className="text-emerald-400 font-bold text-sm">{fmt(mineral.bestEffectiveValue)} K</div>
                  </div>
                  <div className="bg-dofus-dark/60 rounded-lg p-3 text-center">
                    <div className="text-[10px] text-gray-500 mb-1">Gain craft</div>
                    <div className={`font-bold text-sm ${mineral.gainIfCrafted > 0 ? 'text-emerald-400' : 'text-gray-500'}`}>
                      {mineral.gainIfCrafted > 0 ? `+${fmt(mineral.gainIfCrafted)} K` : '—'}
                    </div>
                  </div>
                </div>
                {mineral.warning && (
                  <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-300">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{mineral.warning}</span>
                  </div>
                )}
              </div>

              {/* Usages dans les alliages */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Utilisations</h4>
                {mineral.usedIn.length > 0 ? (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {mineral.usedIn.map(u => (
                      <div key={u.alloyId} className={`flex items-center gap-2 p-2 rounded-lg text-xs ${
                        u.isWorthCrafting ? 'bg-emerald-500/8 border border-emerald-500/15' : 'bg-dofus-dark/40 border border-dofus-stone/10'
                      }`}>
                        {getItemIcon(u.alloyId)
                          ? <img src={getItemIcon(u.alloyId)} alt={u.alloyName} className="w-6 h-6 object-contain flex-shrink-0" />
                          : <div className="w-6 h-6 rounded bg-dofus-stone/20 flex items-center justify-center text-xs">{u.alloyName.charAt(0)}</div>
                        }
                        <span className="text-white font-medium flex-1 truncate">{u.alloyName}</span>
                        <span className="text-gray-500">×{u.quantityNeeded}</span>
                        <span className="text-gray-500">{u.ingredientWeight}%</span>
                        {u.isWorthCrafting && <span className="text-emerald-400 font-medium">✓</span>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600 text-xs italic">Non utilisé dans les alliages actuels</p>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// Mini bar chart des prix des top N minéraux
function PriceOverviewChart({ data }) {
  const top = data.slice(0, 12)
  const chartData = top.map(m => ({
    name: m.name.length > 8 ? m.name.slice(0, 7) + '…' : m.name,
    prix: m.directPrice,
    gain: m.gainIfCrafted,
    warn: m.warning ? 1 : 0,
  }))

  return (
    <div className="h-40">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
          <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis hide />
          <Tooltip
            contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #4a4a5c', borderRadius: '8px', fontSize: '11px' }}
            formatter={(v, name) => [v ? `${fmt(v)} K` : '—', name === 'prix' ? 'Prix direct' : 'Gain craft']}
            labelStyle={{ color: '#d4a84b', marginBottom: 2 }}
          />
          <Bar dataKey="prix" radius={[3, 3, 0, 0]}>
            {chartData.map((entry, i) => (
              <Cell key={i} fill={entry.warn ? '#f59e0b' : '#d4a84b'} opacity={0.85} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// Tableau de comparaison directe vente vs craft
function CraftOpportunityTable({ data }) {
  const opportunities = data
    .filter(m => m.gainIfCrafted > 0 && m.directPrice > 0)
    .sort((a, b) => b.gainIfCrafted - a.gainIfCrafted)
    .slice(0, 8)

  if (opportunities.length === 0)
    return <p className="text-gray-500 text-sm italic text-center py-6">Pas de données de prix — renseigne les prix dans Minerais/Alliages</p>

  return (
    <div className="space-y-1.5">
      {opportunities.map(m => {
        const ratio = m.bestEffectiveValue > 0 ? Math.round((m.bestEffectiveValue / m.directPrice - 1) * 100) : 0
        return (
          <div key={m.id} className="flex items-center gap-3 py-2 px-3 rounded-lg bg-dofus-darker/50 hover:bg-dofus-darker/80 transition-colors">
            {getItemIcon(m.id)
              ? <img src={getItemIcon(m.id)} alt={m.name} className="w-7 h-7 object-contain flex-shrink-0" />
              : <div className="w-7 h-7 rounded bg-dofus-stone/30 flex items-center justify-center text-xs">{m.name.charAt(0)}</div>
            }
            <span className="text-white text-sm flex-1 min-w-0 truncate">{m.name}</span>
            <span className="text-gray-500 text-xs flex-shrink-0">{fmt(m.directPrice)} K</span>
            <span className="text-gray-500 text-xs flex-shrink-0">→</span>
            <span className="text-emerald-400 text-xs font-bold flex-shrink-0">{fmt(m.bestEffectiveValue)} K</span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
              ratio >= 30 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-blue-500/15 text-blue-300'
            }`}>+{ratio}%</span>
          </div>
        )
      })}
    </div>
  )
}

export default function Impact() {
  const [data, setData]       = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [filter, setFilter]   = useState('all')
  const [sortBy, setSortBy]   = useState('price')

  useEffect(() => {
    getImpactAnalysis()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    let list = data.filter(m => m.name.toLowerCase().includes(search.toLowerCase()))
    if (filter === 'warn')  list = list.filter(m => m.warning)
    if (filter === 'craft') list = list.filter(m => m.usedInCount > 0)
    if (filter === 'sell')  list = list.filter(m => m.worthSelling)

    if (sortBy === 'price')  list = [...list].sort((a, b) => b.directPrice - a.directPrice)
    if (sortBy === 'gain')   list = [...list].sort((a, b) => b.gainIfCrafted - a.gainIfCrafted)
    if (sortBy === 'crafts') list = [...list].sort((a, b) => b.usedInCount - a.usedInCount)
    if (sortBy === 'level')  list = [...list].sort((a, b) => (a.level || 0) - (b.level || 0))
    return list
  }, [data, search, filter, sortBy])

  const maxPrice   = Math.max(...data.map(m => m.directPrice), 1)
  const warnCount  = data.filter(m => m.warning).length
  const craftCount = data.filter(m => m.usedInCount > 0).length
  const sellCount  = data.filter(m => m.worthSelling).length
  const totalValue = data.reduce((s, m) => s + m.directPrice, 0)

  const hasData    = data.some(m => m.directPrice > 0)

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-dofus-gold border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-white mb-1">Impact financier</h1>
          <p className="text-gray-400 text-sm">
            Valeur réelle de chaque minerai — vente directe vs utilisation en craft
          </p>
        </div>
        {!hasData && (
          <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-300 text-sm">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            Renseigne des prix dans Minerais &amp; Alliages pour voir les données
          </div>
        )}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Minerais analysés', value: data.length, icon: Info, color: 'blue', sub: 'avec prix renseignés' },
          { label: 'Plus rentables en craft', value: warnCount, icon: AlertTriangle, color: 'amber', sub: 'que vente directe' },
          { label: 'Utilisés en alliage', value: craftCount, icon: TrendingUp, color: 'emerald', sub: 'présents dans 1+ craft' },
          { label: 'À vendre directement', value: sellCount, icon: TrendingDown, color: 'slate', sub: 'vente directe optimale' },
        ].map(({ label, value, icon: Icon, color, sub }) => (
          <div key={label} className={`rounded-xl border p-4 ${
            color === 'amber'   ? 'bg-amber-500/8 border-amber-500/20' :
            color === 'emerald' ? 'bg-emerald-500/8 border-emerald-500/20' :
            color === 'blue'    ? 'bg-blue-500/8 border-blue-500/20' :
                                  'bg-dofus-dark/50 border-dofus-stone/20'
          }`}>
            <div className="flex items-start justify-between mb-2">
              <Icon className={`w-4 h-4 mt-0.5 ${
                color === 'amber' ? 'text-amber-400' : color === 'emerald' ? 'text-emerald-400' : color === 'blue' ? 'text-blue-400' : 'text-gray-500'
              }`} />
            </div>
            <div className={`text-2xl font-bold mb-0.5 ${
              color === 'amber' ? 'text-amber-400' : color === 'emerald' ? 'text-emerald-400' : color === 'blue' ? 'text-blue-400' : 'text-white'
            }`}>{value}</div>
            <div className="text-xs text-gray-400 font-medium leading-tight">{label}</div>
            <div className="text-[10px] text-gray-600 mt-0.5">{sub}</div>
          </div>
        ))}
      </div>

      {/* Deux colonnes : graphique prix + opportunités craft */}
      {hasData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Aperçu des prix */}
          <div className="bg-dofus-dark/50 rounded-xl border border-dofus-stone/20 p-5">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-dofus-gold" />
              Prix par minerai (top 12)
            </h3>
            <PriceOverviewChart data={data} />
            <p className="text-xs text-gray-600 mt-2">
              <span className="inline-block w-2 h-1.5 rounded bg-dofus-gold mr-1" />Vente directe &nbsp;
              <span className="inline-block w-2 h-1.5 rounded bg-amber-400 mr-1" />Plus rentable en craft
            </p>
          </div>

          {/* Meilleures opportunités craft */}
          <div className="bg-dofus-dark/50 rounded-xl border border-dofus-stone/20 p-5">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Top opportunités : vendre vs crafter
            </h3>
            <CraftOpportunityTable data={data} />
          </div>
        </div>
      )}

      {/* Table principale */}
      <div className="bg-dofus-dark/50 rounded-xl border border-dofus-stone/20 overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 p-4 border-b border-dofus-stone/20">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text" placeholder="Rechercher un minerai..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-dofus-darker/60 border border-dofus-stone/30 rounded-lg text-white text-sm placeholder-gray-600 focus:outline-none focus:border-dofus-gold/50"
            />
          </div>
          {/* Filtres */}
          <div className="flex gap-1.5 flex-wrap">
            {[
              { key: 'all',   label: 'Tous',            count: data.length },
              { key: 'warn',  label: '⚠ Craft > vente', count: warnCount,  color: 'amber' },
              { key: 'craft', label: 'En alliage',       count: craftCount, color: 'blue' },
              { key: 'sell',  label: 'Vente directe',    count: sellCount,  color: 'slate' },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                  filter === f.key
                    ? f.color === 'amber' ? 'bg-amber-500/20 border-amber-500/30 text-amber-300'
                    : f.color === 'blue'  ? 'bg-blue-500/20 border-blue-500/30 text-blue-300'
                    : f.color === 'slate' ? 'bg-slate-500/20 border-slate-500/30 text-slate-300'
                    :                       'bg-dofus-gold/20 border-dofus-gold/30 text-dofus-gold'
                    : 'bg-transparent border-dofus-stone/20 text-gray-500 hover:text-white'
                }`}
              >
                {f.label} <span className="opacity-50">({f.count})</span>
              </button>
            ))}
          </div>
          {/* Tri */}
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="px-3 py-1.5 bg-dofus-darker/60 border border-dofus-stone/30 rounded-lg text-gray-300 text-xs focus:outline-none"
          >
            <option value="price">Trier : Prix</option>
            <option value="gain">Trier : Gain craft</option>
            <option value="crafts">Trier : Nb alliages</option>
            <option value="level">Trier : Niveau</option>
          </select>
        </div>

        {/* Tableau */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dofus-stone/20">
                <th className="py-2.5 pl-4 pr-2 text-right text-[10px] uppercase tracking-widest text-gray-600 w-8">#</th>
                <th className="py-2.5 px-3 text-left text-[10px] uppercase tracking-widest text-gray-600">Minerai</th>
                <th className="py-2.5 px-3 text-right text-[10px] uppercase tracking-widest text-gray-600">Prix direct</th>
                <th className="py-2.5 px-3 text-[10px] uppercase tracking-widest text-gray-600 hidden md:table-cell" />
                <th className="py-2.5 px-3 text-right text-[10px] uppercase tracking-widest text-gray-600">Gain craft</th>
                <th className="py-2.5 px-3 text-center text-[10px] uppercase tracking-widest text-gray-600 hidden sm:table-cell">Alliages</th>
                <th className="py-2.5 px-3 text-center text-[10px] uppercase tracking-widest text-gray-600 hidden lg:table-cell">Crafts ✓</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((mineral, i) => (
                <MineralTableRow
                  key={mineral.id}
                  mineral={mineral}
                  maxPrice={maxPrice}
                  rank={i + 1}
                />
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Info className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Aucun résultat</p>
          </div>
        )}
      </div>
    </div>
  )
}
