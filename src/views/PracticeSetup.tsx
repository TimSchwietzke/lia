import { Play } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { courseColor, QUESTION_TYPES, type QuestionType } from '../bank/schema'
import { selectQuestions } from '../practice/select'
import { useStore, type Course } from '../state/store'
import { CodeBadge, Key, Panel, Segmented } from '../ui/primitives'
import { useHotkeys } from '../ui/useHotkeys'
import styles from './PracticeSetup.module.css'

const LIMITS = ['10', '20', '50']

export function PracticeSetup({ course }: { course: Course }) {
  const { t } = useTranslation()
  const go = useStore((s) => s.go)
  const startSession = useStore((s) => s.startSession)
  const { course: meta, topics, questions } = course.bank
  const typesInBank = QUESTION_TYPES.filter((type) => questions.some((q) => q.type === type))

  const [selectedTopics, setSelectedTopics] = useState<string[]>(topics)
  const [selectedTypes, setSelectedTypes] = useState<QuestionType[]>(typesInBank)
  const [limit, setLimit] = useState('all')

  const filter = { topics: selectedTopics, types: selectedTypes }
  const matching = selectQuestions(questions, filter).length
  const sessionSize = limit === 'all' ? matching : Math.min(Number(limit), matching)
  const limits = [...LIMITS.filter((n) => Number(n) < matching), 'all']

  const start = () => {
    if (!sessionSize) return
    const picked = selectQuestions(questions, { ...filter, limit: sessionSize })
    startSession(
      picked.map((q) => ({ courseId: meta.id, questionId: q.id })),
      meta.id,
    )
  }
  useHotkeys({ Enter: start, Escape: () => go({ name: 'overview' }) })

  return (
    <Panel className={styles.panel} data-color={courseColor(meta)}>
      <div className={styles.head}>
        <CodeBadge code={meta.code} />
        <div>
          <h1>{meta.name}</h1>
          <p>{t('course.meta', { count: questions.length })}</p>
        </div>
      </div>

      <section className={styles.group}>
        <div className={styles.groupHead}>
          <h2>{t('setup.topics')}</h2>
          <Key onClick={() => setSelectedTopics(selectedTopics.length === topics.length ? [] : topics)}>
            {selectedTopics.length === topics.length ? t('setup.clear') : t('setup.selectAll')}
          </Key>
        </div>
        <div className={styles.toggles}>
          {topics.map((topic) => (
            <Toggle
              key={topic}
              on={selectedTopics.includes(topic)}
              onToggle={() => setSelectedTopics(toggle(selectedTopics, topic))}
              count={questions.filter((q) => q.topic === topic).length}
            >
              {topic}
            </Toggle>
          ))}
        </div>
      </section>

      {typesInBank.length > 1 && (
        <section className={styles.group}>
          <h2>{t('setup.types')}</h2>
          <div className={styles.toggles}>
            {typesInBank.map((type) => (
              <Toggle
                key={type}
                on={selectedTypes.includes(type)}
                onToggle={() => setSelectedTypes(toggle(selectedTypes, type))}
                count={questions.filter((q) => q.type === type).length}
              >
                {t(`types.${type}`)}
              </Toggle>
            ))}
          </div>
        </section>
      )}

      <section className={styles.group}>
        <h2>{t('setup.count')}</h2>
        <Segmented
          className={styles.limits}
          label={t('setup.count')}
          value={limits.includes(limit) ? limit : 'all'}
          options={limits.map((n) => ({ value: n, label: n === 'all' ? t('setup.all') : n }))}
          onChange={setLimit}
        />
      </section>

      <div className={styles.footer}>
        {sessionSize ? (
          <Key variant="accent" size="lg" onClick={start}>
            <Play fill="currentColor" strokeWidth={0} aria-hidden />
            {t('setup.start', { count: sessionSize })}
            <kbd>{t('keys.enter')}</kbd>
          </Key>
        ) : (
          <p className={styles.noMatch}>{t('setup.noMatch')}</p>
        )}
      </div>
    </Panel>
  )
}

/** A key that stays pressed while it is on. */
function Toggle(props: { on: boolean; onToggle: () => void; count: number; children: ReactNode }) {
  return (
    <Key
      down={props.on}
      aria-pressed={props.on}
      tone={props.on ? 'course' : undefined}
      onClick={props.onToggle}
    >
      {props.children}
      <span className={`mono ${styles.count}`}>{props.count}</span>
    </Key>
  )
}

function toggle<T>(list: readonly T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item]
}
