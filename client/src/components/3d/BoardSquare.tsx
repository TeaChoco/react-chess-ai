// -Path: "client/src/components/3d/BoardSquare.tsx"
import * as THREE from 'three';
import { useRef, useState } from 'react';

interface BoardSquareProps {
    position: [number, number, number];
    square: string;
    isLight: boolean;
    isHighlighted?: boolean;
    isLegalMove?: boolean;
    isPremove?: boolean;
    isLastMove?: boolean;
    onClick?: (square: string) => void;
    onDrop?: (square: string) => void;
}

export default function BoardSquare({
    position,
    square,
    isLight,
    isHighlighted,
    isLegalMove,
    isPremove,
    isLastMove,
    onClick,
}: BoardSquareProps) {
    const meshRef = useRef<THREE.Mesh>(null);
    const [hovered, setHovered] = useState(false);

    const getColor = () => {
        if (isPremove) return '#c44';
        if (isHighlighted) return '#ffeb3b';
        if (isLastMove) return '#90caf9';
        if (isLight) return '#f0d9b5';
        return '#b58863';
    };

    return (
        <group position={position}>
            {/* Main Square */}
            <mesh
                ref={meshRef}
                position={[0, -0.05, 0]}
                onClick={(e) => {
                    e.stopPropagation();
                    onClick?.(square);
                }}
                onPointerOver={(e) => {
                    e.stopPropagation();
                    setHovered(true);
                }}
                onPointerOut={() => setHovered(false)}
            >
                <boxGeometry args={[1, 0.1, 1]} />
                <meshStandardMaterial
                    color={getColor()}
                    metalness={0.1}
                    roughness={0.8}
                    emissive={hovered ? '#ffffff' : '#000000'}
                    emissiveIntensity={hovered ? 0.1 : 0}
                />
            </mesh>

            {/* Legal Move Indicator */}
            {isLegalMove && !isHighlighted && (
                <mesh
                    position={[0, 0.01, 0]}
                    rotation={[-Math.PI / 2, 0, 0]}
                >
                    <circleGeometry args={[0.15, 32]} />
                    <meshStandardMaterial
                        color="#4a4a4a"
                        transparent
                        opacity={0.5}
                    />
                </mesh>
            )}

            {/* Capture Indicator (ring) */}
            {isLegalMove && isHighlighted && (
                <mesh
                    position={[0, 0.01, 0]}
                    rotation={[-Math.PI / 2, 0, 0]}
                >
                    <ringGeometry args={[0.35, 0.45, 32]} />
                    <meshStandardMaterial
                        color="#4a4a4a"
                        transparent
                        opacity={0.5}
                    />
                </mesh>
            )}
        </group>
    );
}
