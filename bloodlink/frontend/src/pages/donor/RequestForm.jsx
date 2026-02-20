import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../utils/api';
import toast from 'react-hot-toast';
import { FiAlertTriangle, FiMapPin, FiSearch, FiNavigation } from 'react-icons/fi';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const RequestForm = () => {
  const navigate = useNavigate();
  const [loading, setLoading]         = useState(false);
  const [geocoding, setGeocoding]     = useState(false);
  const [detecting, setDetecting]     = useState(false);
  const [locationSet, setLocationSet] = useState(false);
  const [locationMode, setLocationMode] = useState('address');
  const [matchedDonors, setMatchedDonors] = useState(null);
  const [form, setForm] = useState({
    patientName: '', bloodGroup: '', unitsRequired: '1',
    urgency: 'Normal', hospitalName: '', hospitalAddress: '',
    locationLng: '', locationLat: '', neededBy: '', notes: '',
  });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const resetLocation = () => {
    set('locationLat', '');
    set('locationLng', '');
    setLocationSet(false);
  };

  // Option 1: Type address → geocode
  const geocodeAddress = async () => {
    if (!form.hospitalAddress.trim()) {
      toast.error('Please enter a hospital address first');
      return;
    }
    setGeocoding(true);
    try {
      const query = encodeURIComponent(form.hospitalAddress.trim());
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await res.json();
      if (data && data.length > 0) {
        set('locationLat', data[0].lat);
        set('locationLng', data[0].lon);
        setLocationSet(true);
        toast.success('Hospital location verified!');
      } else {
        toast.error('Address not found. Try adding city or hospital name.');
      }
    } catch {
      toast.error('Could not verify address. Check your internet.');
    } finally {
      setGeocoding(false);
    }
  };

  // Option 2: Use device GPS
  const detectCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        set('locationLat', String(lat));
        set('locationLng', String(lng));

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
            { headers: { 'Accept-Language': 'en' } }
          );
          const data = await res.json();
          if (data?.address) {
            const shortAddress = [
              data.address.suburb || data.address.neighbourhood,
              data.address.city || data.address.town || data.address.village,
              data.address.state,
            ].filter(Boolean).join(', ');
            set('hospitalAddress', shortAddress);
          }
        } catch {
          set('hospitalAddress', `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        }

        setLocationSet(true);
        setDetecting(false);
        toast.success('Current location detected!');
      },
      (err) => {
        setDetecting(false);
        if (err.code === 1) {
          toast.error('Location permission denied. Please allow location in browser settings.');
        } else {
          toast.error('Could not detect location. Enter address manually.');
        }
        setLocationMode('address');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const validate = () => {
    if (!form.patientName.trim())     { toast.error('Patient name is required'); return false; }
    if (!form.bloodGroup)             { toast.error('Blood group is required'); return false; }
    if (!form.unitsRequired)          { toast.error('Units required'); return false; }
    if (!form.hospitalName.trim())    { toast.error('Hospital name is required'); return false; }
    if (!form.hospitalAddress.trim()) { toast.error('Hospital address is required'); return false; }
    if (!form.locationLat || !form.locationLng) {
      toast.error(
        locationMode === 'address'
          ? 'Click "Verify Address" to confirm hospital location'
          : 'Click "Use My Current Location" to detect coordinates'
      );
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const { data } = await API.post('/requests', {
        patientName:     form.patientName,
        bloodGroup:      form.bloodGroup,
        unitsRequired:   parseInt(form.unitsRequired),
        urgency:         form.urgency,
        hospitalName:    form.hospitalName,
        hospitalAddress: form.hospitalAddress,
        locationLat:     parseFloat(form.locationLat),
        locationLng:     parseFloat(form.locationLng),
        neededBy:        form.neededBy || undefined,
        notes:           form.notes || undefined,
      });

      setMatchedDonors(data.matchedDonors || []);
      toast.success(`Request created! ${data.matchedDonors?.length || 0} donors found nearby.`);
      setTimeout(() => navigate('/requests'), 3000);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create request');
    } finally {
      setLoading(false);
    }
  };

  const inp = "w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500";
  const lbl = "block text-sm font-medium text-gray-700 mb-1";

  const urgencyConfig = {
    Normal:   'border-gray-300 bg-white text-gray-600',
    Urgent:   'border-orange-400 bg-orange-50 text-orange-700',
    Critical: 'border-red-500 bg-red-50 text-red-700',
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Request Blood</h1>
        <p className="text-gray-500 text-sm mt-1">We'll match you with compatible donors nearby.</p>
      </div>

      {/* Matched donors result */}
      {matchedDonors && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
          <p className="font-semibold text-green-800 mb-1">
            ✅ Request Created — {matchedDonors.length} Donors Found Nearby
          </p>
          {matchedDonors.slice(0, 3).map((d, i) => (
            <div key={i} className="text-sm text-green-700 flex justify-between py-0.5">
              <span>{d.donor?.name || 'Donor'} ({d.donor?.bloodGroup})</span>
              <span>{d.distance} km away</span>
            </div>
          ))}
          <p className="text-xs text-green-600 mt-2">Redirecting to your requests...</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">

        {/* Urgency */}
        <div>
          <label className={lbl}>Urgency Level *</label>
          <div className="grid grid-cols-3 gap-3">
            {['Normal', 'Urgent', 'Critical'].map((level) => (
              <button key={level} type="button"
                onClick={() => set('urgency', level)}
                className={`border-2 rounded-lg py-2.5 text-sm font-semibold transition-all ${
                  form.urgency === level
                    ? urgencyConfig[level]
                    : 'border-gray-200 text-gray-400 hover:border-gray-300'
                }`}>
                {level === 'Critical' && <FiAlertTriangle className="inline mr-1" />}
                {level}
              </button>
            ))}
          </div>
        </div>

        {/* Patient & Blood */}
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
              value={form.unitsRequired} onChange={(e) => set('unitsRequired', e.target.value)} />
          </div>
        </div>

        {/* Hospital */}
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

        {/* Hospital Location */}
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Hospital Location *</p>

          {/* Mode toggle */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden mb-4">
            <button
              type="button"
              onClick={() => { setLocationMode('address'); resetLocation(); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors ${
                locationMode === 'address'
                  ? 'bg-red-600 text-white'
                  : 'bg-white text-gray-500 hover:bg-gray-50'
              }`}
            >
              <FiSearch size={15} />
              Enter Address
            </button>
            <button
              type="button"
              onClick={() => { setLocationMode('current'); resetLocation(); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors ${
                locationMode === 'current'
                  ? 'bg-red-600 text-white'
                  : 'bg-white text-gray-500 hover:bg-gray-50'
              }`}
            >
              <FiNavigation size={15} />
              Use Current Location
            </button>
          </div>

          {/* Address input mode */}
          {locationMode === 'address' && (
            <div>
              <label className={lbl}>Hospital Address</label>
              <div className="flex gap-2">
                <input
                  className={inp}
                  value={form.hospitalAddress}
                  onChange={(e) => { set('hospitalAddress', e.target.value); resetLocation(); }}
                  placeholder="e.g. KIMS Hospital, Minister Road, Secunderabad"
                />
                <button
                  type="button"
                  onClick={geocodeAddress}
                  disabled={geocoding}
                  className="flex items-center gap-2 bg-red-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-60 whitespace-nowrap"
                >
                  <FiSearch size={14} />
                  {geocoding ? 'Verifying...' : 'Verify Address'}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                💡 Include hospital name, area and city for best results
              </p>
            </div>
          )}

          {/* Current location mode */}
          {locationMode === 'current' && (
            <div>
              <button
                type="button"
                onClick={detectCurrentLocation}
                disabled={detecting}
                className="w-full flex items-center justify-center gap-3 border-2 border-dashed border-red-300 bg-red-50 text-red-700 py-4 rounded-xl font-semibold hover:bg-red-100 transition-colors disabled:opacity-60"
              >
                <FiNavigation size={20} className={detecting ? 'animate-spin' : ''} />
                {detecting ? 'Detecting location...' : 'Click to Use My Current Location'}
              </button>
              <p className="text-xs text-gray-400 mt-2 text-center">
                Your browser will ask for location permission — click Allow
              </p>

              {locationSet && form.hospitalAddress && (
                <div className="mt-3">
                  <label className={lbl}>Detected Address (you can edit)</label>
                  <input className={inp} value={form.hospitalAddress}
                    onChange={(e) => set('hospitalAddress', e.target.value)} />
                </div>
              )}
            </div>
          )}

          {/* Confirmed */}
          {locationSet && form.locationLat && (
            <div className="mt-3 flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              <FiMapPin className="text-green-600" size={16} />
              <div>
                <p className="text-sm font-medium text-green-700">Location confirmed ✓</p>
                <p className="text-xs text-green-600">
                  {parseFloat(form.locationLat).toFixed(5)}, {parseFloat(form.locationLng).toFixed(5)}
                </p>
              </div>
            </div>
          )}

          {!locationSet && form.hospitalAddress && locationMode === 'address' && (
            <p className="mt-2 text-xs text-orange-500 font-medium">
              ⚠ Click "Verify Address" to confirm location before submitting
            </p>
          )}
        </div>

        {/* Notes */}
        <div>
          <label className={lbl}>Notes</label>
          <textarea rows={2} className={inp} value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            placeholder="Any special requirements..." />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => navigate(-1)}
            className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-lg font-medium hover:bg-gray-50">
            Cancel
          </button>
          <button type="submit" disabled={loading}
            className="flex-1 bg-red-600 text-white py-2.5 rounded-lg font-semibold hover:bg-red-700 disabled:opacity-60 shadow-md">
            {loading ? 'Finding donors...' : 'Submit Request'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default RequestForm;