import { ArrowLeft, Check } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { courseColor, QUESTION_TYPES, type QuestionType } from '../bank/schema'
import { selectQuestions } from '../practice/select'
import { useStore, type Course } from '../state/store'
import { useHotkeys } from '../ui/useHotkeys'
import styles from './PracticeSetup.module.css'

const LIMITS = [10, 20, 50]

export function PracticeSetup({ course }: { course: Course }) {
  const { t } = useTranslation()
  const go = useStore((s) => s.go)
  const removeCourse = useStore((s) => s.removeCourse)
  const { course: meta, topics, questions } = course.bank
  const typesInBank = QUESTION_TYPES.filter((type) => questions.some((q) => q.type === type))

  const [selectedTopics, setSelectedTopics] = useState<string[]>(topics)
  const [selectedTypes, setSelectedTypes] = useState<QuestionType[]>(typesInBank)
  const [limit, setLimit] = useState<number | undefined>(undefined)
  const [confirmRemove, setConfirmRemove] = useState(false)

  const filter = { topics: selectedTopics, types: selectedTypes }
  const matching = selectQuestions(questions, filter).length
  const sessionSize = Math.min(limit ?? matching, matching)

  const start = () => {
    if (!sessionSize) return
    const picked = selectQuestions(questions, { ...filter, limit })
    go({
      name: 'session',
      courseId: meta.id,
      questionIds: picked.map((q) => q.id),
      sessionId: crypto.randomUUID(),
    })
  }
  const back = () => go({ name: 'dashboard' })
  useHotkeys({ Enter: start, Escape: back })

  return (
    <div className={styles.page} data-color={courseColor(meta)}>
      <button type="button" className="btn btn-ghost" onClick={back}>
        <ArrowLeft aria-hidden /> {t('setup.back')}
      </button>

      <h1 className={styles.title}>
        {meta.emoji && <span aria-hidden>{meta.emoji} </span>}
        {meta.name}
      </h1>

      <section className={styles.group}>
        <div className={styles.groupHead}>
          <h2>{t('setup.topics')}</h2>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setSelectedTopics(selectedTopics.length === topics.length ? [] : topics)}
          >
            {selectedTopics.length === topics.length ? t('setup.clear') : t('setup.selectAll')}
          </button>
        </div>
        <div className={styles.chips}>
          {topics.map((topic) => (
            <Chip
              key={topic}
              on={selectedTopics.includes(topic)}
              onToggle={() => setSelectedTopics(toggle(selectedTopics, topic))}
              count={questions.filter((q) => q.topic === topic).length}
            >
              {topic}
            </Chip>
          ))}
        </div>
      </section>

      {typesInBank.length > 1 && (
        <section className={styles.group}>
          <h2>{t('setup.types')}</h2>
          <div className={styles.chips}>
            {typesInBank.map((type) => (
              <Chip
                key={type}
                on={selectedTypes.includes(type)}
                onToggle={() => setSelectedTypes(toggle(selectedTypes, type))}
                count={questions.filter((q) => q.type === type).length}
              >
                {t(`types.${type}`)}
              </Chip>
            ))}
          </div>
        </section>
      )}

      <section className={styles.group}>
        <h2>{t('setup.count')}</h2>
        <div className={styles.chips} role="radiogroup" aria-label={t('setup.count')}>
          {[...LIMITS.filter((n) => n < matching), undefined].map((n) => (
            <button
              key={n ?? 'all'}
              type="button"
              role="radio"
              aria-checked={limit === n}
              className="chip"
              onClick={() => setLimit(n)}
            >
              {n ?? t('setup.all')}
            </button>
          ))}
        </div>
      </section>

      <div className={styles.footer}>
        {sessionSize ? (
          <button type="button" className="btn btn-primary" onClick={start}>
            {t('setup.start', { count: sessionSize })} <kbd>{t('keys.enter')}</kbd>
          </button>
        ) : (
          <p className={styles.noMatch}>{t('setup.noMatch')}</p>
        )}
      </div>

      {course.removable && (
        <div className={styles.danger}>
          {confirmRemove ? (
            <>
              <span>{t('setup.removeConfirm')}</span>
              <button type="button" className="btn" onClick={() => void removeCourse(meta.id)}>
                {t('setup.removeYes')}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setConfirmRemove(false)}>
                {t('setup.cancel')}
              </button>
            </>
          ) : (
            <button type="button" className="btn btn-ghost" onClick={() => setConfirmRemove(true)}>
              {t('setup.remove')}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function Chip(props: { on: boolean; onToggle: () => void; count: number; children: ReactNode }) {
  return (
    <button type="button" className="chip" aria-pressed={props.on} onClick={props.onToggle}>
      {props.on && <Check aria-hidden size={16} strokeWidth={3} />}
      {props.children}
      <span className="count">{props.count}</span>
    </button>
  )
}

function toggle<T>(list: readonly T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item]
}
