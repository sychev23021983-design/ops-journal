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
      api.incidents.list({ month: m })
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

  const guardCount    = stats?.by_guilty?.find(x => x.guilty_party === 'guard_department')?.cnt || 0
  const guardPercent  = stats?.total ? Math.round(guardCount / stats.total * 100) : 0
  const monthLabel    = dayjs(month + '-01').format('MMMM YYYY')

  // Инциденты по вине охраны
  const guardIncidents = incidents.filter(i => i.guilty_party === 'guard_department')
  // Нарушения: заявка подана, мастер не приехал
  const noMasterIncidents = incidents.filter(i => i.repair_request_filed && !i.master_arrived_at && i.status !== 'new')
  // Случаи когда объект покинут до устранения
  const leftIncidents = incidents.filter(i => i.object_left_before_fix)
  // Случаи когда объект был не под охраной
  const notGuardedIncidents = incidents.filter(i => !i.object_under_guard)

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Отчёт</div>
          <div className="page-subtitle">Ежемесячный отчёт по инцидентам ОПС</div>
        </div>
        <div style={{display:'flex', gap:10}}>
          <select value={month} onChange={e => handleMonthChange(e.target.value)} style={{width:'auto'}}>
            {months.length === 0 && <option value={month}>{month}</option>}
            {months.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <button className="btn btn-primary" onClick={() => window.print()}>🖨 Печать / PDF</button>
        </div>
      </div>

      {loading ? (
        <div className="empty"><div>Загрузка...</div></div>
      ) : !stats ? (
        <div className="empty"><div className="icon">📄</div><div>Нет данных</div></div>
      ) : (
        <div id="report-content">

          {/* Шапка */}
          <div className="card" style={{marginBottom:20, borderColor:'var(--accent)', borderWidth:2}}>
            <div style={{textAlign:'center', padding:'8px 0'}}>
              <div style={{fontFamily:'var(--mono)', fontSize:11, color:'var(--text2)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:8}}>
                Отчёт о работе охранной пожарной сигнализации
              </div>
              <div style={{fontSize:20, fontWeight:700, marginBottom:4}}>
                {monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}
              </div>
              <div style={{fontSize:12, color:'var(--text2)'}}>Дата формирования: {dayjs().format('DD.MM.YYYY')}</div>
            </div>
          </div>

          {/* 1. Сводка */}
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
                <div className="label">Нарушений договора</div>
                <div className="value" style={{color:'var(--warn)'}}>{noMasterIncidents.length}</div>
                <div className="sub">мастер не прибыл после заявки</div>
              </div>
              <div className="stat-card">
                <div className="label">Без охраны</div>
                <div className="value" style={{color:'var(--warn)'}}>{notGuardedIncidents.length}</div>
                <div className="sub">объект не был под охраной</div>
              </div>
              <div className="stat-card">
                <div className="label">Среднее время реакции</div>
                <div className="value">{stats.avg_response_min ?? '—'}</div>
                <div className="sub">минут</div>
              </div>
            </div>
          </div>

          {/* 2 и 3 в одну строку */}
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:24}}>
          <div className="report-section" style={{marginBottom:0}}>
            <h3>2. Распределение по виновной стороне</h3>
            <div className="card">
              {GUILTY_PARTIES.map(g => {
                const row = stats.by_guilty?.find(x => x.guilty_party === g.value)
                const cnt = row?.cnt || 0
                const pct = stats.total ? Math.round(cnt / stats.total * 100) : 0
                return (
                  <div className="bar-row" key={g.value}>
                    <div className="bar-label">
                      <span className={`badge badge-${guiltyBadge(g.value)}`}>{g.label}</span>
                    </div>
                    <div className="bar-track">
                      <div className="bar-fill" style={{
                        width:pct+"%",
                        background: g.value==='guard_department' ? 'var(--danger)' :
                                    g.value==='company_employee' ? 'var(--warn)' : 'var(--accent)'
                      }} />
                    </div>
                    <div className="bar-count">{cnt}</div>
                  </div>
                )
              })}
            </div>
          </div>

          </div>
          {/* 3. По типам */}
          {stats.by_type?.length > 0 && (
            <div className="report-section" style={{marginBottom:0}}>
              <h3>3. Типы инцидентов</h3>
              <div className="card">
                {stats.by_type.map(row => (
                  <div className="bar-row" key={row.incident_type}>
                    <div className="bar-label">{typeLabel(row.incident_type)}</div>
                    <div className="bar-track">
                      <div className="bar-fill" style={{width:Math.round(row.cnt/stats.total*100)+"%"}} />
                    </div>
                    <div className="bar-count">{row.cnt}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          </div>
          </div>
          {/* 4. Нарушения по договору */}
          {(noMasterIncidents.length > 0 || notGuardedIncidents.length > 0) && (
            <div className="report-section">
              <h3>4. Нарушения условий договора Исполнителем</h3>
              {noMasterIncidents.length > 0 && (
                <div className="violation-card">
                  <div className="v-title">⚠ Мастер не прибыл после подачи заявки на ремонт ({noMasterIncidents.length} сл.)</div>
                  <div className="v-body">
                    По договору Исполнитель обязан осуществлять техническое обслуживание и устранять неисправности по заявкам Заказчика.
                    Следующие инциденты: заявка была подана, однако прибытие мастера не зафиксировано:
                    <ul style={{marginTop:8, paddingLeft:20}}>
                      {noMasterIncidents.map(i => (
                        <li key={i.id} style={{marginBottom:4}}>
                          <strong>{dayjs(i.event_at).format('DD.MM.YYYY HH:mm')}</strong> — {typeLabel(i.incident_type)}
                          {i.description ? `: ${i.description}` : ''}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
              {notGuardedIncidents.length > 0 && (
                <div className="violation-card">
                  <div className="v-title">⚠ Объект не находился под охраной ({notGuardedIncidents.length} сл.)</div>
                  <div className="v-body">
                    Зафиксированы периоды, когда объект не был поставлен под централизованную охрану по причинам, зависящим от Исполнителя:
                    <ul style={{marginTop:8, paddingLeft:20}}>
                      {notGuardedIncidents.map(i => (
                        <li key={i.id} style={{marginBottom:4}}>
                          <strong>{dayjs(i.event_at).format('DD.MM.YYYY HH:mm')}</strong> — {typeLabel(i.incident_type)}
                          {i.description ? `: ${i.description}` : ''}
                          {i.resolution ? <span style={{color:'var(--text2)'}}> / Устранение: {i.resolution}</span> : ''}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 5. Детальный журнал */}
          <div className="report-section">
            <h3>{noMasterIncidents.length > 0 || notGuardedIncidents.length > 0 ? '5' : '4'}. Детальный журнал инцидентов</h3>
            {incidents.length === 0 ? (
              <div className="empty"><div>Инцидентов за период нет</div></div>
            ) : (
              <div className="card" style={{padding:0, overflowX:'auto'}}>
                <table className="report-table" style={{minWidth:900}}>
                  <thead>
                    <tr>
                      <th className="col-date">Дата</th>
                      <th className="col-type">Тип</th>
                      <th className="col-desc">Описание</th>
                      <th className="col-emp">Действия сотрудника</th>
                      <th className="col-guard">Реакция охраны</th>
                      <th className="col-time">Время реакции</th>
                      <th className="col-fix">Устранение</th>
                      <th className="col-status">Виновник / Статус</th>
                    </tr>
                  </thead>
                  <tbody>
                    {incidents.map((inc, idx) => (
                      <tr key={inc.id}>
                        <td className="col-date" style={{fontFamily:'var(--mono)', fontSize:11}}>
                          {dayjs(inc.event_at).format('DD.MM.YY')}<br/>
                          <span style={{color:'var(--text2)'}}>{dayjs(inc.event_at).format('HH:mm')}</span>
                        </td>
                        <td className="col-type" style={{fontSize:12}}>{typeLabel(inc.incident_type)}</td>
                        <td className="col-desc" style={{fontSize:12}}>
                          {inc.description || '—'}
                          {!inc.object_under_guard && <div><span className="flag-warn">не под охраной</span></div>}
                        </td>
                        <td className="col-emp" style={{fontSize:12}}>
                          {employeeActionLabel(inc.employee_actions)}
                          {inc.repair_request_filed
                            ? <div><span className="flag-ok">заявка подана</span></div>
                            : <div><span className="flag-warn">заявка не подана</span></div>
                          }
                          {inc.object_left_before_fix && <div><span className="flag-warn">ушёл до устранения</span></div>}
                        </td>
                        <td className="col-guard" style={{fontSize:12}}>
                          {inc.guard_response || '—'}
                          {inc.master_arrived_at && (
                            <div style={{fontSize:11, color:'var(--text2)', marginTop:3}}>
                              Мастер: {dayjs(inc.master_arrived_at).format('DD.MM HH:mm')}
                            </div>
                          )}
                          {inc.repair_request_filed && !inc.master_arrived_at && (
                            <div><span className="flag-warn">мастер не прибыл</span></div>
                          )}
                        </td>
                        <td className="col-time" style={{fontFamily:'var(--mono)', fontSize:12}}>
                          {inc.response_time_min != null ? inc.response_time_min + ' мин' : '—'}
                        </td>
                        <td className="col-fix" style={{fontSize:12}}>
                          {inc.root_cause && <div style={{marginBottom:4, color:'var(--text2)', fontSize:11}}>Причина: {inc.root_cause}</div>}
                          {inc.resolution || '—'}
                          {inc.resolved_at && (
                            <div style={{fontSize:11, color:'var(--text2)', marginTop:3}}>
                              {dayjs(inc.resolved_at).format('DD.MM HH:mm')}
                            </div>
                          )}
                        </td>
                        <td className="col-status">
                          <span className={`badge badge-${guiltyBadge(inc.guilty_party)}`} style={{display:'block', marginBottom:4}}>
                            {guiltyLabel(inc.guilty_party)}
                          </span>
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

          {/* Вывод */}
          <div className="report-section">
            <h3>{noMasterIncidents.length > 0 || notGuardedIncidents.length > 0 ? '6' : '5'}. Вывод</h3>
            <div className="card">
              <p style={{lineHeight:1.9, fontSize:14}}>
                За период <strong>{monthLabel}</strong> в системе ОПС зафиксировано <strong>{stats.total}</strong> инцидентов.
                {guardCount > 0 && (
                  <> Из них <strong style={{color:'var(--danger)'}}>{guardCount} ({guardPercent}%)</strong> квалифицированы
                  как ответственность Департамента охраны МВД РБ
                  ({guardIncidents.map(i => typeLabel(i.incident_type).toLowerCase()).join(', ')}).</>
                )}
                {noMasterIncidents.length > 0 && (
                  <> В <strong>{noMasterIncidents.length}</strong> случаях Исполнитель не обеспечил прибытие мастера
                  после подачи заявки на ремонт, что является нарушением условий договора.</>
                )}
                {notGuardedIncidents.length > 0 && (
                  <> Объект <strong>{notGuardedIncidents.length}</strong> раз находился без централизованной охраны
                  по причинам технической неисправности оборудования Исполнителя.</>
                )}
                {stats.avg_response_min && (
                  <> Среднее время реакции охраны составило <strong>{stats.avg_response_min} минут</strong>.</>
                )}
              </p>
              <p style={{marginTop:14, fontSize:13, color:'var(--text2)'}}>
                Настоящий отчёт составлен на основании данных журнала инцидентов ОПС
                и может служить основанием для предъявления претензий Исполнителю
                в соответствии с условиями договора на охрану.
              </p>
            </div>
          </div>

        </div>
      )}

      <style>{`
        @media print {
          .sidebar, .page-header .btn { display: none !important; }
          .main { margin-left: 0 !important; padding: 0 !important; }
          .page { padding: 6px 10px !important; }
          body, .card, td, th { color: black !important; background: white !important; }
          .card { border: 1px solid #ccc !important; }
          .badge { border: 1px solid #999 !important; color: black !important; background: #eee !important; }
          .bar-fill { background: #333 !important; }
          .violation-card { border: 1px solid #f00 !important; background: #fff5f5 !important; }
          .flag-warn { border: 1px solid #f59e0b !important; color: #92400e !important; background: #fef3c7 !important; }
          .flag-ok { color: #065f46 !important; background: #d1fae5 !important; }
        }
      `}</style>
    </div>
  )
}
