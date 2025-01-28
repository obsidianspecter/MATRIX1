// components/IntegratedBoard.tsx
"use client"

import React, { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Canvas from "./Canvas"
import ToolBar from "./ToolBar"
import type { DrawingState, Tool } from "../types"
import io from "socket.io-client"
import Peer from "peerjs"
import { toast, ToastContainer } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"

export default function IntegratedBoard() {
  // **Drawing state**
  const [drawingState, setDrawingState] = useState<DrawingState>({
    isDrawing: false,
    tool: "brush",
    color: "#FFFFFF",
    brushWidth: 5,
    fillColor: false,
  })
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // **Image state**
  const [image, setImage] = useState<string | null>(null)
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 })
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 })
  const [isResizingImage, setIsResizingImage] = useState(false)

  // **Table state**
  const [tableData, setTableData] = useState<{ id: number; content: string }[]>([])

  // **Video call state**
  const [roomId, setRoomId] = useState("")
  const [peerId, setPeerId] = useState("")
  const [socket, setSocket] = useState<any>(null)
  const [peer, setPeer] = useState<any>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [remoteStreams, setRemoteStreams] = useState<{ [key: string]: MediaStream }>({})
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  // **State to track active PeerJS calls**
  const [activeCalls, setActiveCalls] = useState<any[]>([])

  // **Drawing functions**
  const handleToolChange = (tool: Tool) => {
    setDrawingState((prev) => ({ ...prev, tool }))
  }

  const handleColorChange = (color: string) => {
    setDrawingState((prev) => ({ ...prev, color }))
  }

  const handleBrushWidthChange = (width: number) => {
    setDrawingState((prev) => ({ ...prev, brushWidth: width }))
  }

  const handleClearCanvas = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (ctx && canvas) {
      ctx.fillStyle = "#000000" // Or your desired default background color
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }
    setTableData([]) // Clear table data when clearing the canvas
    setImage(null) // **Clear the background image**
    setImagePosition({ x: 0, y: 0 }) // **Reset image position**
    setImageSize({ width: 0, height: 0 }) // **Reset image size**
    toast.info("Canvas and background image cleared.")

    // Close all active calls when clearing the canvas
    activeCalls.forEach((call) => call.close())
    setActiveCalls([])
  }

  // **Image functions**
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          setImageSize({ width: img.width, height: img.height })
          setImagePosition({ x: 0, y: 0 })
        }
        img.src = e.target?.result as string
        setImage(e.target?.result as string)
        toast.success("Image uploaded successfully!")
      }
      reader.readAsDataURL(file)
    }
  }

  // **Video call functions**
  useEffect(() => {
    const newSocket = io("http://localhost:3030") // Replace with your Socket.io server URL
    setSocket(newSocket)

    const newPeer = new Peer()
    setPeer(newPeer)

    newPeer.on("open", (id: string) => {
      setPeerId(id)
      toast.success(`Connected with Peer ID: ${id}`)
    })

    newPeer.on("error", (err: any) => {
      console.error("PeerJS Error:", err)
      toast.error(`PeerJS Error: ${err.type}`)
    })

    return () => {
      newSocket.disconnect()
      newPeer.destroy()
    }
  }, [])

  useEffect(() => {
    if (peer && socket) {
      // Handle incoming calls
      const handleCall = (call: any) => {
        call.answer(stream)
        call.on("stream", (remoteStream: MediaStream) => {
          setRemoteStreams((prev) => ({ ...prev, [call.peer]: remoteStream }))
          toast.info(`User ${call.peer} joined the call.`)
        })
        setActiveCalls((prev) => [...prev, call])
      }

      peer.on("call", handleCall)

      // Handle user connection
      const handleUserConnected = (userId: string) => {
        if (stream) {
          const call = peer.call(userId, stream)
          call.on("stream", (remoteStream: MediaStream) => {
            setRemoteStreams((prev) => ({ ...prev, [userId]: remoteStream }))
            toast.info(`User ${userId} joined the call.`)
          })
          setActiveCalls((prev) => [...prev, call])
        }
      }

      socket.on("user-connected", handleUserConnected)

      // Handle user disconnection
      socket.on("user-disconnected", (userId: string) => {
        setRemoteStreams((prev) => {
          const newStreams = { ...prev }
          delete newStreams[userId]
          return newStreams
        })
        toast.info(`User ${userId} left the call.`)

        // Close and remove the call from activeCalls
        setActiveCalls((prev) => {
          const updatedCalls = prev.filter((call) => {
            if (call.peer === userId) {
              call.close()
              return false
            }
            return true
          })
          return updatedCalls
        })
      })

      return () => {
        peer.off("call", handleCall)
        socket.off("user-connected", handleUserConnected)
        socket.off("user-disconnected")
      }
    }
  }, [peer, socket, stream])

  // **Cleanup active calls on unmount**
  useEffect(() => {
    return () => {
      activeCalls.forEach((call) => call.close())
    }
  }, [activeCalls])

  const startVideo = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      setStream(mediaStream)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
      toast.success("Video and audio started.")
    } catch (error) {
      console.error("Error accessing media devices:", error)
      toast.error("Error accessing media devices.")
    }
  }

  const stopVideo = () => {
    if (stream) {
      // Stop all media tracks
      stream.getTracks().forEach((track) => track.stop())
      setStream(null)

      // Clear the video element
      if (videoRef.current) {
        videoRef.current.srcObject = null
      }

      // Close all active PeerJS calls
      activeCalls.forEach((call) => call.close())
      setActiveCalls([])

      toast.info("Video and audio stopped.")
    }
  }

  const toggleVideo = async () => {
    if (stream) {
      stopVideo()
    } else {
      await startVideo()
    }
  }

  const joinRoom = () => {
    if (roomId && peerId && socket && stream) {
      socket.emit("join-room", roomId, peerId)
      toast.success(`Joined room: ${roomId}`)
    } else {
      toast.error("Room ID, Peer ID, and Stream are required to join a room.")
    }
  }

  const shareScreen = async () => {
    try {
      if (isScreenSharing) {
        if (stream) {
          stream.getTracks().forEach((track) => track.stop())
        }
        await startVideo()
        toast.info("Stopped screen sharing.")
      } else {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true })
        setStream(screenStream)
        if (videoRef.current) {
          videoRef.current.srcObject = screenStream
        }
        // Reshare the screen with existing peers
        Object.keys(remoteStreams).forEach((userId) => {
          const call = peer.call(userId, screenStream)
          call.on("stream", (remoteStream: MediaStream) => {
            setRemoteStreams((prev) => ({ ...prev, [userId]: remoteStream }))
          })
        })
        toast.success("Screen sharing started.")
      }
      setIsScreenSharing(!isScreenSharing)
    } catch (error) {
      console.error("Error sharing screen:", error)
      toast.error("Error sharing screen.")
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Toast Notifications */}
      <ToastContainer />

      <h1 className="text-3xl font-bold mb-8">Matrix Digital Learning Board</h1>
      <div className="space-y-4">
        {/* Toolbar with Enhanced Features */}
        <div className="flex flex-col space-y-4 bg-gray-900 p-4 rounded-lg">
          <ToolBar
            drawingState={drawingState}
            onToolChange={handleToolChange}
            onColorChange={handleColorChange}
            onBrushWidthChange={handleBrushWidthChange}
            currentColor={drawingState.color}
            currentBrushWidth={drawingState.brushWidth}
            currentTool={drawingState.tool}
          />

          <div className="flex items-center space-x-4">
            <div className="flex space-x-2 flex-1">
              <Button onClick={handleClearCanvas} variant="outline" aria-label="Clear Canvas">
                Clear Canvas
              </Button>
              <Input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="max-w-xs"
                aria-label="Upload Image"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Input
                placeholder="Enter Room ID"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="w-32"
                aria-label="Room ID"
              />
              <Button onClick={joinRoom} disabled={!stream} aria-label="Join Room">
                Join
              </Button>
              <Button onClick={toggleVideo} aria-label={stream ? "Stop Video" : "Start Video"}>
                {stream ? "Stop Video" : "Start Video"}
              </Button>
              <Button onClick={shareScreen} disabled={!stream} aria-label="Share Screen">
                {isScreenSharing ? "Stop Share" : "Share Screen"}
              </Button>
            </div>
          </div>

          {stream && (
            <div className="h-24 bg-black rounded border border-gray-700">
              <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-contain" />
            </div>
          )}
        </div>

        {/* Canvas with Image Overlays */}
        <div
          className="relative border border-white rounded"
          style={{ width: "100%", height: "600px", overflow: "hidden" }}
        >
          <Canvas
            ref={canvasRef}
            drawingState={drawingState}
            backgroundImage={image}
            imagePosition={imagePosition}
            imageSize={imageSize}
            setImagePosition={setImagePosition}
            setImageSize={setImageSize}
            isResizingImage={isResizingImage}
            setIsResizingImage={setIsResizingImage}
            tableData={tableData} // Assuming tableData is used within Canvas
          />
        </div>

        {/* Remote Video Streams */}
        <div className="grid grid-cols-2 gap-4">
          {Object.entries(remoteStreams).map(([userId, remoteStream]) => (
            <div key={userId} className="bg-gray-900 p-2 rounded">
              <h2 className="text-sm font-semibold mb-2">Remote ({userId})</h2>
              <video
                autoPlay
                playsInline
                className="w-full h-auto border border-gray-700 rounded"
                ref={(ref) => {
                  if (ref) ref.srcObject = remoteStream
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
