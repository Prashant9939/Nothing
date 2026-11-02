import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { adminApi } from '../../api';
import { usePopup } from '../../context/PopupContext';
import Pagination, { PAGE_SIZE, useDebouncedValue } from '../../components/admin/Pagination';
import type { User } from '../../api';

interface UserDetails {
  user: User;
  enrollments: any[];
  payments: any[];
  exams: any[];
  certificates: any[];
}

export default function AdminUsers() {
  const popup = usePopup();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [course, setCourse] = useState('');
  const [courses, setCourses] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedUser, setSelectedUser] = useState<UserDetails | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  // Debounced server-side search; a new query jumps back to page 1.
  const search = useDebouncedValue(searchInput);
  useEffect(() => { setPage(1); }, [search, course]);

  useEffect(() => {
    let cancelled = false;
    setFetching(true);
    adminApi.getUsers({ page, limit: PAGE_SIZE, search, course })
      .then((res) => {
        if (cancelled) return;
        setUsers(res.data.users);
        setTotal(res.data.total);
        setPages(res.data.pages);
        setPage(res.data.page); // server clamps (e.g. last page emptied by a delete)
        if (res.data.courses) setCourses(res.data.courses);
      })
      .catch(() => { if (!cancelled) popup.error('Failed to load users. Please try again.', 'Load Failed'); })
      .finally(() => { if (!cancelled) { setFetching(false); setLoading(false); } });
    return () => { cancelled = true; };
  }, [page, search, course, refreshKey]);

  const refresh = () => setRefreshKey((k) => k + 1);

  const updateRole = async (id: number, role: string) => {
    try {
      await adminApi.updateUserRole(id, role);
      refresh(); // a promotion moves the row to Admins, so re-pull the page
    } catch (err: any) {
      popup.error(err.response?.data?.error || 'Failed to update role. Please try again.', 'Update Failed');
    }
  };

  const viewUser = async (id: number) => {
    setDetailLoading(true);
    try {
      const res = await adminApi.getUser(id);
      setSelectedUser(res.data);
    } catch {
      popup.error('Failed to load user details. Please try again.', 'Load Failed');
    } finally {
      setDetailLoading(false);
    }
  };

  const deleteUser = async (id: number) => {
    try {
      await adminApi.deleteUser(id);
      setDeleteConfirm(null);
      if (selectedUser?.user.id === id) setSelectedUser(null);
      refresh(); // totals and page clamping come from the server
    } catch (err: any) {
      popup.error(err.response?.data?.error || 'Failed to delete user. Please try again.', 'Delete Failed');
    }
  };

  if (loading) return <div className="flex items-center justify-center h-[60vh]"><div className="w-8 h-8 border-2 border-slate-200 border-t-slate-800 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div><h1 className="text-2xl font-bold text-gray-900">Manage Users</h1><p className="text-sm text-gray-500 mt-1">{total} students · admin accounts are in <span className="text-slate-700 font-medium">Admins</span>, partner accounts in <span className="text-slate-700 font-medium">Partners</span></p></div>
        <div className="flex items-center gap-3">
          <select
            value={course}
            onChange={(e) => setCourse(e.target.value)}
            aria-label="Filter by course"
            className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-700/20 focus:border-slate-600 transition-all"
          >
            <option value="">All courses</option>
            {courses.map((c) => (
              <option key={c} value={c}>{c.toUpperCase()}</option>
            ))}
          </select>
          <input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search users..." className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm w-64 focus:outline-none focus:ring-2 focus:ring-slate-700/20 focus:border-slate-600 transition-all" />
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className={`overflow-x-auto transition-opacity ${fetching ? 'opacity-60' : ''}`}>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left p-4 font-medium text-gray-500">Name</th>
                <th className="text-left p-4 font-medium text-gray-500">Email</th>
                <th className="text-left p-4 font-medium text-gray-500">College</th>
                <th className="text-left p-4 font-medium text-gray-500">Course</th>
                <th className="text-left p-4 font-medium text-gray-500">Role</th>
                <th className="text-left p-4 font-medium text-gray-500">Joined</th>
                <th className="text-left p-4 font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && !fetching && (
                <tr className="border-t border-gray-100">
                  <td colSpan={7} className="p-8 text-center text-sm text-gray-500">No students match your search.</td>
                </tr>
              )}
              {users.map((u) => (
                <tr key={u.id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="p-4 font-medium text-gray-900">{u.firstName} {u.lastName}</td>
                  <td className="p-4 text-gray-500">{u.email}</td>
                  <td className="p-4 text-gray-500">{u.college}</td>
                  <td className="p-4 text-gray-500">{(u.course || '').toUpperCase()}</td>
                  <td className="p-4">
                    <select value={u.role} onChange={(e) => updateRole(u.id, e.target.value)} className="text-xs border border-gray-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-slate-700/20">
                      <option value="student">Student</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="p-4 text-gray-500 text-xs">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <button onClick={() => viewUser(u.id)} className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">View</button>
                      {u.role !== 'admin' && (
                        deleteConfirm === u.id ? (
                          <div className="flex gap-1">
                            <button onClick={() => deleteUser(u.id)} className="px-2 py-1.5 text-xs font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors">Confirm</button>
                            <button onClick={() => setDeleteConfirm(null)} className="px-2 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">Cancel</button>
                          </div>
                        ) : (
                          <button onClick={() => setDeleteConfirm(u.id)} className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">Delete</button>
                        )
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pages={pages} total={total} noun="students" onPage={setPage} />
      </div>

      {/* User Detail Modal */}
      {(selectedUser || detailLoading) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedUser(null)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-xl" onClick={e => e.stopPropagation()}>
            {detailLoading ? (
              <div className="p-10 text-center">
                <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-800 rounded-full animate-spin mx-auto" />
                <p className="text-sm text-gray-500 mt-4">Loading user details...</p>
              </div>
            ) : selectedUser && (
              <>
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{selectedUser.user.firstName} {selectedUser.user.lastName}</h2>
                    <p className="text-sm text-gray-500">{selectedUser.user.email}</p>
                  </div>
                  <button onClick={() => setSelectedUser(null)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-600 transition-colors"><X size={18} /></button>
                </div>

                <div className="p-6 space-y-6">
                  {/* User Info */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Personal Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 rounded-xl p-3">
                        <div className="text-xs text-gray-500">Phone</div>
                        <div className="text-sm font-medium text-gray-900">{selectedUser.user.phone || 'N/A'}</div>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-3">
                        <div className="text-xs text-gray-500">University</div>
                        <div className="text-sm font-medium text-gray-900">{(selectedUser.user as any).university || 'N/A'}</div>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-3">
                        <div className="text-xs text-gray-500">College</div>
                        <div className="text-sm font-medium text-gray-900">{selectedUser.user.college || 'N/A'}</div>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-3">
                        <div className="text-xs text-gray-500">Course</div>
                        <div className="text-sm font-medium text-gray-900">{selectedUser.user.course ? selectedUser.user.course.toUpperCase() : 'N/A'}</div>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-3">
                        <div className="text-xs text-gray-500">Role</div>
                        <div className="text-sm font-medium text-gray-900 capitalize">{selectedUser.user.role}</div>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-3">
                        <div className="text-xs text-gray-500">Joined</div>
                        <div className="text-sm font-medium text-gray-900">{new Date(selectedUser.user.createdAt).toLocaleDateString()}</div>
                      </div>
                    </div>
                  </div>

                  {/* Enrollments */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Enrollments ({selectedUser.enrollments.length})</h3>
                    {selectedUser.enrollments.length === 0 ? (
                      <p className="text-sm text-gray-500">No enrollments</p>
                    ) : (
                      <div className="space-y-2">
                        {selectedUser.enrollments.map((e: any) => (
                          <div key={e.id} className="flex items-center justify-between gap-3 bg-gray-50 rounded-xl p-3">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{e.internshipTitle}</div>
                              <div className="text-xs text-gray-500">{new Date(e.enrolledAt).toLocaleDateString()}</div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${e.status === 'active' ? 'bg-green-100 text-green-700' : e.status === 'completed' ? 'bg-blue-100 text-blue-700' : e.status === 'expired' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{e.status}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Payments */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Payments ({selectedUser.payments.length})</h3>
                    {selectedUser.payments.length === 0 ? (
                      <p className="text-sm text-gray-500">No payments</p>
                    ) : (
                      <div className="space-y-2">
                        {selectedUser.payments.map((p: any) => (
                          <div key={p.id} className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
                            <div>
                              <div className="text-sm font-medium text-gray-900">₹{Number(p.amount).toLocaleString('en-IN')}</div>
                              <div className="text-xs text-gray-500">{p.receiptNumber} · {new Date(p.createdAt).toLocaleDateString()}</div>
                            </div>
                            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${p.status === 'completed' ? 'bg-green-100 text-green-700' : p.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{p.status}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Exams */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Exams ({selectedUser.exams.length})</h3>
                    {selectedUser.exams.length === 0 ? (
                      <p className="text-sm text-gray-500">No exams</p>
                    ) : (
                      <div className="space-y-2">
                        {selectedUser.exams.map((ex: any) => (
                          <div key={ex.id} className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{ex.internshipTitle || `Exam #${ex.id}`}</div>
                              <div className="text-xs text-gray-500">Score: {ex.score != null ? `${ex.score}%` : 'N/A'} · {new Date(ex.createdAt || ex.startedAt || Date.now()).toLocaleDateString()}</div>
                            </div>
                            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${ex.status === 'completed' ? 'bg-green-100 text-green-700' : ex.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{ex.status}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Certificates */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Certificates ({selectedUser.certificates.length})</h3>
                    {selectedUser.certificates.length === 0 ? (
                      <p className="text-sm text-gray-500">No certificates</p>
                    ) : (
                      <div className="space-y-2">
                        {selectedUser.certificates.map((c: any) => (
                          <div key={c.id} className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{c.certificateId}</div>
                              <div className="text-xs text-gray-500">Grade: {c.grade} · Score: {c.score}%</div>
                            </div>
                            <span className="text-xs text-gray-500">{c.issuedAt ? new Date(c.issuedAt).toLocaleDateString() : 'N/A'}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
