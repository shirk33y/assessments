import React from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AppLayout } from './layouts/AppLayout'
import { LoginPage } from './routes/auth/LoginPage'
import { DashboardPage } from './routes/dashboard/DashboardPage'
import { AssessmentListPage } from './routes/assessments/AssessmentListPage'
import { CreateAssessmentPage } from './routes/assessments/CreateAssessmentPage'
import { AssessmentPlayerPage } from './routes/assessments/AssessmentPlayerPage'

export default function App() {
  const basePath = React.useMemo(() => {
    const url = import.meta.env.BASE_URL ?? '/'
    return url.endsWith('/') && url !== '/' ? url.slice(0, -1) : url
  }, [])

  return (
    <AuthProvider>
      <BrowserRouter basename={basePath}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="assessments" element={<AssessmentListPage />} />
            <Route path="assessments/new" element={<CreateAssessmentPage />} />
            <Route path="assessments/:templateId/edit" element={<CreateAssessmentPage />} />
          </Route>

          <Route path="/invite/:token" element={<AssessmentPlayerPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
