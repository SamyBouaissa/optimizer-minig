/**
 * Test complet du pipeline d'analyse de screenshot.
 * Usage (depuis backend/) : node test-screenshot.js <image-path>
 *
 * Ground truth connu (screenshot de référence 382×231) :
 *   Fer=2432, Cuivre=2255, Manganèse=2106, Bauxite=1882, Kobalte=1774,
 *   Argent=884, Or=465, Bronze=407, Silicate=101, Obsidienne=101,
 *   Cendrepierre=80, Dolomite=69, Charbon=31, Écume=998
 *   (1 item non référencé sans quantité — ignoré)
 */
const fs   = require('fs')
const path = require('path')
const { analyzeInventoryScreenshot, invalidateCache } = require('./analyzeScreenshot')

const MINERALS_FILE = path.join(__dirname, 'data/minerals.json')
const ALLOYS_FILE   = path.join(__dirname, 'data/alloys.json')

const imgPath = process.argv[2]
if (!imgPath || !fs.existsSync(imgPath)) {
  console.error('Usage: node test-screenshot.js <image-path>')
  process.exit(1)
}

// Invalider le cache pour prendre en compte les nouvelles icônes
invalidateCache()

const minerals = JSON.parse(fs.readFileSync(MINERALS_FILE, 'utf8'))
const alloys   = JSON.parse(fs.readFileSync(ALLOYS_FILE,   'utf8'))
// Ce screenshot est un screenshot de minerais → ne passer que les minerais
// (comme le fait le vrai endpoint avec target='minerals')
const items    = minerals

// Ground truth du screenshot de référence
const GROUND_TRUTH = {
  'fer': 2432, 'cuivre': 2255, 'manganese': 2106, 'bauxite': 1882,
  'kobalte': 1774, 'argent': 884, 'or': 465, 'bronze': 407,
  'silicate': 101, 'obsidienne': 101, 'cendrepierre': 80,
  'dolomite': 69, 'charbon': 31, 'ecume-de-mer': 998
}

const buf = fs.readFileSync(imgPath)

console.log(`Analyse : ${imgPath}`)
console.log(`Références : ${items.length} items`)
console.log('─'.repeat(75))

analyzeInventoryScreenshot(buf, items).then(results => {
  if (results.length === 0) {
    console.log('Aucun item détecté.')
    return
  }

  let correct = 0, total = 0
  results.forEach(r => {
    const pct     = (r.score * 100).toFixed(1)
    const bar     = '█'.repeat(Math.round(r.score * 20)).padEnd(20)
    const bd      = r.breakdown
      ? `  [pH=${(r.breakdown.sPHash*100).toFixed(0)}% clr=${(r.breakdown.sColor*100).toFixed(0)}% edg=${(r.breakdown.sEdge*100).toFixed(0)}%]`
      : ''
    const gt      = GROUND_TRUTH[r.itemId]
    const okQty   = gt ? (r.quantity === gt ? '✓' : `✗(exp:${gt})`) : '?'
    console.log(`[${bar}] ${pct}%  ${String(r.quantity).padStart(6)}× ${r.name} ${okQty}${bd}`)
    if (gt !== undefined) {
      total++
      if (r.quantity === gt) correct++
    }
  })
  console.log('─'.repeat(75))
  console.log(`Items détectés : ${results.length}  |  Quantités correctes : ${correct}/${total}`)
}).catch(console.error)
