import type { Bank } from '../bank/schema'
import type { Attempt, CourseSettings } from '../storage/types'

/** A question in any course. */
export type QuestionRef = { courseId: string; questionId: string }

/** New questions per day in "Today". Spaced repetition (M4) replaces this rule. */
export const NEW_PER_DAY = 20

const refKey = (courseId: string, questionId: string) => `${courseId}/${questionId}`

/** Local calendar day as "YYYY-MM-DD". */
export function dayKey(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

/** Monday of the week that contains `date`. */
function startOfWeek(date: Date): Date {
  const day = startOfDay(date)
  return addDays(day, -((day.getDay() + 6) % 7))
}

/** Whole days from today until the local date "YYYY-MM-DD" (0 = today, negative = past). */
export function daysUntil(day: string, now: Date): number {
  const [y, m, d] = day.split('-').map(Number)
  return Math.round((new Date(y, m - 1, d).getTime() - startOfDay(now).getTime()) / 86_400_000)
}

/** Latest attempt and first answer time per question, keyed "courseId/questionId". */
export type History = Map<string, { latest: Attempt; firstAt: string }>

export function questionHistory(attempts: readonly Attempt[]): History {
  const history: History = new Map()
  for (const a of attempts) {
    const entry = history.get(refKey(a.courseId, a.questionId))
    if (!entry) {
      history.set(refKey(a.courseId, a.questionId), { latest: a, firstAt: a.answeredAt })
      continue
    }
    if (a.answeredAt >= entry.latest.answeredAt) entry.latest = a
    if (a.answeredAt < entry.firstAt) entry.firstAt = a.answeredAt
  }
  return history
}

/** new: never answered; learned: latest answer correct; weak: latest answer wrong. */
export type QuestionState = 'new' | 'learned' | 'weak'

export function stateOf(history: History, courseId: string, questionId: string): QuestionState {
  const entry = history.get(refKey(courseId, questionId))
  return !entry ? 'new' : entry.latest.correct ? 'learned' : 'weak'
}

export type TopicProgress = { topic: string; total: number; learned: number; weak: number }

export type CourseStats = {
  total: number
  learned: number
  weak: number
  fresh: number
  /** Share of correct answers over all of the course's attempts; undefined without attempts. */
  accuracy?: number
  topics: TopicProgress[]
}

export function courseStats(bank: Bank, attempts: readonly Attempt[], history: History): CourseStats {
  const id = bank.course.id
  const topics = new Map(bank.topics.map((topic) => [topic, { topic, total: 0, learned: 0, weak: 0 }]))
  let learned = 0
  let weak = 0
  for (const q of bank.questions) {
    const topic = topics.get(q.topic)
    const state = stateOf(history, id, q.id)
    if (topic) topic.total++
    if (state === 'learned') {
      learned++
      if (topic) topic.learned++
    } else if (state === 'weak') {
      weak++
      if (topic) topic.weak++
    }
  }
  const own = attempts.filter((a) => a.courseId === id)
  return {
    total: bank.questions.length,
    learned,
    weak,
    fresh: bank.questions.length - learned - weak,
    accuracy: own.length ? own.filter((a) => a.correct).length / own.length : undefined,
    topics: [...topics.values()],
  }
}

/**
 * Today's questions across all courses: every weak question, plus new ones in turns across the
 * courses, as many as are left of today's allowance of NEW_PER_DAY.
 */
export function todayQueue(
  banks: readonly Bank[],
  history: History,
  now: Date,
  newPerDay = NEW_PER_DAY,
): { weak: QuestionRef[]; fresh: QuestionRef[] } {
  const today = dayKey(now)
  let startedToday = 0
  for (const entry of history.values()) if (dayKey(new Date(entry.firstAt)) === today) startedToday++

  const weak: QuestionRef[] = []
  const freshPerCourse = banks.map((bank) => {
    const fresh: QuestionRef[] = []
    for (const q of bank.questions) {
      const ref = { courseId: bank.course.id, questionId: q.id }
      const state = stateOf(history, ref.courseId, ref.questionId)
      if (state === 'weak') weak.push(ref)
      else if (state === 'new') fresh.push(ref)
    }
    return fresh
  })
  return { weak, fresh: interleave(freshPerCourse).slice(0, Math.max(0, newPerDay - startedToday)) }
}

/** [a1, a2], [b1] -> [a1, b1, a2] */
function interleave<T>(lists: readonly T[][]): T[] {
  const out: T[] = []
  const longest = Math.max(0, ...lists.map((l) => l.length))
  for (let i = 0; i < longest; i++) for (const list of lists) if (i < list.length) out.push(list[i])
  return out
}

function dailyCounts(attempts: readonly Attempt[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const a of attempts) {
    const day = dayKey(new Date(a.answeredAt))
    counts.set(day, (counts.get(day) ?? 0) + 1)
  }
  return counts
}

/** Answers per day of the current week, Monday first. */
export function weekActivity(attempts: readonly Attempt[], now: Date): number[] {
  const counts = dailyCounts(attempts)
  const monday = startOfWeek(now)
  return Array.from({ length: 7 }, (_, i) => counts.get(dayKey(addDays(monday, i))) ?? 0)
}

export type HeatCell = { day: string; count: number; level: 0 | 1 | 2 | 3 | 4 } | null

/**
 * `weeks` columns of 7 days each (Monday first), ending with the current week. Days after today
 * are null. Levels 1 to 4 split the range up to the busiest day into quarters.
 */
export function heatmap(attempts: readonly Attempt[], now: Date, weeks = 20): HeatCell[] {
  const counts = dailyCounts(attempts)
  const today = dayKey(now)
  const start = addDays(startOfWeek(now), -(weeks - 1) * 7)
  const days = Array.from({ length: weeks * 7 }, (_, i) => dayKey(addDays(start, i)))
  const max = Math.max(0, ...days.map((d) => counts.get(d) ?? 0))
  return days.map((day) => {
    if (day > today) return null
    const count = counts.get(day) ?? 0
    const level = count ? Math.min(4, Math.ceil((count / max) * 4)) : 0
    return { day, count, level: level as 0 | 1 | 2 | 3 | 4 }
  })
}

export type WeakTopic = { courseId: string; topic: string; share: number }

/** Topics with at least one weak question, least learned first. */
export function weakestTopics(
  courses: readonly { courseId: string; stats: CourseStats }[],
  limit = 4,
): WeakTopic[] {
  return courses
    .flatMap(({ courseId, stats }) =>
      stats.topics
        .filter((t) => t.weak > 0)
        .map((t) => ({ courseId, topic: t.topic, share: t.learned / t.total })),
    )
    .sort((a, b) => a.share - b.share)
    .slice(0, limit)
}

export type UpcomingExam = { courseId: string; date: string; days: number }

/** Exams of the given courses from today on, soonest first. */
export function upcomingExams(
  settings: Iterable<CourseSettings>,
  courseIds: ReadonlySet<string>,
  now: Date,
): UpcomingExam[] {
  return [...settings]
    .flatMap((s) =>
      s.examDate && courseIds.has(s.courseId)
        ? [{ courseId: s.courseId, date: s.examDate, days: daysUntil(s.examDate, now) }]
        : [],
    )
    .filter((e) => e.days >= 0)
    .sort((a, b) => a.days - b.days)
}

/** Median time per answer in milliseconds, or undefined without attempts. */
export function medianDuration(attempts: readonly Attempt[]): number | undefined {
  if (!attempts.length) return undefined
  const sorted = attempts.map((a) => a.durationMs).sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}
