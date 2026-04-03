const mongoose = require('mongoose');

const bloodRequestSchema = new mongoose.Schema(
  {
    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    patientName: {
      type: String,
      required: true,
    },

    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
      required: true,
    },

    unitsRequired: {
      type: Number,
      required: true,
      min: 1,
    },

    urgency: {
      type: String,
      enum: ['Normal', 'Urgent', 'Critical'],
      default: 'Normal',
    },

    hospitalName: {
      type: String,
      required: true,
    },

    // ✅ Hospital Address
    hospitalAddress: {
      type: String,
      default: '',
    },

    // ✅ Search radius in KM
    radius: {
      type: Number,
      default: 10,
    },

    status: {
      type: String,
      enum: [
        'OPEN',
        'FULFILLED',
        'PARTIALLY_FULFILLED',
        'CLOSED',
        'EXPIRED',
      ],
      default: 'OPEN',
    },

    // ✅ Updated matched donors structure
    matchedDonors: [
      {
        donor: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        matchLabel: {
          type: String,
          default: 'Same City', // 'Same Area' | 'Same City' | 'Same State'
        },
        notified: {
          type: Boolean,
          default: false,
        },
      },
    ],

    fulfilledUnits: {
      type: Number,
      default: 0,
    },

    neededBy: { type: Date },

    notes: { type: String },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    approvedAt: { type: Date },
  },
  { timestamps: true }
);

/* ================= INDEXES ================= */

bloodRequestSchema.index({ bloodGroup: 1, status: 1 });
bloodRequestSchema.index({ urgency: 1 });
bloodRequestSchema.index({ requester: 1 });

module.exports = mongoose.model('BloodRequest', bloodRequestSchema);