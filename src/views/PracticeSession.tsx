import { X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { courseColor, type Question } from '../bank/schema'
import { grade, type Answer, type Grade } from '../practice/grade'
import { useStore, type Course } from '../state/store'
import { ImagesContext } from '../ui/markdownContext'
import { ProgressRing } from '../ui/ProgressRing'
import { useHotkeys } from '../ui/useHotkeys'
import styles from './PracticeSession.module.css'
import { ChoiceQuestion } from './questions/ChoiceQuestion'
import { ClozeQuestion } from './questions/ClozeQuestion'
import { FlashcardQuestion } from './questions/FlashcardQuestion'
import { FreeTextQuestion } from './questions/FreeTextQuestion'

type Result = { questionId: string; grade: Grade }

export function PracticeSession({ course, questionIds }: { course: Course; questionIds: string[] }) {
  const { t } = useTranslation()
  const go = useStore((s) => s.go)
  const recordAttempt = useStore((s) => s.recordAttempt)
  const { course: meta } = course.bank

  // Questions deleted from the bank since the session was planned are skipped.
  const questions = useMemo(
    () =>
      questionIds.flatMap((id) => {
        const q = course.bank.questions.find((q) => q.id === id)
        return q ? [q] : []
      }),
    [course, questionIds],
  )
  const [index, setIndex] = useState(0)
  const [results, setResults] = useState<Result[]>([])
  const [startedAt] = useState(() => Date.now())
  const [finishedAt, setFinishedAt] = useState<number | null>(null)
  const shownAt = useRef(0)
  const question = questions.at(index)

  useEffect(() => {
    shownAt.current = performance.now()
  }, [index])

  const submit = (answer: Answer): Grade => {
    if (!question) throw new Error('No current question')
    const result = grade(question, answer)
    setResults((r) => [...r, { questionId: question.id, grade: result }])
    void recordAttempt({
      courseId: meta.id,
      questionId: question.id,
      mode: 'practice',
      answer,
      score: result.score,
      correct: result.correct,
      answeredAt: new Date().toISOString(),
      durationMs: Math.round(performance.now() - shownAt.current),
    })
    return result
  }
  const finish = () => setFinishedAt(Date.now())
  const next = () => (index + 1 < questions.length ? setIndex(index + 1) : finish())
  const end = () => (results.length ? finish() : go({ name: 'dashboard' }))

  if (finishedAt !== null || !question) {
    return <Summary course={course} results={results} elapsedMs={(finishedAt ?? startedAt) - startedAt} />
  }

  return (
    <div className={styles.page} data-color={courseColor(meta)}>
      <SessionHotkeys onEscape={end} />
      <header className={styles.bar}>
        <button
          type="button"
          className="btn btn-ghost icon-btn"
          onClick={end}
          aria-label={t('session.end')}
          title={t('session.end')}
        >
          <X aria-hidden />
        </button>
        <div
          className={styles.track}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={questions.length}
          aria-valuenow={index}
          aria-label={t('session.progress', { current: index + 1, total: questions.length })}
        >
          <div style={{ width: `${(index / questions.length) * 100}%` }} />
        </div>
        <span className={styles.count}>
          {index + 1} / {questions.length}
        </span>
      </header>

      <ImagesContext.Provider value={course.imageUrls}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.article
            key={index}
            lang={meta.language}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.15 }}
          >
            <div className={styles.meta}>
              <span>{question.topic}</span>
              <Difficulty level={question.difficulty} />
            </div>
            <QuestionView question={question} onSubmit={submit} onNext={next} />
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

function Summary({ course, results, elapsedMs }: { course: Course; results: Result[]; elapsedMs: number }) {
  const { t } = useTranslation()
  const go = useStore((s) => s.go)
  const { course: meta } = course.bank
  const correct = results.filter((r) => r.grade.correct).length
  const average = results.length ? results.reduce((sum, r) => sum + r.grade.score, 0) / results.length : 0
  const mistakes = results.filter((r) => !r.grade.correct).map((r) => r.questionId)
  const seconds = Math.round(elapsedMs / 1000)

  const retry = () =>
    go({ name: 'session', courseId: meta.id, questionIds: mistakes, sessionId: crypto.randomUUID() })
  const newSession = () => go({ name: 'setup', courseId: meta.id })
  const back = () => go({ name: 'dashboard' })
  useHotkeys({ Enter: mistakes.length ? retry : back, Escape: back })

  return (
    <div className={styles.summary} data-color={courseColor(meta)}>
      <ProgressRing
        value={average}
        size={148}
        label={`${t('summary.score')}: ${Math.round(average * 100)}%`}
      />
      <h1>{t('summary.title')}</h1>
      <p className={styles.summaryLine}>{t('summary.correct', { count: correct, total: results.length })}</p>
      <p className={styles.time}>
        {seconds < 60
          ? t('summary.durationShort', { seconds })
          : t('summary.duration', { minutes: Math.floor(seconds / 60), seconds: seconds % 60 })}
      </p>
      <div className={styles.summaryActions}>
        {mistakes.length > 0 && (
          <button type="button" className="btn btn-primary" onClick={retry}>
            {t('summary.retry', { count: mistakes.length })} <kbd>{t('keys.enter')}</kbd>
          </button>
        )}
        <button type="button" className="btn" onClick={newSession}>
          {t('summary.again')}
        </button>
        <button
          type="button"
          className={mistakes.length ? 'btn btn-ghost' : 'btn btn-primary'}
          onClick={back}
        >
          {t('summary.back')}
          {!mistakes.length && <kbd>{t('keys.enter')}</kbd>}
        </button>
      </div>
    </div>
  )
}
