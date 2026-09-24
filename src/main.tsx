import '@fontsource-variable/bricolage-grotesque/opsz.css'
import '@fontsource-variable/geist'
import '@fontsource-variable/geist-mono'
// Global styles first, so component styles (CSS Modules) come later and win ties.
import './styles/tokens.css'
import './styles/base.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './i18n'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
