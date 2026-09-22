import { createHighlighterCoreSync, type ShikiTransformer } from 'shiki/core'
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript'
import asm from 'shiki/langs/asm.mjs'
import c from 'shiki/langs/c.mjs'
import cpp from 'shiki/langs/cpp.mjs'
import csharp from 'shiki/langs/csharp.mjs'
import css from 'shiki/langs/css.mjs'
import go from 'shiki/langs/go.mjs'
import haskell from 'shiki/langs/haskell.mjs'
import html from 'shiki/langs/html.mjs'
import java from 'shiki/langs/java.mjs'
import javascript from 'shiki/langs/javascript.mjs'
import json from 'shiki/langs/json.mjs'
import kotlin from 'shiki/langs/kotlin.mjs'
import latex from 'shiki/langs/latex.mjs'
import prolog from 'shiki/langs/prolog.mjs'
import python from 'shiki/langs/python.mjs'
import rust from 'shiki/langs/rust.mjs'
import shellscript from 'shiki/langs/shellscript.mjs'
import sql from 'shiki/langs/sql.mjs'
import typescript from 'shiki/langs/typescript.mjs'
import xml from 'shiki/langs/xml.mjs'
import yaml from 'shiki/langs/yaml.mjs'
import latte from 'shiki/themes/catppuccin-latte.mjs'
import mocha from 'shiki/themes/catppuccin-mocha.mjs'

/** Languages available in code blocks (plus their usual aliases like py, js, sh). Add more here. */
export const highlighter = createHighlighterCoreSync({
  themes: [latte, mocha],
  langs: [
    asm,
    c,
    cpp,
    csharp,
    css,
    go,
    haskell,
    html,
    java,
    javascript,
    json,
    kotlin,
    latex,
    prolog,
    python,
    rust,
    shellscript,
    sql,
    typescript,
    xml,
    yaml,
  ],
  engine: createJavaScriptRegexEngine({ forgiving: true }),
})

export const THEMES = { light: 'catppuccin-latte', dark: 'catppuccin-mocha' } as const

/** Placeholder a cloze marker {{n}} is turned into before rendering; an identifier in every language. */
export const blankToken = (n: number | string) => `LIABLANK${n}LIA`
export const BLANK_TOKEN = /LIABLANK(\d+)LIA/g

/**
 * Makes sure each blank placeholder in a code block ends up in exactly one element carrying
 * `data-blank`, even where the grammar would split it into several tokens.
 */
export const blankDecorations: ShikiTransformer = {
  name: 'lia:blanks',
  preprocess(code, options) {
    options.decorations = [...code.matchAll(BLANK_TOKEN)].map((m) => ({
      start: m.index,
      end: m.index + m[0].length,
      properties: { dataBlank: m[1] },
      alwaysWrap: true,
    }))
  },
}
