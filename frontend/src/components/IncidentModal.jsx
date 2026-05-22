import { useState, useEffect } from 'react'
import { api } from '../api/client'
import {
  INCIDENT_TYPES, INCIDENT_TYPES_INCIDENTS, INCIDENT_TYPES_MAINTENANCE,
  GUILTY_PARTIES, STATUSES, EMPLOYEE_ACTIONS, GUARD_RESPONSE_TYPES, CONTRACT_CLAUSES,
  getRootCauses, getOutcomes, isIncident, isMaintenance,
} from '../api/constants'
import dayjs from 'dayjs'

const EMPTY = {
  event_at: dayjs().format('YYYY-MM-DDTHH:mm'),
  incident_type: 'no_arm',
  description: '',
  discovered_by: '',
  notified_person: '',
  called_electrician_at: '',
  called_duty_at: '',
  employee_actions: '',
  object_left_before_fix: false,
  object_under_guard: true,
  guard_response: '',
  guard_response_type: '',
  master_arrived_at: '',
  response_time_min: '',
  master_actions: '',
  outcome: '',
  additional_investigation: false,
  guilty_party: 'unknown',
  contract_clause: '',
  root_cause: '',
  resolution: '',
  resolved_at: '',
  related_incident_id: '',
  status: 'new',
  notes: '',
}

export default function IncidentModal({ incident, onClose, onSaved, employees = [], incidents = [] }) {
  const [form, setForm] = useState(EMPTY)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (incident) {
      setForm({
        ...EMPTY,
        ...incident,
        event_at:              incident.event_at ? dayjs(incident.event_at).format('YYYY-MM-DDTHH:mm') : '',
        called_electrician_at: incident.called_electrician_at ? dayjs(incident.called_electrician_at).format('YYYY-MM-DDTHH:mm') : '',
        called_duty_at:        incident.called_duty_at ? dayjs(incident.called_duty_at).format('YYYY-MM-DDTHH:mm') : '',
        master_arrived_at:     incident.master_arrived_at ? dayjs(incident.master_arrived_at).format('YYYY-MM-DDTHH:mm') : '',
        resolved_at:           incident.resolved_at ? dayjs(incident.resolved_at).format('YYYY-MM-DDTHH:mm') : '',
        response_time_min:     incident.response_time_min ?? '',
        object_left_before_fix:      !!incident.object_left_before_fix,
        object_under_guard:          incident.object_under_guard === undefined ? true : !!incident.object_under_guard,
        additional_investigation:    !!incident.additional_investigation,
        related_incident_id:  incident.related_incident_id ?? '',
        contract_clause:      incident.contract_clause ?? '',
        guard_response_type:  incident.guard_response_type ?? '',
        master_actions:       incident.master_actions ?? '',
        outcome:              incident.outcome ?? '',
        notified_person:      incident.notified_person ?? '',
      })
    } else {
      setForm(EMPTY)
    }
  }, [incident])

  function set(field, value) { setForm(f => ({ ...f, [field]: value })) }

  const type = form.incident_type
  const rootCauses = getRootCauses(type)
  const outcomes   = getOutcomes(type)
  const maintenance = isMaintenance(type)
  const isAlarm     = type === 'alarm'
  const isNoArm     = type === 'no_arm'
  const isNoDisarm  = type === 'no_disarm'
  const isMaint     = maintenance

  // Auto response time preview
  const callTime = form.called_electrician_at || form.called_duty_at
  let autoResponseMin = null
  if (callTime && form.master_arrived_at) {
    try {
      const t1 = new Date(callTime)
      const t2 = new Date(form.master_arrived_at)
      autoResponseMin = Math.max(0, Math.round((t2 - t1) / 60000))
    } catch {}
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = {
        ...form,
        response_time_min:   form.response_time_min !== '' ? Number(form.response_time_min) : null,
        related_incident_id: form.related_incident_id !== '' ? Number(form.related_incident_id) : null,
        resolved_at:         form.resolved_at || null,
        master_arrived_at:   form.master_arrived_at || null,
        called_electrician_at: form.called_electrician_at || null,
        called_duty_at:      form.called_duty_at || null,
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

  const activeEmployees = employees.filter(e => e.is_active)

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">{incident?.id ? 'Редактировать запись' : 'Новая запись'}</div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="error-msg" style={{marginBottom:16}}>{error}</div>}

            {/* Блок 1: Событие */}
            <div className="modal-section-title">Событие</div>
            <div className="form-grid" style={{marginBottom:16}}>
              <div className="field">
                <label>Дата и время *</label>
                <input type="datetime-local" value={form.event_at}
                  onChange={e => set('event_at', e.target.value)} required />
              </div>
              <div className="field">
                <label>Тип события *</label>
                <select value={form.incident_type} onChange={e => set('incident_type', e.target.value)} required>
                  <optgroup label="— Инциденты">
                    {INCIDENT_TYPES_INCIDENTS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </optgroup>
                  <optgroup label="— ТО / Ремонт">
                    {INCIDENT_TYPES_MAINTENANCE.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </optgroup>
                </select>
              </div>

              {/* Кто обнаружил — для инцидентов */}
              {!isMaint && (
                <div className="field">
                  <label>Кто обнаружил</label>
                  {isAlarm
                    ? <input type="text" value={form.discovered_by}
                        onChange={e => set('discovered_by', e.target.value)}
                        placeholder="МВД / дежурный" />
                    : <select value={form.discovered_by} onChange={e => set('discovered_by', e.target.value)}>
                        <option value="">— выберите сотрудника —</option>
                        {activeEmployees.map(emp => (
                          <option key={emp.id} value={emp.full_name}>{emp.full_name}{emp.position ? ` (${emp.position})` : ''}</option>
                        ))}
                        <option value="МВД">МВД / охрана</option>
                        <option value="Другое">Другое</option>
                      </select>
                  }
                </div>
              )}

              {/* Кому сообщили */}
              {!isMaint && (
                <div className="field">
                  <label>Кому сообщили</label>
                  <select value={form.notified_person} onChange={e => set('notified_person', e.target.value)}>
                    <option value="">— выберите —</option>
                    {activeEmployees.map(emp => (
                      <option key={emp.id} value={emp.full_name}>{emp.full_name}{emp.position ? ` (${emp.position})` : ''}</option>
                    ))}
                    <option value="МВД">МВД / дежурная часть</option>
                    <option value="Другое">Другое</option>
                  </select>
                </div>
              )}

              {/* Для ТО — кто проводит */}
              {isMaint && (
                <div className="field">
                  <label>Кто проводит</label>
                  <select value={form.discovered_by} onChange={e => set('discovered_by', e.target.value)}>
                    <option value="">— выберите —</option>
                    {activeEmployees.map(emp => (
                      <option key={emp.id} value={emp.full_name}>{emp.full_name}{emp.position ? ` (${emp.position})` : ''}</option>
                    ))}
                    <option value="Юра (электромонтер МВД)">Юра (электромонтер МВД)</option>
                  </select>
                </div>
              )}

              {/* Связанный инцидент для внепланового ТО */}
              {type === 'unplanned_to' && (
                <div className="field">
                  <label>Причина (связанный инцидент)</label>
                  <select value={form.related_incident_id} onChange={e => set('related_incident_id', e.target.value)}>
                    <option value="">— выберите инцидент —</option>
                    {incidents.filter(i => isIncident(i.incident_type)).map(i => (
                      <option key={i.id} value={i.id}>
                        #{i.id} {dayjs(i.event_at).format('DD.MM.YY')} — {INCIDENT_TYPES.find(t=>t.value===i.incident_type)?.label || i.incident_type}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {rootCauses.length > 0 && (
                <div className="field">
                  <label>Причина</label>
                  <select value={form.root_cause} onChange={e => set('root_cause', e.target.value)}>
                    <option value="">— выберите —</option>
                    {rootCauses.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
              )}

              <div className="field full">
                <label>Описание</label>
                <textarea value={form.description}
                  onChange={e => set('description', e.target.value)}
                  placeholder="Подробно: что произошло, какие признаки, показания системы"
                  style={{minHeight:60}} />
              </div>
            </div>

            {/* Блок 2: Действия сотрудника (только для инцидентов не-alarm) */}
            {(isNoArm || isNoDisarm || (!isMaint && !isAlarm)) && (
              <>
                <div className="modal-section-title">Действия сотрудника компании</div>
                <div className="form-grid" style={{marginBottom:16}}>
                  <div className="field">
                    <label>Что сделал сотрудник</label>
                    <select value={form.employee_actions} onChange={e => set('employee_actions', e.target.value)}>
                      <option value="">— выберите —</option>
                      {EMPLOYEE_ACTIONS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                    </select>
                  </div>
                  <div className="field" style={{display:'flex', flexDirection:'column', gap:8, justifyContent:'center'}}>

                    <label style={{display:'flex', alignItems:'center', gap:8, cursor:'pointer', textTransform:'none', fontSize:13, fontWeight:400}}>
                      <input type="checkbox" checked={form.object_left_before_fix}
                        onChange={e => set('object_left_before_fix', e.target.checked)}
                        style={{width:16, height:16}} />
                      <span style={{color: form.object_left_before_fix ? 'var(--warn)' : 'inherit'}}>
                        Объект покинут до устранения ⚠️
                      </span>
                    </label>
                    <label style={{display:'flex', alignItems:'center', gap:8, cursor:'pointer', textTransform:'none', fontSize:13, fontWeight:400}}>
                      <input type="checkbox" checked={form.object_under_guard}
                        onChange={e => set('object_under_guard', e.target.checked)}
                        style={{width:16, height:16}} />
                      Объект был поставлен под охрану
                    </label>
                  </div>
                </div>
              </>
            )}

            {/* Блок 3: Время звонков (для инцидентов, кроме alarm) */}
            {(isNoArm || isNoDisarm || type === 'unplanned_to' || type === 'repair') && (
              <>
                <div className="modal-section-title">Фиксация звонков</div>
                <div className="form-grid" style={{marginBottom:16}}>
                  <div className="field">
                    <label>Звонок электромонтеру — дата/время</label>
                    <input type="datetime-local" value={form.called_electrician_at}
                      onChange={e => set('called_electrician_at', e.target.value)} />
                  </div>
                  <div className="field">
                    <label>Звонок в дежурную часть — дата/время</label>
                    <input type="datetime-local" value={form.called_duty_at}
                      onChange={e => set('called_duty_at', e.target.value)} />
                  </div>
                </div>
              </>
            )}

            {/* Блок 4: Реакция охраны */}
            {!isMaint && (
              <>
                <div className="modal-section-title">Реакция Департамента охраны МВД</div>
                <div className="form-grid" style={{marginBottom:16}}>
                  <div className="field">
                    <label>Тип реакции</label>
                    <select value={form.guard_response_type} onChange={e => set('guard_response_type', e.target.value)}>
                      <option value="">— выберите —</option>
                      {GUARD_RESPONSE_TYPES.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                    </select>
                  </div>
                  <div className="field full">
                    <label>Описание реакции охраны</label>
                    <textarea value={form.guard_response}
                      onChange={e => set('guard_response', e.target.value)}
                      placeholder="Кто ответил, что сказали, кого направили"
                      style={{minHeight:50}} />
                  </div>
                  <div className="field">
                    <label>Время прибытия мастера</label>
                    <input type="datetime-local" value={form.master_arrived_at}
                      onChange={e => set('master_arrived_at', e.target.value)} />
                  </div>
                  <div className="field">
                    <label>
                      Время реакции (мин)
                      {autoResponseMin !== null && (
                        <span style={{marginLeft:8, fontSize:11, color:'var(--accent-blue)', fontWeight:500}}>
                          авто: {autoResponseMin} мин
                        </span>
                      )}
                    </label>
                    <input type="number" value={form.response_time_min}
                      onChange={e => set('response_time_min', e.target.value)}
                      placeholder={autoResponseMin !== null ? String(autoResponseMin) : 'Минут'}
                      min="0" />
                  </div>
                </div>
              </>
            )}

            {/* Блок 5: Действия мастера */}
            <div className="modal-section-title">Действия мастера</div>
            <div className="form-grid" style={{marginBottom:16}}>
              <div className="field full">
                <label>Что сделал мастер</label>
                <textarea value={form.master_actions}
                  onChange={e => set('master_actions', e.target.value)}
                  placeholder="Осмотрел датчики, заменил батарею, перепрошил блок..."
                  style={{minHeight:50}} />
              </div>
              {outcomes.length > 0 && (
                <div className="field">
                  <label>Итог</label>
                  <select value={form.outcome} onChange={e => set('outcome', e.target.value)}>
                    <option value="">— выберите —</option>
                    {outcomes.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              )}
            </div>

            {/* Блок 6: Итог расследования */}
            <div className="modal-section-title">Итог</div>
            <div className="form-grid" style={{marginBottom:16}}>
              {!isMaint && (
                <div className="field">
                  <label>Виновная сторона</label>
                  <select value={form.guilty_party} onChange={e => set('guilty_party', e.target.value)}>
                    {GUILTY_PARTIES.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                  </select>
                </div>
              )}
              <div className="field">
                <label>Статус</label>
                <select value={form.status} onChange={e => set('status', e.target.value)}>
                  {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              {!isMaint && (
                <div className="field">
                  <label>Основание (пункт договора)</label>
                  <select value={form.contract_clause} onChange={e => set('contract_clause', e.target.value)}>
                    <option value="">— выберите —</option>
                    {CONTRACT_CLAUSES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
              )}
              <div className="field">
                <label>Время устранения</label>
                <input type="datetime-local" value={form.resolved_at}
                  onChange={e => set('resolved_at', e.target.value)} />
              </div>
              {!isMaint && (
                <>
                  <div className="field">
                    <label>Описание устранения</label>
                    <input type="text" value={form.resolution}
                      onChange={e => set('resolution', e.target.value)}
                      placeholder="Как устранили" />
                  </div>
                  <div className="field" style={{justifyContent:'center'}}>
                    <label style={{display:'flex', alignItems:'center', gap:8, cursor:'pointer', textTransform:'none', fontSize:13, fontWeight:400}}>
                      <input type="checkbox" checked={form.additional_investigation}
                        onChange={e => set('additional_investigation', e.target.checked)}
                        style={{width:16, height:16}} />
                      Требуется дополнительное расследование
                    </label>
                  </div>
                </>
              )}
              <div className="field full">
                <label>Примечания</label>
                <textarea value={form.notes}
                  onChange={e => set('notes', e.target.value)}
                  style={{minHeight:50}}
                  placeholder="Дополнительная информация" />
              </div>
            </div>

          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Отмена</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Сохранение...' : (incident?.id ? 'Сохранить' : 'Создать')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

