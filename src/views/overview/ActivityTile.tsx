import { useTranslation } from 'react-i18next'
import { formatDay, formatPercent } from '../../i18n'
import type { HeatCell } from '../../practice/stats'
import type { Attempt } from '../../storage/types'
import { Panel } from '../../ui/primitives'
import styles from './overview.module.css'

export function ActivityTile({ cells, attempts }: { cells: HeatCell[]; attempts: readonly Attempt[] }) {
  const { t } = useTranslation()
  const correct = attempts.filter((a) => a.correct).length
  const summary = [t('activity.total', { count: attempts.length })]
  if (attempts.length)
    summary.push(t('activity.correct', { percent: formatPercent(correct / attempts.length) }))

  return (
    <Panel title={t('activity.title')} aside={t('activity.range')}>
      <div className={styles.heatWell}>
        <div className={styles.heat} role="img" aria-label={`${t('activity.title')}, ${t('activity.range')}`}>
          {cells.map((cell, i) =>
            cell ? (
              <span
                key={i}
                className={styles.cell}
                data-level={cell.level}
                title={t('activity.cell', {
                  date: formatDay(cell.day, { day: 'numeric', month: 'short', year: 'numeric' }),
                  count: cell.count,
                })}
              />
            ) : (
              <span key={i} />
            ),
          )}
        </div>
      </div>
      <p className={`mono ${styles.muted12}`}>{summary.join(' · ')}</p>
    </Panel>
  )
}
