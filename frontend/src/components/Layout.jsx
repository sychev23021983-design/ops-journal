import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'

const NAV = [
  { to: '/dashboard', icon: '📊', label: 'Дашборд' },
  { to: '/incidents', icon: '📋', label: 'Журнал инцидентов' },
  { to: '/report',    icon: '📄', label: 'Отчёт' },
]

const PAGE_TITLES = {
  '/dashboard': 'Дашборд',
  '/incidents': 'Журнал инцидентов',
  '/report':    'Отчёт',
}

export default function Layout() {
  const navigate = useNavigate()
  const location = useLocation()
  const title = PAGE_TITLES[location.pathname] || 'ОПС Журнал'

  function logout() {
    localStorage.removeItem('ops_token')
    navigate('/login')
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-icon">🛡</div>
          <div>
            <h1>ОПС Журнал</h1>
            <p>ООО «ИТЦ-М»</p>
          </div>
        </div>
        <nav>
          <div className="sidebar-section-title">Навигация</div>
          {NAV.map(n => (
            <NavLink key={n.to} to={n.to}
              className={({isActive}) => 'nav-item' + (isActive ? ' active' : '')}>
              <span className="icon">{n.icon}</span>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button className="btn btn-ghost btn-sm"
            style={{width:'100%', justifyContent:'center', color:'#a0aec0', borderColor:'rgba(255,255,255,0.1)', background:'rgba(255,255,255,0.05)'}}
            onClick={logout}>
            ↩ Выйти
          </button>
        </div>
      </aside>

      <div className="main">
        <div className="topbar">
          <div className="topbar-title">{title}</div>
          <div style={{fontSize:12, color:'var(--text2)'}}>Администратор</div>
        </div>
        <div style={{flex:1}}>
          <Outlet />
        </div>
      </div>
    </div>
  )
}
