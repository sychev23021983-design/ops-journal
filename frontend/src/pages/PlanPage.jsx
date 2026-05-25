import { useState, useRef } from "react"

export default function PlanPage() {
  const [imgSrc, setImgSrc]     = useState(null)
  const [scale, setScale]       = useState(1)
  const [isDragging, setIsDragging] = useState(false)
  const [pos, setPos]           = useState({ x: 0, y: 0 })
  const [startPos, setStartPos] = useState({ x: 0, y: 0 })
  const [startOffset, setStartOffset] = useState({ x: 0, y: 0 })
  const fileRef = useRef(null)
  const containerRef = useRef(null)

  function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => { setImgSrc(ev.target.result); setScale(1); setPos({ x: 0, y: 0 }) }
    reader.readAsDataURL(file)
  }

  function handleDrop(e) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (!file || !file.type.startsWith("image/")) return
    const reader = new FileReader()
    reader.onload = ev => { setImgSrc(ev.target.result); setScale(1); setPos({ x: 0, y: 0 }) }
    reader.readAsDataURL(file)
  }

  function handleWheel(e) {
    if (!imgSrc) return
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    setScale(s => Math.min(5, Math.max(0.2, +(s + delta).toFixed(2))))
  }

  function onMouseDown(e) {
    if (e.button !== 0) return
    setIsDragging(true)
    setStartPos({ x: e.clientX, y: e.clientY })
    setStartOffset({ ...pos })
  }

  function onMouseMove(e) {
    if (!isDragging) return
    setPos({
      x: startOffset.x + (e.clientX - startPos.x),
      y: startOffset.y + (e.clientY - startPos.y),
    })
  }

  function onMouseUp() { setIsDragging(false) }

  // Touch
  const touchRef = useRef(null)
  function onTouchStart(e) {
    if (e.touches.length === 1) {
      touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, ox: pos.x, oy: pos.y }
    }
  }
  function onTouchMove(e) {
    if (e.touches.length === 1 && touchRef.current) {
      e.preventDefault()
      const dx = e.touches[0].clientX - touchRef.current.x
      const dy = e.touches[0].clientY - touchRef.current.y
      setPos({ x: touchRef.current.ox + dx, y: touchRef.current.oy + dy })
    }
  }

  function resetView() { setScale(1); setPos({ x: 0, y: 0 }) }
  function fitView() {
    if (!containerRef.current || !imgSrc) return
    setScale(1); setPos({ x: 0, y: 0 })
  }

  return (
    <div className="plan-page">
      <div className="plan-toolbar">
        <span className="plan-toolbar-title">🗺 План объекта</span>
        <div className="plan-toolbar-actions">
          {imgSrc && (
            <>
              <button className="btn btn-ghost btn-sm" onClick={() => setScale(s => Math.min(5, +(s + 0.2).toFixed(2)))}>＋ Zoom</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setScale(s => Math.max(0.2, +(s - 0.2).toFixed(2)))}>－ Zoom</button>
              <span className="plan-scale-badge">{Math.round(scale * 100)}%</span>
              <button className="btn btn-ghost btn-sm" onClick={resetView}>↺ Сброс</button>
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
            src={imgSrc}
            alt="План объекта"
            className="plan-image"
            style={{
              transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px)) scale(${scale})`,
            }}
            draggable={false}
          />
        )}
      </div>
    </div>
  )
}

