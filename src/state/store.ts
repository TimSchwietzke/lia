import { create } from 'zustand'
import { loadBankFile, type LoadedBank } from '../bank/load'
import i18n from '../i18n'
import { dexieStorage } from '../storage/dexie'
import {
  DEFAULT_SETTINGS,
  type Attempt,
  type BankFile,
  type Settings,
  type Storage,
  type Unstamped,
} from '../storage/types'

// M2: pick the file-based implementation when running inside Tauri.
const storage: Storage = dexieStorage

export type Course = Omit<LoadedBank, 'images'> & {
  removable: boolean
  /** Object URLs for the bank's images, keyed by path inside the bank ("images/x.png"). */
  imageUrls: Map<string, string>
}

export type BankError = { fileName: string; errors: string[] }

export type Notice = {
  id: string
  key: 'added' | 'updated' | 'removed' | 'importFailed'
  values: { name?: string; version?: string; file?: string }
}

export type View =
  | { name: 'dashboard' }
  | { name: 'setup'; courseId: string }
  | { name: 'session'; courseId: string; questionIds: string[]; sessionId: string }

type State = {
  ready: boolean
  settings: Settings
  courses: Course[]
  bankErrors: BankError[]
  attempts: Attempt[]
  notices: Notice[]
  view: View
}

type Actions = {
  init(): Promise<void>
  reloadBanks(): Promise<void>
  importFiles(files: readonly File[]): Promise<void>
  removeCourse(courseId: string): Promise<void>
  recordAttempt(attempt: Omit<Unstamped<Attempt>, 'id'>): Promise<void>
  updateSettings(patch: Partial<Omit<Settings, 'updatedAt'>>): Promise<void>
  dismissError(fileName: string): void
  dismissNotice(id: string): void
  go(view: View): void
}

const MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
}

export const useStore = create<State & Actions>()((set, get) => {
  const notify = (key: Notice['key'], values: Notice['values']) => {
    const notice = { id: crypto.randomUUID(), key, values }
    set((s) => ({ notices: [...s.notices, notice] }))
    setTimeout(() => get().dismissNotice(notice.id), 5000)
  }

  return {
    ready: false,
    settings: DEFAULT_SETTINGS,
    courses: [],
    bankErrors: [],
    attempts: [],
    notices: [],
    view: { name: 'dashboard' },

    async init() {
      const [settings, attempts] = await Promise.all([storage.loadSettings(), storage.listAttempts()])
      applySettings(settings)
      set({ settings, attempts })
      await get().reloadBanks()
      set({ ready: true })
    },

    async reloadBanks() {
      for (const course of get().courses) course.imageUrls.forEach((url) => URL.revokeObjectURL(url))
      set(buildCourses(await storage.listBankFiles()))
    },

    async importFiles(files) {
      const errors: BankError[] = []
      for (const file of files) {
        const data = new Uint8Array(await file.arrayBuffer())
        const result = loadBankFile(file.name, data)
        if (!result.ok) {
          errors.push({ fileName: result.fileName, errors: result.errors })
          notify('importFailed', { file: file.name })
          continue
        }
        const { course } = result.value.bank
        const existing = findCourse(get().courses, course.id)
        const name = `${course.id}.${file.name.toLowerCase().endsWith('.zip') ? 'zip' : 'json'}`
        if (existing?.removable && existing.fileName !== name) await storage.deleteBankFile(existing.fileName)
        await storage.saveBankFile(name, data)
        notify(existing ? 'updated' : 'added', { name: course.name, version: course.version })
      }
      await get().reloadBanks()
      set((s) => ({
        bankErrors: [
          ...s.bankErrors.filter((e) => !errors.some((n) => n.fileName === e.fileName)),
          ...errors,
        ],
      }))
    },

    async removeCourse(courseId) {
      const course = findCourse(get().courses, courseId)
      if (!course?.removable) return
      await storage.deleteBankFile(course.fileName)
      await get().reloadBanks()
      set({ view: { name: 'dashboard' } })
      notify('removed', { name: course.bank.course.name })
    },

    async recordAttempt(attempt) {
      const stored = await storage.addAttempt({ ...attempt, id: crypto.randomUUID() })
      set((s) => ({ attempts: [...s.attempts, stored] }))
    },

    async updateSettings(patch) {
      const { updatedAt: _, ...current } = get().settings
      const settings = await storage.saveSettings({ ...current, ...patch })
      applySettings(settings)
      set({ settings })
    },

    dismissError(fileName) {
      set((s) => ({ bankErrors: s.bankErrors.filter((e) => e.fileName !== fileName) }))
    },

    dismissNotice(id) {
      set((s) => ({ notices: s.notices.filter((n) => n.id !== id) }))
    },

    go(view) {
      set({ view })
    },
  }
})

export function findCourse(courses: readonly Course[], courseId: string): Course | undefined {
  return courses.find((c) => c.bank.course.id === courseId)
}

/** Parses all bank files (imported ones first). The first file wins if two share a course id. */
function buildCourses(files: readonly BankFile[]): { courses: Course[]; bankErrors: BankError[] } {
  const courses: Course[] = []
  const bankErrors: BankError[] = []
  for (const file of files) {
    const result = loadBankFile(file.name, file.data)
    if (!result.ok) {
      bankErrors.push({ fileName: result.fileName, errors: result.errors })
      continue
    }
    const { bank, fileName, images } = result.value
    const clash = findCourse(courses, bank.course.id)
    // A file the app cannot delete (dev build: repo subjects/) is silently replaced by an imported copy.
    if (clash && clash.removable && !file.removable) continue
    if (clash) {
      bankErrors.push({
        fileName,
        errors: [
          `The course id "${bank.course.id}" is already used by ${clash.fileName}. Remove one of the two files.`,
        ],
      })
      continue
    }
    courses.push({ bank, fileName, removable: file.removable, imageUrls: toObjectUrls(images) })
  }
  courses.sort((a, b) => a.bank.course.name.localeCompare(b.bank.course.name))
  return { courses, bankErrors }
}

function toObjectUrls(images: Map<string, Uint8Array>): Map<string, string> {
  return new Map(
    [...images].map(([path, bytes]) => {
      const type = MIME[path.slice(path.lastIndexOf('.') + 1).toLowerCase()] ?? ''
      return [path, URL.createObjectURL(new Blob([bytes as Uint8Array<ArrayBuffer>], { type }))]
    }),
  )
}

const darkQuery = window.matchMedia('(prefers-color-scheme: dark)')

function applySettings(settings: Settings) {
  void i18n.changeLanguage(settings.language)
  document.documentElement.lang = settings.language
  const apply = () => {
    const dark = settings.theme === 'dark' || (settings.theme === 'system' && darkQuery.matches)
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
  }
  darkQuery.onchange = apply
  apply()
}
