import { useTranslation } from 'react-i18next'
import { Panel } from '../ui/primitives'
import styles from './FolderError.module.css'

/** Shown instead of the app when lia cannot write next to itself. It never uses another folder. */
export function FolderError({ data }: { data: string }) {
  const { t } = useTranslation()
  const folder = data.replace(/[\\/]data$/, '')
  const mac = navigator.userAgent.includes('Mac')
  return (
    <Panel className={styles.panel} role="alert">
      <h1>{t('folderError.title')}</h1>
      <p>{t('folderError.body')}</p>
      <p className={`mono ${styles.path}`}>{folder}</p>
      <p>{t('folderError.fix')}</p>
      {mac && <p className={styles.muted}>{t('folderError.mac')}</p>}
    </Panel>
  )
}
