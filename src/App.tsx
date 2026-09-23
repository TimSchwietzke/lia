import { AnimatePresence, motion, MotionConfig } from 'motion/react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { findCourse, useStore } from './state/store'
import styles from './App.module.css'
import { AppHeader, type Section } from './views/AppHeader'
import { Courses } from './views/courses/Courses'
import { Overview } from './views/overview/Overview'
import { PracticeSession } from './views/PracticeSession'
import { PracticeSetup } from './views/PracticeSetup'

export function App() {
  const ready = useStore((s) => s.ready)
  const view = useStore((s) => s.view)
  const courses = useStore((s) => s.courses)
  const init = useStore((s) => s.init)
  const importFiles = useStore((s) => s.importFiles)
  const dragging = useFileDrop((files) => void importFiles(files))

  useEffect(() => {
    void init()
  }, [init])

  if (!ready) return null

  // A setup view whose course disappeared (removed, or broken after an update) falls back to the overview.
  const setupCourse = view.name === 'setup' ? findCourse(courses, view.courseId) : undefined
  let page: ReactNode
  let section: Section | undefined
  let pageKey: string = view.name
  if (view.name === 'session') {
    page = <PracticeSession key={view.sessionId} items={view.items} courseId={view.courseId} />
    pageKey = view.sessionId
  } else if (setupCourse) {
    page = <PracticeSetup course={setupCourse} />
    section = 'courses'
  } else if (view.name === 'courses') {
    page = <Courses />
    section = 'courses'
  } else {
    page = <Overview />
    section = 'overview'
    pageKey = 'overview'
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className={styles.app}>
        {section && <AppHeader section={section} />}
        <AnimatePresence mode="wait" initial={false}>
          <motion.main
            key={pageKey}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
          >
            {page}
          </motion.main>
        </AnimatePresence>
      </div>
      <DropOverlay visible={dragging} />
      <Notices />
    </MotionConfig>
  )
}

/** Tracks whether files are dragged over the window and hands dropped files to `onDrop`. */
function useFileDrop(onDrop: (files: File[]) => void) {
  const [dragging, setDragging] = useState(false)
  const onDropRef = useRef(onDrop)
  useEffect(() => {
    onDropRef.current = onDrop
  })
  useEffect(() => {
    let depth = 0
    const hasFiles = (e: DragEvent) => e.dataTransfer?.types.includes('Files') ?? false
    const enter = (e: DragEvent) => {
      if (!hasFiles(e)) return
      depth++
      setDragging(true)
    }
    const leave = (e: DragEvent) => {
      if (!hasFiles(e)) return
      depth = Math.max(0, depth - 1)
      if (depth === 0) setDragging(false)
    }
    const over = (e: DragEvent) => {
      if (hasFiles(e)) e.preventDefault()
    }
    const drop = (e: DragEvent) => {
      if (!hasFiles(e)) return
      e.preventDefault()
      depth = 0
      setDragging(false)
      onDropRef.current([...(e.dataTransfer?.files ?? [])])
    }
    window.addEventListener('dragenter', enter)
    window.addEventListener('dragleave', leave)
    window.addEventListener('dragover', over)
    window.addEventListener('drop', drop)
    return () => {
      window.removeEventListener('dragenter', enter)
      window.removeEventListener('dragleave', leave)
      window.removeEventListener('dragover', over)
      window.removeEventListener('drop', drop)
    }
  }, [])
  return dragging
}

function DropOverlay({ visible }: { visible: boolean }) {
  const { t } = useTranslation()
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className={styles.dropOverlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
        >
          <motion.div className={styles.dropWell} initial={{ scale: 0.96 }} animate={{ scale: 1 }}>
            {t('addCourse.drop')}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function Notices() {
  const { t } = useTranslation()
  const notices = useStore((s) => s.notices)
  const dismiss = useStore((s) => s.dismissNotice)
  return (
    <div className={styles.notices} role="status" aria-live="polite">
      <AnimatePresence>
        {notices.map((n) => (
          <motion.button
            key={n.id}
            type="button"
            className={styles.notice}
            data-kind={n.key === 'importFailed' ? 'error' : 'info'}
            onClick={() => dismiss(n.id)}
            layout
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.16 }}
          >
            {t(`notice.${n.key}`, n.values)}
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  )
}
