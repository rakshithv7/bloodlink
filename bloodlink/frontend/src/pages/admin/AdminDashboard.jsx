import React, { useState, useEffect, useCallback } from 'react';
import API from '../../utils/api';
import toast from 'react-hot-toast';
import { FiUsers, FiDroplet, FiCheckCircle, FiClock, FiAlertCircle, FiFileText, FiActivity } from 'react-icons/fi';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const TABS = ['Overview', 'Hospitals', 'Managers', 'Users', 'Audit Logs'];
const BLOOD_COLORS = ['#dc2626','#ea580c','#d97706','#65a30d','#059669','#0891b2','#4f46e5','#7c3aed'];

const StatCard = ({ icon, label, value, color = 'blood', sub }) => (
  <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
    <div className={`w-10 h-10 rounded-lg bg-${color}-50 flex items-center justify-center mb-3`}>
      <span className={`text-${color}-600 text-xl`}>{icon}</span>
    </div>
    <p className="text-2xl font-bold text-gray-900">{value ?? '—'}</p>
    <p className="text-sm text-gray-500 mt-0.5">{label}</p>
    {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
  </div>
);

const AdminDashboard = () => {
  const [tab, setTab] = useState('Overview');
  const [analytics, setAnalytics] = useState(null);
  const [hospitals, setHospitals] = useState([]);
  const [managers, setManagers] = useState([]);
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadAnalytics = useCallback(async () => {
    try {
      const { data } = await API.get('/admin/analytics');
      setAnalytics(data.data);
    } catch { toast.error('Failed to load analytics'); }
  }, []);

  const loadHospitals = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/admin/pending-hospitals');
      setHospitals(data.data);
    } catch { toast.error('Failed to load hospitals'); }
    setLoading(false);
  }, []);

  const loadManagers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/admin/pending-managers');
      setManagers(data.data);
    } catch {}
    setLoading(false);
  }, []);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/admin/users?limit=30');
      setUsers(data.data);
    } catch {}
    setLoading(false);
  }, []);

  const loadAuditLogs = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/admin/audit-logs?limit=30');
      setAuditLogs(data.logs);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAnalytics();
    if (tab === 'Hospitals') loadHospitals();
    if (tab === 'Managers') loadManagers();
    if (tab === 'Users') loadUsers();
    if (tab === 'Audit Logs') loadAuditLogs();
  }, [tab]);

  const approveHospital = async (id, action) => {
    try {
      await API.patch(`/admin/hospitals/${id}/approval`, { action });
      toast.success(`Hospital ${action.toLowerCase()}d`);
      loadHospitals();
      loadAnalytics();
    } catch { toast.error('Action failed'); }
  };

  const approveManager = async (id, action) => {
    try {
      await API.patch(`/admin/managers/${id}/approval`, { action });
      toast.success(`Manager ${action.toLowerCase()}d`);
      loadManagers();
    } catch { toast.error('Action failed'); }
  };

  const toggleUser = async (id) => {
    try {
      await API.patch(`/admin/users/${id}/toggle-status`);
      toast.success('User status updated');
      loadUsers();
    } catch { toast.error('Failed'); }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-gray-900">Super Admin Dashboard</h1>
        <p className="text-gray-400 text-sm">System-wide control and analytics</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-8 w-fit">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              tab === t ? 'bg-white text-blood-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {t}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === 'Overview' && analytics && (
        <div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard icon={<FiUsers />} label="Total Donors" value={analytics.totalDonors} />
            <StatCard icon={<FiCheckCircle />} label="Approved Hospitals" value={analytics.totalHospitals} color="green" />
            <StatCard icon={<FiClock />} label="Pending Hospitals" value={analytics.pendingHospitals} color="yellow" />
            <StatCard icon={<FiAlertCircle />} label="Critical Requests" value={analytics.criticalRequests} color="red" />
            <StatCard icon={<FiDroplet />} label="Total Donations" value={analytics.totalDonations} />
            <StatCard icon={<FiClock />} label="Pending Donations" value={analytics.pendingDonations} color="orange" />
            <StatCard icon={<FiActivity />} label="Open Requests" value={analytics.openRequests} color="blue" />
            <StatCard icon={<FiAlertCircle />} label="Expiring (3 days)" value={analytics.expiringDonations} color="red" />
          </div>

          {/* Blood Group Chart */}
          {analytics.bloodGroupStats?.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                <h2 className="font-semibold text-gray-900 mb-4">Blood Group Inventory</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={analytics.bloodGroupStats.map((s) => ({ name: s._id, units: s.count }))}>
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="units" radius={[4, 4, 0, 0]}>
                      {analytics.bloodGroupStats.map((_, i) => <Cell key={i} fill={BLOOD_COLORS[i % BLOOD_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                <h2 className="font-semibold text-gray-900 mb-4">Blood Group Distribution</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={analytics.bloodGroupStats.map((s) => ({ name: s._id, value: s.count }))}
                      dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {analytics.bloodGroupStats.map((_, i) => <Cell key={i} fill={BLOOD_COLORS[i % BLOOD_COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Hospitals */}
      {tab === 'Hospitals' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-50">
            <h2 className="font-semibold text-gray-900">Pending Hospital Approvals ({hospitals.length})</h2>
          </div>
          {hospitals.length === 0 ? (
            <p className="text-center text-gray-400 py-12">No pending hospital approvals</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {hospitals.map((h) => (
                <div key={h._id} className="px-6 py-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{h.hospitalName}</p>
                    <p className="text-sm text-gray-500">{h.email} • Reg: {h.hospitalRegNumber}</p>
                    <p className="text-xs text-gray-400">{new Date(h.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => approveHospital(h._id, 'APPROVE')}
                      className="bg-green-600 text-white text-sm px-4 py-1.5 rounded-lg hover:bg-green-700 font-medium">
                      Approve
                    </button>
                    <button onClick={() => approveHospital(h._id, 'REJECT')}
                      className="bg-red-100 text-red-700 text-sm px-4 py-1.5 rounded-lg hover:bg-red-200 font-medium">
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Managers */}
      {tab === 'Managers' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-50">
            <h2 className="font-semibold text-gray-900">Pending Manager Approvals ({managers.length})</h2>
          </div>
          {managers.length === 0 ? (
            <p className="text-center text-gray-400 py-12">No pending manager approvals</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {managers.map((m) => (
                <div key={m._id} className="px-6 py-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{m.name}</p>
                    <p className="text-sm text-gray-500">{m.email}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => approveManager(m._id, 'APPROVE')} className="bg-green-600 text-white text-sm px-4 py-1.5 rounded-lg hover:bg-green-700 font-medium">Approve</button>
                    <button onClick={() => approveManager(m._id, 'REJECT')} className="bg-red-100 text-red-700 text-sm px-4 py-1.5 rounded-lg hover:bg-red-200 font-medium">Reject</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Users */}
      {tab === 'Users' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-50"><h2 className="font-semibold text-gray-900">All Users</h2></div>
          <div className="divide-y divide-gray-50">
            {users.map((u) => (
              <div key={u._id} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{u.name} {u.bloodGroup && <span className="text-blood-600 text-xs font-bold ml-1">{u.bloodGroup}</span>}</p>
                  <p className="text-sm text-gray-500">{u.email} • <span className="capitalize">{u.role.replace(/_/g,' ').toLowerCase()}</span></p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {u.isActive ? 'Active' : 'Inactive'}
                  </span>
                  {u.role !== 'SUPER_ADMIN' && (
                    <button onClick={() => toggleUser(u._id)}
                      className="text-xs text-gray-500 hover:text-blood-600 border border-gray-200 px-3 py-1 rounded-lg hover:border-blood-300">
                      Toggle
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Audit Logs */}
      {tab === 'Audit Logs' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-50"><h2 className="font-semibold text-gray-900">Audit Logs</h2></div>
          <div className="divide-y divide-gray-50">
            {auditLogs.map((log) => (
              <div key={log._id} className="px-6 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800">{log.action}</p>
                  <p className="text-xs text-gray-400">
                    By {log.performedBy?.name || '?'} • {log.ipAddress} • {new Date(log.createdAt).toLocaleString()}
                  </p>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${log.status === 'SUCCESS' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {log.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
