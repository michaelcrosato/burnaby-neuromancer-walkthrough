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

function InteractiveGroup({ children }: { children: React.ReactNode }) {
  const groupRef = useRef<THREE.Group>(null);
  const { gl } = useThree();
  const isDragging = useRef(false);
  const previousMouse = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const dom = gl.domElement;
    if (!dom) return;

    const handlePointerDown = (e: PointerEvent) => {
      isDragging.current = true;
      previousMouse.current = { x: e.clientX, y: e.clientY };
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDragging.current || !groupRef.current) return;
      const deltaX = e.clientX - previousMouse.current.x;
      const deltaY = e.clientY - previousMouse.current.y;

      groupRef.current.rotation.y += deltaX * 0.007;
      groupRef.current.rotation.x += deltaY * 0.007;

      // Clamp X rotation to prevent flipping upside down (isometric view constraint)
      groupRef.current.rotation.x = Math.max(-Math.PI / 4, Math.min(Math.PI / 4, groupRef.current.rotation.x));

      previousMouse.current = { x: e.clientX, y: e.clientY };
    };

    const handlePointerUp = () => {
      isDragging.current = false;
    };

    const handleWheel = (e: WheelEvent) => {
      if (!groupRef.current) return;
      e.preventDefault();
      const scaleFactor = e.deltaY < 0 ? 1.05 : 0.95;
      const newScale = groupRef.current.scale.x * scaleFactor;
      if (newScale >= 0.4 && newScale <= 2.5) {
        groupRef.current.scale.setScalar(newScale);
      }
    };

    dom.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    dom.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      dom.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      dom.removeEventListener('wheel', handleWheel);
    };
  }, [gl]);

  return <group ref={groupRef}>{children}</group>;
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
      <InteractiveGroup>
        <TerrainMesh />
      </InteractiveGroup>
    </Canvas>
  );
}

export default memo(Viewport);
