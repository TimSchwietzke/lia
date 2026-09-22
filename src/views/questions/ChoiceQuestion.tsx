import { Check, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Grade } from '../../practice/grade'
import { shuffle } from '../../practice/select'
import { Markdown } from '../../ui/Markdown'
import { useHotkeys } from '../../ui/useHotkeys'
import styles from './questions.module.css'
import { ActionBar, Feedback, type QuestionProps } from './shared'

type OptionState = 'idle' | 'selected' | 'correct' | 'wrong' | 'missed' | 'dimmed'

export function ChoiceQuestion({
  question,
  onSubmit,
  onNext,
}: QuestionProps<'single_choice' | 'multiple_choice'>) {
  const { t } = useTranslation()
  const multi = question.type === 'multiple_choice'
  // Display order is shuffled; answers always refer to the option index in the bank.
  const order = useMemo(() => shuffle(question.options.map((_, i) => i)), [question])
  const [selected, setSelected] = useState<number[]>([])
  const [grade, setGrade] = useState<Grade | null>(null)

  const toggle = (i: number) => {
    if (grade) return
    setSelected((s) => (multi ? (s.includes(i) ? s.filter((x) => x !== i) : [...s, i]) : [i]))
  }
  const check = () => {
    if (!grade && selected.length) setGrade(onSubmit({ type: question.type, selected }))
  }
  const stateOf = (i: number): OptionState => {
    const isSelected = selected.includes(i)
    if (!grade) return isSelected ? 'selected' : 'idle'
    const { correct } = question.options[i]
    if (isSelected) return correct ? 'correct' : 'wrong'
    return correct ? 'missed' : 'dimmed'
  }

  useHotkeys({
    Enter: grade ? onNext : check,
    ...Object.fromEntries(
      order.map((optionIndex, position) => [String(position + 1), () => toggle(optionIndex)]),
    ),
  })

  return (
    <>
      <Markdown className={styles.prompt}>{question.prompt}</Markdown>
      <p className={styles.hint}>{multi ? t('session.selectMany') : t('session.selectOne')}</p>

      <div className={styles.options} role={multi ? 'group' : 'radiogroup'}>
        {order.map((i, position) => {
          const option = question.options[i]
          const state = stateOf(i)
          return (
            <div
              key={i}
              role={multi ? 'checkbox' : 'radio'}
              aria-checked={selected.includes(i)}
              aria-disabled={grade !== null}
              tabIndex={0}
              className={styles.option}
              data-state={state}
              onClick={() => toggle(i)}
              onKeyDown={(e) => {
                if (e.key === ' ') {
                  e.preventDefault()
                  toggle(i)
                }
              }}
            >
              <kbd className={styles.key}>{position + 1}</kbd>
              <div>
                <Markdown>{option.text}</Markdown>
                {grade && option.why && <Markdown className={styles.why}>{option.why}</Markdown>}
              </div>
              {(state === 'correct' || state === 'missed') && <Check className={styles.mark} aria-hidden />}
              {state === 'wrong' && <X className={styles.mark} aria-hidden />}
            </div>
          )
        })}
      </div>

      {grade && <Feedback grade={grade} question={question} />}

      <ActionBar>
        {grade ? (
          <button type="button" className="btn btn-primary" onClick={onNext}>
            {t('session.continue')} <kbd>{t('keys.enter')}</kbd>
          </button>
        ) : (
          <button type="button" className="btn btn-primary" onClick={check} disabled={!selected.length}>
            {t('session.check')} <kbd>{t('keys.enter')}</kbd>
          </button>
        )}
      </ActionBar>
    </>
  )
}
