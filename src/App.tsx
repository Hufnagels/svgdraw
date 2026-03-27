import { AppLayout } from './components/AppLayout'
import { useTheme } from './hooks/useTheme'

export default function App() {
  useTheme() // keeps system-theme listener active
  return <AppLayout />
}
