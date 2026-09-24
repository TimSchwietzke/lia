import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { isBlankCorrect, type Grade } from '../../practice/grade'
import { Markdown } from '../../ui/Markdown'
import { BlankContext } from '../../ui/markdownContext'
import { Key } from '../../ui/primitives'
import { useHotkeys } from '../../ui/useHotkeys'
import styles from './questions.module.css'
import { ActionBar, Feedback, type QuestionProps } from './shared'

export function ClozeQuestion({ question, onSubmit, onNext, active }: QuestionProps<'cloze'>) {
  const { t } = useTranslation()
  const [values, setValues] = useState(() => question.blanks.map(() => ''))
  const [grade, setGrade] = useState<Grade | null>(null)

  const submit = () => {
    if (grade) onNext()
    else setGrade(onSubmit({ type: 'cloze', values }))
  }
  useHotkeys({ Enter: submit }, active)

  const renderBlank = useCallback(
    (n: number) => {
      const blank = question.blanks[n - 1]
      const value = values[n - 1] ?? ''
      const correct = grade ? isBlankCorrect(blank, value) : undefined
      return (
        <>
          <input
            className={styles.blank}
            data-state={correct === undefined ? undefined : correct ? 'correct' : 'wrong'}
            aria-label={t('cloze.blank', { n })}
            value={value}
            readOnly={grade !== null}
            autoFocus={n === 1}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            style={{ width: `${Math.max(6, value.length + 2)}ch` }}
            onChange={(e) => setValues((vs) => vs.map((v, i) => (i === n - 1 ? e.target.value : v)))}
          />
          {correct === false && (
            <span className={styles.expected} title={t('cloze.expected', { answer: blank.answers[0] })}>
              <span className="visually-hidden">{t('cloze.expected', { answer: '' })}</span>
              {blank.answers[0]}
            </span>
          )}
        </>
      )
    },
    [question, values, grade, t],
  )

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <BlankContext.Provider value={renderBlank}>
        <Markdown cloze className={styles.prompt}>
          {question.text}
        </Markdown>
      </BlankContext.Provider>

      {grade && <Feedback grade={grade} question={question} />}

      <ActionBar>
        <Key type="submit" variant="accent" size="md">
          {grade ? t('session.continue') : t('session.check')} <kbd>{t('keys.enter')}</kbd>
        </Key>
      </ActionBar>
    </form>
  )
}
