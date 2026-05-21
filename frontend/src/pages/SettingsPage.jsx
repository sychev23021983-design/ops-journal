import { useState, useEffect, useRef } from 'react'
import { api, isAdmin } from '../api/client'
import { useNavigate } from 'react-router-dom'

export default function SettingsPage() {
  const navigate = useNavigate()
  const [viewerPassword, setViewerPassword] = useState('')
  const [saving, setSaving]   = useState(false)
  const [msg, setMsg]         = useState('')
  const [logoUrl, setLogoUrl]     = useState(null)
  const [faviconUrl, setFaviconUrl] = useState(null)
  const [uploading, setUploading] = useState('')
  const logoRef    = useRef()
  const faviconRef = useRef()

  useEffect(() => {
    if (!isAdmin()) { navigate('/dashboard'); return }
    api.settings.publicSettings().then(s => {
      if (s.logo_url)    setLogoUrl(s.logo_url)
      if (s.favicon_url) setFaviconUrl(s.favicon_url)
    }).catch(() => {})
  }, [])

  async function savePassword(e) {
    e.preventDefault()
    if (!viewerPassword) return
    setSaving(true)
    setMsg('')
    try {
      await api.settings.update({ viewer_password: viewerPassword })
      setMsg('✅ Пароль клиента обновлён')
      setViewerPassword('')
    } catch (err) {
      setMsg('❌ ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleUpload(type, file) {
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.png')) {
      setMsg('❌ Только PNG файлы')
      return
    }
    setUploading(type)
    setMsg('')
    try {
      const res = type === 'logo'
        ? await api.settings.uploadLogo(file)
        : await api.settings.uploadFavicon(file)
      if (type === 'logo')    setLogoUrl(res.url + '?t=' + Date.now())
      if (type === 'favicon') setFaviconUrl(res.url + '?t=' + Date.now())
      setMsg(`✅ ${type === 'logo' ? 'Логотип' : 'Favicon'} загружен`)
    } catch (err) {
      setMsg('❌ ' + err.message)
    } finally {
      setUploading('')
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Настройки</div>
          <div className="page-subtitle">Управление доступом и брендингом</div>
        </div>
      </div>

      {msg && (
        <div style={{
          padding:'10px 14px', borderRadius:'var(--radius)', fontSize:13,
          marginBottom:16,
          background: msg.startsWith('✅') ? 'var(--success-bg)' : 'var(--danger-bg)',
          border: `1px solid ${msg.startsWith('✅') ? '#86efac' : '#fca5a5'}`,
          color: msg.startsWith('✅') ? 'var(--success)' : 'var(--danger)',
        }}>{msg}</div>
      )}

      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16}}>

        {/* Пароль клиента */}
        <div className="card">
          <div style={{fontWeight:700, fontSize:14, marginBottom:4}}>👁 Клиентский доступ</div>
          <div style={{fontSize:12, color:'var(--text2)', marginBottom:16}}>
            Клиент может просматривать записи, создавать и редактировать, но не удалять.
          </div>
          <form onSubmit={savePassword}>
            <div className="field" style={{marginBottom:12}}>
              <label>Новый пароль клиента</label>
              <input type="password" value={viewerPassword}
                onChange={e => setViewerPassword(e.target.value)}
                placeholder="Введите новый пароль" />
            </div>
            <button className="btn btn-primary" disabled={saving || !viewerPassword}>
              {saving ? 'Сохранение...' : 'Сохранить пароль'}
            </button>
          </form>
        </div>

        {/* Пароль администратора */}
        <div className="card">
          <div style={{fontWeight:700, fontSize:14, marginBottom:4}}>🔐 Пароль администратора</div>
          <div style={{fontSize:12, color:'var(--text2)', marginBottom:16}}>
            Пароль администратора задаётся через переменную окружения
            <code style={{background:'var(--bg3)', padding:'1px 6px', borderRadius:3, marginLeft:4}}>ADMIN_PASSWORD</code>
            в <code style={{background:'var(--bg3)', padding:'1px 6px', borderRadius:3}}>docker-compose.yml</code>.
          </div>
          <div style={{fontSize:12, color:'var(--text2)', padding:'10px 12px', background:'var(--bg)', borderRadius:'var(--radius)', border:'1px solid var(--border)'}}>
            Текущий пароль: задан в конфигурации сервера
          </div>
        </div>

        {/* Логотип */}
        <div className="card">
          <div style={{fontWeight:700, fontSize:14, marginBottom:4}}>🖼 Логотип</div>
          <div style={{fontSize:12, color:'var(--text2)', marginBottom:16}}>
            PNG файл. Отображается в сайдбаре и на странице входа.
          </div>
          {logoUrl && (
            <div style={{marginBottom:12, padding:12, background:'var(--bg)', borderRadius:'var(--radius)', border:'1px solid var(--border)', textAlign:'center'}}>
              <img src={logoUrl} alt="Logo" style={{maxHeight:60, maxWidth:'100%', objectFit:'contain'}} />
            </div>
          )}
          <input ref={logoRef} type="file" accept=".png" style={{display:'none'}}
            onChange={e => handleUpload('logo', e.target.files[0])} />
          <button className="btn btn-ghost" disabled={uploading === 'logo'}
            onClick={() => logoRef.current.click()}>
            {uploading === 'logo' ? 'Загрузка...' : '📁 Выбрать PNG файл'}
          </button>
        </div>

        {/* Favicon */}
        <div className="card">
          <div style={{fontWeight:700, fontSize:14, marginBottom:4}}>⭐ Favicon (ICO/PNG)</div>
          <div style={{fontSize:12, color:'var(--text2)', marginBottom:16}}>
            PNG файл 32×32 или 64×64. Отображается на вкладке браузера.
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
            {uploading === 'favicon' ? 'Загрузка...' : '📁 Выбрать PNG файл'}
          </button>
        </div>

      </div>
    </div>
  )
}
