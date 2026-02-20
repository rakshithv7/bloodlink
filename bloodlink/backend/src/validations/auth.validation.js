const Joi = require('joi');

const registerSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  role: Joi.string().valid('USER', 'PENDING_HOSPITAL_ADMIN').default('USER'),
  bloodGroup: Joi.string().valid('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'),
  phone: Joi.string().pattern(/^[0-9]{10,15}$/),
  gender: Joi.string().valid('Male', 'Female', 'Other'),
  dateOfBirth: Joi.date(),
  hospitalName: Joi.when('role', {
    is: 'PENDING_HOSPITAL_ADMIN',
    then: Joi.string().required(),
    otherwise: Joi.optional(),
  }),
  hospitalRegNumber: Joi.when('role', {
    is: 'PENDING_HOSPITAL_ADMIN',
    then: Joi.string().required(),
    otherwise: Joi.optional(),
  }),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: error.details.map((d) => d.message),
    });
  }
  next();
};

module.exports = { registerSchema, loginSchema, validate };
