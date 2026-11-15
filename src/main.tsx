import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Providers } from '@/app/providers'
import { App } from '@/app/App'

import '@/styles/tokens.css'
import '@/styles/base.css'
import '@/styles/app.css'
import '@/styles/components.css'
import '@/styles/pages.css'

const container = document.getElementById('root')
if (!container) throw new Error('Root element #root is missing from index.html')

createRoot(container).render(
  <StrictMode>
    <Providers>
      <App />
    </Providers>
  </StrictMode>,
)
