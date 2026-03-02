/**
 * Debug OCR : teste chaque config sur une cellule spécifique
 * Usage: node backend/debug-ocr.js <image> <row> <col>
 */
const sharp = require('sharp')
const path  = require('path')
const fs    = require('fs')
const os    = require('os')
const { createWorker } = require('tesseract.js')

const imgPath = process.argv[2]
const targetRow = parseInt(process.argv[3] ?? '0')
const targetCol = parseInt(process.argv[4] ?? '0')

if (!imgPath) { console.error('Usage: node debug-ocr.js <image> <row> <col>'); process.exit(1) }

const OCR_CONFIGS = [
  [0.60, 0.55, 4, 0],
  [0.75, 0.55, 4, 0],
  [0.88, 0.55, 4, 0],
  [0.60, 0.42, 4, 0],
  [0.60, 0.55, 0, 0],
  [0.88, 0.42, 0, 0],
]

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
  const meta = await sharp(imgBuf).metadata()
  const { width, height } = meta
  const rgba = await sharp(imgBuf).ensureAlpha().raw().toBuffer()

  const colPeaks = findPeaks(Array.from(await getProfile(rgba, width, height, 'x')), Math.floor(width/8))
  const rowPeaks = findPeaks(Array.from(await getProfile(rgba, width, height, 'y')), Math.floor(height/6))
  const colGaps = colPeaks.slice(1).map((p,i)=>p-colPeaks[i])
  const rowGaps = rowPeaks.slice(1).map((p,i)=>p-rowPeaks[i])
  const cellW = colGaps.length ? Math.round(colGaps.reduce((a,b)=>a+b)/colGaps.length) : width
  const cellH = rowGaps.length ? Math.round(rowGaps.reduce((a,b)=>a+b)/rowGaps.length) : height
  const halfW = Math.floor(cellW/2), halfH = Math.floor(cellH/2)

  const ri = targetRow, ci = targetCol
  if (ri >= rowPeaks.length || ci >= colPeaks.length) {
    console.error(`Cellule r${ri}c${ci} hors limites (${rowPeaks.length}×${colPeaks.length})`)
    process.exit(1)
  }

  const cellX = Math.max(0, colPeaks[ci] - halfW)
  const cellY = Math.max(0, rowPeaks[ri] - halfH)
  const cw = Math.min(cellW, width - cellX)
  const ch = Math.min(cellH, height - cellY)
  console.log(`Cellule r${ri}c${ci}: (${cellX},${cellY}) ${cw}×${ch}\n`)

  const worker = await createWorker('eng', 1, { logger: ()=>{} })
  const SCALE = 5, PAD = 24
  const OUT = path.join(__dirname, 'debug-cells')

  for (const [wPct, hPct, lc, tc] of OCR_CONFIGS) {
    const ocrW = Math.min(cw, Math.max(8, Math.floor(cw * wPct)))
    const ocrH = Math.min(ch, Math.max(8, Math.floor(ch * hPct)))
    const x0 = Math.min(cellX + lc, width - ocrW - 1)
    const y0 = Math.min(cellY + tc, height - ocrH - 1)
    const w  = Math.max(4, ocrW - lc)
    const h  = Math.max(4, ocrH - tc)

    try {
      const { data, info } = await sharp(imgBuf)
        .extract({ left: x0, top: y0, width: w, height: h })
        .resize(w*SCALE, h*SCALE, { kernel:'nearest' })
        .greyscale().raw().toBuffer({ resolveWithObject: true })
      for (let i = 0; i < data.length; i++) data[i] = 255 - data[i]
      const pw = info.width+PAD*2, ph = info.height+PAD*2
      const padded = Buffer.alloc(pw*ph, 255)
      for (let y=0;y<info.height;y++) for (let x=0;x<info.width;x++)
        padded[(y+PAD)*pw+(x+PAD)] = data[y*info.width+x]
      const imgOut = await sharp(padded, {raw:{width:pw,height:ph,channels:1}}).png().toBuffer()
      const fname = `ocr_dbg_r${ri}c${ci}_w${Math.round(wPct*100)}_h${Math.round(hPct*100)}_lc${lc}.png`
      fs.writeFileSync(path.join(OUT, fname), imgOut)

      const tmp = path.join(os.tmpdir(), `ocr_${Date.now()}.png`)
      fs.writeFileSync(tmp, imgOut)
      const results = []
      for (const psm of ['7','6']) {
        await worker.setParameters({ tessedit_char_whitelist:'0123456789', tessedit_pageseg_mode:psm })
        const { data: { text } } = await worker.recognize(tmp)
        const n = parseInt(text.replace(/\D/g,''), 10)
        results.push(`psm${psm}→${isNaN(n)?'?':n}`)
      }
      try { fs.unlinkSync(tmp) } catch {}
      console.log(`  [w=${wPct} h=${hPct} lc=${lc}]  ${results.join('  ')}`)
    } catch(e) { console.log(`  [w=${wPct} h=${hPct}] ERR: ${e.message}`) }
  }

  await worker.terminate()
}
main().catch(console.error)
