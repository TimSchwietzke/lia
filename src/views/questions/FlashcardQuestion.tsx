import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { RATINGS, type Rating } from '../../practice/grade'
import { Markdown } from '../../ui/Markdown'
import { useHotkeys } from '../../ui/useHotkeys'
import styles from './questions.module.css'
import { ActionBar, Explanation, type QuestionProps } from './shared'

export function FlashcardQuestion({ question, onSubmit, onNext }: QuestionProps<'flashcard'>) {
  const { t } = useTranslation()
  const [flipped, setFlipped] = useState(false)

  const flip = () => setFlipped(true)
  const rate = (rating: Rating) => {
    onSubmit({ type: 'flashcard', rating })
    onNext()
  }

  useHotkeys(
    flipped
      ? Object.fromEntries(RATINGS.map((rating, i) => [String(i + 1), () => rate(rating)]))
      : { ' ': flip, Enter: flip },
  )

  return (
    <>
      <div className={styles.flashcardStage}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={flipped ? 'back' : 'front'}
            className={styles.flashcard}
            data-side={flipped ? 'back' : 'front'}
            initial={{ rotateY: -80, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1 }}
            exit={{ rotateY: 80, opacity: 0 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            onClick={flipped ? undefined : flip}
          >
            {flipped ? (
              <>
                <Markdown className={styles.flashcardFront}>{question.front}</Markdown>
                <Markdown className={styles.flashcardBack}>{question.back}</Markdown>
              </>
            ) : (
              <Markdown className={styles.prompt}>{question.front}</Markdown>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {flipped && <Explanation question={question} />}

      <ActionBar>
        {flipped ? (
          <div className={styles.ratings}>
            <span className={styles.ratingLabel}>{t('flashcard.rate')}</span>
            {RATINGS.map((rating, i) => (
              <button key={rating} type="button" className="btn" onClick={() => rate(rating)}>
                {t(`flashcard.${rating}`)} <kbd>{i + 1}</kbd>
              </button>
            ))}
          </div>
        ) : (
          <button type="button" className="btn btn-primary" onClick={flip}>
            {t('flashcard.flip')} <kbd>{t('keys.space')}</kbd>
          </button>
        )}
      </ActionBar>
    </>
  )
}
