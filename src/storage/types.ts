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

/** Records are written without `updatedAt`; the storage stamps it and returns the stored record. */
export type Unstamped<T> = Omit<T, 'updatedAt'>

/**
 * All persistence goes through this interface. UI code uses the app store, never this directly.
 * Implementations: dexie.ts (browser dev build), file-based storage (Tauri, M2).
 */
export interface Storage {
  listBankFiles(): Promise<BankFile[]>
  saveBankFile(name: string, data: Uint8Array): Promise<void>
  deleteBankFile(name: string): Promise<void>
  listAttempts(): Promise<Attempt[]>
  addAttempt(attempt: Unstamped<Attempt>): Promise<Attempt>
  loadSettings(): Promise<Settings>
  saveSettings(settings: Unstamped<Settings>): Promise<Settings>
}
