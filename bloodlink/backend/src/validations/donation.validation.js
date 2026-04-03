const Joi = require('joi');

const donationSchema = Joi.object({
  name:             Joi.string().trim().min(2).max(100).required(),
  age:              Joi.number().min(18).max(65).required(),
  gender:           Joi.string().valid('Male', 'Female', 'Other').required(),
  bloodGroup:       Joi.string().valid('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-').required(),
  weight:           Joi.number().min(45).required(),
  hemoglobin:       Joi.number().min(7).max(20).required(),
  lastDonationDate: Joi.date().max('now').optional().allow('', null),
  medicalHistory:   Joi.string().max(1000).optional().allow('', null),
  bloodType:        Joi.string().valid('RBC', 'Platelets', 'Plasma', 'Whole Blood').default('Whole Blood'),
  units:            Joi.number().min(1).max(5).default(1),
  // address — plain text, shown in UI
  address:          Joi.string().max(300).optional().allow('', null),
  // coordinates — silently geocoded on frontend, never typed by user
  locationLng:      Joi.number().min(-180).max(180).optional().allow('', null),
  locationLat:      Joi.number().min(-90).max(90).optional().allow('', null),
  notes:            Joi.string().max(500).optional().allow('', null),
});

const validate = (schema) => (req, res, next) => {
  // Work on a mutable copy so we can coerce types without touching req.body
  const body = { ...req.body };

  // FormData sends everything as strings — coerce numeric fields
  ['age', 'weight', 'hemoglobin', 'units'].forEach((key) => {
    if (body[key] !== undefined && body[key] !== '' && body[key] !== null) {
      const parsed = parseFloat(body[key]);
      if (!isNaN(parsed)) body[key] = parsed;
    }
  });

  // Coordinates are optional — remove them if blank so Joi doesn't reject
  ['locationLat', 'locationLng'].forEach((key) => {
    if (body[key] === '' || body[key] === 'undefined' || body[key] === null) {
      delete body[key];
    } else if (body[key] !== undefined) {
      const parsed = parseFloat(body[key]);
      body[key] = isNaN(parsed) ? undefined : parsed;
    }
  });

  const { error, value } = schema.validate(body, {
    abortEarly:    false,
    stripUnknown:  true,
  });

  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors:  error.details.map((d) => d.message),
    });
  }

  req.body = value;
  next();
};

module.exports = { donationSchema, validate };
