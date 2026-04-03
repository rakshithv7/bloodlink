const router = require('express').Router();
const { authenticate, authorize, requireApproved } = require('../middleware/auth.middleware');
const request = require('../controllers/request.controller');

router.use(authenticate);

router.post('/',     request.createRequest);
router.get('/my',    request.getMyRequests);
router.get('/',      authorize('SUPER_ADMIN','HOSPITAL_ADMIN','MANAGER'), requireApproved, request.getAllRequests);
router.get('/:id/nearby-donors', authorize('SUPER_ADMIN','HOSPITAL_ADMIN','MANAGER'), requireApproved, request.getNearbyDonors);
router.post('/:id/notify-donors', authorize('SUPER_ADMIN','HOSPITAL_ADMIN','MANAGER'), requireApproved, request.notifyDonors);
router.patch('/:id/status', authorize('SUPER_ADMIN','HOSPITAL_ADMIN','MANAGER'), requireApproved, request.updateRequestStatus);

module.exports = router;