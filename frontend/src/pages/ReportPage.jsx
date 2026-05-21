import { useState, useEffect } from 'react'
import { api } from '../api/client'
import { guiltyLabel, typeLabel, statusLabel, guiltyBadge, GUILTY_PARTIES } from '../api/constants'
import dayjs from 'dayjs'
import 'dayjs/locale/ru'
dayjs.locale('ru')

export default function ReportPage() {
  const [months, setMonths] = useState([])
  const [month, setMonth] = useState(dayjs().format('YYYY-MM'))
  const [stats, setStats] = useState(null)
  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api.months().then(m => {
      setMonths(m)
      if (m.length > 0) setMonth(m[0])
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!month) return
    setLoading(true)
    Promise.all([
      api.stats({ month }),
      api.incidents.list({ month })
    ]).then(([s, i]) => {
      setStats(s)
      setIncidents(i)
    }).finally(() => setLoading(false))
  }, [month])

  const guardCount = stats?.by_guilty?.find(x => x.guilty_party === 'guard_department')?.cnt || 0
  const guardPercent = stats?.total ? Math.round(guardCount / stats.total * 100) : 0

  function handlePrint() {
    window.print()
  }

  const monthLabel = dayjs(month + '-01').format('MMMM YYYY')

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Отчёт</div>
          <div className="page-subtitle">Ежемесячный отчёт по инцидентам ОПС</div>
        </div>
        <div style={{display:'flex', gap:10}}>
          <select value={month} onChange={e => setMonth(e.target.value)} style={{width:'auto'}}>
            {months.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <button className="btn btn-primary" onClick={handlePrint}>🖨 Печать / PDF</button>
        </div>
      </div>

      {loading ? (
        <div className="empty"><div>Загрузка...</div></div>
      ) : !stats ? (
        <div className="empty">
          <div className="icon">📄</div>
          <div>Выберите период</div>
        </div>
      ) : (
        <div id="report-content">
          {/* Header */}
          <div className="card" style={{marginBottom:20, borderColor: 'var(--accent)', borderWidth:2}}>
            <div style={{textAlign:'center', padding:'8px 0'}}>
              <div style={{fontFamily:'var(--mono)', fontSize:11, color:'var(--text2)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:8}}>
                Отчёт о работе охранной пожарной сигнализации
              </div>
              <div style={{fontSize:20, fontWeight:700, marginBottom:4}}>
                {monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}
              </div>
              <div style={{fontSize:12, color:'var(--text2)'}}>
                Дата формирования: {dayjs().format('DD.MM.YYYY')}
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="report-section">
            <h3>1. Сводная информация</h3>
            <div className="stat-grid">
              <div className="stat-card">
                <div className="label">Всего инцидентов</div>
                <div className="value">{stats.total}</div>
              </div>
              <div className="stat-card">
                <div className="label">Вина охраны МВД</div>
                <div className="value" style={{color:'var(--danger)'}}>{guardCount}</div>
                <div className="sub">{guardPercent}% от общего числа</div>
              </div>
              <div className="stat-card">
                <div className="label">Среднее время реакции</div>
                <div className="value">{stats.avg_response_min ?? '—'}</div>
                <div className="sub">минут</div>
              </div>
            </div>
          </div>

          {/* By guilty */}
          <div className="report-section">
            <h3>2. Распределение по виновной стороне</h3>
            <div className="card">
              {GUILTY_PARTIES.map(g => {
                const row = stats.by_guilty?.find(x => x.guilty_party === g.value)
                const cnt = row?.cnt || 0
                const pct = stats.total ? Math.round(cnt / stats.total * 100) : 0
                return (
                  <div className="bar-row" key={g.value}>
                    <div className="bar-label">
                      <span className={`badge badge-${guiltyBadge(g.value)}`} style={{marginRight:8}}>{g.label}</span>
                    </div>
                    <div className="bar-track">
                      <div className="bar-fill" style={{
                        width: `${pct}%`,
                        background: g.value === 'guard_department' ? 'var(--danger)' :
                                    g.value === 'company_employee' ? 'var(--warn)' : 'var(--accent)'
                      }} />
                    </div>
                    <div className="bar-count">{cnt}</div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* By type */}
          {stats.by_type?.length > 0 && (
            <div className="report-section">
              <h3>3. Типы инцидентов</h3>
              <div className="card">
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

          {/* Detail table */}
          <div className="report-section">
            <h3>4. Детальный журнал инцидентов</h3>
            {incidents.length === 0 ? (
              <div className="empty"><div>Инцидентов за период нет</div></div>
            ) : (
              <div className="card" style={{padding:0}}>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Дата и время</th>
                        <th>Тип</th>
                        <th>Описание</th>
                        <th>Виновная сторона</th>
                        <th>Реакция охраны</th>
                        <th>Время реакции</th>
                        <th>Устранение</th>
                        <th>Статус</th>
                      </tr>
                    </thead>
                    <tbody>
                      {incidents.map((inc, idx) => (
                        <tr key={inc.id}>
                          <td style={{fontFamily:'var(--mono)', fontSize:11, color:'var(--text2)'}}>{idx+1}</td>
                          <td style={{fontFamily:'var(--mono)', fontSize:11, whiteSpace:'nowrap'}}>
                            {dayjs(inc.event_at).format('DD.MM.YY HH:mm')}
                          </td>
                          <td style={{fontSize:12}}>{typeLabel(inc.incident_type)}</td>
                          <td style={{fontSize:12, maxWidth:180}}>{inc.description || '—'}</td>
                          <td>
                            <span className={`badge badge-${guiltyBadge(inc.guilty_party)}`}>
                              {guiltyLabel(inc.guilty_party)}
                            </span>
                          </td>
                          <td style={{fontSize:12, maxWidth:160}}>{inc.guard_response || '—'}</td>
                          <td style={{fontFamily:'var(--mono)', textAlign:'center', fontSize:12}}>
                            {inc.response_time_min != null ? `${inc.response_time_min} мин` : '—'}
                          </td>
                          <td style={{fontSize:12, maxWidth:160}}>{inc.resolution || '—'}</td>
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
              </div>
            )}
          </div>

          {/* Conclusion */}
          {guardCount > 0 && (
            <div className="report-section">
              <h3>5. Вывод</h3>
              <div className="card">
                <p style={{lineHeight:1.8, fontSize:14}}>
                  За период <strong>{monthLabel}</strong> зафиксировано <strong>{stats.total}</strong> инцидентов
                  в системе охранной пожарной сигнализации.
                  Из них <strong style={{color:'var(--danger)'}}>{guardCount} ({guardPercent}%)</strong> инцидентов
                  квалифицированы как ответственность Департамента охраны МВД РБ:
                  {incidents.filter(i => i.guilty_party === 'guard_department').map((i, idx) => (
                    <span key={i.id}>
                      {idx === 0 ? ' ' : ', '}
                      {typeLabel(i.incident_type).toLowerCase()} ({dayjs(i.event_at).format('DD.MM')})
                    </span>
                  ))}.
                  {stats.avg_response_min && (
                    <span> Среднее время реакции охраны составило <strong>{stats.avg_response_min} минут</strong>.</span>
                  )}
                </p>
                <p style={{marginTop:16, fontSize:13, color:'var(--text2)'}}>
                  Настоящий отчёт составлен на основании данных журнала инцидентов ОПС
                  и может служить основанием для предъявления претензий.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      <style>{`
        @media print {
          .sidebar, .page-header button, .filters { display: none !important; }
          .card { border: 1px solid #ccc !important; background: white !important; color: black !important; }
          body { background: white !important; color: black !important; }
          .badge { border: 1px solid #999 !important; color: black !important; background: #eee !important; }
          .bar-fill { background: #333 !important; }
          th, td { color: black !important; }
        }
      `}</style>
    </div>
  )
}
