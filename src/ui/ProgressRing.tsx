type Props = {
  /** 0..1 */
  value: number
  label: string
  size?: number
}

/** Circular progress in the current course accent colour, with the percentage in the middle. */
export function ProgressRing({ value, label, size = 56 }: Props) {
  const stroke = size / 9
  const r = (size - stroke) / 2
  const circumference = 2 * Math.PI * r
  const percent = Math.round(value * 100)
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={label}
      style={{ flex: 'none' }}
    >
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--subtle)" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--accent, var(--ink))"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - value)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 600ms var(--ease)', opacity: value > 0 ? 1 : 0 }}
      />
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="central"
        fill="var(--ink)"
        fontSize={size / 4.2}
        fontWeight={800}
      >
        {percent}%
      </text>
    </svg>
  )
}
