/**
 * Debug : découpe les cellules et les enregistre pour inspection visuelle
 * Usage: node backend/debug-cells.js <image>
 */
const sharp = require('sharp')
const path  = require('path')
const fs    = require('fs')

const ICONS_DIR = path.join(__dirname, '../frontend/public/icons')
const OUT_DIR   = path.join(__dirname, 'debug-cells')

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true })

const imgPath = process.argv[2]
if (!imgPath) { console.error('Usage: node debug-cells.js <image>'); process.exit(1) }

const BG = { r: 41, g: 44, b: 76 }

async function getProfile(rgba, width, height, axis) {
  const len = axis === 'x' ? width : height
  const profile = new Float32Array(len)
  if (axis === 'x') {
    for (let x = 0; x < width; x++) {
      let s = 0
      for (let y = 0; y < height; y++) { const i=(y*width+x)*4; s+=(rgba[i]+rgba[i+1]+rgba[i+2])/3 }
      profile[x] = s / height
    }
  } else {
    for (let y = 0; y < height; y++) {
      let s = 0
      for (let x = 0; x < width; x++) { const i=(y*width+x)*4; s+=(rgba[i]+rgba[i+1]+rgba[i+2])/3 }
      profile[y] = s / width
    }
  }
  return profile
}

function findPeaks(raw, minGap, minBright = 35) {
  const W = 5, sm = []
  for (let i = 0; i < raw.length; i++) {
    let s=0,c=0
    for(let j=Math.max(0,i-W);j<=Math.min(raw.length-1,i+W);j++){s+=raw[j];c++}
    sm.push(s/c)
  }
  const peaks = []
  for (let i = 10; i < sm.length - 10; i++) {
    if (sm[i] > sm[i-1] && sm[i] > sm[i+1] && sm[i] > minBright) {
      if (!peaks.length || i-peaks[peaks.length-1] > minGap) peaks.push(i)
      else if (sm[i] > sm[peaks[peaks.length-1]]) peaks[peaks.length-1] = i
    }
  }
  return peaks
}

async function main() {
  const imgBuf = fs.readFileSync(imgPath)
  const meta   = await sharp(imgBuf).metadata()
  const { width, height } = meta
  const rgba = await sharp(imgBuf).ensureAlpha().raw().toBuffer()

  const colProfile = await getProfile(rgba, width, height, 'x')
  const rowProfile = await getProfile(rgba, width, height, 'y')

  const colPeaks = findPeaks(Array.from(colProfile), Math.floor(width/8))
  const rowPeaks = findPeaks(Array.from(rowProfile), Math.floor(height/6))

  const colGaps = colPeaks.slice(1).map((p,i)=>p-colPeaks[i])
  const rowGaps = rowPeaks.slice(1).map((p,i)=>p-rowPeaks[i])
  const cellW = colGaps.length ? Math.round(colGaps.reduce((a,b)=>a+b)/colGaps.length) : width
  const cellH = rowGaps.length ? Math.round(rowGaps.reduce((a,b)=>a+b)/rowGaps.length) : height
  const halfW = Math.floor(cellW/2), halfH = Math.floor(cellH/2)

  console.log(`Image: ${width}×${height}`)
  console.log(`Cols (${colPeaks.length}): [${colPeaks.join(', ')}]  cellW=${cellW}`)
  console.log(`Rows (${rowPeaks.length}): [${rowPeaks.join(', ')}]  cellH=${cellH}`)
  console.log()

  let cell = 0
  for (let ri = 0; ri < rowPeaks.length; ri++) {
    for (let ci = 0; ci < colPeaks.length; ci++) {
      const cellX = Math.max(0, colPeaks[ci] - halfW)
      const cellY = Math.max(0, rowPeaks[ri] - halfH)
      const cw = Math.min(cellW, width  - cellX)
      const ch = Math.min(cellH, height - cellY)
      if (cw < 12 || ch < 12) continue

      // Sauvegarder la cellule entière
      const outPath = path.join(OUT_DIR, `cell_r${ri}_c${ci}.png`)
      await sharp(imgBuf)
        .extract({ left: cellX, top: cellY, width: cw, height: ch })
        .toFile(outPath)

      // Sauvegarder la zone OCR (coin haut-gauche, première config)
      const ocrW = Math.floor(cw * 0.72)
      const ocrH = Math.floor(ch * 0.40)
      const ocrX = cellX + 4
      const ocrY = cellY + 2
      if (ocrX + ocrW <= width && ocrY + ocrH <= height) {
        const ocrPath = path.join(OUT_DIR, `ocr_r${ri}_c${ci}.png`)
        await sharp(imgBuf)
          .extract({ left: ocrX, top: ocrY, width: ocrW, height: ocrH })
          .resize(ocrW*5, ocrH*5, { kernel: 'nearest' })
          .toFile(ocrPath)
      }

      console.log(`  r${ri}c${ci}: cellule (${cellX},${cellY}) ${cw}×${ch}  [y_end=${cellY+ch} vs img_h=${height}]`)
      cell++
    }
  }
  console.log(`\n${cell} cellules sauvegardées dans ${OUT_DIR}`)
}

main().catch(console.error)
