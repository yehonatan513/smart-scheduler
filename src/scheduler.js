const DAILY_HOURS = {
  0: 5.5, // ראשון
  1: 3.5, // שני
  2: 5.5, // שלישי
  3: 3.5, // רביעי
  4: 5.5, // חמישי
  5: 2.0, // שישי
  6: 0.0, // שבת
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

export function calculateSchedule(subjects, sessions) {
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
      return { ...s, daysLeft, doneHours, remaining, typeMultiplier, proximityMultiplier }
    })
    .filter(s => s.remaining > 0 && new Date(s.exam_date) >= today)

  if (!active.length) return []

  const totalUrgency = active.reduce((sum, s) =>
    sum + (s.remaining / s.daysLeft) * s.typeMultiplier * s.proximityMultiplier, 0)

  if (totalUrgency === 0) return []

  return active.map(s => {
    const urgency = (s.remaining / s.daysLeft) * s.typeMultiplier * s.proximityMultiplier
    const proportion = urgency / totalUrgency
    const allocated = Math.max(0.5, Math.min(
      Math.round(dailyHours * proportion * 2) / 2,
      s.remaining
    ))
    return { ...s, allocated }
  })
}