const BloodDonation = require('../models/BloodDonation.model');
const User = require('../models/User.model');
const { uploadToCloudinary } = require('../config/cloudinary');
const { createAuditLog } = require('../services/auditLog.service');
const { getIO } = require('../sockets');
const fs = require('fs');

// @desc   Submit donation
// @route  POST /api/donations
exports.submitDonation = async (req, res, next) => {
  try {
    const { name, age, gender, bloodGroup, weight, hemoglobin, lastDonationDate,
      medicalHistory, bloodType, units, locationLng, locationLat, notes } = req.body;

    // Upload documents if provided
    const documents = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const result = await uploadToCloudinary(file.path, 'bloodlink/donations');
        documents.push({ url: result.url, publicId: result.publicId });
        fs.unlinkSync(file.path);
      }
    }

    const donation = await BloodDonation.create({
      donor: req.user._id,
      name, age, gender, bloodGroup, weight, hemoglobin,
      lastDonationDate: lastDonationDate || null,
      medicalHistory, bloodType, units,
      location: { type: 'Point', coordinates: [parseFloat(locationLng), parseFloat(locationLat)] },
      notes, documents,
      hospital: req.user.role !== 'USER' ? req.user._id : undefined,
    });

    await createAuditLog({
      action: 'DONATION_SUBMITTED',
      performedBy: req.user._id,
      targetResource: 'BloodDonation',
      targetResourceId: donation._id,
      details: { bloodGroup, units },
      ipAddress: req.ip,
    });

    // Real-time notification to admins
    const io = getIO();
    if (io) io.to('admins').emit('new_donation_submitted', { donation, donor: req.user.name });

    res.status(201).json({ success: true, message: 'Donation submitted for review', data: donation });
  } catch (err) { next(err); }
};

// @desc   Get all donations (admin/manager)
// @route  GET /api/donations
exports.getAllDonations = async (req, res, next) => {
  try {
    const { status, bloodGroup, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status) query.status = status;
    if (bloodGroup) query.bloodGroup = bloodGroup;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [donations, total] = await Promise.all([
      BloodDonation.find(query).populate('donor', 'name email phone').populate('approvedBy', 'name')
        .sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      BloodDonation.countDocuments(query),
    ]);

    res.json({ success: true, data: donations, total, pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) { next(err); }
};

// @desc   Get my donations
// @route  GET /api/donations/my
exports.getMyDonations = async (req, res, next) => {
  try {
    const donations = await BloodDonation.find({ donor: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, data: donations });
  } catch (err) { next(err); }
};

// @desc   Approve or reject donation
// @route  PATCH /api/donations/:id/approval
exports.approveDonation = async (req, res, next) => {
  try {
    const { action, rejectionReason } = req.body;
    const donation = await BloodDonation.findById(req.params.id);

    if (!donation) return res.status(404).json({ success: false, message: 'Donation not found' });
    if (donation.status !== 'PENDING') return res.status(400).json({ success: false, message: 'Donation already processed' });

    const now = new Date();
    if (action === 'APPROVE') {
      donation.status = 'APPROVED';
      donation.approvedBy = req.user._id;
      donation.approvedAt = now;
    } else if (action === 'REJECT') {
      donation.status = 'REJECTED';
      donation.rejectionReason = rejectionReason;
    }

    await donation.save();

    // Update user lastDonationDate
    if (action === 'APPROVE') {
      await User.findByIdAndUpdate(donation.donor, { lastDonationDate: now });
    }

    await createAuditLog({
      action: `DONATION_${action}D`,
      performedBy: req.user._id,
      targetResource: 'BloodDonation',
      targetResourceId: donation._id,
      details: { rejectionReason },
      ipAddress: req.ip,
    });

    const io = getIO();
    if (io) {
      io.to(`user-${donation.donor}`).emit('donation_approved', {
        donationId: donation._id, status: donation.status,
      });
      if (action === 'APPROVE') io.to('admins').emit('donation_approved', { donation });
    }

    res.json({ success: true, message: `Donation ${action.toLowerCase()}d`, data: donation });
  } catch (err) { next(err); }
};
// @desc   Public blood inventory (no auth required)
// @route  GET /api/donations/public/inventory
exports.getPublicInventory = async (req, res, next) => {
  try {
    const inventory = await BloodDonation.aggregate([
      { $match: { status: 'APPROVED', isExpired: false } },
      {
        $group: {
          _id: '$bloodGroup',
          totalUnits: { $sum: '$units' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const totalUnits = inventory.reduce((sum, i) => sum + i.totalUnits, 0);
    const totalDonors = await require('../models/User.model').countDocuments({ role: 'USER', isActive: true });
    const totalHospitals = await require('../models/User.model').countDocuments({ role: 'HOSPITAL_ADMIN', approvalStatus: 'APPROVED' });
    const criticalRequests = await require('../models/BloodRequest.model').countDocuments({ status: 'OPEN', urgency: 'Critical' });

    res.json({
      success: true,
      data: {
        inventory,
        stats: { totalUnits, totalDonors, totalHospitals, criticalRequests },
      },
    });
  } catch (err) { next(err); }
};
// @desc   Get expiring donations
// @route  GET /api/donations/expiring
exports.getExpiringDonations = async (req, res, next) => {
  try {
    const threeDaysLater = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    const donations = await BloodDonation.find({
      status: 'APPROVED',
      isExpired: false,
      expiryDate: { $lte: threeDaysLater },
    }).populate('donor', 'name email');
    res.json({ success: true, data: donations });
  } catch (err) { next(err); }
};

// @desc   Get donation by ID
// @route  GET /api/donations/:id
exports.getDonationById = async (req, res, next) => {
  try {
    const donation = await BloodDonation.findById(req.params.id).populate('donor', 'name email phone bloodGroup');
    if (!donation) return res.status(404).json({ success: false, message: 'Donation not found' });
    res.json({ success: true, data: donation });
  } catch (err) { next(err); }
};
