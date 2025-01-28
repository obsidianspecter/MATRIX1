export type Tool = "brush" | "eraser" | "rectangle" | "circle" | "triangle" | "line"

export interface DrawingState {
  isDrawing: boolean
  tool: Tool
  color: string
  brushWidth: number
  fillColor: boolean
}

