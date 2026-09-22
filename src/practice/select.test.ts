import { describe, expect, it } from 'vitest'
import type { Question } from '../bank/schema'
import { selectQuestions, shuffle } from './select'

const card = (id: string, topic: string, type: 'flashcard' | 'free_text' = 'flashcard'): Question =>
  type === 'flashcard'
    ? { id, topic, type, difficulty: 1, front: 'f', back: 'b' }
    : { id, topic, type, difficulty: 1, prompt: 'p', modelAnswer: 'm', keyPoints: ['k'], explanation: 'e' }

const questions = [
  card('a1', 'A'),
  card('a2', 'A', 'free_text'),
  card('b1', 'B'),
  card('c1', 'C', 'free_text'),
]
const ids = (qs: Question[]) => qs.map((q) => q.id).sort()

/** Deterministic pseudo-random numbers for repeatable shuffles. */
function seeded(seed: number) {
  return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646
}

describe('selectQuestions', () => {
  it('returns every question when nothing is filtered', () => {
    expect(ids(selectQuestions(questions, {}))).toEqual(['a1', 'a2', 'b1', 'c1'])
  })

  it('filters by topics and types together', () => {
    expect(ids(selectQuestions(questions, { topics: ['A', 'C'] }))).toEqual(['a1', 'a2', 'c1'])
    expect(ids(selectQuestions(questions, { types: ['free_text'] }))).toEqual(['a2', 'c1'])
    expect(ids(selectQuestions(questions, { topics: ['A'], types: ['free_text'] }))).toEqual(['a2'])
    expect(selectQuestions(questions, { topics: [] })).toEqual([])
  })

  it('limits the number of questions', () => {
    expect(selectQuestions(questions, { limit: 2 })).toHaveLength(2)
    expect(selectQuestions(questions, { limit: 10 })).toHaveLength(4)
  })

  it('shuffles', () => {
    const orders = new Set(
      Array.from({ length: 20 }, (_, i) =>
        selectQuestions(questions, {}, seeded(i + 1))
          .map((q) => q.id)
          .join(),
      ),
    )
    expect(orders.size).toBeGreaterThan(1)
  })
})

describe('shuffle', () => {
  it('keeps every element exactly once and leaves the input alone', () => {
    const input = Array.from({ length: 50 }, (_, i) => i)
    const out = shuffle(input, seeded(42))
    expect(out).not.toEqual(input)
    expect([...out].sort((a, b) => a - b)).toEqual(input)
    expect(input[0]).toBe(0)
  })

  it('produces every permutation of three elements', () => {
    const random = seeded(7)
    const seen = new Set(Array.from({ length: 200 }, () => shuffle([1, 2, 3], random).join()))
    expect(seen.size).toBe(6)
  })
})
