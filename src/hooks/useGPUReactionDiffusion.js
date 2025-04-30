import { useEffect, useRef, useCallback } from "react";
import * as THREE from "three";

// Shader para calcular la reacción-difusión
const fragmentShaderCompute = `
  uniform sampler2D tSource;
  uniform float dA;
  uniform float dB;
  uniform float feed;
  uniform float kill;
  uniform vec2 resolution;

  void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    
    // Tamaño de un pixel en coordenadas UV
    vec2 pixel = 1.0 / resolution.xy;
    
    // Valores centrales
    vec4 center = texture2D(tSource, uv);
    float a = center.r;
    float b = center.g;
    
    // Laplaciano usando convolucion 3x3
    float lapA = 0.0;
    float lapB = 0.0;
    
    // Núcleo de Laplace con pesos
    // Centro: -1, Caras: 0.2, Esquinas: 0.05
    lapA -= center.r;
    lapB -= center.g;
    
    // Caras
    vec4 n = texture2D(tSource, uv + vec2(0.0, pixel.y));  
    lapA += 0.2 * n.r;
    lapB += 0.2 * n.g;
    
    vec4 s = texture2D(tSource, uv + vec2(0.0, -pixel.y));
    lapA += 0.2 * s.r;
    lapB += 0.2 * s.g;
    
    vec4 e = texture2D(tSource, uv + vec2(pixel.x, 0.0));
    lapA += 0.2 * e.r;
    lapB += 0.2 * e.g;
    
    vec4 w = texture2D(tSource, uv + vec2(-pixel.x, 0.0));
    lapA += 0.2 * w.r;
    lapB += 0.2 * w.g;
    
    // Esquinas
    vec4 ne = texture2D(tSource, uv + vec2(pixel.x, pixel.y));
    lapA += 0.05 * ne.r;
    lapB += 0.05 * ne.g;
    
    vec4 nw = texture2D(tSource, uv + vec2(-pixel.x, pixel.y));
    lapA += 0.05 * nw.r;
    lapB += 0.05 * nw.g;
    
    vec4 se = texture2D(tSource, uv + vec2(pixel.x, -pixel.y));
    lapA += 0.05 * se.r;
    lapB += 0.05 * se.g;
    
    vec4 sw = texture2D(tSource, uv + vec2(-pixel.x, -pixel.y));
    lapA += 0.05 * sw.r;
    lapB += 0.05 * sw.g;
    
    // Ecuación de reacción-difusión
    float reaction = a * b * b;
    float newA = a + (dA * lapA - reaction + feed * (1.0 - a));
    float newB = b + (dB * lapB + reaction - (kill + feed) * b);
    
    // Limitar valores entre 0 y 1
    newA = clamp(newA, 0.0, 1.0);
    newB = clamp(newB, 0.0, 1.0);
    
    gl_FragColor = vec4(newA, newB, 0.0, 1.0);
  }
`;

// Shader para visualizar el resultado
const fragmentShaderRender = `
  uniform sampler2D tSource;
  uniform bool useFunkyColor;
  uniform vec2 resolution;
  
  void main() {
    vec4 texel = texture2D(tSource, gl_FragCoord.xy / resolution.xy);
    float a = texel.r;
    float b = texel.g;
    
    if (useFunkyColor) {
      // Funky color
      float r = 255.0 * (a * b);
      float g = 255.0 * (1.0 - a);
      float blue = 255.0 * (1.0 - b);
      gl_FragColor = vec4(r/255.0, g/255.0, blue/255.0, 1.0);
    } else {
      // Default color
      float c = (a - b) * 1.0;
      gl_FragColor = vec4(c, c, c, 1.0);
    }
  }
`;

// Vertex shader básico para la renderización de pantalla completa
const vertexShader = `
  void main() {
    gl_Position = vec4(position, 1.0);
  }
`;

export function useReactionDiffusionGPU(canvasRef, width = 200, height = 200, feedInit = 0.0600, killInit = 0.0450, colorFuncInit, speedInit = 1) {
  const feedRef = useRef(feedInit);
  const killRef = useRef(killInit);
  const colorFuncRef = useRef(colorFuncInit);
  const speedRef = useRef(speedInit);
  
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rtTexturesRef = useRef([]);
  const materialRef = useRef(null);
  const computeMaterialRef = useRef(null);
  const quadRef = useRef(null);
  const animationFrameRef = useRef(null);
  
  // Inicializar la escena de Three.js
  const initThreeJs = useCallback(() => {
    if (!canvasRef.current) return;
    
    // Crear renderer
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      preserveDrawingBuffer: true,
      alpha: true
    });
    renderer.setSize(width, height);
    rendererRef.current = renderer;
    
    // Crear escena y cámara
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    
    // Cámara ortográfica que mapea el espacio NDC (-1 a 1) al espacio de pantalla
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    cameraRef.current = camera;
    
    // Crear texturas de renderizado
    const rtTextures = [];
    for (let i = 0; i < 2; i++) {
      const rtTexture = new THREE.WebGLRenderTarget(width, height, {
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
        format: THREE.RGBAFormat,
        type: THREE.FloatType,
        stencilBuffer: false
      });
      rtTextures.push(rtTexture);
    }
    rtTexturesRef.current = rtTextures;
    
    // Crear material para computación
    const computeMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tSource: { value: null },
        dA: { value: 1.0 },
        dB: { value: 0.25 },
        feed: { value: feedRef.current },
        kill: { value: killRef.current },
        resolution: { value: new THREE.Vector2(width, height) }
      },
      fragmentShader: fragmentShaderCompute,
      vertexShader: vertexShader
    });
    computeMaterialRef.current = computeMaterial;
    
    // Crear material para renderizado
    const material = new THREE.ShaderMaterial({
      uniforms: {
        tSource: { value: null },
        useFunkyColor: { value: colorFuncRef.current === funkyColor },
        resolution: { value: new THREE.Vector2(width, height) }
      },
      fragmentShader: fragmentShaderRender,
      vertexShader: vertexShader
    });
    materialRef.current = material;
    
    // Crear quad - usamos una geometría de un cuadrado que ocupa toda la pantalla (-1 a 1)
    const quad = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      material
    );
    // No necesitamos mover en z porque la cámara está en z=0 y mirando hacia -z
    scene.add(quad);
    quadRef.current = quad;
    
    // Iniciar texturas con valores por defecto
    resetGrid();
  }, [width, height, canvasRef]);
  
  // Función para resetear la grid
  const resetGrid = useCallback(() => {
    if (!rtTexturesRef.current[0] || !rendererRef.current || !cameraRef.current) return;
    
    const renderer = rendererRef.current;
    const camera = cameraRef.current;
    const tempScene = new THREE.Scene();
    const tempMaterial = new THREE.ShaderMaterial({
      uniforms: {
        resolution: { value: new THREE.Vector2(width, height) }
      },
      fragmentShader: `
        uniform vec2 resolution;
        
        void main() {
          vec2 uv = gl_FragCoord.xy / resolution.xy;
          
          // Todo inicialmente a 1,0 (a=1, b=0)
          float a = 1.0;
          float b = 0.0;
          
          // Sembrar una manchita en el centro
          vec2 center = vec2(0.5, 0.5);
          float dist = distance(uv, center);
          if (dist < 0.05) {
            b = 1.0;
          }
          
          gl_FragColor = vec4(a, b, 0.0, 1.0);
        }
      `,
      vertexShader: vertexShader  // Now available in this scope
    });
    
    const tempQuad = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      tempMaterial
    );
    tempScene.add(tempQuad);
    
    // Reiniciar ambas texturas para evitar problemas de estado
    for (let i = 0; i < rtTexturesRef.current.length; i++) {
      renderer.setRenderTarget(rtTexturesRef.current[i]);
      renderer.render(tempScene, camera);
    }
    
    renderer.setRenderTarget(null);
    
    // Limpiar recursos temporales
    tempQuad.geometry.dispose();
    tempMaterial.dispose();
  }, [width, height]);
  
  // Observar cambios en los parámetros
  useEffect(() => {
    feedRef.current = feedInit;
    if (computeMaterialRef.current) {
      computeMaterialRef.current.uniforms.feed.value = feedInit;
    }
  }, [feedInit]);
  
  useEffect(() => {
    killRef.current = killInit;
    if (computeMaterialRef.current) {
      computeMaterialRef.current.uniforms.kill.value = killInit;
    }
  }, [killInit]);
  
  useEffect(() => {
    colorFuncRef.current = colorFuncInit;
    if (materialRef.current) {
      materialRef.current.uniforms.useFunkyColor.value = colorFuncInit === funkyColor;
    }
  }, [colorFuncInit]);
  
  useEffect(() => {
    speedRef.current = speedInit;
  }, [speedInit]);
  
  // Iniciar Three.js
  useEffect(() => {
    initThreeJs();
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      // Limpiar recursos
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
      if (rtTexturesRef.current) {
        rtTexturesRef.current.forEach(rt => rt.dispose());
      }
      if (computeMaterialRef.current) {
        computeMaterialRef.current.dispose();
      }
      if (materialRef.current) {
        materialRef.current.dispose();
      }
      if (quadRef.current) {
        quadRef.current.geometry.dispose();
      }
    };
  }, [initThreeJs]);
  
  // Animación
  useEffect(() => {
    if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return;
    
    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const computeMaterial = computeMaterialRef.current;
    const material = materialRef.current;
    const rtTextures = rtTexturesRef.current;
    
    let current = 0;
    let next = 1;
    
    const animate = () => {
      // Ejecutar múltiples iteraciones según el valor de velocidad
      for (let i = 0; i < speedRef.current; i++) {
        // Actualizar texturas para computación
        computeMaterial.uniforms.tSource.value = rtTextures[current].texture;
        
        // Renderizar a la textura destino
        quadRef.current.material = computeMaterial;
        renderer.setRenderTarget(rtTextures[next]);
        renderer.render(scene, camera);
        renderer.setRenderTarget(null);
        
        // Intercambiar texturas
        [current, next] = [next, current];
      }
      
      // Renderizar a la pantalla con el material de visualización
      material.uniforms.tSource.value = rtTextures[current].texture;
      quadRef.current.material = material;
      renderer.setRenderTarget(null);
      renderer.render(scene, camera);
      
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);
  
  return { resetGrid };
}

// Funciones de color (para compatibilidad y referencia)
export const defaultColor = (a, b) => {
  const c = Math.floor((a - b) * 255);
  return `rgb(${c}, ${c}, ${c})`;
};

export const funkyColor = (a, b) => {
  const r = Math.floor(255 * (a * b));
  const g = Math.floor(255 * (1 - a));
  const bCol = Math.floor(255 * (1 - b));
  return `rgb(${r}, ${g}, ${bCol})`;
};