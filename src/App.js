import { useState } from "react"
import "./App.css"
import { BokehEffectRecording } from "./components/BokehEffectRecording"
import { MaskedBackgroundRecording } from "./components/MaskedBackgroundRecording"

function App() {
  const [isBokeh, setIsBokeh] = useState(true)

  return (
    <div className="App">
      <h2>TF BodyPix Background Manipulation</h2>
      <button onClick={() => setIsBokeh(!isBokeh)}>{isBokeh ? 'Virtual Background' : 'Blur Background'}</button>
      <br/>
      {isBokeh ? <BokehEffectRecording/> : <MaskedBackgroundRecording/>}
    </div>
  )
}
export default App
