// -Path: "client/src/components/3d/CameraController.tsx"
import { useFrame, useThree } from '@react-three/fiber';
import { useRef, useEffect } from 'react';
import * as THREE from 'three';

interface CameraControllerProps {
    orientation: 'w' | 'b';
}

export default function CameraController({
    orientation,
}: CameraControllerProps) {
    const { camera } = useThree();
    const targetPosition = useRef(new THREE.Vector3());
    const targetLookAt = useRef(new THREE.Vector3(3.5, 0, 3.5));

    useEffect(() => {
        if (orientation === 'w') {
            targetPosition.current.set(3.5, 10, 12);
        } else {
            targetPosition.current.set(3.5, 10, -5);
        }
    }, [orientation]);

    useFrame((_, delta) => {
        camera.position.lerp(targetPosition.current, delta * 3);
        const currentLookAt = new THREE.Vector3();
        camera.getWorldDirection(currentLookAt);
        camera.lookAt(targetLookAt.current);
    });

    return null;
}
