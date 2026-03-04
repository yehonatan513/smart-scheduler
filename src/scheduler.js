const DAILY_HOURS = {
  0: 5.5,
  1: 3.5,
  2: 5.5,
  3: 3.5,
  4: 5.5,
  5: 2.0,
  6: 0.0,
}

const TYPE_MULTIPLIER = {
  'בגרות': 3,
  'מתכונת': 2,
  'מבחן': 1,
}

function getProximityMultiplier(daysLeft) {
  if (daysLeft <= 1) return 5
  if (daysLeft <= 2) return 3
  if (daysLeft <= 3) return 2
  return 1
}

export function getTodayHours() {
  return DAILY_HOURS[new Date().getDay()] ?? 0
}

export function calculateSchedule(subjects, sessions, settings = {}) {
  const maxSubjects = settings.max_subjects_per_day ?? 3
  const minHours = settings.min_hours_per_subject ?? 1

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dailyHours = getTodayHours()

  if (dailyHours === 0) return []

  const active = subjects
    .map(s => {
      const examDate = new Date(s.exam_date)
      examDate.setHours(0, 0, 0, 0)
      const daysLeft = Math.max(1, Math.ceil((examDate - today) / 86400000))
      const doneHours = sessions
        .filter(se => se.subject_id === s.id && se.completed)
        .reduce((sum, se) => sum + se.hours, 0)
      const remaining = Math.max(0, s.total_hours - doneHours)
      const typeMultiplier = TYPE_MULTIPLIER[s.event_type] ?? 1
      const proximityMultiplier = getProximityMultiplier(daysLeft)
      const urgency = (remaining / daysLeft) * typeMultiplier * proximityMultiplier
      return { ...s, daysLeft, doneHours, remaining, urgency }
    })
    .filter(s => s.remaining > 0 && new Date(s.exam_date) >= today)
    .sort((a, b) => b.urgency - a.urgency)
    .slice(0, maxSubjects)

  if (!active.length) return []

  const totalUrgency = active.reduce((sum, s) => sum + s.urgency, 0)
  if (totalUrgency === 0) return []

  let remaining = dailyHours
  const result = []

  active.forEach((s, i) => {
    const isLast = i === active.length - 1
    if (isLast) {
      const allocated = Math.min(Math.round(remaining * 2) / 2, s.remaining)
      if (allocated >= minHours) result.push({ ...s, allocated })
    } else {
      const proportion = s.urgency / totalUrgency
      const raw = dailyHours * proportion
      const allocated = Math.min(
        Math.max(minHours, Math.round(raw * 2) / 2),
        s.remaining,
        remaining - minHours * (active.length - i - 1)
      )
      result.push({ ...s, allocated })
      remaining -= allocated
    }
  })

  return result.filter(s => s.allocated >= minHours)
}