import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import WorkspaceLayout from './components/WorkspaceLayout.jsx'
import { WorkspaceProvider } from './state/WorkspaceProvider.jsx'
import { AuthProvider } from './auth/AuthProvider.jsx'
import { useAuth } from './auth/AuthContext.js'
import SignInPage from './auth/SignInPage.jsx'

const AnalyticsPage = lazy(() => import('./pages/Analytics.jsx'))
const LicensePage = lazy(() => import('./pages/License.jsx'))
const DashboardPage = lazy(() => import('./pages/Overview.jsx'))
const RecommendationsPage = lazy(() => import('./pages/Recommendations.jsx'))
const ReportsPage = lazy(() => import('./pages/Reports.jsx'))
const SettingsPage = lazy(() => import('./pages/Settings.jsx'))
const SubscriptionsPage = lazy(() => import('./pages/Subscriptions.jsx'))

function PageLoading() {
  return <div aria-busy="true" className="page-loading"><span /><span /><span /><p>Loading workspace…</p></div>
}

function ConfigurationError() {
  const { configurationError, initializationError } = useAuth()
  const message = configurationError || initializationError
  return (
    <main className="auth-page">
      <section className="auth-card auth-error-card">
        <span className="eyebrow">CONFIGURATION REQUIRED</span>
        <h1>Complete Supabase setup</h1>
        <p>{message}</p>
        <p>Restart the frontend development server after saving the environment file.</p>
      </section>
    </main>
  )
}

function AppRoutes() {
  const auth = useAuth()
  if (auth.configurationError || auth.initializationError) return <ConfigurationError />
  if (auth.configured && auth.loading) return <PageLoading />
  if (auth.configured && !auth.session) return <SignInPage />

  return (
    <WorkspaceProvider>
        <Routes>
          <Route element={<WorkspaceLayout />}>
            <Route index element={<Navigate replace to="/dashboard" />} />
            <Route element={<Suspense fallback={<PageLoading />}><DashboardPage /></Suspense>} path="/dashboard" />
            <Route element={<Suspense fallback={<PageLoading />}><SubscriptionsPage /></Suspense>} path="/subscriptions" />
            <Route element={<Suspense fallback={<PageLoading />}><LicensePage /></Suspense>} path="/licenses" />
            <Route element={<Suspense fallback={<PageLoading />}><RecommendationsPage /></Suspense>} path="/recommendations" />
            <Route element={<Suspense fallback={<PageLoading />}><AnalyticsPage /></Suspense>} path="/insights" />
            <Route element={<Suspense fallback={<PageLoading />}><ReportsPage /></Suspense>} path="/reports" />
            <Route element={<Suspense fallback={<PageLoading />}><SettingsPage /></Suspense>} path="/settings" />
            <Route element={<Navigate replace to="/dashboard" />} path="*" />
          </Route>
        </Routes>
    </WorkspaceProvider>
  )
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster position="bottom-right" toastOptions={{ duration: 3500 }} />
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
