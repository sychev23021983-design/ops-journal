import { useState, useEffect, useRef } from 'react'
import { api, isAdmin } from '../api/client'
import { useNavigate } from 'react-router-dom'

export default function SettingsPage() {
  const navigate = useNavigate()
  const [viewerPassword, setViewerPassword] = useState('')
  const [saving, setSaving]       = useState(false)
  const [msg, setMsg]             = useState('')
  const [logoUrl, setLogoUrl]     = useState(null)
  const [faviconUrl, setFaviconUrl] = useState(null)
  const [logoSize, setLogoSize]   = useState(32)
  const [uploading, setUploading] = useState('')

  // Employees
  const [employees, setEmployees]   = useState([])
  const [empLoading, setEmpLoading] = useState(false)
  const [empForm, setEmpForm]       = useState({ full_name:'', position:'', phone:'' })
  const [editingEmp, setEditingEmp] = useState(null)
  const [showInactive, setShowInactive] = useState(false)

  // Backup
  const [importing, setImporting]   = useState(false)
  const [backupMsg, setBackupMsg]   = useState('')
  const importRef  = useRef()
  const logoRef    = useRef()
  const faviconRef = useRef()

  useEffect(() => {
    if (!isAdmin()) { navigate('/dashboard'); return }
    api.settings.publicSettings().then(s => {
      if (s.logo_url)    setLogoUrl(s.logo_url)
      if (s.favicon_url) setFaviconUrl(s.favicon_url)
      if (s.logo_size)   setLogoSize(Number(s.logo_size))
    }).catch(() => {})
    loadEmployees()
  }, [])

  async function loadEmployees() {
    setEmpLoading(true)
    try {
      const data = await api.employees.list(true)
      setEmployees(data)
    } catch {}
    finally { setEmpLoading(false) }
  }

  async function savePassword(e) {
    e.preventDefault()
    if (!viewerPassword) return
    setSaving(true); setMsg('')
    try {
      await api.settings.update({ viewer_password: viewerPassword })
      setMsg('ok_Пароль просмотра обновлён')
      setViewerPassword('')
    } catch (err) { setMsg('err_' + err.message) }
    finally { setSaving(false) }
  }

  async function saveLogoSize() {
    try {
      await api.settings.update({ logo_size: String(logoSize) })
      setMsg('ok_Размер логотипа сохранён')
    } catch (err) { setMsg('err_' + err.message) }
  }

  async function handleUpload(type, file) {
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.png')) { setMsg('err_Только PNG файлы'); return }
    setUploading(type); setMsg('')
    try {
      const res = type === 'logo'
        ? await api.settings.uploadLogo(file)
        : await api.settings.uploadFavicon(file)
      if (type === 'logo')    setLogoUrl(res.url + '?t=' + Date.now())
      if (type === 'favicon') setFaviconUrl(res.url + '?t=' + Date.now())
      setMsg('ok_' + (type === 'logo' ? 'Логотип' : 'Favicon') + ' загружен')
    } catch (err) { setMsg('err_' + err.message) }
    finally { setUploading('') }
  }

  // ── Employees ──────────────────────────────────────────────────────────────

  function startEdit(emp) {
    setEditingEmp(emp.id)
    setEmpForm({ full_name: emp.full_name, position: emp.position||'', phone: emp.phone||'' })
  }

  async function saveEmployee(e) {
    e.preventDefault()
    if (!empForm.full_name.trim()) return
    setEmpLoading(true)
    try {
      if (editingEmp) {
        await api.employees.update(editingEmp, { ...empForm, is_active: true })
      } else {
        await api.employees.create(empForm)
      }
      setEmpForm({ full_name:'', position:'', phone:'' })
      setEditingEmp(null)
      await loadEmployees()
    } catch (err) { setMsg('err_' + err.message) }
    finally { setEmpLoading(false) }
  }

  async function deactivateEmployee(id) {
    if (!window.confirm('Пометить сотрудника как уволенного? Его ФИО останется в существующих записях.')) return
    await api.employees.delete(id)
    await loadEmployees()
  }

  async function reactivateEmployee(id, emp) {
    await api.employees.update(id, { full_name: emp.full_name, position: emp.position, phone: emp.phone, is_active: true })
    await loadEmployees()
  }

  // ── Backup ────────────────────────────────────────────────────────────────

  function handleExport() {
    const token = localStorage.getItem('ops_token')
    const url   = api.backup.exportUrl()
    // Use fetch to trigger download with auth header
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        if (!res.ok) throw new Error('Ошибка экспорта')
        return res.blob()
      })
      .then(blob => {
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = `ops_backup_${new Date().toISOString().slice(0,10)}.zip`
        a.click()
        setBackupMsg('ok_Резервная копия скачана')
      })
      .catch(err => setBackupMsg('err_' + err.message))
  }

  async function handleImport(file) {
    if (!file) return
    if (!window.confirm('Восстановить данные из резервной копии? Текущие данные будут ЗАМЕНЕНЫ!')) return
    setImporting(true); setBackupMsg('')
    try {
      const result = await api.backup.import(file)
      setBackupMsg(`ok_Восстановлено: ${result.incidents} инцидентов, ${result.employees} сотрудников`)
      await loadEmployees()
    } catch (err) {
      setBackupMsg('err_' + err.message)
    } finally {
      setImporting(false)
      importRef.current.value = ''
    }
  }

  const msgOk  = msg.startsWith('ok_')
  const msgTxt = msg.slice(4)
  const bkOk   = backupMsg.startsWith('ok_')
  const bkTxt  = backupMsg.slice(4)

  const activeEmployees   = employees.filter(e => e.is_active)
  const inactiveEmployees = employees.filter(e => !e.is_active)

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Настройки</div>
          <div className="page-subtitle">Управление доступом, сотрудниками и данными</div>
        </div>
      </div>

      {msg && (
        <div style={{
          padding:'10px 14px', borderRadius:'var(--radius)', fontSize:13, marginBottom:16,
          background: msgOk ? 'var(--success-bg)' : 'var(--danger-bg)',
          border: '1px solid ' + (msgOk ? '#86efac' : '#fca5a5'),
          color: msgOk ? 'var(--success)' : 'var(--danger)',
        }}>{msgOk ? '✓ ' : '✗ '}{msgTxt}</div>
      )}

      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16}}>

        {/* Access */}
        <div className="card">
          <div style={{fontWeight:700, fontSize:14, marginBottom:4}}>Доступ для просмотра</div>
          <div style={{fontSize:12, color:'var(--text2)', marginBottom:16}}>
            Пользователь «просмотр» может видеть и создавать записи, но не удалять.
          </div>
          <form onSubmit={savePassword}>
            <div className="field" style={{marginBottom:12}}>
              <label>Новый пароль просмотра</label>
              <input type="password" value={viewerPassword}
                onChange={e => setViewerPassword(e.target.value)}
                placeholder="Введите новый пароль" />
            </div>
            <button className="btn btn-primary" disabled={saving || !viewerPassword}>
              {saving ? 'Сохранение...' : 'Сохранить пароль'}
            </button>
          </form>
        </div>

        {/* Branding */}
        <div className="card">
          <div style={{fontWeight:700, fontSize:14, marginBottom:16}}>Логотип и Favicon</div>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12}}>
            <div>
              <div style={{fontSize:12, color:'var(--text2)', marginBottom:6}}>Логотип (PNG)</div>
              {logoUrl && <img src={logoUrl} alt="logo" style={{width:60, height:60, objectFit:'contain', display:'block', marginBottom:6, border:'1px solid var(--border)', borderRadius:4}} />}
              <input ref={logoRef} type="file" accept=".png" style={{display:'none'}} onChange={e => handleUpload('logo', e.target.files[0])} />
              <button className="btn btn-ghost btn-sm" disabled={uploading==='logo'} onClick={() => logoRef.current.click()}>
                {uploading==='logo' ? '...' : 'Загрузить PNG'}
              </button>
            </div>
            <div>
              <div style={{fontSize:12, color:'var(--text2)', marginBottom:6}}>Favicon (PNG)</div>
              {faviconUrl && <img src={faviconUrl} alt="fav" style={{width:32, height:32, objectFit:'contain', display:'block', marginBottom:6, border:'1px solid var(--border)', borderRadius:4}} />}
              <input ref={faviconRef} type="file" accept=".png" style={{display:'none'}} onChange={e => handleUpload('favicon', e.target.files[0])} />
              <button className="btn btn-ghost btn-sm" disabled={uploading==='favicon'} onClick={() => faviconRef.current.click()}>
                {uploading==='favicon' ? '...' : 'Загрузить PNG'}
              </button>
            </div>
          </div>
          <div style={{display:'flex', alignItems:'center', gap:8}}>
            <label style={{fontSize:12}}>Размер логотипа:</label>
            <input type="number" value={logoSize} onChange={e => setLogoSize(Number(e.target.value))}
              style={{width:70}} min="16" max="120" />
            <button className="btn btn-ghost btn-sm" onClick={saveLogoSize}>Сохранить</button>
          </div>
        </div>
      </div>

      {/* Employees */}
      <div className="card" style={{marginBottom:16}}>
        <div style={{fontWeight:700, fontSize:14, marginBottom:4}}>Сотрудники</div>
        <div style={{fontSize:12, color:'var(--text2)', marginBottom:16}}>
          Сотрудники доступны в выпадающих списках форм. При увольнении — помечаются как уволенные, из существующих записей не удаляются.
        </div>

        {/* Add/Edit form */}
        <form onSubmit={saveEmployee} style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr auto', gap:8, marginBottom:16, alignItems:'end'}}>
          <div className="field" style={{margin:0}}>
            <label>ФИО *</label>
            <input type="text" value={empForm.full_name}
              onChange={e => setEmpForm(f=>({...f, full_name:e.target.value}))}
              placeholder="Иванов Иван Иванович" required />
          </div>
          <div className="field" style={{margin:0}}>
            <label>Должность</label>
            <input type="text" value={empForm.position}
              onChange={e => setEmpForm(f=>({...f, position:e.target.value}))}
              placeholder="Менеджер" />
          </div>
          <div className="field" style={{margin:0}}>
            <label>Телефон</label>
            <input type="text" value={empForm.phone}
              onChange={e => setEmpForm(f=>({...f, phone:e.target.value}))}
              placeholder="+375 XX XXX-XX-XX" />
          </div>
          <div style={{display:'flex', gap:6, paddingBottom:1}}>
            <button type="submit" className="btn btn-primary btn-sm" disabled={empLoading || !empForm.full_name.trim()}>
              {editingEmp ? 'Сохранить' : '+ Добавить'}
            </button>
            {editingEmp && (
              <button type="button" className="btn btn-ghost btn-sm"
                onClick={() => { setEditingEmp(null); setEmpForm({ full_name:'', position:'', phone:'' }) }}>
                Отмена
              </button>
            )}
          </div>
        </form>

        {/* Active employees */}
        {activeEmployees.length > 0 && (
          <table style={{width:'100%', fontSize:13}}>
            <thead>
              <tr style={{borderBottom:'1px solid var(--border)'}}>
                <th style={{textAlign:'left', padding:'4px 8px', fontWeight:600}}>ФИО</th>
                <th style={{textAlign:'left', padding:'4px 8px', fontWeight:600}}>Должность</th>
                <th style={{textAlign:'left', padding:'4px 8px', fontWeight:600}}>Телефон</th>
                <th style={{textAlign:'left', padding:'4px 8px', fontWeight:600}}>Статус</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {activeEmployees.map(emp => (
                <tr key={emp.id} style={{borderBottom:'1px solid var(--border)'}}>
                  <td style={{padding:'6px 8px'}}>{emp.full_name}</td>
                  <td style={{padding:'6px 8px', color:'var(--text2)'}}>{emp.position || '—'}</td>
                  <td style={{padding:'6px 8px', color:'var(--text2)', fontFamily:'var(--mono)', fontSize:12}}>{emp.phone || '—'}</td>
                  <td style={{padding:'6px 8px'}}><span className="badge badge-resolved" style={{fontSize:11}}>Активен</span></td>
                  <td style={{padding:'6px 8px'}}>
                    <div style={{display:'flex', gap:6}}>
                      <button className="btn btn-ghost btn-sm" onClick={() => startEdit(emp)}>✏️</button>
                      <button className="btn btn-danger btn-sm" onClick={() => deactivateEmployee(emp.id)} title="Уволить">Уволить</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Inactive employees toggle */}
        {inactiveEmployees.length > 0 && (
          <div style={{marginTop:12}}>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowInactive(v=>!v)}>
              {showInactive ? '▲ Скрыть' : `▼ Показать уволенных (${inactiveEmployees.length})`}
            </button>
            {showInactive && (
              <table style={{width:'100%', fontSize:13, marginTop:8, opacity:0.6}}>
                <tbody>
                  {inactiveEmployees.map(emp => (
                    <tr key={emp.id} style={{borderBottom:'1px solid var(--border)'}}>
                      <td style={{padding:'6px 8px'}}>{emp.full_name}</td>
                      <td style={{padding:'6px 8px', color:'var(--text2)'}}>{emp.position || '—'}</td>
                      <td style={{padding:'6px 8px'}}><span className="badge badge-new" style={{fontSize:11}}>Уволен</span></td>
                      <td style={{padding:'6px 8px'}}>
                        <button className="btn btn-ghost btn-sm" onClick={() => reactivateEmployee(emp.id, emp)}>Восстановить</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {employees.length === 0 && !empLoading && (
          <div style={{fontSize:13, color:'var(--text2)', textAlign:'center', padding:'16px 0'}}>
            Сотрудников пока нет. Добавьте первого сотрудника выше.
          </div>
        )}
      </div>

      {/* Backup */}
      <div className="card">
        <div style={{fontWeight:700, fontSize:14, marginBottom:4}}>Резервное копирование</div>
        <div style={{fontSize:12, color:'var(--text2)', marginBottom:16}}>
          Экспорт создаёт ZIP-архив с JSON-дампом всех данных (инциденты, сотрудники, настройки).
          Импорт <strong>заменяет</strong> все текущие данные.
        </div>

        {backupMsg && (
          <div style={{
            padding:'10px 14px', borderRadius:'var(--radius)', fontSize:13, marginBottom:12,
            background: bkOk ? 'var(--success-bg)' : 'var(--danger-bg)',
            border: '1px solid ' + (bkOk ? '#86efac' : '#fca5a5'),
            color: bkOk ? 'var(--success)' : 'var(--danger)',
          }}>{bkOk ? '✓ ' : '✗ '}{bkTxt}</div>
        )}

        <div style={{display:'flex', gap:12, flexWrap:'wrap'}}>
          <button className="btn btn-primary" onClick={handleExport}>
            ⬇ Экспорт резервной копии (.zip)
          </button>
          <div>
            <input ref={importRef} type="file" accept=".zip,.json" style={{display:'none'}}
              onChange={e => handleImport(e.target.files[0])} />
            <button className="btn btn-ghost" disabled={importing} onClick={() => importRef.current.click()}>
              {importing ? 'Восстановление...' : '⬆ Импорт резервной копии'}
            </button>
          </div>
        </div>
        <div style={{fontSize:11, color:'var(--text2)', marginTop:8}}>
          ⚠ Импорт полностью заменяет данные. Сделайте экспорт перед импортом.
        </div>
      </div>
    </div>
  )
}
