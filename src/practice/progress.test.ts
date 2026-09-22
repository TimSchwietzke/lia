import { describe, expect, it } from 'vitest'
import type { Bank } from '../bank/schema'
import type { Attempt } from '../storage/types'
import { masteredCount } from './progress'

const bank = {
  course: { id: 'c' },
  questions: [{ id: 'q1' }, { id: 'q2' }, { id: 'q3' }],
} as unknown as Bank

const attempt = (questionId: string, correct: boolean, answeredAt: string, courseId = 'c') =>
  ({ courseId, questionId, correct, answeredAt }) as Attempt

describe('masteredCount', () => {
  it('counts questions whose latest attempt was correct, regardless of log order', () => {
    const attempts = [
      attempt('q1', true, '2026-01-02'),
      attempt('q1', false, '2026-01-01'), // older, ignored
      attempt('q2', true, '2026-01-01'),
      attempt('q2', false, '2026-01-03'), // newer failure un-masters q2
      attempt('q3', true, '2026-01-01', 'other-course'),
      attempt('removed-question', true, '2026-01-01'),
    ]
    expect(masteredCount(bank, attempts)).toBe(1)
  })
})
