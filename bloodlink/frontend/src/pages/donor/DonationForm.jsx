import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../utils/api';
import toast from 'react-hot-toast';
import { FiUpload, FiMapPin, FiSearch, FiNavigation } from 'react-icons/fi';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const BLOOD_TYPES  = ['Whole Blood', 'RBC', 'Platelets', 'Plasma'];

const DonationForm = () => {
  const navigate = useNavigate();
  const [loading, setLoading]         = useState(false);
  const [files, setFiles]             = useState([]);
  const [geocoding, setGeocoding]     = useState(false);
  const [detecting, setDetecting]     = useState(false);
  const [locationSet, setLocationSet] = useState(false);
  const [locationMode, setLocationMode] = useState('address'); // 'address' | 'current'
  const [form, setForm] = useState({
    name: '', age: '', gender: '', bloodGroup: '', weight: '',
    hemoglobin: '', lastDonationDate: '', medicalHistory: '',
    bloodType: 'Whole Blood', units: '1',
    address: '', locationLng: '', locationLat: '', notes: '',
  });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const resetLocation = () => {
    set('locationLat', '');
    set('locationLng', '');
    setLocationSet(false);
  };

  // Option 1: Type address → geocode via OpenStreetMap
  const geocodeAddress = async () => {
    if (!form.address.trim()) {
      toast.error('Please enter an address first');
      return;
    }
    setGeocoding(true);
    try {
      const query = encodeURIComponent(form.address.trim());
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await res.json();
      if (data && data.length > 0) {
        set('locationLat', data[0].lat);
        set('locationLng', data[0].lon);
        setLocationSet(true);
        toast.success('Address verified!');
      } else {
        toast.error('Address not found. Try adding city or state.');
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

        // Reverse geocode to get a human-readable address
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
            { headers: { 'Accept-Language': 'en' } }
          );
          const data = await res.json();
          if (data && data.display_name) {
            const shortAddress = data.address
              ? [
                  data.address.suburb || data.address.neighbourhood || data.address.hamlet,
                  data.address.city || data.address.town || data.address.village,
                  data.address.state,
                ].filter(Boolean).join(', ')
              : data.display_name.split(',').slice(0, 3).join(',');
            set('address', shortAddress);
          }
        } catch {
          // If reverse geocode fails, just show coordinates
          set('address', `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        }

        setLocationSet(true);
        setDetecting(false);
        toast.success('Current location detected!');
      },
      (err) => {
        setDetecting(false);
        if (err.code === 1) {
          toast.error('Location permission denied. Please allow location access in browser settings.');
        } else {
          toast.error('Could not detect location. Please enter address manually.');
        }
        setLocationMode('address');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const validate = () => {
    if (!form.name.trim())    { toast.error('Name is required'); return false; }
    if (!form.age)            { toast.error('Age is required'); return false; }
    if (+form.age < 18 || +form.age > 65) { toast.error('Age must be 18–65'); return false; }
    if (!form.gender)         { toast.error('Gender is required'); return false; }
    if (!form.bloodGroup)     { toast.error('Blood group is required'); return false; }
    if (!form.weight)         { toast.error('Weight is required'); return false; }
    if (+form.weight < 45)    { toast.error('Weight must be at least 45 kg'); return false; }
    if (!form.hemoglobin)     { toast.error('Hemoglobin is required'); return false; }
    if (!form.address.trim()) { toast.error('Address is required'); return false; }
    if (!form.locationLat || !form.locationLng) {
      toast.error(
        locationMode === 'address'
          ? 'Click "Verify Address" to confirm your location'
          : 'Click "Use My Location" to detect your coordinates'
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
      const fd = new FormData();
      fd.append('name',        form.name.trim());
      fd.append('age',         form.age);
      fd.append('gender',      form.gender);
      fd.append('bloodGroup',  form.bloodGroup);
      fd.append('weight',      form.weight);
      fd.append('hemoglobin',  form.hemoglobin);
      fd.append('bloodType',   form.bloodType);
      fd.append('units',       form.units || '1');
      fd.append('locationLat', form.locationLat);
      fd.append('locationLng', form.locationLng);
      fd.append('address',     form.address);
      if (form.lastDonationDate) fd.append('lastDonationDate', form.lastDonationDate);
      if (form.medicalHistory)   fd.append('medicalHistory',   form.medicalHistory);
      if (form.notes)            fd.append('notes',            form.notes);
      files.forEach((f) => fd.append('documents', f));

      await API.post('/donations', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success('Donation submitted! Awaiting admin review.');
      navigate('/donations');
    } catch (err) {
      const msg = err.response?.data?.errors?.join(', ')
        || err.response?.data?.message
        || 'Submission failed';
      toast.error(msg);
      console.error('Donation error:', err.response?.data);
    } finally {
      setLoading(false);
    }
  };

  const inp = "w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500";
  const lbl = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Submit Blood Donation</h1>
        <p className="text-gray-500 text-sm mt-1">Fill in your details. Our team will review and approve.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">

        {/* Personal Info */}
        <div className="border-b border-gray-50 pb-5">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Personal Information</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className={lbl}>Full Name *</label>
              <input required className={inp} value={form.name}
                onChange={(e) => set('name', e.target.value)} placeholder="As on ID card" />
            </div>
            <div>
              <label className={lbl}>Age * (18–65)</label>
              <input required type="number" min="18" max="65" className={inp}
                value={form.age} onChange={(e) => set('age', e.target.value)} placeholder="e.g. 25" />
            </div>
            <div>
              <label className={lbl}>Gender *</label>
              <select required className={inp} value={form.gender} onChange={(e) => set('gender', e.target.value)}>
                <option value="">Select gender</option>
                <option>Male</option><option>Female</option><option>Other</option>
              </select>
            </div>
          </div>
        </div>

        {/* Medical Info */}
        <div className="border-b border-gray-50 pb-5">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Medical Information</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Blood Group *</label>
              <select required className={inp} value={form.bloodGroup} onChange={(e) => set('bloodGroup', e.target.value)}>
                <option value="">Select</option>
                {BLOOD_GROUPS.map((bg) => <option key={bg}>{bg}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Blood Type *</label>
              <select required className={inp} value={form.bloodType} onChange={(e) => set('bloodType', e.target.value)}>
                {BLOOD_TYPES.map((bt) => <option key={bt}>{bt}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Weight (kg) * (min 45)</label>
              <input required type="number" min="45" step="0.1" className={inp}
                value={form.weight} onChange={(e) => set('weight', e.target.value)} placeholder="e.g. 65" />
            </div>
            <div>
              <label className={lbl}>Hemoglobin (g/dL) *</label>
              <input required type="number" step="0.1" min="7" max="20" className={inp}
                value={form.hemoglobin} onChange={(e) => set('hemoglobin', e.target.value)} placeholder="e.g. 13.5" />
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

        {/* Location */}
        <div className="border-b border-gray-50 pb-5">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Location *</p>

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
              <label className={lbl}>Your Address</label>
              <div className="flex gap-2">
                <input
                  className={inp}
                  value={form.address}
                  onChange={(e) => { set('address', e.target.value); resetLocation(); }}
                  placeholder="e.g. Banjara Hills, Hyderabad, Telangana"
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
                💡 Include area, city and state for best results
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
                {detecting ? 'Detecting your location...' : 'Click to Use My Current Location'}
              </button>
              <p className="text-xs text-gray-400 mt-2 text-center">
                Your browser will ask for location permission — click Allow
              </p>

              {/* Show address after detection */}
              {locationSet && form.address && (
                <div className="mt-3">
                  <label className={lbl}>Detected Address (you can edit this)</label>
                  <input className={inp} value={form.address}
                    onChange={(e) => set('address', e.target.value)} />
                </div>
              )}
            </div>
          )}

          {/* Location status */}
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

          {!locationSet && form.address && locationMode === 'address' && (
            <p className="mt-2 text-xs text-orange-500 font-medium">
              ⚠ Click "Verify Address" to confirm your location before submitting
            </p>
          )}
        </div>

        {/* Documents */}
        <div className="border-b border-gray-50 pb-5">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Documents (Optional)</p>
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-red-300 transition-colors">
            <FiUpload className="mx-auto text-3xl text-gray-400 mb-2" />
            <p className="text-sm text-gray-500">PDF, JPG, PNG — max 5MB each</p>
            <input type="file" multiple accept=".jpg,.jpeg,.png,.pdf"
              className="hidden" id="docs"
              onChange={(e) => setFiles(Array.from(e.target.files))} />
            <label htmlFor="docs"
              className="mt-3 inline-block cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors">
              Choose Files
            </label>
            {files.length > 0 && (
              <p className="mt-2 text-sm text-red-600 font-medium">{files.length} file(s) selected</p>
            )}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className={lbl}>Additional Notes</label>
          <textarea rows={2} className={inp} value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            placeholder="Anything else you'd like to mention..." />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => navigate(-1)}
            className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-lg font-medium hover:bg-gray-50">
            Cancel
          </button>
          <button type="submit" disabled={loading}
            className="flex-1 bg-red-600 text-white py-2.5 rounded-lg font-semibold hover:bg-red-700 disabled:opacity-60 shadow-md">
            {loading ? 'Submitting...' : 'Submit Donation'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default DonationForm;