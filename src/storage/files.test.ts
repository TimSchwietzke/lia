import type { InvokeArgs, InvokeOptions } from '@tauri-apps/api/core'
import { afterEach, describe, expect, it } from 'vitest'
import type { Answer } from '../practice/grade'
import { createFileStorage, dataMigrations } from './files'

/** In-memory stand-in for the commands in src-tauri/src/lib.rs. */
function fakeDisk() {
  const data = new Map<string, string>()
  const subjects = new Map<string, Uint8Array>()
  const invoke = async <T>(cmd: string, args?: InvokeArgs, options?: InvokeOptions): Promise<T> => {
    const a = (args ?? {}) as Record<string, string>
    const result = (() => {
      switch (cmd) {
        case 'read_data':
          return data.get(a.name) ?? null
        case 'write_data':
          return void data.set(a.name, a.contents)
        case 'append_data':
          return void data.set(a.name, (data.get(a.name) ?? '') + a.line + '\n')
        case 'list_bank_files':
          return [...subjects.keys()].sort()
        case 'read_bank_file':
          return subjects.get(a.name)!.buffer
        case 'write_bank_file':
          return void subjects.set(
            (options!.headers as Record<string, string>)['x-file-name'],
            args as Uint8Array,
          )
        case 'delete_bank_file':
          return void subjects.delete(a.name)
        default:
          throw new Error(`unknown command ${cmd}`)
      }
    })()
    return result as T
  }
  return { data, subjects, storage: createFileStorage(invoke) }
}

const answer: Answer = { type: 'flashcard', rating: 'good' }
const attempt = (id: string, answeredAt: string) => ({
  id,
  courseId: 'c',
  questionId: 'q',
  mode: 'practice' as const,
  answer,
  score: 1,
  correct: true,
  answeredAt,
  durationMs: 1000,
})

afterEach(() => {
  dataMigrations.attempt.length = 0
  dataMigrations.settings.length = 0
})

describe('file storage', () => {
  it('appends attempts as versioned lines and reads them back in order', async () => {
    const { data, storage } = fakeDisk()
    await storage.addAttempt(attempt('b', '2026-09-02T10:00:00Z'))
    await storage.addAttempt(attempt('a', '2026-09-01T10:00:00Z'))
    const lines = data.get('attempts.jsonl')!.trim().split('\n')
    expect(lines).toHaveLength(2)
    expect(JSON.parse(lines[0])).toMatchObject({ version: 1, id: 'b' })
    const read = await storage.listAttempts()
    expect(read.map((a) => a.id)).toEqual(['a', 'b'])
    expect(read[0]).not.toHaveProperty('version')
    expect(read[0].updatedAt).toBeTruthy()
  })

  it('skips unreadable attempt lines but leaves them in the file', async () => {
    const { data, storage } = fakeDisk()
    await storage.addAttempt(attempt('a', '2026-09-01T10:00:00Z'))
    data.set('attempts.jsonl', data.get('attempts.jsonl') + '{broken\n')
    expect((await storage.listAttempts()).map((a) => a.id)).toEqual(['a'])
    expect(data.get('attempts.jsonl')).toContain('{broken')
  })

  it('upgrades old records with the data migrations', async () => {
    const { data, storage } = fakeDisk()
    data.set(
      'attempts.jsonl',
      JSON.stringify({ ...attempt('a', '2026-09-01T10:00:00Z'), version: 1, ms: 5 }) + '\n',
    )
    // Pretend version 2 renamed "ms" to "durationMs".
    dataMigrations.attempt.push(({ ms, ...rest }) => ({ ...rest, durationMs: ms }))
    const [read] = await storage.listAttempts()
    expect(read.durationMs).toBe(5)
    await storage.addAttempt(attempt('b', '2026-09-02T10:00:00Z'))
    expect(data.get('attempts.jsonl')).toContain('"version":2')
  })

  it('uses default settings until settings are saved', async () => {
    const { storage } = fakeDisk()
    expect((await storage.loadSettings()).language).toBe('en')
    await storage.saveSettings({ language: 'de', theme: 'dark' })
    expect(await storage.loadSettings()).toMatchObject({ language: 'de', theme: 'dark' })
  })

  it('keeps a copy of a settings file it cannot read instead of losing it', async () => {
    const { data, storage } = fakeDisk()
    data.set('settings.json', '{"version": 1, "language": ')
    expect((await storage.loadSettings()).language).toBe('en')
    const copy = [...data.keys()].find((k) => k.startsWith('settings.json.unreadable-'))
    expect(copy && data.get(copy)).toBe('{"version": 1, "language": ')
  })

  it('stores one entry per course and replaces it on update', async () => {
    const { storage } = fakeDisk()
    await storage.saveCourseSettings({ courseId: 'a', examDate: '2026-10-01' })
    await storage.saveCourseSettings({ courseId: 'b', examDate: '2026-11-01' })
    await storage.saveCourseSettings({ courseId: 'a', examDate: '2026-10-15' })
    const courses = await storage.listCourseSettings()
    expect(courses.map((c) => [c.courseId, c.examDate]).sort()).toEqual([
      ['a', '2026-10-15'],
      ['b', '2026-11-01'],
    ])
  })

  it('writes, lists, reads and deletes bank files', async () => {
    const { storage } = fakeDisk()
    await storage.saveBankFile('algo.json', new Uint8Array([1, 2, 3]))
    const [file] = await storage.listBankFiles()
    expect(file).toMatchObject({ name: 'algo.json', removable: true })
    expect([...file.data]).toEqual([1, 2, 3])
    await storage.deleteBankFile('algo.json')
    expect(await storage.listBankFiles()).toEqual([])
  })
})
