'use client'

// r3f v8 は React 18.2 系で動作する
import { Suspense, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, ContactShadows, Float } from '@react-three/drei'
import type { Group, Mesh } from 'three'

export type CharacterMood = 'idle' | 'speaking' | 'correct' | 'wrong'

function Character({ mood }: { mood: CharacterMood }) {
  const root = useRef<Group>(null)
  const head = useRef<Group>(null)
  const mouth = useRef<Mesh>(null)
  const leftArm = useRef<Group>(null)
  const rightArm = useRef<Group>(null)

  useFrame((state) => {
    const t = state.clock.getElapsedTime()

    // ゆったりとした待機の揺れ
    if (root.current) {
      root.current.position.y = Math.sin(t * 1.4) * 0.06
      root.current.rotation.y = Math.sin(t * 0.5) * 0.12
    }

    if (head.current) {
      if (mood === 'speaking') {
        // 話しているときは頭をリズミカルに動かす
        head.current.rotation.z = Math.sin(t * 9) * 0.05
        head.current.position.y = 0.9 + Math.abs(Math.sin(t * 8)) * 0.03
      } else if (mood === 'correct') {
        head.current.rotation.z = Math.sin(t * 6) * 0.15
        head.current.position.y = 0.9
      } else if (mood === 'wrong') {
        head.current.rotation.z = 0
        head.current.rotation.x = 0.15
        head.current.position.y = 0.86
      } else {
        head.current.rotation.z = 0
        head.current.rotation.x = 0
        head.current.position.y = 0.9
      }
    }

    // 口パク
    if (mouth.current) {
      const talking = mood === 'speaking'
      const open = talking ? 0.35 + Math.abs(Math.sin(t * 12)) * 0.65 : mood === 'correct' ? 0.8 : 0.25
      mouth.current.scale.y = open
    }

    // 腕の動き
    if (leftArm.current && rightArm.current) {
      if (mood === 'correct') {
        // 正解でバンザイ
        leftArm.current.rotation.z = 2.2 + Math.sin(t * 10) * 0.1
        rightArm.current.rotation.z = -2.2 - Math.sin(t * 10) * 0.1
      } else if (mood === 'speaking') {
        leftArm.current.rotation.z = 0.6 + Math.sin(t * 6) * 0.2
        rightArm.current.rotation.z = -0.6 - Math.sin(t * 6) * 0.2
      } else {
        leftArm.current.rotation.z = 0.5
        rightArm.current.rotation.z = -0.5
      }
    }
  })

  const bodyColor = mood === 'wrong' ? '#8a94a6' : '#4a6cf7'
  const accentColor = mood === 'correct' ? '#22c55e' : mood === 'wrong' ? '#ef4444' : '#7aa2ff'

  return (
    <group ref={root} position={[0, -0.4, 0]}>
      {/* 体 */}
      <mesh castShadow position={[0, 0.1, 0]}>
        <capsuleGeometry args={[0.55, 0.5, 8, 24]} />
        <meshStandardMaterial color={bodyColor} roughness={0.35} metalness={0.15} />
      </mesh>

      {/* おなかのパネル */}
      <mesh position={[0, 0.1, 0.5]}>
        <circleGeometry args={[0.28, 32]} />
        <meshStandardMaterial color={accentColor} emissive={accentColor} emissiveIntensity={0.4} />
      </mesh>

      {/* 腕 */}
      <group ref={leftArm} position={[-0.6, 0.25, 0]}>
        <mesh castShadow position={[-0.15, -0.2, 0]}>
          <capsuleGeometry args={[0.11, 0.35, 6, 12]} />
          <meshStandardMaterial color={bodyColor} roughness={0.4} />
        </mesh>
      </group>
      <group ref={rightArm} position={[0.6, 0.25, 0]}>
        <mesh castShadow position={[0.15, -0.2, 0]}>
          <capsuleGeometry args={[0.11, 0.35, 6, 12]} />
          <meshStandardMaterial color={bodyColor} roughness={0.4} />
        </mesh>
      </group>

      {/* 頭 */}
      <group ref={head} position={[0, 0.9, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[0.5, 32, 32]} />
          <meshStandardMaterial color="#f4f6fb" roughness={0.25} metalness={0.1} />
        </mesh>

        {/* バイザー（目のまわり） */}
        <mesh position={[0, 0.05, 0.34]}>
          <boxGeometry args={[0.62, 0.28, 0.35]} />
          <meshStandardMaterial color="#1f2a44" roughness={0.2} metalness={0.4} />
        </mesh>

        {/* 目 */}
        <mesh position={[-0.15, 0.06, 0.55]}>
          <sphereGeometry args={[0.07, 16, 16]} />
          <meshStandardMaterial color={accentColor} emissive={accentColor} emissiveIntensity={1.2} />
        </mesh>
        <mesh position={[0.15, 0.06, 0.55]}>
          <sphereGeometry args={[0.07, 16, 16]} />
          <meshStandardMaterial color={accentColor} emissive={accentColor} emissiveIntensity={1.2} />
        </mesh>

        {/* 口 */}
        <mesh ref={mouth} position={[0, -0.22, 0.46]}>
          <capsuleGeometry args={[0.05, 0.14, 4, 8]} />
          <meshStandardMaterial color="#1f2a44" />
        </mesh>

        {/* アンテナ */}
        <mesh position={[0, 0.55, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 0.25, 8]} />
          <meshStandardMaterial color="#c7d0e0" metalness={0.6} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.72, 0]}>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshStandardMaterial color={accentColor} emissive={accentColor} emissiveIntensity={1.5} />
        </mesh>
      </group>
    </group>
  )
}

export function RiddleCharacter({ mood }: { mood: CharacterMood }) {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [0, 0.6, 4], fov: 40 }}
      style={{ width: '100%', height: '100%' }}
    >
      <color attach="background" args={['#0b1020']} />
      <fog attach="fog" args={['#0b1020', 5, 11]} />

      <ambientLight intensity={0.5} />
      <directionalLight position={[3, 5, 4]} intensity={1.4} castShadow shadow-mapSize={[1024, 1024]} />
      <pointLight position={[-4, 2, -2]} intensity={30} color="#4a6cf7" />

      <Suspense fallback={null}>
        <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.4}>
          <Character mood={mood} />
        </Float>
        <ContactShadows position={[0, -1.1, 0]} opacity={0.5} scale={6} blur={2.4} far={3} />
        <Environment preset="city" />
      </Suspense>
    </Canvas>
  )
}
