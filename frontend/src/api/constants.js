export const INCIDENT_TYPES = [
  { value: 'false_alarm',   label: 'Ложное срабатывание' },
  { value: 'no_connection', label: 'Потеря связи GSM' },
  { value: 'no_arm',        label: 'Не ставится под охрану' },
  { value: 'no_response',   label: 'Нет реакции охраны' },
  { value: 'late_response', label: 'Опоздание реакции охраны' },
  { value: 'sensor_fault',  label: 'Неисправность датчика' },
  { value: 'power_fault',   label: 'Сбой питания' },
  { value: 'maintenance',   label: 'Плановое ТО' },
  { value: 'other',         label: 'Прочее' },
]

export const GUILTY_PARTIES = [
  { value: 'guard_department', label: 'Департамент охраны МВД' },
  { value: 'company_employee', label: 'Сотрудник компании' },
  { value: 'technical_fault',  label: 'Техническая неисправность' },
  { value: 'contractor',       label: 'Подрядчик' },
  { value: 'unknown',          label: 'Не установлено' },
]

export const STATUSES = [
  { value: 'new',           label: 'Новый' },
  { value: 'investigating', label: 'Расследуется' },
  { value: 'resolved',      label: 'Устранён' },
  { value: 'closed',        label: 'Закрыт' },
]

export const PRIORITIES = [
  { value: 'critical', label: 'Критичный' },
  { value: 'high',     label: 'Высокий' },
  { value: 'medium',   label: 'Средний' },
  { value: 'low',      label: 'Низкий' },
]

export const EMPLOYEE_ACTIONS = [
  { value: 'called_duty',        label: 'Позвонил дежурному' },
  { value: 'filed_repair',       label: 'Подал заявку на ремонт' },
  { value: 'waited_for_master',  label: 'Дождался мастера' },
  { value: 'left_without_fix',   label: 'Ушёл без постановки' },
  { value: 'no_action',          label: 'Не предпринял действий' },
  { value: 'other',              label: 'Другое' },
]

export function guiltyLabel(v)    { return GUILTY_PARTIES.find(x => x.value === v)?.label || v }
export function typeLabel(v)      { return INCIDENT_TYPES.find(x => x.value === v)?.label || v }
export function statusLabel(v)    { return STATUSES.find(x => x.value === v)?.label || v }
export function priorityLabel(v)  { return PRIORITIES.find(x => x.value === v)?.label || v }
export function employeeActionLabel(v) { return EMPLOYEE_ACTIONS.find(x => x.value === v)?.label || v || '—' }

export function guiltyBadge(v) {
  return { guard_department:'guard', company_employee:'employee', technical_fault:'tech', contractor:'contractor', unknown:'unknown' }[v] || 'unknown'
}
