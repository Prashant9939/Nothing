import { useCallback, useEffect, useState } from 'react';
import { partnerApi } from '../../api';
import type { PartnerDetail, PartnerStudentRow } from '../../api';
import StudentDetailModal from '../../components/partner/StudentDetailModal';

export default function PartnerDocuments() {
  const [detail, setDetail] = useState<PartnerDetail | null>(null);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<PartnerStudentRow | null>(null);

  const load = useCallback(() => {
    partnerApi.getDashboard()
      .then((res) => setDetail(res.data))
      .catch((err) => {
        setError(err.response?.data?.error || 'Could not load documents.');
      });
  }, []);

  useEffect(() => { load(); }, [load]);

  if (error) {
    return (
      <div className="max-w-3xl mx-auto text-center">
        <div className="bg-white border border-gray-200 rounded-2xl p-10 shadow-sm">
          <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-red-500 text-xl font-bold">!</span>
          </div>
          <h1 className="text-lg font-bold text-gray-900">Documents unavailable</h1>
          <p className="text-sm text-gray-500 mt-2">{error}</p>
        </div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  const { kpis, documents, students } = detail;

  const stats = [
    { label: 'Total Documents', value: kpis.documents, sub: 'generated across your students' },
    { label: 'Certificates', value: kpis.certificates, sub: 'issued on completion' },
    { label: 'Enrollments with Docs', value: documents.length, sub: 'offer, report & attendance sets' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
        <p className="text-sm text-gray-500 mt-1">Offer letters, reports, marksheets and certificates for your students</p>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-xl p-4 border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 transition-all duration-300">
            <div className="text-lg font-bold text-gray-900">{s.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
            <div className="text-[10px] text-gray-400 mt-0.5">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          {documents.length === 0 ? (
            <div className="p-10 text-center text-sm text-gray-400">No documents generated yet — documents appear after students enroll and pay.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left p-4 font-medium text-gray-500">Student</th>
                  <th className="text-left p-4 font-medium text-gray-500">Program</th>
                  <th className="text-left p-4 font-medium text-gray-500">Offer Letter</th>
                  <th className="text-left p-4 font-medium text-gray-500">Project Report</th>
                  <th className="text-left p-4 font-medium text-gray-500">Attendance</th>
                  <th className="text-left p-4 font-medium text-gray-500">Certificate</th>
                  <th className="text-left p-4 font-medium text-gray-500">Status</th>
                  <th className="text-left p-4 font-medium text-gray-500">Download</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((d) => {
                  const docStudent = students.find((s) => s.studentId === d.studentId);
                  return (
                    <tr key={d.enrollmentId} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="p-4 font-medium text-gray-900">{d.studentFirstName} {d.studentLastName}</td>
                      <td className="p-4 text-gray-500">{d.programTitle}</td>
                      <td className="p-4 text-xs font-mono text-gray-600">{d.offerNo || '—'}</td>
                      <td className="p-4 text-xs font-mono text-gray-600">{d.reportNo || '—'}</td>
                      <td className="p-4 text-xs font-mono text-gray-600">{d.attendanceNo || '—'}</td>
                      <td className="p-4 text-xs font-mono text-gray-600">{d.certificateId || '—'}{d.grade ? ` · ${d.grade}` : ''}</td>
                      <td className="p-4">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${d.paid ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-700 border border-amber-100'}`}>
                          {d.paid ? 'verified' : 'unpaid'}
                        </span>
                      </td>
                      <td className="p-4">
                        {docStudent ? (
                          <button
                            onClick={() => setSelected(docStudent)}
                            className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-700 hover:border-orange-300 hover:text-orange-600 hover:bg-orange-50 hover:shadow-sm transition-all"
                          >
                            View Documents
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {selected && (
        <StudentDetailModal
          student={selected}
          students={students}
          payments={detail.payments}
          focusDocuments
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
