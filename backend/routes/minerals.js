const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '../data/minerals.json');

// Get all minerals
router.get('/', (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la lecture des minerais' });
  }
});

// Get a specific mineral by ID
router.get('/:id', (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    const mineral = data.find(m => m.id === req.params.id);
    if (!mineral) {
      return res.status(404).json({ error: 'Minerai non trouvé' });
    }
    res.json(mineral);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la lecture du minerai' });
  }
});

module.exports = router;
