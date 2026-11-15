import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Shell } from './Shell'
import { RecordPage } from '@/pages/RecordPage'
import { EnergyPage } from '@/pages/EnergyPage'
import { RetrofitPage } from '@/pages/RetrofitPage'
import { MaintenancePage } from '@/pages/MaintenancePage'
import { TelemetryPage } from '@/pages/TelemetryPage'
import { ProgrammesPage } from '@/pages/ProgrammesPage'

export function App() {
  // The app is served from /tenure/ on GitHub Pages and from / in development.
  // Without a basename the router sees the deploy subpath as part of the route,
  // matches nothing, and silently falls through to the index redirect.
  const basename = import.meta.env.BASE_URL.replace(/\/$/, '')

  return (
    <BrowserRouter basename={basename}>
      <Routes>
        <Route element={<Shell />}>
          <Route index element={<RecordPage />} />
          <Route path="energy" element={<EnergyPage />} />
          <Route path="retrofit" element={<RetrofitPage />} />
          <Route path="maintenance" element={<MaintenancePage />} />
          <Route path="telemetry" element={<TelemetryPage />} />
          <Route path="programmes" element={<ProgrammesPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
