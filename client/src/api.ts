import axios from 'axios';
import type { AxiosResponse } from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  // A stalled request must fail visibly instead of leaving the UI on an
  // infinite spinner forever (individual calls may still raise this).
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || '';
    const isAuthAttempt = ['/auth/login', '/auth/register', '/auth/check', '/auth/logout'].some(p => url.includes(p));
    if (error.response?.status === 401 && !isAuthAttempt) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      invalidateDashboard();
      // Let the SPA clear state and route to /login without re-downloading
      // the whole app (window.location was a multi-second white screen).
      window.dispatchEvent(new CustomEvent('auth:expired'));
    }
    return Promise.reject(error);
  }
);

// ---------------------------------------------------------------------------
// Student dashboard cache: five screens (Dashboard, Learning, ExamPage,
// Payment, DocumentsList) all call getDashboard() — a heavy multi-join query.
// Without a cache every navigation re-fetched it and showed a blank loader.
// ---------------------------------------------------------------------------
const DASHBOARD_TTL_MS = 20000;
let dashboardCache: { at: number; response: AxiosResponse<DashboardResponse> } | null = null;
let dashboardPending: Promise<AxiosResponse<DashboardResponse>> | null = null;

export function invalidateDashboard() {
  dashboardCache = null;
}

export interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  university: string;
  college: string;
  course: string;
  year: string;
  role: string;
  partnerName?: string;
  accountStatus?: string;
  createdAt: string;
}

export interface Internship {
  id: number;
  title: string;
  description: string;
  category: string;
  duration: number;
  price: number;
  originalPrice: number;
  modules: number;
  topics: string;
  isActive: number;
  examDate: string | null;
  isEnrolled?: boolean;
  createdAt: string;
}

export interface Enrollment {
  id: number;
  userId: number;
  internshipId: number;
  status: string;
  enrolledAt: string;
  expiresAt: string;
  progress: number;
  completedModules?: string;
  internshipTitle?: string;
  topics?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

export interface Payment {
  id: number;
  userId: number;
  enrollmentId: number | null;
  internshipId?: number;
  amount: number;
  method: string;
  transactionId: string;
  status: string;
  receiptNumber: string;
  paidAt: string;
  expiresAt?: string | null;
  createdAt: string;
  internshipTitle?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

export interface Exam {
  id: number;
  userId: number;
  internshipId: number;
  enrollmentId: number;
  totalQuestions: number;
  passingMarks: number;
  duration: number;
  scheduledAt: string;
  startedAt: string;
  completedAt: string;
  score: number;
  status: string;
  internshipTitle?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  courseProgress?: number;
  courseCompleted?: boolean;
  enrollmentStatus?: string;
  moduleCount?: number;
}

export interface Certificate {
  id: number;
  userId: number;
  enrollmentId: number;
  examId: number;
  certificateId: string;
  grade: string;
  score: number;
  issuedAt: string;
  internshipTitle?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

interface AuthResponse {
  message: string;
  token: string;
  user: User;
}

export interface ProfileCompletion {
  pct: number;
  missing: string[];
}

export interface NextExam {
  id: number;
  enrollmentId: number;
  internshipId: number;
  internshipTitle?: string;
  scheduledAt: string | null;
  status: string;
  duration: number;
  totalQuestions: number;
  passingMarks: number;
  courseCompleted?: boolean;
  courseProgress?: number;
}

export interface DashboardResponse {
  enrollments: Enrollment[];
  payments: Payment[];
  exams: Exam[];
  certificates: Certificate[];
  profileCompletion: ProfileCompletion;
  nextExam: NextExam | null;
  daysLeft: number | null;
  announcements: Announcement[];
  announcementsUnread: number;
  announcementsTotal: number;
}

export interface LearningModule {
  id: number;
  internshipId: number;
  title: string;
  description: string;
  moduleOrder: number;
  durationMinutes: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  topics: string[];
  learningObjectives: string[];
  contentSections: ContentSection[];
  quizQuestions: QuizQuestion[];
  resources: Resource[];
  videoUrl?: string;
}

interface ContentSection {
  id: string;
  type: 'text' | 'code' | 'video' | 'diagram';
  title: string;
  content: string;
  codeExample?: string;
  language?: string;
  videoUrl?: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface Resource {
  title: string;
  type: 'pdf' | 'link' | 'template';
  url: string;
}

interface LearningProgress {
  totalModules: number;
  completedCount: number;
  percentage: number;
  completedModules: number[];
}

// Auth API
export const authApi = {
  register: (data: any) =>
    api.post<AuthResponse>('/auth/register', data).then((r) => { invalidateDashboard(); return r; }),
  login: (data: any) =>
    api.post<AuthResponse>('/auth/login', data).then((r) => { invalidateDashboard(); return r; }),
  logout: () =>
    api.post('/auth/logout').then((r) => { invalidateDashboard(); return r; }),
  getProfile: () => api.get<{ user: User }>('/auth/profile'),
  checkSession: () => api.get<{ valid: boolean; user: User }>('/auth/check'),
  verifyCertificate: (certificateId: string) => api.post('/auth/verify-certificate', { certificateId }),
  getInternships: () => api.get<{ internships: Internship[] }>('/auth/internships'),
  forgotPassword: (data: { email: string; phone: string; regNo: string; rollNo: string }) =>
    api.post('/auth/forgot-password', data),
  resetPassword: (data: { email: string; phone: string; regNo: string; rollNo: string; newPassword: string; confirmPassword: string }) =>
    api.post('/auth/reset-password', data),
};

// Admin API
export const adminApi = {
  getDashboard: () => api.get('/admin/dashboard'),
  getAnalytics: (range: '1d' | '7d' | '30d') =>
    api.get<AnalyticsResponse>('/admin/analytics', { params: { range } }),
  getInternships: () => api.get('/admin/internships'),
  createInternship: (data: any) => api.post('/admin/internships', data),
  updateInternship: (id: number, data: any) => api.put(`/admin/internships/${id}`, data),
  deleteInternship: (id: number) => api.delete(`/admin/internships/${id}`),
  getUsers: () => api.get('/admin/users'),
  getAdmins: () => api.get('/admin/admins'),
  registerUser: (data: any) => api.post('/admin/users', data),
  getUser: (id: number) => api.get(`/admin/users/${id}`),
  updateUserRole: (id: number, role: string) => api.put(`/admin/users/${id}/role`, { role }),
  deleteUser: (id: number) => api.delete(`/admin/users/${id}`),
  getEnrollments: () => api.get('/admin/enrollments'),
  updateEnrollmentStatus: (id: number, status: string) => api.put(`/admin/enrollments/${id}/status`, { status }),
  updateEnrollmentProgress: (id: number, progress: number) => api.put(`/admin/enrollments/${id}/progress`, { progress }),
  getPayments: () => api.get('/admin/payments'),
  updatePaymentStatus: (id: number, status: string, transactionId?: string) => api.put(`/admin/payments/${id}/status`, { status, transactionId }),
  getExams: () => api.get('/admin/exams'),
  scheduleExam: (id: number, scheduledAt: string) => api.put(`/admin/exams/${id}/schedule`, { scheduledAt }),
  updateExamResult: (id: number, score: number, status: string) => api.put(`/admin/exams/${id}/result`, { score, status }),
  getExamAttempt: (id: number) => api.get(`/admin/exams/${id}/attempt`),
  updateExamAttempt: (id: number, answers: { questionId: number; selectedOption: number }[]) =>
    api.put(`/admin/exams/${id}/attempt`, { answers }),
  getCertificates: () => api.get('/admin/certificates'),
  updateCertificateMarks: (id: number, score: number) => api.put(`/admin/certificates/${id}/marks`, { score }),
  getSettings: () => api.get('/admin/settings'),
  updateSettings: (data: { attendanceDateMode?: string; companyName?: string; companyAddress?: string; companyCin?: string; directorName?: string; siteUrl?: string }) =>
    api.put('/admin/settings', data),
  getQuestions: (track?: string) => api.get('/admin/questions', { params: track ? { track } : {} }),
  getQuestionStats: () => api.get('/admin/questions/stats'),
  getQuestion: (id: number) => api.get(`/admin/questions/${id}`),
  createQuestion: (data: any) => api.post('/admin/questions', data),
  bulkCreateQuestions: (track: string, questions: any[]) => api.post('/admin/questions/bulk', { track, questions }),
  updateQuestion: (id: number, data: any) => api.put(`/admin/questions/${id}`, data),
  deleteQuestion: (id: number) => api.delete(`/admin/questions/${id}`),
  deleteQuestionsByTrack: (track: string) => api.delete(`/admin/questions/track/${track}`),
  getContactMessages: () =>
    api.get<{ messages: ContactMessage[]; unread: number }>('/admin/contact-messages'),
  updateContactMessageStatus: (id: number, status: 'new' | 'read') =>
    api.put<{ message: string }>(`/admin/contact-messages/${id}/status`, { status }),
  deleteContactMessage: (id: number) => api.delete<{ message: string }>(`/admin/contact-messages/${id}`),
  getPartners: () => api.get<{ partners: PartnerListItem[] }>('/admin/partners'),
  getPartner: (id: number) => api.get<PartnerDetail>(`/admin/partners/${id}`),
  updatePartnerStatus: (id: number, status: 'active' | 'suspended') =>
    api.put<{ message: string }>(`/admin/partners/${id}/status`, { status }),
  createPartner: (data: CreatePartnerData) =>
    api.post<{ message: string; partner: PartnerListItem }>('/admin/partners', data),
  deletePartner: (id: number) => api.delete<{ message: string }>(`/admin/partners/${id}`),
};

export interface CreatePartnerData {
  firstName: string;
  lastName?: string;
  email: string;
  phone: string;
  partnerName: string;
  password: string;
}

// Partner program -------------------------------------------------------
export interface PartnerListItem {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  partnerName: string;
  accountStatus: 'active' | 'suspended';
  createdAt: string;
  registrations: number;
  students: number;
  activeStudents: number;
  lastRegistration: string;
  paidAmount: number;
  paidCount: number;
  pendingAmount: number;
  documents: number;
  logins: number;
  lastLogin: string | null;
}

export interface PartnerStudentRow {
  // Null for partner-registered accounts that have not enrolled yet.
  enrollmentId: number | null;
  enrollmentStatus: string;
  progress: number;
  enrolledAt: string;
  programTitle: string;
  programDuration: number;
  studentId: number;
  studentFirstName: string;
  studentLastName: string;
  studentEmail: string;
  studentPhone: string;
  studentCollege: string;
  studentCourse: string;
  paymentStatus: string | null;
  paymentAmount: number | null;
  receiptNumber: string | null;
  paidAt: string | null;
  certificateId: string | null;
  grade: string | null;
  score: number | null;
  certificateIssuedAt: string | null;
}

export interface PartnerPaymentRow {
  id: number;
  amount: number;
  method: string;
  status: string;
  receiptNumber: string | null;
  transactionId: string | null;
  paidAt: string | null;
  createdAt: string;
  enrollmentId: number;
  studentFirstName: string;
  studentLastName: string;
  programTitle: string;
}

export interface PartnerDocumentRow {
  enrollmentId: number;
  studentId: number;
  offerNo: string | null;
  reportNo: string | null;
  attendanceNo: string | null;
  enrollmentStatus: string;
  studentFirstName: string;
  studentLastName: string;
  programTitle: string;
  certificateId: string | null;
  grade: string | null;
  score: number | null;
  certificateIssuedAt: string | null;
  paid: boolean;
}

export interface PartnerActivityItem {
  at: string;
  type: 'login' | 'registration' | 'payment' | 'certificate';
  title: string;
  detail: string;
}

export interface PartnerDetail {
  partner: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    partnerName: string;
    accountStatus: 'active' | 'suspended';
    createdAt: string;
  };
  kpis: {
    students: number;
    registrations: number;
    activeStudents: number;
    paidCount: number;
    paidAmount: number;
    pendingAmount: number;
    certificates: number;
    documents: number;
    logins: number;
    lastLogin: string | null;
  };
  students: PartnerStudentRow[];
  payments: PartnerPaymentRow[];
  documents: PartnerDocumentRow[];
  activity: PartnerActivityItem[];
}

// Partner's own dashboard (role=partner) — same payload admin detail returns.
export interface RegisterStudentData {
  fullName?: string;
  firstName: string;
  lastName?: string;
  email: string;
  phone: string;
  gender?: string;
  dob?: string;
  university: string;
  college: string;
  course: string;
  year: string;
  rollNo?: string;
  regNo?: string;
  guardianName?: string;
  guardianPhone?: string;
  guardianRelation?: string;
  password: string;
}

export const partnerApi = {
  getDashboard: () => api.get<PartnerDetail>('/partner/dashboard'),
  registerStudent: (data: RegisterStudentData) =>
    api.post<{ message: string; user: { id: number; firstName: string; lastName: string; email: string } }>(
      '/partner/students', data
    ),
};

// Student API
export const studentApi = {
  // Cached for DASHBOARD_TTL_MS so navigating between student screens does
  // not re-run the heavy aggregate query (and show a blank loader each time).
  getDashboard: (opts?: { force?: boolean }) => {
    if (!opts?.force && dashboardCache && Date.now() - dashboardCache.at < DASHBOARD_TTL_MS) {
      return Promise.resolve(dashboardCache.response);
    }
    if (!dashboardPending) {
      dashboardPending = api
        .get<DashboardResponse>('/student/dashboard')
        .then((res) => {
          dashboardCache = { at: Date.now(), response: res };
          return res;
        })
        .finally(() => {
          dashboardPending = null;
        });
    }
    return dashboardPending;
  },
  getProfile: () => api.get('/student/profile'),
  updateProfile: (data: any) =>
    api.put('/student/profile', data).then((r) => { invalidateDashboard(); return r; }),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.put('/student/change-password', data).then((r) => { invalidateDashboard(); return r; }),
  getEnrollmentStatus: () => api.get('/student/enrollment-status'),
  getEnrollment: (id: number) => api.get(`/student/enrollment/${id}`),
  getInternships: () => api.get('/student/internships'),
  enroll: (internshipId: number) =>
    api.post('/student/enroll', { internshipId }).then((r) => { invalidateDashboard(); return r; }),
  createPaymentOrder: (paymentId: number) =>
    api.post<{ demo: boolean; orderId: string; amount: number; currency: string; keyId: string | null }>(`/student/pay/${paymentId}/order`),
  verifyPayment: (paymentId: number, data: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) =>
    api.post<{ message: string; payment: Payment }>(`/student/pay/${paymentId}/verify`, data).then((r) => { invalidateDashboard(); return r; }),
  completeModule: (enrollmentId: number, moduleIndex: number) =>
    api.post(`/student/complete-module/${enrollmentId}`, { moduleIndex }).then((r) => { invalidateDashboard(); return r; }),
  uncompleteModule: (enrollmentId: number, moduleIndex: number) =>
    api.post(`/student/uncomplete-module/${enrollmentId}`, { moduleIndex }).then((r) => { invalidateDashboard(); return r; }),
  getExam: (enrollmentId: number) => api.get(`/student/exam/${enrollmentId}`),
  startExam: (examId: number) =>
    api.post(`/student/exam/${examId}/start`).then((r) => { invalidateDashboard(); return r; }),
  submitExam: (examId: number, answers: any[]) =>
    api.post(`/student/exam/${examId}/submit`, { answers }).then((r) => { invalidateDashboard(); return r; }),
  getLearningModules: (internshipId: number) => api.get<{ modules: LearningModule[] }>(`/student/learning-modules/${internshipId}`),
  getLearningModule: (moduleId: number) => api.get<{ module: LearningModule }>(`/student/learning-module/${moduleId}`),
  getLearningProgress: (internshipId: number) => api.get<{ progress: LearningProgress }>(`/student/learning-progress/${internshipId}`),
};

export interface College {
  id: number;
  universityId: number;
  name: string;
  district: string;
}

export interface University {
  id: number;
  name: string;
  shortName: string;
  location: string;
  type: 'central' | 'state' | 'private' | 'deemed';
  colleges: College[];
}

// Institutions API (universities & colleges managed from the admin panel)
export const institutionApi = {
  getUniversities: () => api.get<{ universities: University[] }>('/institutions'),
  createUniversity: (data: { name: string; shortName?: string; location?: string; type?: string }) =>
    api.post<{ university: University }>('/institutions/universities', data),
  updateUniversity: (id: number, data: { name: string; shortName?: string; location?: string; type?: string }) =>
    api.put<{ message: string; university: University }>(`/institutions/universities/${id}`, data),
  deleteUniversity: (id: number) => api.delete(`/institutions/universities/${id}`),
  createCollege: (data: { universityId: number; name: string; district?: string }) =>
    api.post<{ college: College }>('/institutions/colleges', data),
  updateCollege: (id: number, data: { name: string; district?: string }) =>
    api.put<{ message: string; college: College }>(`/institutions/colleges/${id}`, data),
  deleteCollege: (id: number) => api.delete(`/institutions/colleges/${id}`),
};

export interface Announcement {
  id: number;
  title: string;
  message: string;
  createdAt: string;
  read?: boolean;
  readCount?: number;
}

export interface ContactMessage {
  id: number;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  status: 'new' | 'read';
  createdAt: string;
}

interface AnalyticsSummary {
  visitors: number;
  clicks: number;
  pageviews: number;
  visits: number;
  avgClicks: number;
  signups: number;
  enrollments: number;
  revenue: number;
}

export interface AnalyticsBucket {
  bucket: string;
  visitors: number;
  clicks: number;
  pageviews: number;
  visits: number;
  signups: number;
  enrollments: number;
  revenue: number;
}

interface TopPage {
  path: string;
  views: number;
  clicks: number;
}

export interface AnalyticsResponse {
  range: '1d' | '7d' | '30d';
  hourly: boolean;
  summary: AnalyticsSummary;
  previous: AnalyticsSummary;
  series: AnalyticsBucket[];
  topPages: TopPage[];
}

// Announcements API (admin publishes, logged-in users read via the bell)
export const announcementApi = {
  list: () => api.get<{ announcements: Announcement[]; unread: number }>('/announcements'),
  create: (data: { title: string; message: string }) =>
    api.post<{ message: string; announcement: Announcement }>('/announcements', data),
  update: (id: number, data: { title: string; message: string }) =>
    api.put<{ message: string; announcement: Announcement }>(`/announcements/${id}`, data),
  remove: (id: number) => api.delete<{ message: string }>(`/announcements/${id}`),
  markRead: (id: number) => api.post<{ message: string }>(`/announcements/${id}/read`),
  markAllRead: () => api.post<{ message: string }>('/announcements/read-all'),
};

export default api;
