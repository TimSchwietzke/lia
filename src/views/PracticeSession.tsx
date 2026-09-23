import { X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { courseColor, type Question } from '../bank/schema'
import { formatPercent } from '../i18n'
import { grade, type Answer, type Grade } from '../practice/grade'
import type { QuestionRef } from '../practice/stats'
import { findCourse, useStore, type Course } from '../state/store'
import { ImagesContext } from '../ui/markdownContext'
import { Bar, CodeBadge, Key, Label, Panel } from '../ui/primitives'
import { useHotkeys } from '../ui/useHotkeys'
import styles from './PracticeSession.module.css'
import { ChoiceQuestion } from './questions/ChoiceQuestion'
import { ClozeQuestion } from './questions/ClozeQuestion'
import { FlashcardQuestion } from './questions/FlashcardQuestion'
import { FreeTextQuestion } from './questions/FreeTextQuestion'

type Item = { ref: QuestionRef; course: Course; question: Question }

const msSince = (start: number) => Math.round(performance.now() - start)
type Result = { ref: QuestionRef; grade: Grade }

type Props = {
  items: QuestionRef[]
  /** Set when the session was planned in one course's practice setup. */
  courseId?: string
}

export function PracticeSession({ items, courseId }: Props) {
  const { t } = useTranslation()
  const go = useStore((s) => s.go)
  const courses = useStore((s) => s.courses)
  const recordAttempt = useStore((s) => s.recordAttempt)

  // Questions whose course or bank entry disappeared since the session was planned are skipped.
  const queue = useMemo(
    () =>
      items.flatMap((ref): Item[] => {
        const course = findCourse(courses, ref.courseId)
        const question = course?.bank.questions.find((q) => q.id === ref.questionId)
        return course && question ? [{ ref, course, question }] : []
      }),
    [items, courses],
  )
  const [index, setIndex] = useState(0)
  const [results, setResults] = useState<Result[]>([])
  const [startedAt] = useState(() => Date.now())
  const [finishedAt, setFinishedAt] = useState<number | null>(null)
  const shownAt = useRef(0)
  const current = queue.at(index)

  useEffect(() => {
    shownAt.current = performance.now()
  }, [index])

  const submit = (answer: Answer): Grade => {
    if (!current) throw new Error('No current question')
    const result = grade(current.question, answer)
    setResults((r) => [...r, { ref: current.ref, grade: result }])
    void recordAttempt({
      courseId: current.ref.courseId,
      questionId: current.ref.questionId,
      mode: 'practice',
      answer,
      score: result.score,
      correct: result.correct,
      answeredAt: new Date().toISOString(),
      durationMs: msSince(shownAt.current),
    })
    return result
  }
  const finish = () => setFinishedAt(Date.now())
  const next = () => (index + 1 < queue.length ? setIndex(index + 1) : finish())
  const end = () => (results.length ? finish() : go({ name: 'overview' }))

  if (finishedAt !== null || !current) {
    return <Summary results={results} elapsedMs={(finishedAt ?? startedAt) - startedAt} courseId={courseId} />
  }

  const meta = current.course.bank.course
  return (
    <div className={styles.page} data-color={courseColor(meta)}>
      <SessionHotkeys onEscape={end} />
      <header className={styles.bar}>
        <Key
          size="icon"
          className={styles.end}
          onClick={end}
          aria-label={t('session.end')}
          title={t('session.end')}
        >
          <X aria-hidden />
        </Key>
        <Bar
          value={index / queue.length}
          color="var(--course)"
          thick
          label={t('session.progress', { current: index + 1, total: queue.length })}
        />
        <span className={`mono ${styles.count}`}>
          {index + 1} / {queue.length}
        </span>
      </header>

      <ImagesContext.Provider value={current.course.imageUrls}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.article
            key={index}
            lang={meta.language}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.14 }}
          >
            <div className={styles.meta}>
              <CodeBadge code={meta.code} small />
              <span>{current.question.topic}</span>
              <Difficulty level={current.question.difficulty} />
            </div>
            <QuestionView question={current.question} onSubmit={submit} onNext={next} />
          </motion.article>
        </AnimatePresence>
      </ImagesContext.Provider>
    </div>
  )
}

function QuestionView(props: { question: Question; onSubmit: (a: Answer) => Grade; onNext: () => void }) {
  const { question, ...handlers } = props
  switch (question.type) {
    case 'single_choice':
    case 'multiple_choice':
      return <ChoiceQuestion question={question} {...handlers} />
    case 'flashcard':
      return <FlashcardQuestion question={question} {...handlers} />
    case 'cloze':
      return <ClozeQuestion question={question} {...handlers} />
    case 'free_text':
      return <FreeTextQuestion question={question} {...handlers} />
  }
}

/** Separate component so Escape works in every question without each one registering it. */
function SessionHotkeys({ onEscape }: { onEscape: () => void }) {
  useHotkeys({ Escape: onEscape })
  return null
}

function Difficulty({ level }: { level: number }) {
  const { t } = useTranslation()
  return (
    <span className={styles.difficulty} role="img" aria-label={t('session.difficulty', { level })}>
      {[1, 2, 3].map((n) => (
        <span key={n} data-on={n <= level} />
      ))}
    </span>
  )
}

function Summary({
  results,
  elapsedMs,
  courseId,
}: {
  results: Result[]
  elapsedMs: number
  courseId?: string
}) {
  const { t } = useTranslation()
  const go = useStore((s) => s.go)
  const startSession = useStore((s) => s.startSession)
  const correct = results.filter((r) => r.grade.correct).length
  const average = results.length ? results.reduce((sum, r) => sum + r.grade.score, 0) / results.length : 0
  const mistakes = results.filter((r) => !r.grade.correct).map((r) => r.ref)
  const seconds = Math.round(elapsedMs / 1000)

  const retry = () => startSession(mistakes, courseId)
  const back = () => go({ name: 'overview' })
  useHotkeys({ Enter: mistakes.length ? retry : back, Escape: back })

  return (
    <Panel className={styles.summary}>
      <Label>{t('summary.label')}</Label>
      <div className={styles.score}>
        <span className={styles.big}>{formatPercent(average)}</span>
        <span className={styles.muted}>{t('summary.score')}</span>
      </div>
      <p className={styles.muted}>
        {t('summary.correct', { count: correct, total: results.length })} ·{' '}
        <span className="mono">
          {seconds < 60
            ? t('summary.durationShort', { seconds })
            : t('summary.duration', { minutes: Math.floor(seconds / 60), seconds: seconds % 60 })}
        </span>
      </p>
      <div className={styles.summaryActions}>
        {mistakes.length > 0 && (
          <Key variant="accent" size="lg" onClick={retry}>
            {t('summary.retry', { count: mistakes.length })}
            <kbd>{t('keys.enter')}</kbd>
          </Key>
        )}
        {courseId && (
          <Key size="lg" onClick={() => go({ name: 'setup', courseId })}>
            {t('summary.again')}
          </Key>
        )}
        <Key size="lg" onClick={back}>
          {t('summary.back')}
          {!mistakes.length && <kbd>{t('keys.enter')}</kbd>}
        </Key>
      </div>
    </Panel>
  )
}
