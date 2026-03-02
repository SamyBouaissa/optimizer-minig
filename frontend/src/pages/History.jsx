import { useEffect, useState, useMemo } from 'react'
import { Search, TrendingUp } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts'
import { getMinerals, getAlloys, getAllPriceHistory } from '../services/api'
import { getItemIcon } from '../services/icons'

const PERIODS = [
  { label: '1j', days: 1 },
  { label: '3j', days: 3 },
  { label: '7j', days: 7 },
  { label: '30j', days: 30 },
]

const LINE_COLORS = {
  x1: '#d4a84b',
  x10: '#10b981',
  x100: '#3b82f6',
  x1000: '#a855f7',
}

const LOT_LABELS = { x1: 'Unité', x10: 'Lot 10', x100: 'Lot 100', x1000: 'Lot 1000' }

const getDofusDBImage = (dofusdbId) =>
  `https://api.dofusdb.fr/img/items/${dofusdbId}.png`

function filterByPeriod(entries, days) {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
  return entries.filter(e => new Date(e.timestamp).getTime() >= cutoff)
}

function buildChartData(entries) {
  return entries.map(e => ({
    time: new Date(e.timestamp).toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit',
      hour: '2-digit', minute: '2-digit'
    }),
    x1: e.prices.x1 || null,
    x10: e.prices.x10 || null,
    x100: e.prices.x100 || null,
    x1000: e.prices.x1000 || null,
  }))
}

export default function History() {
  const [minerals, setMinerals] = useState([])
  const [alloys, setAlloys] = useState([])
  const [allHistory, setAllHistory] = useState({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [period, setPeriod] = useState(7)
  const [tab, setTab] = useState('minerals')
  const [selectedItem, setSelectedItem] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const [min, all, rawHist] = await Promise.all([
          getMinerals(),
          getAlloys(),
          getAllPriceHistory(),
        ])
        setMinerals(min)
        setAlloys(all)

        // Le backend renvoie { minerals: [{itemId, timestamp, prices}], alloys: [...] }
        // On le transforme en { mineral_xxx: [...sorted], alloy_xxx: [...sorted] }
        const indexed = {}
        for (const entry of (rawHist.minerals || [])) {
          const key = `mineral_${entry.itemId}`
          if (!indexed[key]) indexed[key] = []
          indexed[key].push(entry)
        }
        for (const entry of (rawHist.alloys || [])) {
          const key = `alloy_${entry.itemId}`
          if (!indexed[key]) indexed[key] = []
          indexed[key].push(entry)
        }
        // Trier par timestamp croissant
        for (const key of Object.keys(indexed))
          indexed[key].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))

        setAllHistory(indexed)
        const firstMineral = min[0]
        if (firstMineral) setSelectedItem({ type: 'mineral', item: firstMineral })
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const items = tab === 'minerals' ? minerals : alloys

  const filteredItems = useMemo(() =>
    items.filter(i => i.name.toLowerCase().includes(search.toLowerCase())),
    [items, search]
  )

  const historyKey = selectedItem
    ? `${selectedItem.type === 'mineral' ? 'mineral' : 'alloy'}_${selectedItem.item.id}`
    : null

  const rawEntries = historyKey ? (allHistory[historyKey] || []) : []
  const filteredEntries = filterByPeriod(rawEntries, period)
  const chartData = buildChartData(filteredEntries)

  const activeLots = ['x1', 'x10', 'x100', 'x1000'].filter(lot =>
    chartData.some(d => d[lot] !== null && d[lot] !== 0)
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-dofus-gold border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl font-bold text-white mb-2">Historique des prix</h1>
        <p className="text-gray-400">Suivi de l'évolution des prix dans le temps</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left panel — item list */}
        <div className="lg:w-72 flex-shrink-0 space-y-3">
          {/* Tabs */}
          <div className="flex rounded-lg overflow-hidden border border-dofus-stone/30">
            {['minerals', 'alloys'].map(t => (
              <button
                key={t}
                onClick={() => { setTab(t); setSearch(''); setSelectedItem(null) }}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                  tab === t
                    ? 'bg-dofus-gold/20 text-dofus-gold'
                    : 'bg-dofus-dark/50 text-gray-400 hover:text-white'
                }`}
              >
                {t === 'minerals' ? 'Minerais' : 'Alliages'}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-dofus-dark/50 border border-dofus-stone/30 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-dofus-gold/50"
            />
          </div>

          {/* Item list */}
          <div className="space-y-1 max-h-[500px] overflow-y-auto pr-1">
            {filteredItems.map(item => {
              const key = `${tab === 'minerals' ? 'mineral' : 'alloy'}_${item.id}`
              const entryCount = filterByPeriod(allHistory[key] || [], period).length
              const isSelected = selectedItem?.item.id === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => setSelectedItem({ type: tab === 'minerals' ? 'mineral' : 'alloy', item })}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    isSelected
                      ? 'bg-dofus-gold/20 border border-dofus-gold/30 text-dofus-gold'
                      : 'bg-dofus-dark/30 border border-transparent text-gray-300 hover:bg-dofus-stone/20 hover:text-white'
                  }`}
                >
                  {getItemIcon(item.id) ? (
                    <img
                      src={getItemIcon(item.id)}
                      alt={item.name}
                      className="w-7 h-7 object-contain flex-shrink-0"
                      onError={e => { e.target.style.display = 'none' }}
                    />
                  ) : (
                    <div className="w-7 h-7 rounded bg-dofus-stone/30 flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {item.name.charAt(0)}
                    </div>
                  )}
                  <span className="flex-1 text-sm truncate">{item.name}</span>
                  <span className="text-xs text-gray-500">{entryCount}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Right panel — chart */}
        <div className="flex-1 bg-dofus-dark/50 backdrop-blur-sm rounded-xl border border-dofus-stone/30 p-6">
          {/* Period selector */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-dofus-gold" />
              <h2 className="font-display text-lg font-semibold text-white">
                {selectedItem ? selectedItem.item.name : 'Sélectionne un item'}
              </h2>
            </div>
            <div className="flex gap-1 bg-dofus-darker/50 rounded-lg p-1">
              {PERIODS.map(p => (
                <button
                  key={p.days}
                  onClick={() => setPeriod(p.days)}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    period === p.days
                      ? 'bg-dofus-gold text-dofus-darker'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {!selectedItem ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <TrendingUp className="w-12 h-12 mb-4 opacity-50" />
              <p>Sélectionne un item dans la liste</p>
            </div>
          ) : chartData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <TrendingUp className="w-12 h-12 mb-4 opacity-50" />
              <p>Aucune donnée sur cette période</p>
              <p className="text-sm mt-1">Les prix sont enregistrés à chaque modification</p>
            </div>
          ) : (
            <>
              {/* Lot legend pills */}
              <div className="flex gap-3 mb-4 flex-wrap">
                {activeLots.map(lot => (
                  <span
                    key={lot}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium"
                    style={{ backgroundColor: LINE_COLORS[lot] + '22', color: LINE_COLORS[lot], border: `1px solid ${LINE_COLORS[lot]}44` }}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: LINE_COLORS[lot] }} />
                    {LOT_LABELS[lot]}
                  </span>
                ))}
              </div>

              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" />
                    <XAxis
                      dataKey="time"
                      stroke="#4a4a5c"
                      tick={{ fill: '#9ca3af', fontSize: 11 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      stroke="#4a4a5c"
                      tick={{ fill: '#9ca3af', fontSize: 11 }}
                      tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}
                      width={55}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1a1a2e',
                        border: '1px solid #4a4a5c',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}
                      labelStyle={{ color: '#d4a84b', marginBottom: 4 }}
                      formatter={(value, name) => [
                        value ? `${value.toLocaleString('fr-FR')} K` : '—',
                        LOT_LABELS[name] || name
                      ]}
                    />
                    <Legend
                      formatter={name => LOT_LABELS[name] || name}
                      wrapperStyle={{ fontSize: 12 }}
                    />
                    {activeLots.map(lot => (
                      <Line
                        key={lot}
                        type="monotone"
                        dataKey={lot}
                        stroke={LINE_COLORS[lot]}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4 }}
                        connectNulls={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Stats */}
              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                {activeLots.map(lot => {
                  const vals = chartData.map(d => d[lot]).filter(v => v)
                  const last = vals[vals.length - 1]
                  const first = vals[0]
                  const diff = last && first ? last - first : null
                  return (
                    <div key={lot} className="bg-dofus-darker/50 rounded-lg p-3">
                      <div className="text-xs text-gray-500 mb-1">{LOT_LABELS[lot]}</div>
                      <div className="text-sm font-bold text-white">
                        {last ? `${last.toLocaleString('fr-FR')} K` : '—'}
                      </div>
                      {diff !== null && (
                        <div className={`text-xs mt-0.5 ${diff >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {diff >= 0 ? '+' : ''}{diff.toLocaleString('fr-FR')} K
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
