import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import API from '../../utils/api';
import { FiDroplet, FiHeart, FiAlertCircle, FiPlusCircle, FiClock } from 'react-icons/fi';
import toast from 'react-hot-toast';

const StatCard = ({ icon, label, value, sub, color = 'blood' }) => (
  <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
    <div className={`w-10 h-10 rounded-lg bg-${color}-50 flex items-center justify-center mb-3`}>
      <span className={`text-${color}-600 text-xl`}>{icon}</span>
    </div>
    <p className="text-2xl font-bold text-gray-900">{value}</p>
    <p className="text-sm font-medium text-gray-600 mt-0.5">{label}</p>
    {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
  </div>
);

const Dashboard = () => {
  const { user } = useSelector((s) => s.auth);
  const [myDonations, setMyDonations] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [d, r] = await Promise.all([
          API.get('/donations/my'),
          API.get('/requests/my'),
        ]);
        setMyDonations(d.data.data);
        setMyRequests(r.data.data);
      } catch { toast.error('Failed to load data'); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const statusColor = {
    PENDING: 'bg-yellow-100 text-yellow-700',
    APPROVED: 'bg-green-100 text-green-700',
    REJECTED: 'bg-red-100 text-red-700',
    OPEN: 'bg-blue-100 text-blue-700',
    FULFILLED: 'bg-green-100 text-green-700',
    CLOSED: 'bg-gray-100 text-gray-600',
  };

  const urgencyColor = {
    Normal: 'bg-gray-100 text-gray-600',
    Urgent: 'bg-orange-100 text-orange-700',
    Critical: 'bg-red-100 text-red-700',
  };

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="w-10 h-10 border-4 border-blood-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const approved = myDonations.filter((d) => d.status === 'APPROVED').length;
  const pending = myDonations.filter((d) => d.status === 'PENDING').length;
  const openReqs = myRequests.filter((r) => r.status === 'OPEN').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-gray-900">
          Welcome back, {user?.name?.split(' ')[0]}! 👋
        </h1>
        <p className="text-gray-500 mt-1">
          Blood Group: <span className="font-bold text-blood-600">{user?.bloodGroup || 'Not set'}</span>
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard icon={<FiDroplet />} label="Total Donations" value={myDonations.length} />
        <StatCard icon={<FiHeart />} label="Approved" value={approved} color="green" />
        <StatCard icon={<FiClock />} label="Pending Review" value={pending} color="yellow" />
        <StatCard icon={<FiAlertCircle />} label="Open Requests" value={openReqs} color="blue" />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <Link to="/donations/new"
          className="flex items-center gap-4 bg-blood-600 text-white p-5 rounded-xl hover:bg-blood-700 transition-colors shadow-lg shadow-blood-200">
          <FiPlusCircle size={28} />
          <div>
            <p className="font-semibold text-lg">Submit Donation</p>
            <p className="text-blood-100 text-sm">Donate blood and save lives</p>
          </div>
        </Link>
        <Link to="/requests/new"
          className="flex items-center gap-4 bg-white border-2 border-blood-200 text-blood-700 p-5 rounded-xl hover:border-blood-400 hover:bg-blood-50 transition-colors">
          <FiAlertCircle size={28} />
          <div>
            <p className="font-semibold text-lg">Request Blood</p>
            <p className="text-gray-500 text-sm">Find compatible donors near you</p>
          </div>
        </Link>
      </div>

      {/* Recent Donations */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm mb-6">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
          <h2 className="font-semibold text-gray-900">My Donations</h2>
          <Link to="/donations" className="text-sm text-blood-600 hover:underline">View all</Link>
        </div>
        {myDonations.length === 0 ? (
          <p className="text-center text-gray-400 py-10">No donations yet. Be a hero — donate blood!</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {myDonations.slice(0, 5).map((d) => (
              <div key={d._id} className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blood-100 flex items-center justify-center font-bold text-blood-700">
                    {d.bloodGroup}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{d.bloodType} — {d.units} unit(s)</p>
                    <p className="text-xs text-gray-400">{new Date(d.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColor[d.status] || 'bg-gray-100 text-gray-600'}`}>
                  {d.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Requests */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
          <h2 className="font-semibold text-gray-900">My Blood Requests</h2>
          <Link to="/requests" className="text-sm text-blood-600 hover:underline">View all</Link>
        </div>
        {myRequests.length === 0 ? (
          <p className="text-center text-gray-400 py-10">No requests yet.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {myRequests.slice(0, 5).map((r) => (
              <div key={r._id} className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    {r.bloodGroup} — {r.unitsRequired} unit(s) — {r.hospitalName}
                  </p>
                  <p className="text-xs text-gray-400">{new Date(r.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="flex gap-2">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${urgencyColor[r.urgency]}`}>{r.urgency}</span>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColor[r.status] || 'bg-gray-100 text-gray-600'}`}>{r.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
