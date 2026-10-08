import { useEffect, useRef, useState } from 'react';
import type { PartnerPaymentRow, PartnerStudentRow } from '../../api';
import { XIcon } from '@animateicons/react/lucide';
import { Download } from 'lucide-react';
import { usePopup } from '../../context/PopupContext';
import { downloadFile } from '../../utils/downloadFile';

const formatDate = (iso?: string | null) => {
  if (!iso) return '—';
  const d = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(iso)
    ? new Date(`${iso.replace(' ', 'T')}Z`)
    : new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const fmtMoney = (n: number) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

const paymentBadge = (status: string | null) => {
  if (status === 'completed') return 'bg-emerald-50 text-emerald-600 border border-emerald-100';
  if (status === 'pending') return 'bg-amber-50 text-amber-700 border border-amber-100';
  if (status === 'failed') return 'bg-red-50 text-red-600 border border-red-100';
  if (status === 'refunded') return 'bg-slate-100 text-slate-700 border border-slate-200';
  return 'bg-gray-50 text-gray-500 border border-gray-200';
};

const enrollmentBadge = (status: string) => {
  if (status === 'active') return 'bg-emerald-50 text-emerald-600 border border-emerald-100';
  if (status === 'completed') return 'bg-blue-50 text-blue-600 border border-blue-100';
  if (status === 'expired') return 'bg-red-50 text-red-600 border border-red-100';
  if (status === 'refunded') return 'bg-slate-100 text-slate-700 border border-slate-200';
  if (status === 'none') return 'bg-gray-50 text-gray-500 border border-gray-200';
  return 'bg-amber-50 text-amber-700 border border-amber-100';
};

const enrollmentLabel = (status: string) => (status === 'none' ? 'not enrolled' : status);

interface Props {
  student: PartnerStudentRow;
  /** Full roster — filtered internally to this student's enrollment rows. */
  students: PartnerStudentRow[];
  payments: PartnerPaymentRow[];
  /** Smooth-scroll the documents section into view on open. */
  focusDocuments?: boolean;
  onClose: () => void;
}

export default function StudentDetailModal({ student, students, payments, focusDocuments = false, onClose }: Props) {
  const popup = usePopup();
  const [downloading, setDownloading] = useState<string | null>(null);
  const docsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (focusDocuments) {
      docsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [focusDocuments]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const runDownload = async (url: string, filename: string) => {
    setDownloading(filename);
    try {
      await downloadFile(url, filename);
    } catch (err) {
      popup.error((err as Error).message, 'Download Failed');
    } finally {
      setDownloading(null);
    }
  };

  // Downloadable documents for one student row (enrollment-scoped).
  const rowDocs = (row: PartnerStudentRow) => {
    if (row.enrollmentId == null) return [] as { key: string; label: string; url: string; file: string }[];
    const id = row.enrollmentId;
    const paid = row.paymentStatus === 'completed';
    const passed = row.enrollmentStatus === 'completed' || !!row.certificateId;
    const paidPayment = payments.find((p) => p.enrollmentId === id && p.status === 'completed');
    const docs: { key: string; label: string; url: string; file: string }[] = [];
    if (paidPayment) {
      docs.push({ key: 'receipt', label: 'Receipt', url: `/api/student/download/receipt/${paidPayment.id}`, file: `receipt-${paidPayment.receiptNumber || paidPayment.id}.pdf` });
    }
    if (paid) {
      docs.push({ key: 'offer', label: 'Offer Letter', url: `/api/student/download/offer-letter/${id}`, file: `offer-letter-${id}.pdf` });
      docs.push({ key: 'attendance', label: 'Attendance', url: `/api/student/download/attendance/${id}`, file: `attendance-${id}.pdf` });
    }
    if (paid && passed) {
      docs.push({ key: 'report', label: 'Project Report', url: `/api/student/download/project-report/${id}`, file: `internship-report-${id}.pdf` });
      docs.push({ key: 'marksheet', label: 'Marksheet', url: `/api/student/download/marksheet/${id}`, file: `internship-marksheet-${id}.pdf` });
      docs.push({ key: 'logbook', label: 'Log Book', url: `/api/student/download/log-book/${id}`, file: `daily-log-book-${id}.pdf` });
      docs.push({ key: 'consent', label: 'Consent Form', url: `/api/student/download/form/consent/${id}`, file: `consent-form-${id}.pdf` });
      docs.push({ key: 'undertaking', label: 'Undertaking', url: `/api/student/download/form/undertaking/${id}`, file: `undertaking-form-${id}.pdf` });
      docs.push({ key: 'feedback', label: 'Feedback Form', url: `/api/student/download/form/feedback/${id}`, file: `feedback-form-${id}.pdf` });
    }
    if (row.certificateId) {
      docs.push({ key: 'cert', label: 'Certificate', url: `/api/student/download/certificate/${row.certificateId}`, file: `certificate-${row.certificateId}.pdf` });
    }
    return docs;
  };

  const studentRows = students.filter((s) => s.studentId === student.studentId);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-xl animate-pop-in" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{student.studentFirstName} {student.studentLastName}</h2>
            <p className="text-sm text-gray-500">{student.studentEmail} · {student.studentPhone || 'no phone'}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-600 transition-colors">
            <XIcon size={18} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Student Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-xl p-3">
                <div className="text-xs text-gray-500">College</div>
                <div className="text-sm font-medium text-gray-900">{student.studentCollege || 'N/A'}</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <div className="text-xs text-gray-500">Course</div>
                <div className="text-sm font-medium text-gray-900">{student.studentCourse ? student.studentCourse.toUpperCase() : 'N/A'}</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <div className="text-xs text-gray-500">Program</div>
                <div className="text-sm font-medium text-gray-900">{studentRows.find((r) => r.enrollmentId != null)?.programTitle || 'Not enrolled yet'}</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <div className="text-xs text-gray-500">Enrolled</div>
                <div className="text-sm font-medium text-gray-900">{formatDate(student.enrolledAt)}</div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Enrollment</h3>
            <div className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
              <div className="text-sm font-medium text-gray-900">Progress: {student.progress || 0}%</div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${enrollmentBadge(student.enrollmentStatus)}`}>{enrollmentLabel(student.enrollmentStatus)}</span>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Payment</h3>
            <div className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
              <div>
                <div className="text-sm font-medium text-gray-900">
                  {student.paymentAmount != null ? fmtMoney(student.paymentAmount) : 'No payment yet'}
                </div>
                <div className="text-xs text-gray-500">
                  {student.receiptNumber || 'no receipt'}{student.paidAt ? ` · ${formatDate(student.paidAt)}` : ''}
                </div>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${paymentBadge(student.paymentStatus)}`}>{student.paymentStatus || 'unpaid'}</span>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Certificate</h3>
            {student.certificateId ? (
              <div className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
                <div>
                  <div className="text-sm font-medium text-gray-900">{student.certificateId}</div>
                  <div className="text-xs text-gray-500">Issued {formatDate(student.certificateIssuedAt)}</div>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-amber-50 text-amber-700 border border-amber-100">
                  {student.grade || '—'}{student.score != null ? ` · ${student.score}%` : ''}
                </span>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No certificate issued yet</p>
            )}
          </div>

          {/* Documents — one group per enrollment, gated exactly like the
              student's own documents page (paid → receipt/offer/attendance,
              passed → report/marksheet/log book/forms, cert when issued). */}
          <div ref={docsRef}>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Documents</h3>
            {studentRows.filter((r) => r.enrollmentId != null).length === 0 ? (
              <p className="text-sm text-gray-500">No enrollments yet — documents unlock after the student enrolls in a program.</p>
            ) : (
              <div className="space-y-3">
                {studentRows.map((row) => {
                  if (row.enrollmentId == null) return null;
                  const docs = rowDocs(row);
                  return (
                    <div key={row.enrollmentId} className="bg-gray-50 rounded-xl p-3 space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm font-medium text-gray-900">{row.programTitle || 'Program'}</span>
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${enrollmentBadge(row.enrollmentStatus)}`}>{enrollmentLabel(row.enrollmentStatus)}</span>
                      </div>
                      {docs.length === 0 ? (
                        <p className="text-xs text-gray-400">No documents available yet — payment pending.</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {docs.map((d) => (
                            <button
                              key={d.key}
                              onClick={() => runDownload(d.url, d.file)}
                              disabled={!!downloading}
                              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-lg border transition-all disabled:opacity-50 disabled:cursor-wait ${
                                downloading === d.file
                                  ? 'border-orange-200 bg-orange-50 text-orange-600'
                                  : 'border-gray-200 bg-white text-gray-700 hover:border-orange-300 hover:text-orange-600 hover:bg-orange-50 hover:shadow-sm'
                              }`}
                              title={`Download ${d.label}`}
                            >
                              <Download size={13} className={downloading === d.file ? 'animate-pulse' : ''} />
                              {downloading === d.file ? 'Downloading…' : d.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
