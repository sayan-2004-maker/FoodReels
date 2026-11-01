const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { v2: cloudinary } = require('cloudinary');

const uploadDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUD_NAME;
const cloudKey = process.env.CLOUDINARY_API_KEY || process.env.CLOUD_API_KEY;
const cloudSecret = process.env.CLOUDINARY_API_SECRET || process.env.CLOUD_API_SECRET;
const hasCloudinary = Boolean(cloudName && cloudKey && cloudSecret);
if (hasCloudinary) cloudinary.config({ cloud_name: cloudName, api_key: cloudKey, api_secret: cloudSecret, secure: true });

const localStorage = multer.diskStorage({
  destination: (req, file, done) => done(null, uploadDir),
  filename: (req, file, done) => done(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${path.extname(file.originalname).toLowerCase()}`)
});
const allowedTypes = {
  // Keep accepted formats browser-playable. Cloudinary can transcode MOV uploads
  // to MP4, while MKV is deliberately rejected because most mobile browsers cannot play it.
  video: new Set(['video/mp4', 'video/webm', 'video/quicktime']),
  image: new Set(['image/jpeg', 'image/png', 'image/webp'])
};
const filterFor = kind => (req, file, done) => {
  if (!allowedTypes[kind].has(file.mimetype)) return done(new Error(kind === 'video' ? 'Use an MP4, WebM, or MOV video file.' : 'Use a JPG, PNG, or WebP image file.'));
  done(null, true);
};
const options = kind => ({ storage: hasCloudinary ? multer.memoryStorage() : localStorage, fileFilter: filterFor(kind), limits: { fileSize: kind === 'video' ? 150 * 1024 * 1024 : 15 * 1024 * 1024 } });
const uploadVideo = multer(options('video'));
const uploadImage = multer(options('image'));
const uploadToCloudinary = (file, kind) => new Promise((resolve, reject) => {
  const options = { folder: `foodreels/${kind}s`, resource_type: kind, allowed_formats: kind === 'video' ? ['mp4', 'webm', 'mov'] : ['jpg', 'jpeg', 'png', 'webp'], overwrite: false };
  const stream = file.size > 95 * 1024 * 1024 ? cloudinary.uploader.upload_chunked_stream({ ...options, chunk_size: 20 * 1024 * 1024 }, (error, result) => error ? reject(error) : resolve(result)) : cloudinary.uploader.upload_stream(options, (error, result) => error ? reject(error) : resolve(result));
  stream.end(file.buffer);
});

const saveBufferLocally = (file, kind) => new Promise((resolve, reject) => {
  const extension = path.extname(file.originalname).toLowerCase() || (kind === 'video' ? '.mp4' : '.jpg');
  const filename = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${extension}`;
  fs.writeFile(path.join(uploadDir, filename), file.buffer, error => error ? reject(error) : resolve(filename));
});

module.exports = { uploadVideo, uploadImage, uploadDir, hasCloudinary, uploadToCloudinary, saveBufferLocally };
