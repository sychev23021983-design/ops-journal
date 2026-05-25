import { useState, useRef, useCallback } from "react"

const STORAGE_KEY = "ops_plan_image"

export default function PlanPage() {
  const [imgSrc, setImgSrc] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) || null } catch { return null }
  })
  const [scale, setScale]           = useState(1)
  const [isDragging, setIsDragging] = useState(false)
  const [pos, setPos]               = useState({ x: 0, y: 0 })
  const startRef                    = useRef({ mx: 0, my: 0, ox: 0, oy: 0 })
  const fileRef                     = useRef(null)
  const containerRef                = useRef(null)
  const imgRef                      = useRef(null)
  const touchRef                    = useRef(null)

  // Масштаб по высоте канваса
  const fitHeight = useCallback(() => {
    if (!containerRef.current || !imgRef.current) return
    const ch = containerRef.current.clientHeight
    const ih = imgRef.current.naturalHeight
    if (!ch || !ih) return
    setScale(+Math.min(ch / ih, 1).toFixed(3))
    setPos({ x: 0, y: 0 })
  }, [])

  function onImgLoad() { fitHeight() }

  function saveAndSet(dataUrl) {
    try { localStorage.setItem(STORAGE_KEY, dataUrl) } catch {}
    setImgSrc(dataUrl)
    setPos({ x: 0, y: 0 })
    // fitHeight сработает через onImgLoad
  }

  function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => saveAndSet(ev.target.result)
    reader.readAsDataURL(file)
    e.target.value = ""
  }

  function handleDrop(e) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (!file || !file.type.startsWith("image/")) return
    const reader = new FileReader()
    reader.onload = ev => saveAndSet(ev.target.result)
    reader.readAsDataURL(file)
  }

  function handleWheel(e) {
    if (!imgSrc) return
    e.preventDefault()
    const factor = e.deltaY > 0 ? 0.9 : 1.1
    setScale(s => +Math.min(8, Math.max(0.05, s * factor)).toFixed(3))
  }

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
    try { localStorage.removeItem(STORAGE_KEY) } catch {}
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
              <button className="btn btn-danger btn-sm" onClick={clearPlan}>🗑</button>
            </>
          )}
          <button className="btn btn-secondary btn-sm" onClick={() => fileRef.current.click()}>
            {imgSrc ? "🔄 Заменить" : "📂 Загрузить план"}
          </button>
          <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={handleFile} />
        </div>
      </div>

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
            <div className="plan-drop-sub">PNG, JPG, SVG — любой формат</div>
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

