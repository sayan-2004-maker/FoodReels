const express = require('express');
const auth = require('../middleware/auth');
const { uploadVideo, uploadImage, hasCloudinary, uploadToCloudinary, saveBufferLocally } = require('../middleware/upload');
const router = express.Router();

const handleUpload = (kind, middleware) => (req, res) => middleware.single('file')(req, res, async error => {
  if (error) return res.status(400).json({ message: error.message });
  if (!req.file) return res.status(400).json({ message: `No ${kind} file received` });
  try {
    const cloudFile = hasCloudinary ? await uploadToCloudinary(req.file, kind) : null;
    const url = cloudFile?.secure_url || `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    res.status(201).json({ media: { url, publicId: cloudFile?.public_id || '', provider: hasCloudinary ? 'cloudinary' : 'local' }, size: req.file.size });
  } catch (uploadError) {
    // A media-storage outage must not discard the creator's upload during local development.
    try {
      const filename = await saveBufferLocally(req.file, kind);
      const url = `${req.protocol}://${req.get('host')}/uploads/${filename}`;
      console.warn(`Cloudinary ${kind} upload failed; using local fallback: ${uploadError.message}`);
      res.status(201).json({ media: { url, publicId: '', provider: 'local' }, size: req.file.size, fallback: true, notice: 'Cloud storage was unavailable, so this upload was safely stored locally.' });
    } catch (localError) { res.status(502).json({ message: 'Media upload failed', detail: uploadError.message, fallbackError: localError.message }); }
  }
});

router.post('/video', auth, handleUpload('video', uploadVideo));
router.post('/image', auth, handleUpload('image', uploadImage));
module.exports = router;
