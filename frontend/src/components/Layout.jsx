import { Outlet, NavLink, useNavigate } from 'react-router-dom'

export default function Layout() {
  const navigate = useNavigate()

  function logout() {
    localStorage.removeItem('ops_token')
    navigate('/login')
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h1>ОПС Журнал</h1>
          <p>Система учёта инцидентов</p>
        </div>
        <nav>
          <NavLink to="/dashboard" className={({isActive}) => 'nav-item' + (isActive ? ' active' : '')}>
            <span className="icon">📊</span> Дашборд
          </NavLink>
          <NavLink to="/incidents" className={({isActive}) => 'nav-item' + (isActive ? ' active' : '')}>
            <span className="icon">📋</span> Журнал
          </NavLink>
          <NavLink to="/report" className={({isActive}) => 'nav-item' + (isActive ? ' active' : '')}>
            <span className="icon">📄</span> Отчёт
          </NavLink>
        </nav>
        <div className="sidebar-footer">
          <button className="btn btn-ghost btn-sm" style={{width:'100%'}} onClick={logout}>
            Выйти
          </button>
        </div>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  )
}
