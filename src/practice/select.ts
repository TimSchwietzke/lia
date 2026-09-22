import type { Question, QuestionType } from '../bank/schema'

export type PracticeFilter = {
  /** Only these topics; undefined means all. */
  topics?: readonly string[]
  /** Only these question types; undefined means all. */
  types?: readonly QuestionType[]
  /** At most this many questions; undefined means all matching. */
  limit?: number
}

export function selectQuestions(
  questions: readonly Question[],
  filter: PracticeFilter,
  random: () => number = Math.random,
): Question[] {
  const pool = questions.filter(
    (q) =>
      (!filter.topics || filter.topics.includes(q.topic)) && (!filter.types || filter.types.includes(q.type)),
  )
  return shuffle(pool, random).slice(0, filter.limit ?? pool.length)
}

/** Fisher-Yates shuffle into a new array. */
export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}
