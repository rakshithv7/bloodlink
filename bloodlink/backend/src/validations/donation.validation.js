const Joi = require('joi');

const donationSchema = Joi.object({
  name:             Joi.string().trim().min(2).max(100).required(),
  age:              Joi.number().min(18).max(65).required(),
  gender:           Joi.string().valid('Male', 'Female', 'Other').required(),
  bloodGroup:       Joi.string().valid('A+','A-','B+','B-','AB+','AB-','O+','O-').required(),
  weight:           Joi.number().min(45).required(),
  hemoglobin:       Joi.number().min(7).max(20).required(),
  lastDonationDate: Joi.date().max('now').optional().allow('', null),
  medicalHistory:   Joi.string().max(1000).optional().allow('', null),
  bloodType:        Joi.string().valid('RBC','Platelets','Plasma','Whole Blood').default('Whole Blood'),
  units:            Joi.number().min(1).max(5).default(1),
  locationLng:      Joi.number().min(-180).max(180).required(),
  locationLat:      Joi.number().min(-90).max(90).required(),
  address:          Joi.string().max(300).optional().allow('', null),
  notes:            Joi.string().max(500).optional().allow('', null),
});

const validate = (schema) => (req, res, next) => {
  const body = { ...req.body };
  ['age', 'weight', 'hemoglobin', 'units', 'locationLng', 'locationLat'].forEach((key) => {
    if (body[key] !== undefined && body[key] !== '') {
      body[key] = parseFloat(body[key]);
    }
  });

  const { error, value } = schema.validate(body, { abortEarly: false, stripUnknown: true });
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: error.details.map((d) => d.message),
    });
  }
  req.validatedBody = value;
  req.body = value;
  next();
};

module.exports = { donationSchema, validate };