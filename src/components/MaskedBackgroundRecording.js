import { useEffect, useRef, useCallback, useState } from "react"
import * as tf from "@tensorflow/tfjs"
import * as bodyPix from "@tensorflow-models/body-pix"

export const MaskedBackgroundRecording = () => {
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

  const segmentBodyAndAddMask = useCallback(
    (videoInput, canvasOutput, bodypixnet) => {
      const context = canvasOutput.getContext("2d")
      context.clearRect(0, 0, canvasOutput.width, canvasOutput.height)

      const backgroundImg = document.createElement("img")
      backgroundImg.width = "640"
      backgroundImg.height = "480"
      backgroundImg.objectFit = "contain"
      backgroundImg.onload = function () {
        const tempImgCanvas = document.createElement("canvas")
        tempImgCanvas.width = backgroundImg.width
        tempImgCanvas.height = backgroundImg.height
        const tempImgCanvasCtx = tempImgCanvas.getContext("2d")
        tempImgCanvasCtx.drawImage(backgroundImg, 0, 0)
        const {data: imgData} = tempImgCanvasCtx.getImageData(
          0,
          0,
          backgroundImg.width,
          backgroundImg.height
        )

        async function renderMaskFrame() {
          frameId.current = requestAnimationFrame(renderMaskFrame)

          const segmentation = await bodypixnet.segmentPerson(videoInput, {
            internalResolution: 'medium',
          })
          context.drawImage(
            videoInput,
            0,
            0,
            canvasOutput.width,
            canvasOutput.height
          )
          const { data: canvasData } = context.getImageData(
            0,
            0,
            canvasOutput.width,
            canvasOutput.height
          )

          // Creating new image data
          const newBlankCanvas = context.createImageData(
            canvasOutput.width,
            canvasOutput.height
          )
          const newCanvasData = newBlankCanvas.data
          const { data: mapp } = segmentation

          for(let i=0; i<mapp.length; i++) {
            //The data array stores four values for each pixel
            const [r, g, b, a] = [canvasData[i*4], canvasData[i*4+1], canvasData[i*4+2], canvasData[i*4+3]];
            [
              newCanvasData[i*4],
              newCanvasData[i*4+1],
              newCanvasData[i*4+2],
              newCanvasData[i*4+3]
            ] = !mapp[i] ? [imgData[i*4], imgData[i*4+1], imgData[i*4+2], imgData[i*4+3]] : [r, g, b, a];
          }
          console.log(newCanvasData)
          
          // Draw the new image back to canvas
          context.putImageData(newBlankCanvas, 0, 0);
        }
        renderMaskFrame()
      }
      backgroundImg.src = "images/clear.jpg"
    },
    []
  )

  const loadCamAndModel = async () => {
    const videoElement = videoRef.current
    await setupCamera(videoElement)
    const canvasElement = canvasReference.current
    videoElement.width = videoElement.videoWidth
    videoElement.height = videoElement.videoHeight
    canvasElement.width = videoElement.videoWidth
    canvasElement.height = videoElement.videoHeight
    tf.getBackend()
    const bodypixnet = await bodyPix.load()
    segmentBodyAndAddMask(videoElement, canvasElement, bodypixnet)
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
      <video ref={videoRef} id="input" muted></video>
      <canvas
        ref={canvasReference}
        id="canvas"
        style={{
          marginLeft: "auto",
          marginRight: "auto",
          left: 0,
          right: 0,
          textAlign: "center",
          zindex: 9
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
