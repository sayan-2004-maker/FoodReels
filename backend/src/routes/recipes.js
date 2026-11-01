const express = require('express');
const Recipe = require('../models/Recipe');
const auth = require('../middleware/auth');
const router = express.Router();
router.get('/:id', async (req, res) => { try { const recipe = await Recipe.findById(req.params.id).lean(); if (!recipe) return res.status(404).json({ message: 'Recipe not found' }); res.json({ recipe }); } catch (error) { res.status(400).json({ message: error.message }); } });
router.post('/:id/save', auth, async (req, res) => { try { const recipe = await Recipe.findById(req.params.id); if (!recipe) return res.status(404).json({ message: 'Recipe not found' }); const saved = recipe.savedBy.some(id => String(id) === String(req.user._id)); saved ? recipe.savedBy.pull(req.user._id) : recipe.savedBy.push(req.user._id); await recipe.save(); res.json({ saved: !saved, saves: recipe.savedBy.length }); } catch (error) { res.status(400).json({ message: error.message }); } });
module.exports = router;
