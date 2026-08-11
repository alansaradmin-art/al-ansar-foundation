import { Navigate } from 'react-router-dom'
import { useProfile } from '@/contexts/ProfileContext'

export default function RoleHome() {
  const { isAdmin } = useProfile()
  return <Navigate to={isAdmin ? '/admin' : '/manager'} replace />
}
