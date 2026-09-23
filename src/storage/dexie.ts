import { Dexie, type EntityTable } from 'dexie'
import { DEFAULT_SETTINGS, type Attempt, type CourseSettings, type Settings, type Storage } from './types'

type StoredBankFile = { name: string; data: Uint8Array; updatedAt: string }
type StoredSettings = Settings & { id: 'settings' }

const db = new Dexie('lia') as Dexie & {
  bankFiles: EntityTable<StoredBankFile, 'name'>
  attempts: EntityTable<Attempt, 'id'>
  settings: EntityTable<StoredSettings, 'id'>
  courseSettings: EntityTable<CourseSettings, 'courseId'>
}

// To change the schema or migrate records, add a new db.version(n); never edit existing versions.
db.version(1).stores({
  bankFiles: 'name',
  attempts: 'id, courseId, answeredAt',
  settings: 'id',
})
db.version(2).stores({ courseSettings: 'courseId' })

// Dev build only: also read the banks in the repo's subjects/ folder, like the desktop app does.
// Guarded by DEV so a production build never bundles local (possibly private) banks.
const subjects: Record<string, () => Promise<string>> = import.meta.env.DEV
  ? import.meta.glob<string>('/subjects/*.{json,zip}', { query: '?url', import: 'default' })
  : {}

const now = () => new Date().toISOString()

export const dexieStorage: Storage = {
  async listBankFiles() {
    const imported = await db.bankFiles.toArray()
    const bundled = await Promise.all(
      Object.entries(subjects).map(async ([path, url]) => {
        const response = await fetch(await url())
        return {
          name: path.slice(path.lastIndexOf('/') + 1),
          data: new Uint8Array(await response.arrayBuffer()),
          removable: false,
        }
      }),
    )
    return [...imported.map(({ name, data }) => ({ name, data, removable: true })), ...bundled]
  },

  async saveBankFile(name, data) {
    await db.bankFiles.put({ name, data, updatedAt: now() })
  },

  async deleteBankFile(name) {
    await db.bankFiles.delete(name)
  },

  listAttempts() {
    return db.attempts.orderBy('answeredAt').toArray()
  },

  async addAttempt(attempt) {
    const stored = { ...attempt, updatedAt: now() }
    await db.attempts.add(stored)
    return stored
  },

  listCourseSettings() {
    return db.courseSettings.toArray()
  },

  async saveCourseSettings(settings) {
    const stored = { ...settings, updatedAt: now() }
    await db.courseSettings.put(stored)
    return stored
  },

  async loadSettings() {
    const stored = await db.settings.get('settings')
    if (!stored) return DEFAULT_SETTINGS
    const { id: _, ...settings } = stored
    return { ...DEFAULT_SETTINGS, ...settings }
  },

  async saveSettings(settings) {
    const stored = { ...settings, updatedAt: now() }
    await db.settings.put({ ...stored, id: 'settings' })
    return stored
  },
}
