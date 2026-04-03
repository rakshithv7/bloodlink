import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../utils/api';
import toast from 'react-hot-toast';
import {
  FiAlertTriangle, FiMapPin, FiNavigation,
  FiEdit2, FiUsers, FiRadio,
} from 'react-icons/fi';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

// Radius options — shown to user as friendly labels, sent as km number to backend
const RADIUS_OPTIONS = [
  { value: 5,  label: '5 km',  desc: 'Nearby area' },
  { value: 10, label: '10 km', desc: 'Same city' },
  { value: 25, label: '25 km', desc: 'Wide area' },
];

const RequestForm = () => {
  const navigate = useNavigate();
  const [loading, setLoading]           = useState(false);
  const [detecting, setDetecting]       = useState(false);
  const [geocoding, setGeocoding]       = useState(false);
  const [coordsReady, setCoordsReady]   = useState(false);
  const [locationMode, setLocationMode] = useState('manual');
  const [matchResult, setMatchResult]   = useState(null);

  const [form, setForm] = useState({
    patientName: '', bloodGroup: '', unitsRequired: '1',
    urgency: 'Normal', hospitalName: '',
    hospitalAddress: '',   // plain text — what the user sees and types
    locationLat: '',       // silently geocoded — user never types this
    locationLng: '',       // silently geocoded — user never types this
    radius: 10,
    neededBy: '', notes: '',
  });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // ── Option A: GPS → store exact coordinates + reverse geocode to address ───
  const detectCurrentLocation = () => {
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
        // Convert to readable address
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
            set('hospitalAddress', readable);
          }
          toast.success('Location detected!');
        } catch {
          set('hospitalAddress', `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
          toast.success('Location detected!');
        } finally {
          setDetecting(false);
        }
      },
      (err) => {
        setDetecting(false);
        setLocationMode('manual');
        toast.error(
          err.code === 1
            ? 'Location access denied. Type the hospital address below.'
            : 'Could not detect location. Please type the address.'
        );
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // ── Option B: typed address → silently geocode to coordinates ─────────────
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
    if (!form.patientName.trim())     { toast.error('Patient name is required'); return false; }
    if (!form.bloodGroup)             { toast.error('Blood group is required'); return false; }
    if (!form.unitsRequired)          { toast.error('Units required'); return false; }
    if (!form.hospitalName.trim())    { toast.error('Hospital name is required'); return false; }
    if (!form.hospitalAddress.trim()) { toast.error('Hospital address is required'); return false; }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    // If address was typed manually and coords not resolved yet, try once more
    if (!coordsReady && form.hospitalAddress.trim() && locationMode === 'manual') {
      await geocodeAddress(form.hospitalAddress);
    }

    setLoading(true);
    try {
      const payload = {
        patientName:     form.patientName.trim(),
        bloodGroup:      form.bloodGroup,
        unitsRequired:   parseInt(form.unitsRequired),
        urgency:         form.urgency,
        hospitalName:    form.hospitalName.trim(),
        hospitalAddress: form.hospitalAddress.trim(),
        radius:          form.radius,
        neededBy:        form.neededBy  || undefined,
        notes:           form.notes     || undefined,
      };

      // Only send coordinates if they exist (geocoding may have failed silently)
      if (form.locationLat && form.locationLng) {
        payload.locationLat = parseFloat(form.locationLat);
        payload.locationLng = parseFloat(form.locationLng);
      }

      const { data } = await API.post('/requests', payload);

      setMatchResult({
        count:   data.matchedDonors?.length || 0,
        donors:  data.matchedDonors         || [],
        message: data.message,
      });

      toast.success(data.message || 'Request submitted!');
      setTimeout(() => navigate('/requests'), 4000);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  const inp = 'w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500';
  const lbl = 'block text-sm font-medium text-gray-700 mb-1';

  const urgencyStyle = {
    Normal:   'border-gray-300 bg-white text-gray-600',
    Urgent:   'border-orange-400 bg-orange-50 text-orange-700',
    Critical: 'border-red-500 bg-red-50 text-red-700',
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Request Blood</h1>
        <p className="text-gray-500 text-sm mt-1">
          We'll find and notify compatible donors nearby automatically.
        </p>
      </div>

      {/* Match result — shown after successful submission */}
      {matchResult && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 mb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <FiUsers className="text-green-600" size={20} />
            </div>
            <div>
              <p className="font-bold text-green-800">
                🔔 {matchResult.count} Donor{matchResult.count !== 1 ? 's' : ''} Notified
              </p>
              <p className="text-xs text-green-600">{matchResult.message}</p>
            </div>
          </div>

          {matchResult.donors.slice(0, 4).map((m, i) => (
            <div key={i} className="flex items-center justify-between py-1.5 border-t border-green-100">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-green-200 text-green-800 font-bold text-xs flex items-center justify-center">
                  {m.donor?.bloodGroup}
                </span>
                <span className="text-sm text-green-800">{m.donor?.name}</span>
                {m.donor?.address && (
                  <span className="text-xs text-green-500">{m.donor.address}</span>
                )}
              </div>
              <span className="text-sm font-bold text-green-700">
                {m.distance} km
              </span>
            </div>
          ))}

          {matchResult.count > 4 && (
            <p className="text-xs text-green-500 mt-2 text-center">
              +{matchResult.count - 4} more donors notified
            </p>
          )}
          <p className="text-xs text-green-400 mt-3 text-center animate-pulse">
            Redirecting to your requests...
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">

        {/* ── Urgency ── */}
        <div>
          <label className={lbl}>Urgency Level *</label>
          <div className="grid grid-cols-3 gap-3">
            {['Normal', 'Urgent', 'Critical'].map((level) => (
              <button key={level} type="button"
                onClick={() => set('urgency', level)}
                className={`border-2 rounded-lg py-2.5 text-sm font-semibold transition-all ${
                  form.urgency === level
                    ? urgencyStyle[level]
                    : 'border-gray-200 text-gray-400 hover:border-gray-300'
                }`}>
                {level === 'Critical' && <FiAlertTriangle className="inline mr-1" size={13} />}
                {level}
              </button>
            ))}
          </div>
        </div>

        {/* ── Patient & Blood ── */}
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className={lbl}>Patient Name *</label>
            <input required className={inp} value={form.patientName}
              onChange={(e) => set('patientName', e.target.value)}
              placeholder="Patient's full name" />
          </div>
          <div>
            <label className={lbl}>Blood Group Needed *</label>
            <select required className={inp} value={form.bloodGroup}
              onChange={(e) => set('bloodGroup', e.target.value)}>
              <option value="">Select</option>
              {BLOOD_GROUPS.map((bg) => <option key={bg}>{bg}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Units Required *</label>
            <input required type="number" min="1" className={inp}
              value={form.unitsRequired}
              onChange={(e) => set('unitsRequired', e.target.value)} />
          </div>
        </div>

        {/* ── Hospital Info ── */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Hospital Name *</label>
            <input required className={inp} value={form.hospitalName}
              onChange={(e) => set('hospitalName', e.target.value)}
              placeholder="e.g. KIMS Hospital" />
          </div>
          <div>
            <label className={lbl}>Needed By</label>
            <input type="datetime-local" className={inp} value={form.neededBy}
              onChange={(e) => set('neededBy', e.target.value)} />
          </div>
        </div>

        {/* ── Radius selector ── */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
            <FiRadio className="text-red-600" size={15} />
            Search Radius *
          </label>
          <div className="grid grid-cols-3 gap-3">
            {RADIUS_OPTIONS.map((opt) => (
              <button key={opt.value} type="button"
                onClick={() => set('radius', opt.value)}
                className={`border-2 rounded-xl py-3 text-center transition-all ${
                  form.radius === opt.value
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300 bg-white'
                }`}>
                <p className="font-bold text-sm">{opt.label}</p>
                <p className="text-xs opacity-60 mt-0.5">{opt.desc}</p>
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2">
            All compatible donors within this radius will receive a real-time notification
          </p>
        </div>

        {/* ── Hospital Location ── */}
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
            Hospital Location *
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
              onClick={detectCurrentLocation}
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

          {/* Address textarea — always editable regardless of mode */}
          <textarea
            required
            rows={2}
            className={inp}
            value={form.hospitalAddress}
            onChange={(e) => {
              set('hospitalAddress', e.target.value);
              // Reset coords when user edits address manually
              setCoordsReady(false);
              set('locationLat', '');
              set('locationLng', '');
            }}
            onBlur={(e) => {
              // Auto-geocode when user finishes typing
              if (e.target.value.trim() && locationMode === 'manual') {
                geocodeAddress(e.target.value);
              }
            }}
            placeholder="e.g. KIMS Hospital, Minister Road, Secunderabad, Hyderabad, Telangana"
          />

          {/* Status indicators */}
          {geocoding && (
            <p className="text-xs text-blue-500 mt-2 flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              Finding coordinates for this address...
            </p>
          )}
          {coordsReady && !geocoding && (
            <p className="text-xs text-green-600 mt-2 flex items-center gap-1 font-medium">
              <FiMapPin size={12} />
              Location found ✓ — donors within {form.radius}km will be notified
            </p>
          )}
          {!coordsReady && !geocoding && form.hospitalAddress && locationMode === 'manual' && (
            <div className="mt-2 flex items-center justify-between">
              <p className="text-xs text-orange-500">
                Coordinates not found — donors may not be notified
              </p>
              <button type="button"
                onClick={() => geocodeAddress(form.hospitalAddress)}
                className="text-xs text-blue-600 underline hover:text-blue-800">
                Retry
              </button>
            </div>
          )}
          <p className="text-xs text-gray-400 mt-2">
            💡 Coordinates are found automatically — you never need to enter lat/lng
          </p>
        </div>

        {/* ── Notes ── */}
        <div>
          <label className={lbl}>Notes</label>
          <textarea rows={2} className={inp} value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            placeholder="Any special requirements or urgency details..." />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => navigate(-1)}
            className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-lg font-medium hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={loading}
            className="flex-1 bg-red-600 text-white py-2.5 rounded-lg font-semibold hover:bg-red-700 disabled:opacity-60 shadow-md transition-colors">
            {loading
              ? 'Finding donors...'
              : `Submit & Notify (${form.radius}km radius)`}
          </button>
        </div>
      </form>
    </div>
  );
};

export default RequestForm;
