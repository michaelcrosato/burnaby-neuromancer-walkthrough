import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { useEffect, useRef, memo } from 'react';
import * as THREE from 'three';
import { useUIStore } from '../store/useUIStore';
import { generateBurnabyTerrain } from '../utils/terrain';

function CanvasAttributeSetter() {
  const { gl } = useThree();
  useEffect(() => {
    if (gl && gl.domElement) {
      gl.domElement.setAttribute('data-testid', 'webgpu-canvas');
    }
  }, [gl]);
  return null;
}

function TerrainMesh() {
  const meshRef = useRef<THREE.Mesh>(null);
  const lastElevationsRef = useRef<number[] | null>(null);
  const lastTectonicOffsetRef = useRef<number>(-999999);
  const lastTectonicVolatilityRef = useRef<number>(-999999);
  const lastTerrainOverrideRef = useRef<any>(undefined);
  const activeColorPalette = useUIStore((state) => state.activeColorPalette);
  
  useFrame(() => {
    if (!meshRef.current) return;
    const geom = meshRef.current.geometry as THREE.PlaneGeometry;
    const posAttr = geom.getAttribute('position') as THREE.BufferAttribute;
    if (!posAttr) return;

    const state = useUIStore.getState();
    const { tectonicOffset, tectonicVolatility } = state;
    const terrainOverride = typeof window !== 'undefined' ? (window as any).__terrain_override : undefined;

    const inputsChanged =
      tectonicOffset !== lastTectonicOffsetRef.current ||
      tectonicVolatility !== lastTectonicVolatilityRef.current ||
      terrainOverride !== lastTerrainOverrideRef.current ||
      !lastElevationsRef.current;

    if (inputsChanged) {
      lastTectonicOffsetRef.current = tectonicOffset;
      lastTectonicVolatilityRef.current = tectonicVolatility;
      lastTerrainOverrideRef.current = terrainOverride;

      // Translate the mesh vertically
      meshRef.current.position.y = tectonicOffset * tectonicVolatility;

      const elevations = generateBurnabyTerrain();

      // Apply height displacement and normals computation only when elevations change
      const hasChanged = !lastElevationsRef.current || elevations.some((val, idx) => val !== lastElevationsRef.current![idx]);
      if (hasChanged) {
        for (let i = 0; i < 256; i++) {
          const baseHeight = elevations[i] ?? 0.0;
          posAttr.setZ(i, baseHeight);
        }
        posAttr.needsUpdate = true;
        geom.computeVertexNormals();
        lastElevationsRef.current = elevations;
      }
    }
  });

  const wireframeColor = activeColorPalette === 'magenta' ? '#d946ef' : '#06b6d4';

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[20, 20, 15, 15]} />
      <meshStandardMaterial
        color={wireframeColor}
        wireframe
      />
    </mesh>
  );
}

function Viewport() {
  return (
    <Canvas camera={{ position: [0, 5, 10] }} data-testid="webgpu-canvas">
      <CanvasAttributeSetter />
      <ambientLight intensity={1.5} />
      <pointLight position={[10, 10, 10]} />
      <TerrainMesh />
    </Canvas>
  );
}

export default memo(Viewport);
