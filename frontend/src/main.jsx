import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import AuthPage from './pages/AuthPage'
import RegisterFamily from './pages/RegisterFamily'
import RegisterCaretaker from './pages/RegisterCaretaker'
import RegisterDoctor from './pages/RegisterDoctor'
import CaretakerDiary from './pages/CaretakerDiary'
import FamilyDashboard from './pages/FamilyDashboard'
import DoctorDashboard from './pages/DoctorDashboard'
import { getToken, getRole } from './utils/auth'

function PrivateRoute({ children, role }) {
  const token = getToken()
  const userRole = getRole()
  if (!token) return <Navigate to="/" replace />
  if (role && userRole !== role) return <Navigate to="/app" replace />
  return children
}

function AppRedirect() {
  const role = getRole()
  if (role === 'family') return <Navigate to="/app/familia" replace />
  if (role === 'caretaker') return <Navigate to="/app/baba" replace />
  if (role === 'doctor') return <Navigate to="/app/medica" replace />
  return <Navigate to="/" replace />
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AuthPage />} />
        <Route path="/cadastro/familia" element={<RegisterFamily />} />
        <Route path="/cadastro/baba" element={<RegisterCaretaker />} />
        <Route path="/cadastro/medica" element={<RegisterDoctor />} />
        <Route path="/app" element={<AppRedirect />} />
        <Route path="/app/familia" element={<PrivateRoute role="family"><FamilyDashboard /></PrivateRoute>} />
        <Route path="/app/baba" element={<PrivateRoute role="caretaker"><CaretakerDiary /></PrivateRoute>} />
        <Route path="/app/medica" element={<PrivateRoute role="doctor"><DoctorDashboard /></PrivateRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)
