const BloodDonation = require('../models/BloodDonation.model');
const User = require('../models/User.model');
const { uploadToCloudinary } = require('../config/cloudinary');
const { createAuditLog } = require('../services/auditLog.service');
const { getIO } = require('../sockets');
const fs = require('fs');


// =============================
// SUBMIT DONATION
// =============================
exports.submitDonation = async (req, res, next) => {
  try {
    const {
      name, age, gender, bloodGroup, weight, hemoglobin,
      lastDonationDate, medicalHistory, bloodType, units,
      address, locationLng, locationLat, notes,
    } = req.body;

    const lat = parseFloat(locationLat);
    const lng = parseFloat(locationLng);
    const hasCoords = !isNaN(lat) && !isNaN(lng) && (lat !== 0 || lng !== 0);

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
      name,
      age,
      gender,
      bloodGroup,
      weight,
      hemoglobin,
      lastDonationDate: lastDonationDate || null,
      medicalHistory,
      bloodType,
      units,
      address: address || '',
      location: {
        type: 'Point',
        coordinates: hasCoords ? [lng, lat] : [0, 0],
      },
      notes,
      documents,
      hospital: req.user.role !== 'USER' ? req.user._id : undefined,
    });

    const io = getIO();
    if (io) {
      io.to('admins').emit('new_donation_submitted', {
        donation,
        donor: req.user.name,
      });
    }

    res.status(201).json({
      success: true,
      message: 'Donation submitted for review',
      data: donation,
    });

  } catch (err) {
    next(err);
  }
};


// =============================
// GET PUBLIC INVENTORY (FIXED)
// =============================
exports.getPublicInventory = async (req, res, next) => {
  try {
    const inventory = await BloodDonation.aggregate([
      {
        $match: {
          status: 'APPROVED',
          isExpired: false
        }
      },
      {
        $group: {
          _id: '$bloodGroup',
          totalUnits: { $sum: '$units' }
        }
      }
    ]);

    const totalUnits = inventory.reduce((sum, item) => {
      return sum + item.totalUnits;
    }, 0);

    const totalDonors = await User.countDocuments({ role: 'USER' });

    const totalHospitals = await User.countDocuments({
      role: { $in: ['HOSPITAL_ADMIN', 'MANAGER'] }
    });

    const stats = {
      totalUnits,
      totalDonors,
      totalHospitals,
      criticalRequests: 0
    };

    res.json({
      success: true,
      data: {
        inventory,
        stats
      }
    });

  } catch (err) {
    next(err);
  }
};


// =============================
// OTHER CONTROLLERS (SAFE)
// =============================
exports.getMyDonations = async (req, res, next) => {
  try {
    const donations = await BloodDonation
      .find({ donor: req.user._id })
      .sort({ createdAt: -1 });

    res.json({ success: true, data: donations });
  } catch (err) {
    next(err);
  }
};

exports.getAllDonations = async (req, res, next) => {
  try {
    const donations = await BloodDonation.find()
      .sort({ createdAt: -1 });

    res.json({ success: true, data: donations });
  } catch (err) {
    next(err);
  }
};
// =============================
// TEMP FIX CONTROLLERS
// =============================

exports.getExpiringDonations = async (req, res, next) => {
  try {
    res.json({ success: true, data: [] });
  } catch (err) {
    next(err);
  }
};

exports.getDonationById = async (req, res, next) => {
  try {
    const donation = await BloodDonation.findById(req.params.id);
    res.json({ success: true, data: donation });
  } catch (err) {
    next(err);
  }
};

exports.approveDonation = async (req, res, next) => {
  try {
    const donation = await BloodDonation.findByIdAndUpdate(
      req.params.id,
      { status: 'APPROVED' },
      { new: true }
    );

    res.json({ success: true, data: donation });
  } catch (err) {
    next(err);
  }
};
// =============================
// ISSUE BLOOD (REDUCE UNITS)
// =============================
exports.issueBloodUnits = async (req, res, next) => {
  try {
    const { donationId } = req.params;
    const { unitsToIssue } = req.body;

    if (!unitsToIssue || unitsToIssue <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid units requested"
      });
    }

    const donation = await BloodDonation.findById(donationId);

    if (!donation) {
      return res.status(404).json({
        success: false,
        message: "Donation not found"
      });
    }

    if (donation.status !== "APPROVED") {
      return res.status(400).json({
        success: false,
        message: "Donation not approved yet"
      });
    }

    // 🚨 Prevent negative stock
    const remainingUnits = Math.max(0, donation.units - unitsToIssue);

    donation.units = remainingUnits;

    // Auto expire when units reach 0
    if (remainingUnits === 0) {
      donation.isExpired = true;
    }

    await donation.save();

    res.json({
      success: true,
      message: `Issued ${unitsToIssue} units`,
      remainingUnits: donation.units
    });

  } catch (err) {
    next(err);
  }
};