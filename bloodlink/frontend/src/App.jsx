import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import store from './store';
import { fetchMe, forceInitialized } from './store/slices/authSlice';
import { connectSocket, getSocket } from './utils/socket';

import Navbar from './components/layout/Navbar';
import ProtectedRoute from './components/common/ProtectedRoute';
import Landing from './pages/Landing';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Dashboard from './pages/donor/Dashboard';
import DonationsList from './pages/donor/DonationsList';
import DonationForm from './pages/donor/DonationForm';
import RequestsList from './pages/donor/RequestsList';
import RequestForm from './pages/donor/RequestForm';
import AdminDashboard from './pages/admin/AdminDashboard';
import HospitalDashboard from './pages/hospital/HospitalDashboard';

const AppContent = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((s) => s.auth);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      dispatch(fetchMe());
      connectSocket(token);
      const timeout = setTimeout(() => dispatch(forceInitialized()), 5000);
      return () => clearTimeout(timeout);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    const socket = getSocket();
    if (!socket) return;

    const addNotif = (title, message) =>
      setNotifications((prev) => [{ title, message, ts: Date.now() }, ...prev].slice(0, 20));

    socket.on('new_blood_request',  ({ request }) => addNotif('New Blood Request', `${request.bloodGroup} needed at ${request.hospitalName}`));
    socket.on('donation_approved',  ({ status })  => addNotif('Donation Update', `Your donation was ${status?.toLowerCase()}`));
    socket.on('request_approved',   ({ status })  => addNotif('Request Update', `Your request is now ${status?.toLowerCase()}`));
    socket.on('shortage_alert',     ({ request }) => addNotif('🚨 Critical Shortage', `${request.bloodGroup} critically needed`));
    socket.on('nearby_donor_alert', ({ bloodGroup, urgency, hospitalName }) => addNotif('Donor Needed Nearby', `${urgency}: ${bloodGroup} at ${hospitalName}`));
    socket.on('expiry_warning',     ({ count })   => addNotif('⚠️ Expiry Warning', `${count} donation(s) expiring soon`));

    return () => {
      ['new_blood_request','donation_approved','request_approved',
       'shortage_alert','nearby_donor_alert','expiry_warning'].forEach(e => socket.off(e));
    };
  }, [user]);

  const isAdmin = user && ['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'MANAGER'].includes(user.role);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <Navbar
          notifications={notifications}
          onClearNotifications={() => setNotifications([])}
        />
        <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
        <Routes>
          {/* Public */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* User dashboard */}
          <Route path="/dashboard" element={
            <ProtectedRoute allowedRoles={['USER']}>
              <Dashboard />
            </ProtectedRoute>
          } />

          {/* Donations — only regular users */}
          <Route path="/donations" element={
            <ProtectedRoute allowedRoles={['USER']}>
              <DonationsList />
            </ProtectedRoute>
          } />
          <Route path="/donations/new" element={
            <ProtectedRoute allowedRoles={['USER']}>
              <DonationForm />
            </ProtectedRoute>
          } />

          {/* Requests — only regular users */}
          <Route path="/requests" element={
            <ProtectedRoute allowedRoles={['USER']}>
              <RequestsList />
            </ProtectedRoute>
          } />
          <Route path="/requests/new" element={
            <ProtectedRoute allowedRoles={['USER']}>
              <RequestForm />
            </ProtectedRoute>
          } />

          {/* Hospital Panel */}
          <Route path="/hospital" element={
            <ProtectedRoute allowedRoles={['HOSPITAL_ADMIN', 'MANAGER', 'SUPER_ADMIN']}>
              <HospitalDashboard />
            </ProtectedRoute>
          } />

          {/* Admin Panel */}
          <Route path="/admin" element={
            <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
              <AdminDashboard />
            </ProtectedRoute>
          } />

          <Route path="/unauthorized" element={
            <div className="min-h-screen flex items-center justify-center">
              <div className="text-center">
                <p className="text-6xl font-bold text-red-600 mb-4">403</p>
                <p className="text-xl font-semibold text-gray-800">Access Denied</p>
                <p className="text-gray-500 mt-2">You don't have permission to view this page.</p>
              </div>
            </div>
          } />

          <Route path="*" element={
            <div className="min-h-screen flex items-center justify-center">
              <div className="text-center">
                <p className="text-6xl font-bold text-red-600 mb-4">404</p>
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