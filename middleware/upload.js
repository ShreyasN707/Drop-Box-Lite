const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate safe, unique filename using crypto hex + original extension
    const ext = path.extname(file.originalname);
    const uniqueHex = crypto.randomBytes(16).toString('hex');
    cb(null, `${Date.now()}-${uniqueHex}${ext}`);
  },
});

const maxMb = parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 25;
const upload = multer({
  storage,
  limits: {
    fileSize: maxMb * 1024 * 1024, // in bytes
  },
});

module.exports = {
  upload,
  uploadDir,
  maxFileSizeMb: maxMb,
};
