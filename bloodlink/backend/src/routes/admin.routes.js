const router = require('express').Router();
const { authenticate, authorize, requireApproved } = require('../middleware/auth.middleware');
const admin = require('../controllers/admin.controller');

// All admin routes require authentication
router.use(authenticate);

// Super Admin only
router.get('/pending-hospitals', authorize('SUPER_ADMIN'), admin.getPendingHospitals);
router.patch('/hospitals/:id/approval', authorize('SUPER_ADMIN'), admin.approveHospital);
router.get('/analytics', authorize('SUPER_ADMIN'), admin.getAnalytics);
router.get('/audit-logs', authorize('SUPER_ADMIN'), admin.getAuditLogs);
router.get('/users', authorize('SUPER_ADMIN'), admin.getAllUsers);
router.patch('/users/:id/toggle-status', authorize('SUPER_ADMIN'), admin.toggleUserStatus);

// Hospital Admin
router.get('/pending-managers', authorize('SUPER_ADMIN', 'HOSPITAL_ADMIN'), requireApproved, admin.getPendingManagers);
router.patch('/managers/:id/approval', authorize('SUPER_ADMIN', 'HOSPITAL_ADMIN'), requireApproved, admin.approveManager);

module.exports = router;
