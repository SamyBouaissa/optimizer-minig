import { useState } from 'react'
import { Edit2, Save, X, TrendingUp } from 'lucide-react'

// Color mapping for minerals/alloys based on their names
const getItemColor = (name) => {
  const colors = {
    'fer': 'bg-gray-500',
    'cuivre': 'bg-orange-500',
    'bronze': 'bg-amber-700',
    'kobalte': 'bg-blue-500',
    'manganese': 'bg-slate-600',
    'etain': 'bg-slate-400',
    'argent': 'bg-gray-300',
    'bauxite': 'bg-red-600',
    'charbon': 'bg-gray-800',
    'dolomite': 'bg-green-600',
    'silicate': 'bg-red-400',
    'obsidienne': 'bg-purple-900',
    'or': 'bg-yellow-500',
    'cendrepierre': 'bg-gray-600',
    'cristal': 'bg-cyan-400',
    'ecume': 'bg-yellow-100',
    'support': 'bg-amber-600',
    'minerai_enchante': 'bg-pink-400',
    'minerai_etrange': 'bg-indigo-600',
    'ferrite': 'bg-cyan-600',
    'lingot': 'bg-yellow-400',
    'aluminite': 'bg-cyan-300',
    'grizite': 'bg-gray-500',
    'ebonite': 'bg-teal-600',
    'magnesite': 'bg-cyan-500',
    'bakelelite': 'bg-teal-400',
    'kouartz': 'bg-gray-200',
    'kriptonite': 'bg-green-400',
    'plaque': 'bg-gray-400',
    'kobalite': 'bg-cyan-700',
    'alliage_ivre': 'bg-yellow-300',
    'rutile': 'bg-orange-400',
    'pyrute': 'bg-purple-500',
    'ardonite': 'bg-gray-100',
  }
  
  const key = Object.keys(colors).find(k => name.toLowerCase().includes(k))
  return colors[key] || 'bg-dofus-stone'
}

function ItemCard({ item, type, price, onPriceUpdate, onShowHistory }) {
  const [isEditing, setIsEditing] = useState(false)
  const [editPrices, setEditPrices] = useState({
    x1: price?.prices?.x1 || 0,
    x10: price?.prices?.x10 || 0,
    x100: price?.prices?.x100 || 0,
    x1000: price?.prices?.x1000 || 0,
  })

  const handleSave = async () => {
    await onPriceUpdate(type, item.id, editPrices)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditPrices({
      x1: price?.prices?.x1 || 0,
      x10: price?.prices?.x10 || 0,
      x100: price?.prices?.x100 || 0,
      x1000: price?.prices?.x1000 || 0,
    })
    setIsEditing(false)
  }

  const formatKamas = (value) => {
    if (!value) return '—'
    return new Intl.NumberFormat('fr-FR').format(value) + ' K'
  }

  return (
    <div className="bg-dofus-dark/60 rounded-xl border border-dofus-stone/20 p-4 card-hover">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`item-icon ${getItemColor(item.id)} text-white shadow-lg`}>
            {item.name.charAt(0)}
          </div>
          <div>
            <h3 className="font-semibold text-lg text-dofus-gold">{item.name}</h3>
            <p className="text-sm text-dofus-stone">
              Niveau {item.level} • {item.type}
            </p>
          </div>
        </div>
        
        <div className="flex gap-1">
          {onShowHistory && (
            <button
              onClick={() => onShowHistory(type, item.id, item.name)}
              className="p-2 rounded-lg text-dofus-stone hover:text-dofus-gold hover:bg-dofus-gold/10 transition-colors"
              title="Voir l'historique"
            >
              <TrendingUp className="w-4 h-4" />
            </button>
          )}
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="p-2 rounded-lg text-dofus-stone hover:text-dofus-gold hover:bg-dofus-gold/10 transition-colors"
              title="Modifier les prix"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          ) : (
            <>
              <button
                onClick={handleSave}
                className="p-2 rounded-lg text-green-400 hover:bg-green-400/10 transition-colors"
                title="Enregistrer"
              >
                <Save className="w-4 h-4" />
              </button>
              <button
                onClick={handleCancel}
                className="p-2 rounded-lg text-red-400 hover:bg-red-400/10 transition-colors"
                title="Annuler"
              >
                <X className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Prices Grid */}
      <div className="grid grid-cols-4 gap-2">
        {['x1', 'x10', 'x100', 'x1000'].map(lot => (
          <div key={lot} className="text-center">
            <div className="text-xs text-dofus-stone mb-1 uppercase">{lot}</div>
            {isEditing ? (
              <input
                type="number"
                value={editPrices[lot]}
                onChange={(e) => setEditPrices(prev => ({ ...prev, [lot]: parseInt(e.target.value) || 0 }))}
                className="w-full bg-dofus-darker border border-dofus-stone/30 rounded px-2 py-1 text-center text-sm focus:border-dofus-gold focus:outline-none"
              />
            ) : (
              <div className="text-sm font-medium text-dofus-gold/90">
                {formatKamas(price?.prices?.[lot])}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Last Updated */}
      {price?.lastUpdated && (
        <div className="mt-3 pt-3 border-t border-dofus-stone/10 text-xs text-dofus-stone text-center">
          Mis à jour: {new Date(price.lastUpdated).toLocaleString('fr-FR')}
        </div>
      )}
    </div>
  )
}

export default ItemCard
