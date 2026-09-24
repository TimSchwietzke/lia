import type { Question } from '../bank/schema'

const TEX: Record<string, string> = {
  alpha: 'α',
  beta: 'β',
  Theta: 'Θ',
  Omega: 'Ω',
  log: 'log',
  cdot: '·',
  le: '≤',
  ge: '≥',
  in: '∈',
  sum: 'Σ',
  infty: '∞',
  to: '→',
}

/** One line of plain text from Markdown, for lists: code blocks, images and markup are dropped. */
export function plainText(markdown: string, max = 120): string {
  const text = markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\$\$[\s\S]*?\$\$/g, ' … ')
    .replace(/\$([^$]+)\$/g, (_, tex: string) =>
      tex.replace(/\\([a-zA-Z]+)/g, (__, name: string) => TEX[name] ?? '').replace(/[{}\\]/g, ''),
    )
    .replace(/\{\{\d+\}\}/g, '…')
    .replace(/[*_`#>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text
}

/** The text a question list shows for a question. */
export function questionSnippet(q: Question): string {
  switch (q.type) {
    case 'flashcard':
      return plainText(q.front)
    case 'cloze':
      return plainText(q.text)
    default:
      return plainText(q.prompt)
  }
}
