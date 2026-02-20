const BloodRequest = require('../models/BloodRequest.model');
const { findMatchedDonors } = require('../services/donorMatching.service');
const { createAuditLog } = require('../services/auditLog.service');
const { getIO } = require('../sockets');

// @desc   Create blood request
// @route  POST /api/requests
exports.createRequest = async (req, res, next) => {
  try {
    const {
      patientName, bloodGroup, unitsRequired, urgency,
      hospitalName, hospitalAddress, locationLng, locationLat, neededBy, notes,
    } = req.body;

    const request = await BloodRequest.create({
      requester: req.user._id,
      patientName, bloodGroup, unitsRequired, urgency,
      hospitalName, hospitalAddress,
      location: { type: 'Point', coordinates: [parseFloat(locationLng), parseFloat(locationLat)] },
      neededBy, notes,
    });

    // Find matched donors
    const radiusKm = urgency === 'Critical' ? 30 : urgency === 'Urgent' ? 20 : 10;
    const matches = await findMatchedDonors(request, radiusKm);

    if (matches.length > 0) {
      request.matchedDonors = matches.slice(0, 20).map((m) => ({
        donor: m.donor._id,
        distance: m.distance,
        status: 'NOTIFIED',
      }));
      await request.save();
    }

    await createAuditLog({
      action: 'BLOOD_REQUEST_CREATED',
      performedBy: req.user._id,
      targetResource: 'BloodRequest',
      targetResourceId: request._id,
      details: { bloodGroup, unitsRequired, urgency },
      ipAddress: req.ip,
    });

    // Real-time broadcast
    const io = getIO();
    if (io) {
      io.to('admins').emit('new_blood_request', { request, matchedCount: matches.length });
      if (urgency === 'Critical') io.emit('shortage_alert', { request });

      // Notify matched donors
      matches.slice(0, 20).forEach(({ donor }) => {
        io.to(`user-${donor._id}`).emit('nearby_donor_alert', {
          requestId: request._id, bloodGroup, urgency, hospitalName,
        });
      });
    }

    res.status(201).json({
      success: true,
      message: 'Blood request created',
      data: request,
      matchedDonors: matches.slice(0, 5).map((m) => ({
        name: m.donor.name, bloodGroup: m.donor.bloodGroup, distance: m.distance,
      })),
    });
  } catch (err) { next(err); }
};

// @desc   Get all requests
// @route  GET /api/requests
exports.getAllRequests = async (req, res, next) => {
  try {
    const { status, urgency, bloodGroup, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status) query.status = status;
    if (urgency) query.urgency = urgency;
    if (bloodGroup) query.bloodGroup = bloodGroup;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [requests, total] = await Promise.all([
      BloodRequest.find(query).populate('requester', 'name email').sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      BloodRequest.countDocuments(query),
    ]);

    res.json({ success: true, data: requests, total, pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) { next(err); }
};

// @desc   Get my requests
// @route  GET /api/requests/my
exports.getMyRequests = async (req, res, next) => {
  try {
    const requests = await BloodRequest.find({ requester: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, data: requests });
  } catch (err) { next(err); }
};

// @desc   Get request by ID
// @route  GET /api/requests/:id
exports.getRequestById = async (req, res, next) => {
  try {
    const request = await BloodRequest.findById(req.params.id)
      .populate('requester', 'name email phone')
      .populate('matchedDonors.donor', 'name email phone bloodGroup');
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    res.json({ success: true, data: request });
  } catch (err) { next(err); }
};

// @desc   Update request status
// @route  PATCH /api/requests/:id/status
exports.updateRequestStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const request = await BloodRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });

    request.status = status;
    if (['FULFILLED', 'CLOSED'].includes(status)) {
      request.approvedBy = req.user._id;
      request.approvedAt = new Date();
    }
    await request.save();

    const io = getIO();
    if (io) {
      io.to(`user-${request.requester}`).emit('request_approved', { requestId: request._id, status });
    }

    await createAuditLog({
      action: `REQUEST_STATUS_UPDATED`,
      performedBy: req.user._id,
      targetResource: 'BloodRequest',
      targetResourceId: request._id,
      details: { status },
      ipAddress: req.ip,
    });

    res.json({ success: true, message: 'Request updated', data: request });
  } catch (err) { next(err); }
};

// @desc   Find nearby donors for a request
// @route  GET /api/requests/:id/donors
exports.getNearbyDonors = async (req, res, next) => {
  try {
    const request = await BloodRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });

    const radius = parseInt(req.query.radius) || 20;
    const matches = await findMatchedDonors(request, radius);

    res.json({
      success: true,
      data: matches.map((m) => ({
        donor: { name: m.donor.name, bloodGroup: m.donor.bloodGroup, phone: m.donor.phone },
        distance: m.distance,
      })),
    });
  } catch (err) { next(err); }
};
