import { createContext, type ReactNode } from 'react'

/** Image object URLs of the current bank, keyed by path inside the bank ("images/x.png"). */
export const ImagesContext = createContext<Map<string, string>>(new Map())

/** Renders cloze blank number n (1-based). Provided by the cloze question. */
export const BlankContext = createContext<(n: number) => ReactNode>((n) => `[${n}]`)
