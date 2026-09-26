import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PopupProvider } from './context/PopupContext';
import Layout from './components/Layout';
import IdleLogout from './components/IdleLogout';
import ContentProtection from './components/ContentProtection';
import OfflineGate from './components/OfflineGate';
import AnalyticsTracker from './components/AnalyticsTracker';
import { Spinner } from './components/ui';
import Home from './pages/Home';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import Register from './pages/Register';
import Programs from './pages/Programs';
import VerifyCertificate from './pages/VerifyCertificate';
import About from './pages/About';
import Contact from './pages/Contact';
import NotFound from './pages/NotFound';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import FAQ from './pages/FAQ';
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
import StudentLayout from './components/StudentLayout';

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

function App() {
  return (
    <AuthProvider>
      <PopupProvider>
        <Router>
          <IdleLogout />
          <ContentProtection />
          <AnalyticsTracker />
          <OfflineGate>
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
          </OfflineGate>
        </Router>
      </PopupProvider>
    </AuthProvider>
  );
}

export default App;
