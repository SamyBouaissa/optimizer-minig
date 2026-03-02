/**
 * Calibration test — compare les signatures des icônes problématiques
 * pour identifier les paires difficiles et valider les améliorations
 *
 * Usage : node backend/test-calibration.js
 */

const sharp = require('sharp')
const path  = require('path')
const fs    = require('fs')

const ICONS_DIR = path.join(__dirname, '../frontend/public/icons')
const BG = { r: 41, g: 44, b: 76 }

async function compositeOnBg(id) {
  const raw = fs.readFileSync(path.join(ICONS_DIR, id + '.png'))
  return sharp(raw).flatten({ background: BG }).toBuffer()
}

// ── pHash
async function pHash(buf) {
  const N = 32
  const { data } = await sharp(buf).resize(N,N,{fit:'fill'}).greyscale().raw().toBuffer({resolveWithObject:true})
  const dct = new Float64Array(64)
  for (let u=0;u<8;u++) for (let v=0;v<8;v++) {
    let s=0
    for (let x=0;x<N;x++) for (let y=0;y<N;y++)
      s+=data[x*N+y]*Math.cos((2*x+1)*u*Math.PI/(2*N))*Math.cos((2*y+1)*v*Math.PI/(2*N))
    const cu=u===0?1/Math.sqrt(2):1, cv=v===0?1/Math.sqrt(2):1
    dct[u*8+v]=(2/N)*cu*cv*s
  }
  const block=Array.from(dct).slice(1)
  const med=[...block].sort((a,b)=>a-b)[Math.floor(block.length/2)]
  let h=0n; for(const v of block) h=(h<<1n)|(v>med?1n:0n)
  return h
}
function hamming(h1,h2){let x=h1^h2,d=0;while(x>0n){d+=Number(x&1n);x>>=1n}return d}

// ── Radial profile
async function radial(buf) {
  const S=32, R=8
  const {data}=await sharp(buf).resize(S,S,{fit:'fill'}).greyscale().raw().toBuffer({resolveWithObject:true})
  const cx=S/2,cy=S/2,mr=S/2
  const rs=new Float32Array(R), rc=new Float32Array(R)
  for(let y=0;y<S;y++) for(let x=0;x<S;x++){
    const r=Math.sqrt((x-cx)**2+(y-cy)**2)
    const ring=Math.min(R-1,Math.floor(r/mr*R))
    rs[ring]+=data[y*S+x]; rc[ring]++
  }
  return Array.from(rs).map((s,i)=>rc[i]>0?Math.round(s/rc[i]):0)
}

// ── Texture variance
async function texture(buf) {
  const S=32,B=8,bs=S/B
  const {data}=await sharp(buf).resize(S,S,{fit:'fill'}).greyscale().raw().toBuffer({resolveWithObject:true})
  const vals=[]
  for(let by=0;by<B;by++) for(let bx=0;bx<B;bx++){
    let s=0,sq=0,cnt=0
    for(let y=by*bs;y<(by+1)*bs;y++) for(let x=bx*bs;x<(bx+1)*bs;x++){
      const v=data[y*S+x];s+=v;sq+=v*v;cnt++
    }
    const mean=s/cnt; vals.push(Math.round(Math.sqrt(sq/cnt-mean*mean)))
  }
  return vals
}

// ── Avg brightness
async function brightness(buf) {
  const {data}=await sharp(buf).resize(32,32,{fit:'fill'}).greyscale().raw().toBuffer({resolveWithObject:true})
  return Math.round(data.reduce((a,b)=>a+b,0)/data.length)
}

async function analyze(id) {
  const buf = await compositeOnBg(id)
  const [ph, rp, tx, br] = await Promise.all([pHash(buf), radial(buf), texture(buf), brightness(buf)])
  return { id, ph, rp, tx, br }
}

async function main() {
  const PAIRS = [
    ['silicate',   'bauxite'],
    ['charbon',    'obsidienne'],
    ['fer',        'argent'],
    ['bronze',     'manganese'],
    ['cendrepierre','etain'],
  ]

  console.log('\n=== CALIBRATION DES PAIRES DIFFICILES ===\n')

  for (const [a, b] of PAIRS) {
    try {
      const ra = await analyze(a)
      const rb = await analyze(b)

      const dist = hamming(ra.ph, rb.ph)
      console.log(`── ${a.toUpperCase()} vs ${b.toUpperCase()}`)
      console.log(`   pHash distance       : ${dist}/63  (${dist <= 10 ? '⚠ TRÈS SIMILAIRE' : dist <= 20 ? '⚠ similaire' : '✓ distinct'})`)
      console.log(`   Luminosité moy       : ${ra.br} vs ${rb.br}  (diff ${Math.abs(ra.br-rb.br)})`)
      console.log(`   Radial anneau 0 (ctr): ${ra.rp[0]} vs ${rb.rp[0]}  (diff ${Math.abs(ra.rp[0]-rb.rp[0])}) ← reflets centraux`)
      console.log(`   Radial anneau 7 (ext): ${ra.rp[7]} vs ${rb.rp[7]}  (diff ${Math.abs(ra.rp[7]-rb.rp[7])})`)
      const texDiff = ra.tx.reduce((s,v,i)=>s+Math.abs(v-rb.tx[i]),0)
      console.log(`   Texture variance diff: ${texDiff}  (${texDiff > 200 ? '✓ bien différencié' : '⚠ similaire'})`)
      console.log()
    } catch(e) {
      console.log(`  [skip] ${a} ou ${b} manquant:`, e.message)
    }
  }

  // Affiche les profils radiaux complets pour les cas rouges
  console.log('\n=== PROFILS RADIAUX (luminosité par anneau 0=centre → 7=bord) ===\n')
  for (const id of ['silicate', 'bauxite', 'charbon', 'obsidienne', 'fer', 'argent']) {
    try {
      const r = await analyze(id)
      console.log(`${id.padEnd(14)} br=${String(r.br).padEnd(4)} radial: [${r.rp.join(', ')}]`)
    } catch {}
  }
}

main().catch(console.error)
