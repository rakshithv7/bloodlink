import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import {
  FiDroplet,
  FiHeart,
  FiUsers,
  FiAlertCircle,
  FiActivity,
} from "react-icons/fi";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const BLOOD_COLORS = {
  "A+": { bg: "bg-red-50", border: "border-red-200", text: "text-red-700", badge: "bg-red-600" },
  "A-": { bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-700", badge: "bg-rose-600" },
  "B+": { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-700", badge: "bg-orange-500" },
  "B-": { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", badge: "bg-amber-500" },
  "AB+": { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-700", badge: "bg-purple-600" },
  "AB-": { bg: "bg-violet-50", border: "border-violet-200", text: "text-violet-700", badge: "bg-violet-600" },
  "O+": { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", badge: "bg-blue-600" },
  "O-": { bg: "bg-green-50", border: "border-green-200", text: "text-green-700", badge: "bg-green-600" },
};

const getStockLevel = (units) => {
  if (units === 0)
    return { label: "Out of Stock", color: "text-red-600", bar: "bg-red-500", width: "5%" };
  if (units <= 5)
    return { label: "Critical", color: "text-red-500", bar: "bg-red-400", width: "20%" };
  if (units <= 15)
    return { label: "Low", color: "text-orange-500", bar: "bg-orange-400", width: "45%" };
  if (units <= 30)
    return { label: "Moderate", color: "text-yellow-600", bar: "bg-yellow-400", width: "65%" };
  return { label: "Available", color: "text-green-600", bar: "bg-green-500", width: "90%" };
};

const Landing = () => {
  const [inventory, setInventory] = useState([]);
  const [stats, setStats] = useState({
    totalUnits: 0,
    totalDonors: 0,
    totalHospitals: 0,
    criticalRequests: 0,
  });
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await axios.get(
          "http://localhost:5000/api/donations/public/inventory"
        );

        if (res.data?.data) {
          setInventory(res.data.data.inventory || []);
          setStats(res.data.data.stats || {});
        }

        setLastUpdated(new Date());
      } catch (error) {
        console.log("Backend not connected. Showing fallback data.");
        setInventory([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, []);

  // SAFE inventory map creation
  const inventoryMap = Object.fromEntries(
    (inventory || []).map((item) => [item._id, item.totalUnits])
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* HERO SECTION */}
      <div className="bg-gradient-to-br from-red-600 via-red-700 to-red-900 text-white">
        <div className="max-w-7xl mx-auto px-4 py-16 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 backdrop-blur mb-6">
            <FiDroplet className="text-3xl" />
          </div>

          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            BloodLink
          </h1>

          <p className="text-red-100 text-lg md:text-xl max-w-2xl mx-auto mb-8">
            Real-time blood availability across all blood groups.
            Donate blood. Save lives. Every drop counts.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="bg-white text-red-700 font-bold px-8 py-3 rounded-xl hover:bg-red-50 transition"
            >
              Become a Donor
            </Link>

            <Link
              to="/login"
              className="border-2 border-white text-white font-bold px-8 py-3 rounded-xl hover:bg-white/10 transition"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>

      {/* STATS SECTION */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <Stat icon={<FiDroplet />} value={stats.totalUnits} label="Units Available" color="text-red-600" />
          <Stat icon={<FiUsers />} value={stats.totalDonors} label="Registered Donors" color="text-blue-600" />
          <Stat icon={<FiHeart />} value={stats.totalHospitals} label="Partner Hospitals" color="text-green-600" />
          <Stat icon={<FiAlertCircle />} value={stats.criticalRequests} label="Critical Requests" color="text-orange-600" />
        </div>
      </div>

      {/* INVENTORY SECTION */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold">Live Blood Inventory</h2>
            <p className="text-sm text-gray-500">
              {loading
                ? "Loading..."
                : lastUpdated
                ? `Last updated: ${lastUpdated.toLocaleTimeString()}`
                : "Server not connected"}
            </p>
          </div>
          <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
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
                <div
                  key={bg}
                  className={`${colors.bg} ${colors.border} border-2 rounded-2xl p-5 hover:scale-105 hover:shadow-md transition`}
                >
                  <div className="flex justify-between items-center mb-4">
                    <div
                      className={`${colors.badge} text-white font-bold text-xl w-14 h-14 rounded-xl flex items-center justify-center shadow`}
                    >
                      {bg}
                    </div>
                    <span
                      className={`text-xs font-bold px-2 py-1 rounded-full bg-white/70 ${stock.color}`}
                    >
                      {stock.label}
                    </span>
                  </div>

                  <p className={`text-3xl font-bold ${colors.text}`}>
                    {units}
                  </p>
                  <p className="text-xs text-gray-500 mb-3">
                    units available
                  </p>

                  <div className="h-2 bg-white/60 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${stock.bar} rounded-full transition-all duration-700`}
                      style={{ width: units === 0 ? "4px" : stock.width }}
                    />
                  </div>

                  {bg === "O-" && (
                    <p className="text-xs mt-2 text-gray-500 font-medium">
                      🌍 Universal Donor
                    </p>
                  )}
                  {bg === "AB+" && (
                    <p className="text-xs mt-2 text-gray-500 font-medium">
                      🤝 Universal Receiver
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* CTA */}
        <div className="mt-12 bg-gradient-to-r from-red-600 to-red-800 rounded-2xl p-8 text-white text-center">
          <FiHeart className="mx-auto text-4xl mb-4 text-red-200" />
          <h3 className="text-2xl font-bold mb-2">
            Can You Donate Today?
          </h3>
          <p className="text-red-100 mb-6 max-w-md mx-auto">
            One donation can save up to 3 lives.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/register"
              className="bg-white text-red-700 font-bold px-8 py-3 rounded-xl hover:bg-red-50 transition"
            >
              Register as Donor
            </Link>
            <Link
              to="/requests/new"
              className="border-2 border-white text-white font-bold px-8 py-3 rounded-xl hover:bg-white/10 transition"
            >
              Request Blood
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

const Stat = ({ icon, value, label, color }) => (
  <div>
    <div className={`flex items-center justify-center gap-2 ${color}`}>
      {icon}
      <span className="text-2xl font-bold">{value}</span>
    </div>
    <p className="text-xs text-gray-500 font-medium">{label}</p>
  </div>
);

export default Landing;