// -Path: "client/src/components/3d/Chessboard3D.tsx"
import { Canvas } from '@react-three/fiber';
import { Suspense, useMemo, useCallback } from 'react';
import { OrbitControls, Environment } from '@react-three/drei';

import BoardSquare from './BoardSquare';
import ChessPiece3D from './ChessPiece3D';
import CameraController from './CameraController';

interface Chessboard3DProps {
    position: string; // FEN string
    boardOrientation: 'white' | 'black';
    selectedSquare?: string | null;
    legalMoves?: string[];
    premove?: { from: string; to: string } | null;
    lastMove?: { from: string; to: string } | null;
    onSquareClick?: (square: string) => void;
}

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['1', '2', '3', '4', '5', '6', '7', '8'];

const parseFEN = (fen: string) => {
    const pieces: { square: string; type: string; color: 'w' | 'b' }[] = [];
    const [position] = fen.split(' ');
    const rows = position.split('/');

    rows.forEach((row, rankIndex) => {
        let fileIndex = 0;
        for (const char of row) {
            if (/\d/.test(char)) {
                fileIndex += parseInt(char, 10);
            } else {
                const square = `${FILES[fileIndex]}${8 - rankIndex}`;
                const color = char === char.toUpperCase() ? 'w' : 'b';
                const type = char.toLowerCase();
                pieces.push({ square, type, color });
                fileIndex++;
            }
        }
    });

    return pieces;
};

const squareToPosition = (square: string): [number, number, number] => {
    const file = FILES.indexOf(square[0]);
    const rank = parseInt(square[1], 10) - 1;
    return [file, 0, 7 - rank];
};

const isLightSquare = (file: number, rank: number) => (file + rank) % 2 === 1;

export default function Chessboard3D({
    position,
    boardOrientation,
    selectedSquare,
    legalMoves = [],
    premove,
    lastMove,
    onSquareClick,
}: Chessboard3DProps) {
    const pieces = useMemo(() => parseFEN(position), [position]);
    const orientation: 'w' | 'b' = boardOrientation === 'white' ? 'w' : 'b';

    const handleSquareClick = useCallback(
        (square: string) => onSquareClick?.(square),
        [onSquareClick],
    );

    return (
        <div className="w-full h-full rounded-xl overflow-hidden">
            <Canvas
                shadows
                camera={{ position: [3.5, 10, 12], fov: 45 }}
                style={{
                    background:
                        'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)',
                }}
            >
                <Suspense fallback={null}>
                    {/* Lighting */}
                    <ambientLight intensity={0.4} />
                    <directionalLight
                        position={[10, 15, 10]}
                        intensity={1}
                        castShadow
                        shadow-mapSize={[2048, 2048]}
                    />
                    <pointLight
                        position={[-5, 10, -5]}
                        intensity={0.3}
                    />

                    {/* Environment for reflections */}
                    <Environment preset="city" />

                    {/* Camera Controller */}
                    <CameraController orientation={orientation} />

                    {/* Board Base */}
                    <mesh
                        position={[3.5, -0.15, 3.5]}
                        receiveShadow
                    >
                        <boxGeometry args={[9, 0.2, 9]} />
                        <meshStandardMaterial
                            color="#4a3728"
                            metalness={0.2}
                            roughness={0.8}
                        />
                    </mesh>

                    {/* Board Squares */}
                    {FILES.map((file, fileIndex) =>
                        RANKS.map((rank, rankIndex) => {
                            const square = `${file}${rank}`;
                            const pos: [number, number, number] = [
                                fileIndex,
                                0,
                                7 - rankIndex,
                            ];
                            const isLight = isLightSquare(fileIndex, rankIndex);
                            const isHighlighted = square === selectedSquare;
                            const isLegalMove = legalMoves.includes(square);
                            const isPremoveSquare =
                                premove?.from === square ||
                                premove?.to === square;
                            const isLastMoveSquare =
                                lastMove?.from === square ||
                                lastMove?.to === square;

                            return (
                                <BoardSquare
                                    key={square}
                                    square={square}
                                    position={pos}
                                    isLight={isLight}
                                    isHighlighted={isHighlighted}
                                    isLegalMove={isLegalMove}
                                    isPremove={isPremoveSquare}
                                    isLastMove={isLastMoveSquare}
                                    onClick={handleSquareClick}
                                />
                            );
                        }),
                    )}

                    {/* Chess Pieces */}
                    {pieces.map(({ square, type, color }) => {
                        const pos = squareToPosition(square);

                        return (
                            <ChessPiece3D
                                key={`${square}-${type}-${color}`}
                                type={type as 'p' | 'n' | 'b' | 'r' | 'q' | 'k'}
                                color={color}
                                position={pos}
                                square={square}
                                isSelected={square === selectedSquare}
                                onSelect={handleSquareClick}
                            />
                        );
                    })}

                    {/* Orbit Controls for debugging (optional) */}
                    <OrbitControls
                        enablePan={false}
                        minDistance={8}
                        maxDistance={20}
                        minPolarAngle={Math.PI / 6}
                        maxPolarAngle={Math.PI / 2.5}
                        target={[3.5, 0, 3.5]}
                    />
                </Suspense>
            </Canvas>
        </div>
    );
}
