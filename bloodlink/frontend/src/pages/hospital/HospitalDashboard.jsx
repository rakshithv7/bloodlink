import React, { useState, useEffect, useCallback } from 'react';
import API from '../../utils/api';
import toast from 'react-hot-toast';
import { FiDroplet, FiCheckCircle, FiX, FiClock, FiAlertTriangle } from 'react-icons/fi';

const TABS = ['Pending Donations', 'Pending Requests', 'Expiring'];

const HospitalDashboard = () => {
  const [tab, setTab] = useState('Pending Donations');
  const [donations, setDonations] = useState([]);
  const [requests, setRequests] = useState([]);
  const [expiring, setExpiring] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadDonations = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/donations?status=PENDING&limit=30');
      setDonations(data.data);
    } catch {}
    setLoading(false);
  }, []);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/requests?status=OPEN&limit=30');
      setRequests(data.data);
    } catch {}
    setLoading(false);
  }, []);

  const loadExpiring = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/donations/expiring');
      setExpiring(data.data);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    if (tab === 'Pending Donations') loadDonations();
    if (tab === 'Pending Requests') loadRequests();
    if (tab === 'Expiring') loadExpiring();
  }, [tab]);

  const approveDonation = async (id, action, rejectionReason = '') => {
    try {
      await API.patch(`/donations/${id}/approval`, { action, rejectionReason });
      toast.success(`Donation ${action.toLowerCase()}d`);
      loadDonations();
    } catch { toast.error('Action failed'); }
  };

  const updateRequest = async (id, status) => {
    try {
      await API.patch(`/requests/${id}/status`, { status });
      toast.success('Request updated');
      loadRequests();
    } catch { toast.error('Action failed'); }
  };

  const urgencyColor = {
    Normal: 'bg-gray-100 text-gray-600',
    Urgent: 'bg-orange-100 text-orange-700',
    Critical: 'bg-red-100 text-red-700',
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-gray-900">Hospital Dashboard</h1>
        <p className="text-gray-400 text-sm">Manage donations and blood requests</p>
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-8 w-fit">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              tab === t ? 'bg-white text-blood-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {t}
            {t === 'Pending Donations' && donations.length > 0 && (
              <span className="ml-1.5 bg-blood-600 text-white text-xs rounded-full px-1.5 py-0.5">{donations.length}</span>
            )}
            {t === 'Expiring' && expiring.length > 0 && (
              <span className="ml-1.5 bg-red-600 text-white text-xs rounded-full px-1.5 py-0.5">{expiring.length}</span>
            )}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-blood-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Pending Donations */}
      {tab === 'Pending Donations' && !loading && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-50">
            <h2 className="font-semibold text-gray-900">Pending Donation Reviews ({donations.length})</h2>
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
                        <span className="w-9 h-9 rounded-full bg-blood-100 flex items-center justify-center text-xs font-bold text-blood-700">{d.bloodGroup}</span>
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
                      {d.medicalHistory && (
                        <p className="text-xs text-gray-400 mt-2 italic">Medical: {d.medicalHistory}</p>
                      )}
                    </div>
                    <div className="flex gap-2 ml-4">
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

      {/* Pending Requests */}
      {tab === 'Pending Requests' && !loading && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-50">
            <h2 className="font-semibold text-gray-900">Open Blood Requests ({requests.length})</h2>
          </div>
          {requests.length === 0 ? (
            <p className="text-center text-gray-400 py-12">No open requests</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {requests.map((r) => (
                <div key={r._id} className="px-6 py-5 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-9 h-9 rounded-full bg-blood-100 flex items-center justify-center text-xs font-bold text-blood-700">{r.bloodGroup}</span>
                      <div>
                        <p className="font-semibold text-gray-900">{r.patientName}</p>
                        <p className="text-xs text-gray-400">{r.hospitalName}</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">Units needed: <strong>{r.unitsRequired}</strong> • Matched donors: <strong>{r.matchedDonors?.length || 0}</strong></p>
                    {r.neededBy && <p className="text-xs text-gray-400">Needed by: {new Date(r.neededBy).toLocaleString()}</p>}
                  </div>
                  <div className="flex gap-2 items-center">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${urgencyColor[r.urgency]}`}>{r.urgency}</span>
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

      {/* Expiring */}
      {tab === 'Expiring' && !loading && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="px-6 py-4 border-b border-red-50 bg-red-50 rounded-t-xl">
            <div className="flex items-center gap-2">
              <FiAlertTriangle className="text-red-600" />
              <h2 className="font-semibold text-red-800">Donations Expiring Within 3 Days ({expiring.length})</h2>
            </div>
          </div>
          {expiring.length === 0 ? (
            <p className="text-center text-gray-400 py-12">No donations expiring soon</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {expiring.map((d) => {
                const daysLeft = Math.ceil((new Date(d.expiryDate) - Date.now()) / (1000 * 60 * 60 * 24));
                return (
                  <div key={d._id} className="px-6 py-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{d.donor?.name} — <span className="text-blood-600">{d.bloodGroup}</span></p>
                      <p className="text-sm text-gray-500">{d.bloodType} • {d.units} unit(s)</p>
                    </div>
                    <div className={`text-sm font-bold px-3 py-1.5 rounded-lg ${daysLeft <= 1 ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                      {daysLeft <= 0 ? 'Expired' : `${daysLeft}d left`}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default HospitalDashboard;
