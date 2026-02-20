import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import store from './store';
import { fetchMe, forceInitialized } from './store/slices/authSlice';
import { connectSocket, getSocket } from './utils/socket';

// Layout
import Navbar from './components/layout/Navbar';
import ProtectedRoute from './components/common/ProtectedRoute';

// Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Dashboard from './pages/donor/Dashboard';
import DonationsList from './pages/donor/DonationsList';
import DonationForm from './pages/donor/DonationForm';
import RequestsList from './pages/donor/RequestsList';
import RequestForm from './pages/donor/RequestForm';
import AdminDashboard from './pages/admin/AdminDashboard';
import HospitalDashboard from './pages/hospital/HospitalDashboard';
import Landing from './pages/Landing';
const AppContent = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((s) => s.auth);
  const [notifications, setNotifications] = useState([]);

  // Initialize user on load
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      dispatch(fetchMe());
      connectSocket(token);
      // Safety net — if fetchMe hangs more than 5s, unblock the app
      const timeout = setTimeout(() => dispatch(forceInitialized()), 5000);
      return () => clearTimeout(timeout);
    }
  }, []);

  // Socket listeners for real-time notifications
  useEffect(() => {
    if (!user) return;
    const socket = getSocket();
    if (!socket) return;

    const addNotif = (title, message) => {
      setNotifications((prev) => [{ title, message, ts: Date.now() }, ...prev].slice(0, 20));
    };

    socket.on('new_blood_request', ({ request }) => addNotif('New Blood Request', `${request.bloodGroup} needed at ${request.hospitalName}`));
    socket.on('donation_approved', ({ status }) => addNotif('Donation Update', `Your donation was ${status?.toLowerCase()}`));
    socket.on('request_approved', ({ status }) => addNotif('Request Update', `Your blood request is now ${status?.toLowerCase()}`));
    socket.on('shortage_alert', ({ request }) => addNotif('🚨 Critical Shortage!', `${request.bloodGroup} critically needed at ${request.hospitalName}`));
    socket.on('nearby_donor_alert', ({ bloodGroup, urgency, hospitalName }) => addNotif('Donor Needed Nearby', `${urgency} need for ${bloodGroup} at ${hospitalName}`));
    socket.on('expiry_warning', ({ count }) => addNotif('⚠️ Expiry Warning', `${count} donation(s) expiring within 3 days`));

    return () => {
      socket.off('new_blood_request');
      socket.off('donation_approved');
      socket.off('request_approved');
      socket.off('shortage_alert');
      socket.off('nearby_donor_alert');
      socket.off('expiry_warning');
    };
  }, [user]);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50 font-sans">
        <Navbar notifications={notifications} />
        <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<Landing />} />
          {/* User routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute allowedRoles={['USER', 'HOSPITAL_ADMIN', 'MANAGER', 'SUPER_ADMIN']}>
              <Dashboard />
            </ProtectedRoute>
          } />

          {/* Donations */}
          <Route path="/donations" element={
            <ProtectedRoute allowedRoles={['USER', 'HOSPITAL_ADMIN', 'MANAGER', 'SUPER_ADMIN']}>
              <DonationsList />
            </ProtectedRoute>
          } />
          <Route path="/donations/new" element={
            <ProtectedRoute allowedRoles={['USER', 'HOSPITAL_ADMIN', 'MANAGER']}>
              <DonationForm />
            </ProtectedRoute>
          } />

          {/* Requests */}
          <Route path="/requests" element={
            <ProtectedRoute allowedRoles={['USER', 'HOSPITAL_ADMIN', 'MANAGER', 'SUPER_ADMIN']}>
              <RequestsList />
            </ProtectedRoute>
          } />
          <Route path="/requests/new" element={
            <ProtectedRoute allowedRoles={['USER', 'HOSPITAL_ADMIN', 'MANAGER']}>
              <RequestForm />
            </ProtectedRoute>
          } />

          {/* Hospital Admin / Manager */}
          <Route path="/hospital" element={
            <ProtectedRoute allowedRoles={['HOSPITAL_ADMIN', 'MANAGER', 'SUPER_ADMIN']}>
              <HospitalDashboard />
            </ProtectedRoute>
          } />

          {/* Super Admin */}
          <Route path="/admin" element={
            <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
              <AdminDashboard />
            </ProtectedRoute>
          } />

          {/* Unauthorized */}
          <Route path="/unauthorized" element={
            <div className="min-h-screen flex items-center justify-center">
              <div className="text-center">
                <p className="text-6xl font-display font-bold text-blood-600 mb-4">403</p>
                <p className="text-xl font-semibold text-gray-800">Access Denied</p>
                <p className="text-gray-500 mt-2">You don't have permission to view this page.</p>
              </div>
            </div>
          } />

          {/* 404 */}
          <Route path="*" element={
            <div className="min-h-screen flex items-center justify-center">
              <div className="text-center">
                <p className="text-6xl font-display font-bold text-blood-600 mb-4">404</p>
                <p className="text-xl font-semibold text-gray-800">Page Not Found</p>
              </div>
            </div>
          } />
        </Routes>
      </div>
    </BrowserRouter>
  );
};

const App = () => (
  <Provider store={store}>
    <AppContent />
  </Provider>
);

export default App;