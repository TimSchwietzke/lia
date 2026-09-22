import type { Bank } from '../bank/schema'
import type { Attempt } from '../storage/types'

/** Number of the bank's questions whose most recent attempt was correct. */
export function masteredCount(bank: Bank, attempts: readonly Attempt[]): number {
  const latest = new Map<string, Attempt>()
  for (const a of attempts) {
    if (a.courseId !== bank.course.id) continue
    const prev = latest.get(a.questionId)
    if (!prev || a.answeredAt >= prev.answeredAt) latest.set(a.questionId, a)
  }
  return bank.questions.filter((q) => latest.get(q.id)?.correct).length
}
