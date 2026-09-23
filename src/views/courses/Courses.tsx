import { X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { courseColor } from '../../bank/schema'
import { useStore, type BankError, type Course } from '../../state/store'
import { CodeBadge, Key, Panel } from '../../ui/primitives'
import { AddCourseTile } from '../AddCourseTile'
import styles from './Courses.module.css'

export function Courses() {
  const courses = useStore((s) => s.courses)
  const bankErrors = useStore((s) => s.bankErrors)

  return (
    <div className={styles.grid}>
      {bankErrors.map((error) => (
        <ErrorPanel key={error.fileName} error={error} />
      ))}
      {courses.map((course) => (
        <CoursePanel key={course.bank.course.id} course={course} />
      ))}
      <AddCourseTile wide={courses.length % 2 === 0} />
    </div>
  )
}

function CoursePanel({ course }: { course: Course }) {
  const { t } = useTranslation()
  const go = useStore((s) => s.go)
  const removeCourse = useStore((s) => s.removeCourse)
  const setExamDate = useStore((s) => s.setExamDate)
  const examDate = useStore((s) => s.courseSettings[course.bank.course.id]?.examDate)
  const [confirming, setConfirming] = useState(false)
  const { course: meta, questions, topics } = course.bank
  const dateId = `exam-${meta.id}`

  return (
    <Panel className={styles.course} data-color={courseColor(meta)}>
      <div className={styles.head}>
        <CodeBadge code={meta.code} />
        <div className={styles.name}>
          <h2>{meta.name}</h2>
          <p>
            {[
              t('course.meta', { count: questions.length }),
              t('courses.topics', { count: topics.length }),
              t('courses.version', { version: meta.version }),
            ].join(' · ')}
          </p>
          <p className="mono">{course.fileName}</p>
        </div>
      </div>

      <div className={styles.examRow}>
        <label htmlFor={dateId}>{t('courses.examDate')}</label>
        <div className={styles.dateField}>
          <input
            id={dateId}
            type="date"
            className={`mono ${styles.date}`}
            value={examDate ?? ''}
            onChange={(e) => void setExamDate(meta.id, e.target.value || undefined)}
          />
          {examDate && (
            <Key
              size="icon"
              className={styles.clear}
              aria-label={t('courses.clearExamDate')}
              title={t('courses.clearExamDate')}
              onClick={() => void setExamDate(meta.id, undefined)}
            >
              <X aria-hidden />
            </Key>
          )}
        </div>
      </div>

      <div className={styles.foot}>
        {confirming ? (
          <>
            <span className={styles.confirm}>{t('courses.removeConfirm')}</span>
            <Key onClick={() => void removeCourse(meta.id)}>{t('courses.remove')}</Key>
            <Key onClick={() => setConfirming(false)}>{t('courses.cancel')}</Key>
          </>
        ) : (
          <>
            {course.removable && <Key onClick={() => setConfirming(true)}>{t('courses.remove')}</Key>}
            <Key tone="course" onClick={() => go({ name: 'setup', courseId: meta.id })}>
              {t('course.practice')}
            </Key>
          </>
        )}
      </div>
    </Panel>
  )
}

function ErrorPanel({ error }: { error: BankError }) {
  const { t } = useTranslation()
  const dismiss = useStore((s) => s.dismissError)
  return (
    <Panel className={styles.error} role="alert">
      <div className={styles.errorHead}>
        <div>
          <h2>{t('errors.loadFailed', { file: error.fileName })}</h2>
          <p>{t('errors.hint')}</p>
        </div>
        <Key
          size="icon"
          aria-label={t('errors.dismiss')}
          title={t('errors.dismiss')}
          onClick={() => dismiss(error.fileName)}
        >
          <X aria-hidden />
        </Key>
      </div>
      <ul className={`mono ${styles.errorList}`}>
        {error.errors.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ul>
    </Panel>
  )
}
