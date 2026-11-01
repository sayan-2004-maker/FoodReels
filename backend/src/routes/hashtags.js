const express = require('express');
const Hashtag = require('../models/Hashtag');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const router = express.Router();
router.get('/', async (req, res) => { try { const filter = req.query.q ? { name: new RegExp(String(req.query.q).replace(/[^a-z0-9_]/gi, ''), 'i') } : {}; res.json({ hashtags: await Hashtag.find(filter).sort({ usageCount: -1, name: 1 }).limit(40).lean() }); } catch (error) { res.status(500).json({ message: error.message }); } });
router.delete('/:id', auth, admin, async (req, res) => { try { const result = await Hashtag.deleteOne({ _id: req.params.id }); if (!result.deletedCount) return res.status(404).json({ message: 'Hashtag not found' }); res.json({ message: 'Hashtag deleted' }); } catch (error) { res.status(400).json({ message: error.message }); } });
module.exports = router;
