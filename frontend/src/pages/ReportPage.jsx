import { useState, useEffect } from 'react'
import { api } from '../api/client'
import { guiltyLabel, typeLabel, statusLabel, guiltyBadge, employeeActionLabel, GUILTY_PARTIES } from '../api/constants'
import dayjs from 'dayjs'
import 'dayjs/locale/ru'
dayjs.locale('ru')

export default function ReportPage() {
  const [months, setMonths] = useState([])
  const [month, setMonth] = useState(dayjs().format('YYYY-MM'))
  const [stats, setStats] = useState(null)
  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(false)

  function loadData(m) {
    setLoading(true)
    Promise.all([
      api.stats({ month: m }),
      api.инцидентов.list({ month: m })
    ]).then(([s, i]) => {
      setStats(s)
      setIncidents(i)
    }).catch(console.error)
    .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadData(month)
    api.months().then(m => setMonths(m)).catch(() => {})
  }, [])

  function handleMonthChange(m) {
    setMonth(m)
    loadData(m)
  }

  const guardCount = stats?.by_guilty?.find(x => x.guilty_party === 'guard_department')?.cnt || 0
  const guardPercent = stats?.total ? Math.round(guardCount / stats.total * 100) : 0
  const monthLabel = dayjs(month + '-01').format('MMMM YYYY')
  const noMasterIncidents = инцидентов.filter(i => i.repair_заявкаuest_filed && !i.master_arrived_at && i.status !== 'new')

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Отчёт о работе ОПС</div>
          <div className="page-subtitle">Ежемесячный отчёт по инцидентам охранной сигнализации</div>
        </div>
        <div style={{display:'flex', gap:10}}>
          <select value={month} onChange={e => handleMonthChange(e.target.value)} style={{width:'auto'}}>
            {months.length === 0 && <option value={month}>{month}</option>}
            {months.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <button className="btn btn-primary" onClick={() => window.print()}>Печать / PDF</button>
        </div>
      </div>

      {loading ? (
        <div className="empty"><div>Loading...</div></div>
      ) : !stats ? (
        <div className="empty"><div>No data</div></div>
      ) : (
        <div>
          <div className="stat-grid">
            <div className="stat-card">
              <div className="label">Total</div>
              <div className="value">{stats.total}</div>
            </div>
            <div className="stat-card">
              <div className="label">Guard fault</div>
              <div className="value" style={{color:'var(--danger)'}}>{guardCount}</div>
              <div className="sub">{guardPercent}%</div>
            </div>
            <div className="stat-card">
              <div className="label">Avg response</div>
              <div className="value">{stats.avg_response_мин ?? '-'}</div>
              <div className="sub">мин</div>
            </div>
          </div>

          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:20}}>
            <div className="card">
              <div style={{fontWeight:600, marginBottom:12}}>По виновной стороне</div>
              {GUILTY_PARTIES.map(g => {
                const row = stats.by_guilty?.find(x => x.guilty_party === g.value)
                const cnt = row?.cnt || 0
                const pct = stats.total ? Math.round(cnt / stats.total * 100) : 0
                return (
                  <div className="bar-row" key={g.value}>
                    <div className="bar-label"><span className={'badge badge-' + g.value.replace('_','-')}>{g.label}</span></div>
                    <div className="bar-track"><div className="bar-fill" style={{width: pct + '%'}} /></div>
                    <div className="bar-count">{cnt}</div>
                  </div>
                )
              })}
            </div>
            <div className="card">
              <div style={{fontWeight:600, marginBottom:12}}>По типу инцидентов</div>
              {(stats.by_type || []).map(row => (
                <div className="bar-row" key={row.incident_type}>
                  <div className="bar-label">{typeLabel(row.incident_type)}</div>
                  <div className="bar-track"><div className="bar-fill" style={{width: Math.round(row.cnt / stats.total * 100) + '%'}} /></div>
                  <div className="bar-count">{row.cnt}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{padding:0, marginBottom:20}}>
            <table>
              <thead>
                <tr>
                  <th>Date</th><th>Type</th><th>Description</th>
                  <th>Employee</th><th>Guard</th><th>Min</th><th>Resolution</th><th>Guilty</th>
                </tr>
              </thead>
              <tbody>
                {инцидентов.map(inc => (
                  <tr key={inc.id}>
                    <td style={{fontFamily:'var(--mono)',fontSize:11,whiteSpace:'nowrap'}}>{dayjs(inc.event_at).format('DD.MM.YY HH:mm')}</td>
                    <td style={{fontSize:12}}>{typeLabel(inc.incident_type)}</td>
                    <td style={{fontSize:12,maxWidth:160}}>{inc.description || '-'}</td>
                    <td style={{fontSize:12}}>{employeeActionLabel(inc.employee_actions)}{inc.repair_заявкаuest_filed ? <span className="flag-ok"> заявка</span> : <span className="flag-warn"> no заявка</span>}</td>
                    <td style={{fontSize:12,maxWidth:140}}>{inc.guard_response || '-'}{inc.repair_заявкаuest_filed && !inc.master_arrived_at ? <span className="flag-warn"> мастер не приехал</span> : ''}</td>
                    <td style={{fontFamily:'var(--mono)',textAlign:'center'}}>{inc.response_time_мин ?? '-'}</td>
                    <td style={{fontSize:12,maxWidth:140}}>{inc.resolution || '-'}</td>
                    <td><span className={'badge badge-' + guiltyBadge(inc.guilty_party)}>{guiltyLabel(inc.guilty_party)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card">
            <p style={{lineHeight:1.8}}>
              Период: <strong>{monthLabel}</strong>. Всего: <strong>{stats.total}</strong> инцидентов.
              Вина охраны: <strong style={{color:'var(--danger)'}}>{guardCount} ({guardPercent}%)</strong>.
              {noMasterIncidents.length > 0 && <span> Мастер не прибыл: <strong>{noMasterIncidents.length}</strong> раз (нарушение договора).</span>}
              {stats.avg_response_мин && <span> Среднее время реакции: <strong>{stats.avg_response_мин} мин</strong>.</span>}
            </p>
          </div>
        </div>
      )}
      <style>{'@media print{.sidebar,.page-header .btn{display:none!important}.main{margin-left:0!important}.page{padding:4px 8px!important}body,.card,td,th{color:black!important;background:white!important}.card{border:1px solid #ccc!important}}'}</style>
    </div>
  )
}
