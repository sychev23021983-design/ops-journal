import { useState, useEffect, useRef } from 'react'
import { api, isAdmin } from '../api/client'
import { useNavigate } from 'react-router-dom'

export default function SettingsPage() {
  const navigate = useNavigate()
  const [viewerPassword, setViewerPassword] = useState('')
  const [saving, setSaving]     = useState(false)
  const [msg, setMsg]           = useState('')
  const [logoUrl, setLogoUrl]   = useState(null)
  const [faviconUrl, setFaviconUrl] = useState(null)
  const [logoSize, setLogoSize] = useState(32)
  const [uploading, setUploading] = useState('')
  const logoRef    = useRef()
  const faviconRef = useRef()

  useEffect(() => {
    if (!isAdmin()) { navigate('/dashboard'); return }
    api.settings.publicSettings().then(s => {
      if (s.logo_url)    setLogoUrl(s.logo_url)
      if (s.favicon_url) setFaviconUrl(s.favicon_url)
      if (s.logo_size)   setLogoSize(Number(s.logo_size))
    }).catch(() => {})
  }, [])

  async function savePassword(e) {
    e.preventDefault()
    if (!viewerPassword) return
    setSaving(true); setMsg('')
    try {
      await api.settings.update({ viewer_password: viewerPassword })
      setMsg('ok_Viewer password updated')
      setViewerPassword('')
    } catch (err) { setMsg('err_' + err.message) }
    finally { setSaving(false) }
  }

  async function saveLogoSize() {
    try {
      await api.settings.update({ logo_size: String(logoSize) })
      setMsg('ok_Logo size saved')
    } catch (err) { setMsg('err_' + err.message) }
  }

  async function handleUpload(type, file) {
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.png')) { setMsg('err_PNG only'); return }
    setUploading(type); setMsg('')
    try {
      const res = type === 'logo'
        ? await api.settings.uploadLogo(file)
        : await api.settings.uploadFavicon(file)
      if (type === 'logo')    setLogoUrl(res.url + '?t=' + Date.now())
      if (type === 'favicon') setFaviconUrl(res.url + '?t=' + Date.now())
      setMsg('ok_' + (type === 'logo' ? 'Logo' : 'Favicon') + ' uploaded')
    } catch (err) { setMsg('err_' + err.message) }
    finally { setUploading('') }
  }

  const msgOk  = msg.startsWith('ok_')
  const msgText = msg.slice(4)

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Settings</div>
          <div className="page-subtitle">Access control and branding</div>
        </div>
      </div>

      {msg && (
        <div style={{
          padding:'10px 14px', borderRadius:'var(--radius)', fontSize:13, marginBottom:16,
          background: msgOk ? 'var(--success-bg)' : 'var(--danger-bg)',
          border: '1px solid ' + (msgOk ? '#86efac' : '#fca5a5'),
          color: msgOk ? 'var(--success)' : 'var(--danger)',
        }}>{msgOk ? 'ok ' : 'error '}{msgText}</div>
      )}

      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16}}>

        <div className="card">
          <div style={{fontWeight:700, fontSize:14, marginBottom:4}}>Client access</div>
          <div style={{fontSize:12, color:'var(--text2)', marginBottom:16}}>
            Client can view, create and edit but not delete.
          </div>
          <form onSubmit={savePassword}>
            <div className="field" style={{marginBottom:12}}>
              <label>New client password</label>
              <input type="password" value={viewerPassword}
                onChange={e => setViewerPassword(e.target.value)}
                placeholder="Enter new password" />
            </div>
            <button className="btn btn-primary" disabled={saving || !viewerPassword}>
              {saving ? 'Saving...' : 'Save password'}
            </button>
          </form>
        </div>

        <div className="card">
          <div style={{fontWeight:700, fontSize:14, marginBottom:4}}>Admin password</div>
          <div style={{fontSize:12, color:'var(--text2)', marginBottom:16}}>
            Set via <code style={{background:'var(--bg3)', padding:'1px 6px', borderRadius:3}}>ADMIN_PASSWORD</code> in docker-compose.yml
          </div>
          <div style={{fontSize:12, color:'var(--text2)', padding:'10px 12px', background:'var(--bg)', borderRadius:'var(--radius)', border:'1px solid var(--border)'}}>
            Current password: set in server config
          </div>
        </div>

        <div className="card">
          <div style={{fontWeight:700, fontSize:14, marginBottom:4}}>Logo</div>
          <div style={{fontSize:12, color:'var(--text2)', marginBottom:12}}>
            PNG file. Shown in sidebar and login page.
          </div>
          {logoUrl && (
            <div style={{marginBottom:12, padding:12, background:'var(--bg)', borderRadius:'var(--radius)', border:'1px solid var(--border)', textAlign:'center'}}>
              <img src={logoUrl} alt="Logo" style={{maxHeight:logoSize, maxWidth:'100%', objectFit:'contain'}} />
            </div>
          )}
          <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:12}}>
            <label style={{fontSize:12, fontWeight:600, color:'var(--text2)', textTransform:'none', marginBottom:0, whiteSpace:'nowrap'}}>
              Size (px):
            </label>
            <input type="number" value={logoSize} min="16" max="80"
              onChange={e => setLogoSize(Number(e.target.value))}
              style={{width:80}} />
            <button className="btn btn-ghost btn-sm" onClick={saveLogoSize}>Save</button>
          </div>
          <input ref={logoRef} type="file" accept=".png" style={{display:'none'}}
            onChange={e => handleUpload('logo', e.target.files[0])} />
          <button className="btn btn-ghost" disabled={uploading === 'logo'}
            onClick={() => logoRef.current.click()}>
            {uploading === 'logo' ? 'Uploading...' : 'Choose PNG file'}
          </button>
        </div>

        <div className="card">
          <div style={{fontWeight:700, fontSize:14, marginBottom:4}}>Favicon (PNG)</div>
          <div style={{fontSize:12, color:'var(--text2)', marginBottom:12}}>
            PNG 32x32 or 64x64. Shown in browser tab.
          </div>
          {faviconUrl && (
            <div style={{marginBottom:12, padding:12, background:'var(--bg)', borderRadius:'var(--radius)', border:'1px solid var(--border)', textAlign:'center'}}>
              <img src={faviconUrl} alt="Favicon" style={{width:32, height:32, objectFit:'contain'}} />
            </div>
          )}
          <input ref={faviconRef} type="file" accept=".png" style={{display:'none'}}
            onChange={e => handleUpload('favicon', e.target.files[0])} />
          <button className="btn btn-ghost" disabled={uploading === 'favicon'}
            onClick={() => faviconRef.current.click()}>
            {uploading === 'favicon' ? 'Uploading...' : 'Choose PNG file'}
          </button>
        </div>

      </div>
    </div>
  )
}
