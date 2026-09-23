import { Plus } from 'lucide-react'
import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useStore } from '../state/store'
import styles from './AddCourseTile.module.css'

/**
 * Sunk drop zone with a raised plus key. Click opens the file picker; dropping works anywhere in
 * the window. `wide` spans both columns of a two-column grid, so it never sits alone in a row.
 */
export function AddCourseTile({ wide = false }: { wide?: boolean }) {
  const { t } = useTranslation()
  const importFiles = useStore((s) => s.importFiles)
  const input = useRef<HTMLInputElement>(null)

  return (
    <>
      <button
        type="button"
        className={wide ? `${styles.drop} ${styles.wide}` : styles.drop}
        onClick={() => input.current?.click()}
      >
        <span className={`key key-icon ${styles.plus}`} aria-hidden>
          <Plus strokeWidth={2.2} />
        </span>
        <span className={styles.title}>{t('addCourse.title')}</span>
        <span className={styles.hint}>{t('addCourse.hint')}</span>
      </button>
      <input
        ref={input}
        type="file"
        accept=".json,.zip"
        multiple
        hidden
        onChange={(e) => {
          void importFiles([...(e.target.files ?? [])])
          e.target.value = ''
        }}
      />
    </>
  )
}
