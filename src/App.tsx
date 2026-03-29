import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppLayout } from './components/AppLayout'
import SignIn from './pages/SignIn'
import { SessionGuard } from './components/SessionGuard'
import { useTheme } from './hooks/useTheme'
import { useAuthStore } from './store/useAuthStore'

export default function App() {
  useTheme()
  const { token, fetchCurrentUser } = useAuthStore()

  useEffect(() => {
    if (token) fetchCurrentUser()
  }, [token, fetchCurrentUser])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/signin" element={<SignIn />} />
        <Route path="/*" element={<AppLayout />} />
      </Routes>
      {token && <SessionGuard />}
    </BrowserRouter>
  )
}
