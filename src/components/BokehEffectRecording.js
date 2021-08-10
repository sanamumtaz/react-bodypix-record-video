import { useEffect, useRef, useCallback, useState } from "react"
import * as tf from "@tensorflow/tfjs"
import * as bodyPix from "@tensorflow-models/body-pix"

export const BokehEffectRecording = () => {
  const [isRecording, setIsRecording] = useState(false)
  const frameId = useRef(null)
  const canvasReference = useRef(null)
  const videoRef = useRef(null)
  const recordedVideoRef = useRef(null)
  const mediaRecorderRef = useRef(null)

  const setupCamera = useCallback(async (videoElement) => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: 640,
        height: 480,
        facingMode: "user",
      },
      audio: true,
    })
    videoElement.srcObject = stream
    return new Promise((resolve) => {
      videoElement.onloadedmetadata = () => {
        videoElement.play()
        resolve()
      }
    })
  }, [])

  const segmentBodyAndBlur = useCallback(
    (videoInput, canvasOutput, bodypixnet) => {
      async function renderFrame() {
        const segmentation = await bodypixnet.segmentPerson(videoInput)
        const backgroundBlurAmount = 4
        const edgeBlurAmount = 3
        const flipHorizontal = false
        bodyPix.drawBokehEffect(
          canvasOutput,
          videoInput,
          segmentation,
          backgroundBlurAmount,
          edgeBlurAmount,
          flipHorizontal
        )
        frameId.current = requestAnimationFrame(renderFrame)
      }
      renderFrame()
    },
    []
  )

  const loadCamAndModel = async () => {
    const videoElement = videoRef.current
    const canvasElement = canvasReference.current
    canvasElement.width = videoElement.width
    canvasElement.height = videoElement.height
    await setupCamera(videoElement)
    tf.getBackend()
    const bodypixnet = await bodyPix.load()
    segmentBodyAndBlur(videoElement, canvasElement, bodypixnet)
  }

  const handleCaptureStream = useCallback(() => {
    setIsRecording(true)
    const stream = canvasReference.current.captureStream()
    mediaRecorderRef.current = new MediaRecorder(stream, {
      mimeType: "video/webm",
    })
    mediaRecorderRef.current.addEventListener("dataavailable", (evt) => {
      const url = URL.createObjectURL(evt.data)
      recordedVideoRef.current.src = url
    })
    mediaRecorderRef.current.start()
  }, [canvasReference, mediaRecorderRef, setIsRecording])

  const handleStopCaptureClick = useCallback(() => {
    mediaRecorderRef.current.stop()
    setIsRecording(false)
  }, [mediaRecorderRef, setIsRecording])

  //cancel requestAnimationFrame on unmount
  const cleanUpFrames = useCallback(() => {
    frameId && cancelAnimationFrame(frameId.current)
  }, [frameId])

  useEffect(() => {
    return () => {
      cleanUpFrames()
    }
  }, [])

  useEffect(() => {
    loadCamAndModel()
  }, [])

  return (
    <>
      <video ref={videoRef} id="input" width="640" height="480" muted></video>
      <canvas
        ref={canvasReference}
        id="canvas"
        style={{
          marginLeft: "auto",
          marginRight: "auto",
          left: 0,
          right: 0,
          textAlign: "center",
          zindex: 9,
          width: 640,
          height: 480,
        }}
      />
      <video ref={recordedVideoRef} controls></video>
      <button
        onClick={isRecording ? handleStopCaptureClick : handleCaptureStream}
      >
        {isRecording ? "Stop" : "Start"}
      </button>
    </>
  )
}
