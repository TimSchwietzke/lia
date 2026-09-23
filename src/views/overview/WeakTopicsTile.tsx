import { useTranslation } from 'react-i18next'
import { courseColor } from '../../bank/schema'
import { formatPercent } from '../../i18n'
import type { QuestionRef, WeakTopic } from '../../practice/stats'
import { findCourse, useStore, type Course } from '../../state/store'
import { Key, Panel } from '../../ui/primitives'
import styles from './overview.module.css'

type Props = {
  topics: WeakTopic[]
  courses: Course[]
  /** Every weak question, for "Practice weak spots". */
  weak: QuestionRef[]
}

export function WeakTopicsTile({ topics, courses, weak }: Props) {
  const { t } = useTranslation()
  const startSession = useStore((s) => s.startSession)

  return (
    <Panel title={t('weakest.title')} className={styles.weakest}>
      <ul className={styles.weakList}>
        {topics.map(({ courseId, topic, share }) => {
          const meta = findCourse(courses, courseId)?.bank.course
          return (
            <li key={`${courseId}/${topic}`} data-color={meta && courseColor(meta)}>
              <span className={styles.weakDot} aria-hidden />
              <span className={styles.weakName}>{topic}</span>
              <span className={`mono ${styles.weakCode}`}>{meta?.code}</span>
              <span className={`mono ${styles.weakShare}`}>{formatPercent(share)}</span>
            </li>
          )
        })}
      </ul>
      <Key size="md" className={styles.weakKey} onClick={() => startSession(weak)}>
        {t('weakest.practice')}
      </Key>
    </Panel>
  )
}
