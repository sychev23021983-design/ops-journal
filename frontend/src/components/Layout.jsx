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
  const [logoUrl, setLogoUrl]       = useState(null)
  const [faviconUrl, setFaviconUrl] = useState(null)
  const [logoSize, setLogoSize]     = useState(32)

  useEffect(() => {
    api.settings.publicSettings().then(s => {
      if (s.logo_url)    setLogoUrl(s.logo_url)
      if (s.favicon_url) setFaviconUrl(s.favicon_url)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (faviconUrl) {
      let link = document.querySelector("link[rel~='icon']")
      if (!link) {
        link = document.createElement('link')
        link.rel = 'icon'
        document.head.appendChild(link)
      }
      link.href = faviconUrl
    }
  }, [faviconUrl])

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
            ? <img src={logoUrl} alt="logo" style={{width:logoSize,height:logoSize,objectFit:'contain',borderRadius:4,flexShrink:0}} />
            : <div className="logo-icon">🛡</div>
          }
          <div style={{flex:1, minWidth:0}}>
            <h1>OPS Journal</h1>
            <p>OOO ITC-M</p>
          </div>
          {logoUrl && isAdmin && (
            <input type="range" min="20" max="56" value={logoSize}
              onChange={e => setLogoSize(Number(e.target.value))}
              style={{width:40, accentColor:'var(--accent)', flexShrink:0}}
              title="Logo size" />
          )}
        </div>
        <nav>
          <div className="sidebar-section-title">Navigation</div>
          <NavLink to="/dashboard" className={({isActive}) => 'nav-item' + (isActive ? ' active' : '')}>
            <span className="icon">📊</span><span>Dashboard</span>
          </NavLink>
          <NavLink to="/incidents" className={({isActive}) => 'nav-item' + (isActive ? ' active' : '')}>
            <span className="icon">📋</span><span>Incident log</span>
          </NavLink>
          <NavLink to="/report" className={({isActive}) => 'nav-item' + (isActive ? ' active' : '')}>
            <span className="icon">📄</span><span>Report</span>
          </NavLink>
          {isAdmin && (
            <>
              <div className="sidebar-section-title" style={{marginTop:8}}>Admin</div>
              <NavLink to="/settings" className={({isActive}) => 'nav-item' + (isActive ? ' active' : '')}>
                <span className="icon">⚙️</span><span>Settings</span>
              </NavLink>
            </>
          )}
        </nav>
        <div className="sidebar-footer">
          <div style={{fontSize:11,color:'rgba(160,174,192,0.5)',marginBottom:8,textAlign:'center'}}>
            {isAdmin ? '👤 Admin' : '👁 View only'}
          </div>
          <button className="btn btn-ghost btn-sm"
            style={{width:'100%',justifyContent:'center',color:'#a0aec0',borderColor:'rgba(255,255,255,0.1)',background:'rgba(255,255,255,0.05)'}}
            onClick={logout}>
            ↩ Logout
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
