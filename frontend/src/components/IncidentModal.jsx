import { useState, useEffect } from 'react'
import { api } from '../api/client'
import { INCIDENT_TYPES, GUILTY_PARTIES, STATUSES, PRIORITIES, EMPLOYEE_ACTIONS } from '../api/constants'
import dayjs from 'dayjs'

const EMPTY = {
  event_at: dayjs().format('YYYY-MM-DDTHH:mm'),
  incident_type: 'no_arm',
  description: '',
  discovered_by: '',
  shift_employee: '',
  employee_actions: '',
  repair_request_filed: false,
  object_left_before_fix: false,
  object_under_guard: true,
  guard_response: '',
  master_arrived_at: '',
  response_time_min: '',
  guilty_party: 'unknown',
  root_cause: '',
  resolution: '',
  resolved_at: '',
  status: 'new',
  priority: 'medium',
  notes: '',
}

export default function IncidentModal({ incident, onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (incident) {
      setForm({
        ...incident,
        event_at:         incident.event_at ? dayjs(incident.event_at).format('YYYY-MM-DDTHH:mm') : '',
        master_arrived_at: incident.master_arrived_at ? dayjs(incident.master_arrived_at).format('YYYY-MM-DDTHH:mm') : '',
        resolved_at:      incident.resolved_at ? dayjs(incident.resolved_at).format('YYYY-MM-DDTHH:mm') : '',
        response_time_min: incident.response_time_min ?? '',
        repair_request_filed:   !!incident.repair_request_filed,
        object_left_before_fix: !!incident.object_left_before_fix,
        object_under_guard:     incident.object_under_guard === undefined ? true : !!incident.object_under_guard,
      })
    } else {
      setForm(EMPTY)
    }
  }, [incident])

  function set(field, value) { setForm(f => ({ ...f, [field]: value })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = {
        ...form,
        response_time_min: form.response_time_min !== '' ? Number(form.response_time_min) : null,
        resolved_at:       form.resolved_at || null,
        master_arrived_at: form.master_arrived_at || null,
      }
      if (incident?.id) {
        await api.incidents.update(incident.id, data)
      } else {
        await api.incidents.create(data)
      }
      onSaved()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">{incident?.id ? 'Редактировать инцидент' : 'Новый инцидент'}</div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="error-msg" style={{marginBottom:16}}>{error}</div>}

            {/* Блок 1: Основное */}
            <div className="modal-section-title">Событие</div>
            <div className="form-grid" style={{marginBottom:16}}>
              <div className="field">
                <label>Дата и время события *</label>
                <input type="datetime-local" value={form.event_at}
                  onChange={e => set('event_at', e.target.value)} required />
              </div>
              <div className="field">
                <label>Тип инцидента *</label>
                <select value={form.incident_type} onChange={e => set('incident_type', e.target.value)} required>
                  {INCIDENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Кто обнаружил</label>
                <input type="text" value={form.discovered_by}
                  onChange={e => set('discovered_by', e.target.value)} placeholder="ФИО или должность" />
              </div>
              <div className="field">
                <label>Сотрудник на смене</label>
                <input type="text" value={form.shift_employee}
                  onChange={e => set('shift_employee', e.target.value)} />
              </div>
              <div className="field full">
                <label>Описание события</label>
                <textarea value={form.description}
                  onChange={e => set('description', e.target.value)}
                  placeholder="Подробно: что произошло, какие признаки, показания системы" style={{minHeight:70}} />
              </div>
            </div>

            {/* Блок 2: Действия сотрудника */}
            <div className="modal-section-title">Действия сотрудника компании</div>
            <div className="form-grid" style={{marginBottom:16}}>
              <div className="field">
                <label>Что сделал сотрудник</label>
                <select value={form.employee_actions} onChange={e => set('employee_actions', e.target.value)}>
                  <option value="">— выберите —</option>
                  {EMPLOYEE_ACTIONS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                </select>
              </div>
              <div className="field" style={{justifyContent:'flex-end', gap:16}}>
                <label style={{display:'flex', alignItems:'center', gap:8, cursor:'pointer', textTransform:'none', fontSize:13}}>
                  <input type="checkbox" checked={form.repair_request_filed}
                    onChange={e => set('repair_request_filed', e.target.checked)}
                    style={{width:16, height:16}} />
                  Заявка на ремонт подана
                </label>
                <label style={{display:'flex', alignItems:'center', gap:8, cursor:'pointer', textTransform:'none', fontSize:13}}>
                  <input type="checkbox" checked={form.object_left_before_fix}
                    onChange={e => set('object_left_before_fix', e.target.checked)}
                    style={{width:16, height:16}} />
                  <span style={{color: form.object_left_before_fix ? 'var(--warn)' : 'inherit'}}>
                    Объект покинут до устранения ⚠️
                  </span>
                </label>
                <label style={{display:'flex', alignItems:'center', gap:8, cursor:'pointer', textTransform:'none', fontSize:13}}>
                  <input type="checkbox" checked={form.object_under_guard}
                    onChange={e => set('object_under_guard', e.target.checked)}
                    style={{width:16, height:16}} />
                  Объект был под охраной
                </label>
              </div>
            </div>

            {/* Блок 3: Реакция охраны */}
            <div className="modal-section-title">Реакция Департамента охраны МВД</div>
            <div className="form-grid" style={{marginBottom:16}}>
              <div className="field full">
                <label>Реакция охраны</label>
                <textarea value={form.guard_response}
                  onChange={e => set('guard_response', e.target.value)}
                  placeholder="Что ответили по телефону, кто приехал, сколько ждали" style={{minHeight:60}} />
              </div>
              <div className="field">
                <label>Время прибытия мастера</label>
                <input type="datetime-local" value={form.master_arrived_at}
                  onChange={e => set('master_arrived_at', e.target.value)} />
              </div>
              <div className="field">
                <label>Время реакции охраны (мин)</label>
                <input type="number" value={form.response_time_min}
                  onChange={e => set('response_time_min', e.target.value)}
                  placeholder="Минут" min="0" />
              </div>
            </div>

            {/* Блок 4: Расследование */}
            <div className="modal-section-title">Расследование и устранение</div>
            <div className="form-grid" style={{marginBottom:16}}>
              <div className="field">
                <label>Виновная сторона *</label>
                <select value={form.guilty_party} onChange={e => set('guilty_party', e.target.value)} required>
                  {GUILTY_PARTIES.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Статус</label>
                <select value={form.status} onChange={e => set('status', e.target.value)}>
                  {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Приоритет</label>
                <select value={form.priority} onChange={e => set('priority', e.target.value)}>
                  {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Время устранения</label>
                <input type="datetime-local" value={form.resolved_at}
                  onChange={e => set('resolved_at', e.target.value)} />
              </div>
              <div className="field full">
                <label>Причина</label>
                <textarea value={form.root_cause}
                  onChange={e => set('root_cause', e.target.value)}
                  placeholder="Установленная причина инцидента" style={{minHeight:60}} />
              </div>
              <div className="field full">
                <label>Что сделано / Устранение</label>
                <textarea value={form.resolution}
                  onChange={e => set('resolution', e.target.value)}
                  placeholder="Принятые меры, кто устранил" style={{minHeight:60}} />
              </div>
              <div className="field full">
                <label>Примечания</label>
                <textarea value={form.notes}
                  onChange={e => set('notes', e.target.value)}
                  placeholder="Дополнительная информация" style={{minHeight:50}} />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Отмена</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
