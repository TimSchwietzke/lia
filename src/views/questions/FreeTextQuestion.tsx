import { Check } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Markdown } from '../../ui/Markdown'
import { Key } from '../../ui/primitives'
import { useHotkeys } from '../../ui/useHotkeys'
import styles from './questions.module.css'
import { ActionBar, Explanation, Reveal, type QuestionProps } from './shared'

export function FreeTextQuestion({ question, onSubmit, onNext, active }: QuestionProps<'free_text'>) {
  const { t } = useTranslation()
  const [text, setText] = useState('')
  const [revealed, setRevealed] = useState(false)
  const [covered, setCovered] = useState<number[]>([])
  const [done, setDone] = useState(false)

  const reveal = () => setRevealed(true)
  const finish = () => {
    if (!done) onSubmit({ type: 'free_text', text, coveredKeyPoints: covered })
    setDone(true)
    onNext()
  }
  const toggle = (i: number) => {
    if (!done) setCovered((c) => (c.includes(i) ? c.filter((x) => x !== i) : [...c, i]))
  }

  useHotkeys(
    revealed
      ? {
          Enter: finish,
          'Ctrl+Enter': finish,
          ...Object.fromEntries(question.keyPoints.map((_, i) => [String(i + 1), () => toggle(i)])),
        }
      : { 'Ctrl+Enter': reveal },
    active,
  )

  return (
    <>
      <Markdown className={styles.prompt}>{question.prompt}</Markdown>

      {revealed ? (
        <Reveal>
          <section className={styles.block}>
            <h3>{t('freeText.yourAnswer')}</h3>
            <p className={styles.ownAnswer}>{text.trim() || t('freeText.noAnswer')}</p>
          </section>
          <section className={styles.block}>
            <h3>{t('freeText.modelAnswer')}</h3>
            <Markdown>{question.modelAnswer}</Markdown>
          </section>
          <section className={styles.block}>
            <div className={styles.blockHead}>
              <h3>{t('freeText.keyPoints')}</h3>
              <span className={styles.tally}>
                {t('freeText.covered', { count: covered.length, total: question.keyPoints.length })}
              </span>
            </div>
            <div className={styles.options} role="group" aria-label={t('freeText.keyPoints')}>
              {question.keyPoints.map((point, i) => (
                <div
                  key={i}
                  role="checkbox"
                  aria-checked={covered.includes(i)}
                  aria-disabled={done}
                  tabIndex={0}
                  className={styles.option}
                  data-state={covered.includes(i) ? 'correct' : 'idle'}
                  onClick={() => toggle(i)}
                  onKeyDown={(e) => {
                    if (e.key === ' ') {
                      e.preventDefault()
                      toggle(i)
                    }
                  }}
                >
                  <kbd className={styles.num}>{i + 1}</kbd>
                  <Markdown>{point}</Markdown>
                  {covered.includes(i) && <Check className={styles.mark} aria-hidden />}
                </div>
              ))}
            </div>
          </section>
          <Explanation question={question} />
        </Reveal>
      ) : (
        <textarea
          className={styles.textarea}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t('freeText.placeholder')}
          aria-label={t('freeText.placeholder')}
          autoFocus
          rows={7}
        />
      )}

      <ActionBar>
        {revealed ? (
          <Key variant="accent" size="md" onClick={finish}>
            {t('session.continue')} <kbd>{t('keys.enter')}</kbd>
          </Key>
        ) : (
          <Key variant="accent" size="md" onClick={reveal}>
            {t('freeText.reveal')} <kbd>{t('keys.ctrlEnter')}</kbd>
          </Key>
        )}
      </ActionBar>
    </>
  )
}
