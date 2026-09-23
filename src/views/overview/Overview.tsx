import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  courseStats,
  heatmap,
  medianDuration,
  questionHistory,
  todayQueue,
  upcomingExams,
  weakestTopics,
  weekActivity,
} from '../../practice/stats'
import { useStore } from '../../state/store'
import { Key } from '../../ui/primitives'
import { AddCourseTile } from '../AddCourseTile'
import { ActivityTile } from './ActivityTile'
import { CourseTile } from './CourseTile'
import { NextExamTile } from './NextExamTile'
import styles from './overview.module.css'
import { TodayTile } from './TodayTile'
import { WeakTopicsTile } from './WeakTopicsTile'

/** The home screen: a 12-column bento grid. Tiles whose data arrives in later milestones are left out. */
export function Overview() {
  const { t } = useTranslation()
  const courses = useStore((s) => s.courses)
  const attempts = useStore((s) => s.attempts)
  const courseSettings = useStore((s) => s.courseSettings)
  const bankErrors = useStore((s) => s.bankErrors)
  const go = useStore((s) => s.go)

  const data = useMemo(() => {
    const now = new Date()
    const history = questionHistory(attempts)
    const perCourse = courses.map((course) => ({
      course,
      stats: courseStats(course.bank, attempts, history),
    }))
    return {
      now,
      perCourse,
      today: todayQueue(
        courses.map((c) => c.bank),
        history,
        now,
      ),
      week: weekActivity(attempts, now),
      heat: heatmap(attempts, now),
      median: medianDuration(attempts),
      weakest: weakestTopics(
        perCourse.map(({ course, stats }) => ({ courseId: course.bank.course.id, stats })),
      ),
      exams: upcomingExams(Object.values(courseSettings), new Set(courses.map((c) => c.bank.course.id)), now),
    }
  }, [courses, attempts, courseSettings])

  return (
    <div className={styles.grid}>
      {bankErrors.length > 0 && (
        <div className={styles.errors} role="alert">
          <span>{t('errors.summary', { count: bankErrors.length })}</span>
          <Key onClick={() => go({ name: 'courses' })}>{t('errors.show')}</Key>
        </div>
      )}
      <TodayTile today={data.today} week={data.week} median={data.median} now={data.now} />
      <NextExamTile exams={data.exams} perCourse={data.perCourse} />
      <div className={styles.courses}>
        {data.perCourse.map(({ course, stats }) => (
          <CourseTile
            key={course.bank.course.id}
            course={course}
            stats={stats}
            exam={data.exams.find((e) => e.courseId === course.bank.course.id)}
          />
        ))}
        <AddCourseTile wide={courses.length % 2 === 0} />
      </div>
      <div className={styles.side}>
        <ActivityTile cells={data.heat} attempts={attempts} />
        {data.weakest.length > 0 && (
          <WeakTopicsTile topics={data.weakest} courses={courses} weak={data.today.weak} />
        )}
      </div>
    </div>
  )
}
