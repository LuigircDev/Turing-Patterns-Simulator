import { useRef, useState, useEffect } from "react";
import { useReactionDiffusionGPU, defaultColor, funkyColor } from "./hooks/useGPUReactionDiffusion";

function App() {
  const canvasRef = useRef(null);
  const [feed, setFeed] = useState(0.055);
  const [kill, setKill] = useState(0.062);
  const [canvasSize, setCanvasSize] = useState(400);
  const [speed, setSpeed] = useState(1);
  const [colorMode, setColorMode] = useState("default");
  const [resetTrigger, setResetTrigger] = useState(0); // Nuevo estado para forzar reinicio
  
  const { resetGrid } = useReactionDiffusionGPU(
    canvasRef, 
    canvasSize, 
    canvasSize, 
    feed, 
    kill, 
    colorMode === "funky" ? funkyColor : defaultColor,
    speed
  );

  // Llamamos a resetGrid cuando cambia resetTrigger
  useEffect(() => {
    if (resetTrigger > 0) {
      resetGrid();
    }
  }, [resetTrigger, resetGrid]);
  
  const reset = () => {
    // Incrementar el trigger para forzar el reinicio
    setResetTrigger(prev => prev + 1);
  };
  
  const randomize = () => {
    // Genera nuevos parámetros aleatorios y reinicia
    setFeed(Math.random() * 0.09 + 0.01);
    setKill(Math.random() * 0.04 + 0.03);
    setResetTrigger(prev => prev + 1);
  };

  const toggleSize = () => {
    setCanvasSize(prev => (prev === 200 ? 600 : 200));
  };

  const toggleColor = () => {
    setColorMode(prev => (prev === "default" ? "funky" : "default"));
  };

  return (
    <div className="min-h-screen bg-gradient-to-tr from-gray-900 via-gray-800 to-gray-900 flex flex-col items-center justify-center p-8 gap-8">
      <h1 className="text-4xl font-mono text-white">
        Turing Patterns Simulator 🎨 (GPU Edition)
      </h1>

      <canvas
        ref={canvasRef}
        className="border-4 border-cyan-400 rounded-xl shadow-lg"
        width={canvasSize}
        height={canvasSize}
      />

      <div className="bg-gray-800 p-6 rounded-lg shadow-md flex flex-col gap-4 w-80">
        <div className="flex flex-col">
          <label className="text-cyan-400 font-mono mb-1">Feed: {feed.toFixed(4)}</label>
          <input
            type="range"
            min="0.01"
            max="0.1"
            step="0.001"
            value={feed}
            onChange={(e) => setFeed(parseFloat(e.target.value))}
            className="w-full accent-cyan-400"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-cyan-400 font-mono mb-1">Kill: {kill.toFixed(4)}</label>
          <input
            type="range"
            min="0.03"
            max="0.07"
            step="0.001"
            value={kill}
            onChange={(e) => setKill(parseFloat(e.target.value))}
            className="w-full accent-cyan-400"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-cyan-400 font-mono mb-1">Velocidad: {speed}x</label>
          <input
            type="range"
            min="1"
            max="20"
            step="1"
            value={speed}
            onChange={(e) => setSpeed(parseInt(e.target.value))}
            className="w-full accent-cyan-400"
          />
        </div>

        <div className="flex flex-col gap-2 pt-4">
          <button
            onClick={reset}
            className="bg-cyan-600 hover:bg-cyan-500 text-white font-mono py-2 rounded-lg transition"
          >
            🔄 Reiniciar Simulación
          </button>
          <button
            onClick={randomize}
            className="bg-yellow-600 hover:bg-yellow-500 text-white font-mono py-2 rounded-lg transition"
          >
            🎲 Randomizar Parámetros
          </button>
          <button
            onClick={toggleColor}
            className="bg-pink-600 hover:bg-pink-500 text-white font-mono py-2 rounded-lg transition"
          >
            🎨 Cambiar Color
          </button>
          {/* <button
            onClick={toggleSize}
            className="bg-green-600 hover:bg-green-500 text-white font-mono py-2 rounded-lg transition"
          >
            🖼️ {canvasSize === 200 ? "Wallpaper Mode" : "Normal Mode"}
          </button> */}
        </div>
      </div>
    </div>
  );
}

export default App;