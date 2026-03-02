import { useState, useRef } from 'react'
import { analyzeScreenshot } from '../services/api'

/**
 * Reusable drag-and-drop / click-to-upload component for inventory screenshots.
 *
 * Props:
 *  - target: 'minerals' | 'alloys' | 'all'
 *  - onResult: (results) => void  — called with detected items
 *  - compact: bool — smaller display
 */
export default function ScreenshotImport({ target = 'minerals', onResult, compact = false }) {
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [preview, setPreview]   = useState(null)
  const [results, setResults]   = useState(null)
  const [error, setError]       = useState(null)
  const inputRef = useRef()

  const processFile = async (file) => {
    if (!file || !file.type.startsWith('image/')) {
      setError('Fichier invalide — seulement les images sont acceptées.')
      return
    }
    setError(null)
    setResults(null)
    setPreview(URL.createObjectURL(file))
    setLoading(true)
    try {
      const data = await analyzeScreenshot(file, target)
      setResults(data.results)
      if (onResult) onResult(data.results)
    } catch (e) {
      setError('Analyse échouée : ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    processFile(file)
  }

  const onFileChange = (e) => {
    const file = e.target.files[0]
    processFile(file)
    e.target.value = ''
  }

  const labelMap = { minerals: 'minerais', alloys: 'alliages', all: 'items' }

  const handleZoneClick = (e) => {
    // Ne pas déclencher si on clique sur un bouton enfant
    if (e.target.tagName === 'BUTTON') return
    inputRef.current?.click()
  }

  return (
    <div
      className={`rounded-xl border-2 border-dashed transition-colors cursor-pointer ${
        dragging ? 'border-blue-400 bg-blue-900/20' : 'border-slate-600 bg-slate-800/40 hover:border-slate-400 hover:bg-slate-700/40'
      } ${compact ? 'p-3' : 'p-5'}`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onClick={handleZoneClick}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <span className="text-2xl">📸</span>
        <div>
          <p className="text-sm font-semibold text-slate-200">
            Import depuis screenshot
          </p>
          <p className="text-xs text-slate-400">
            Clique ou glisse une capture de tes {labelMap[target]}
          </p>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onFileChange}
      />

      {/* Loading */}
      {loading && (
        <div className="flex items-center gap-2 text-blue-400 text-sm py-2">
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
          Analyse en cours (OCR + détection)…
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-red-400 text-xs py-2 bg-red-900/20 rounded px-2">{error}</p>
      )}

      {/* Preview + results */}
      {!loading && results !== null && (
        <div className="mt-2 space-y-2">
          {preview && (
            <img
              src={preview}
              alt="screenshot"
              className="max-h-40 rounded border border-slate-600 object-contain"
            />
          )}

          {results.length === 0 ? (
            <p className="text-yellow-400 text-xs">
              Aucun item reconnu. Essaie avec une capture plus nette / plus grande.
            </p>
          ) : (
            <>
              <p className="text-green-400 text-xs font-semibold">
                {results.length} item{results.length > 1 ? 's' : ''} détecté{results.length > 1 ? 's' : ''} — appliqués ✓
              </p>
              <div className="grid grid-cols-2 gap-1 max-h-40 overflow-y-auto pr-1">
                {results.map(r => (
                  <div key={r.itemId} className="flex items-center gap-1.5 text-xs bg-slate-700/50 rounded px-2 py-1">
                    <span className="font-mono text-yellow-300">{r.quantity.toLocaleString('fr-FR')}</span>
                    <span className="text-slate-300 truncate">{r.name}</span>
                    <span className="ml-auto text-slate-500 shrink-0">
                      {Math.round((r.score ?? r.confidence ?? 0) * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Drag hint when empty */}
      {!loading && results === null && !error && (
        <p className="text-center text-slate-500 text-xs py-1">
          PNG / JPG — capture de l'hôtel des ventes ou de l'inventaire Dofus
        </p>
      )}
    </div>
  )
}
