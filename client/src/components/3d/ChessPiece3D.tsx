// -Path: "client/src/components/3d/ChessPiece3D.tsx"
import * as THREE from 'three';
import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';

interface ChessPiece3DProps {
    type: 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
    color: 'w' | 'b';
    position: [number, number, number];
    square: string;
    isSelected?: boolean;
    onSelect?: (square: string) => void;
    onDrop?: (from: string, to: string) => void;
}

const PIECE_HEIGHTS: Record<string, number> = {
    k: 1.2,
    q: 1.1,
    r: 0.8,
    b: 0.9,
    n: 0.85,
    p: 0.6,
};

export default function ChessPiece3D({
    type,
    color,
    position,
    square,
    isSelected,
    onSelect,
}: ChessPiece3DProps) {
    const meshRef = useRef<THREE.Group>(null);
    const [hovered, setHovered] = useState(false);

    const pieceColor = color === 'w' ? '#f5f5f5' : '#2a2a2a';
    const height = PIECE_HEIGHTS[type] || 0.8;

    useFrame((_, delta) => {
        if (meshRef.current) {
            const targetY =
                position[1] + (isSelected ? 0.3 : 0) + (hovered ? 0.1 : 0);
            meshRef.current.position.y = THREE.MathUtils.lerp(
                meshRef.current.position.y,
                targetY,
                delta * 10,
            );

            if (isSelected) {
                meshRef.current.rotation.y += delta * 2;
            } else {
                meshRef.current.rotation.y = THREE.MathUtils.lerp(
                    meshRef.current.rotation.y,
                    0,
                    delta * 5,
                );
            }
        }
    });

    return (
        <group
            ref={meshRef}
            position={position}
            onClick={(e) => {
                e.stopPropagation();
                onSelect?.(square);
            }}
            onPointerOver={(e) => {
                e.stopPropagation();
                setHovered(true);
                document.body.style.cursor = 'pointer';
            }}
            onPointerOut={() => {
                setHovered(false);
                document.body.style.cursor = 'auto';
            }}
        >
            {/* Base */}
            <mesh position={[0, 0.05, 0]}>
                <cylinderGeometry args={[0.35, 0.4, 0.1, 32]} />
                <meshStandardMaterial
                    color={pieceColor}
                    metalness={0.3}
                    roughness={0.4}
                />
            </mesh>

            {/* Body */}
            <mesh position={[0, height / 2 + 0.1, 0]}>
                <cylinderGeometry args={[0.25, 0.3, height, 32]} />
                <meshStandardMaterial
                    color={pieceColor}
                    metalness={0.3}
                    roughness={0.4}
                />
            </mesh>

            {/* Top decoration based on piece type */}
            {type === 'k' && (
                <mesh position={[0, height + 0.25, 0]}>
                    <boxGeometry args={[0.15, 0.3, 0.15]} />
                    <meshStandardMaterial
                        color={pieceColor}
                        metalness={0.3}
                        roughness={0.4}
                    />
                </mesh>
            )}

            {type === 'q' && (
                <mesh position={[0, height + 0.2, 0]}>
                    <sphereGeometry args={[0.15, 32, 32]} />
                    <meshStandardMaterial
                        color={pieceColor}
                        metalness={0.5}
                        roughness={0.3}
                    />
                </mesh>
            )}

            {type === 'r' && (
                <mesh position={[0, height + 0.15, 0]}>
                    <boxGeometry args={[0.35, 0.2, 0.35]} />
                    <meshStandardMaterial
                        color={pieceColor}
                        metalness={0.3}
                        roughness={0.4}
                    />
                </mesh>
            )}

            {type === 'b' && (
                <mesh
                    position={[0, height + 0.2, 0]}
                    rotation={[0, 0, Math.PI / 4]}
                >
                    <coneGeometry args={[0.15, 0.4, 4]} />
                    <meshStandardMaterial
                        color={pieceColor}
                        metalness={0.3}
                        roughness={0.4}
                    />
                </mesh>
            )}

            {type === 'n' && (
                <mesh
                    position={[0.1, height + 0.15, 0]}
                    rotation={[0, 0, Math.PI / 6]}
                >
                    <boxGeometry args={[0.15, 0.35, 0.25]} />
                    <meshStandardMaterial
                        color={pieceColor}
                        metalness={0.3}
                        roughness={0.4}
                    />
                </mesh>
            )}

            {/* Selection/Hover glow */}
            {(isSelected || hovered) && (
                <pointLight
                    position={[0, height / 2, 0]}
                    color={isSelected ? '#ffff00' : '#ffffff'}
                    intensity={isSelected ? 2 : 1}
                    distance={2}
                />
            )}
        </group>
    );
}
