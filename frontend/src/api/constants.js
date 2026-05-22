// ── Типы событий ──────────────────────────────────────────────────────────────

export const EVENT_CATEGORIES = [
  { value: 'incident',    label: 'Инцидент' },
  { value: 'maintenance', label: 'Не инцидент (ТО / Ремонт)' },
]

export const INCIDENT_TYPES = [
  // Инциденты
  { value: 'alarm',           label: 'Сработка',                  category: 'incident' },
  { value: 'no_arm',          label: 'Не ставится на охрану',     category: 'incident' },
  { value: 'no_disarm',       label: 'Не снимается с охраны',     category: 'incident' },
  { value: 'no_connection',   label: 'Потеря связи GSM',          category: 'incident' },
  { value: 'sensor_fault',    label: 'Неисправность датчика',     category: 'incident' },
  { value: 'power_fault',     label: 'Сбой питания',              category: 'incident' },
  { value: 'no_response',     label: 'Нет реакции охраны',        category: 'incident' },
  { value: 'late_response',   label: 'Опоздание реакции охраны',  category: 'incident' },
  // Не инциденты
  { value: 'planned_to',      label: 'Плановое ТО',               category: 'maintenance' },
  { value: 'unplanned_to',    label: 'Внеплановое ТО',            category: 'maintenance' },
  { value: 'repair',          label: 'Ремонт',                    category: 'maintenance' },
  { value: 'other',           label: 'Прочее',                    category: 'incident' },
]

export const INCIDENT_TYPES_INCIDENTS    = INCIDENT_TYPES.filter(t => t.category === 'incident')
export const INCIDENT_TYPES_MAINTENANCE  = INCIDENT_TYPES.filter(t => t.category === 'maintenance')

// ── Причины (зависит от типа события) ────────────────────────────────────────

export const ROOT_CAUSES_ALARM = [
  { value: 'technical_fault',   label: 'Техническая неисправность' },
  { value: 'insects_animals',   label: 'Насекомые / животные' },
  { value: 'forgot_person',     label: 'Забыли человека внутри' },
  { value: 'bad_door_window',   label: 'Плохо закрыта дверь / окно / роллета' },
  { value: 'penetration',       label: 'Проникновение' },
  { value: 'other',             label: 'Другое' },
]

export const ROOT_CAUSES_NO_ARM = [
  { value: 'door_not_closed',   label: 'Не закрыта дверь / окно / роллета' },
  { value: 'technical_fault',   label: 'Техническая неисправность' },
  { value: 'insects_animals',   label: 'Насекомые / животные' },
  { value: 'forgot_person',     label: 'Забыли человека внутри' },
  { value: 'key_fob_fault',     label: 'Неисправность брелока / ключа' },
  { value: 'low_battery',       label: 'Разряжена батарея датчика' },
  { value: 'other',             label: 'Другое' },
]

export const ROOT_CAUSES_NO_DISARM = [
  { value: 'forgot_key_fob',    label: 'Забыли приложить ключ / брелок' },
  { value: 'technical_fault',   label: 'Техническая неисправность' },
  { value: 'key_fob_fault',     label: 'Неисправность брелока / ключа' },
  { value: 'wrong_code',        label: 'Неверный код' },
  { value: 'other',             label: 'Другое' },
]

export const ROOT_CAUSES_GENERAL = [
  { value: 'technical_fault',   label: 'Техническая неисправность' },
  { value: 'gsm_fault',         label: 'Неисправность GSM канала' },
  { value: 'power_fault',       label: 'Сбой питания' },
  { value: 'insects_animals',   label: 'Насекомые / животные' },
  { value: 'bad_door_window',   label: 'Плохо закрыта дверь / окно / роллета' },
  { value: 'other',             label: 'Другое' },
]

export function getRootCauses(incident_type) {
  switch (incident_type) {
    case 'alarm':     return ROOT_CAUSES_ALARM
    case 'no_arm':    return ROOT_CAUSES_NO_ARM
    case 'no_disarm': return ROOT_CAUSES_NO_DISARM
    default:          return ROOT_CAUSES_GENERAL
  }
}

// ── Виновная сторона ──────────────────────────────────────────────────────────

export const GUILTY_PARTIES = [
  { value: 'guard_department', label: 'Департамент МВД' },
  { value: 'company_employee', label: 'Сотрудник' },
  { value: 'technical',        label: 'Техн. неисправность' },
  { value: 'force_majeure',    label: 'Форс-мажор' },
  { value: 'unknown',          label: 'Не определена' },
]

// ── Реакция охраны ────────────────────────────────────────────────────────────

export const GUARD_RESPONSE_TYPES = [
  { value: 'sent_master',   label: 'Направлен дежурный электромонтер' },
  { value: 'sent_gz',       label: 'Направлена группа задержания (ГЗ)' },
  { value: 'phone_consult', label: 'Консультация по телефону' },
  { value: 'no_response',   label: 'Нет реакции' },
  { value: 'other',         label: 'Другое' },
]

// ── Статусы ───────────────────────────────────────────────────────────────────

export const STATUSES = [
  { value: 'new',           label: 'Новый' },
  { value: 'investigating', label: 'Расследуется' },
  { value: 'resolved',      label: 'Устранён' },
  { value: 'closed',        label: 'Закрыт' },
]

// ── Действия сотрудника при Не ставится на охрану ─────────────────────────────

export const EMPLOYEE_ACTIONS = [
  { value: 'called_electrician',  label: 'Позвонил электромонтеру' },
  { value: 'called_duty',         label: 'Позвонил в дежурную часть' },
  { value: 'waited_for_master',   label: 'Дождался мастера' },
  { value: 'left_without_fix',    label: 'Ушёл без постановки на охрану ⚠️' },
  { value: 'no_action',           label: 'Действий не предпринял' },
  { value: 'fixed_independently', label: 'Устранил самостоятельно' },
  { value: 'other',               label: 'Другое' },
]

// ── Итог события ─────────────────────────────────────────────────────────────

export const OUTCOMES_ALARM = [
  { value: 'false_alarm',         label: 'Ложная сработка' },
  { value: 'penetration',         label: 'Проникновение' },
  { value: 'unknown',             label: 'Не установлено' },
]

export const OUTCOMES_NO_ARM = [
  { value: 'armed_after_fix',     label: 'Поставлена после устранения' },
  { value: 'armed_no_fix',        label: 'Поставлена без устранения причины' },
  { value: 'not_armed',           label: 'Не поставлена (объект покинут)' },
]

export const OUTCOMES_MAINTENANCE = [
  { value: 'completed_full',      label: 'Выполнено в полном объёме' },
  { value: 'completed_partial',   label: 'Выполнено частично' },
  { value: 'not_completed',       label: 'Не выполнено' },
  { value: 'master_not_arrived',  label: 'Мастер не прибыл (нарушение договора)' },
]

export function getOutcomes(incident_type) {
  switch (incident_type) {
    case 'alarm':       return OUTCOMES_ALARM
    case 'no_arm':      return OUTCOMES_NO_ARM
    case 'planned_to':
    case 'unplanned_to':
    case 'repair':      return OUTCOMES_MAINTENANCE
    default:            return []
  }
}

// ── Пункты договора (для оснований претензий) ─────────────────────────────────

export const CONTRACT_CLAUSES = [
  { value: 'tech_maintenance',  label: 'Обязанность проводить ТО и ремонт' },
  { value: 'response_time',     label: 'Время реакции на неисправность' },
  { value: 'physical_guard',    label: 'Физическая охрана при неисправности >24ч' },
  { value: 'training',          label: 'Обучение сотрудников заказчика' },
  { value: 'liability',         label: 'Материальная ответственность' },
  { value: 'other',             label: 'Другой пункт' },
]

// ── Label helpers ─────────────────────────────────────────────────────────────

export function guiltyLabel(v)      { return GUILTY_PARTIES.find(x => x.value === v)?.label || v || '—' }
export function typeLabel(v)        { return INCIDENT_TYPES.find(x => x.value === v)?.label || v || '—' }
export function statusLabel(v)      { return STATUSES.find(x => x.value === v)?.label || v || '—' }
export function rootCauseLabel(v)   { return [...ROOT_CAUSES_ALARM, ...ROOT_CAUSES_NO_ARM, ...ROOT_CAUSES_NO_DISARM, ...ROOT_CAUSES_GENERAL].find(x => x.value === v)?.label || v || '—' }
export function employeeActionLabel(v) { return EMPLOYEE_ACTIONS.find(x => x.value === v)?.label || v || '—' }
export function outcomeLabel(v)     { return [...OUTCOMES_ALARM, ...OUTCOMES_NO_ARM, ...OUTCOMES_MAINTENANCE].find(x => x.value === v)?.label || v || '—' }
export function guardResponseLabel(v) { return GUARD_RESPONSE_TYPES.find(x => x.value === v)?.label || v || '—' }

export function guiltyBadge(v) {
  return {
    guard_department: 'guard',
    company_employee: 'employee',
    technical:        'technical',
    force_majeure:    'unknown',
    unknown:          'unknown',
  }[v] || 'unknown'
}

export function isIncident(type) {
  const t = INCIDENT_TYPES.find(x => x.value === type)
  return t?.category === 'incident'
}

export function isMaintenance(type) {
  const t = INCIDENT_TYPES.find(x => x.value === type)
  return t?.category === 'maintenance'
}

