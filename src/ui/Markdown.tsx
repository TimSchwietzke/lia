import rehypeShikiFromHighlighter from '@shikijs/rehype/core'
import type { Element, ElementContent, Root, RootContent } from 'hast'
import 'katex/dist/katex.min.css'
import { memo, useContext } from 'react'
import ReactMarkdown, { type Components, type Options } from 'react-markdown'
import rehypeKatex from 'rehype-katex'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import { resolveImagePath } from '../bank/load'
import { CLOZE_MARKER } from '../bank/schema'
import { blankDecorations, blankToken, BLANK_TOKEN, highlighter, THEMES } from './highlight'
import { BlankContext, ImagesContext } from './markdownContext'

const remarkPlugins: Options['remarkPlugins'] = [remarkGfm, remarkMath]
const rehypePlugins: Options['rehypePlugins'] = [
  [rehypeKatex, { throwOnError: false }],
  [
    rehypeShikiFromHighlighter,
    highlighter,
    { themes: THEMES, defaultColor: false, fallbackLanguage: 'text', transformers: [blankDecorations] },
  ],
  rehypeBlanks,
]

const components: Components = {
  span({ node: _, ...props }) {
    const blank = (props as { 'data-blank'?: string })['data-blank']
    return blank ? <Blank n={Number(blank)} /> : <span {...props} />
  },
  img({ src, alt }) {
    return <BankImage src={typeof src === 'string' ? src : ''} alt={alt ?? ''} />
  },
  a({ node: _, ...props }) {
    return <a {...props} target="_blank" rel="noreferrer" />
  },
}

type Props = {
  children: string
  /** Replace {{n}} markers with blanks (cloze questions only). */
  cloze?: boolean
  className?: string
}

/** Markdown with GFM, KaTeX math, highlighted code, bank images and optional cloze blanks. */
export const Markdown = memo(function Markdown({ children, cloze = false, className }: Props) {
  const text = cloze ? children.replace(CLOZE_MARKER, (_, n: string) => blankToken(n)) : children
  return (
    <div className={['md', className].filter(Boolean).join(' ')}>
      <ReactMarkdown remarkPlugins={remarkPlugins} rehypePlugins={rehypePlugins} components={components}>
        {text}
      </ReactMarkdown>
    </div>
  )
})

function Blank({ n }: { n: number }) {
  return useContext(BlankContext)(n)
}

function BankImage({ src, alt }: { src: string; alt: string }) {
  const images = useContext(ImagesContext)
  const path = resolveImagePath(src)
  const url = path ? images.get(path) : undefined
  return url ? <img src={url} alt={alt} /> : <span className="md-missing-image">{alt || src}</span>
}

/**
 * Rehype plugin: replaces cloze placeholders with empty <span data-blank="n"> elements.
 * In code blocks Shiki already wrapped each placeholder (see blankDecorations); in prose and
 * inline code the placeholder is plain text.
 */
function rehypeBlanks() {
  return (tree: Root) => {
    replaceBlanks(tree)
  }
}

function replaceBlanks(node: Root | Element) {
  node.children = (node.children as RootContent[]).flatMap((child): RootContent[] => {
    if (child.type === 'element') {
      const n = child.properties.dataBlank
      if (n !== undefined) return [blankElement(String(n))]
      replaceBlanks(child)
      return [child]
    }
    if (child.type !== 'text' || !child.value.includes('LIABLANK')) return [child]
    return child.value
      .split(new RegExp(BLANK_TOKEN.source))
      .map((part, i): ElementContent => (i % 2 ? blankElement(part) : { type: 'text', value: part }))
      .filter((part) => part.type !== 'text' || part.value !== '')
  }) as Root['children'] & Element['children']
}

function blankElement(n: string): Element {
  return { type: 'element', tagName: 'span', properties: { dataBlank: n }, children: [] }
}
