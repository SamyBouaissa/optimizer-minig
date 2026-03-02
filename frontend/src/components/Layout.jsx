import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Gem, Layers, Calculator, Hammer, TrendingUp, BarChart2 } from 'lucide-react'

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/minerals', label: 'Minerais', icon: Gem },
  { path: '/alloys', label: 'Alliages', icon: Layers },
  { path: '/calculator', label: 'Calculateur', icon: Calculator },
  { path: '/history', label: 'Historique', icon: TrendingUp },
  { path: '/impact', label: 'Impact', icon: BarChart2 },
]

const navGroups = [
  {
    label: 'Données',
    items: [
      { path: '/minerals', label: 'Minerais', icon: Gem },
      { path: '/alloys',   label: 'Alliages',  icon: Layers },
    ]
  },
  {
    label: 'Analyse',
    items: [
      { path: '/history',    label: 'Historique', icon: TrendingUp },
      { path: '/impact',     label: 'Impact',     icon: BarChart2 },
      { path: '/',           label: 'Dashboard',  icon: LayoutDashboard },
    ]
  },
  {
    label: 'Outil',
    items: [
      { path: '/calculator', label: 'Calculateur', icon: Calculator },
    ]
  },
]

export default function Layout({ children }) {
  return (
    <div className="h-screen flex overflow-hidden">
      {/* Sidebar — fixe, ne défile jamais */}
      <aside className="w-64 h-screen flex-shrink-0 bg-dofus-darker/80 backdrop-blur-sm border-r border-dofus-stone/30 flex flex-col overflow-hidden">
        {/* Logo */}
        <div className="p-5 border-b border-dofus-stone/30 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-dofus-gold to-dofus-copper flex items-center justify-center">
              <Hammer className="w-5 h-5 text-dofus-darker" />
            </div>
            <div>
              <h1 className="font-display text-base font-bold text-dofus-gold leading-tight">Dofus</h1>
              <p className="text-xs text-gray-400">Mining Optimizer</p>
            </div>
          </div>
        </div>

        {/* Navigation — grouped */}
        <nav className="flex-1 p-3 overflow-y-auto">
          <ul className="space-y-4">
            {navGroups.map(group => (
              <li key={group.label}>
                <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-600">
                  {group.label}
                </p>
                <ul className="space-y-0.5">
                  {group.items.map(({ path, label, icon: Icon }) => (
                    <li key={path}>
                      <NavLink
                        to={path}
                        end={path === '/'}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 text-sm ${
                            isActive
                              ? 'bg-dofus-gold/20 text-dofus-gold border border-dofus-gold/30 font-semibold'
                              : 'text-gray-400 hover:text-white hover:bg-dofus-stone/30'
                          }`
                        }
                      >
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        <span>{label}</span>
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-dofus-stone/30 flex-shrink-0">
          <p className="text-[11px] text-gray-600 text-center">Optimise tes kamas !</p>
        </div>
      </aside>

      {/* Main content — seule zone qui défile */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
