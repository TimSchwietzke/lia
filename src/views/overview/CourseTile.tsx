import { useTranslation } from 'react-i18next'
import { courseColor } from '../../bank/schema'
import { formatPercent } from '../../i18n'
import type { CourseStats, UpcomingExam } from '../../practice/stats'
import { useStore, type Course } from '../../state/store'
import { Bar, CodeBadge, Key, Panel } from '../../ui/primitives'
import styles from './overview.module.css'

/** Exams this close get the "soon" colour on the chip. */
const SOON_DAYS = 28
const MAX_TOPICS = 4

type Props = { course: Course; stats: CourseStats; exam?: UpcomingExam }

export function CourseTile({ course, stats, exam }: Props) {
  const { t } = useTranslation()
  const go = useStore((s) => s.go)
  const meta = course.bank.course
  // The least learned topics are the most useful to see; ties keep the bank's order.
  const topics = stats.topics
    .filter((topic) => topic.total > 0)
    .sort((a, b) => a.learned / a.total - b.learned / b.total)
    .slice(0, MAX_TOPICS)

  const summary = [t('course.meta', { count: stats.total })]
  if (stats.accuracy !== undefined)
    summary.push(t('course.correct', { percent: formatPercent(stats.accuracy) }))
  const todo = [
    stats.fresh > 0 && t('course.fresh', { count: stats.fresh }),
    stats.weak > 0 && t('course.weak', { count: stats.weak }),
  ].filter(Boolean)

  return (
    <Panel className={styles.course} data-color={courseColor(meta)}>
      <div className={styles.courseHead}>
        <CodeBadge code={meta.code} />
        <div className={styles.courseName}>
          <h3>{meta.name}</h3>
          <p>{summary.join(' · ')}</p>
        </div>
        {exam && (
          <span className={`mono ${styles.examChip}`} data-soon={exam.days <= SOON_DAYS}>
            {exam.days === 0 ? t('exam.today') : t('exam.inDays', { count: exam.days })}
          </span>
        )}
      </div>
      <div className={styles.topics}>
        {topics.map((topic) => {
          const share = topic.learned / topic.total
          return (
            <div key={topic.topic} className={styles.topic}>
              <span className={styles.topicName} title={topic.topic}>
                {topic.topic}
              </span>
              <Bar
                value={share}
                color="var(--course)"
                label={t('course.topicProgress', { topic: topic.topic, percent: formatPercent(share) })}
              />
              <span className={`mono ${styles.topicShare}`}>{formatPercent(share)}</span>
            </div>
          )
        })}
      </div>
      <div className={styles.courseFoot}>
        <span>{todo.length ? todo.join(' · ') : t('course.allLearned')}</span>
        <Key tone="course" onClick={() => go({ name: 'setup', courseId: meta.id })}>
          {t('course.practice')}
        </Key>
      </div>
    </Panel>
  )
}
