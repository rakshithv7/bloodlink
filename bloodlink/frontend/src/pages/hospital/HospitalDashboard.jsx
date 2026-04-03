import React, { useState, useEffect, useCallback } from 'react';
import API from '../../utils/api';
import toast from 'react-hot-toast';
import {
  FiDroplet, FiCheckCircle, FiX, FiAlertTriangle,
  FiUsers, FiBell, FiMapPin, FiRefreshCw, FiRadio,
} from 'react-icons/fi';

// ─────────────────────────────────────────────────────────────────────────────
// Nearby Donors Panel — select an open request, pick a radius, notify donors
// ─────────────────────────────────────────────────────────────────────────────

const RADIUS_OPTIONS = [
  { value: 5,  label: '5 km',  sub: 'Nearby area' },
  { value: 10, label: '10 km', sub: 'Same city' },
  { value: 25, label: '25 km', sub: 'Wide area' },
];

const NearbyDonorsPanel = () => {
  const [requests, setRequests]           = useState([]);
  const [selected, setSelected]           = useState(null);
  const [radius, setRadius]               = useState(10);
  const [donors, setDonors]               = useState([]);
  const [loadingReqs, setLoadingReqs]     = useState(true);
  const [loadingDonors, setLoadingDonors] = useState(false);
  const [notifying, setNotifying]         = useState(false);

  // Load all open requests when panel mounts
  useEffect(() => {
    API.get('/requests?status=OPEN&limit=50')
      .then(({ data }) => setRequests(data.data || []))
      .catch(() => toast.error('Failed to load open requests'))
      .finally(() => setLoadingReqs(false));
  }, []);

  // Fetch donors within radius for selected request
  const fetchDonors = useCallback(async (requestId, r) => {
    setLoadingDonors(true);
    setDonors([]);
    try {
      const { data } = await API.get(`/requests/${requestId}/nearby-donors?radius=${r}`);
      setDonors(data.data || []);
    } catch {
      toast.error('Failed to fetch nearby donors');
    } finally {
      setLoadingDonors(false);
    }
  }, []);

  const handleSelectRequest = (req) => {
    setSelected(req);
    fetchDonors(req._id, radius);
  };

  const handleRadiusChange = (r) => {
    setRadius(r);
    if (selected) fetchDonors(selected._id, r);
  };

  // Re-notify all donors in current radius via Socket.io
  const handleNotifyAll = async () => {
    if (!selected) return;
    setNotifying(true);
    try {
      const { data } = await API.post(`/requests/${selected._id}/notify-donors`, { radius });
      toast.success(data.message || `${data.notified} donors notified!`);
      fetchDonors(selected._id, radius);
    } catch {
      toast.error('Failed to notify donors');
    } finally {
      setNotifying(false);
    }
  };

  const urgencyBadge = {
    Normal:   'bg-gray-100 text-gray-600',
    Urgent:   'bg-orange-100 text-orange-700',
    Critical: 'bg-red-100 text-red-700',
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

      {/* ── LEFT: Open requests list ── */}
      <div>
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <FiRadio className="text-red-500" />
          Open Blood Requests
          {requests.length > 0 && (
            <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full">
              {requests.length}
            </span>
          )}
        </h3>

        {loadingReqs ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl text-gray-400">
            <FiDroplet className="mx-auto text-3xl mb-2 text-gray-300" />
            <p className="text-sm">No open requests right now</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[540px] overflow-y-auto pr-1">
            {requests.map((r) => (
              <div key={r._id}
                onClick={() => handleSelectRequest(r)}
                className={`border-2 rounded-xl p-4 cursor-pointer transition-all ${
                  selected?._id === r._id
                    ? 'border-red-500 bg-red-50 shadow-sm'
                    : 'border-gray-100 bg-white hover:border-red-200 hover:shadow-sm'
                }`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-red-100 text-red-700 font-bold text-sm flex items-center justify-center flex-shrink-0">
                      {r.bloodGroup}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">{r.patientName}</p>
                      <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                        <FiMapPin size={10} /> {r.hospitalName}
                      </p>
                      {r.hospitalAddress && (
                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">
                          {r.hospitalAddress}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        {r.unitsRequired} unit(s) •{' '}
                        <span className="text-blue-600 font-medium">
                          {r.matchedDonors?.length || 0} notified
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${urgencyBadge[r.urgency]}`}>
                      {r.urgency}
                    </span>
                    {r.urgency === 'Critical' && (
                      <span className="text-xs text-red-500 animate-pulse font-medium">● URGENT</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── RIGHT: Donor results ── */}
      <div>
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <FiUsers className="text-blue-500" />
          Nearby Donors
        </h3>

        {/* Radius selector */}
        <div className="flex gap-2 mb-4">
          {RADIUS_OPTIONS.map((opt) => (
            <button key={opt.value}
              onClick={() => handleRadiusChange(opt.value)}
              className={`flex-1 border-2 rounded-xl py-2.5 px-1 text-center transition-all ${
                radius === opt.value
                  ? 'border-red-500 bg-red-50 text-red-700'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300 bg-white'
              }`}>
              <p className="font-bold text-xs">{opt.label}</p>
              <p className="text-xs opacity-60 mt-0.5">{opt.sub}</p>
            </button>
          ))}
        </div>

        {/* No request selected yet */}
        {!selected ? (
          <div className="text-center py-24 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
            <FiRadio className="mx-auto text-4xl text-gray-300 mb-3" />
            <p className="text-sm font-medium text-gray-400">Select a request on the left</p>
            <p className="text-xs text-gray-300 mt-1">to see and notify nearby donors</p>
          </div>

        ) : loadingDonors ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>

        ) : (
          <>
            {/* Action bar */}
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm text-gray-600">
                  <strong className="text-gray-900">{donors.length}</strong> compatible donor(s)
                </p>
                <p className="text-xs text-gray-400">
                  for <strong>{selected.bloodGroup}</strong> near {selected.hospitalName}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => fetchDonors(selected._id, radius)}
                  className="flex items-center gap-1 text-xs border border-gray-200 text-gray-500 hover:bg-gray-50 px-2.5 py-1.5 rounded-lg transition-colors">
                  <FiRefreshCw size={11} /> Refresh
                </button>
                {donors.length > 0 && (
                  <button
                    onClick={handleNotifyAll}
                    disabled={notifying}
                    className="flex items-center gap-1.5 text-xs bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 disabled:opacity-60 font-semibold transition-colors">
                    <FiBell size={12} />
                    {notifying ? 'Notifying...' : `Notify All (${donors.length})`}
                  </button>
                )}
              </div>
            </div>

            {/* Empty state */}
            {donors.length === 0 ? (
              <div className="text-center py-14 border-2 border-dashed border-gray-200 rounded-xl">
                <FiUsers className="mx-auto text-4xl text-gray-200 mb-3" />
                <p className="text-sm text-gray-400 font-medium">No donors found within {radius}km</p>
                <p className="text-xs text-gray-300 mt-1">
                  Try increasing the radius above
                </p>
              </div>
            ) : (
              /* Donor cards */
              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {donors.map((m, i) => (
                  <div key={i}
                    className="flex items-center justify-between bg-white border border-gray-100 rounded-xl px-4 py-3 hover:shadow-sm transition-shadow">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-700 font-bold text-xs flex items-center justify-center flex-shrink-0">
                        {m.donor.bloodGroup}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{m.donor.name}</p>
                        {m.donor.address && (
                          <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                            <FiMapPin size={10} />
                            <span className="line-clamp-1">{m.donor.address}</span>
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <p className="text-sm font-bold text-red-600">{m.distance} km</p>
                      <p className="text-xs text-gray-400">away</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main HospitalDashboard
// ─────────────────────────────────────────────────────────────────────────────

const TABS = ['Pending Donations', 'Pending Requests', 'Expiring', 'Nearby Donors'];

const HospitalDashboard = () => {
  const [tab, setTab]             = useState('Pending Donations');
  const [donations, setDonations] = useState([]);
  const [requests, setRequests]   = useState([]);
  const [expiring, setExpiring]   = useState([]);
  const [loading, setLoading]     = useState(false);

  const loadDonations = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/donations?status=PENDING&limit=30');
      setDonations(data.data || []);
    } catch {}
    setLoading(false);
  }, []);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/requests?status=OPEN&limit=30');
      setRequests(data.data || []);
    } catch {}
    setLoading(false);
  }, []);

  const loadExpiring = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/donations/expiring');
      setExpiring(data.data || []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    if (tab === 'Pending Donations') loadDonations();
    if (tab === 'Pending Requests')  loadRequests();
    if (tab === 'Expiring')          loadExpiring();
  }, [tab]);

 const approveDonation = async (id, action, rejectionReason = '') => {
  try {
    const { data } = await API.patch(
      `/donations/${id}/approval`,
      { action, rejectionReason }
    );

    toast.success(data.message || `Donation ${action.toLowerCase()}d`);

    // 🔥 instantly remove from UI
    setDonations(prev => prev.filter(d => d._id !== id));

  } catch (err) {
    console.error(err.response?.data || err.message);
    toast.error(err.response?.data?.message || 'Action failed');
  }
};

 const updateRequest = async (id, status) => {
  try {
    const { data } = await API.patch(
      `/requests/${id}/status`,
      { status }
    );

    toast.success(data.message);

    // Remove instantly from UI
    setRequests(prev => prev.filter(r => r._id !== id));

  } catch (err) {
    console.error(err.response?.data || err.message);
    toast.error(err.response?.data?.message || 'Action failed');
  }
};

  const urgencyColor = {
    Normal:   'bg-gray-100 text-gray-600',
    Urgent:   'bg-orange-100 text-orange-700',
    Critical: 'bg-red-100 text-red-700',
  };

  // Show count badge on tabs that have items
  const tabBadge = {
    'Pending Donations': donations.length,
    'Pending Requests':  requests.length,
    'Expiring':          expiring.length,
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Hospital Dashboard</h1>
        <p className="text-gray-400 text-sm">Manage donations, requests and find nearby donors</p>
      </div>

      {/* ── Tab bar ── */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-8 w-fit flex-wrap">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-1.5 ${
              tab === t
                ? 'bg-white text-red-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}>
            {t === 'Nearby Donors' && <FiRadio size={13} />}
            {t}
            {tabBadge[t] > 0 && (
              <span className={`text-xs rounded-full px-1.5 py-0.5 font-bold ${
                tab === t ? 'bg-red-100 text-red-600' : 'bg-gray-300 text-gray-600'
              }`}>
                {tabBadge[t]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Loading spinner (not shown on Nearby Donors tab — it handles its own) */}
      {loading && tab !== 'Nearby Donors' && (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* ── Pending Donations ── */}
      {tab === 'Pending Donations' && !loading && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-50">
            <h2 className="font-semibold text-gray-900">
              Pending Donation Reviews ({donations.length})
            </h2>
          </div>
          {donations.length === 0 ? (
            <p className="text-center text-gray-400 py-12">No pending donations</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {donations.map((d) => (
                <div key={d._id} className="px-6 py-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center text-xs font-bold text-red-700">
                          {d.bloodGroup}
                        </span>
                        <div>
                          <p className="font-semibold text-gray-900">{d.name}</p>
                          <p className="text-xs text-gray-400">{d.donor?.email}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-x-6 gap-y-1 mt-2 text-sm text-gray-600">
                        <span>Age: <strong>{d.age}</strong></span>
                        <span>Weight: <strong>{d.weight}kg</strong></span>
                        <span>Hb: <strong>{d.hemoglobin} g/dL</strong></span>
                        <span>Type: <strong>{d.bloodType}</strong></span>
                        <span>Units: <strong>{d.units}</strong></span>
                        <span>Gender: <strong>{d.gender}</strong></span>
                      </div>
                      {d.address && (
                        <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                          <FiMapPin size={11} /> {d.address}
                        </p>
                      )}
                      {d.medicalHistory && (
                        <p className="text-xs text-gray-400 mt-1 italic">
                          Medical: {d.medicalHistory}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 ml-4 flex-shrink-0">
                      <button onClick={() => approveDonation(d._id, 'APPROVE')}
                        className="flex items-center gap-1 bg-green-600 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-green-700 font-medium">
                        <FiCheckCircle size={14} /> Approve
                      </button>
                      <button onClick={() => approveDonation(d._id, 'REJECT', 'Does not meet criteria')}
                        className="flex items-center gap-1 bg-red-100 text-red-700 text-sm px-3 py-1.5 rounded-lg hover:bg-red-200 font-medium">
                        <FiX size={14} /> Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Pending Requests ── */}
      {tab === 'Pending Requests' && !loading && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-50">
            <h2 className="font-semibold text-gray-900">
              Open Blood Requests ({requests.length})
            </h2>
          </div>
          {requests.length === 0 ? (
            <p className="text-center text-gray-400 py-12">No open requests</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {requests.map((r) => (
                <div key={r._id} className="px-6 py-5 flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center text-xs font-bold text-red-700">
                        {r.bloodGroup}
                      </span>
                      <div>
                        <p className="font-semibold text-gray-900">{r.patientName}</p>
                        <p className="text-xs text-gray-400">{r.hospitalName}</p>
                      </div>
                    </div>
                    {r.hospitalAddress && (
                      <p className="text-xs text-gray-400 flex items-center gap-1 mb-1">
                        <FiMapPin size={10} /> {r.hospitalAddress}
                      </p>
                    )}
                    <p className="text-sm text-gray-600">
                      Units: <strong>{r.unitsRequired}</strong>
                      &nbsp;•&nbsp;
                      Donors notified:{' '}
                      <strong className="text-blue-600">{r.matchedDonors?.length || 0}</strong>
                    </p>
                    {r.neededBy && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        Needed by: {new Date(r.neededBy).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 items-center flex-shrink-0">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${urgencyColor[r.urgency]}`}>
                      {r.urgency}
                    </span>
                    <button onClick={() => updateRequest(r._id, 'FULFILLED')}
                      className="bg-green-600 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-green-700 font-medium">
                      Fulfilled
                    </button>
                    <button onClick={() => updateRequest(r._id, 'CLOSED')}
                      className="bg-gray-100 text-gray-600 text-sm px-3 py-1.5 rounded-lg hover:bg-gray-200 font-medium">
                      Close
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Expiring ── */}
      {tab === 'Expiring' && !loading && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="px-6 py-4 border-b border-red-50 bg-red-50 rounded-t-xl flex items-center gap-2">
            <FiAlertTriangle className="text-red-600" />
            <h2 className="font-semibold text-red-800">
              Donations Expiring Within 3 Days ({expiring.length})
            </h2>
          </div>
          {expiring.length === 0 ? (
            <p className="text-center text-gray-400 py-12">No donations expiring soon</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {expiring.map((d) => {
                const daysLeft = Math.ceil((new Date(d.expiryDate) - Date.now()) / 86400000);
                return (
                  <div key={d._id} className="px-6 py-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">
                        {d.donor?.name} —{' '}
                        <span className="text-red-600">{d.bloodGroup}</span>
                      </p>
                      <p className="text-sm text-gray-500">{d.bloodType} • {d.units} unit(s)</p>
                      {d.address && (
                        <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                          <FiMapPin size={10} /> {d.address}
                        </p>
                      )}
                    </div>
                    <div className={`text-sm font-bold px-3 py-1.5 rounded-lg ${
                      daysLeft <= 1
                        ? 'bg-red-100 text-red-700'
                        : 'bg-orange-100 text-orange-700'
                    }`}>
                      {daysLeft <= 0 ? 'Expired' : `${daysLeft}d left`}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Nearby Donors ── */}
      {tab === 'Nearby Donors' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <NearbyDonorsPanel />
        </div>
      )}
    </div>
  );
};

export default HospitalDashboard;
