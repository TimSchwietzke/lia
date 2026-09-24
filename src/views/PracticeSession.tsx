import { Check, ChevronLeft, ChevronRight, CircleDot, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { courseColor, type Question } from '../bank/schema'
import { formatPercent } from '../i18n'
import { grade, type Answer, type Grade } from '../practice/grade'
import type { QuestionRef } from '../practice/stats'
import { findCourse, useStore, type Course } from '../state/store'
import { ImagesContext } from '../ui/markdownContext'
import { Bar, CodeBadge, Key, Label, Panel } from '../ui/primitives'
import { questionSnippet } from '../ui/snippet'
import { useHotkeys } from '../ui/useHotkeys'
import styles from './PracticeSession.module.css'
import { ChoiceQuestion } from './questions/ChoiceQuestion'
import { ClozeQuestion } from './questions/ClozeQuestion'
import { FlashcardQuestion } from './questions/FlashcardQuestion'
import { FreeTextQuestion } from './questions/FreeTextQuestion'

type Item = { ref: QuestionRef; course: Course; question: Question }
type Result = { ref: QuestionRef; grade: Grade }
type Status = 'open' | 'correct' | 'partly' | 'wrong'

const msSince = (start: number) => Math.round(performance.now() - start)
const statusOf = (g: Grade | undefined): Status =>
  !g ? 'open' : g.correct ? 'correct' : g.score > 0 ? 'partly' : 'wrong'

type Props = {
  items: QuestionRef[]
  /** Set when the session was planned in one course's practice setup. */
  courseId?: string
}

/**
 * Laid out like an ILIAS test: the question list on the left, the question in the middle, and
 * free navigation between questions. Visited questions stay mounted (hidden), so a half-written
 * answer survives jumping around.
 */
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
  const [visited, setVisited] = useState<ReadonlySet<number>>(() => new Set([0]))
  const [grades, setGrades] = useState<(Grade | undefined)[]>([])
  const [startedAt] = useState(() => Date.now())
  const [finishedAt, setFinishedAt] = useState<number | null>(null)
  const shownAt = useRef(0)
  const current = queue.at(index)
  const answered = grades.filter(Boolean).length

  useEffect(() => {
    shownAt.current = performance.now()
  }, [index])

  const goTo = (i: number) => {
    if (i < 0 || i >= queue.length) return
    setIndex(i)
    setVisited((v) => (v.has(i) ? v : new Set(v).add(i)))
  }
  const submitFor =
    (i: number) =>
    (answer: Answer): Grade => {
      const { ref, question } = queue[i]
      const result = grade(question, answer)
      setGrades((g) => Object.assign([...g], { [i]: result }))
      void recordAttempt({
        ...ref,
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
  /** After answering: the next unanswered question (wrapping around), or the summary if none is left. */
  const advance = () => {
    const open = queue.map((_, k) => (index + 1 + k) % queue.length).find((i) => i !== index && !grades[i])
    if (open === undefined) finish()
    else goTo(open)
  }
  const end = () => (answered ? finish() : go({ name: 'overview' }))

  useHotkeys(
    { Escape: end, ArrowLeft: () => goTo(index - 1), ArrowRight: () => goTo(index + 1) },
    finishedAt === null,
  )

  if (finishedAt !== null || !current) {
    const results = queue.flatMap((item, i): Result[] => {
      const g = grades[i]
      return g ? [{ ref: item.ref, grade: g }] : []
    })
    return <Summary results={results} elapsedMs={(finishedAt ?? startedAt) - startedAt} courseId={courseId} />
  }

  const meta = current.course.bank.course
  const singleCourse = queue.every((item) => item.course === queue[0].course)

  return (
    <div className={styles.layout} data-color={courseColor(meta)}>
      <Panel className={styles.sidebar}>
        <div className={styles.sideHead}>
          {singleCourse ? (
            <>
              <CodeBadge code={meta.code} />
              <h1>{meta.name}</h1>
            </>
          ) : (
            <h1>{t('session.mixed')}</h1>
          )}
        </div>
        <div className={styles.progress}>
          <Bar
            value={answered / queue.length}
            color="var(--course)"
            label={t('session.answered', { count: answered, total: queue.length })}
          />
          <span className="mono">
            {answered} / {queue.length}
          </span>
        </div>
        <nav className={styles.list} aria-label={t('session.questions')}>
          {queue.map((item, i) => {
            const status = statusOf(grades[i])
            const text = questionSnippet(item.question)
            return (
              <button
                key={i}
                type="button"
                className={`tab ${styles.item}`}
                aria-current={i === index ? 'step' : undefined}
                data-status={status}
                title={text}
                onClick={() => goTo(i)}
              >
                <span className={`mono ${styles.itemNum}`}>{i + 1}</span>
                <span className={styles.itemText}>{text}</span>
                <StatusMark status={status} />
              </button>
            )
          })}
        </nav>
        <Key size="md" onClick={end}>
          {t('session.end')}
        </Key>
      </Panel>

      <div className={styles.main}>
        <header className={styles.questionHead}>
          <span className={styles.questionNumber}>
            {t('session.progress', { current: index + 1, total: queue.length })}
          </span>
          {!singleCourse && <CodeBadge code={meta.code} small />}
          <span>{current.question.topic}</span>
          <Difficulty level={current.question.difficulty} />
        </header>

        {queue.map(
          (item, i) =>
            visited.has(i) && (
              <section
                key={i}
                hidden={i !== index}
                className={styles.question}
                lang={item.course.bank.course.language}
                data-color={courseColor(item.course.bank.course)}
              >
                <ImagesContext.Provider value={item.course.imageUrls}>
                  <QuestionView
                    question={item.question}
                    onSubmit={submitFor(i)}
                    onNext={advance}
                    active={i === index}
                  />
                </ImagesContext.Provider>
              </section>
            ),
        )}

        <nav className={styles.pager}>
          <Key disabled={index === 0} onClick={() => goTo(index - 1)}>
            <ChevronLeft aria-hidden />
            {t('session.previous')}
          </Key>
          <Key disabled={index === queue.length - 1} onClick={() => goTo(index + 1)}>
            {t('session.next')}
            <ChevronRight aria-hidden />
          </Key>
        </nav>
      </div>
    </div>
  )
}

type QuestionViewProps = {
  question: Question
  onSubmit: (a: Answer) => Grade
  onNext: () => void
  active: boolean
}

function QuestionView({ question, ...handlers }: QuestionViewProps) {
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

function StatusMark({ status }: { status: Status }) {
  const { t } = useTranslation()
  const label = {
    open: t('session.statusOpen'),
    correct: t('session.statusCorrect'),
    partly: t('session.statusPartly'),
    wrong: t('session.statusWrong'),
  }[status]
  const Icon = { open: null, correct: Check, partly: CircleDot, wrong: X }[status]
  return (
    <span className={styles.mark} data-status={status}>
      {Icon && <Icon aria-hidden />}
      <span className="visually-hidden">{label}</span>
    </span>
  )
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
