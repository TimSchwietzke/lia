import type { ComponentProps, HTMLAttributes, KeyboardEvent, ReactNode } from 'react'
import styles from './primitives.module.css'

const cx = (...classes: (string | false | undefined)[]) => classes.filter(Boolean).join(' ')

type KeyProps = ComponentProps<'button'> & {
  variant?: 'default' | 'accent'
  size?: 'sm' | 'md' | 'lg' | 'icon'
  /** Label colour: the accent or the colour of the surrounding course (data-color). */
  tone?: 'accent' | 'course'
  /** Stays pressed, e.g. while its popover is open or while a toggle is on. */
  down?: boolean
}

/** Anything clickable. Lifts on hover, sinks when pressed. */
export function Key({ variant = 'default', size = 'sm', tone, down, className, type, ...rest }: KeyProps) {
  return (
    <button
      type={type ?? 'button'}
      className={cx(
        'key',
        size !== 'sm' && `key-${size}`,
        variant === 'accent' && 'key-accent',
        tone && `tone-${tone}`,
        down && 'is-down',
        className,
      )}
      {...rest}
    />
  )
}

type PanelProps = HTMLAttributes<HTMLElement> & {
  /** Small uppercase heading, as on the Today and Next exam tiles. */
  label?: string
  /** Regular heading, as on the Activity tile. */
  title?: string
  /** Shown to the right of the heading. */
  aside?: ReactNode
}

/** Raised tile. */
export function Panel({ label, title, aside, className, children, ...rest }: PanelProps) {
  return (
    <section className={cx(styles.panel, className)} {...rest}>
      {(label ?? title) && (
        <header className={styles.panelHead}>
          {label ? <Label>{label}</Label> : <h2 className={styles.title}>{title}</h2>}
          {aside && <span className={styles.aside}>{aside}</span>}
        </header>
      )}
      {children}
    </section>
  )
}

/** Small uppercase tile heading. */
export function Label({ children }: { children: ReactNode }) {
  return <h2 className={styles.label}>{children}</h2>
}

/** Sunk info chip with an optional colour dot. */
export function Chip({
  dot,
  className,
  children,
}: {
  dot?: string
  className?: string
  children: ReactNode
}) {
  return (
    <span className={cx(styles.chip, className)}>
      {dot && <span className={styles.dot} style={{ background: dot }} aria-hidden />}
      {children}
    </span>
  )
}

/** Sunk badge with the course code, in the course colour. */
export function CodeBadge({ code, small }: { code: string; small?: boolean }) {
  return <span className={cx(styles.badge, small && styles.badgeSmall)}>{code}</span>
}

/** Sunk track with a filled part. `value` is 0..1. */
export function Bar({
  value,
  color,
  thick,
  label,
}: {
  value: number
  color: string
  thick?: boolean
  label?: string
}) {
  return (
    <div
      className={cx(styles.bar, thick && styles.barThick)}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value * 100)}
    >
      {value > 0 && <div style={{ width: `${value * 100}%`, background: color }} />}
    </div>
  )
}

type SegmentedProps<T extends string> = {
  label: string
  value: T
  options: { value: T; label: string; icon?: ReactNode }[]
  onChange: (value: T) => void
  className?: string
}

/** Sunk track; the chosen option is a raised key. Arrow keys move the choice. */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
}: SegmentedProps<T>) {
  const move = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]
    if (!step) return
    e.preventDefault()
    const index = options.findIndex((o) => o.value === value)
    const next = options[(index + step + options.length) % options.length]
    onChange(next.value)
    e.currentTarget.querySelectorAll<HTMLElement>('[role="radio"]')[options.indexOf(next)]?.focus()
  }
  return (
    <div className={cx(styles.segmented, className)} role="radiogroup" aria-label={label} onKeyDown={move}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          tabIndex={o.value === value ? 0 : -1}
          className="tab"
          onClick={() => onChange(o.value)}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  )
}
