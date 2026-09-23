import { Monitor, Moon, Settings, Sun } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { LANGUAGES } from '../i18n'
import { useStore } from '../state/store'
import type { Theme } from '../storage/types'
import { Key, Segmented } from '../ui/primitives'
import styles from './AppHeader.module.css'

export type Section = 'overview' | 'courses'

export function AppHeader({ section }: { section: Section }) {
  const { t } = useTranslation()
  const go = useStore((s) => s.go)
  const sections: Section[] = ['overview', 'courses']

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <div className={styles.logo}>lia</div>
        <nav className={styles.nav} aria-label={t('nav.label')}>
          {sections.map((name) => (
            <button
              key={name}
              type="button"
              className="tab"
              aria-current={section === name ? 'page' : undefined}
              onClick={() => go({ name })}
            >
              {t(`nav.${name}`)}
            </button>
          ))}
        </nav>
      </div>
      <SettingsMenu />
    </header>
  )
}

function SettingsMenu() {
  const { t } = useTranslation()
  const settings = useStore((s) => s.settings)
  const update = useStore((s) => s.updateSettings)
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const gear = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointer = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.preventDefault()
      setOpen(false)
      gear.current?.focus()
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const themes: { value: Theme; label: string; icon: ReactNode }[] = [
    { value: 'system', label: t('settings.system'), icon: <Monitor aria-hidden /> },
    { value: 'light', label: t('settings.light'), icon: <Sun aria-hidden /> },
    { value: 'dark', label: t('settings.dark'), icon: <Moon aria-hidden /> },
  ]

  return (
    <div className={styles.settings} ref={root}>
      <Key
        ref={gear}
        size="icon"
        tone="accent"
        down={open}
        aria-label={t('settings.open')}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen(!open)}
      >
        <Settings aria-hidden />
      </Key>
      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label={t('settings.open')}
            className={styles.popover}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
          >
            <div className={styles.field}>
              <span className={styles.fieldLabel}>{t('settings.appearance')}</span>
              <Segmented
                label={t('settings.appearance')}
                value={settings.theme}
                options={themes}
                onChange={(theme) => void update({ theme })}
              />
            </div>
            <div className={styles.row}>
              <span className={styles.fieldLabel}>{t('settings.language')}</span>
              <Key
                className={styles.language}
                onClick={() => void update({ language: settings.language === 'de' ? 'en' : 'de' })}
              >
                {LANGUAGES[settings.language]}
              </Key>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
