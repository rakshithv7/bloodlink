const router = require('express').Router();
const { authenticate, authorize, requireApproved } = require('../middleware/auth.middleware');
const donation = require('../controllers/donation.controller');
const upload = require('../middleware/upload.middleware');
const { validate, donationSchema } = require('../validations/donation.validation');

// ✅ PUBLIC route - no auth needed
router.get('/public/inventory', donation.getPublicInventory);

// All routes below require authentication
router.use(authenticate);

router.post('/', upload.array('documents', 5), validate(donationSchema), donation.submitDonation);
router.get('/my', donation.getMyDonations);
router.get('/expiring', authorize('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'MANAGER'), requireApproved, donation.getExpiringDonations);
router.get('/', authorize('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'MANAGER'), requireApproved, donation.getAllDonations);
router.get('/:id', donation.getDonationById);
router.patch('/:id/approval', authorize('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'MANAGER'), requireApproved, donation.approveDonation);

module.exports = router;