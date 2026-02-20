import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { FiDroplet, FiHeart, FiUsers, FiAlertCircle, FiActivity } from 'react-icons/fi';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const BLOOD_COLORS = {
  'A+':  { bg: 'bg-red-50',     border: 'border-red-200',   text: 'text-red-700',   badge: 'bg-red-600' },
  'A-':  { bg: 'bg-rose-50',    border: 'border-rose-200',  text: 'text-rose-700',  badge: 'bg-rose-600' },
  'B+':  { bg: 'bg-orange-50',  border: 'border-orange-200',text: 'text-orange-700',badge: 'bg-orange-500' },
  'B-':  { bg: 'bg-amber-50',   border: 'border-amber-200', text: 'text-amber-700', badge: 'bg-amber-500' },
  'AB+': { bg: 'bg-purple-50',  border: 'border-purple-200',text: 'text-purple-700',badge: 'bg-purple-600' },
  'AB-': { bg: 'bg-violet-50',  border: 'border-violet-200',text: 'text-violet-700',badge: 'bg-violet-600' },
  'O+':  { bg: 'bg-blue-50',    border: 'border-blue-200',  text: 'text-blue-700',  badge: 'bg-blue-600' },
  'O-':  { bg: 'bg-green-50',   border: 'border-green-200', text: 'text-green-700', badge: 'bg-green-600' },
};

const getStockLevel = (units) => {
  if (units === 0)  return { label: 'Out of Stock', color: 'text-red-600',    bar: 'bg-red-500',    width: '5%' };
  if (units <= 5)   return { label: 'Critical',     color: 'text-red-500',    bar: 'bg-red-400',    width: '20%' };
  if (units <= 15)  return { label: 'Low',          color: 'text-orange-500', bar: 'bg-orange-400', width: '45%' };
  if (units <= 30)  return { label: 'Moderate',     color: 'text-yellow-600', bar: 'bg-yellow-400', width: '65%' };
  return             { label: 'Available',           color: 'text-green-600',  bar: 'bg-green-500',  width: '90%' };
};

const Landing = () => {
  const [inventory, setInventory] = useState([]);
  const [stats, setStats]         = useState(null);
  const [loading, setLoading]     = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await axios.get('http://localhost:5000/api/donations/public/inventory');
        setInventory(data.data.inventory);
        setStats(data.data.stats);
        setLastUpdated(new Date());
      } catch {
        // Backend might not be running — show zeros
        setInventory([]);
        setStats({ totalUnits: 0, totalDonors: 0, totalHospitals: 0, criticalRequests: 0 });
      } finally {
        setLoading(false);
      }
    };
    load();
    // Refresh every 60 seconds
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, []);

  // Map inventory array to a lookup object
  const inventoryMap = {};
  inventory.forEach((i) => { inventoryMap[i._id] = i.totalUnits; });

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Hero */}
      <div className="bg-gradient-to-br from-red-600 via-red-700 to-red-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 backdrop-blur mb-6">
            <FiDroplet className="text-white text-3xl" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            BloodLink
          </h1>
          <p className="text-red-100 text-lg md:text-xl max-w-2xl mx-auto mb-8">
            Real-time blood availability across all blood groups.
            Donate blood. Save lives. Every drop counts.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register"
              className="bg-white text-red-700 font-bold px-8 py-3 rounded-xl hover:bg-red-50 transition-colors shadow-lg">
              Become a Donor
            </Link>
            <Link to="/login"
              className="border-2 border-white text-white font-bold px-8 py-3 rounded-xl hover:bg-white/10 transition-colors">
              Sign In
            </Link>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <div className="flex items-center justify-center gap-2 text-red-600 mb-1">
                <FiDroplet size={18} />
                <span className="text-2xl font-bold">{stats?.totalUnits ?? '—'}</span>
              </div>
              <p className="text-xs text-gray-500 font-medium">Units Available</p>
            </div>
            <div>
              <div className="flex items-center justify-center gap-2 text-blue-600 mb-1">
                <FiUsers size={18} />
                <span className="text-2xl font-bold">{stats?.totalDonors ?? '—'}</span>
              </div>
              <p className="text-xs text-gray-500 font-medium">Registered Donors</p>
            </div>
            <div>
              <div className="flex items-center justify-center gap-2 text-green-600 mb-1">
                <FiHeart size={18} />
                <span className="text-2xl font-bold">{stats?.totalHospitals ?? '—'}</span>
              </div>
              <p className="text-xs text-gray-500 font-medium">Partner Hospitals</p>
            </div>
            <div>
              <div className="flex items-center justify-center gap-2 text-orange-600 mb-1">
                <FiAlertCircle size={18} />
                <span className="text-2xl font-bold">{stats?.criticalRequests ?? '—'}</span>
              </div>
              <p className="text-xs text-gray-500 font-medium">Critical Requests</p>
            </div>
          </div>
        </div>
      </div>

      {/* Blood Inventory */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Live Blood Inventory</h2>
            <p className="text-gray-500 text-sm mt-1">
              {loading ? 'Loading...' : lastUpdated
                ? `Last updated: ${lastUpdated.toLocaleTimeString()}`
                : 'Could not connect to server'}
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
            <FiActivity className="animate-pulse" />
            Live
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {BLOOD_GROUPS.map((bg) => {
              const units = inventoryMap[bg] ?? 0;
              const stock = getStockLevel(units);
              const colors = BLOOD_COLORS[bg];

              return (
                <div key={bg}
                  className={`${colors.bg} ${colors.border} border-2 rounded-2xl p-5 transition-transform hover:scale-105 hover:shadow-md`}>

                  {/* Blood group badge */}
                  <div className="flex items-center justify-between mb-4">
                    <div className={`${colors.badge} text-white font-bold text-xl w-14 h-14 rounded-xl flex items-center justify-center shadow-md`}>
                      {bg}
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full bg-white/70 ${stock.color}`}>
                      {stock.label}
                    </span>
                  </div>

                  {/* Units */}
                  <p className={`text-3xl font-bold ${colors.text} mb-1`}>{units}</p>
                  <p className="text-xs text-gray-500 mb-3">units available</p>

                  {/* Stock bar */}
                  <div className="h-2 bg-white/60 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${stock.bar} rounded-full transition-all duration-700`}
                      style={{ width: units === 0 ? '4px' : stock.width }}
                    />
                  </div>

                  {/* Special labels */}
                  {bg === 'O-' && (
                    <p className="text-xs text-gray-500 mt-2 font-medium">🌍 Universal Donor</p>
                  )}
                  {bg === 'AB+' && (
                    <p className="text-xs text-gray-500 mt-2 font-medium">🤝 Universal Receiver</p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* CTA section */}
        <div className="mt-12 bg-gradient-to-r from-red-600 to-red-800 rounded-2xl p-8 text-white text-center">
          <FiHeart className="mx-auto text-4xl mb-4 text-red-200" />
          <h3 className="text-2xl font-bold mb-2">Can You Donate Today?</h3>
          <p className="text-red-100 mb-6 max-w-md mx-auto">
            One donation can save up to 3 lives. Register as a donor and help
            those in critical need.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/register"
              className="bg-white text-red-700 font-bold px-8 py-3 rounded-xl hover:bg-red-50 transition-colors">
              Register as Donor
            </Link>
            <Link to="/requests/new"
              className="border-2 border-white text-white font-bold px-8 py-3 rounded-xl hover:bg-white/10 transition-colors">
              Request Blood
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Landing;