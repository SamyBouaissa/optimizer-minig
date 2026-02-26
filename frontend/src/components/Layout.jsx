import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Gem, Layers, Calculator, Hammer } from 'lucide-react'

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/minerals', label: 'Minerais', icon: Gem },
  { path: '/alloys', label: 'Alliages', icon: Layers },
  { path: '/calculator', label: 'Calculateur', icon: Calculator },
]

export default function Layout({ children }) {
  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 bg-dofus-darker/80 backdrop-blur-sm border-r border-dofus-stone/30 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-dofus-stone/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-dofus-gold to-dofus-copper flex items-center justify-center">
              <Hammer className="w-6 h-6 text-dofus-darker" />
            </div>
            <div>
              <h1 className="font-display text-lg font-bold text-dofus-gold">Dofus</h1>
              <p className="text-xs text-gray-400">Mining Optimizer</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {navItems.map(({ path, label, icon: Icon }) => (
              <li key={path}>
                <NavLink
                  to={path}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                      isActive
                        ? 'bg-dofus-gold/20 text-dofus-gold border border-dofus-gold/30'
                        : 'text-gray-400 hover:text-white hover:bg-dofus-stone/30'
                    }`
                  }
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-dofus-stone/30">
          <p className="text-xs text-gray-500 text-center">
            Optimise tes kamas !
          </p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
