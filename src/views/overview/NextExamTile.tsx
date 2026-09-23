import { useTranslation } from 'react-i18next'
import { formatDay, formatPercent } from '../../i18n'
import type { CourseStats, UpcomingExam } from '../../practice/stats'
import { useStore, type Course } from '../../state/store'
import { Bar, Key, Panel } from '../../ui/primitives'
import styles from './overview.module.css'

type Props = {
  exams: UpcomingExam[]
  perCourse: { course: Course; stats: CourseStats }[]
}

export function NextExamTile({ exams, perCourse }: Props) {
  const { t } = useTranslation()
  const go = useStore((s) => s.go)
  const find = (courseId: string) => perCourse.find((p) => p.course.bank.course.id === courseId)
  const [next, after] = exams
  const current = next && find(next.courseId)

  if (!next || !current) {
    return (
      <Panel label={t('exam.label')} className={styles.exam}>
        <p className={styles.muted}>{t('exam.none')}</p>
        <Key className={styles.examSet} onClick={() => go({ name: 'courses' })}>
          {t('exam.set')}
        </Key>
      </Panel>
    )
  }

  const prepared = current.stats.learned / current.stats.total
  const date = formatDay(next.date, { weekday: 'short', day: 'numeric', month: 'short' })

  return (
    <Panel label={t('exam.label')} className={styles.exam}>
      <div>
        <div className={styles.examCourse}>{current.course.bank.course.name}</div>
        <div className={styles.headlineSm}>
          {next.days === 0 ? (
            <span className={styles.bigSm}>{t('exam.today')}</span>
          ) : (
            <>
              <span className={styles.bigSm}>{next.days}</span>
              <span className={styles.muted14}>
                {t('exam.days', { count: next.days })} · {date}
              </span>
            </>
          )}
        </div>
      </div>
      <div className={styles.barBlock}>
        <div className={styles.barHead}>
          <span>{t('exam.prepared')}</span>
          <span className={`mono ${styles.strong}`}>{formatPercent(prepared)}</span>
        </div>
        <Bar value={prepared} color="var(--good)" thick label={t('exam.prepared')} />
      </div>
      {after && (
        <div className={styles.examAfter}>
          <span>{t('exam.after', { name: find(after.courseId)?.course.bank.course.name })}</span>
          <span className="mono">{t('exam.shortDays', { count: after.days })}</span>
        </div>
      )}
    </Panel>
  )
}
