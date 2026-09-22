import { useEffect, useRef } from 'react'

type Handlers = Partial<Record<string, () => void>>

/**
 * Window-wide keyboard shortcuts, keyed by `KeyboardEvent.key` with an optional "Ctrl+" prefix,
 * e.g. { Enter: check, '1': selectFirst, ' ': flip, 'Ctrl+Enter': reveal }.
 * While the user types in a field only Ctrl combinations and Escape fire. Like in a form, Space
 * toggles a focused toggle (chip, option) and Enter still submits; Enter and Space on a focused
 * plain button or link keep their native meaning.
 */
export function useHotkeys(handlers: Handlers) {
  const ref = useRef(handlers)
  useEffect(() => {
    ref.current = handlers
  })

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.isComposing || e.altKey || e.metaKey || e.defaultPrevented) return
      const key = (e.ctrlKey ? 'Ctrl+' : '') + e.key
      const handler = ref.current[key]
      if (!handler) return
      const target = e.target instanceof Element ? e.target : null
      const typing = target?.closest('input, textarea, select, [contenteditable="true"]')
      if (typing && !e.ctrlKey && e.key !== 'Escape') return
      if (!e.ctrlKey) {
        const toggle = target?.closest('[aria-pressed], [role="radio"], [role="checkbox"]')
        const button = target?.closest('button, a, summary')
        if (e.key === ' ' && (toggle || button)) return
        if (e.key === 'Enter' && button && !toggle) return
      }
      e.preventDefault()
      handler()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
