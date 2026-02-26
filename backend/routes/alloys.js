const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '../data/alloys.json');

// Get all alloys
router.get('/', (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la lecture des alliages' });
  }
});

// Get a specific alloy by ID
router.get('/:id', (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    const alloy = data.find(a => a.id === req.params.id);
    if (!alloy) {
      return res.status(404).json({ error: 'Alliage non trouvé' });
    }
    res.json(alloy);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la lecture de l\'alliage' });
  }
});

module.exports = router;
