import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom"
import { getRole, api } from "../api/client"
import { useState, useEffect } from "react"

const PAGE_TITLES = {
  "/dashboard": "Дашборд",
  "/incidents": "Журнал инцидентов",
  "/report":    "Отчёт",
  "/plan":      "План объекта",
  "/settings":  "Настройки",
}

export default function Layout() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const role      = getRole()
  const isAdmin   = role === "admin"
  const title     = PAGE_TITLES[location.pathname] || "ОПС Журнал"
  const [logoUrl, setLogoUrl]       = useState(null)
  const [faviconUrl, setFaviconUrl] = useState(null)
  const [logoSize, setLogoSize]     = useState(32)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    api.settings.publicSettings().then(s => {
      if (s.logo_url)    setLogoUrl(s.logo_url)
      if (s.favicon_url) setFaviconUrl(s.favicon_url)
      if (s.logo_size)   setLogoSize(Number(s.logo_size))
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (faviconUrl) {
      let link = document.querySelector("link[rel~='icon']")
      if (!link) { link = document.createElement("link"); link.rel = "icon"; document.head.appendChild(link) }
      link.href = faviconUrl
    }
  }, [faviconUrl])

  // Close sidebar on navigation (mobile)
  useEffect(() => { setSidebarOpen(false) }, [location.pathname])

  function logout() {
    localStorage.removeItem("ops_token")
    localStorage.removeItem("ops_role")
    navigate("/login")
  }

  return (
    <div className={"layout" + (sidebarOpen ? " sidebar-visible" : "")}>
      {/* Mobile overlay */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      <aside className={"sidebar" + (sidebarOpen ? " open" : "")}>
        <div className="sidebar-logo">
          {logoUrl
            ? <img src={logoUrl} alt="logo" style={{width:logoSize, height:logoSize, objectFit:"contain", borderRadius:4, flexShrink:0}} />
            : <div className="logo-icon">🛡</div>
          }
          <div style={{flex:1, minWidth:0}}>
            <h1>ОПС Журнал</h1>
            <p>ООО «ИТЦ-М»</p>
          </div>
          <button className="sidebar-close" onClick={() => setSidebarOpen(false)}>✕</button>
        </div>
        <nav>
          <div className="sidebar-section-title">Navigation</div>
          <NavLink to="/dashboard" className={({isActive}) => "nav-item" + (isActive ? " active" : "")}>
            📊 Дашборд
          </NavLink>
          <NavLink to="/incidents" className={({isActive}) => "nav-item" + (isActive ? " active" : "")}>
            📋 Журнал
          </NavLink>
          <NavLink to="/report" className={({isActive}) => "nav-item" + (isActive ? " active" : "")}>
            📄 Отчёт
          </NavLink>
          <NavLink to="/plan" className={({isActive}) => "nav-item" + (isActive ? " active" : "")}>
            🗺 План
          </NavLink>
          {isAdmin && (
            <>
              <div className="sidebar-section-title" style={{marginTop:8}}>Admin</div>
              <NavLink to="/settings" className={({isActive}) => "nav-item" + (isActive ? " active" : "")}>
                ⚙️ Настройки
              </NavLink>
            </>
          )}
        </nav>
        <div className="sidebar-footer">
          <div style={{fontSize:11,color:"rgba(160,174,192,0.5)",marginBottom:8,textAlign:"center"}}>
            {isAdmin ? "Администратор" : "Просмотр"}
          </div>
          <button className="btn btn-ghost btn-sm"
            style={{width:"100%",justifyContent:"center",color:"#a0aec0",borderColor:"rgba(255,255,255,0.1)",background:"rgba(255,255,255,0.05)"}}
            onClick={logout}>
            Выйти
          </button>
        </div>
      </aside>

      <div className="main">
        <div className="topbar">
          <button className="topbar-menu-btn" onClick={() => setSidebarOpen(o => !o)} aria-label="Меню">
            <span /><span /><span />
          </button>
          <div className="topbar-title">{title}</div>
          <div style={{fontSize:12,color:"var(--text2)"}}>{isAdmin ? "Администратор" : "Просмотр"}</div>
        </div>
        <div style={{flex:1, position:"relative", minHeight:0}}><Outlet /></div>
      </div>
    </div>
  )
}
