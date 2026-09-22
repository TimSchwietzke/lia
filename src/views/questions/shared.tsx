import { CircleCheck, CircleDot, CircleX } from 'lucide-react'
import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { Question, QuestionOf, QuestionType } from '../../bank/schema'
import type { AnswerOf, Grade } from '../../practice/grade'
import { Markdown } from '../../ui/Markdown'
import styles from './questions.module.css'

export type QuestionProps<T extends QuestionType> = {
  question: QuestionOf<T>
  /** Grades and records the answer, returns the grade. */
  onSubmit: (answer: AnswerOf<T>) => Grade
  /** Moves on to the next question. */
  onNext: () => void
}

/** Result line plus explanation, shown after checking a choice or cloze answer. */
export function Feedback({ grade, question }: { grade: Grade; question: Question }) {
  const { t } = useTranslation()
  const status = grade.correct ? 'correct' : grade.score > 0 ? 'partly' : 'incorrect'
  const Icon = { correct: CircleCheck, partly: CircleDot, incorrect: CircleX }[status]
  return (
    <Reveal>
      <p className={styles.status} data-status={status} role="status">
        <Icon aria-hidden /> {t(`session.${status}`)}
      </p>
      <Explanation question={question} />
    </Reveal>
  )
}

export function Explanation({ question }: { question: Question }) {
  const { t } = useTranslation()
  const source = question.source && (
    <p className={styles.source}>{t('session.source', { source: question.source })}</p>
  )
  if (!question.explanation) return source
  return (
    <div className={styles.explanation}>
      <Markdown>{question.explanation}</Markdown>
      {source}
    </div>
  )
}

/** Fades in content that appears after an answer. */
export function Reveal({ children }: { children: ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
      {children}
    </motion.div>
  )
}

export function ActionBar({ children }: { children: ReactNode }) {
  return <div className={styles.actions}>{children}</div>
}
