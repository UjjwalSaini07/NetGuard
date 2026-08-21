import { NavLink } from 'react-router-dom'

const links = [
  { to: '/', label: 'Dashboard' },
  { to: '/devices', label: 'Devices' },
  { to: '/firewall-rules', label: 'Firewall Rules' },
  { to: '/cis-results', label: 'CIS Results' }
]

export default function Sidebar() {
  return (
    <aside className="hidden w-56 shrink-0 border-r border-surface-border bg-surface-raised md:block">
      <div className="px-5 py-6">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-md bg-emerald-500/20 text-center text-sm font-bold leading-7 text-emerald-400">
            N
          </div>
          <span className="text-base font-semibold tracking-tight text-zinc-100">NetGuard</span>
        </div>
      </div>
      <nav className="flex flex-col gap-1 px-3">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === '/'}
            className={({ isActive }) =>
              `rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'text-zinc-400 hover:bg-surface hover:text-zinc-200'
              }`
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
