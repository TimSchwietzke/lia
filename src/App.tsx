import { AnimatePresence, motion, MotionConfig } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { findCourse, useStore } from './state/store'
import styles from './App.module.css'
import { Dashboard } from './views/Dashboard'
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

  // A view whose course disappeared (removed or broken after an update) falls back to the dashboard.
  const course = view.name === 'dashboard' ? undefined : findCourse(courses, view.courseId)
  const page =
    view.name === 'setup' && course ? (
      <PracticeSetup course={course} />
    ) : view.name === 'session' && course ? (
      <PracticeSession key={view.sessionId} course={course} questionIds={view.questionIds} />
    ) : (
      <Dashboard />
    )
  const pageKey = course ? `${view.name}:${view.name === 'session' ? view.sessionId : ''}` : 'dashboard'

  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={pageKey}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.14 }}
        >
          {page}
        </motion.div>
      </AnimatePresence>
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
            {t('drop.overlay')}
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
