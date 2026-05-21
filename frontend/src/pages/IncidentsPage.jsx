import { useState, useEffect } from 'react'
import { api } from '../api/client'
import {
  guiltyLabel, typeLabel, statusLabel, priorityLabel,
  guiltyBadge, employeeActionLabel,
  INCIDENT_TYPES, GUILTY_PARTIES, STATUSES
} from '../api/constants'
import IncidentModal from '../components/IncidentModal'
import dayjs from 'dayjs'

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [filters, setFilters] = useState({ month: '', guilty_party: '', incident_type: '', status: '' })
  const [months, setMonths] = useState([])
  const [deleting, setDeleting] = useState(null)

  useEffect(() => { api.months().then(setMonths).catch(() => {}) }, [])
  useEffect(() => { load() }, [filters])

  async function load() {
    setLoading(true)
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([,v]) => v))
      setIncidents(await api.incidents.list(params))
    } finally { setLoading(false) }
  }

  function setFilter(k, v) { setFilters(f => ({ ...f, [k]: v })) }

  async function handleDelete(id) {
    if (!window.confirm('Удалить инцидент?')) return
    setDeleting(id)
    try {
      await api.incidents.delete(id)
      setIncidents(prev => prev.filter(i => i.id !== id))
    } finally { setDeleting(null) }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Журнал инцидентов</div>
          <div className="page-subtitle">Все зафиксированные неисправности и события ОПС</div>
        </div>
        <button className="btn btn-primary" onClick={() => setModal('new')}>
          + Добавить инцидент
        </button>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <span className="filter-label">Фильтр по:</span>
        <select value={filters.month} onChange={e => setFilter('month', e.target.value)}>
          <option value="">Все месяцы</option>
          {months.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <select value={filters.guilty_party} onChange={e => setFilter('guilty_party', e.target.value)}>
          <option value="">Все виновники</option>
          {GUILTY_PARTIES.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
        </select>
        <select value={filters.incident_type} onChange={e => setFilter('incident_type', e.target.value)}>
          <option value="">Все типы</option>
          {INCIDENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <select value={filters.status} onChange={e => setFilter('status', e.target.value)}>
          <option value="">Все статусы</option>
          {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        {Object.values(filters).some(Boolean) && (
          <button className="btn btn-ghost btn-sm"
            onClick={() => setFilters({ month:'', guilty_party:'', incident_type:'', status:'' })}>
            × Сбросить
          </button>
        )}
        <span style={{marginLeft:'auto', fontSize:12, color:'var(--text2)'}}>
          Найдено: {incidents.length}
        </span>
      </div>

      {/* Table */}
      <div className="card" style={{padding:0}}>
        {loading ? (
          <div className="empty"><div>Загрузка...</div></div>
        ) : incidents.length === 0 ? (
          <div className="empty">
            <div className="icon">📭</div>
            <div className="title">Инцидентов не найдено</div>
            <div style={{fontSize:12, marginTop:4}}>Измените фильтры или добавьте первый инцидент</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Дата события</th>
                  <th>Тип инцидента</th>
                  <th>Описание</th>
                  <th>Действия сотрудника</th>
                  <th>Виновная сторона</th>
                  <th>Реакция (мин)</th>
                  <th>Статус</th>
                  <th>Приоритет</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {incidents.map(inc => (
                  <tr key={inc.id}>
                    <td style={{color:'var(--text2)', fontSize:12}}>#{inc.id}</td>
                    <td style={{fontFamily:'var(--mono)', fontSize:12, whiteSpace:'nowrap'}}>
                      {dayjs(inc.event_at).format('DD.MM.YY')}<br/>
                      <span style={{color:'var(--text2)'}}>{dayjs(inc.event_at).format('HH:mm')}</span>
                    </td>
                    <td style={{fontWeight:500}}>{typeLabel(inc.incident_type)}</td>
                    <td style={{maxWidth:200, color:'var(--text2)', fontSize:12}}>
                      {inc.description
                        ? inc.description.length > 80
                          ? inc.description.slice(0,80) + '…'
                          : inc.description
                        : '—'}
                    </td>
                    <td style={{fontSize:12}}>
                      {employeeActionLabel(inc.employee_actions)}
                      {inc.repair_request_filed
                        ? <div><span className="flag-ok">заявка подана</span></div>
                        : <div><span className="flag-warn">заявка не подана</span></div>}
                      {inc.object_left_before_fix && <div><span className="flag-warn">ушёл до устранения</span></div>}
                    </td>
                    <td>
                      <span className={`badge badge-${guiltyBadge(inc.guilty_party)}`}>
                        {guiltyLabel(inc.guilty_party)}
                      </span>
                      {!inc.object_under_guard && <div><span className="flag-warn">не под охраной</span></div>}
                    </td>
                    <td style={{fontFamily:'var(--mono)', textAlign:'center'}}>
                      {inc.response_time_min ?? '—'}
                    </td>
                    <td><span className={`badge badge-${inc.status}`}>{statusLabel(inc.status)}</span></td>
                    <td><span className={`badge badge-${inc.priority}`}>{priorityLabel(inc.priority)}</span></td>
                    <td>
                      <div style={{display:'flex', gap:4}}>
                        <button className="btn btn-ghost btn-sm" onClick={() => setModal(inc)} title="Редактировать">✏️</button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(inc.id)}
                          disabled={deleting === inc.id} title="Удалить">🗑</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <IncidentModal
          incident={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load() }}
        />
      )}
    </div>
  )
}
