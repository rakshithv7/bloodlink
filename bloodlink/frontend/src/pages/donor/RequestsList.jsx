import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../../utils/api';
import toast from 'react-hot-toast';
import { FiAlertCircle, FiPlusCircle, FiFilter, FiMapPin, FiUsers } from 'react-icons/fi';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const statusColor = {
  OPEN:                'bg-blue-100 text-blue-700',
  FULFILLED:           'bg-green-100 text-green-700',
  PARTIALLY_FULFILLED: 'bg-yellow-100 text-yellow-700',
  CLOSED:              'bg-gray-100 text-gray-500',
  EXPIRED:             'bg-red-100 text-red-600',
};

const urgencyColor = {
  Normal:   'bg-gray-100 text-gray-600',
  Urgent:   'bg-orange-100 text-orange-700',
  Critical: 'bg-red-100 text-red-700',
};

const urgencyDot = {
  Normal:   'bg-gray-400',
  Urgent:   'bg-orange-500',
  Critical: 'bg-red-600 animate-pulse',
};

const RequestsList = () => {
  const [requests, setRequests]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [statusFilter, setStatus] = useState('');
  const [bgFilter, setBg]         = useState('');
  const [urgFilter, setUrg]       = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await API.get('/requests/my');
        setRequests(data.data || []);
      } catch {
        toast.error('Failed to load requests');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = requests.filter(r => {
    if (statusFilter && r.status !== statusFilter) return false;
    if (bgFilter && r.bloodGroup !== bgFilter) return false;
    if (urgFilter && r.urgency !== urgFilter) return false;
    return true;
  });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Blood Requests</h1>
          <p className="text-gray-500 text-sm mt-1">{filtered.length} request(s)</p>
        </div>
        <Link to="/requests/new"
          className="flex items-center gap-2 bg-red-600 text-white px-4 py-2.5 rounded-lg font-semibold hover:bg-red-700 transition-colors shadow-md">
          <FiPlusCircle /> New Request
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-6 flex flex-wrap gap-3 items-center">
        <FiFilter className="text-gray-400" />
        <select value={statusFilter} onChange={(e) => setStatus(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
          <option value="">All Statuses</option>
          {['OPEN','FULFILLED','PARTIALLY_FULFILLED','CLOSED','EXPIRED'].map(s => (
            <option key={s} value={s}>{s.replace('_',' ')}</option>
          ))}
        </select>
        <select value={bgFilter} onChange={(e) => setBg(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
          <option value="">All Blood Groups</option>
          {BLOOD_GROUPS.map(bg => <option key={bg} value={bg}>{bg}</option>)}
        </select>
        <select value={urgFilter} onChange={(e) => setUrg(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
          <option value="">All Urgencies</option>
          {['Normal','Urgent','Critical'].map(u => <option key={u} value={u}>{u}</option>)}
        </select>
        {(statusFilter || bgFilter || urgFilter) && (
          <button onClick={() => { setStatus(''); setBg(''); setUrg(''); }}
            className="text-sm text-red-600 hover:underline">Clear</button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <FiAlertCircle className="mx-auto text-5xl text-gray-200 mb-4" />
          <p className="text-gray-400 font-medium">No blood requests yet</p>
          <Link to="/requests/new" className="mt-3 inline-block text-red-600 font-semibold hover:underline">
            Create your first request →
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
          {filtered.map((r) => (
            <div key={r._id} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="relative flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center font-bold text-red-700 text-sm">
                      {r.bloodGroup}
                    </div>
                    <span className={`absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${urgencyDot[r.urgency]}`} />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{r.patientName}</p>
                    <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                      <FiMapPin size={11} />
                      <span>{r.hospitalName}</span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 mt-2 text-xs text-gray-500">
                      <span>Units needed: <strong>{r.unitsRequired}</strong></span>
                      <span>Fulfilled: <strong>{r.fulfilledUnits || 0}</strong></span>
                      <span className="flex items-center gap-1">
                        <FiUsers size={11} />
                        <strong>{r.matchedDonors?.length || 0}</strong> matched donors
                      </span>
                    </div>
                    {r.neededBy && (
                      <p className="text-xs text-gray-400 mt-1">
                        Needed by: {new Date(r.neededBy).toLocaleString()}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-0.5">
                      Created: {new Date(r.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-2 items-end flex-shrink-0">
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${urgencyColor[r.urgency]}`}>
                    {r.urgency}
                  </span>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${statusColor[r.status] || 'bg-gray-100 text-gray-600'}`}>
                    {r.status.replace('_',' ')}
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              {r.unitsRequired > 0 && (r.fulfilledUnits || 0) > 0 && (
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Progress</span>
                    <span>{r.fulfilledUnits || 0} / {r.unitsRequired} units</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-orange-400 rounded-full"
                      style={{ width: `${Math.min(100, ((r.fulfilledUnits||0)/r.unitsRequired)*100)}%` }} />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RequestsList;