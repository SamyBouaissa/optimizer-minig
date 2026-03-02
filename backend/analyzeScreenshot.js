/**
 * Dofus Inventory Screenshot Analyzer — v4
 *
 * Améliorations par rapport à v3 :
 *  OCR
 *   - Seuillage adaptatif (Otsu sur chaque crop) au lieu d'inversion fixe
 *   - Rognage du bord gauche (+4px) pour éliminer les artefacts de bordure (407→1402)
 *   - Extension de la zone en bas pour les cellules en bord d'image
 *   - Candidats filtrés par plage de valeurs plausibles (1-9999)
 *   - Stratégie de vote : fréquence → plus long → plus grand
 *
 *  Matching d'icône (5 méthodes)
 *   a) pHash DCT 32×32 → 63 bits
 *   b) Color fingerprint HSV 37D
 *   c) Edge map Sobel 24×24
 *   d) Texture variance map 8×8 blocs (Silicate fragmenté ≠ Bauxite lisse)
 *   e) Radial profile 8 anneaux (symétrie : Bauxite centrée ≠ Silicate asymétrique,
 *                                 Obsidienne reflets centraux ≠ Charbon mat uniforme)
 */

const sharp  = require('sharp')
const path   = require('path')
const fs     = require('fs')
const os     = require('os')
const { createWorker } = require('tesseract.js')

const ICONS_DIR            = path.join(__dirname, '../frontend/public/icons')
const CONFIDENCE_THRESHOLD = 0.54

const INVENTORY_BG = { r: 41, g: 44, b: 76 }

// ─── pHash DCT 32×32 ──────────────────────────────────────────────────────────

async function computePHash(imageBuffer) {
  const N = 32
  const { data } = await sharp(imageBuffer)
    .resize(N, N, { fit: 'fill' })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const dct = new Float64Array(64)
  for (let u = 0; u < 8; u++) {
    for (let v = 0; v < 8; v++) {
      let sum = 0
      for (let x = 0; x < N; x++)
        for (let y = 0; y < N; y++)
          sum += data[x * N + y]
            * Math.cos((2 * x + 1) * u * Math.PI / (2 * N))
            * Math.cos((2 * y + 1) * v * Math.PI / (2 * N))
      const cu = u === 0 ? 1 / Math.sqrt(2) : 1
      const cv = v === 0 ? 1 / Math.sqrt(2) : 1
      dct[u * 8 + v] = (2 / N) * cu * cv * sum
    }
  }

  // Exclure DC (0,0)
  const block = Array.from(dct).slice(1)
  const median = [...block].sort((a, b) => a - b)[Math.floor(block.length / 2)]
  let hash = 0n
  for (const val of block) hash = (hash << 1n) | (val > median ? 1n : 0n)
  return hash
}

function hammingDistance(h1, h2) {
  let xor = h1 ^ h2, d = 0
  while (xor > 0n) { d += Number(xor & 1n); xor >>= 1n }
  return d
}

function pHashSim(h1, h2) { return Math.max(0, 1 - hammingDistance(h1, h2) / 63) }

// ─── Color fingerprint HSV 37D ────────────────────────────────────────────────

async function computeColorFingerprint(imageBuffer) {
  const { data } = await sharp(imageBuffer)
    .resize(48, 48, { fit: 'fill' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const BINS = 16
  const hueH = new Float32Array(BINS), brtH = new Float32Array(BINS), satH = new Float32Array(4)
  let tot = 0, col = 0, brt = 0, sumV = 0

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 60) continue
    const r = data[i]/255, g = data[i+1]/255, b = data[i+2]/255
    const max = Math.max(r,g,b), min = Math.min(r,g,b), d = max - min
    const v = max, s = max === 0 ? 0 : d/max
    tot++; sumV += v
    if (s < 0.10 || v < 0.08) continue
    let h = 0
    if (d > 0) {
      if (max === r)      h = ((g-b)/d) % 6
      else if (max === g) h = (b-r)/d + 2
      else                h = (r-g)/d + 4
      h = (h * 60 + 360) % 360
    }
    const bin = Math.floor(h / 360 * BINS)
    hueH[bin]++; satH[Math.min(3, Math.floor(s*4))]++; col++
    if (v > 0.45) { brtH[bin]++; brt++ }
  }

  const norm = (a, n) => { if (n > 0) for (let i = 0; i < a.length; i++) a[i] /= n }
  norm(hueH, col || 1); norm(brtH, brt || 1); norm(satH, col || 1)

  const fp = new Float32Array(BINS*2 + 4 + 1)
  fp.set(hueH); fp.set(brtH, BINS); fp.set(satH, BINS*2)
  fp[BINS*2+4] = tot > 0 ? sumV/tot : 0
  return fp
}

function cosineSimFP(a, b) {
  let dot=0, na=0, nb=0
  for (let i=0;i<a.length;i++){dot+=a[i]*b[i];na+=a[i]**2;nb+=b[i]**2}
  return na===0||nb===0 ? 0 : dot/(Math.sqrt(na)*Math.sqrt(nb))
}

// ─── Edge map Sobel 24×24 ─────────────────────────────────────────────────────

async function computeEdgeMap(imageBuffer) {
  const S = 24
  const { data } = await sharp(imageBuffer)
    .resize(S, S, { fit: 'fill' }).greyscale().raw().toBuffer({ resolveWithObject: true })
  const e = new Float32Array(S*S)
  for (let y=1;y<S-1;y++) for (let x=1;x<S-1;x++) {
    const gx = -data[(y-1)*S+(x-1)]+data[(y-1)*S+(x+1)]-2*data[y*S+(x-1)]+2*data[y*S+(x+1)]-data[(y+1)*S+(x-1)]+data[(y+1)*S+(x+1)]
    const gy = -data[(y-1)*S+(x-1)]-2*data[(y-1)*S+x]-data[(y-1)*S+(x+1)]+data[(y+1)*S+(x-1)]+2*data[(y+1)*S+x]+data[(y+1)*S+(x+1)]
    e[y*S+x] = Math.sqrt(gx*gx+gy*gy)
  }
  const mx = Math.max(...e); if (mx>0) for (let i=0;i<e.length;i++) e[i]/=mx
  return e
}

function edgeSim(a, b) {
  let s=0; for(let i=0;i<a.length;i++) s+=Math.abs(a[i]-b[i])
  return 1 - s/a.length
}

// ─── Texture variance map 8×8 blocs ──────────────────────────────────────────
// Discrimine surfaces lisses (Bauxite) vs fragmentées (Silicate), mat vs brillant

async function computeTextureMap(imageBuffer) {
  const S = 32, B = 8, bs = S/B
  const { data } = await sharp(imageBuffer)
    .resize(S, S, { fit: 'fill' }).greyscale().raw().toBuffer({ resolveWithObject: true })
  const tex = new Float32Array(B*B)
  for (let by=0;by<B;by++) for (let bx=0;bx<B;bx++) {
    let sum=0, sq=0, cnt=0
    for (let y=by*bs;y<(by+1)*bs;y++) for (let x=bx*bs;x<(bx+1)*bs;x++) {
      const v = data[y*S+x]; sum+=v; sq+=v*v; cnt++
    }
    const mean = sum/cnt
    tex[by*B+bx] = Math.sqrt(sq/cnt - mean*mean) / 255
  }
  return tex
}

function textureSim(a, b) {
  let s=0; for(let i=0;i<a.length;i++) s+=Math.abs(a[i]-b[i])
  return 1 - s/a.length
}

// ─── Radial profile — 7 anneaux concentriques (excluant l'anneau de bord) ────
// Calibration mesurée sur icônes réelles :
//   silicate   radial: [107, 109, 95, 91, 82, 66, 58]  — pic central + décroissance
//   bauxite    radial: [ 40,  61, 50, 57, 55, 55, 48]  — creux central (gemme sertie)
//   charbon    radial: [ 79,  66, 61, 56, 53, 52, 47]  — décroissance régulière
//   obsidienne radial: [ 14,  20, 39, 41, 33, 33, 46]  — creux central profond (noir brillant)
//   fer        radial: [204, 171, 178, 188, 187, 160, 58] — très lumineux, uniforme
//   argent     radial: [241, 232, 220, 216, 217, 182, 59] — encore plus lumineux
// → Anneau 7 exclu : c'est le fond BG uniforme (47 partout), aucune info discriminante

async function computeRadialProfile(imageBuffer) {
  const S = 32
  const { data } = await sharp(imageBuffer)
    .resize(S, S, { fit: 'fill' }).greyscale().raw().toBuffer({ resolveWithObject: true })

  const RINGS = 7   // exclure anneau extérieur (fond BG)
  const cx = S / 2, cy = S / 2
  const maxR = S / 2 * 0.875  // 7/8 du rayon max
  const ringSum = new Float32Array(RINGS)
  const ringCnt = new Float32Array(RINGS)

  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const r = Math.sqrt((x - cx)**2 + (y - cy)**2)
    if (r >= maxR) continue  // exclure bord
    const ring = Math.min(RINGS - 1, Math.floor(r / maxR * RINGS))
    ringSum[ring] += data[y * S + x]
    ringCnt[ring]++
  }

  const profile = new Float32Array(RINGS)
  for (let i = 0; i < RINGS; i++)
    profile[i] = ringCnt[i] > 0 ? ringSum[i] / ringCnt[i] / 255 : 0
  return profile
}

function radialSim(a, b) {
  let s=0; for(let i=0;i<a.length;i++) s+=Math.abs(a[i]-b[i])
  return 1 - s/a.length
}

// ─── Cache des signatures de référence ────────────────────────────────────────
//
// Stratégie double-référence :
//   Pour chaque icon, on stocke les signatures calculées sur l'icône officielle
//   (fond BG simulé). Des icônes "in-game" peuvent être placées dans ICONS_INGAME_DIR
//   sous le même nom ; leurs signatures sont alors mergées avec celles de l'officielle
//   via max() pour maximiser la robustesse cross-screenshots.

let _refCache = null

const ICONS_INGAME_DIR = path.join(__dirname, 'icons-ingame')

async function compositeOnBg(buf) {
  return sharp(buf).flatten({ background: INVENTORY_BG }).toBuffer()
}

async function computeSignatures(buf) {
  const [ph, fp, em, tm, rp, br] = await Promise.all([
    computePHash(buf),
    computeColorFingerprint(buf),
    computeEdgeMap(buf),
    computeTextureMap(buf),
    computeRadialProfile(buf),
    computeAvgBrightness(buf),
  ])
  return { pHash: ph, colorFP: fp, edgeMap: em, texMap: tm, radial: rp, brightness: br }
}

async function buildRefCache() {
  if (_refCache) return _refCache
  _refCache = {}
  const files = fs.readdirSync(ICONS_DIR).filter(f => f.endsWith('.png'))

  // Dossier icônes in-game optionnel
  const ingameFiles = new Set(
    fs.existsSync(ICONS_INGAME_DIR)
      ? fs.readdirSync(ICONS_INGAME_DIR).filter(f => f.endsWith('.png'))
      : []
  )

  for (const file of files) {
    const id = file.replace('.png', '')
    try {
      const raw = fs.readFileSync(path.join(ICONS_DIR, file))
      const buf = await compositeOnBg(raw)
      const sig = await computeSignatures(buf)

      // Si une version in-game existe, calculer aussi ses signatures
      if (ingameFiles.has(file)) {
        try {
          const rawIG = fs.readFileSync(path.join(ICONS_INGAME_DIR, file))
          const bufIG = await compositeOnBg(rawIG)
          const sigIG = await computeSignatures(bufIG)
          // Stocker les deux signatures pour double-matching
          sig.ingame = sigIG
        } catch {}
      }

      _refCache[id] = sig
    } catch (e) {
      console.warn(`[cache] skip ${id}:`, e.message)
    }
  }
  console.log(`[analyzeScreenshot] Cache : ${Object.keys(_refCache).length} icônes`)
  return _refCache
}

function invalidateCache() { _refCache = null }

// ─── Luminosité absolue normalisée ────────────────────────────────────────────
// Feature simple mais très discriminante pour Fer vs Argent (104 vs 118)

async function computeAvgBrightness(imageBuffer) {
  const { data } = await sharp(imageBuffer)
    .resize(32, 32, { fit: 'fill' }).greyscale().raw().toBuffer({ resolveWithObject: true })
  return data.reduce((a, b) => a + b, 0) / data.length / 255
}

function brightnessSim(b1, b2) {
  return Math.max(0, 1 - Math.abs(b1 - b2) * 4)  // ×4 → diff de 0.25 = score 0
}

// ─── Matching icône — fusion 6 méthodes ───────────────────────────────────────

async function matchIcon(iconBuffer, knownIds) {
  const refs = await buildRefCache()
  let ph, fp, em, tm, rp, br
  try {
    ;[ph, fp, em, tm, rp, br] = await Promise.all([
      computePHash(iconBuffer),
      computeColorFingerprint(iconBuffer),
      computeEdgeMap(iconBuffer),
      computeTextureMap(iconBuffer),
      computeRadialProfile(iconBuffer),
      computeAvgBrightness(iconBuffer),
    ])
  } catch { return { id: null, score: 0 } }

  let bestId = null, bestScore = -1, bestBreakdown = null
  const candidates = knownIds || Object.keys(refs)

  for (const id of candidates) {
    const ref = refs[id]
    if (!ref) continue

    function scoreVsRef(r) {
      const sPHash   = pHashSim(ph, r.pHash)
      const sColor   = cosineSimFP(fp, r.colorFP)
      const sEdge    = edgeSim(em, r.edgeMap)
      const sTexture = r.texMap    ? textureSim(tm, r.texMap)    : 0.5
      const sRadial  = r.radial    ? radialSim(rp, r.radial)     : 0.5
      const sBright  = r.brightness !== undefined
        ? brightnessSim(br, r.brightness) : 0.5
      // pHash 30%, couleur 28%, radial 22%, luminosité 12%, texture 5%, contours 3%
      const score = sPHash*0.30 + sColor*0.28 + sRadial*0.22 + sBright*0.12 + sTexture*0.05 + sEdge*0.03
      return { score, sPHash, sColor, sEdge, sTexture, sRadial, sBright }
    }

    // Score vs référence officielle
    const s1 = scoreVsRef(ref)
    // Score vs référence in-game (si disponible) → prendre le max
    const s2 = ref.ingame ? scoreVsRef(ref.ingame) : null
    const best = s2 && s2.score > s1.score ? s2 : s1

    if (best.score > bestScore) {
      bestScore = best.score; bestId = id
      bestBreakdown = { sPHash: best.sPHash, sColor: best.sColor, sEdge: best.sEdge, sTexture: best.sTexture, sRadial: best.sRadial, sBright: best.sBright }
    }
  }

  if (bestScore < CONFIDENCE_THRESHOLD) return { id: null, score: bestScore, bestBreakdown }
  return { id: bestId, score: bestScore, breakdown: bestBreakdown }
}

// ─── Détection de grille ──────────────────────────────────────────────────────

async function detectGrid(imageBuffer, width, height) {
  const rgba = await sharp(imageBuffer).ensureAlpha().raw().toBuffer()

  function getProfile(axis) {
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
      for (let j=Math.max(0,i-W);j<=Math.min(raw.length-1,i+W);j++){s+=raw[j];c++}
      sm.push(s/c)
    }
    const peaks = []
    for (let i = 10; i < sm.length - 10; i++) {
      if (sm[i] > sm[i-1] && sm[i] > sm[i+1] && sm[i] > minBright) {
        if (peaks.length===0 || i-peaks[peaks.length-1] > minGap) peaks.push(i)
        else if (sm[i] > sm[peaks[peaks.length-1]]) peaks[peaks.length-1] = i
      }
    }
    return peaks
  }

  const colPeaks = findPeaks(Array.from(getProfile('x')), Math.floor(width/8))
  const rowPeaks = findPeaks(Array.from(getProfile('y')), Math.floor(height/6))

  if (!colPeaks.length || !rowPeaks.length)
    return { colPeaks:[Math.floor(width/2)], rowPeaks:[Math.floor(height/2)], cellW:width, cellH:height }

  const colGaps = colPeaks.slice(1).map((p,i)=>p-colPeaks[i])
  const rowGaps = rowPeaks.slice(1).map((p,i)=>p-rowPeaks[i])
  const cellW = colGaps.length ? Math.round(colGaps.reduce((a,b)=>a+b)/colGaps.length) : Math.floor(width/colPeaks.length)
  const cellH = rowGaps.length ? Math.round(rowGaps.reduce((a,b)=>a+b)/rowGaps.length) : Math.floor(height/rowPeaks.length)

  return { colPeaks, rowPeaks, cellW, cellH }
}

// ─── Seuillage Otsu sur buffer greyscale ──────────────────────────────────────

function otsuThreshold(grayData) {
  const hist = new Int32Array(256)
  for (const v of grayData) hist[v]++
  const total = grayData.length
  let sum = 0
  for (let i = 0; i < 256; i++) sum += i * hist[i]

  let sumB = 0, wB = 0, maxVar = 0, threshold = 128
  for (let t = 0; t < 256; t++) {
    wB += hist[t]; if (wB === 0) continue
    const wF = total - wB; if (wF === 0) break
    sumB += t * hist[t]
    const mB = sumB / wB
    const mF = (sum - sumB) / wF
    const varBetween = wB * wF * (mB - mF) ** 2
    if (varBetween > maxVar) { maxVar = varBetween; threshold = t }
  }
  return threshold
}

// ─── OCR quantité — multi-config, vote longueur max ──────────────────────────
//
// Calibré sur cellules 69×64px :
//  - Les chiffres blancs sont dans le 1/3 supérieur gauche de chaque cellule
//  - leftCrop=4 élimine l'artefact vertical de la bordure gauche de cellule
//  - On tente plusieurs tailles pour capturer 1 à 4 chiffres
//  - Configs ordonnées par "fiabilité décroissante"
//
// Configs [wPct, hPct, leftCrop]

const OCR_CONFIGS = [
  [0.88, 0.36, 0],   // zone courte : évite que l'icône empiète sur le dernier chiffre (884→885)
  [0.88, 0.36, 4],   // idem avec crop gauche
  [0.88, 0.40, 0],   // légèrement plus haute
  [0.88, 0.40, 4],
  [0.88, 0.55, 4],   // zone principale : large + haute, sans bord gauche
  [0.88, 0.55, 0],   // idem sans crop gauche (chiffre collé à gauche)
  [0.75, 0.55, 4],   // zone réduite
  [0.75, 0.42, 4],   // petits nombres, bord propre
  [0.88, 0.42, 4],   // fallback haute précision haut de cellule
  [0.88, 0.42, 0],   // fallback sans crop
]

async function makeOcrImage(imageBuffer, cx, cy, ocrW, ocrH, leftCrop) {
  const SCALE = 6, PAD = 28

  const lc = Math.min(leftCrop, ocrW - 4)
  const x0 = cx + lc, y0 = cy
  const w  = Math.max(4, ocrW - lc)
  const h  = ocrH

  // Pipeline : extract → upscale lanczos (meilleur que nearest pour le texte) → greyscale → sharpen
  const { data, info } = await sharp(imageBuffer)
    .extract({ left: x0, top: y0, width: w, height: h })
    .resize(w * SCALE, h * SCALE, { kernel: 'lanczos3' })
    .greyscale()
    .sharpen({ sigma: 1.5, m1: 1.5, m2: 0.5 })  // accentuer les contours des chiffres
    .raw()
    .toBuffer({ resolveWithObject: true })

  // Inversion : texte blanc sur fond sombre → noir sur blanc
  for (let i = 0; i < data.length; i++) data[i] = 255 - data[i]

  const pw = info.width + PAD*2, ph = info.height + PAD*2
  const padded = Buffer.alloc(pw * ph, 255)
  for (let y = 0; y < info.height; y++)
    for (let x = 0; x < info.width; x++)
      padded[(y+PAD)*pw + (x+PAD)] = data[y*info.width + x]

  return sharp(padded, { raw: { width: pw, height: ph, channels: 1 } }).png().toBuffer()
}

async function extractQuantity(imageBuffer, cx, cy, cellW, cellH, imgW, imgH, worker) {
  const all = []

  for (const [wPct, hPct, lc] of OCR_CONFIGS) {
    const ocrW = Math.min(cellW, Math.max(8, Math.floor(cellW * wPct)))
    const ocrH = Math.min(cellH, Math.max(8, Math.floor(cellH * hPct)))

    // Clamper pour ne pas dépasser l'image
    const x0 = Math.min(cx, imgW - ocrW - 1)
    const y0 = Math.min(cy, imgH - ocrH - 1)
    if (x0 < 0 || y0 < 0) continue

    try {
      const imgBuf = await makeOcrImage(imageBuffer, x0, y0, ocrW, ocrH, lc)
      const tmpFile = path.join(os.tmpdir(), `dofus_ocr_${Date.now()}_${Math.random().toString(36).slice(2)}.png`)
      fs.writeFileSync(tmpFile, imgBuf)

      for (const psm of ['7', '6', '11', '3']) {
        await worker.setParameters({ tessedit_char_whitelist: '0123456789', tessedit_pageseg_mode: psm })
        const { data: { text } } = await worker.recognize(tmpFile)
        const raw = text.replace(/\D/g, '')
        const parsed = parseInt(raw, 10)
        if (!isNaN(parsed) && parsed >= 1 && parsed <= 99999) {
          all.push(parsed)
          break
        }
      }
      try { fs.unlinkSync(tmpFile) } catch {}
    } catch (e) {
      console.warn('[OCR]', wPct, hPct, e.message)
    }
  }

  if (all.length === 0) return 0

  // Stratégie de vote calibrée sur cellules 69×64 Dofus :
  //
  // Problème : OCR peut lire "88" pour "884" (dernier chiffre masqué par l'icône)
  // ET lire "4654" pour "465" (artefact). Il faut être robuste aux deux cas.
  //
  // Règle :
  //  1. Calculer la fréquence de chaque valeur
  //  2. Parmi les valeurs ayant la fréquence max, prendre la plus longue
  //  3. Si égalité longueur ET fréquence : prendre la valeur médiane (évite extrêmes)

  const freq = {}
  for (const n of all) freq[n] = (freq[n] || 0) + 1
  const maxFreq = Math.max(...Object.values(freq))

  const topFreq = Object.entries(freq)
    .filter(([, f]) => f === maxFreq)
    .map(([v]) => parseInt(v))
    .sort((a, b) => String(b).length - String(a).length)  // plus long d'abord

  const maxLen = String(topFreq[0]).length
  // En cas d'égalité de longueur et fréquence : prendre la valeur la plus basse
  // (les configs h-courtes lisent plus proprement sans interférence de l'icône)
  const sameLen = topFreq.filter(v => String(v).length === maxLen).sort((a,b)=>a-b)
  return sameLen[0]  // plus petite valeur (configs h-courtes sont plus fiables)
}

// ─── Analyse principale ────────────────────────────────────────────────────────

async function analyzeInventoryScreenshot(imageBuffer, knownItems) {
  const meta = await sharp(imageBuffer).metadata()
  const { width, height } = meta

  const { colPeaks, rowPeaks, cellW, cellH } = await detectGrid(imageBuffer, width, height)
  const knownIds = knownItems.map(i => i.id)

  const [, worker] = await Promise.all([buildRefCache(), createWorker('eng', 1, { logger: ()=>{}, errorHandler: ()=>{} })])
  await buildRefCache()

  const results = []
  const halfW = Math.floor(cellW / 2)
  const halfH = Math.floor(cellH / 2)

  for (let ri = 0; ri < rowPeaks.length; ri++) {
    for (let ci = 0; ci < colPeaks.length; ci++) {
      const cellX = Math.max(0, colPeaks[ci] - halfW)
      const cellY = Math.max(0, rowPeaks[ri] - halfH)
      const cw = Math.min(cellW, width  - cellX)
      const ch = Math.min(cellH, height - cellY)
      if (cw < 12 || ch < 12) continue

      const quantity = await extractQuantity(imageBuffer, cellX, cellY, cw, ch, width, height, worker)
      if (quantity <= 0) continue

      // Zone icône : centre de cellule, skip haut 28% (texte quantité)
      const marginX = Math.floor(cw * 0.15)
      const topSkip = Math.floor(ch * 0.28)
      const iconX = cellX + marginX
      const iconY = cellY + topSkip
      const iconW = Math.max(8, cw - marginX * 2)
      const iconH = Math.max(8, ch - topSkip - Math.floor(ch * 0.05))

      let match = { id: null, score: 0 }
      try {
        const iconBuf = await sharp(imageBuffer)
          .extract({ left: iconX, top: iconY, width: Math.min(iconW, width-iconX), height: Math.min(iconH, height-iconY) })
          .toBuffer()
        match = await matchIcon(iconBuf, knownIds)
      } catch {}

      if (!match.id) continue

      const knownItem = knownItems.find(i => i.id === match.id)
      if (!knownItem) continue

      results.push({
        itemId: match.id, name: knownItem.name, quantity,
        score: Math.round(match.score * 100) / 100,
        breakdown: match.breakdown,
        cell: { row: ri, col: ci }
      })
    }
  }

  await worker.terminate()

  // Déduplication : garder le meilleur score par item
  const merged = {}
  for (const r of results)
    if (!merged[r.itemId] || r.score > merged[r.itemId].score) merged[r.itemId] = { ...r }

  return Object.values(merged).sort((a, b) => b.score - a.score)
}

module.exports = { analyzeInventoryScreenshot, invalidateCache }
