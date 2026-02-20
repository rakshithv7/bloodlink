import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../../utils/api';
import toast from 'react-hot-toast';
import { FiDroplet, FiPlusCircle, FiFilter } from 'react-icons/fi';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const statusColor = {
  PENDING:  'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  EXPIRED:  'bg-gray-100 text-gray-500',
  USED:     'bg-blue-100 text-blue-700',
};

const DonationsList = () => {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [statusFilter, setStatus] = useState('');
  const [bgFilter, setBg]         = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/donations/my');
      setDonations(data.data || []);
    } catch {
      toast.error('Failed to load donations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = donations.filter(d => {
    if (statusFilter && d.status !== statusFilter) return false;
    if (bgFilter && d.bloodGroup !== bgFilter) return false;
    return true;
  });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Donations</h1>
          <p className="text-gray-500 text-sm mt-1">{filtered.length} donation(s)</p>
        </div>
        <Link to="/donations/new"
          className="flex items-center gap-2 bg-red-600 text-white px-4 py-2.5 rounded-lg font-semibold hover:bg-red-700 transition-colors shadow-md">
          <FiPlusCircle /> New Donation
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-6 flex flex-wrap gap-3 items-center">
        <FiFilter className="text-gray-400" />
        <select value={statusFilter} onChange={(e) => setStatus(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
          <option value="">All Statuses</option>
          {['PENDING','APPROVED','REJECTED','EXPIRED','USED'].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select value={bgFilter} onChange={(e) => setBg(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
          <option value="">All Blood Groups</option>
          {BLOOD_GROUPS.map(bg => <option key={bg} value={bg}>{bg}</option>)}
        </select>
        {(statusFilter || bgFilter) && (
          <button onClick={() => { setStatus(''); setBg(''); }}
            className="text-sm text-red-600 hover:underline">Clear</button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <FiDroplet className="mx-auto text-5xl text-gray-200 mb-4" />
          <p className="text-gray-400 font-medium">No donations found</p>
          <Link to="/donations/new" className="mt-3 inline-block text-red-600 font-semibold hover:underline">
            Submit your first donation →
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
          {filtered.map((d) => {
            const daysLeft = d.expiryDate
              ? Math.ceil((new Date(d.expiryDate) - Date.now()) / 86400000)
              : null;
            return (
              <div key={d._id} className="p-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center font-bold text-red-700 text-sm flex-shrink-0">
                    {d.bloodGroup}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{d.name}</p>
                    <div className="flex flex-wrap gap-x-4 mt-1 text-xs text-gray-500">
                      <span>Type: <strong>{d.bloodType}</strong></span>
                      <span>Units: <strong>{d.units}</strong></span>
                      <span>Weight: <strong>{d.weight} kg</strong></span>
                      <span>Hb: <strong>{d.hemoglobin} g/dL</strong></span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Submitted: {new Date(d.createdAt).toLocaleDateString()}
                    </p>
                    {d.status === 'APPROVED' && daysLeft !== null && (
                      <p className={`text-xs mt-1 font-medium ${daysLeft <= 3 ? 'text-red-600' : 'text-green-600'}`}>
                        {daysLeft <= 0 ? 'Expired' : `Expires in ${daysLeft} day(s)`}
                      </p>
                    )}
                    {d.status === 'REJECTED' && d.rejectionReason && (
                      <p className="text-xs text-red-500 mt-1">Reason: {d.rejectionReason}</p>
                    )}
                  </div>
                </div>
                <span className={`text-xs font-bold px-3 py-1 rounded-full flex-shrink-0 ${statusColor[d.status] || 'bg-gray-100 text-gray-600'}`}>
                  {d.status}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DonationsList;