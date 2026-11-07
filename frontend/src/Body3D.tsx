import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

type Props = { region?: string | null };

function Shell({ position, rotation, args }: { position: [number, number, number]; rotation?: [number, number, number]; args: [number, number] }) {
  return (
    <mesh position={position} rotation={rotation}>
      <capsuleGeometry args={[args[0], args[1], 12, 24]} />
      <meshStandardMaterial color="#7fe3dc" transparent opacity={0.16} roughness={0.3} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
  );
}

function Organ({ name, active, position, scale, color }: { name: string; active: boolean; position: [number, number, number]; scale: [number, number, number]; color: string }) {
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    if (!mat.current) return;
    const pulse = active ? 1.2 + Math.sin(clock.elapsedTime * 5) * 0.7 : 0.08;
    mat.current.emissiveIntensity += (pulse - mat.current.emissiveIntensity) * 0.15;
    mat.current.opacity += ((active ? 0.98 : 0.42) - mat.current.opacity) * 0.15;
  });
  return (
    <mesh position={position} scale={scale} name={name}>
      <sphereGeometry args={[1, 24, 24]} />
      <meshStandardMaterial ref={mat} color={color} emissive={color} emissiveIntensity={0.08} transparent opacity={0.42} />
    </mesh>
  );
}

function Vessels({ active }: { active: boolean }) {
  const paths = [
    [[0, 1.05, 0.05], [0, -0.1, 0.05], [-0.26, -1.0, 0.05], [-0.3, -2.3, 0.05]],
    [[0, -0.1, 0.05], [0.26, -1.0, 0.05], [0.3, -2.3, 0.05]],
    [[0, 0.95, 0.05], [-0.62, 0.72, 0.05], [-0.9, -0.2, 0.05]],
    [[0, 0.95, 0.05], [0.62, 0.72, 0.05], [0.9, -0.2, 0.05]],
    [[0, 1.05, 0.05], [0, 1.65, 0.05]],
  ];
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    if (!mat.current) return;
    mat.current.emissiveIntensity = active ? 1.3 + Math.sin(clock.elapsedTime * 5) * 0.7 : 0.15;
    mat.current.opacity = active ? 0.95 : 0.28;
  });
  return (
    <>
      {paths.map((p, i) => {
        const curve = new THREE.CatmullRomCurve3(p.map((v) => new THREE.Vector3(...(v as [number, number, number]))));
        return (
          <mesh key={i}>
            <tubeGeometry args={[curve, 40, active ? 0.035 : 0.022, 8, false]} />
            <meshStandardMaterial ref={i === 0 ? mat : undefined} color="#ff5a4f" emissive="#ff5a4f" emissiveIntensity={active ? 1.5 : 0.15} transparent opacity={active ? 0.95 : 0.28} />
          </mesh>
        );
      })}
    </>
  );
}

function Body({ region }: Props) {
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (group.current) group.current.rotation.y = Math.sin(clock.elapsedTime * 0.45) * 0.5;
  });
  return (
    <group ref={group} position={[0, 0.3, 0]}>
      <mesh position={[0, 2.05, 0]}>
        <sphereGeometry args={[0.42, 32, 32]} />
        <meshStandardMaterial color="#7fe3dc" transparent opacity={0.16} depthWrite={false} />
      </mesh>
      <Shell position={[0, 1.55, 0]} args={[0.15, 0.2]} />
      <Shell position={[0, 0.45, 0]} args={[0.62, 0.95]} />
      <Shell position={[-0.82, 0.55, 0]} rotation={[0, 0, -0.14]} args={[0.15, 1.05]} />
      <Shell position={[0.82, 0.55, 0]} rotation={[0, 0, 0.14]} args={[0.15, 1.05]} />
      <Shell position={[-1.0, -0.65, 0]} rotation={[0, 0, -0.08]} args={[0.12, 0.95]} />
      <Shell position={[1.0, -0.65, 0]} rotation={[0, 0, 0.08]} args={[0.12, 0.95]} />
      <Shell position={[-0.3, -1.25, 0]} args={[0.22, 1.05]} />
      <Shell position={[0.3, -1.25, 0]} args={[0.22, 1.05]} />
      <Shell position={[-0.31, -2.45, 0]} args={[0.17, 0.95]} />
      <Shell position={[0.31, -2.45, 0]} args={[0.17, 0.95]} />
      <Vessels active={region === 'blood'} />
      <Organ name="heart" active={region === 'heart'} position={[0.08, 0.86, 0.1]} scale={[0.21, 0.24, 0.19]} color="#ff5a4f" />
      <Organ name="pancreas" active={region === 'pancreas'} position={[0, 0.2, 0.15]} scale={[0.33, 0.09, 0.1]} color="#ffc247" />
      <Organ name="kidney-left" active={region === 'kidneys'} position={[-0.3, 0.02, -0.1]} scale={[0.13, 0.2, 0.11]} color="#c67cff" />
      <Organ name="kidney-right" active={region === 'kidneys'} position={[0.3, 0.02, -0.1]} scale={[0.13, 0.2, 0.11]} color="#c67cff" />
    </group>
  );
}

export default function Body3D({ region }: Props) {
  return (
    <Canvas camera={{ position: [0, 0, 7.8], fov: 45 }} dpr={[1, 1.75]}>
      <ambientLight intensity={0.8} />
      <pointLight position={[4, 5, 6]} intensity={70} />
      <pointLight position={[-5, -2, 4]} intensity={35} color="#7fe3dc" />
      <Body region={region} />
    </Canvas>
  );
}
