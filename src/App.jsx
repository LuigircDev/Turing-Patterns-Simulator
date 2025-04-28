import { useRef, useState } from "react";
import { useReactionDiffusion } from "./hooks/useReactionDiffusion";

function App() {
  const canvasRef = useRef(null);
  const [feed, setFeed] = useState(0.055);
  const [kill, setKill] = useState(0.062);
  const [speed, setSpeed] = useState(1);
  const [canvasSize, setCanvasSize] = useState(400);
  const [colorFunc, setColorFunc] = useState(defaultColor);

  const { resetGrid } = useReactionDiffusion(canvasRef, canvasSize, canvasSize, feed, kill, colorFunc, speed);

  const randomize = () => {
    setFeed(Math.random() * 0.09 + 0.01);
    setKill(Math.random() * 0.04 + 0.03);
    resetGrid();
  };

  const reset = () => {
    resetGrid();
  };

  const biggerCanvas = () => {
    setCanvasSize(prev => (prev === 200 ? 600 : 200));
  };

  const toggleColor = () => {
    setColorFunc(prev => (prev === defaultColor ? funkyColor : defaultColor));
  };

  return (
    <div className="min-h-screen bg-gradient-to-tr from-gray-900 via-gray-800 to-gray-900 flex flex-col items-center justify-center p-8 gap-8">
      <h1 className="text-4xl font-mono text-white">
        Turing Patterns Simulator 🎨
      </h1>

      <canvas
        ref={canvasRef}
        width={canvasSize}
        height={canvasSize}
        className="border-4 border-cyan-400 rounded-xl shadow-lg"
      ></canvas>

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
            onClick={randomize}
            className="bg-cyan-600 hover:bg-cyan-500 text-white font-mono py-2 rounded-lg transition"
          >
            🎲 Randomize
          </button>
          <button
            onClick={reset}
            className="bg-purple-600 hover:bg-purple-500 text-white font-mono py-2 rounded-lg transition"
          >
            🔄 Reset
          </button>
          <button
            onClick={toggleColor}
            className="bg-pink-600 hover:bg-pink-500 text-white font-mono py-2 rounded-lg transition"
          >
            🎨 Cambiar Color
          </button>
          <button
            onClick={biggerCanvas}
            className="bg-green-600 hover:bg-green-500 text-white font-mono py-2 rounded-lg transition"
          >
            🖼️ {canvasSize === 200 ? "Wallpaper Mode" : "Normal Mode"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;

// Funciones de color
const defaultColor = (a, b) => {
  const c = Math.floor((a - b) * 255);
  return `rgb(${c}, ${c}, ${c})`;
};

const funkyColor = (a, b) => {
  const r = Math.floor(255 * (a * b));
  const g = Math.floor(255 * (1 - a));
  const bCol = Math.floor(255 * (1 - b));
  return `rgb(${r}, ${g}, ${bCol})`;
};