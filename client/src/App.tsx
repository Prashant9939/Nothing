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
import { PageSkeleton } from './components/ui';
import RoutePrefetcher, { lazyRoute, lazyLayout } from './prefetch';
// Home stays eager (largest contentful paint); every other public page is
// code-split so first paint only downloads what that route needs.
import Home from './pages/Home';
// Each lazy() is registered with the href that loads it, so the prefetcher
// can warm a chunk on hover/idle instead of on click. `lazyRoute` matches the
// exact href; `lazyLayout` matches the path and everything under it (shells
// like /student, and dynamic stems like /student/pay).
const Login = lazy(lazyRoute('/login', () => import('./pages/Login')));
const ForgotPassword = lazy(lazyRoute('/forgot-password', () => import('./pages/ForgotPassword')));
const Register = lazy(lazyRoute('/register', () => import('./pages/Register')));
const Programs = lazy(lazyRoute('/programs', () => import('./pages/Programs')));
const VerifyCertificate = lazy(lazyRoute('/certification', () => import('./pages/VerifyCertificate')));
const About = lazy(lazyRoute('/about', () => import('./pages/About')));
const Contact = lazy(lazyRoute('/contact', () => import('./pages/Contact')));
const NotFound = lazy(() => import('./pages/NotFound')); // catch-all: no href to prefetch
const Terms = lazy(lazyRoute('/terms', () => import('./pages/Terms')));
const Privacy = lazy(lazyRoute('/privacy', () => import('./pages/Privacy')));
const FAQ = lazy(lazyRoute('/faq', () => import('./pages/FAQ')));
const Partner = lazy(lazyRoute('/partners', () => import('./pages/Partner')));
const AdminDashboard = lazy(lazyRoute('/admin', () => import('./pages/admin/Dashboard')));
const AdminAnalytics = lazy(lazyRoute('/admin/analytics', () => import('./pages/admin/Analytics')));
const AdminInternships = lazy(lazyRoute('/admin/internships', () => import('./pages/admin/Internships')));
const AdminUsers = lazy(lazyRoute('/admin/users', () => import('./pages/admin/Users')));
const AdminAdmins = lazy(lazyRoute('/admin/admins', () => import('./pages/admin/Admins')));
const AdminPartners = lazy(lazyRoute('/admin/partners', () => import('./pages/admin/Partners')));
const AdminPartnerDetail = lazy(lazyLayout('/admin/partners', () => import('./pages/admin/PartnerDetail')));
const AdminPayments = lazy(lazyRoute('/admin/payments', () => import('./pages/admin/Payments')));
const AdminExams = lazy(lazyRoute('/admin/exams', () => import('./pages/admin/Exams')));
const AdminMarks = lazy(lazyRoute('/admin/marks', () => import('./pages/admin/Marks')));
const AdminInstitutions = lazy(lazyRoute('/admin/institutions', () => import('./pages/admin/Institutions')));
const AdminAnnouncements = lazy(lazyRoute('/admin/announcements', () => import('./pages/admin/Announcements')));
const AdminIssues = lazy(lazyRoute('/admin/issues', () => import('./pages/admin/Issues')));
const AdminQuestions = lazy(lazyRoute('/admin/questions', () => import('./pages/admin/Questions')));
const AdminSettings = lazy(lazyRoute('/admin/settings', () => import('./pages/admin/Settings')));
const AdminLayout = lazy(lazyLayout('/admin', () => import('./components/AdminLayout')));
const StudentLayout = lazy(lazyLayout('/student', () => import('./components/StudentLayout')));

const StudentDashboard = lazy(lazyRoute('/student', () => import('./pages/student/Dashboard')));
const SelectTrack = lazy(lazyRoute('/student/select-track', () => import('./pages/student/SelectTrack')));
const Payment = lazy(lazyLayout('/student/pay', () => import('./pages/student/Payment')));
const StudentExam = lazy(lazyLayout('/student/exam', () => import('./pages/student/Exam')));
const Documents = lazy(lazyRoute('/student/documents', () => import('./pages/student/Documents')));
const Learning = lazy(lazyRoute('/student/learning', () => import('./pages/student/Learning')));
const ExamPage = lazy(lazyRoute('/student/exam-page', () => import('./pages/student/ExamPage')));
const EditProfile = lazy(lazyRoute('/student/edit-profile', () => import('./pages/student/EditProfile')));
const PartnerDashboard = lazy(lazyRoute('/partner', () => import('./pages/partner/Dashboard')));
const PartnerStudents = lazy(lazyRoute('/partner/students', () => import('./pages/partner/Students')));
const PartnerPayments = lazy(lazyRoute('/partner/payments', () => import('./pages/partner/Payments')));
const PartnerDocuments = lazy(lazyRoute('/partner/documents', () => import('./pages/partner/Documents')));
const PartnerLayout = lazy(lazyLayout('/partner', () => import('./components/PartnerLayout')));

function ProtectedRoute({ children, role }: { children: React.ReactNode; role?: string }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  if (isLoading) return <PageSkeleton label="Checking your session..." />;
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

// Page-shaped placeholder rather than a bare spinner: while a route chunk is
// still downloading the user sees where content will land, and the shell
// (navbar/footer) stays mounted above this boundary.
const routeFallback = <PageSkeleton label="Loading page..." />;

function App() {
  return (
    <AuthProvider>
      <PopupProvider>
        <Router>
          <SessionWatcher />
          <IdleLogout />
          <ContentProtection />
          <AnalyticsTracker />
          <RoutePrefetcher />
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
            <Route path="/partners" element={<Layout><Partner /></Layout>} />
            <Route path="*" element={<Layout><NotFound /></Layout>} />

            {/* Admin Routes */}
            <Route path="/admin" element={<ProtectedRoute role="admin"><Suspense fallback={<PageSkeleton label="Loading dashboard..." />}><AdminLayout /></Suspense></ProtectedRoute>}>
              <Route index element={<AdminDashboard />} />
              <Route path="analytics" element={<AdminAnalytics />} />
              <Route path="internships" element={<AdminInternships />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="admins" element={<AdminAdmins />} />
              <Route path="partners" element={<AdminPartners />} />
              <Route path="partners/:id" element={<AdminPartnerDetail />} />
              <Route path="payments" element={<AdminPayments />} />
              <Route path="questions" element={<AdminQuestions />} />
              <Route path="exams" element={<AdminExams />} />
              <Route path="marks" element={<AdminMarks />} />
              <Route path="institutions" element={<AdminInstitutions />} />
              <Route path="announcements" element={<AdminAnnouncements />} />
              <Route path="issues" element={<AdminIssues />} />
              <Route path="settings" element={<AdminSettings />} />
            </Route>

            {/* Partner Routes (portal; public landing lives at /partners) */}
            <Route path="/partner" element={<ProtectedRoute role="partner"><Suspense fallback={<PageSkeleton label="Loading portal..." />}><PartnerLayout /></Suspense></ProtectedRoute>}>
              <Route index element={<PartnerDashboard />} />
              <Route path="students" element={<PartnerStudents />} />
              <Route path="payments" element={<PartnerPayments />} />
              <Route path="documents" element={<PartnerDocuments />} />
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
