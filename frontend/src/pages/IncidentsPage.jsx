import { useState, useEffect } from 'react'
import { api } from '../api/client'
import {
  guiltyLabel, typeLabel, statusLabel, rootCauseLabel, guiltyBadge,
  outcomeLabel, INCIDENT_TYPES, GUILTY_PARTIES, STATUSES
} from '../api/constants'
import { isAdmin } from '../api/client'
import IncidentModal from '../components/IncidentModal'
import dayjs from 'dayjs'

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState([])
  const [allIncidents, setAllIncidents] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [filters, setFilters] = useState({ month: '', guilty_party: '', incident_type: '', status: '' })
  const [months, setMonths] = useState([])
  const [deleting, setDeleting] = useState(null)
  const [statusUpdating, setStatusUpdating] = useState(null)

  useEffect(() => {
    api.months().then(setMonths).catch(() => {})
    api.employees.list().then(setEmployees).catch(() => {})
    api.incidents.list().then(setAllIncidents).catch(() => {})
  }, [])

  useEffect(() => { load() }, [filters])

  async function load() {
    setLoading(true)
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([,v]) => v))
      const data = await api.incidents.list(params)
      setIncidents(data)
      if (!Object.values(filters).some(Boolean)) setAllIncidents(data)
    } finally { setLoading(false) }
  }

  function setFilter(k, v) { setFilters(f => ({ ...f, [k]: v })) }

  async function handleDelete(id) {
    if (!window.confirm('Удалить запись?')) return
    setDeleting(id)
    try {
      await api.incidents.delete(id)
      setIncidents(prev => prev.filter(i => i.id !== id))
      setAllIncidents(prev => prev.filter(i => i.id !== id))
    } finally { setDeleting(null) }
  }

  async function handleStatusChange(id, status) {
    setStatusUpdating(id)
    try {
      await api.incidents.patchStatus(id, status)
      setIncidents(prev => prev.map(i => i.id === id ? {...i, status} : i))
    } catch (e) {
      alert('Ошибка: ' + e.message)
    } finally { setStatusUpdating(null) }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Журнал событий ОПС</div>
          <div className="page-subtitle">Инциденты, ТО и ремонты охранной сигнализации</div>
        </div>
        <button className="btn btn-primary" onClick={() => setModal('new')}>
          + Добавить запись
        </button>
      </div>

      <div className="filters-bar">
        <span className="filter-label">Фильтр:</span>
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
        <span style={{marginLeft:'auto', fontSize:12, color:'var(--text2)'}}>Найдено: {incidents.length}</span>
      </div>

      <div className="card" style={{padding:0}}>
        {loading ? (
          <div className="empty"><div>Загрузка...</div></div>
        ) : incidents.length === 0 ? (
          <div className="empty">
            <div className="icon">📭</div>
            <div className="title">Записей не найдено</div>
            <div style={{fontSize:12, marginTop:4}}>Измените фильтры или добавьте первую запись</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Дата</th>
                  <th>Тип события</th>
                  <th>Кто обнаружил</th>
                  <th>Причина / Итог</th>
                  <th>Реакция (мин)</th>
                  <th>Виновная сторона</th>
                  <th>Статус</th>
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
                    <td style={{fontSize:12}}>
                      {inc.discovered_by || '—'}
                      {inc.notified_person && <div style={{color:'var(--text2)', fontSize:11}}>→ {inc.notified_person}</div>}
                    </td>
                    <td style={{fontSize:12}}>
                      {rootCauseLabel(inc.root_cause)}
                      {inc.outcome && <div style={{color:'var(--text2)', fontSize:11}}>{outcomeLabel(inc.outcome)}</div>}
                      {/* Заявка: авто по наличию времени звонка */}
                      {(inc.called_electrician_at || inc.called_duty_at)
                        ? <div><span className="flag-ok">Заявка</span></div>
                        : <div><span className="flag-warn">Без заявки</span></div>}
                      {inc.object_left_before_fix ? <div><span className="flag-warn">ушёл до устранения ⚠️</span></div> : null}
                      {!inc.object_under_guard ? <div><span className="flag-warn">не под охраной</span></div> : null}
                      {inc.additional_investigation ? <div><span className="flag-warn">доп. расследование</span></div> : null}
                    </td>
                    <td style={{fontFamily:'var(--mono)', textAlign:'center', fontSize:12}}>
                      {inc.response_time_min != null ? `${inc.response_time_min} мин` : '—'}
                    </td>
                    <td>
                      <span className={`badge badge-${guiltyBadge(inc.guilty_party)}`} style={{fontSize:11}}>
                        {guiltyLabel(inc.guilty_party)}
                      </span>
                    </td>
                    <td>
                      {/* Inline status change */}
                      <select
                        value={inc.status}
                        disabled={statusUpdating === inc.id}
                        onChange={e => handleStatusChange(inc.id, e.target.value)}
                        className={`status-select status-select-${inc.status}`}
                        style={{fontSize:11, padding:'2px 4px', borderRadius:'var(--radius)', border:'1px solid var(--border)', background:'var(--bg)', cursor:'pointer'}}>
                        {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    </td>
                    <td>
                      <div style={{display:'flex', gap:4}}>
                        <button className="btn btn-ghost btn-sm" onClick={() => setModal(inc)}>✏️</button>
                        {isAdmin() && (
                          <button className="btn btn-danger btn-sm"
                            onClick={() => handleDelete(inc.id)}
                            disabled={deleting === inc.id}>🗑</button>
                        )}
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
          employees={employees}
          incidents={allIncidents}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); api.incidents.list().then(setAllIncidents).catch(()=>{}) }}
        />
      )}
    </div>
  )
}

