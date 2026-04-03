import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logoutUser } from '../../store/slices/authSlice';
import { FiDroplet, FiMenu, FiX, FiBell, FiLogOut, FiUser } from 'react-icons/fi';
import toast from 'react-hot-toast';

const Navbar = ({ notifications = [], onClearNotifications }) => {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef(null);

  // Close notification dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await dispatch(logoutUser());
    toast.success('Logged out');
    navigate('/login');
  };

  const getDashboardLink = () => {
    if (!user) return '/';
    if (user.role === 'SUPER_ADMIN') return '/admin';
    if (user.role === 'HOSPITAL_ADMIN') return '/hospital';
    if (user.role === 'MANAGER') return '/hospital';
    return '/dashboard';
  };

  // Roles that are admins — hide Donate and Request links
  const isAdmin = user && ['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'MANAGER'].includes(user.role);

  const navLinks = user ? [
    { label: 'Dashboard', to: getDashboardLink() },
    // Only show Donations and Requests for regular users
    ...(!isAdmin ? [
      { label: 'My Donations', to: '/donations' },
      { label: 'My Requests', to: '/requests' },
    ] : []),
    ...((['HOSPITAL_ADMIN', 'MANAGER', 'SUPER_ADMIN'].includes(user.role))
      ? [{ label: 'Hospital Panel', to: '/hospital' }]
      : []),
    ...(user.role === 'SUPER_ADMIN'
      ? [{ label: 'Admin Panel', to: '/admin' }]
      : []),
  ] : [];

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 font-bold text-xl text-red-700">
            <FiDroplet className="text-red-600 text-2xl" />
            BloodLink
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`text-sm font-medium transition-colors ${
                  location.pathname === link.to
                    ? 'text-red-600 border-b-2 border-red-600 pb-0.5'
                    : 'text-gray-600 hover:text-red-600'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right side */}
          {user ? (
            <div className="flex items-center gap-3">

              {/* Notifications */}
              <div className="relative" ref={notifRef}>
                <button
                  onClick={() => setNotifOpen(!notifOpen)}
                  className="relative p-2 text-gray-500 hover:text-red-600 transition-colors"
                >
                  <FiBell size={20} />
                  {notifications.length > 0 && (
                    <span className="absolute top-0 right-0 bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {notifications.length > 9 ? '9+' : notifications.length}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50">
                    {/* Header with close button */}
                    <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
                      <p className="font-semibold text-sm text-gray-700">
                        Notifications
                        {notifications.length > 0 && (
                          <span className="ml-2 bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full">
                            {notifications.length}
                          </span>
                        )}
                      </p>
                      <div className="flex items-center gap-2">
                        {notifications.length > 0 && onClearNotifications && (
                          <button
                            onClick={() => { onClearNotifications(); }}
                            className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                          >
                            Clear all
                          </button>
                        )}
                        {/* Close X button */}
                        <button
                          onClick={() => setNotifOpen(false)}
                          className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                          <FiX size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Notification list */}
                    <div className="max-h-72 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="px-4 py-8 text-center">
                          <FiBell className="mx-auto text-gray-200 text-3xl mb-2" />
                          <p className="text-sm text-gray-400">No new notifications</p>
                        </div>
                      ) : (
                        notifications.slice(0, 10).map((n, i) => (
                          <div key={i} className="px-4 py-3 hover:bg-gray-50 border-b border-gray-50 last:border-0">
                            <p className="text-sm font-medium text-gray-800">{n.title}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{n.message}</p>
                            <p className="text-xs text-gray-300 mt-1">
                              {new Date(n.ts).toLocaleTimeString()}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User info */}
              <div className="flex items-center gap-2">
                <div className="hidden sm:block text-right">
                  <p className="text-sm font-semibold text-gray-800">{user.name}</p>
                  <p className="text-xs text-red-600 capitalize">
                    {user.role.replace(/_/g, ' ').toLowerCase()}
                  </p>
                </div>
                <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center">
                  <FiUser className="text-red-600" />
                </div>
              </div>

              {/* Logout */}
              <button
                onClick={handleLogout}
                title="Logout"
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-red-600 transition-colors"
              >
                <FiLogOut size={18} />
              </button>

              {/* Mobile hamburger */}
              <button className="md:hidden p-2" onClick={() => setMenuOpen(!menuOpen)}>
                {menuOpen ? <FiX size={22} /> : <FiMenu size={22} />}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link to="/" className="text-sm font-medium text-gray-600 hover:text-red-600">
                Home
              </Link>
              <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-red-600">
                Login
              </Link>
              <Link to="/register"
                className="bg-red-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-red-700 transition-colors">
                Register
              </Link>
            </div>
          )}
        </div>

        {/* Mobile dropdown */}
        {menuOpen && user && (
          <div className="md:hidden border-t border-gray-100 py-3 flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMenuOpen(false)}
                className={`text-sm py-2.5 px-3 rounded-lg transition-colors ${
                  location.pathname === link.to
                    ? 'text-red-600 bg-red-50 font-semibold'
                    : 'text-gray-700 hover:text-red-600 hover:bg-gray-50'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <button
              onClick={handleLogout}
              className="text-left text-sm py-2.5 px-3 rounded-lg text-gray-500 hover:text-red-600 hover:bg-gray-50 flex items-center gap-2 mt-1"
            >
              <FiLogOut size={15} /> Logout
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;