const mongoose = require('mongoose');

const BLOOD_TYPES = ['RBC', 'Platelets', 'Plasma', 'Whole Blood'];
const EXPIRY_DAYS = { RBC: 42, Platelets: 5, Plasma: 365, 'Whole Blood': 35 };

const bloodDonationSchema = new mongoose.Schema(
  {
    donor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    age: { type: Number, required: true, min: 18, max: 65 },
    gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true },
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
      required: true,
    },
    weight: { type: Number, required: true, min: 45 },
    hemoglobin: { type: Number, required: true },
    lastDonationDate: { type: Date },
    medicalHistory: { type: String },
    bloodType: { type: String, enum: BLOOD_TYPES, default: 'Whole Blood' },
    units: { type: Number, default: 1, min: 1 },
    documents: [{ url: String, publicId: String }],
    address: {
  type: String,
  required: true,
  trim: true,
},
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED', 'USED', 'EXPIRED'],
      default: 'PENDING',
    },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    rejectionReason: { type: String },
    expiryDate: { type: Date },
    isExpired: { type: Boolean, default: false },
    hospital: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String },
  },
  { timestamps: true }
);

bloodDonationSchema.index({ bloodGroup: 1, status: 1 });
bloodDonationSchema.index({ donor: 1 });
bloodDonationSchema.index({ expiryDate: 1 });

// Auto-calculate expiry date
bloodDonationSchema.pre('save', function (next) {
  if (this.isNew || this.isModified('approvedAt') || this.isModified('bloodType')) {
    if (this.status === 'APPROVED' && this.approvedAt) {
      const days = EXPIRY_DAYS[this.bloodType] || 35;
      this.expiryDate = new Date(this.approvedAt.getTime() + days * 24 * 60 * 60 * 1000);
    }
  }
  next();
});

module.exports = mongoose.model('BloodDonation', bloodDonationSchema);
