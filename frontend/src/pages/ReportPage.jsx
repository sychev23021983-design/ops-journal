import { useState, useEffect } from 'react'
import { api } from '../api/client'
import {
  guiltyLabel, typeLabel, guiltyBadge,
  employeeActionLabel, outcomeLabel, guardResponseLabel,
  GUILTY_PARTIES, CONTRACT_CLAUSES
} from '../api/constants'
import dayjs from 'dayjs'
import 'dayjs/locale/ru'
dayjs.locale('ru')

function contractClauseLabel(v) {
  return CONTRACT_CLAUSES.find(c => c.value === v)?.label || v || '—'
}

export default function ReportPage() {
  const [months, setMonths]     = useState([])
  const [month, setMonth]       = useState(dayjs().format('YYYY-MM'))
  const [stats, setStats]       = useState(null)
  const [incidents, setIncidents] = useState([])
  const [loading, setLoading]   = useState(false)

  function loadData(m) {
    setLoading(true)
    Promise.all([
      api.stats({ month: m }),
      api.incidents.list({ month: m }),
    ]).then(([s, i]) => {
      setStats(s)
      setIncidents(i)
    }).catch(console.error)
    .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadData(month)
    api.months().then(setMonths).catch(() => {})
  }, [])

  function handleMonthChange(m) { setMonth(m); loadData(m) }

  const guardCount   = stats?.by_guilty?.find(x => x.guilty_party === 'guard_department')?.cnt || 0
  const guardPercent = stats?.total ? Math.round(guardCount / stats.total * 100) : 0
  const monthLabel   = dayjs(month + '-01').format('MMMM YYYY')
  const noMasterList = incidents.filter(i => i.repair_request_filed && !i.master_arrived_at && i.status !== 'new')

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
        <div className="empty"><div>Загрузка...</div></div>
      ) : !stats ? (
        <div className="empty"><div>Нет данных</div></div>
      ) : (
        <div>
          {/* Статистика */}
          <div className="stat-grid">
            <div className="stat-card">
              <div className="label">Всего событий</div>
              <div className="value">{stats.total}</div>
            </div>
            <div className="stat-card">
              <div className="label">Вина охраны МВД</div>
              <div className="value" style={{color:'var(--danger)'}}>{guardCount}</div>
              <div className="sub">{guardPercent}% от всех</div>
            </div>
            <div className="stat-card">
              <div className="label">Среднее время реакции</div>
              <div className="value">{stats.avg_response_min ?? '—'}</div>
              <div className="sub">минут</div>
            </div>
            <div className="stat-card">
              <div className="label">Мастер не прибыл</div>
              <div className="value" style={{color: noMasterList.length > 0 ? 'var(--danger)' : 'inherit'}}>
                {noMasterList.length}
              </div>
              <div className="sub">нарушений договора</div>
            </div>
          </div>

          {/* Диаграммы */}
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:20}}>
            <div className="card">
              <div style={{fontWeight:600, marginBottom:12}}>По виновной стороне</div>
              {GUILTY_PARTIES.map(g => {
                const row = stats.by_guilty?.find(x => x.guilty_party === g.value)
                const cnt = row?.cnt || 0
                const pct = stats.total ? Math.round(cnt / stats.total * 100) : 0
                return (
                  <div className="bar-row" key={g.value}>
                    <div className="bar-label">
                      <span className={'badge badge-' + guiltyBadge(g.value)}>{g.label}</span>
                    </div>
                    <div className="bar-track"><div className="bar-fill" style={{width: pct + '%'}} /></div>
                    <div className="bar-count">{cnt}</div>
                  </div>
                )
              })}
            </div>
            <div className="card">
              <div style={{fontWeight:600, marginBottom:12}}>По типу событий</div>
              {(stats.by_type || []).map(row => (
                <div className="bar-row" key={row.incident_type}>
                  <div className="bar-label">{typeLabel(row.incident_type)}</div>
                  <div className="bar-track">
                    <div className="bar-fill" style={{width: Math.round(row.cnt / stats.total * 100) + '%'}} />
                  </div>
                  <div className="bar-count">{row.cnt}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Основная таблица */}
          <div className="card" style={{padding:0, marginBottom:20, overflowX:'auto'}}>
            <table style={{width:'100%', tableLayout:'fixed'}}>
              <colgroup>
                <col style={{width:'110px'}} />
                <col style={{width:'140px'}} />
                <col style={{width:'auto'}} />   {/* Описание — растягивается */}
                <col style={{width:'130px'}} />
                <col style={{width:'auto'}} />   {/* Реакция охраны — растягивается */}
                <col style={{width:'60px'}} />
                <col style={{width:'auto'}} />   {/* Итог устранения — растягивается */}
                <col style={{width:'130px'}} />
                <col style={{width:'150px'}} />
              </colgroup>
              <thead>
                <tr>
                  <th>Дата</th>
                  <th>Тип события</th>
                  <th>Описание</th>
                  <th>Сотрудник / действия</th>
                  <th>Реакция охраны МВД</th>
                  <th>Мин.</th>
                  <th>Итог / Устранение</th>
                  <th>Виновная сторона</th>
                  <th>Основание (договор)</th>
                </tr>
              </thead>
              <tbody>
                {incidents.length === 0 ? (
                  <tr><td colSpan={9} style={{textAlign:'center', color:'var(--text2)', padding:24}}>
                    Нет записей за выбранный период
                  </td></tr>
                ) : incidents.map(inc => (
                  <tr key={inc.id}>
                    <td style={{fontFamily:'var(--mono)', fontSize:11, whiteSpace:'nowrap'}}>
                      {dayjs(inc.event_at).format('DD.MM.YY')}<br/>
                      <span style={{color:'var(--text2)'}}>{dayjs(inc.event_at).format('HH:mm')}</span>
                    </td>
                    <td style={{fontSize:12, fontWeight:500}}>{typeLabel(inc.incident_type)}</td>
                    <td style={{fontSize:12}}>{inc.description || '—'}</td>
                    <td style={{fontSize:12}}>
                      {inc.discovered_by && <div>{inc.discovered_by}</div>}
                      {inc.employee_actions && <div style={{color:'var(--text2)', fontSize:11}}>{employeeActionLabel(inc.employee_actions)}</div>}
                      {inc.repair_request_filed
                        ? <span className="flag-ok" style={{marginTop:2, display:'inline-block'}}>Заявка</span>
                        : <span className="flag-warn" style={{marginTop:2, display:'inline-block'}}>Без заявки</span>}
                      {inc.object_left_before_fix
                        ? <div><span className="flag-warn" style={{fontSize:10}}>ушёл до устранения</span></div>
                        : null}
                    </td>
                    <td style={{fontSize:12}}>
                      {inc.guard_response_type && (
                        <div style={{fontWeight:500, marginBottom:2}}>{guardResponseLabel(inc.guard_response_type)}</div>
                      )}
                      {inc.guard_response || '—'}
                      {inc.repair_request_filed && !inc.master_arrived_at && inc.status !== 'new'
                        ? <div><span className="flag-warn" style={{fontSize:10}}>мастер не прибыл ⚠️</span></div>
                        : null}
                      {inc.master_arrived_at && (
                        <div style={{fontSize:10, color:'var(--text2)'}}>
                          прибыл: {dayjs(inc.master_arrived_at).format('HH:mm DD.MM')}
                        </div>
                      )}
                    </td>
                    <td style={{fontFamily:'var(--mono)', textAlign:'center', fontSize:12}}>
                      {inc.response_time_min != null ? inc.response_time_min : '—'}
                    </td>
                    <td style={{fontSize:12}}>
                      {inc.outcome && <div>{outcomeLabel(inc.outcome)}</div>}
                      {inc.resolution && <div style={{color:'var(--text2)', fontSize:11}}>{inc.resolution}</div>}
                      {inc.additional_investigation
                        ? <div><span className="flag-warn" style={{fontSize:10}}>доп. расследование</span></div>
                        : null}
                    </td>
                    <td>
                      <span className={'badge badge-' + guiltyBadge(inc.guilty_party)} style={{fontSize:11}}>
                        {guiltyLabel(inc.guilty_party)}
                      </span>
                    </td>
                    <td style={{fontSize:11, color:'var(--text2)'}}>
                      {contractClauseLabel(inc.contract_clause)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Итоговый текст */}
          <div className="card">
            <div style={{fontWeight:600, marginBottom:8}}>Итоговое заключение</div>
            <p style={{lineHeight:1.8, margin:0}}>
              Период: <strong>{monthLabel}</strong>.
              Всего зафиксировано: <strong>{stats.total}</strong> событий.
              По вине Департамента охраны МВД: <strong style={{color:'var(--danger)'}}>{guardCount} ({guardPercent}%)</strong>.
              {noMasterList.length > 0 && (
                <span> Зафиксировано <strong style={{color:'var(--danger)'}}>{noMasterList.length}</strong> случаев
                  неприбытия дежурного мастера — нарушение обязанности Исполнителя по техническому обслуживанию
                  (договор № 562/05).
                </span>
              )}
              {stats.avg_response_min && (
                <span> Среднее время реакции: <strong>{stats.avg_response_min} мин</strong>.</span>
              )}
              {stats.not_under_guard > 0 && (
                <span> Объект оставался без охраны: <strong style={{color:'var(--danger)'}}>{stats.not_under_guard}</strong> раз.</span>
              )}
            </p>
          </div>
        </div>
      )}

      <style>{`
        @media print {
          .sidebar, .page-header .btn { display:none!important }
          .main { margin-left:0!important }
          .page { padding:4px 8px!important }
          body, .card, td, th { color:black!important; background:white!important }
          .card { border:1px solid #ccc!important }
          table { font-size:10px!important }
        }
      `}</style>
    </div>
  )
}
