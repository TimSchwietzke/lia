import type { Blank, Question, QuestionOf, QuestionType } from '../bank/schema'

export type Rating = 'again' | 'hard' | 'good' | 'easy'
export const RATINGS: readonly Rating[] = ['again', 'hard', 'good', 'easy']

/** What the learner did, per question type. Stored in the attempt log. */
type AnswerMap = {
  single_choice: { selected: number[] }
  multiple_choice: { selected: number[] }
  flashcard: { rating: Rating }
  cloze: { values: string[] }
  free_text: { text: string; coveredKeyPoints: number[] }
}
export type AnswerOf<T extends QuestionType> = { type: T } & AnswerMap[T]
export type Answer = { [T in QuestionType]: AnswerOf<T> }[QuestionType]

export type Grade = {
  /** 0..1 */
  score: number
  correct: boolean
}

export type Grader<T extends QuestionType> = (question: QuestionOf<T>, answer: AnswerOf<T>) => Grade

const RATING_SCORE: Record<Rating, number> = { again: 0, hard: 0.5, good: 1, easy: 1 }
/** Share of key points a free-text answer needs to count as correct. */
export const FREE_TEXT_PASS = 0.75

/** One grader per question type. Swap an entry to change how that type is graded. */
export const graders: { [T in QuestionType]: Grader<T> } = {
  single_choice: (q, a) => {
    const correct = a.selected.length === 1 && q.options[a.selected[0]]?.correct === true
    return { score: correct ? 1 : 0, correct }
  },
  multiple_choice: (q, a) => {
    const right = q.options.filter((o, i) => o.correct === a.selected.includes(i)).length
    const score = right / q.options.length
    return { score, correct: score === 1 }
  },
  flashcard: (_, a) => ({ score: RATING_SCORE[a.rating], correct: a.rating !== 'again' }),
  cloze: (q, a) => {
    const right = q.blanks.filter((b, i) => isBlankCorrect(b, a.values[i] ?? '')).length
    const score = right / q.blanks.length
    return { score, correct: score === 1 }
  },
  free_text: (q, a) => {
    const score = new Set(a.coveredKeyPoints).size / q.keyPoints.length
    return { score, correct: score >= FREE_TEXT_PASS }
  },
}

export function grade(question: Question, answer: Answer): Grade {
  if (question.type !== answer.type) {
    throw new Error(`Answer of type ${answer.type} does not fit question type ${question.type}`)
  }
  // The check above guarantees both belong to the same type; TypeScript cannot correlate them.
  return (graders[question.type] as Grader<QuestionType>)(question as never, answer as never)
}

export function isBlankCorrect(blank: Blank, value: string): boolean {
  const norm = (s: string) => {
    let v = s.normalize('NFC').trim().replace(/\s+/g, ' ')
    if (blank.ignoreWhitespace) v = v.replace(/\s/g, '')
    if (blank.ignoreCase) v = v.toLowerCase()
    return v
  }
  const given = norm(value)
  return blank.answers.some((a) => norm(a) === given)
}
