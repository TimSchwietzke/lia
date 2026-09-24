import { invoke as tauriInvoke, type InvokeArgs, type InvokeOptions } from '@tauri-apps/api/core'
import { migrate, type Doc, type Migration } from '../lib/migrate'
import {
  DEFAULT_SETTINGS,
  type Attempt,
  type CourseSettings,
  type Folders,
  type Settings,
  type Storage,
} from './types'

type Invoke = <T>(cmd: string, args?: InvokeArgs, options?: InvokeOptions) => Promise<T>

/*
 * Files in data/ (all plain text, readable and backup-friendly):
 *   settings.json   UI settings
 *   courses.json    per-course settings such as exam dates
 *   attempts.jsonl  the attempt log, one JSON object per line, append-only
 * Every document and every log line carries a "version". Older ones are upgraded by the
 * migrations below when they are read, so progress survives app updates.
 */
const SETTINGS = 'settings.json'
const COURSES = 'courses.json'
const ATTEMPTS = 'attempts.jsonl'

/** Per record kind: index 0 upgrades version 1 to 2, and so on. Append a step when a shape changes. */
export const dataMigrations: Record<'settings' | 'courses' | 'attempt', Migration[]> = {
  settings: [],
  courses: [],
  attempt: [],
}
type Kind = keyof typeof dataMigrations
const versionOf = (kind: Kind) => dataMigrations[kind].length + 1

const now = () => new Date().toISOString()

/** Upgrades one stored record and removes its version field. Throws if it cannot be read. */
function upgrade(raw: unknown, kind: Kind): Doc {
  const { version: _, ...doc } = migrate(raw, 'version', dataMigrations[kind])
  return doc
}

/** Storage for the desktop app: files in subjects/ and data/, through the commands in src-tauri. */
export function createFileStorage(invoke: Invoke): Storage {
  /** Reads a JSON document. A file that cannot be read is kept as a copy, never silently lost. */
  async function readDoc(name: string, kind: Kind): Promise<Doc | undefined> {
    const text = await invoke<string | null>('read_data', { name })
    if (text === null) return undefined
    try {
      return upgrade(JSON.parse(text), kind)
    } catch {
      await invoke('write_data', { name: `${name}.unreadable-${Date.now()}`, contents: text })
      return undefined
    }
  }

  const writeDoc = (name: string, kind: Kind, doc: object) =>
    invoke<void>('write_data', {
      name,
      contents: JSON.stringify({ version: versionOf(kind), ...doc }, null, 2),
    })

  async function readCourses(): Promise<CourseSettings[]> {
    const doc = await readDoc(COURSES, 'courses')
    return Array.isArray(doc?.courses) ? (doc.courses as CourseSettings[]) : []
  }

  return {
    async listBankFiles() {
      const names = await invoke<string[]>('list_bank_files')
      return Promise.all(
        names.map(async (name) => ({
          name,
          data: new Uint8Array(await invoke<ArrayBuffer>('read_bank_file', { name })),
          removable: true,
        })),
      )
    },

    async saveBankFile(name, data) {
      await invoke('write_bank_file', data, { headers: { 'x-file-name': name } })
    },

    async deleteBankFile(name) {
      await invoke('delete_bank_file', { name })
    },

    async listAttempts() {
      const text = (await invoke<string | null>('read_data', { name: ATTEMPTS })) ?? ''
      // A line that cannot be read is skipped here, but stays in the file.
      const attempts = text.split('\n').flatMap((line): Attempt[] => {
        if (!line.trim()) return []
        try {
          const attempt = upgrade(JSON.parse(line), 'attempt')
          return typeof attempt.id === 'string' && typeof attempt.answeredAt === 'string'
            ? [attempt as Attempt]
            : []
        } catch {
          return []
        }
      })
      return attempts.sort((a, b) => a.answeredAt.localeCompare(b.answeredAt))
    },

    async addAttempt(attempt) {
      const stored = { ...attempt, updatedAt: now() }
      const line = JSON.stringify({ version: versionOf('attempt'), ...stored })
      await invoke('append_data', { name: ATTEMPTS, line })
      return stored
    },

    listCourseSettings: readCourses,

    async saveCourseSettings(settings) {
      const stored = { ...settings, updatedAt: now() }
      const others = (await readCourses()).filter((c) => c.courseId !== stored.courseId)
      await writeDoc(COURSES, 'courses', { courses: [...others, stored] })
      return stored
    },

    async loadSettings() {
      const doc = await readDoc(SETTINGS, 'settings')
      return { ...DEFAULT_SETTINGS, ...(doc as Partial<Settings> | undefined) }
    },

    async saveSettings(settings) {
      const stored = { ...settings, updatedAt: now() }
      await writeDoc(SETTINGS, 'settings', stored)
      return stored
    },

    folders: () => invoke<Folders>('folders'),

    async openFolder(which) {
      await invoke('open_folder', { which })
    },
  }
}

export const fileStorage = createFileStorage(tauriInvoke)
