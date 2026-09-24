import type { Answer } from '../practice/grade'

export type Mode = 'practice'

/** One answered question. Append-only log; progress is always derived from it. */
export type Attempt = {
  id: string
  courseId: string
  questionId: string
  mode: Mode
  answer: Answer
  score: number
  correct: boolean
  answeredAt: string
  durationMs: number
  updatedAt: string
}

/** Per-course settings the learner chooses; not part of the question bank. */
export type CourseSettings = {
  courseId: string
  /** Local calendar date "YYYY-MM-DD". */
  examDate?: string
  updatedAt: string
}

export type Language = 'en' | 'de'
export type Theme = 'system' | 'light' | 'dark'
export type Settings = { language: Language; theme: Theme; updatedAt: string }

export const DEFAULT_SETTINGS: Settings = {
  language: 'en',
  theme: 'system',
  updatedAt: new Date(0).toISOString(),
}

export type BankFile = {
  name: string
  data: Uint8Array
  /** False for files the app cannot delete, e.g. the repo's subjects/ folder in the dev build. */
  removable: boolean
}

/** Desktop app only: where question banks and progress are stored. */
export type Folders = {
  subjects: string
  data: string
  /** True if the folders sit next to the app, false if lia fell back to the user's app data folder. */
  portable: boolean
}

/** Records are written without `updatedAt`; the storage stamps it and returns the stored record. */
export type Unstamped<T> = Omit<T, 'updatedAt'>

/**
 * All persistence goes through this interface. UI code uses the app store, never this directly.
 * Implementations: dexie.ts (browser dev build) and files.ts (desktop app).
 */
export interface Storage {
  listBankFiles(): Promise<BankFile[]>
  saveBankFile(name: string, data: Uint8Array): Promise<void>
  deleteBankFile(name: string): Promise<void>
  listAttempts(): Promise<Attempt[]>
  addAttempt(attempt: Unstamped<Attempt>): Promise<Attempt>
  listCourseSettings(): Promise<CourseSettings[]>
  saveCourseSettings(settings: Unstamped<CourseSettings>): Promise<CourseSettings>
  loadSettings(): Promise<Settings>
  saveSettings(settings: Unstamped<Settings>): Promise<Settings>
  /** Desktop app only. */
  folders?(): Promise<Folders>
  /** Desktop app only: shows the folder in the system file manager. */
  openFolder?(which: 'subjects' | 'data'): Promise<void>
}
