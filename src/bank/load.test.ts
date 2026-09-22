import { readFileSync } from 'node:fs'
import { strToU8, zipSync } from 'fflate'
import { describe, expect, it } from 'vitest'
import { loadBankFile, resolveImagePath } from './load'

const json = (value: unknown) => strToU8(JSON.stringify(value))

// Raw, untyped JSON on purpose: the tests break it in ways the Bank type would not allow.
type RawBank = Record<string, any>

const validBank = (): RawBank => ({
  format: 'lia-bank',
  formatVersion: 1,
  course: { id: 'test-course', name: 'Test', version: '1' },
  topics: ['A', 'B'],
  questions: [
    {
      id: 'q-single',
      topic: 'A',
      type: 'single_choice',
      difficulty: 1,
      prompt: 'Pick one',
      options: [
        { text: 'yes', correct: true },
        { text: 'no', correct: false },
      ],
      explanation: 'Because.',
    },
    {
      id: 'q-cloze',
      topic: 'B',
      type: 'cloze',
      difficulty: 2,
      text: 'The {{1}} is {{2}}.',
      blanks: [{ answers: ['sky'] }, { answers: ['blue'] }],
      explanation: 'Look up.',
    },
  ],
})

/** Loads a modified copy of the valid bank and returns its error lines. */
function errorsFor(change: (bank: RawBank) => void): string[] {
  const bank = validBank()
  change(bank)
  const result = loadBankFile('bank.json', json(bank))
  if (result.ok) throw new Error('expected the bank to be invalid')
  return result.errors
}

describe('shipped example banks', () => {
  it.each(['example.json', 'example-images.zip'])('%s is valid', (name) => {
    const result = loadBankFile(name, readFileSync(`subjects/${name}`))
    expect(result.ok ? [] : result.errors).toEqual([])
  })

  it('example.json covers every question type', () => {
    const result = loadBankFile('example.json', readFileSync('subjects/example.json'))
    const types = new Set(result.ok ? result.value.bank.questions.map((q) => q.type) : [])
    expect([...types].sort()).toEqual(['cloze', 'flashcard', 'free_text', 'multiple_choice', 'single_choice'])
  })

  it('the zip example ships its image', () => {
    const result = loadBankFile('example-images.zip', readFileSync('subjects/example-images.zip'))
    expect(result.ok && [...result.value.images.keys()]).toEqual(['images/bst.svg'])
  })
})

describe('QUESTION_FORMAT.md', () => {
  // Fences may be ``` or ```` (the latter when the example itself contains a code block).
  const docs = readFileSync('QUESTION_FORMAT.md', 'utf8')
  const blocks = [...docs.matchAll(/^(`{3,4})json\n([\s\S]*?)\n\1$/gm)].map((m) => JSON.parse(m[2]))

  it('has a valid example for every question type', () => {
    const questions = blocks.filter((b) => 'type' in b)
    expect(questions.map((q) => q.type).sort()).toEqual([
      'cloze',
      'flashcard',
      'free_text',
      'multiple_choice',
      'single_choice',
    ])
    const bank = { ...blocks[0], topics: [...new Set(questions.map((q) => q.topic))], questions }
    const result = loadBankFile('docs.json', json(bank))
    expect(result.ok ? [] : result.errors).toEqual([])
  })
})

describe('bank validation', () => {
  it('accepts a minimal valid bank and a numeric course version', () => {
    const bank = validBank()
    bank.course = { id: 'test-course', name: 'Test', version: 2 }
    const result = loadBankFile('bank.json', json(bank))
    expect(result.ok && result.value.bank.course.version).toBe('2')
  })

  it('names the question id and field in errors', () => {
    const errors = errorsFor((b) => {
      b.questions[0].options[1].correct = true
    })
    expect(errors).toEqual([
      'Question 1 (id "q-single"), options: exactly one option must have "correct": true (use multiple_choice for more)',
    ])
  })

  it('rejects duplicate ids and unknown topics', () => {
    const errors = errorsFor((b) => {
      b.questions[1].id = 'q-single'
      b.questions[1].topic = 'Nope'
    })
    expect(errors).toEqual([
      'Question 2 (id "q-single"), id: duplicate id "q-single"',
      'Question 2 (id "q-single"), topic: "Nope" is not listed in "topics"',
    ])
  })

  it('checks that cloze markers match the blanks', () => {
    const errors = errorsFor((b) => {
      b.questions[1].text = 'The {{1}} is {{1}}.'
    })
    expect(errors[0]).toMatch(/^Question 2 \(id "q-cloze"\), text: .*\{\{1\}\}, \{\{2\}\} exactly once/)
  })

  it('reports typos in field names and unknown question types', () => {
    expect(
      errorsFor((b) => {
        b.questions[0].explaination = 'x'
      }),
    ).toEqual(['Question 1 (id "q-single"): Unrecognized key: "explaination"'])
    expect(
      errorsFor((b) => {
        b.questions[0].type = 'true_false'
      })[0],
    ).toMatch(/^Question 1 \(id "q-single"\), type: "type" must be one of: single_choice/)
  })

  it('rejects bad ids and difficulty out of range', () => {
    const errors = errorsFor((b) => {
      b.questions[0].id = 'Has Spaces'
      b.questions[0].difficulty = 4
    })
    expect(errors).toHaveLength(2)
    expect(errors[0]).toMatch(/id: use lowercase letters/)
    expect(errors[1]).toMatch(/difficulty: Too big/)
  })

  it('rejects banks from a newer app version', () => {
    const errors = errorsFor((b) => {
      b.formatVersion = 99
    })
    expect(errors[0]).toMatch(/update the app/)
  })

  it('explains broken JSON and wrong file types', () => {
    const broken = loadBankFile('x.json', strToU8('{"format": '))
    expect(!broken.ok && broken.errors[0]).toMatch(/^Not valid JSON/)
    const pdf = loadBankFile('slides.pdf', new Uint8Array())
    expect(!pdf.ok && pdf.errors[0]).toMatch(/Unsupported file type/)
  })
})

describe('zip banks and images', () => {
  const withImage = () => {
    const bank = validBank()
    bank.questions[0].prompt = 'Look: ![tree](images/tree.png) and ![again](tree.png)'
    return bank
  }
  const png = new Uint8Array([137, 80, 78, 71])

  it('loads a zip with an images folder, also when wrapped in a top-level folder', () => {
    for (const prefix of ['', 'my-bank/']) {
      const zip = zipSync({
        [`${prefix}bank.json`]: json(withImage()),
        [`${prefix}images/tree.png`]: png,
        '__MACOSX/._bank.json': new Uint8Array([0]),
      })
      const result = loadBankFile('bank.zip', zip)
      expect(result.ok ? [...result.value.images.keys()] : result.errors).toEqual(['images/tree.png'])
    }
  })

  it('reports missing images', () => {
    const zip = zipSync({ 'bank.json': json(withImage()) })
    const result = loadBankFile('bank.zip', zip)
    expect(!result.ok && result.errors[0]).toBe(
      'Question 1 (id "q-single"): image "images/tree.png" was not found in the zip.',
    )
  })

  it('tells .json banks that images need a zip, and rejects web images', () => {
    const local = loadBankFile('bank.json', json(withImage()))
    expect(!local.ok && local.errors[0]).toMatch(/must be a \.zip with an images\/ folder/)
    const bank = validBank()
    bank.questions[0].prompt = '![x](https://example.com/x.png)'
    const web = loadBankFile('bank.json', json(bank))
    expect(!web.ok && web.errors[0]).toMatch(/must be a file in the bank's images\/ folder/)
  })

  it('requires exactly one JSON file in a zip', () => {
    const result = loadBankFile('bank.zip', zipSync({ 'a.json': json(1), 'b.json': json(2) }))
    expect(!result.ok && result.errors[0]).toMatch(/exactly one \.json file, found 2/)
  })

  it('resolves image paths relative to images/', () => {
    expect(resolveImagePath('heap.png')).toBe('images/heap.png')
    expect(resolveImagePath('./images/heap.png')).toBe('images/heap.png')
    expect(resolveImagePath('../secret.png')).toBeNull()
    expect(resolveImagePath('file:///etc/passwd')).toBeNull()
  })
})
