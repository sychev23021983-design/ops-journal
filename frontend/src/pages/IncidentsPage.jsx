import { useState, useEffect } from 'react'
import { api } from '../api/client'
import {
  guiltyLabel, typeLabel, statusLabel, priorityLabel,
  guiltyBadge, INCIDENT_TYPES, GUILTY_PARTIES, STATUSES
} from '../api/constants'
import IncidentModal from '../components/IncidentModal'
import dayjs from 'dayjs'

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // null | 'new' | incident object
  const [filters, setFilters] = useState({ month: '', guilty_party: '', incident_type: '', status: '' })
  const [months, setMonths] = useState([])
  const [deleting, setDeleting] = useState(null)

  useEffect(() => {
    api.months().then(setMonths).catch(() => {})
  }, [])

  useEffect(() => {
    load()
  }, [filters])

  async function load() {
    setLoading(true)
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([,v]) => v))
      const data = await api.incidents.list(params)
      setIncidents(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  function setFilter(k, v) {
    setFilters(f => ({ ...f, [k]: v }))
  }

  async function handleDelete(id) {
    if (!window.confirm('Удалить инцидент? Действие необратимо.')) return
    setDeleting(id)
    try {
      await api.incidents.delete(id)
      setIncidents(prev => prev.filter(i => i.id !== id))
    } finally {
      setDeleting(null)
    }
  }

  function handleSaved() {
    setModal(null)
    load()
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Журнал инцидентов</div>
          <div className="page-subtitle">Все зафиксированные неисправности и события</div>
        </div>
        <button className="btn btn-primary" onClick={() => setModal('new')}>
          + Добавить инцидент
        </button>
      </div>

      <div className="filters">
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
      </div>

      <div className="card">
        {loading ? (
          <div className="empty"><div>Загрузка...</div></div>
        ) : incidents.length === 0 ? (
          <div className="empty">
            <div className="icon">📭</div>
            <div>Инцидентов не найдено</div>
            <div style={{fontSize:12, marginTop:6, color:'var(--text2)'}}>
              Измените фильтры или добавьте первый инцидент
            </div>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Дата события</th>
                  <th>Тип</th>
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
                    <td style={{fontFamily:'var(--mono)', color:'var(--text2)', fontSize:11}}>#{inc.id}</td>
                    <td style={{fontFamily:'var(--mono)', fontSize:12, whiteSpace:'nowrap'}}>
                      {dayjs(inc.event_at).format('DD.MM.YY HH:mm')}
                    </td>
                    <td style={{maxWidth:180}}>
                      <div style={{fontSize:13}}>{typeLabel(inc.incident_type)}</div>
                      {inc.description && (
                        <div style={{fontSize:11, color:'var(--text2)', marginTop:2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:160}}>
                          {inc.description}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className={`badge badge-${guiltyBadge(inc.guilty_party)}`}>
                        {guiltyLabel(inc.guilty_party)}
                      </span>
                    </td>
                    <td style={{fontFamily:'var(--mono)', textAlign:'center'}}>
                      {inc.response_time_min ?? '—'}
                    </td>
                    <td>
                      <span className={`badge badge-${inc.status}`}>
                        {statusLabel(inc.status)}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${inc.priority}`}>
                        {priorityLabel(inc.priority)}
                      </span>
                    </td>
                    <td>
                      <div style={{display:'flex', gap:6}}>
                        <button className="btn btn-ghost btn-sm"
                          onClick={() => setModal(inc)}>✏️</button>
                        <button className="btn btn-danger btn-sm"
                          onClick={() => handleDelete(inc.id)}
                          disabled={deleting === inc.id}>🗑</button>
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
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
