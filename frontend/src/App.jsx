import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import { Navbar } from './components/common/Navbar';
import { Sidebar } from './components/common/Sidebar';
import { FloatingAiAssistant } from './components/chat/FloatingAiAssistant';

// Auth Pages
import { Login } from './pages/auth/Login';
import { Register } from './pages/auth/Register';

// Student Pages
import { StudentDashboard } from './pages/student/StudentDashboard';
import { ApplicationWizard } from './pages/student/ApplicationWizard';
import { DocumentsPage } from './pages/student/DocumentsPage';
import { PaymentPage } from './pages/student/PaymentPage';
import { AdmissionOfferPage } from './pages/student/AdmissionOfferPage';
import { EnrollmentCardPage } from './pages/student/EnrollmentCardPage';
import { ProgramBrowser } from './pages/student/ProgramBrowser';
import { StudentProfile } from './pages/student/StudentProfile';

// Counselor Pages
import { CounselorDashboard } from './pages/counselor/CounselorDashboard';
import { StudentSearchPage } from './pages/counselor/StudentSearchPage';
import { EscalationsInbox } from './pages/counselor/EscalationsInbox';
import { DocumentReviewDesk } from './pages/counselor/DocumentReviewDesk';
import { ConversationMonitor } from './pages/counselor/ConversationMonitor';
import { StudentDetail360 } from './pages/counselor/StudentDetail360';

// Admin Pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { ProgramManagerPage } from './pages/admin/ProgramManagerPage';
import { UserManagementPage } from './pages/admin/UserManagementPage';
import { AuditLogsPage } from './pages/admin/AuditLogsPage';
import { SystemHealthPage } from './pages/admin/SystemHealthPage';

// Protected Route Guard
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-4 border-brand-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return (
      <div className="p-12 text-center">
        <h2 className="text-lg font-bold text-slate-800">403 - Unauthorized</h2>
        <p className="text-xs text-slate-500 mt-1">Your user role does not have access to this portal page.</p>
      </div>
    );
  }

  return children;
};

// Root Router Layout Component
const AppLayout = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-surface-50 text-slate-900">
      <Navbar />
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {user && <Sidebar />}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/programs" element={<ProgramBrowser />} />

            {/* Student Protected Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute allowedRoles={['STUDENT']}>
                  <StudentDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/application"
              element={
                <ProtectedRoute allowedRoles={['STUDENT']}>
                  <ApplicationWizard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/documents"
              element={
                <ProtectedRoute allowedRoles={['STUDENT']}>
                  <DocumentsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/payment"
              element={
                <ProtectedRoute allowedRoles={['STUDENT']}>
                  <PaymentPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admission"
              element={
                <ProtectedRoute allowedRoles={['STUDENT']}>
                  <AdmissionOfferPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/enrollment"
              element={
                <ProtectedRoute allowedRoles={['STUDENT']}>
                  <EnrollmentCardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute allowedRoles={['STUDENT']}>
                  <StudentProfile />
                </ProtectedRoute>
              }
            />

            {/* Counselor Protected Routes */}
            <Route
              path="/counselor"
              element={
                <ProtectedRoute allowedRoles={['COUNSELOR', 'ADMIN']}>
                  <CounselorDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/counselor/search"
              element={
                <ProtectedRoute allowedRoles={['COUNSELOR', 'ADMIN']}>
                  <StudentSearchPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/counselor/cases"
              element={
                <ProtectedRoute allowedRoles={['COUNSELOR', 'ADMIN']}>
                  <EscalationsInbox />
                </ProtectedRoute>
              }
            />
            <Route
              path="/counselor/documents"
              element={
                <ProtectedRoute allowedRoles={['COUNSELOR', 'ADMIN']}>
                  <DocumentReviewDesk />
                </ProtectedRoute>
              }
            />
            <Route
              path="/counselor/conversations"
              element={
                <ProtectedRoute allowedRoles={['COUNSELOR', 'ADMIN']}>
                  <ConversationMonitor />
                </ProtectedRoute>
              }
            />
            <Route
              path="/counselor/students/:trackingId"
              element={
                <ProtectedRoute allowedRoles={['COUNSELOR', 'ADMIN']}>
                  <StudentDetail360 />
                </ProtectedRoute>
              }
            />

            {/* Admin Protected Routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/programs"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <ProgramManagerPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <UserManagementPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/audit-logs"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <AuditLogsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/health"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <SystemHealthPage />
                </ProtectedRoute>
              }
            />

            {/* Default fallback */}
            <Route
              path="*"
              element={
                user ? (
                  user.role === 'COUNSELOR' ? (
                    <Navigate to="/counselor" replace />
                  ) : user.role === 'ADMIN' ? (
                    <Navigate to="/admin" replace />
                  ) : (
                    <Navigate to="/dashboard" replace />
                  )
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />
          </Routes>
        </main>
      </div>

      {/* Interactive Floating Autonomous AI Admissions Assistant */}
      <FloatingAiAssistant />
    </div>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <AppLayout />
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
