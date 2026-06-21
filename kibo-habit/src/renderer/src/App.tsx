import { Routes, Route, Navigate } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { Dashboard } from './pages/Dashboard'
import { Habits } from './pages/Habits'
import { Routines } from './pages/Routines'
import { Calendar } from './pages/Calendar'
import { Stats } from './pages/Stats'
import { Journal } from './pages/Journal'
import { Focus } from './pages/Focus'
import { Goals } from './pages/Goals'
import { Settings } from './pages/Settings'
import { ThemeProvider } from './design/ThemeProvider'

export default function App() {
  return (
    <ThemeProvider>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/habits" element={<Habits />} />
          <Route path="/routines" element={<Routines />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/journal" element={<Journal />} />
          <Route path="/focus" element={<Focus />} />
          <Route path="/goals" element={<Goals />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </ThemeProvider>
  )
}
