import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
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
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

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
  register: (data: any) => api.post<AuthResponse>('/auth/register', data),
  login: (data: any) => api.post<AuthResponse>('/auth/login', data),
  logout: () => api.post('/auth/logout'),
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
};

// Student API
export const studentApi = {
  getDashboard: () => api.get('/student/dashboard'),
  getProfile: () => api.get('/student/profile'),
  updateProfile: (data: any) => api.put('/student/profile', data),
  changePassword: (data: { currentPassword: string; newPassword: string }) => api.put('/student/change-password', data),
  getEnrollmentStatus: () => api.get('/student/enrollment-status'),
  getEnrollment: (id: number) => api.get(`/student/enrollment/${id}`),
  getInternships: () => api.get('/student/internships'),
  enroll: (internshipId: number) => api.post('/student/enroll', { internshipId }),
  createPaymentOrder: (paymentId: number) =>
    api.post<{ demo: boolean; orderId: string; amount: number; currency: string; keyId: string | null }>(`/student/pay/${paymentId}/order`),
  verifyPayment: (paymentId: number, data: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) =>
    api.post<{ message: string; payment: Payment }>(`/student/pay/${paymentId}/verify`, data),
  completeModule: (enrollmentId: number, moduleIndex: number) => api.post(`/student/complete-module/${enrollmentId}`, { moduleIndex }),
  uncompleteModule: (enrollmentId: number, moduleIndex: number) => api.post(`/student/uncomplete-module/${enrollmentId}`, { moduleIndex }),
  getExam: (enrollmentId: number) => api.get(`/student/exam/${enrollmentId}`),
  startExam: (examId: number) => api.post(`/student/exam/${examId}/start`),
  submitExam: (examId: number, answers: any[]) => api.post(`/student/exam/${examId}/submit`, { answers }),
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
