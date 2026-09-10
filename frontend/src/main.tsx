import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { App } from './App'
import { applyTheme, readTheme } from './lib/theme'
import { installPalettePlayground } from './lib/palettePlayground'
import './index.css'

// Тема до первого рендера, чтобы не мигало белым
applyTheme(readTheme())
// Живой подбор палитры: dev всегда, прод — по ?palette в адресе
installPalettePlayground()

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 15_000 },
  },
})

async function start() {
  // Мок собирается только когда флаг задан на этапе сборки; в проде код вырезается
  if (import.meta.env.VITE_MOCK_API === 'true') {
    const { installMockApi } = await import('./api/mock/server')
    installMockApi()
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </StrictMode>,
  )
}

start()
