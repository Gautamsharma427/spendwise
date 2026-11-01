import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  Activity,
  Bell,
  Building2,
  ChevronDown,
  CreditCard,
  FileBarChart,
  LayoutDashboard,
  Lightbulb,
  Menu,
  Search,
  Settings,
  Shield,
  X,
} from 'lucide-react'
import { useWorkspace } from '../state/WorkspaceContext.js'
import { useAuth } from '../auth/AuthContext.js'
import toast from 'react-hot-toast'

const navigation = [
  { section: 'OVERVIEW', items: [{ label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard }] },
  { section: 'MANAGEMENT', items: [{ label: 'Subscriptions', to: '/subscriptions', icon: CreditCard }, { label: 'Licenses', to: '/licenses', icon: Shield }, { label: 'Recommendations', to: '/recommendations', icon: Lightbulb }] },
  { section: 'ANALYTICS', items: [{ label: 'Spending Insights', to: '/insights', icon: Activity }, { label: 'Reports', to: '/reports', icon: FileBarChart }] },
  { section: 'CONFIGURATION', items: [{ label: 'Settings', to: '/settings', icon: Settings }] },
]

function WorkspaceLayout() {
  const { organization, user, isCloud, loadDemo, subscriptions, licenses, recommendations } = useWorkspace()
  const { signOut } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [profileOpen, setProfileOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const location = useLocation()
  const page = navigation.flatMap((group) => group.items).find((item) => item.to === location.pathname)

  useEffect(() => {
    function handleShortcut(event) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setSearchOpen(true)
        document.querySelector('[aria-label="Search subscriptions, vendors, or teams"]')?.focus()
      }
      if (event.key === 'Escape') {
        setSearchOpen(false)
        setProfileOpen(false)
        setNotificationsOpen(false)
        setMobileOpen(false)
      }
    }
    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [])

  const hasNotifications = recommendations.some((recommendation) => recommendation.status === 'Pending')

  return (
    <div className={`app-shell ${collapsed ? 'sidebar-collapsed' : ''}`}>
      {mobileOpen && <button aria-label="Close navigation" className="mobile-backdrop" onClick={() => setMobileOpen(false)} type="button" />}
      <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
        <Link aria-label="SpendWise home" className="brand" to="/dashboard">
          <span className="brand-symbol"><Activity size={20} strokeWidth={2.2} /></span>
          {!collapsed && <span className="brand-copy"><strong>SpendWise</strong><small>Every subscription earns its place.</small></span>}
          <button aria-label="Close mobile navigation" className="mobile-close icon-button" onClick={(event) => { event.preventDefault(); setMobileOpen(false) }} type="button"><X size={17} /></button>
        </Link>
        <button className="organization-selector" disabled={isCloud} onClick={loadDemo} title={isCloud ? 'Authenticated organization workspace' : 'Switch to the Northstar Labs demo organization'} type="button">
          <span className="organization-icon"><Building2 size={16} /></span>
          {!collapsed && <span><strong>{organization.name}</strong><small>{organization.demoMode ? 'DEMO ORGANIZATION' : 'WORKSPACE'}</small></span>}
          {!collapsed && <ChevronDown className="organization-chevron" size={14} />}
        </button>
        <nav className="side-nav" aria-label="Main navigation">
          {navigation.map((group) => (
            <div className="nav-group" key={group.section}>
              {!collapsed && <span className="nav-group-label">{group.section}</span>}
              {group.items.map(({ label, to, icon: Icon }) => (
                <NavLink className={({ isActive }) => `nav-item ${isActive ? 'nav-active' : ''}`} key={to} onClick={() => setMobileOpen(false)} title={collapsed ? label : undefined} to={to}>
                  <Icon size={16} strokeWidth={1.8} /><span>{label}</span>
                  {label === 'Recommendations' && !collapsed && recommendations.filter((item) => item.status === 'Pending').length > 0 && <span className="nav-count">{recommendations.filter((item) => item.status === 'Pending').length}</span>}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          {!collapsed && <div className="sidebar-help"><span><strong>Find your next savings</strong><small>Review your optimization opportunities.</small></span><Link to="/recommendations">Review</Link></div>}
          <button className="collapse-toggle" onClick={() => setCollapsed((value) => !value)} type="button"><span>{collapsed ? 'Expand sidebar' : 'Collapse sidebar'}</span><Menu size={15} /></button>
          <div className="sidebar-profile">
            <span className="avatar">{user.name.split(' ').map((part) => part[0]).join('')}</span>
            {!collapsed && <span className="profile-copy"><strong>{user.name}</strong><small>{user.role} · {subscriptions.length} subscriptions · {licenses.length} seats</small></span>}
          </div>
        </div>
      </aside>
      <main className="main-shell">
        <header className="topbar">
          <button aria-label="Open navigation" className="icon-button mobile-menu-button" onClick={() => setMobileOpen(true)} type="button"><Menu size={19} /></button>
          <div className="breadcrumb"><span>Workspace</span><span className="breadcrumb-divider">/</span><strong>{page?.label ?? 'Dashboard'}</strong></div>
          <div className="topbar-actions">
            <label className="global-search">
              <Search size={15} />
              <input aria-label="Search subscriptions, vendors, or teams" onChange={(event) => setSearch(event.target.value)} onFocus={() => setSearchOpen(true)} placeholder="Search subscriptions, vendors, or teams..." value={search} />
              {!search && <kbd>Ctrl K</kbd>}
              {searchOpen && search && (
                <div className="search-results">
                  {subscriptions.filter((item) => `${item.appName} ${item.vendor} ${item.category}`.toLowerCase().includes(search.toLowerCase())).slice(0, 5).map((item) => <Link key={item.id} onClick={() => { setSearch(''); setSearchOpen(false) }} to={`/subscriptions?search=${encodeURIComponent(item.appName)}`}><CreditCard size={14} /><span><strong>{item.appName}</strong><small>{item.vendor}</small></span></Link>)}
                  {subscriptions.every((item) => !`${item.appName} ${item.vendor} ${item.category}`.toLowerCase().includes(search.toLowerCase())) && <span className="search-empty">No matching subscriptions.</span>}
                </div>
              )}
            </label>
            <div className="popover-wrap">
              <button aria-expanded={notificationsOpen} aria-label="Notifications" className="icon-button notification-button" onClick={() => setNotificationsOpen((value) => !value)} type="button"><Bell size={18} />{hasNotifications && <span className="notification-dot" />}</button>
              {notificationsOpen && <div className="header-popover"><strong>{hasNotifications ? 'Items need your review' : 'You’re all caught up'}</strong><span>{recommendations.filter((item) => item.status === 'Pending').length} pending recommendations · {subscriptions.filter((item) => { const days = Math.ceil((new Date(`${item.renewalDate}T00:00:00`) - new Date()) / 86_400_000); return days >= 0 && days <= 14 }).length} renewals in 14 days</span><Link onClick={() => setNotificationsOpen(false)} to="/recommendations">Review recommendations</Link></div>}
            </div>
            <div className="popover-wrap">
              <button aria-expanded={profileOpen} className="profile-button" onClick={() => setProfileOpen((value) => !value)} type="button"><span className="avatar">{user.name.split(' ').map((part) => part[0]).join('')}</span><span className="profile-copy"><strong>{user.name}</strong><small>{user.role}</small></span><ChevronDown size={14} /></button>
              {profileOpen && <div className="header-popover profile-popover"><strong>{user.name}</strong><span>{user.email}</span><Link onClick={() => setProfileOpen(false)} to="/settings">Organization settings</Link>{isCloud ? <button onClick={async () => { try { await signOut() } catch (error) { console.error('Sign-out failed:', error); toast.error(error.message || 'Could not sign out.') } }} type="button">Sign out</button> : <button onClick={loadDemo} type="button">Load demo organization</button>}</div>}
            </div>
          </div>
        </header>
        <Outlet context={{ search, setSearch, searchOpen, setSearchOpen }} />
      </main>
    </div>
  )
}

export default WorkspaceLayout
