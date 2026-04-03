import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../utils/api';
import toast from 'react-hot-toast';
import { FiUpload, FiMapPin, FiNavigation, FiEdit2 } from 'react-icons/fi';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const BLOOD_TYPES  = ['Whole Blood', 'RBC', 'Platelets', 'Plasma'];

const DonationForm = () => {
  const navigate = useNavigate();
  const [loading, setLoading]       = useState(false);
  const [files, setFiles]           = useState([]);
  const [detecting, setDetecting]   = useState(false);
  const [geocoding, setGeocoding]   = useState(false);
  const [coordsReady, setCoordsReady] = useState(false);
  const [locationMode, setLocationMode] = useState('manual');

  const [form, setForm] = useState({
    name: '', age: '', gender: '', bloodGroup: '', weight: '',
    hemoglobin: '', lastDonationDate: '', medicalHistory: '',
    bloodType: 'Whole Blood', units: '1',
    address: '',        // plain text — what the user sees
    locationLat: '',    // silently geocoded — user never sees this
    locationLng: '',    // silently geocoded — user never sees this
    notes: '',
  });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // ── Option A: GPS → coordinates + reverse geocode to readable address ──────
  const detectLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported by your browser');
      return;
    }
    setDetecting(true);
    setLocationMode('current');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        // Store coordinates silently
        set('locationLat', String(lat));
        set('locationLng', String(lng));
        setCoordsReady(true);
        // Reverse geocode to get a human-readable address
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
            { headers: { 'Accept-Language': 'en' } }
          );
          const data = await res.json();
          if (data?.address) {
            const a = data.address;
            const readable = [
              a.road || a.pedestrian,
              a.suburb || a.neighbourhood || a.hamlet,
              a.city   || a.town         || a.village,
              a.state,
            ].filter(Boolean).join(', ');
            set('address', readable);
          }
          toast.success('Location detected!');
        } catch {
          // Address not resolved — coords are still saved, which is what matters
          set('address', `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
          toast.success('Location detected (address lookup failed — coordinates saved)');
        } finally {
          setDetecting(false);
        }
      },
      (err) => {
        setDetecting(false);
        setLocationMode('manual');
        toast.error(
          err.code === 1
            ? 'Location access denied. Type your address below.'
            : 'Could not detect location. Please type your address.'
        );
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // ── Option B: Typed address → silently geocode to coordinates ─────────────
  const geocodeAddress = async (addressText) => {
    if (!addressText.trim()) return;
    setGeocoding(true);
    setCoordsReady(false);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(addressText)}&format=json&limit=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await res.json();
      if (data && data[0]) {
        set('locationLat', data[0].lat);
        set('locationLng', data[0].lon);
        setCoordsReady(true);
      } else {
        setCoordsReady(false);
      }
    } catch {
      setCoordsReady(false);
    } finally {
      setGeocoding(false);
    }
  };

  const validate = () => {
    if (!form.name.trim())       { toast.error('Full name is required'); return false; }
    if (!form.age)               { toast.error('Age is required'); return false; }
    if (!form.gender)            { toast.error('Gender is required'); return false; }
    if (!form.bloodGroup)        { toast.error('Blood group is required'); return false; }
    if (!form.weight)            { toast.error('Weight is required'); return false; }
    if (!form.hemoglobin)        { toast.error('Hemoglobin is required'); return false; }
    if (!form.address.trim())    { toast.error('Address is required'); return false; }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    // If user typed address but coordinates aren't ready yet, geocode now
    if (!coordsReady && form.address.trim() && locationMode === 'manual') {
      await geocodeAddress(form.address);
    }

    setLoading(true);
    try {
      const fd = new FormData();
      // Append all form fields
      Object.entries(form).forEach(([k, v]) => {
        if (v !== '' && v !== null && v !== undefined) fd.append(k, v);
      });
      // Append files
      files.forEach((f) => fd.append('documents', f));

      await API.post('/donations', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success('Donation submitted for review!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Submission failed');
    } finally {
      setLoading(false);
    }
  };

  const inp = 'w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500';
  const lbl = 'block text-sm font-medium text-gray-700 mb-1';

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-gray-900">Submit Blood Donation</h1>
        <p className="text-gray-500 text-sm mt-1">
          Fill in your details. Our team will review and approve your donation.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">

        {/* ── Personal Info ── */}
        <div className="border-b border-gray-50 pb-5">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
            Personal Information
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className={lbl}>Full Name *</label>
              <input required className={inp} value={form.name}
                onChange={(e) => set('name', e.target.value)} placeholder="As on ID card" />
            </div>
            <div>
              <label className={lbl}>Age *</label>
              <input required type="number" min="18" max="65" className={inp}
                value={form.age} onChange={(e) => set('age', e.target.value)} placeholder="18–65" />
            </div>
            <div>
              <label className={lbl}>Gender *</label>
              <select required className={inp} value={form.gender}
                onChange={(e) => set('gender', e.target.value)}>
                <option value="">Select</option>
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
              </select>
            </div>
          </div>
        </div>

        {/* ── Medical Info ── */}
        <div className="border-b border-gray-50 pb-5">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
            Medical Information
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Blood Group *</label>
              <select required className={inp} value={form.bloodGroup}
                onChange={(e) => set('bloodGroup', e.target.value)}>
                <option value="">Select</option>
                {BLOOD_GROUPS.map((bg) => <option key={bg}>{bg}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Blood Type *</label>
              <select required className={inp} value={form.bloodType}
                onChange={(e) => set('bloodType', e.target.value)}>
                {BLOOD_TYPES.map((bt) => <option key={bt}>{bt}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Weight (kg) *</label>
              <input required type="number" min="45" className={inp}
                value={form.weight} onChange={(e) => set('weight', e.target.value)}
                placeholder="Min 45 kg" />
            </div>
            <div>
              <label className={lbl}>Hemoglobin (g/dL) *</label>
              <input required type="number" step="0.1" min="7" max="20" className={inp}
                value={form.hemoglobin} onChange={(e) => set('hemoglobin', e.target.value)}
                placeholder="e.g. 13.5" />
            </div>
            <div>
              <label className={lbl}>Last Donation Date</label>
              <input type="date" className={inp} value={form.lastDonationDate}
                onChange={(e) => set('lastDonationDate', e.target.value)}
                max={new Date().toISOString().split('T')[0]} />
            </div>
            <div>
              <label className={lbl}>Units *</label>
              <input required type="number" min="1" max="5" className={inp}
                value={form.units} onChange={(e) => set('units', e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className={lbl}>Medical History</label>
              <textarea rows={3} className={inp} value={form.medicalHistory}
                onChange={(e) => set('medicalHistory', e.target.value)}
                placeholder="Any relevant medical history, medications, allergies..." />
            </div>
          </div>
        </div>

        {/* ── Location ── */}
        <div className="border-b border-gray-50 pb-5">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
            Your Location *
          </p>

          {/* Mode toggle */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden mb-3">
            <button type="button"
              onClick={() => setLocationMode('manual')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors ${
                locationMode === 'manual'
                  ? 'bg-red-600 text-white'
                  : 'bg-white text-gray-500 hover:bg-gray-50'
              }`}>
              <FiEdit2 size={14} /> Type Address
            </button>
            <button type="button"
              onClick={detectLocation}
              disabled={detecting}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors disabled:opacity-60 ${
                locationMode === 'current'
                  ? 'bg-red-600 text-white'
                  : 'bg-white text-gray-500 hover:bg-gray-50'
              }`}>
              <FiNavigation size={14} className={detecting ? 'animate-spin' : ''} />
              {detecting ? 'Detecting...' : 'Use My Location'}
            </button>
          </div>

          {/* Address text area — always editable */}
          <textarea
            required
            rows={2}
            className={inp}
            value={form.address}
            onChange={(e) => {
              set('address', e.target.value);
              setCoordsReady(false);
              set('locationLat', '');
              set('locationLng', '');
            }}
            onBlur={(e) => {
              if (e.target.value.trim() && locationMode === 'manual') {
                geocodeAddress(e.target.value);
              }
            }}
            placeholder="e.g. Banjara Hills, Hyderabad, Telangana"
          />

          {/* Status feedback */}
          {geocoding && (
            <p className="text-xs text-blue-500 mt-2 flex items-center gap-1">
              <span className="animate-spin inline-block w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full" />
              Finding your coordinates...
            </p>
          )}
          {coordsReady && !geocoding && (
            <p className="text-xs text-green-600 mt-2 flex items-center gap-1 font-medium">
              <FiMapPin size={12} />
              Location coordinates saved ✓ — you'll appear in nearby donor searches
            </p>
          )}
          {!coordsReady && !geocoding && form.address && locationMode === 'manual' && (
            <div className="mt-2 flex items-center justify-between">
              <p className="text-xs text-orange-500">
                Could not find coordinates for this address
              </p>
              <button type="button"
                onClick={() => geocodeAddress(form.address)}
                className="text-xs text-blue-600 underline hover:text-blue-800">
                Retry
              </button>
            </div>
          )}
          <p className="text-xs text-gray-400 mt-2">
            💡 Your location helps match you with nearby blood requests automatically
          </p>
        </div>

        {/* ── Documents ── */}
        <div className="border-b border-gray-50 pb-5">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
            Documents (Optional)
          </p>
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-red-300 transition-colors">
            <FiUpload className="mx-auto text-3xl text-gray-400 mb-2" />
            <p className="text-sm text-gray-500">
              Upload medical documents (PDF, JPG, PNG) — max 5MB each
            </p>
            <input type="file" multiple accept=".jpg,.jpeg,.png,.pdf"
              className="hidden" id="docs"
              onChange={(e) => setFiles(Array.from(e.target.files))} />
            <label htmlFor="docs"
              className="mt-3 inline-block cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors">
              Choose Files
            </label>
            {files.length > 0 && (
              <p className="mt-2 text-sm text-red-600 font-medium">
                {files.length} file(s) selected
              </p>
            )}
          </div>
        </div>

        {/* ── Notes ── */}
        <div>
          <label className={lbl}>Additional Notes</label>
          <textarea rows={2} className={inp} value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            placeholder="Any additional information..." />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => navigate(-1)}
            className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-lg font-medium hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={loading}
            className="flex-1 bg-red-600 text-white py-2.5 rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-60 shadow-md">
            {loading ? 'Submitting...' : 'Submit Donation'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default DonationForm;
