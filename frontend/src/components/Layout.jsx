import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { getRole } from '../api/client'

const PAGE_TITLES = {
  '/dashboard': 'Дашборд',
  '/incidents': 'Журнал инцидентов',
  '/report':    'Отчёт',
  '/settings':  'Настройки',
}

export default function Layout() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const role      = getRole()
  const isAdmin   = role === 'admin'
  const title     = PAGE_TITLES[location.pathname] || 'ОПС Журнал'

  function logout() {
    localStorage.removeItem('ops_token')
    localStorage.removeItem('ops_role')
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
          <NavLink to="/dashboard" className={({isActive}) => 'nav-item' + (isActive ? ' active' : '')}>
            <span className="icon">📊</span> Дашборд
          </NavLink>
          <NavLink to="/incidents" className={({isActive}) => 'nav-item' + (isActive ? ' active' : '')}>
            <span className="icon">📋</span> Журнал инцидентов
          </NavLink>
          <NavLink to="/report" className={({isActive}) => 'nav-item' + (isActive ? ' active' : '')}>
            <span className="icon">📄</span> Отчёт
          </NavLink>
          {isAdmin && (
            <>
              <div className="sidebar-section-title" style={{marginTop:8}}>Администратор</div>
              <NavLink to="/settings" className={({isActive}) => 'nav-item' + (isActive ? ' active' : '')}>
                <span className="icon">⚙️</span> Настройки
              </NavLink>
            </>
          )}
        </nav>
        <div className="sidebar-footer">
          <div style={{fontSize:11, color:'rgba(160,174,192,0.5)', marginBottom:8, textAlign:'center'}}>
            {isAdmin ? '👤 Администратор' : '👁 Просмотр'}
          </div>
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
          <div style={{fontSize:12, color:'var(--text2)'}}>
            {isAdmin ? 'Администратор' : 'Просмотр'}
          </div>
        </div>
        <div style={{flex:1}}>
          <Outlet />
        </div>
      </div>
    </div>
  )
}
