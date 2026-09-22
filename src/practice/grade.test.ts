import { describe, expect, it } from 'vitest'
import type { Question, QuestionOf } from '../bank/schema'
import { FREE_TEXT_PASS, grade, isBlankCorrect } from './grade'

const common = { topic: 'T', difficulty: 1, explanation: 'x' } as const
const options = [
  { text: 'a', correct: true },
  { text: 'b', correct: false },
  { text: 'c', correct: true },
  { text: 'd', correct: false },
]
const single: QuestionOf<'single_choice'> = {
  ...common,
  id: 's',
  type: 'single_choice',
  prompt: 'p',
  options: options.map((o, i) => ({ ...o, correct: i === 0 })),
}
const multiple: QuestionOf<'multiple_choice'> = {
  ...common,
  id: 'm',
  type: 'multiple_choice',
  prompt: 'p',
  options,
}
const cloze: QuestionOf<'cloze'> = {
  ...common,
  id: 'c',
  type: 'cloze',
  text: '{{1}} {{2}}',
  blanks: [{ answers: ['popleft'] }, { answers: ['O(n log n)'], ignoreCase: true, ignoreWhitespace: true }],
}
const freeText: QuestionOf<'free_text'> = {
  ...common,
  id: 'f',
  type: 'free_text',
  prompt: 'p',
  modelAnswer: 'm',
  keyPoints: ['1', '2', '3', '4'],
}

describe('grade', () => {
  it('single choice: all or nothing', () => {
    expect(grade(single, { type: 'single_choice', selected: [0] })).toEqual({ score: 1, correct: true })
    expect(grade(single, { type: 'single_choice', selected: [1] })).toEqual({ score: 0, correct: false })
    expect(grade(single, { type: 'single_choice', selected: [] })).toEqual({ score: 0, correct: false })
  })

  it('multiple choice: share of options judged right, correct only if all are', () => {
    expect(grade(multiple, { type: 'multiple_choice', selected: [0, 2] })).toEqual({
      score: 1,
      correct: true,
    })
    expect(grade(multiple, { type: 'multiple_choice', selected: [0] })).toEqual({
      score: 0.75,
      correct: false,
    })
    expect(grade(multiple, { type: 'multiple_choice', selected: [1, 3] })).toEqual({
      score: 0,
      correct: false,
    })
    expect(grade(multiple, { type: 'multiple_choice', selected: [] })).toEqual({ score: 0.5, correct: false })
  })

  it('flashcard: rating maps to score, only "again" is wrong', () => {
    const card: Question = { ...common, id: 'k', type: 'flashcard', front: 'f', back: 'b' }
    const scores = (['again', 'hard', 'good', 'easy'] as const).map((rating) =>
      grade(card, { type: 'flashcard', rating }),
    )
    expect(scores).toEqual([
      { score: 0, correct: false },
      { score: 0.5, correct: true },
      { score: 1, correct: true },
      { score: 1, correct: true },
    ])
  })

  it('cloze: share of blanks right', () => {
    expect(grade(cloze, { type: 'cloze', values: ['popleft', 'o(nlogn)'] })).toEqual({
      score: 1,
      correct: true,
    })
    expect(grade(cloze, { type: 'cloze', values: ['popLeft', 'O(n log n)'] })).toEqual({
      score: 0.5,
      correct: false,
    })
    expect(grade(cloze, { type: 'cloze', values: [] })).toEqual({ score: 0, correct: false })
  })

  it('free text: share of covered key points, correct from the pass mark', () => {
    const answer = (covered: number[]) =>
      grade(freeText, { type: 'free_text', text: '', coveredKeyPoints: covered })
    expect(answer([0, 1, 2, 3])).toEqual({ score: 1, correct: true })
    expect(answer([0, 1, 2])).toEqual({ score: 0.75, correct: 0.75 >= FREE_TEXT_PASS })
    expect(answer([0, 0, 1])).toEqual({ score: 0.5, correct: false })
    expect(answer([])).toEqual({ score: 0, correct: false })
  })

  it('refuses an answer of the wrong type', () => {
    expect(() => grade(single, { type: 'flashcard', rating: 'good' })).toThrow()
  })
})

describe('isBlankCorrect', () => {
  it('is strict by default but always trims and collapses spaces', () => {
    const blank = { answers: ['binary search'] }
    expect(isBlankCorrect(blank, '  binary   search ')).toBe(true)
    expect(isBlankCorrect(blank, 'Binary search')).toBe(false)
    expect(isBlankCorrect(blank, 'binarysearch')).toBe(false)
  })

  it('honours ignoreCase and ignoreWhitespace', () => {
    expect(isBlankCorrect({ answers: ['Heap'], ignoreCase: true }, 'hEAP')).toBe(true)
    expect(isBlankCorrect({ answers: ['i + 1'], ignoreWhitespace: true }, 'i+1')).toBe(true)
  })

  it('treats composed and decomposed umlauts as equal', () => {
    expect(isBlankCorrect({ answers: ['Gr\u00f6\u00dfe'] }, 'Gro\u0308\u00dfe')).toBe(true)
  })
})
