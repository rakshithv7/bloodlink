const BloodRequest         = require('../models/BloodRequest.model');
const { findNearbyDonors } = require('../services/donorMatching.service');
const { getCompatibleDonors } = require('../services/bloodCompatibility.service');
const { createAuditLog }   = require('../services/auditLog.service');
const { getIO }            = require('../sockets');

// @desc   Create blood request + auto-match donors + notify them via Socket.io
// @route  POST /api/requests
exports.createRequest = async (req, res, next) => {
  try {
    const {
      patientName, bloodGroup, unitsRequired, urgency,
      hospitalName, hospitalAddress,
      locationLat, locationLng,
      radius = 10,
      neededBy, notes,
    } = req.body;

    // Coordinates are silently geocoded on the frontend — never entered by user manually
    const lat       = parseFloat(locationLat);
    const lng       = parseFloat(locationLng);
    const hasCoords = !isNaN(lat) && !isNaN(lng) && (lat !== 0 || lng !== 0);

    // Get blood groups that can donate to this recipient
    const compatibleGroups = getCompatibleDonors(bloodGroup);

    // Find nearby donors using MongoDB $nearSphere if coords available
    let matchedDonors = [];
    if (hasCoords) {
      matchedDonors = await findNearbyDonors(lng, lat, compatibleGroups, parseInt(radius), 20);
    }

    // Save request to database
    const request = await BloodRequest.create({
      requester:       req.user._id,
      patientName,
      bloodGroup,
      unitsRequired,
      urgency,
      hospitalName,
      hospitalAddress: hospitalAddress || '',
      location: {
        type:        'Point',
        coordinates: hasCoords ? [lng, lat] : [0, 0],
      },
      radius:   parseInt(radius),
      neededBy: neededBy || null,
      notes:    notes    || '',
      matchedDonors: matchedDonors.map((m) => ({
        donor:    m.donor._id,
        distance: m.distance,
        notified: true,
      })),
      status: 'OPEN',
    });

    // Real-time Socket.io notifications
    const io = getIO();
    if (io) {
      // Send personalised alert to each matched donor's private room
      matchedDonors.forEach(({ donor, distance }) => {
        io.to(`user-${donor._id}`).emit('nearby_donor_alert', {
          requestId:       request._id,
          bloodGroup,
          urgency,
          hospitalName,
          hospitalAddress: hospitalAddress || '',
          unitsRequired,
          distance,
          message: `🩸 ${urgency} need for ${bloodGroup} blood at ${hospitalName} — only ${distance}km from you`,
        });
      });

      // Critical shortage — broadcast alert to ALL admins immediately
      if (urgency === 'Critical') {
        io.to('admins').emit('shortage_alert', {
          request: {
            _id: request._id, bloodGroup, hospitalName, urgency, unitsRequired,
          },
        });
      }

      // Always inform admins of every new request
      io.to('admins').emit('new_blood_request', {
        request: {
          _id: request._id, bloodGroup, hospitalName, urgency, unitsRequired,
        },
      });
    }

    await createAuditLog({
      action:           'BLOOD_REQUEST_CREATED',
      performedBy:      req.user._id,
      targetResource:   'BloodRequest',
      targetResourceId: request._id,
      details: {
        bloodGroup, urgency, unitsRequired,
        hospitalAddress, radius,
        matchedCount: matchedDonors.length,
      },
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      message: hasCoords
        ? `Request created. ${matchedDonors.length} donor(s) notified within ${radius}km.`
        : 'Request created. No location provided — donors could not be auto-notified.',
      data: request,
      matchedDonors: matchedDonors.map((m) => ({
        donor: {
          _id:        m.donor._id,
          name:       m.donor.name,
          bloodGroup: m.donor.bloodGroup,
          address:    m.donor.address,
        },
        distance: m.distance,
      })),
    });
  } catch (err) { next(err); }
};

// @desc   Get current user's requests
// @route  GET /api/requests/my
exports.getMyRequests = async (req, res, next) => {
  try {
    const requests = await BloodRequest
      .find({ requester: req.user._id })
      .sort({ createdAt: -1 });
    res.json({ success: true, data: requests });
  } catch (err) { next(err); }
};

// @desc   Get all requests (admin / hospital panel)
// @route  GET /api/requests
exports.getAllRequests = async (req, res, next) => {
  try {
    const { status, bloodGroup, urgency, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status)     filter.status     = status;
    if (bloodGroup) filter.bloodGroup = bloodGroup;
    if (urgency)    filter.urgency    = urgency;

    const [requests, total] = await Promise.all([
      BloodRequest.find(filter)
        .populate('requester', 'name email')
        .sort({ createdAt: -1 })
        .skip((parseInt(page) - 1) * parseInt(limit))
        .limit(parseInt(limit)),
      BloodRequest.countDocuments(filter),
    ]);

    res.json({ success: true, data: requests, total, page: parseInt(page) });
  } catch (err) { next(err); }
};

// @desc   Get nearby donors for a specific request (with live radius filter)
// @route  GET /api/requests/:id/nearby-donors?radius=10
exports.getNearbyDonors = async (req, res, next) => {
  try {
    const request = await BloodRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    const radius    = parseInt(req.query.radius) || request.radius || 10;
    const [lng, lat] = request.location.coordinates;

    // No coordinates stored — cannot do radius search
    if (!lng && !lat) {
      return res.json({
        success: true,
        data:    [],
        message: 'No coordinates stored for this request',
      });
    }

    const compatibleGroups = getCompatibleDonors(request.bloodGroup);
    const donors           = await findNearbyDonors(lng, lat, compatibleGroups, radius, 50);

    res.json({
      success: true,
      data:    donors.map((m) => ({
        donor: {
          _id:        m.donor._id,
          name:       m.donor.name,
          bloodGroup: m.donor.bloodGroup,
          address:    m.donor.address,
        },
        distance: m.distance,
      })),
      radius,
      total: donors.length,
    });
  } catch (err) { next(err); }
};

// @desc   Re-notify donors for a request (admin can change radius and re-send)
// @route  POST /api/requests/:id/notify-donors
exports.notifyDonors = async (req, res, next) => {
  try {
    const { radius } = req.body;
    const request    = await BloodRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    const [lng, lat] = request.location.coordinates;
    if (!lng && !lat) {
      return res.status(400).json({
        success: false,
        message: 'No location coordinates stored for this request',
      });
    }

    const searchRadius     = parseInt(radius) || request.radius || 10;
    const compatibleGroups = getCompatibleDonors(request.bloodGroup);
    const donors           = await findNearbyDonors(lng, lat, compatibleGroups, searchRadius, 20);

    // Update the matched donors list in the database
    request.matchedDonors = donors.map((m) => ({
      donor:    m.donor._id,
      distance: m.distance,
      notified: true,
    }));
    request.radius = searchRadius;
    await request.save();

    // Send Socket.io notification to each donor
    const io = getIO();
    if (io) {
      donors.forEach(({ donor, distance }) => {
        io.to(`user-${donor._id}`).emit('nearby_donor_alert', {
          requestId:       request._id,
          bloodGroup:      request.bloodGroup,
          urgency:         request.urgency,
          hospitalName:    request.hospitalName,
          hospitalAddress: request.hospitalAddress,
          distance,
          message: `🩸 ${request.urgency} need for ${request.bloodGroup} at ${request.hospitalName} — ${distance}km from you`,
        });
      });
    }

    res.json({
      success:  true,
      message:  `${donors.length} donor(s) notified within ${searchRadius}km`,
      notified: donors.length,
    });
  } catch (err) { next(err); }
};

// @desc   Update request status (fulfilled / closed)
// @route  PATCH /api/requests/:id/status


exports.updateRequestStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    const request = await BloodRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    // If marking as FULFILLED → deduct blood units
    if (status === 'FULFILLED') {

      let unitsNeeded = request.unitsRequired;

      // Find approved donations of same blood group
      const donations = await BloodDonation.find({
        bloodGroup: request.bloodGroup,
        status: 'APPROVED',
        isExpired: false,
      }).sort({ expiryDate: 1 }); // Use older blood first

      if (!donations.length) {
        return res.status(400).json({
          success: false,
          message: 'No approved blood units available',
        });
      }

      for (let donation of donations) {
        if (unitsNeeded <= 0) break;

        if (donation.units > 0) {
          const deduct = Math.min(donation.units, unitsNeeded);

          donation.units -= deduct;
          unitsNeeded -= deduct;

          // If donation fully used → mark as USED
          if (donation.units === 0) {
            donation.status = 'USED';
          }

          await donation.save();
        }
      }

      // If still units needed → not enough stock
      if (unitsNeeded > 0) {
        return res.status(400).json({
          success: false,
          message: 'Not enough blood units available',
        });
      }

      request.fulfilledUnits = request.unitsRequired;
    }

    // Update request status
    request.status = status;
    await request.save();

    // Notify requester via socket
    const io = getIO();
    if (io) {
      io.to(`user-${request.requester}`).emit('request_updated', {
        requestId: request._id,
        status: request.status,
        bloodGroup: request.bloodGroup,
      });
    }

    res.json({
      success: true,
      message: 'Request updated successfully',
      data: request,
    });

  } catch (err) {
    next(err);
  }
};
const BloodDonation = require('../models/BloodDonation.model');

exports.updateRequestStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    const request = await BloodRequest.findById(req.params.id);
    if (!request)
      return res.status(404).json({ success: false, message: 'Request not found' });

    // ===============================
    // IF FULFILLED OR PARTIAL
    // ===============================
    if (status === 'FULFILLED') {

      let unitsNeeded = request.unitsRequired - request.fulfilledUnits;

      const donations = await BloodDonation.find({
        bloodGroup: request.bloodGroup,
        status: 'APPROVED',
        isExpired: false,
        units: { $gt: 0 }
      }).sort({ expiryDate: 1 });

      if (!donations.length)
        return res.status(400).json({
          success: false,
          message: 'No available blood units'
        });

      let totalDeducted = 0;

      for (let donation of donations) {
        if (unitsNeeded <= 0) break;

        const deduct = Math.min(donation.units, unitsNeeded);

        donation.units -= deduct;
        unitsNeeded -= deduct;
        totalDeducted += deduct;

        if (donation.units === 0) {
          donation.status = 'USED';
        }

        await donation.save();
      }

      if (totalDeducted === 0)
        return res.status(400).json({
          success: false,
          message: 'No sufficient stock'
        });

      request.fulfilledUnits += totalDeducted;

      // Decide final request status
      if (request.fulfilledUnits >= request.unitsRequired) {
        request.status = 'FULFILLED';
      } else {
        request.status = 'PARTIALLY_FULFILLED';
      }

      await request.save();
    }

    // ===============================
    // IF CLOSED (REJECTED BY HOSPITAL)
    // ===============================
    if (status === 'CLOSED') {
      request.status = 'CLOSED';
      await request.save();
    }

    // ===============================
    // SOCKET UPDATE
    // ===============================
    const io = getIO();
    if (io) {
      io.to('admins').emit('request_updated', request);
      io.to(`user-${request.requester}`).emit('request_updated', request);
    }

    res.json({
      success: true,
      message: 'Request updated successfully',
      data: request
    });

  } catch (err) {
    next(err);
  }
};