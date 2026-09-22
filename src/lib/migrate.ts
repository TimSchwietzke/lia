export type Doc = Record<string, unknown>

/** Upgrades one version step: `migrations[0]` turns version 1 into 2, `migrations[1]` turns 2 into 3, ... */
export type Migration = (doc: Doc) => Doc

/**
 * Brings a versioned JSON document (question bank, progress file, backup) up to the current version,
 * which is `migrations.length + 1`. Throws an Error with a readable message if that is impossible.
 */
export function migrate(doc: unknown, versionKey: string, migrations: readonly Migration[]): Doc {
  if (typeof doc !== 'object' || doc === null || Array.isArray(doc)) {
    throw new Error('Expected a JSON object at the top level.')
  }
  const current = migrations.length + 1
  const version = (doc as Doc)[versionKey]
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    throw new Error(`"${versionKey}" must be a whole number, the current version is ${current}.`)
  }
  if (version > current) {
    throw new Error(
      `"${versionKey}" is ${version}, but this app only understands up to ${current}. Please update the app.`,
    )
  }
  let out = doc as Doc
  for (let v = version; v < current; v++) {
    out = { ...migrations[v - 1](out), [versionKey]: v + 1 }
  }
  return out
}
