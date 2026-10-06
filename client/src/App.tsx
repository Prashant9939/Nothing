import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PopupProvider } from './context/PopupContext';
import Layout from './components/Layout';
import IdleLogout from './components/IdleLogout';
import ContentProtection from './components/ContentProtection';
import OfflineGate from './components/OfflineGate';
import AnalyticsTracker from './components/AnalyticsTracker';
import RevealOnScroll from './components/RevealOnScroll';
import { Spinner } from './components/ui';
// Home stays eager (largest contentful paint); every other public page is
// code-split so first paint only downloads what that route needs.
import Home from './pages/Home';
const Login = lazy(() => import('./pages/Login'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const Register = lazy(() => import('./pages/Register'));
const Programs = lazy(() => import('./pages/Programs'));
const VerifyCertificate = lazy(() => import('./pages/VerifyCertificate'));
const About = lazy(() => import('./pages/About'));
const Contact = lazy(() => import('./pages/Contact'));
const NotFound = lazy(() => import('./pages/NotFound'));
const Terms = lazy(() => import('./pages/Terms'));
const Privacy = lazy(() => import('./pages/Privacy'));
const FAQ = lazy(() => import('./pages/FAQ'));
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const AdminAnalytics = lazy(() => import('./pages/admin/Analytics'));
const AdminInternships = lazy(() => import('./pages/admin/Internships'));
const AdminUsers = lazy(() => import('./pages/admin/Users'));
const AdminPayments = lazy(() => import('./pages/admin/Payments'));
const AdminExams = lazy(() => import('./pages/admin/Exams'));
const AdminMarks = lazy(() => import('./pages/admin/Marks'));
const AdminInstitutions = lazy(() => import('./pages/admin/Institutions'));
const AdminAnnouncements = lazy(() => import('./pages/admin/Announcements'));
const AdminIssues = lazy(() => import('./pages/admin/Issues'));
const AdminQuestions = lazy(() => import('./pages/admin/Questions'));
const AdminSettings = lazy(() => import('./pages/admin/Settings'));
const AdminLayout = lazy(() => import('./components/AdminLayout'));
const StudentLayout = lazy(() => import('./components/StudentLayout'));

const StudentDashboard = lazy(() => import('./pages/student/Dashboard'));
const SelectTrack = lazy(() => import('./pages/student/SelectTrack'));
const Payment = lazy(() => import('./pages/student/Payment'));
const StudentExam = lazy(() => import('./pages/student/Exam'));
const Documents = lazy(() => import('./pages/student/Documents'));
const Learning = lazy(() => import('./pages/student/Learning'));
const ExamPage = lazy(() => import('./pages/student/ExamPage'));
const EditProfile = lazy(() => import('./pages/student/EditProfile'));

function ProtectedRoute({ children, role }: { children: React.ReactNode; role?: string }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  if (isLoading) return <div className="flex h-screen items-center justify-center"><Spinner size={36} /></div>;
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (role && user?.role !== role)
    return (
      <Layout>
        <NotFound />
      </Layout>
    );
  return <>{children}</>;
}

// Routes to /login when api.ts reports an expired session (auth:expired),
// so public pages leave SPA-side instead of never redirecting.
function SessionWatcher() {
  const navigate = useNavigate();
  useEffect(() => {
    const onExpired = () => navigate('/login', { replace: true });
    window.addEventListener('auth:expired', onExpired);
    return () => window.removeEventListener('auth:expired', onExpired);
  }, [navigate]);
  return null;
}

const routeFallback = (
  <div className="flex h-screen items-center justify-center"><Spinner size={36} /></div>
);

function App() {
  return (
    <AuthProvider>
      <PopupProvider>
        <Router>
          <SessionWatcher />
          <IdleLogout />
          <ContentProtection />
          <AnalyticsTracker />
          <RevealOnScroll />
          <OfflineGate>
            <Suspense fallback={routeFallback}>
            <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Layout><Home /></Layout>} />
            <Route path="/login" element={<Layout><Login /></Layout>} />
            <Route path="/forgot-password" element={<Layout><ForgotPassword /></Layout>} />
            <Route path="/register" element={<Layout><Register /></Layout>} />
            <Route path="/programs" element={<Layout><Programs /></Layout>} />
            <Route path="/certification" element={<Layout><VerifyCertificate /></Layout>} />
            <Route path="/about" element={<Layout><About /></Layout>} />
            <Route path="/contact" element={<Layout><Contact /></Layout>} />
            <Route path="/terms" element={<Layout><Terms /></Layout>} />
            <Route path="/privacy" element={<Layout><Privacy /></Layout>} />
            <Route path="/faq" element={<Layout><FAQ /></Layout>} />
            <Route path="*" element={<Layout><NotFound /></Layout>} />

            {/* Admin Routes */}
            <Route path="/admin" element={<ProtectedRoute role="admin"><Suspense fallback={<div className="flex h-screen items-center justify-center"><Spinner size={36} /></div>}><AdminLayout /></Suspense></ProtectedRoute>}>
              <Route index element={<AdminDashboard />} />
              <Route path="analytics" element={<AdminAnalytics />} />
              <Route path="internships" element={<AdminInternships />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="payments" element={<AdminPayments />} />
              <Route path="questions" element={<AdminQuestions />} />
              <Route path="exams" element={<AdminExams />} />
              <Route path="marks" element={<AdminMarks />} />
              <Route path="institutions" element={<AdminInstitutions />} />
              <Route path="announcements" element={<AdminAnnouncements />} />
              <Route path="issues" element={<AdminIssues />} />
              <Route path="settings" element={<AdminSettings />} />
            </Route>

            {/* Student Routes */}
            <Route path="/student" element={<ProtectedRoute role="student"><StudentLayout /></ProtectedRoute>}>
              <Route index element={<StudentDashboard />} />
              <Route path="select-track" element={<SelectTrack />} />
              <Route path="pay/:paymentId" element={<Payment />} />
              <Route path="documents" element={<Documents />} />
              <Route path="learning" element={<Learning />} />
              <Route path="exam-page" element={<ExamPage />} />
              <Route path="exam/:enrollmentId" element={<StudentExam />} />
              <Route path="edit-profile" element={<EditProfile />} />
            </Route>
            </Routes>
            </Suspense>
          </OfflineGate>
        </Router>
      </PopupProvider>
    </AuthProvider>
  );
}

export default App;
