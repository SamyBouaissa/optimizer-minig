import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { TrendingUp, Gem, Layers, Calculator, ArrowRight, Clock } from 'lucide-react'
import { getMinerals, getAlloys, getMineralPrices, getAlloyPrices, getAllPriceHistory } from '../services/api'

export default function Dashboard() {
  const [stats, setStats] = useState({
    minerals: 0,
    alloys: 0,
    recentUpdates: []
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const [minerals, alloys, mineralPrices, alloyPrices, history] = await Promise.all([
          getMinerals(),
          getAlloys(),
          getMineralPrices(),
          getAlloyPrices(),
          getAllPriceHistory()
        ])

        // Get recent price updates
        const allHistory = [...(history.minerals || []), ...(history.alloys || [])]
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
          .slice(0, 5)

        setStats({
          minerals: minerals.length,
          alloys: alloys.length,
          mineralPrices: Object.keys(mineralPrices).length,
          alloyPrices: Object.keys(alloyPrices).length,
          recentUpdates: allHistory
        })
      } catch (err) {
        console.error('Error loading dashboard data:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const quickLinks = [
    {
      title: 'Minerais',
      description: 'Gérer les prix des minerais',
      icon: Gem,
      path: '/minerals',
      color: 'from-amber-500 to-orange-600'
    },
    {
      title: 'Alliages',
      description: 'Voir les recettes et prix',
      icon: Layers,
      path: '/alloys',
      color: 'from-cyan-500 to-blue-600'
    },
    {
      title: 'Calculateur',
      description: 'Optimiser tes ventes',
      icon: Calculator,
      path: '/calculator',
      color: 'from-emerald-500 to-green-600'
    }
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-dofus-gold border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl font-bold text-white mb-2">
          Tableau de bord
        </h1>
        <p className="text-gray-400">
          Bienvenue sur ton optimiseur de minerais Dofus
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-dofus-dark/50 backdrop-blur-sm rounded-xl p-6 border border-dofus-stone/30">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <Gem className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Minerais</p>
              <p className="text-2xl font-bold text-white">{stats.minerals}</p>
            </div>
          </div>
        </div>

        <div className="bg-dofus-dark/50 backdrop-blur-sm rounded-xl p-6 border border-dofus-stone/30">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-cyan-500/20 flex items-center justify-center">
              <Layers className="w-6 h-6 text-cyan-500" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Alliages</p>
              <p className="text-2xl font-bold text-white">{stats.alloys}</p>
            </div>
          </div>
        </div>

        <div className="bg-dofus-dark/50 backdrop-blur-sm rounded-xl p-6 border border-dofus-stone/30">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Prix enregistrés</p>
              <p className="text-2xl font-bold text-white">
                {(stats.mineralPrices || 0) + (stats.alloyPrices || 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div>
        <h2 className="font-display text-xl font-semibold text-white mb-4">
          Actions rapides
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickLinks.map(({ title, description, icon: Icon, path, color }) => (
            <Link
              key={path}
              to={path}
              className="group bg-dofus-dark/50 backdrop-blur-sm rounded-xl p-6 border border-dofus-stone/30 card-hover"
            >
              <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center mb-4`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-white mb-1 flex items-center gap-2">
                {title}
                <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
              </h3>
              <p className="text-sm text-gray-400">{description}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Updates */}
      <div>
        <h2 className="font-display text-xl font-semibold text-white mb-4">
          Mises à jour récentes
        </h2>
        <div className="bg-dofus-dark/50 backdrop-blur-sm rounded-xl border border-dofus-stone/30 overflow-hidden">
          {stats.recentUpdates.length > 0 ? (
            <ul className="divide-y divide-dofus-stone/30">
              {stats.recentUpdates.map((update, index) => (
                <li key={index} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span className="text-white">{update.name}</span>
                  </div>
                  <span className="text-sm text-gray-400">
                    {new Date(update.timestamp).toLocaleDateString('fr-FR')}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-8 text-center text-gray-400">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Aucune mise à jour récente</p>
              <p className="text-sm">Commence par mettre à jour les prix des minerais</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
