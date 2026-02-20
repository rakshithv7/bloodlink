const multer = require('multer');
const path = require('path');

const ALLOWED_TYPES = /jpeg|jpg|png|pdf/;
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, '/tmp/uploads'),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  const extname = ALLOWED_TYPES.test(path.extname(file.originalname).toLowerCase());
  const mimetype = ALLOWED_TYPES.test(file.mimetype);
  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Only JPG, JPEG, PNG, and PDF files are allowed'));
  }
};

const upload = multer({ storage, fileFilter, limits: { fileSize: MAX_SIZE } });

module.exports = upload;
