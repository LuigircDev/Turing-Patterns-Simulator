import { useEffect, useRef, useCallback } from "react";

export function useReactionDiffusion(canvasRef, width = 200, height = 200, feedInit = 0.0600, killInit = 0.0450, colorFuncInit, speedInit = 1) {
  const grid = useRef([]);
  const next = useRef([]);
  const dA = 1.0;
  const dB = 0.25;

  const feedRef = useRef(feedInit);
  const killRef = useRef(killInit);
  const colorFuncRef = useRef(colorFuncInit || defaultColor);
  const speedRef = useRef(speedInit);

  const resetGrid = useCallback(() => {
    grid.current = [];
    next.current = [];
    for (let x = 0; x < width; x++) {
      grid.current[x] = [];
      next.current[x] = [];
      for (let y = 0; y < height; y++) {
        grid.current[x][y] = { a: 1, b: 0 };
        next.current[x][y] = { a: 1, b: 0 };
      }
    }

    // Sembrar una manchita
    for (let i = width / 2 - 10; i < width / 2 + 10; i++) {
      for (let j = height / 2 - 10; j < height / 2 + 10; j++) {
        grid.current[i][j].b = 1;
      }
    }
  }, [width, height]);

  useEffect(() => {
    resetGrid();
  }, [resetGrid]);

  // ⚡ Observamos los cambios de feed/kill/colorFunc/speed
  useEffect(() => {
    feedRef.current = feedInit;
  }, [feedInit]);

  useEffect(() => {
    killRef.current = killInit;
  }, [killInit]);

  useEffect(() => {
    colorFuncRef.current = colorFuncInit || defaultColor;
  }, [colorFuncInit]);

  useEffect(() => {
    speedRef.current = speedInit;
  }, [speedInit]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");

    const draw = () => {
      // Ejecutar múltiples iteraciones según el valor de velocidad
      for (let iter = 0; iter < speedRef.current; iter++) {
        for (let x = 1; x < width - 1; x++) {
          for (let y = 1; y < height - 1; y++) {
            let a = grid.current[x][y].a;
            let b = grid.current[x][y].b;
            const lapA = laplacian(x, y, 'a');
            const lapB = laplacian(x, y, 'b');

            const reaction = a * b * b;
            next.current[x][y].a = a + (dA * lapA - reaction + feedRef.current * (1 - a));
            next.current[x][y].b = b + (dB * lapB + reaction - (killRef.current + feedRef.current) * b);

            next.current[x][y].a = Math.min(Math.max(next.current[x][y].a, 0), 1);
            next.current[x][y].b = Math.min(Math.max(next.current[x][y].b, 0), 1);
          }
        }
        [grid.current, next.current] = [next.current, grid.current];
      }

      // Renderizar después de todas las iteraciones
      for (let x = 1; x < width - 1; x++) {
        for (let y = 1; y < height - 1; y++) {
          const colorFunc = typeof colorFuncRef.current === "function" ? colorFuncRef.current : defaultColor;
          const color = colorFunc(grid.current[x][y].a, grid.current[x][y].b);

          ctx.fillStyle = color;
          ctx.fillRect(x, y, 1, 1);
        }
      }

      requestAnimationFrame(draw);
    };

    const laplacian = (x, y, field) => {
      let sum = 0;
      sum += grid.current[x][y][field] * -1;
      sum += grid.current[x-1][y][field] * 0.2;
      sum += grid.current[x+1][y][field] * 0.2;
      sum += grid.current[x][y-1][field] * 0.2;
      sum += grid.current[x][y+1][field] * 0.2;
      sum += grid.current[x-1][y-1][field] * 0.05;
      sum += grid.current[x+1][y-1][field] * 0.05;
      sum += grid.current[x-1][y+1][field] * 0.05;
      sum += grid.current[x+1][y+1][field] * 0.05;
      return sum;
    };

    draw();
  }, [canvasRef, width, height]);

  return { resetGrid };
}

const defaultColor = (a, b) => {
  const c = Math.floor((a - b) * 255);
  return `rgb(${c}, ${c}, ${c})`;
};