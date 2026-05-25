import { useState, useRef, useCallback, useEffect } from "react"

const STORAGE_KEY = "ops_plan_image"

// Сохранить в localStorage, вернуть true если успешно
function lsSave(key, value) {
  try {
    localStorage.setItem(key, value)
    return true
  } catch {
    // Квота переполнена (особенно актуально на мобильных)
    try { localStorage.removeItem(key) } catch {}
    return false
  }
}

function lsLoad(key) {
  try { return localStorage.getItem(key) || null } catch { return null }
}

function lsClear(key) {
  try { localStorage.removeItem(key) } catch {}
}

export default function PlanPage() {
  const [imgSrc, setImgSrc]         = useState(() => lsLoad(STORAGE_KEY))
  const [scale, setScale]           = useState(1)
  const [isDragging, setIsDragging] = useState(false)
  const [pos, setPos]               = useState({ x: 0, y: 0 })
  const [saveWarn, setSaveWarn]     = useState(false)   // предупреждение если не влезло в localStorage
  const startRef                    = useRef({ mx: 0, my: 0, ox: 0, oy: 0 })
  const fileRef                     = useRef(null)
  const containerRef                = useRef(null)
  const imgRef                      = useRef(null)
  const touchRef                    = useRef(null)

  // ── fit по высоте ──────────────────────────────────
  const fitHeight = useCallback(() => {
    const canvas = containerRef.current
    const img    = imgRef.current
    if (!canvas || !img) return
    const ch = canvas.clientHeight
    const ih = img.naturalHeight
    if (!ch || !ih) return
    setScale(+Math.min(ch / ih, 1).toFixed(3))
    setPos({ x: 0, y: 0 })
  }, [])

  // Когда картинка уже была в state при монтировании (из localStorage),
  // onLoad может не сработать — img.complete уже true.
  // Поэтому вызываем fitHeight и через onLoad, и через useEffect.
  useEffect(() => {
    if (!imgSrc) return
    // Небольшая задержка чтобы DOM и размеры канваса успели устояться
    const id = requestAnimationFrame(() => {
      if (imgRef.current?.complete) fitHeight()
    })
    return () => cancelAnimationFrame(id)
  }, [imgSrc, fitHeight])

  function onImgLoad() { fitHeight() }

  // ── загрузка файла ─────────────────────────────────
  function processFile(file) {
    if (!file || !file.type.startsWith("image/")) return
    const reader = new FileReader()
    reader.onload = ev => {
      const dataUrl = ev.target.result
      const saved = lsSave(STORAGE_KEY, dataUrl)
      setSaveWarn(!saved)
      setImgSrc(dataUrl)
      setPos({ x: 0, y: 0 })
      // fitHeight вызовется через onImgLoad или useEffect выше
    }
    reader.readAsDataURL(file)
  }

  function handleFile(e) {
    processFile(e.target.files[0])
    e.target.value = ""
  }

  function handleDrop(e) {
    e.preventDefault()
    processFile(e.dataTransfer.files[0])
  }

  // ── зум колесом ───────────────────────────────────
  function handleWheel(e) {
    if (!imgSrc) return
    e.preventDefault()
    const factor = e.deltaY > 0 ? 0.9 : 1.1
    setScale(s => +Math.min(8, Math.max(0.05, s * factor)).toFixed(3))
  }

  // ── перетаскивание мышью ──────────────────────────
  function onMouseDown(e) {
    if (e.button !== 0) return
    setIsDragging(true)
    startRef.current = { mx: e.clientX, my: e.clientY, ox: pos.x, oy: pos.y }
  }
  function onMouseMove(e) {
    if (!isDragging) return
    const { mx, my, ox, oy } = startRef.current
    setPos({ x: ox + (e.clientX - mx), y: oy + (e.clientY - my) })
  }
  function onMouseUp() { setIsDragging(false) }

  // ── перетаскивание пальцем ────────────────────────
  function onTouchStart(e) {
    if (e.touches.length === 1)
      touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, ox: pos.x, oy: pos.y }
  }
  function onTouchMove(e) {
    if (e.touches.length !== 1 || !touchRef.current) return
    e.preventDefault()
    setPos({
      x: touchRef.current.ox + (e.touches[0].clientX - touchRef.current.x),
      y: touchRef.current.oy + (e.touches[0].clientY - touchRef.current.y),
    })
  }

  function clearPlan() {
    lsClear(STORAGE_KEY)
    setSaveWarn(false)
    setImgSrc(null); setScale(1); setPos({ x: 0, y: 0 })
  }

  return (
    <div className="plan-page">
      <div className="plan-toolbar">
        <span className="plan-toolbar-title">🗺 План объекта</span>
        <div className="plan-toolbar-actions">
          {imgSrc && (
            <>
              <button className="btn btn-ghost btn-sm" onClick={() => setScale(s => +Math.min(8, s * 1.2).toFixed(3))}>＋</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setScale(s => +Math.max(0.05, s * 0.8).toFixed(3))}>－</button>
              <span className="plan-scale-badge">{Math.round(scale * 100)}%</span>
              <button className="btn btn-ghost btn-sm" onClick={fitHeight} title="По высоте">↕</button>
              <button className="btn btn-ghost btn-sm" onClick={() => { setScale(1); setPos({ x:0, y:0 }) }} title="100%">↺</button>
              <button className="btn btn-danger btn-sm" onClick={clearPlan} title="Удалить план">🗑</button>
            </>
          )}
          <button className="btn btn-secondary btn-sm" onClick={() => fileRef.current.click()}>
            {imgSrc ? "🔄 Заменить" : "📂 Загрузить план"}
          </button>
          <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={handleFile} />
        </div>
      </div>

      {saveWarn && (
        <div className="plan-save-warn">
          ⚠️ Изображение слишком большое для сохранения в браузере — план не сохранится после перезагрузки.
          Используйте файл меньшего размера (рекомендуется JPG до 2 МБ).
        </div>
      )}

      <div
        ref={containerRef}
        className={"plan-canvas" + (isDragging ? " dragging" : "") + (!imgSrc ? " plan-canvas-empty" : "")}
        onWheel={handleWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={() => { touchRef.current = null }}
        onDragOver={e => e.preventDefault()}
        onDrop={handleDrop}
      >
        {!imgSrc ? (
          <div className="plan-drop-hint" onClick={() => fileRef.current.click()}>
            <div className="plan-drop-icon">🗺</div>
            <div className="plan-drop-text">Нажмите или перетащите сюда<br/>изображение плана объекта</div>
            <div className="plan-drop-sub">PNG, JPG, SVG — рекомендуется до 2 МБ</div>
          </div>
        ) : (
          <img
            ref={imgRef}
            src={imgSrc}
            alt="План объекта"
            className="plan-image"
            onLoad={onImgLoad}
            style={{ transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px)) scale(${scale})` }}
            draggable={false}
          />
        )}
      </div>
    </div>
  )
}

