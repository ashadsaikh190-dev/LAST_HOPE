import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';
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
  const { user, loading, logout } = useAuth();

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
    const userDashboardLink =
      user.role === 'ADMIN' ? '/admin' : user.role === 'COUNSELOR' ? '/counselor' : '/dashboard';
    const userDashboardLabel =
      user.role === 'ADMIN'
        ? '🛡️ Go to Admin Console'
        : user.role === 'COUNSELOR'
        ? '🧭 Go to Counselor Workspace'
        : '🎓 Go to Student Portal';

    return (
      <div className="max-w-xl mx-auto my-12 p-8 text-center rounded-3xl bg-white border border-slate-200 shadow-xl space-y-5 animate-fade-in">
        <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto shadow-sm">
          <span className="text-2xl font-bold">🔒</span>
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-black text-slate-900">403 — Access Restricted</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            You are signed in as <strong className="text-slate-800 font-mono">{user.name}</strong> (Role: <span className="px-2 py-0.5 rounded-full bg-slate-100 font-bold text-slate-700">{user.role}</span>).
          </p>
          <p className="text-xs text-slate-400">
            This workspace requires <strong className="text-brand-600">{allowedRoles.join(' or ')}</strong> access privileges.
          </p>
        </div>

        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to={userDashboardLink}
            className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-500/20 transition-all text-center"
          >
            {userDashboardLabel}
          </Link>

          <button
            onClick={() => {
              logout();
              window.location.href = '/login';
            }}
            className="w-full sm:w-auto px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all text-center cursor-pointer"
          >
            Sign in with different account
          </button>
        </div>
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

            {/* Student & Staff Accessible Lifecycle Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute allowedRoles={['STUDENT', 'COUNSELOR', 'ADMIN']}>
                  <StudentDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/application"
              element={
                <ProtectedRoute allowedRoles={['STUDENT', 'COUNSELOR', 'ADMIN']}>
                  <ApplicationWizard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/documents"
              element={
                <ProtectedRoute allowedRoles={['STUDENT', 'COUNSELOR', 'ADMIN']}>
                  <DocumentsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/payment"
              element={
                <ProtectedRoute allowedRoles={['STUDENT', 'COUNSELOR', 'ADMIN']}>
                  <PaymentPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admission"
              element={
                <ProtectedRoute allowedRoles={['STUDENT', 'COUNSELOR', 'ADMIN']}>
                  <AdmissionOfferPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/enrollment"
              element={
                <ProtectedRoute allowedRoles={['STUDENT', 'COUNSELOR', 'ADMIN']}>
                  <EnrollmentCardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute allowedRoles={['STUDENT', 'COUNSELOR', 'ADMIN']}>
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
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <SocketProvider>
            <AppLayout />
          </SocketProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
