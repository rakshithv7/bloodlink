import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { registerUser, clearError } from '../../store/slices/authSlice';
import { FiDroplet } from 'react-icons/fi';
import toast from 'react-hot-toast';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const Register = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error, user } = useSelector((s) => s.auth);

  const [form, setForm] = useState({
    name: '', email: '', password: '', role: 'USER',
    bloodGroup: '', phone: '', gender: '', dateOfBirth: '',
    hospitalName: '', hospitalRegNumber: '',
  });

  useEffect(() => {
    if (user) navigate('/dashboard', { replace: true });
  }, [user]);

  useEffect(() => {
    if (error) { toast.error(error); dispatch(clearError()); }
  }, [error]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (form.password.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    dispatch(registerUser(form));
  };

  const inputClass = "w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blood-500 focus:border-transparent";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <div className="min-h-screen bg-gradient-to-br from-blood-50 via-white to-red-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blood-600 mb-4 shadow-lg shadow-blood-200">
            <FiDroplet className="text-white text-2xl" />
          </div>
          <h1 className="font-display text-3xl font-bold text-gray-900">Create Account</h1>
          <p className="text-gray-500 mt-1">Join BloodLink and save lives</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl shadow-gray-100 p-8 border border-gray-100">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Account Type */}
            <div>
              <label className={labelClass}>Account Type</label>
              <select className={inputClass} value={form.role} onChange={(e) => set('role', e.target.value)}>
                <option value="USER">Donor / Requester</option>
                <option value="PENDING_HOSPITAL_ADMIN">Hospital Admin (Requires Approval)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Full Name *</label>
                <input required className={inputClass} placeholder="John Doe" value={form.name} onChange={(e) => set('name', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Phone</label>
                <input className={inputClass} placeholder="+91 9876543210" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
              </div>
            </div>

            <div>
              <label className={labelClass}>Email *</label>
              <input required type="email" className={inputClass} placeholder="you@email.com" value={form.email} onChange={(e) => set('email', e.target.value)} />
            </div>

            <div>
              <label className={labelClass}>Password *</label>
              <input required type="password" className={inputClass} placeholder="Min 8 characters" value={form.password} onChange={(e) => set('password', e.target.value)} />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>Blood Group</label>
                <select className={inputClass} value={form.bloodGroup} onChange={(e) => set('bloodGroup', e.target.value)}>
                  <option value="">Select</option>
                  {BLOOD_GROUPS.map((bg) => <option key={bg} value={bg}>{bg}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Gender</label>
                <select className={inputClass} value={form.gender} onChange={(e) => set('gender', e.target.value)}>
                  <option value="">Select</option>
                  <option>Male</option><option>Female</option><option>Other</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Date of Birth</label>
                <input type="date" className={inputClass} value={form.dateOfBirth} onChange={(e) => set('dateOfBirth', e.target.value)} />
              </div>
            </div>

            {form.role === 'PENDING_HOSPITAL_ADMIN' && (
              <div className="bg-blood-50 rounded-lg p-4 space-y-3 border border-blood-100">
                <p className="text-xs font-semibold text-blood-700 uppercase tracking-wide">Hospital Information</p>
                <div>
                  <label className={labelClass}>Hospital Name *</label>
                  <input required className={inputClass} placeholder="City General Hospital" value={form.hospitalName} onChange={(e) => set('hospitalName', e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Registration Number *</label>
                  <input required className={inputClass} placeholder="REG-12345" value={form.hospitalRegNumber} onChange={(e) => set('hospitalRegNumber', e.target.value)} />
                </div>
                <p className="text-xs text-blood-600">⚠️ Hospital accounts require approval from Super Admin before activation.</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blood-600 text-white py-2.5 rounded-lg font-semibold hover:bg-blood-700 transition-colors disabled:opacity-60 shadow-md shadow-blood-200 mt-2"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-5">
            Already have an account?{' '}
            <Link to="/login" className="text-blood-600 font-semibold hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
