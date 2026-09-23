import { describe, expect, it } from 'vitest'
import type { Bank } from '../bank/schema'
import type { Attempt } from '../storage/types'
import {
  courseStats,
  dayKey,
  daysUntil,
  heatmap,
  medianDuration,
  questionHistory,
  stateOf,
  todayQueue,
  upcomingExams,
  weakestTopics,
  weekActivity,
} from './stats'

/** A bank with only the fields the stats read. */
const bank = (id: string, topics: Record<string, string[]>) =>
  ({
    course: { id },
    topics: Object.keys(topics),
    questions: Object.entries(topics).flatMap(([topic, ids]) => ids.map((q) => ({ id: q, topic }))),
  }) as unknown as Bank

/** Local time, so tests do not depend on the machine's time zone. */
const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h)

const attempt = (courseId: string, questionId: string, correct: boolean, when: Date, durationMs = 1000) =>
  ({ courseId, questionId, correct, answeredAt: when.toISOString(), durationMs }) as Attempt

// Wednesday 2026-09-23
const now = at(2026, 9, 23, 15)

describe('question states', () => {
  it('uses the latest attempt, regardless of log order', () => {
    const history = questionHistory([
      attempt('c', 'q1', true, at(2026, 9, 2)),
      attempt('c', 'q1', false, at(2026, 9, 1)),
      attempt('c', 'q2', true, at(2026, 9, 1)),
      attempt('c', 'q2', false, at(2026, 9, 3)),
    ])
    expect(stateOf(history, 'c', 'q1')).toBe('learned')
    expect(stateOf(history, 'c', 'q2')).toBe('weak')
    expect(stateOf(history, 'c', 'q3')).toBe('new')
    expect(stateOf(history, 'other', 'q1')).toBe('new')
  })
})

describe('courseStats', () => {
  it('counts learned, weak and new per course and topic, and the accuracy of all answers', () => {
    const b = bank('c', { A: ['a1', 'a2'], B: ['b1'] })
    const attempts = [
      attempt('c', 'a1', false, at(2026, 9, 1)),
      attempt('c', 'a1', true, at(2026, 9, 2)),
      attempt('c', 'b1', false, at(2026, 9, 2)),
      attempt('other', 'a2', true, at(2026, 9, 2)),
    ]
    const stats = courseStats(b, attempts, questionHistory(attempts))
    expect(stats).toEqual({
      total: 3,
      learned: 1,
      weak: 1,
      fresh: 1,
      accuracy: 1 / 3,
      topics: [
        { topic: 'A', total: 2, learned: 1, weak: 0 },
        { topic: 'B', total: 1, learned: 0, weak: 1 },
      ],
    })
    expect(courseStats(b, [], new Map()).accuracy).toBeUndefined()
  })
})

describe('todayQueue', () => {
  const banks = [bank('x', { T: ['x1', 'x2', 'x3'] }), bank('y', { T: ['y1', 'y2'] })]

  it('takes all weak questions and new ones in turns across courses', () => {
    const attempts = [attempt('x', 'x1', false, at(2026, 9, 20))]
    const { weak, fresh } = todayQueue(banks, questionHistory(attempts), now)
    expect(weak).toEqual([{ courseId: 'x', questionId: 'x1' }])
    expect(fresh.map((r) => r.questionId)).toEqual(['x2', 'y1', 'x3', 'y2'])
  })

  it('counts questions first answered today against the daily allowance', () => {
    const attempts = [attempt('x', 'x1', true, at(2026, 9, 23, 9)), attempt('x', 'x2', true, at(2026, 9, 22))]
    const { fresh } = todayQueue(banks, questionHistory(attempts), now, 3)
    expect(fresh.map((r) => r.questionId)).toEqual(['x3', 'y1'])
    expect(todayQueue(banks, questionHistory(attempts), now, 1).fresh).toEqual([])
  })
})

describe('dates', () => {
  it('formats local days and counts days until a date', () => {
    expect(dayKey(at(2026, 1, 5))).toBe('2026-01-05')
    expect(daysUntil('2026-09-23', now)).toBe(0)
    expect(daysUntil('2026-10-16', now)).toBe(23)
    expect(daysUntil('2026-09-20', now)).toBe(-3)
    // across the switch to winter time (last Sunday of October in Europe)
    expect(daysUntil('2026-11-02', at(2026, 10, 20))).toBe(13)
  })
})

describe('activity', () => {
  const attempts = [
    attempt('c', 'q', true, at(2026, 9, 21)), // Monday
    attempt('c', 'q', true, at(2026, 9, 21)),
    attempt('c', 'q', true, at(2026, 9, 23)), // today
    attempt('c', 'q', true, at(2026, 9, 20)), // last week's Sunday
  ]

  it('counts answers per day of the current week, Monday first', () => {
    expect(weekActivity(attempts, now)).toEqual([2, 0, 1, 0, 0, 0, 0])
  })

  it('builds week columns ending today, with levels relative to the busiest day', () => {
    const cells = heatmap(attempts, now, 2)
    expect(cells).toHaveLength(14)
    expect(cells[0]?.day).toBe('2026-09-14')
    expect(cells[6]).toEqual({ day: '2026-09-20', count: 1, level: 2 })
    expect(cells[7]).toEqual({ day: '2026-09-21', count: 2, level: 4 })
    expect(cells[8]).toEqual({ day: '2026-09-22', count: 0, level: 0 })
    expect(cells.slice(10)).toEqual([null, null, null, null])
  })
})

describe('weakestTopics', () => {
  it('lists topics that have weak questions, least learned first', () => {
    const topics = (list: [string, number, number, number][]) => ({
      total: 0,
      learned: 0,
      weak: 0,
      fresh: 0,
      topics: list.map(([topic, total, learned, weak]) => ({ topic, total, learned, weak })),
    })
    const result = weakestTopics(
      [
        {
          courseId: 'a',
          stats: topics([
            ['A1', 4, 3, 1],
            ['A2', 4, 0, 0],
          ]),
        },
        { courseId: 'b', stats: topics([['B1', 2, 0, 2]]) },
      ],
      4,
    )
    expect(result).toEqual([
      { courseId: 'b', topic: 'B1', share: 0 },
      { courseId: 'a', topic: 'A1', share: 0.75 },
    ])
  })
})

describe('upcomingExams', () => {
  it('keeps future exams of known courses, soonest first', () => {
    const settings = [
      { courseId: 'a', examDate: '2026-10-16', updatedAt: '' },
      { courseId: 'b', examDate: '2026-09-23', updatedAt: '' },
      { courseId: 'c', examDate: '2026-09-01', updatedAt: '' },
      { courseId: 'd', updatedAt: '' },
      { courseId: 'gone', examDate: '2026-12-01', updatedAt: '' },
    ]
    expect(upcomingExams(settings, new Set(['a', 'b', 'c', 'd']), now)).toEqual([
      { courseId: 'b', date: '2026-09-23', days: 0 },
      { courseId: 'a', date: '2026-10-16', days: 23 },
    ])
  })
})

describe('medianDuration', () => {
  it('returns the median answer time', () => {
    const t = at(2026, 9, 1)
    expect(medianDuration([])).toBeUndefined()
    expect(medianDuration([3, 1, 2].map((ms) => attempt('c', 'q', true, t, ms)))).toBe(2)
    expect(medianDuration([4, 1, 2, 3].map((ms) => attempt('c', 'q', true, t, ms)))).toBe(2.5)
  })
})
