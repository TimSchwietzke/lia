import { z } from 'zod'
import type { Migration } from '../lib/migrate'

/**
 * The question bank format. QUESTION_FORMAT.md documents it for bank authors (and LLMs);
 * keep both in sync. A breaking change adds a migration below, which bumps the current
 * formatVersion (always bankMigrations.length + 1).
 */
export const BANK_FORMAT = 'lia-bank'

/** `bankMigrations[0]` upgrades formatVersion 1 to 2, and so on. */
export const bankMigrations: readonly Migration[] = []

export const COURSE_COLORS = ['peach', 'mint', 'sky', 'lavender', 'lemon', 'rose'] as const
export const QUESTION_TYPES = ['single_choice', 'multiple_choice', 'flashcard', 'cloze', 'free_text'] as const

/** Matches cloze markers like {{1}}, {{2}}. */
export const CLOZE_MARKER = /\{\{(\d+)\}\}/g

const text = z.string().trim().min(1, 'must not be empty')
const id = z
  .string()
  .regex(
    /^[a-z0-9]+(?:[-_.][a-z0-9]+)*$/,
    'use lowercase letters, digits and single - _ . separators, e.g. "sorting-quicksort-pivot"',
  )

const common = {
  id,
  topic: text,
  difficulty: z.int().min(1).max(3),
  tags: z.array(text).optional(),
  explanation: text,
  source: text.optional(),
}

const option = z.strictObject({ text, correct: z.boolean(), why: text.optional() })
const options = z.array(option).min(2).max(8)

const singleChoice = z
  .strictObject({ ...common, type: z.literal('single_choice'), prompt: text, options })
  .refine((q) => q.options.filter((o) => o.correct).length === 1, {
    message: 'exactly one option must have "correct": true (use multiple_choice for more)',
    path: ['options'],
  })

const multipleChoice = z
  .strictObject({ ...common, type: z.literal('multiple_choice'), prompt: text, options })
  .refine((q) => q.options.some((o) => o.correct), {
    message: 'at least one option must have "correct": true',
    path: ['options'],
  })

const flashcard = z.strictObject({
  ...common,
  type: z.literal('flashcard'),
  front: text,
  back: text,
  explanation: text.optional(),
})

const blank = z.strictObject({
  answers: z.array(text).min(1),
  ignoreCase: z.boolean().optional(),
  ignoreWhitespace: z.boolean().optional(),
})

const cloze = z
  .strictObject({ ...common, type: z.literal('cloze'), text, blanks: z.array(blank).min(1) })
  .superRefine((q, ctx) => {
    const used = [...q.text.matchAll(CLOZE_MARKER)].map((m) => Number(m[1]))
    const expected = q.blanks.map((_, i) => i + 1)
    const ok =
      used.length === expected.length && expected.every((n) => used.filter((u) => u === n).length === 1)
    if (!ok) {
      ctx.addIssue({
        code: 'custom',
        path: ['text'],
        message: `there are ${q.blanks.length} blanks, so the text must contain each of ${expected
          .map((n) => `{{${n}}}`)
          .join(', ')} exactly once (found: ${used.map((n) => `{{${n}}}`).join(', ') || 'none'})`,
      })
    }
  })

const freeText = z.strictObject({
  ...common,
  type: z.literal('free_text'),
  prompt: text,
  modelAnswer: text,
  keyPoints: z.array(text).min(1),
})

const question = z.discriminatedUnion('type', [singleChoice, multipleChoice, flashcard, cloze, freeText], {
  error: (issue) =>
    issue.code === 'invalid_union' ? `"type" must be one of: ${QUESTION_TYPES.join(', ')}` : undefined,
})

export const bankSchema = z
  .strictObject({
    format: z.literal(BANK_FORMAT, `must be "${BANK_FORMAT}"`),
    formatVersion: z.literal(bankMigrations.length + 1),
    course: z.strictObject({
      id,
      name: text,
      version: z.union([text, z.number().transform(String)]),
      code: z.string().regex(/^[\p{L}\p{N}]{2,3}$/u, 'use 2 or 3 letters or digits, e.g. "AD"'),
      color: z.enum(COURSE_COLORS).optional(),
      language: text.optional(),
    }),
    topics: z.array(text).min(1),
    questions: z.array(question).min(1),
  })
  .superRefine((bank, ctx) => {
    const seen = new Set<string>()
    bank.questions.forEach((q, i) => {
      if (seen.has(q.id)) {
        ctx.addIssue({ code: 'custom', path: ['questions', i, 'id'], message: `duplicate id "${q.id}"` })
      }
      seen.add(q.id)
      if (!bank.topics.includes(q.topic)) {
        ctx.addIssue({
          code: 'custom',
          path: ['questions', i, 'topic'],
          message: `"${q.topic}" is not listed in "topics"`,
        })
      }
    })
  })

export type Bank = z.infer<typeof bankSchema>
export type Question = Bank['questions'][number]
export type QuestionType = Question['type']
export type QuestionOf<T extends QuestionType> = Extract<Question, { type: T }>
export type Blank = z.infer<typeof blank>
export type CourseColor = (typeof COURSE_COLORS)[number]

/** The colour a course card uses; courses without one get a stable pick based on their id. */
export function courseColor(course: Bank['course']): CourseColor {
  if (course.color) return course.color
  let hash = 0
  for (const ch of course.id) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return COURSE_COLORS[hash % COURSE_COLORS.length]
}

/** Every Markdown field of a question, e.g. to check image references. */
export function questionTexts(q: Question): string[] {
  const texts = [q.explanation ?? '']
  switch (q.type) {
    case 'single_choice':
    case 'multiple_choice':
      texts.push(q.prompt, ...q.options.flatMap((o) => [o.text, o.why ?? '']))
      break
    case 'flashcard':
      texts.push(q.front, q.back)
      break
    case 'cloze':
      texts.push(q.text)
      break
    case 'free_text':
      texts.push(q.prompt, q.modelAnswer, ...q.keyPoints)
      break
  }
  return texts.filter(Boolean)
}
