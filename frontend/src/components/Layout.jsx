import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { getRole, api } from '../api/client'
import { useState, useEffect } from 'react'

const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/incidents': 'Incident log',
  '/report':    'Report',
  '/settings':  'Settings',
}

export default function Layout() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const role      = getRole()
  const isAdmin   = role === 'admin'
  const title     = PAGE_TITLES[location.pathname] || 'OPS Journal'
  const [logoUrl, setLogoUrl] = useState(null)

  useEffect(() => {
    api.settings.publicSettings().then(s => {
      if (s.logo_url) setLogoUrl(s.logo_url)
    }).catch(() => {})
  }, [])

  function logout() {
    localStorage.removeItem('ops_token')
    localStorage.removeItem('ops_role')
    navigate('/login')
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          {logoUrl
            ? <img src={logoUrl} alt="logo" style={{width:32,height:32,objectFit:'contain',borderRadius:4,flexShrink:0}} />
            : <div className="logo-icon">shield</div>
          }
          <div>
            <h1>OPS Journal</h1>
            <p>OOO ITC-M</p>
          </div>
        </div>
        <nav>
          <div className="sidebar-section-title">Navigation</div>
          <NavLink to="/dashboard" className={({isActive}) => 'nav-item' + (isActive ? ' active' : '')}>
            <span className="icon">dashboard</span> Dashboard
          </NavLink>
          <NavLink to="/incidents" className={({isActive}) => 'nav-item' + (isActive ? ' active' : '')}>
            <span className="icon">list</span> Incident log
          </NavLink>
          <NavLink to="/report" className={({isActive}) => 'nav-item' + (isActive ? ' active' : '')}>
            <span className="icon">doc</span> Report
          </NavLink>
          {isAdmin && (
            <>
              <div className="sidebar-section-title" style={{marginTop:8}}>Admin</div>
              <NavLink to="/settings" className={({isActive}) => 'nav-item' + (isActive ? ' active' : '')}>
                <span className="icon">gear</span> Settings
              </NavLink>
            </>
          )}
        </nav>
        <div className="sidebar-footer">
          <div style={{fontSize:11,color:'rgba(160,174,192,0.5)',marginBottom:8,textAlign:'center'}}>
            {isAdmin ? 'Admin' : 'View only'}
          </div>
          <button className="btn btn-ghost btn-sm"
            style={{width:'100%',justifyContent:'center',color:'#a0aec0',borderColor:'rgba(255,255,255,0.1)',background:'rgba(255,255,255,0.05)'}}
            onClick={logout}>
            Logout
          </button>
        </div>
      </aside>
      <div className="main">
        <div className="topbar">
          <div className="topbar-title">{title}</div>
          <div style={{fontSize:12,color:'var(--text2)'}}>{isAdmin ? 'Admin' : 'View'}</div>
        </div>
        <div style={{flex:1}}><Outlet /></div>
      </div>
    </div>
  )
}
