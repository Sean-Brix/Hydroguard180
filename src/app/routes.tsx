import { lazy, Suspense, type ComponentType, type LazyExoticComponent, type ReactNode } from 'react';
import { createBrowserRouter, Navigate } from 'react-router';
import { PublicLayout } from './components/PublicLayout';
import { DashboardLayout } from './components/DashboardLayout';
import { useAuth, type UserRole } from './context/AuthContext';
import { AuthProvider } from './context/AuthContext';
import { Outlet } from 'react-router';

type RouteComponent = LazyExoticComponent<ComponentType<object>>;

const HomePage = lazy(() => import('./pages/Home').then((module) => ({ default: module.Home })));
const AboutPage = lazy(() => import('./pages/About').then((module) => ({ default: module.About })));
const FAQPage = lazy(() => import('./pages/FAQ').then((module) => ({ default: module.FAQ })));
const TrainingPage = lazy(() => import('./pages/Training').then((module) => ({ default: module.Training })));
const ContactPage = lazy(() => import('./pages/Contact').then((module) => ({ default: module.Contact })));
const LoginPage = lazy(() => import('./pages/Login').then((module) => ({ default: module.Login })));
const AnalyticsPage = lazy(() => import('./pages/dashboard/Analytics').then((module) => ({ default: module.Analytics })));
const WaterMonitoringPage = lazy(() => import('./pages/dashboard/WaterMonitoring').then((module) => ({ default: module.WaterMonitoring })));
const ResidentDirectoryPage = lazy(() => import('./pages/dashboard/ResidentDirectory').then((module) => ({ default: module.ResidentDirectory })));
const FAQManagementPage = lazy(() => import('./pages/dashboard/FAQManagement').then((module) => ({ default: module.FAQManagement })));
const AlertLevelsPage = lazy(() => import('./pages/dashboard/AlertLevels').then((module) => ({ default: module.AlertLevels })));
const InquiriesPage = lazy(() => import('./pages/dashboard/Inquiries').then((module) => ({ default: module.Inquiries })));
const ProfilePage = lazy(() => import('./pages/dashboard/Profile').then((module) => ({ default: module.Profile })));
const UserManagementPage = lazy(() => import('./pages/dashboard/UserManagement').then((module) => ({ default: module.UserManagement })));

function RouteLoadingFallback() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center bg-white text-sm text-gray-500">
      Loading...
    </div>
  );
}

function LazyRoute({ component: Component }: { component: RouteComponent }) {
  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      <Component />
    </Suspense>
  );
}

// Root layout that provides AuthContext to entire app
function RootLayout() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
}

// Protected Route - requires authentication
function ProtectedRoute({ children, allowedRoles }: { children: ReactNode; allowedRoles?: UserRole[] }) {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

// Redirect away from login if already authenticated
function LoginGuard() {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <LazyRoute component={LoginPage} />;
}

export const router = createBrowserRouter([
  {
    path: '/',
    Component: RootLayout,
    children: [
      {
        path: '/',
        Component: PublicLayout,
        children: [
          { index: true, element: <LazyRoute component={HomePage} /> },
          { path: 'about', element: <LazyRoute component={AboutPage} /> },
          { path: 'faq', element: <LazyRoute component={FAQPage} /> },
          { path: 'training', element: <LazyRoute component={TrainingPage} /> },
          { path: 'contact', element: <LazyRoute component={ContactPage} /> },
        ],
      },
      {
        path: '/login',
        Component: LoginGuard,
      },
      {
        path: '/dashboard',
        element: (
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        ),
        children: [
          { index: true, element: <LazyRoute component={AnalyticsPage} /> },
          { path: 'monitoring', element: <LazyRoute component={WaterMonitoringPage} /> },
          { path: 'residents', element: <LazyRoute component={ResidentDirectoryPage} /> },
          { path: 'faq-management', element: <LazyRoute component={FAQManagementPage} /> },
          { path: 'alerts', element: <LazyRoute component={AlertLevelsPage} /> },
          { path: 'inquiries', element: <LazyRoute component={InquiriesPage} /> },
          { path: 'profile', element: <LazyRoute component={ProfilePage} /> },
          {
            path: 'users',
            element: (
              <ProtectedRoute allowedRoles={['Super Admin', 'Admin']}>
                <LazyRoute component={UserManagementPage} />
              </ProtectedRoute>
            ),
          },
        ],
      },
      {
        path: '*',
        element: (
          <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="text-center">
              <h1 className="text-6xl font-bold text-gray-800 mb-4">404</h1>
              <p className="text-xl text-gray-600 mb-6">Page not found</p>
              <a href="/" className="px-6 py-3 bg-[#FF6A00] text-white rounded-md hover:bg-[#E55F00] transition-colors">
                Go Home
              </a>
            </div>
          </div>
        ),
      },
    ],
  },
]);
