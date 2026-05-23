import { Navigate } from 'react-router-dom'
import { isAdminLoggedIn } from '../utils/adminAuth'

export default function AdminProtectedRoute({ children }) {
  if (!isAdminLoggedIn()) {
    return <Navigate to="/" replace />
  }
  return children
}
