/**
 * Downloads item icons from api.dofusdb.fr and saves them to frontend/public/icons/
 * Run: node download-icons.js
 */

const https = require('https')
const fs    = require('fs')
const path  = require('path')

const ICONS_DIR = path.join(__dirname, 'frontend', 'public', 'icons')
if (!fs.existsSync(ICONS_DIR)) fs.mkdirSync(ICONS_DIR, { recursive: true })

// Items with known iconId from api.dofusdb.fr
const ITEMS = [
  // Minerais
  { id: 'fer',          iconId: 39024 },
  { id: 'cuivre',       iconId: 39108 },
  { id: 'bronze',       iconId: 39109 },
  { id: 'kobalte',      iconId: 39077 },
  { id: 'charbon',      iconId: 39075 },
  { id: 'manganese',    iconId: 39397 },
  { id: 'etain',        iconId: 39078 },
  { id: 'argent',       iconId: 39028 },
  { id: 'bauxite',      iconId: 39076 },
  { id: 'or',           iconId: 39022 },
  { id: 'obsidienne',   iconId: 39112 },
  { id: 'ecume-de-mer', iconId: 39399 },
  // Alliages
  { id: 'ferrite',      iconId: 40712 },
  { id: 'aluminite',    iconId: 40660 },
  { id: 'ebonite',      iconId: 40658 },
  { id: 'magnesite',    iconId: 40659 },
  { id: 'bakelelite',   iconId: 40487 },
  { id: 'kouartz',      iconId: 40664 },
  { id: 'plaque',       iconId: 40709 },
]

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest)
    https.get(url, res => {
      if (res.statusCode !== 200) {
        file.close()
        fs.unlink(dest, () => {})
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`))
      }
      res.pipe(file)
      file.on('finish', () => { file.close(); resolve() })
    }).on('error', err => {
      file.close()
      fs.unlink(dest, () => {})
      reject(err)
    })
  })
}

async function main() {
  console.log(`Downloading ${ITEMS.length} icons to ${ICONS_DIR}`)
  let ok = 0, fail = 0

  for (const item of ITEMS) {
    const url  = `https://api.dofusdb.fr/img/items/${item.iconId}.png`
    const dest = path.join(ICONS_DIR, `${item.id}.png`)
    try {
      await download(url, dest)
      console.log(`  ✓ ${item.id} (iconId ${item.iconId})`)
      ok++
    } catch (e) {
      console.error(`  ✗ ${item.id}: ${e.message}`)
      fail++
    }
  }

  console.log(`\nDone: ${ok} downloaded, ${fail} failed`)
  if (fail > 0) {
    console.log('Failed items need manual icon placement in frontend/public/icons/')
  }
}

main()
