import type { Element, Root, RootContent } from 'hast'
import { describe, expect, it } from 'vitest'
import { blankDecorations, blankToken, highlighter, THEMES } from './highlight'

/** Text content of every element carrying data-blank, in document order. */
function blanks(node: Root | RootContent): string[] {
  if (node.type === 'element' && node.properties.dataBlank !== undefined) return [text(node)]
  return 'children' in node ? node.children.flatMap(blanks) : []
}
function text(node: Element | RootContent): string {
  if (node.type === 'text') return node.value
  return 'children' in node ? node.children.map(text).join('') : ''
}

describe('cloze blanks in highlighted code', () => {
  const code = `x = foo.${blankToken(1)}(${blankToken(2)}) + "${blankToken(3)}" + 0x${blankToken(4)}`

  it.each(highlighter.getLoadedLanguages())('each blank stays one element in %s', (lang) => {
    const hast = highlighter.codeToHast(code, {
      lang,
      themes: THEMES,
      defaultColor: false,
      transformers: [blankDecorations],
    })
    expect(blanks(hast)).toEqual([1, 2, 3, 4].map(blankToken))
  })
})
