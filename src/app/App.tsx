import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Shell } from './Shell'
import { RecordPage } from '@/pages/RecordPage'
import { EnergyPage } from '@/pages/EnergyPage'
import { RetrofitPage } from '@/pages/RetrofitPage'
import { MaintenancePage } from '@/pages/MaintenancePage'
import { TelemetryPage } from '@/pages/TelemetryPage'
import { ProgrammesPage } from '@/pages/ProgrammesPage'

export function App() {
  return (
    <BrowserRouter>
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
