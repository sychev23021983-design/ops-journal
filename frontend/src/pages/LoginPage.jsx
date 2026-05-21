import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await api.login(password)
      localStorage.setItem('ops_token', res.token)
      localStorage.setItem('ops_role',  res.role)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-box">
        <div className="login-logo">
          <div className="logo-icon">🛡</div>
          <div>
            <h1>ОПС Журнал</h1>
            <p>Журнал инцидентов охранной сигнализации</p>
          </div>
        </div>
        {error && <div className="error-msg">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="field" style={{marginBottom:14}}>
            <label>Пароль</label>
            <input type="password" value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Введите пароль" autoFocus />
          </div>
          <button className="btn btn-primary"
            style={{width:'100%', justifyContent:'center', padding:'9px 16px'}}
            disabled={loading}>
            {loading ? 'Вход...' : 'Войти в систему'}
          </button>
        </form>
        <div style={{marginTop:20, padding:'12px 14px', background:'var(--bg)', borderRadius:'var(--radius)', fontSize:12, color:'var(--text2)'}}>
          ООО «ИТЦ-М» · Договор № 562/05 · Система учёта инцидентов ОПС
        </div>
      </div>
    </div>
  )
}
