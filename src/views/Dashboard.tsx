import { Monitor, Moon, Plus, Sun, X } from 'lucide-react'
import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { courseColor } from '../bank/schema'
import { LANGUAGES } from '../i18n'
import { masteredCount } from '../practice/progress'
import { useStore, type BankError, type Course } from '../state/store'
import type { Language, Theme } from '../storage/types'
import { ProgressRing } from '../ui/ProgressRing'
import styles from './Dashboard.module.css'

export function Dashboard() {
  const { t } = useTranslation()
  const courses = useStore((s) => s.courses)
  const bankErrors = useStore((s) => s.bankErrors)
  const importFiles = useStore((s) => s.importFiles)
  const fileInput = useRef<HTMLInputElement>(null)
  const chooseFile = () => fileInput.current?.click()

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.wordmark}>lia</h1>
        <div className={styles.tools}>
          <button type="button" className="btn" onClick={chooseFile}>
            <Plus aria-hidden /> {t('header.addCourse')}
          </button>
          <ThemeSwitch />
          <LanguageSwitch />
        </div>
        <input
          ref={fileInput}
          type="file"
          accept=".json,.zip"
          multiple
          hidden
          onChange={(e) => {
            void importFiles([...(e.target.files ?? [])])
            e.target.value = ''
          }}
        />
      </header>

      {bankErrors.map((error) => (
        <ErrorSlab key={error.fileName} error={error} />
      ))}

      {courses.length === 0 ? (
        <button type="button" className={styles.empty} onClick={chooseFile}>
          <span className={styles.emptyTitle}>{t('dashboard.emptyTitle')}</span>
          <span className={styles.emptyBody}>{t('dashboard.emptyBody')}</span>
          <span className="btn btn-primary">{t('dashboard.chooseFile')}</span>
        </button>
      ) : (
        <section className={styles.grid} aria-label={t('dashboard.title')}>
          {courses.map((course) => (
            <CourseCard key={course.bank.course.id} course={course} />
          ))}
          <button type="button" className={styles.addTile} onClick={chooseFile}>
            <Plus aria-hidden />
            <span>{t('dashboard.addTile')}</span>
          </button>
        </section>
      )}
    </div>
  )
}

function CourseCard({ course }: { course: Course }) {
  const { t } = useTranslation()
  const attempts = useStore((s) => s.attempts)
  const go = useStore((s) => s.go)
  const { course: meta, questions } = course.bank
  const mastered = masteredCount(course.bank, attempts)
  const share = mastered / questions.length

  return (
    <article className={styles.card} data-color={courseColor(meta)}>
      <div className={styles.cardTop}>
        <span className={styles.emoji} aria-hidden>
          {meta.emoji ?? meta.name.charAt(0)}
        </span>
        <ProgressRing value={share} label={t('dashboard.ringLabel', { percent: Math.round(share * 100) })} />
      </div>
      <h2 className={styles.cardTitle}>{meta.name}</h2>
      <p className={styles.cardMeta}>
        {t('dashboard.questions', { count: questions.length })},{' '}
        {t('dashboard.mastered', { count: mastered })}
      </p>
      <button
        type="button"
        className={`btn btn-primary ${styles.cardAction}`}
        onClick={() => go({ name: 'setup', courseId: meta.id })}
      >
        {t('dashboard.practice')}
      </button>
    </article>
  )
}

function ErrorSlab({ error }: { error: BankError }) {
  const { t } = useTranslation()
  const dismiss = useStore((s) => s.dismissError)
  return (
    <section className={styles.error} role="alert">
      <div className={styles.errorHead}>
        <div>
          <h2 className={styles.errorTitle}>{t('dashboard.loadFailed', { file: error.fileName })}</h2>
          <p className={styles.errorHint}>{t('dashboard.loadFailedHint')}</p>
        </div>
        <button
          type="button"
          className="btn btn-ghost icon-btn"
          onClick={() => dismiss(error.fileName)}
          aria-label={t('dashboard.dismiss')}
          title={t('dashboard.dismiss')}
        >
          <X aria-hidden />
        </button>
      </div>
      <ul className={styles.errorList}>
        {error.errors.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ul>
    </section>
  )
}

const THEME_OPTIONS: { value: Theme; icon: typeof Sun; label: 'themeSystem' | 'themeLight' | 'themeDark' }[] =
  [
    { value: 'system', icon: Monitor, label: 'themeSystem' },
    { value: 'light', icon: Sun, label: 'themeLight' },
    { value: 'dark', icon: Moon, label: 'themeDark' },
  ]

function ThemeSwitch() {
  const { t } = useTranslation()
  const theme = useStore((s) => s.settings.theme)
  const update = useStore((s) => s.updateSettings)
  return (
    <div className={styles.segmented} role="radiogroup" aria-label={t('header.theme')}>
      {THEME_OPTIONS.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={theme === value}
          aria-label={t(`header.${label}`)}
          title={t(`header.${label}`)}
          onClick={() => void update({ theme: value })}
        >
          <Icon aria-hidden />
        </button>
      ))}
    </div>
  )
}

function LanguageSwitch() {
  const { t } = useTranslation()
  const language = useStore((s) => s.settings.language)
  const update = useStore((s) => s.updateSettings)
  return (
    <div className={styles.segmented} role="radiogroup" aria-label={t('header.language')}>
      {(Object.keys(LANGUAGES) as Language[]).map((value) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={language === value}
          lang={value}
          onClick={() => void update({ language: value })}
        >
          {LANGUAGES[value]}
        </button>
      ))}
    </div>
  )
}
