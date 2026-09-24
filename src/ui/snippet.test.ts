import { describe, expect, it } from 'vitest'
import { plainText } from './snippet'

describe('plainText', () => {
  it('keeps the words and drops markup, code blocks and images', () => {
    expect(plainText('How many calls does `f(5)` make?\n\n```python\ndef f(n): ...\n```')).toBe(
      'How many calls does f(5) make?',
    )
    expect(plainText('What is the **in-order** traversal?\n\n![tree](images/bst.svg)')).toBe(
      'What is the in-order traversal?',
    )
  })

  it('turns simple math into readable text and blanks into an ellipsis', () => {
    expect(plainText('Running time on $n$ elements: $O(n \\log n)$')).toBe(
      'Running time on n elements: O(n log n)',
    )
    expect(plainText('Merge sort splits the input into {{1}} halves')).toBe(
      'Merge sort splits the input into … halves',
    )
  })

  it('shortens long text', () => {
    expect(plainText('word '.repeat(50), 20)).toBe('word word word word…')
  })
})
