import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { guiltyLabel, typeLabel, statusLabel } from '../api/constants'
import dayjs from 'dayjs'

export default function DashboardPage() {
  const [stats, setStats] = useState(null)
  const [recent, setRecent] = useState([])
  const [month, setMonth] = useState(dayjs().format('YYYY-MM'))
  const [months, setMonths] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    api.months().then(setMonths).catch(() => {})
  }, [])

  useEffect(() => {
    api.stats({ month }).then(setStats).catch(() => {})
    api.incidents.list({ month }).then(data => setRecent(data.slice(0, 8))).catch(() => {})
  }, [month])

  const guardCount = stats?.by_guilty?.find(x => x.guilty_party === 'guard_department')?.cnt || 0
  const employeeCount = stats?.by_guilty?.find(x => x.guilty_party === 'company_employee')?.cnt || 0
  const techCount = stats?.by_guilty?.find(x => x.guilty_party === 'technical_fault')?.cnt || 0

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Дашборд</div>
          <div className="page-subtitle">Сводка по инцидентам ОПС</div>
        </div>
        <select value={month} onChange={e => setMonth(e.target.value)} style={{width: 'auto'}}>
          {months.length === 0 && <option value={month}>{month}</option>}
          {months.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="label">Всего инцидентов</div>
          <div className="value">{stats?.total ?? '—'}</div>
          <div className="sub">за {month}</div>
        </div>
        <div className="stat-card">
          <div className="label">Вина охраны МВД</div>
          <div className="value" style={{color: 'var(--danger)'}}>{guardCount}</div>
          <div className="sub">инцидентов</div>
        </div>
        <div className="stat-card">
          <div className="label">Вина сотрудников</div>
          <div className="value" style={{color: 'var(--warn)'}}>{employeeCount}</div>
          <div className="sub">инцидентов</div>
        </div>
        <div className="stat-card">
          <div className="label">Техн. неисправность</div>
          <div className="value" style={{color: 'var(--accent)'}}>{techCount}</div>
          <div className="sub">инцидентов</div>
        </div>
        <div className="stat-card">
          <div className="label">Среднее время реакции</div>
          <div className="value">{stats?.avg_response_min ?? '—'}</div>
          <div className="sub">минут</div>
        </div>
      </div>

      {stats && stats.by_type?.length > 0 && (
        <div className="card" style={{marginBottom: 20}}>
          <div className="report-section">
            <h3>По типам инцидентов</h3>
            {stats.by_type.map(row => (
              <div className="bar-row" key={row.incident_type}>
                <div className="bar-label">{typeLabel(row.incident_type)}</div>
                <div className="bar-track">
                  <div className="bar-fill" style={{width: `${Math.round(row.cnt / stats.total * 100)}%`}} />
                </div>
                <div className="bar-count">{row.cnt}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 14}}>
          <h3 style={{fontSize:13, color:'var(--text2)', textTransform:'uppercase', letterSpacing:'0.06em'}}>
            Последние инциденты
          </h3>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/incidents')}>
            Все →
          </button>
        </div>
        {recent.length === 0 ? (
          <div className="empty">
            <div className="icon">📭</div>
            <div>Инцидентов за этот период нет</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Дата события</th>
                  <th>Тип</th>
                  <th>Виновная сторона</th>
                  <th>Статус</th>
                </tr>
              </thead>
              <tbody>
                {recent.map(inc => (
                  <tr key={inc.id} style={{cursor:'pointer'}} onClick={() => navigate('/incidents')}>
                    <td style={{fontFamily:'var(--mono)', fontSize:12}}>
                      {dayjs(inc.event_at).format('DD.MM.YYYY HH:mm')}
                    </td>
                    <td>{typeLabel(inc.incident_type)}</td>
                    <td>
                      <span className={`badge badge-${inc.guilty_party === 'guard_department' ? 'guard' : inc.guilty_party === 'company_employee' ? 'employee' : inc.guilty_party === 'technical_fault' ? 'tech' : 'unknown'}`}>
                        {guiltyLabel(inc.guilty_party)}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${inc.status}`}>
                        {statusLabel(inc.status)}
                      </span>
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
