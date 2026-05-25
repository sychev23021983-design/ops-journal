import { useState, useRef, useCallback, useEffect } from "react"
import { api } from "../api/client"

export default function PlanPage() {
  // imgUrl — URL для <img src>, либо null
  // Три состояния: "loading" | "ready" | "empty"
  const [status, setStatus]         = useState("loading")
  const [imgUrl, setImgUrl]         = useState(null)
  const [scale, setScale]           = useState(1)
  const [isDragging, setIsDragging] = useState(false)
  const [pos, setPos]               = useState({ x: 0, y: 0 })
  const [uploading, setUploading]   = useState(false)
  const [error, setError]           = useState(null)
  const startRef                    = useRef({ mx: 0, my: 0, ox: 0, oy: 0 })
  const fileRef                     = useRef(null)
  const containerRef                = useRef(null)
  const imgRef                      = useRef(null)
  const touchRef                    = useRef(null)

  // При монтировании проверяем есть ли план на сервере
  useEffect(() => {
    api.plan.exists().then(exists => {
      if (exists) {
        // Добавляем timestamp чтобы браузер не кэшировал старую версию
        setImgUrl(api.plan.imageUrl() + "?t=" + Date.now())
        setStatus("ready")
      } else {
        setStatus("empty")
      }
    })
  }, [])

  // fit по высоте
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

  function onImgLoad() { fitHeight() }

  // Восстановление fitHeight если img.complete уже true
  useEffect(() => {
    if (status !== "ready") return
    const id = requestAnimationFrame(() => {
      if (imgRef.current?.complete) fitHeight()
    })
    return () => cancelAnimationFrame(id)
  }, [status, imgUrl, fitHeight])

  // Загрузка файла на сервер
  async function processFile(file) {
    if (!file || !file.type.startsWith("image/")) return
    setUploading(true)
    setError(null)
    try {
      await api.plan.upload(file)
      setImgUrl(api.plan.imageUrl() + "?t=" + Date.now())
      setStatus("ready")
      setPos({ x: 0, y: 0 })
    } catch (e) {
      setError("Ошибка загрузки: " + e.message)
    } finally {
      setUploading(false)
    }
  }

  function handleFile(e) {
    processFile(e.target.files[0])
    e.target.value = ""
  }

  function handleDrop(e) {
    e.preventDefault()
    processFile(e.dataTransfer.files[0])
  }

  function handleWheel(e) {
    if (status !== "ready") return
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

  async function clearPlan() {
    try { await api.plan.delete() } catch {}
    setImgUrl(null)
    setStatus("empty")
    setScale(1)
    setPos({ x: 0, y: 0 })
  }

  const hasImage = status === "ready" && imgUrl

  return (
    <div className="plan-page">
      <div className="plan-toolbar">
        <span className="plan-toolbar-title">🗺 План объекта</span>
        <div className="plan-toolbar-actions">
          {hasImage && (
            <>
              <button className="btn btn-ghost btn-sm" onClick={() => setScale(s => +Math.min(8, s * 1.2).toFixed(3))}>＋</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setScale(s => +Math.max(0.05, s * 0.8).toFixed(3))}>－</button>
              <span className="plan-scale-badge">{Math.round(scale * 100)}%</span>
              <button className="btn btn-ghost btn-sm" onClick={fitHeight} title="По высоте">↕</button>
              <button className="btn btn-ghost btn-sm" onClick={() => { setScale(1); setPos({ x:0, y:0 }) }} title="100%">↺</button>
              <button className="btn btn-danger btn-sm" onClick={clearPlan} title="Удалить план">🗑</button>
            </>
          )}
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => fileRef.current.click()}
            disabled={uploading}
          >
            {uploading ? "⏳ Загрузка..." : hasImage ? "🔄 Заменить" : "📂 Загрузить план"}
          </button>
          <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={handleFile} />
        </div>
      </div>

      {error && (
        <div className="plan-save-warn">⚠️ {error}</div>
      )}

      <div
        ref={containerRef}
        className={"plan-canvas" + (isDragging ? " dragging" : "") + (!hasImage ? " plan-canvas-empty" : "")}
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
        {status === "loading" && (
          <div className="plan-drop-hint">
            <div className="plan-drop-icon">⏳</div>
            <div className="plan-drop-text">Загрузка плана...</div>
          </div>
        )}
        {status === "empty" && (
          <div className="plan-drop-hint" onClick={() => fileRef.current.click()}>
            <div className="plan-drop-icon">🗺</div>
            <div className="plan-drop-text">Нажмите или перетащите сюда<br/>изображение плана объекта</div>
            <div className="plan-drop-sub">PNG, JPG, SVG — план сохранится на сервере<br/>и будет виден на всех устройствах</div>
          </div>
        )}
        {hasImage && (
          <img
            ref={imgRef}
            src={imgUrl}
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

