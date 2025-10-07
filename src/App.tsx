import React from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AppLayout } from './layouts/AppLayout'
import { LoginPage } from './routes/auth/LoginPage'
import { AssessmentListPage } from './routes/assessments/AssessmentListPage'
import { CreateAssessmentPage } from './routes/assessments/CreateAssessmentPage'
import { AssessmentPlayerPage } from './routes/assessments/AssessmentPlayerPage'

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AssessmentListPage />} />
            <Route path="assessments/new" element={<CreateAssessmentPage />} />
            <Route path="assessments/:templateId/edit" element={<CreateAssessmentPage />} />
          </Route>

          <Route path="/invite/:token" element={<AssessmentPlayerPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  )
}
