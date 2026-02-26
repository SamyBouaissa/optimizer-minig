import { useEffect, useState } from 'react'
import { X, TrendingUp } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { getPriceHistory } from '../services/api'

export default function PriceHistoryModal({ isOpen, onClose, item, type }) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen && item) {
      loadHistory()
    }
  }, [isOpen, item])

  const loadHistory = async () => {
    setLoading(true)
    try {
      const data = await getPriceHistory(type, item.id)
      // Transform data for chart
      const chartData = data.map(entry => ({
        date: new Date(entry.timestamp).toLocaleDateString('fr-FR'),
        x1: entry.prices.x1,
        x10: entry.prices.x10,
        x100: entry.prices.x100
      }))
      setHistory(chartData)
    } catch (err) {
      console.error('Error loading history:', err)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-dofus-dark border border-dofus-stone/30 rounded-xl w-full max-w-2xl max-h-[80vh] overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-dofus-stone/30">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-dofus-gold" />
            <h2 className="font-display text-lg font-semibold text-white">
              Historique des prix - {item?.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-8 h-8 border-4 border-dofus-gold border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : history.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={history}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#4a4a5c" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#9ca3af"
                    tick={{ fill: '#9ca3af', fontSize: 12 }}
                  />
                  <YAxis 
                    stroke="#9ca3af"
                    tick={{ fill: '#9ca3af', fontSize: 12 }}
                    tickFormatter={(value) => `${value.toLocaleString()}`}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: '#1a1a2e',
                      border: '1px solid #4a4a5c',
                      borderRadius: '8px'
                    }}
                    labelStyle={{ color: '#d4a84b' }}
                    formatter={(value) => [`${value.toLocaleString()} K`, '']}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="x1" 
                    name="Unité"
                    stroke="#d4a84b" 
                    strokeWidth={2}
                    dot={{ fill: '#d4a84b' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="x10" 
                    name="Lot 10"
                    stroke="#10b981" 
                    strokeWidth={2}
                    dot={{ fill: '#10b981' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="x100" 
                    name="Lot 100"
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    dot={{ fill: '#3b82f6' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <TrendingUp className="w-12 h-12 mb-4 opacity-50" />
              <p>Aucun historique disponible</p>
              <p className="text-sm">Les prix seront enregistrés au fil des mises à jour</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
