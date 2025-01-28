// components/Canvas.tsx
"use client"

import React, { forwardRef, useEffect, useRef, useCallback } from "react"
import type { DrawingState } from "../types"
import { toast } from "react-toastify"

interface CanvasProps {
  drawingState: DrawingState
  backgroundImage: string | null
  imagePosition: { x: number; y: number }
  imageSize: { width: number; height: number }
  setImagePosition: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>
  setImageSize: React.Dispatch<React.SetStateAction<{ width: number; height: number }>>
  isResizingImage: boolean
  setIsResizingImage: React.Dispatch<React.SetStateAction<boolean>>
  tableData: { id: number; content: string }[]
}

const Canvas = forwardRef<HTMLCanvasElement, CanvasProps>(
  (
    {
      drawingState,
      backgroundImage,
      imagePosition,
      imageSize,
      setImagePosition,
      setImageSize,
      isResizingImage,
      setIsResizingImage,
      tableData,
    },
    ref
  ) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
    const [isDrawing, setIsDrawing] = React.useState(false)
    const [lastPoint, setLastPoint] = React.useState<{ x: number; y: number } | null>(null)
    const [currentShape, setCurrentShape] = React.useState<ImageData | null>(null)
    const [isDraggingImage, setIsDraggingImage] = React.useState(false)
    const [dragStart, setDragStart] = React.useState<{ x: number; y: number } | null>(null)

    const [canvasSize, setCanvasSize] = React.useState({ width: 1920, height: 1080 })

    useEffect(() => {
      const updateCanvasSize = () => {
        const container = canvasRef.current?.parentElement
        if (container) {
          const { width, height } = container.getBoundingClientRect()
          setCanvasSize({ width: Math.floor(width), height: Math.floor(height) })
        }
      }

      updateCanvasSize()
      window.addEventListener("resize", updateCanvasSize)
      return () => window.removeEventListener("resize", updateCanvasSize)
    }, [])

    useEffect(() => {
      const canvas = canvasRef.current
      if (!canvas) return

      canvas.width = canvasSize.width
      canvas.height = canvasSize.height

      const context = canvas.getContext("2d", { alpha: false })
      if (context) {
        context.imageSmoothingEnabled = true
        context.imageSmoothingQuality = "high"
        context.fillStyle = "#000000" // Default background color
        context.fillRect(0, 0, canvas.width, canvas.height)
        ctxRef.current = context
      }
    }, [canvasSize])

    useEffect(() => {
      if (ref) {
        if (typeof ref === "function") {
          ref(canvasRef.current)
        } else {
          // @ts-ignore
          ref.current = canvasRef.current
        }
      }
    }, [ref])

    const getMousePos = useCallback(
      (canvas: HTMLCanvasElement, evt: MouseEvent | TouchEvent) => {
        const rect = canvas.getBoundingClientRect()
        const scaleX = canvas.width / rect.width
        const scaleY = canvas.height / rect.height
        const clientX = "touches" in evt ? evt.touches[0].clientX : evt.clientX
        const clientY = "touches" in evt ? evt.touches[0].clientY : evt.clientY
        return {
          x: (clientX - rect.left) * scaleX,
          y: (clientY - rect.top) * scaleY,
        }
      },
      []
    )

    const redrawCanvas = useCallback(() => {
      const canvas = canvasRef.current
      const ctx = ctxRef.current
      if (!ctx || !canvas) return

      // Clear canvas
      ctx.fillStyle = "#000000" // Default background color
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Draw background image if available
      if (backgroundImage) {
        const img = new Image()
        img.src = backgroundImage
        img.onload = () => {
          ctx.drawImage(img, imagePosition.x, imagePosition.y, imageSize.width, imageSize.height)

          // Draw border around image
          ctx.strokeStyle = "#FFFFFF"
          ctx.lineWidth = 2
          ctx.strokeRect(imagePosition.x, imagePosition.y, imageSize.width, imageSize.height)

          // Draw resize handle
          ctx.fillStyle = "#FFFFFF"
          ctx.fillRect(
            imagePosition.x + imageSize.width - 8,
            imagePosition.y + imageSize.height - 8,
            8,
            8
          )
        }
        img.onerror = () => {
          console.error("Failed to load background image.")
          toast.error("Failed to load background image.")
        }
      }

      // Draw table data
      if (tableData.length > 0) {
        const cellWidth = 100
        const cellHeight = 30
        const startX = 10
        const startY = canvas.height - tableData.length * cellHeight - 10

        ctx.fillStyle = "#FFFFFF"
        ctx.font = "12px Arial"

        tableData.forEach((cell, index) => {
          const x = startX
          const y = startY + index * cellHeight
          ctx.strokeStyle = "#FFFFFF"
          ctx.strokeRect(x, y, cellWidth, cellHeight)
          ctx.fillText(cell.content, x + 5, y + 20)
        })
      }
    }, [backgroundImage, imagePosition, imageSize, tableData])

    useEffect(() => {
      redrawCanvas()
    }, [backgroundImage, imagePosition, imageSize, tableData, redrawCanvas])

    const startDrawing = useCallback(
      (e: MouseEvent | TouchEvent) => {
        const canvas = canvasRef.current
        const ctx = ctxRef.current
        if (!canvas || !ctx) return

        const { x, y } = getMousePos(canvas, e)

        // Check if clicking on the image
        if (
          backgroundImage &&
          x >= imagePosition.x &&
          x <= imagePosition.x + imageSize.width &&
          y >= imagePosition.y &&
          y <= imagePosition.y + imageSize.height
        ) {
          // Check if clicking on the resize handle
          if (
            x >= imagePosition.x + imageSize.width - 10 &&
            y >= imagePosition.y + imageSize.height - 10
          ) {
            setIsResizingImage(true)
          } else {
            setIsDraggingImage(true)
            setDragStart({ x: x - imagePosition.x, y: y - imagePosition.y })
          }
        } else {
          setIsDrawing(true)
          setLastPoint({ x, y })

          if (drawingState.tool === "brush" || drawingState.tool === "eraser") {
            ctx.beginPath()
            ctx.moveTo(x, y)
          } else {
            setCurrentShape(ctx.getImageData(0, 0, canvas.width, canvas.height))
          }
        }
      },
      [
        backgroundImage,
        imagePosition.x,
        imagePosition.y,
        imageSize.width,
        imageSize.height,
        getMousePos,
        drawingState.tool,
      ]
    )

    const draw = useCallback(
      (e: MouseEvent | TouchEvent) => {
        const canvas = canvasRef.current
        const ctx = ctxRef.current
        if (!canvas || !ctx) return

        const { x, y } = getMousePos(canvas, e)

        if (isResizingImage) {
          const newWidth = Math.max(50, x - imagePosition.x) // Minimum width of 50px
          const newHeight = Math.max(50, y - imagePosition.y) // Minimum height of 50px
          setImageSize({ width: newWidth, height: newHeight })
          redrawCanvas()
        } else if (isDraggingImage && dragStart) {
          const newX = Math.max(0, Math.min(x - dragStart.x, canvas.width - imageSize.width))
          const newY = Math.max(0, Math.min(y - dragStart.y, canvas.height - imageSize.height))
          setImagePosition({ x: newX, y: newY })
          redrawCanvas()
        } else if (isDrawing && lastPoint) {
          ctx.strokeStyle = drawingState.tool === "eraser" ? "#000000" : drawingState.color
          ctx.lineWidth = drawingState.brushWidth
          ctx.lineCap = "round"
          ctx.lineJoin = "round"

          if (drawingState.tool === "brush" || drawingState.tool === "eraser") {
            ctx.lineTo(x, y)
            ctx.stroke()
            setLastPoint({ x, y })
          } else if (currentShape) {
            ctx.putImageData(currentShape, 0, 0)
            ctx.beginPath()

            switch (drawingState.tool) {
              case "rectangle":
                ctx.rect(lastPoint.x, lastPoint.y, x - lastPoint.x, y - lastPoint.y)
                break
              case "circle":
                const radius = Math.sqrt(Math.pow(x - lastPoint.x, 2) + Math.pow(y - lastPoint.y, 2))
                ctx.arc(lastPoint.x, lastPoint.y, radius, 0, 2 * Math.PI)
                break
              case "triangle":
                ctx.moveTo(lastPoint.x, lastPoint.y)
                ctx.lineTo(x, y)
                ctx.lineTo(lastPoint.x - (x - lastPoint.x), y)
                ctx.closePath()
                break
              case "line":
                ctx.moveTo(lastPoint.x, lastPoint.y)
                ctx.lineTo(x, y)
                break
            }

            if (drawingState.fillColor) {
              ctx.fillStyle = drawingState.color
              ctx.fill()
            }
            ctx.stroke()
          }
        }
      },
      [
        isResizingImage,
        isDraggingImage,
        isDrawing,
        dragStart,
        lastPoint,
        ctxRef,
        drawingState,
        currentShape,
        getMousePos,
        imagePosition,
        imageSize,
        redrawCanvas,
      ]
    )

    const stopDrawing = useCallback(() => {
      setIsDrawing(false)
      setCurrentShape(null)
      setIsDraggingImage(false)
      setIsResizingImage(false)
      const ctx = ctxRef.current
      if (ctx) ctx.closePath()
    }, [])

    useEffect(() => {
      const canvas = canvasRef.current
      const ctx = ctxRef.current
      if (!canvas || !ctx) return

      const handleMouseDown = (e: MouseEvent) => startDrawing(e)
      const handleMouseMove = (e: MouseEvent) => draw(e)
      const handleMouseUp = () => stopDrawing()
      const handleMouseOut = () => stopDrawing()

      const handleTouchStart = (e: TouchEvent) => {
        e.preventDefault()
        startDrawing(e)
      }
      const handleTouchMove = (e: TouchEvent) => {
        e.preventDefault()
        draw(e)
      }
      const handleTouchEnd = () => stopDrawing()

      canvas.addEventListener("mousedown", handleMouseDown)
      canvas.addEventListener("mousemove", handleMouseMove)
      canvas.addEventListener("mouseup", handleMouseUp)
      canvas.addEventListener("mouseout", handleMouseOut)

      canvas.addEventListener("touchstart", handleTouchStart, { passive: false })
      canvas.addEventListener("touchmove", handleTouchMove, { passive: false })
      canvas.addEventListener("touchend", handleTouchEnd)

      return () => {
        canvas.removeEventListener("mousedown", handleMouseDown)
        canvas.removeEventListener("mousemove", handleMouseMove)
        canvas.removeEventListener("mouseup", handleMouseUp)
        canvas.removeEventListener("mouseout", handleMouseOut)

        canvas.removeEventListener("touchstart", handleTouchStart)
        canvas.removeEventListener("touchmove", handleTouchMove)
        canvas.removeEventListener("touchend", handleTouchEnd)
      }
    }, [startDrawing, draw, stopDrawing])

    return (
      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          height: "100%",
          touchAction: "none",
          cursor: isResizingImage
            ? "nwse-resize"
            : isDraggingImage
            ? "move"
            : drawingState.tool === "eraser"
            ? "not-allowed"
            : "default",
        }}
      />
    )
  }
)

Canvas.displayName = "Canvas"

export default Canvas
