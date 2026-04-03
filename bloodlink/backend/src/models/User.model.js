const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const ROLES = [
  'USER',
  'MANAGER',
  'HOSPITAL_ADMIN',
  'SUPER_ADMIN',
  'PENDING_HOSPITAL_ADMIN',
  'PENDING_MANAGER'
];

const BLOOD_GROUPS = [
  'A+',
  'A-',
  'B+',
  'B-',
  'AB+',
  'AB-',
  'O+',
  'O-'
];

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email'],
    },

    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false,
    },

    role: {
      type: String,
      enum: ROLES,
      default: 'USER',
    },

    approvalStatus: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED', 'NA'],
      default: function () {
        return ['PENDING_HOSPITAL_ADMIN', 'PENDING_MANAGER'].includes(this.role)
          ? 'PENDING'
          : 'NA';
      },
    },

    isActive: { type: Boolean, default: true },

    bloodGroup: { type: String, enum: BLOOD_GROUPS },

    phone: { type: String },

    dateOfBirth: { type: Date },

    gender: { type: String, enum: ['Male', 'Female', 'Other'] },

    // ✅ Address stored during registration
    address: {
      type: String,
      default: '',
    },

    // ✅ GeoJSON Location (for nearby donor search)
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [0, 0],
      },
    },

    hospitalName: { type: String },

    hospitalRegNumber: { type: String },

    lastDonationDate: { type: Date },

    profilePicture: { type: String },

    documents: [
      {
        url: String,
        publicId: String,
        uploadedAt: Date,
      },
    ],

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    approvedAt: { type: Date },

    refreshToken: { type: String, select: false },
  },
  { timestamps: true }
);

/* ================= INDEXES ================= */

userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ bloodGroup: 1 });
userSchema.index({ location: '2dsphere' }); // ✅ Geo index

/* ================= MIDDLEWARE ================= */

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

/* ================= METHODS ================= */

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.refreshToken;
  return obj;
};

module.exports = mongoose.model('User', userSchema);