// components/VideoCallPage.tsx
"use client"

import React, { useEffect, useRef, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import io, { Socket } from "socket.io-client"
import Peer, { MediaConnection } from "peerjs"
import { ToastContainer, toast } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"

interface RemoteStream {
  id: string
  stream: MediaStream
}

export default function VideoCallPage() {
  // **State Management**
  const [roomId, setRoomId] = useState<string>("")
  const [peerId, setPeerId] = useState<string>("")
  const [socket, setSocket] = useState<Socket | null>(null)
  const [peer, setPeer] = useState<Peer | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [remoteStreams, setRemoteStreams] = useState<RemoteStream[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isVideoStarted, setIsVideoStarted] = useState<boolean>(false)
  const [isJoined, setIsJoined] = useState<boolean>(false)

  // **Refs**
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRefs = useRef<{ [key: string]: HTMLVideoElement | null }>({})

  // **Initialize Socket.io and PeerJS**
  useEffect(() => {
    // Initialize Socket.io
    const newSocket = io("http://localhost:3030") // Replace with your server URL
    setSocket(newSocket)
    // Initialize PeerJS
    const newPeer = new Peer({
      host: "localhost", // Replace with your PeerJS server host
      port: 3001,        // Replace with your PeerJS server port
      path: "/peerjs",    // Replace with your PeerJS server path
    })
    setPeer(newPeer)

    // Handle PeerJS open event
    newPeer.on("open", (id: string) => {
      setPeerId(id)
      toast.success(`Connected with Peer ID: ${id}`)
    })

    // Handle PeerJS errors
    newPeer.on("error", (err: any) => {
      console.error("PeerJS Error:", err)
      setError(`PeerJS Error: ${err.type}`)
      toast.error(`PeerJS Error: ${err.type}`)
    })

    // Cleanup on component unmount
    return () => {
      newSocket.disconnect()
      newPeer.destroy()
    }
  }, [])

  // **Handle Incoming Calls**
  useEffect(() => {
    if (peer) {
      peer.on("call", (call: MediaConnection) => {
        if (stream) {
          call.answer(stream) // Answer the call with your own stream
          call.on("stream", (remoteStream: MediaStream) => {
            addRemoteStream(call.peer, remoteStream)
          })
          call.on("close", () => {
            removeRemoteStream(call.peer)
          })
          call.on("error", (err) => {
            console.error("Call Error:", err)
            setError(`Call Error: ${err.type}`)
            toast.error(`Call Error: ${err.type}`)
          })
        } else {
          console.warn("No stream available to answer the call.")
        }
      })
    }
  }, [peer, stream])

  // **Handle Socket.io Events**
  useEffect(() => {
    if (socket && peer && stream) {
      // When a user connects to the room
      socket.on("user-connected", (userId: string) => {
        console.log("User connected:", userId)
        initiateCall(userId)
      })

      // When a user disconnects from the room
      socket.on("user-disconnected", (userId: string) => {
        console.log("User disconnected:", userId)
        removeRemoteStream(userId)
      })
    }
  }, [socket, peer, stream])

  // **Functions**

  /**
   * Initiates a call to a connected user.
   * @param userId - The PeerJS ID of the user to call.
   */
  const initiateCall = useCallback(
    (userId: string) => {
      if (peer && stream) {
        const call = peer.call(userId, stream)
        call.on("stream", (remoteStream: MediaStream) => {
          addRemoteStream(userId, remoteStream)
        })
        call.on("close", () => {
          removeRemoteStream(userId)
        })
        call.on("error", (err) => {
          console.error("Call Error:", err)
          setError(`Call Error: ${err.type}`)
          toast.error(`Call Error: ${err.type}`)
        })
      }
    },
    [peer, stream]
  )

  /**
   * Adds a remote stream to the state.
   * @param id - The PeerJS ID of the remote user.
   * @param remoteStream - The MediaStream of the remote user.
   */
  const addRemoteStream = (id: string, remoteStream: MediaStream) => {
    setRemoteStreams((prev) => {
      // Prevent duplicate streams
      if (prev.find((stream) => stream.id === id)) return prev
      return [...prev, { id, stream: remoteStream }]
    })
    toast.info(`User ${id} joined the call.`)
  }

  /**
   * Removes a remote stream from the state.
   * @param id - The PeerJS ID of the remote user.
   */
  const removeRemoteStream = (id: string) => {
    setRemoteStreams((prev) => prev.filter((stream) => stream.id !== id))
    toast.info(`User ${id} left the call.`)
  }

  /**
   * Starts the local video and audio stream.
   */
  const startVideo = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      setStream(mediaStream)
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = mediaStream
      }
      setIsVideoStarted(true)
      toast.success("Video and audio started.")
    } catch (err) {
      console.error("Error accessing media devices:", err)
      setError("Error accessing media devices.")
      toast.error("Error accessing media devices.")
    }
  }, [])

  /**
   * Stops the local video and audio stream.
   */
  const stopVideo = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      setStream(null)
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null
      }
      setIsVideoStarted(false)
      toast.info("Video and audio stopped.")
    }
  }, [stream])

  /**
   * Toggles the local video and audio stream.
   */
  const toggleVideo = useCallback(() => {
    if (isVideoStarted) {
      stopVideo()
    } else {
      startVideo()
    }
  }, [isVideoStarted, startVideo, stopVideo])

  /**
   * Joins a video call room.
   */
  const joinRoom = useCallback(() => {
    if (roomId && peerId && socket && stream) {
      socket.emit("join-room", roomId, peerId)
      setIsJoined(true)
      toast.success(`Joined room: ${roomId}`)
    } else {
      setError("Room ID, Peer ID, and Stream are required to join a room.")
      toast.error("Room ID, Peer ID, and Stream are required to join a room.")
    }
  }, [roomId, peerId, socket, stream])

  /**
   * Leaves the video call room.
   */
  const leaveRoom = useCallback(() => {
    if (socket && roomId && peerId) {
      socket.emit("leave-room", roomId, peerId)
      setIsJoined(false)
      setRemoteStreams([])
      toast.info(`Left room: ${roomId}`)
    }
  }, [socket, roomId, peerId])

  /**
   * Assigns the remote stream to the corresponding video element.
   * @param id - The PeerJS ID of the remote user.
   * @param remoteStream - The MediaStream of the remote user.
   */
  const assignRemoteVideo = useCallback((id: string, remoteStream: MediaStream) => {
    const videoElement = remoteVideoRefs.current[id]
    if (videoElement) {
      videoElement.srcObject = remoteStream
    }
  }, [])

  // **Effect to Assign Remote Streams to Video Elements**
  useEffect(() => {
    remoteStreams.forEach((remote) => {
      assignRemoteVideo(remote.id, remote.stream)
    })
  }, [remoteStreams, assignRemoteVideo])

  // **Cleanup Remote Streams on Unmount**
  useEffect(() => {
    return () => {
      remoteStreams.forEach((remote) => {
        remote.stream.getTracks().forEach((track) => track.stop())
      })
    }
  }, [remoteStreams])

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Toast Notifications */}
      <ToastContainer />

      {/* Page Title */}
      <h1 className="text-3xl font-bold mb-8 text-center">Video Call</h1>

      {/* Controls: Room ID, Join/Leave, Start/Stop Video */}
      <div className="mb-6 flex flex-col sm:flex-row items-center justify-center gap-4">
        {/* Room ID Input */}
        <Input
          type="text"
          placeholder="Enter Room ID"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          className="w-full sm:w-auto"
        />

        {/* Join Room Button */}
        <Button onClick={joinRoom} disabled={!stream || isJoined}>
          Join Room
        </Button>

        {/* Leave Room Button */}
        {isJoined && (
          <Button onClick={leaveRoom} variant="destructive">
            Leave Room
          </Button>
        )}

        {/* Start/Stop Video Button */}
        <Button onClick={toggleVideo}>
          {isVideoStarted ? "Stop Video" : "Start Video"}
        </Button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-500 text-white rounded">
          <p>{error}</p>
        </div>
      )}

      {/* Video Streams Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Local Video */}
        <div className="flex flex-col items-center">
          <h2 className="text-xl font-semibold mb-2">Your Video</h2>
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full max-w-xs h-auto bg-black rounded"
          />
        </div>

        {/* Remote Videos */}
        {remoteStreams.map((remote) => (
          <div key={remote.id} className="flex flex-col items-center">
            <h2 className="text-xl font-semibold mb-2">Remote User: {remote.id}</h2>
            <video
              ref={(el) => {
                remoteVideoRefs.current[remote.id] = el
              }}
              autoPlay
              playsInline
              className="w-full max-w-xs h-auto bg-black rounded"
            />
          </div>
        ))}
      </div>
    </div>
  )
}
