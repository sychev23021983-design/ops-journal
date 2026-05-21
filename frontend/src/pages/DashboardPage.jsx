import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { guiltyLabel, typeLabel, statusLabel, guiltyBadge } from '../api/constants'
import dayjs from 'dayjs'

export default function DashboardPage() {
  const [stats, setStats] = useState(null)
  const [recent, setRecent] = useState([])
  const [month, setMonth] = useState(dayjs().format('YYYY-MM'))
  const [months, setMonths] = useState([])
  const navigate = useNavigate()

  useEffect(() => { api.months().then(setMonths).catch(() => {}) }, [])

  useEffect(() => {
    api.stats({ month }).then(setStats).catch(() => {})
    api.incidents.list({ month }).then(d => setRecent(d.slice(0, 10))).catch(() => {})
  }, [month])

  const guardCount    = stats?.by_guilty?.find(x => x.guilty_party === 'guard_department')?.cnt || 0
  const employeeCount = stats?.by_guilty?.find(x => x.guilty_party === 'company_employee')?.cnt || 0
  const techCount     = stats?.by_guilty?.find(x => x.guilty_party === 'technical_fault')?.cnt || 0

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Дашборд</div>
          <div className="page-subtitle">Сводная статистика инцидентов ОПС · Договор № 562/05</div>
        </div>
        <div style={{display:'flex', alignItems:'center', gap:8}}>
          <span style={{fontSize:12, color:'var(--text2)'}}>Период:</span>
          <select value={month} onChange={e => setMonth(e.target.value)} style={{width:'auto', height:32, fontSize:12}}>
            {months.length === 0 && <option value={month}>{month}</option>}
            {months.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="label">Всего инцидентов</div>
          <div className="value">{stats?.total ?? '—'}</div>
          <div className="sub">за {month}</div>
        </div>
        <div className="stat-card" style={{borderTop: '3px solid var(--danger)'}}>
          <div className="label">Вина охраны МВД</div>
          <div className="value" style={{color:'var(--danger)'}}>{guardCount}</div>
          <div className="sub">{stats?.total ? Math.round(guardCount/stats.total*100) : 0}% от всех</div>
        </div>
        <div className="stat-card" style={{borderTop: '3px solid var(--warn)'}}>
          <div className="label">Вина сотрудников</div>
          <div className="value" style={{color:'var(--warn)'}}>{employeeCount}</div>
          <div className="sub">инцидентов</div>
        </div>
        <div className="stat-card" style={{borderTop: '3px solid var(--accent)'}}>
          <div className="label">Техн. неисправность</div>
          <div className="value" style={{color:'var(--accent)'}}>{techCount}</div>
          <div className="sub">инцидентов</div>
        </div>
        <div className="stat-card">
          <div className="label">Среднее время реакции</div>
          <div className="value">{stats?.avg_response_min ?? '—'}</div>
          <div className="sub">минут</div>
        </div>
        {stats?.violations_no_master > 0 && (
          <div className="stat-card" style={{borderTop: '3px solid var(--danger)', background:'#fff8f8'}}>
            <div className="label" style={{color:'var(--danger)'}}>⚠ Нарушений договора</div>
            <div className="value" style={{color:'var(--danger)'}}>{stats.violations_no_master}</div>
            <div className="sub">мастер не прибыл</div>
          </div>
        )}
      </div>

      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16}}>
        {/* By type */}
        {stats?.by_type?.length > 0 && (
          <div className="card">
            <div style={{fontWeight:600, fontSize:12, textTransform:'uppercase', letterSpacing:'0.05em', color:'var(--text2)', marginBottom:14}}>
              Типы инцидентов
            </div>
            {stats.by_type.map(row => (
              <div className="bar-row" key={row.incident_type}>
                <div className="bar-label" style={{fontSize:12}}>{typeLabel(row.incident_type)}</div>
                <div className="bar-track">
                  <div className="bar-fill" style={{width:`${Math.round(row.cnt/stats.total*100)}%`}} />
                </div>
                <div className="bar-count">{row.cnt}</div>
              </div>
            ))}
          </div>
        )}

        {/* By guilty */}
        {stats?.by_guilty?.length > 0 && (
          <div className="card">
            <div style={{fontWeight:600, fontSize:12, textTransform:'uppercase', letterSpacing:'0.05em', color:'var(--text2)', marginBottom:14}}>
              По виновной стороне
            </div>
            {stats.by_guilty.map(row => (
              <div className="bar-row" key={row.guilty_party}>
                <div className="bar-label">
                  <span className={`badge badge-${guiltyBadge(row.guilty_party)}`} style={{fontSize:11}}>
                    {guiltyLabel(row.guilty_party)}
                  </span>
                </div>
                <div className="bar-track">
                  <div className="bar-fill" style={{
                    width:`${Math.round(row.cnt/stats.total*100)}%`,
                    background: row.guilty_party==='guard_department' ? 'var(--danger)' :
                                row.guilty_party==='company_employee' ? 'var(--warn)' : 'var(--accent)'
                  }} />
                </div>
                <div className="bar-count">{row.cnt}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent incidents */}
      <div className="card" style={{padding:0}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 16px', borderBottom:'1px solid var(--border)'}}>
          <div style={{fontWeight:600, fontSize:13}}>Последние инциденты</div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/incidents')}>Все инциденты →</button>
        </div>
        {recent.length === 0 ? (
          <div className="empty">
            <div className="icon">📭</div>
            <div className="title">Инцидентов нет</div>
            <div style={{fontSize:12, marginTop:4}}>За выбранный период инцидентов не зафиксировано</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Дата события</th>
                  <th>Тип</th>
                  <th>Описание</th>
                  <th>Виновная сторона</th>
                  <th>Статус</th>
                </tr>
              </thead>
              <tbody>
                {recent.map(inc => (
                  <tr key={inc.id} style={{cursor:'pointer'}} onClick={() => navigate('/incidents')}>
                    <td style={{color:'var(--text2)', fontSize:12}}>#{inc.id}</td>
                    <td style={{fontFamily:'var(--mono)', fontSize:12, whiteSpace:'nowrap'}}>
                      {dayjs(inc.event_at).format('DD.MM.YY HH:mm')}
                    </td>
                    <td style={{fontWeight:500}}>{typeLabel(inc.incident_type)}</td>
                    <td style={{color:'var(--text2)', fontSize:12, maxWidth:200}}>
                      {inc.description ? inc.description.slice(0,80) + (inc.description.length > 80 ? '…' : '') : '—'}
                    </td>
                    <td>
                      <span className={`badge badge-${guiltyBadge(inc.guilty_party)}`}>
                        {guiltyLabel(inc.guilty_party)}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${inc.status}`}>{statusLabel(inc.status)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
