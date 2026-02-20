const mongoose = require('mongoose');

const bloodRequestSchema = new mongoose.Schema(
  {
    requester: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    patientName: { type: String, required: true },
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
      required: true,
    },
    unitsRequired: { type: Number, required: true, min: 1 },
    urgency: { type: String, enum: ['Normal', 'Urgent', 'Critical'], default: 'Normal' },
    hospitalName: { type: String, required: true },
    hospitalAddress: { type: String },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true },
    },
    status: {
      type: String,
      enum: ['OPEN', 'FULFILLED', 'PARTIALLY_FULFILLED', 'CLOSED', 'EXPIRED'],
      default: 'OPEN',
    },
    matchedDonors: [
      {
        donor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        distance: Number,
        status: { type: String, enum: ['NOTIFIED', 'ACCEPTED', 'DECLINED', 'DONATED'], default: 'NOTIFIED' },
      },
    ],
    fulfilledUnits: { type: Number, default: 0 },
    neededBy: { type: Date },
    notes: { type: String },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
  },
  { timestamps: true }
);

bloodRequestSchema.index({ bloodGroup: 1, status: 1 });
bloodRequestSchema.index({ location: '2dsphere' });
bloodRequestSchema.index({ urgency: 1 });
bloodRequestSchema.index({ requester: 1 });

module.exports = mongoose.model('BloodRequest', bloodRequestSchema);
