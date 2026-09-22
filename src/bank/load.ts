import { unzipSync } from 'fflate'
import type { z } from 'zod'
import { migrate } from '../lib/migrate'
import { bankMigrations, bankSchema, questionTexts, type Bank } from './schema'

export type LoadedBank = {
  bank: Bank
  fileName: string
  /** Image bytes keyed by their path inside the bank, e.g. "images/heap.png". */
  images: Map<string, Uint8Array>
}

export type LoadResult = { ok: true; value: LoadedBank } | { ok: false; fileName: string; errors: string[] }

const MAX_ERRORS = 12
const IMAGE_REF = /!\[[^\]]*\]\(\s*<?([^)\s>]+)/g

/** Parses and validates a .json or .zip question bank. Never throws. */
export function loadBankFile(fileName: string, data: Uint8Array): LoadResult {
  const fail = (...errors: string[]): LoadResult => ({ ok: false, fileName, errors })
  const lower = fileName.toLowerCase()

  let json: string
  let images = new Map<string, Uint8Array>()
  if (lower.endsWith('.zip')) {
    let entries: Record<string, Uint8Array>
    try {
      entries = unzipSync(data)
    } catch {
      return fail('This is not a valid .zip file.')
    }
    const paths = Object.keys(entries).filter(
      (p) => !p.endsWith('/') && !p.startsWith('__MACOSX/') && !p.split('/').some((s) => s.startsWith('.')),
    )
    const jsonPaths = paths.filter((p) => p.toLowerCase().endsWith('.json'))
    if (jsonPaths.length !== 1) {
      return fail(`The zip must contain exactly one .json file, found ${jsonPaths.length}.`)
    }
    // The zip may wrap everything in a folder; images/ lives next to the JSON file.
    const base = jsonPaths[0].slice(0, jsonPaths[0].lastIndexOf('/') + 1)
    json = new TextDecoder().decode(entries[jsonPaths[0]])
    images = new Map(
      paths
        .filter((p) => p.startsWith(`${base}images/`))
        .map((p) => [p.slice(base.length), entries[p]] as const),
    )
  } else if (lower.endsWith('.json')) {
    json = new TextDecoder().decode(data)
  } else {
    return fail('Unsupported file type. Question banks are .json or .zip files.')
  }

  let raw: unknown
  try {
    raw = JSON.parse(json)
  } catch (e) {
    return fail(`Not valid JSON: ${(e as Error).message}`)
  }

  let migrated: unknown
  try {
    migrated = migrate(raw, 'formatVersion', bankMigrations)
  } catch (e) {
    return fail((e as Error).message)
  }

  const parsed = bankSchema.safeParse(migrated)
  if (!parsed.success) return fail(...formatIssues(parsed.error, migrated))

  const bank = parsed.data
  const imageErrors = bank.questions.flatMap((q, i) =>
    questionTexts(q).flatMap((t) =>
      [...t.matchAll(IMAGE_REF)].flatMap(([, src]) => {
        const path = resolveImagePath(src)
        const where = questionLabel(i, q.id)
        if (!path) return [`${where}: image "${src}" must be a file in the bank's images/ folder.`]
        if (!images.has(path)) {
          return [
            lower.endsWith('.zip')
              ? `${where}: image "${path}" was not found in the zip.`
              : `${where}: uses image "${path}", so the bank must be a .zip with an images/ folder.`,
          ]
        }
        return []
      }),
    ),
  )
  if (imageErrors.length) return fail(...imageErrors.slice(0, MAX_ERRORS))

  return { ok: true, value: { bank, fileName, images } }
}

/**
 * Maps an image reference from Markdown to its path inside the bank.
 * "heap.png", "./heap.png" and "images/heap.png" all become "images/heap.png".
 * Returns null for anything outside the bank (web URLs, absolute or parent paths).
 */
export function resolveImagePath(src: string): string | null {
  if (/^[a-z][a-z0-9+.-]*:/i.test(src) || src.startsWith('/') || src.includes('..')) return null
  const path = src.replace(/^\.\//, '')
  return path.startsWith('images/') ? path : `images/${path}`
}

function questionLabel(index: number, id: unknown): string {
  return `Question ${index + 1}${typeof id === 'string' ? ` (id "${id}")` : ''}`
}

/** Turns Zod issues into lines like: Question 4 (id "sort-03"), options: exactly one option ... */
function formatIssues(error: z.ZodError, raw: unknown): string[] {
  const questions = (raw as { questions?: unknown }).questions
  const lines = error.issues.map((issue) => {
    let path = [...issue.path]
    let where = ''
    if (path[0] === 'questions' && typeof path[1] === 'number') {
      const q: unknown = Array.isArray(questions) ? questions[path[1]] : undefined
      where = questionLabel(path[1], (q as { id?: unknown } | undefined)?.id)
      path = path.slice(2)
    }
    const field = path
      .map((p, i) => (typeof p === 'number' ? `[${p}]` : `${i ? '.' : ''}${String(p)}`))
      .join('')
    const location = [where, field].filter(Boolean).join(', ')
    return location ? `${location}: ${issue.message}` : issue.message
  })
  const more = lines.length - MAX_ERRORS
  return more > 0 ? [...lines.slice(0, MAX_ERRORS), `... and ${more} more`] : lines
}
