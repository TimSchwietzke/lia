import { Play } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { weekdayLabels } from '../../i18n'
import type { QuestionRef } from '../../practice/stats'
import { useStore } from '../../state/store'
import { Chip, Key, Label, Panel } from '../../ui/primitives'
import styles from './overview.module.css'

type Props = {
  today: { weak: QuestionRef[]; fresh: QuestionRef[] }
  /** Answers per day of this week, Monday first. */
  week: number[]
  /** Median answer time in ms, for the time estimate. */
  median?: number
  now: Date
}

export function TodayTile({ today, week, median, now }: Props) {
  const { t } = useTranslation()
  const startSession = useStore((s) => s.startSession)
  const total = today.weak.length + today.fresh.length
  const minutes = median && total ? Math.max(1, Math.round((total * median) / 60_000)) : undefined

  return (
    <Panel className={styles.today}>
      <div className={styles.todayMain}>
        <Label>{t('today.label')}</Label>
        <div className={styles.headline}>
          <span className={styles.big}>{total}</span>
          <span className={styles.muted15}>
            {t('today.questions', { count: total })}
            {minutes !== undefined && ` · ${t('today.minutes', { count: minutes })}`}
          </span>
        </div>
        {total > 0 && (
          <div className={styles.chips}>
            {today.fresh.length > 0 && (
              <Chip dot="var(--new)">{t('today.fresh', { count: today.fresh.length })}</Chip>
            )}
            {today.weak.length > 0 && (
              <Chip dot="var(--weak)">{t('today.weak', { count: today.weak.length })}</Chip>
            )}
          </div>
        )}
        <div className={styles.actions}>
          <Key
            variant="accent"
            size="lg"
            disabled={!total}
            onClick={() => startSession([...today.weak, ...today.fresh])}
          >
            <Play fill="currentColor" strokeWidth={0} aria-hidden />
            {t('today.start')}
          </Key>
        </div>
      </div>
      <WeekChart counts={week} todayIndex={(now.getDay() + 6) % 7} />
    </Panel>
  )
}

function WeekChart({ counts, todayIndex }: { counts: number[]; todayIndex: number }) {
  const { t } = useTranslation()
  const labels = weekdayLabels()
  const max = Math.max(1, ...counts)
  const total = counts.reduce((a, b) => a + b, 0)

  return (
    <div className={styles.week}>
      <div className={styles.weekHead}>
        <span>{t('today.thisWeek')}</span>
        <span className={`mono ${styles.strong}`}>{t('today.weekTotal', { count: total })}</span>
      </div>
      <ul className={styles.weekWell}>
        {counts.map((count, i) => {
          const state = i === todayIndex ? 'today' : count ? 'past' : 'empty'
          const text = t('today.dayAnswers', { day: labels[i], count })
          return (
            <li key={i} className={styles.weekDay} title={text}>
              <span className="visually-hidden">{text}</span>
              <span
                className={styles.weekBar}
                data-state={state}
                style={{ height: Math.max(4, Math.round((count / max) * 64)) }}
                aria-hidden
              />
              <span className={styles.weekLabel} data-state={state} aria-hidden>
                {labels[i]}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
