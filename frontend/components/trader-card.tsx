"use client";

import { useCallback, useEffect, useMemo, useRef, useState, Suspense } from "react";
import { Move, Zap, ShieldCheck, BarChart3, Rocket, RotateCw } from "lucide-react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, RoundedBox, Text } from "@react-three/drei";
import * as THREE from "three";
import { motion, AnimatePresence } from "framer-motion";
import type { User } from "@/lib/types";
import { EffectComposer, Bloom, Noise, Vignette, } from "@react-three/postprocessing";

/* ─────────────────────────────────────────────────────────────────────────────
 * WebGL Detection Helper
 * ────────────────────────────────────────────────────────────────────────── */
function hasWebGL(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
    );
  } catch (e) {
    return false;
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Physics-based draggable card that hangs from a lanyard.
 * Follows cursor position on drag, spring-back bounce on release.
 * Click to flip front/back.
 * ────────────────────────────────────────────────────────────────────────── */

type CardSceneProps = {
  user: User;
  phase: number; // 0 = hidden, 1 = lanyard drop, 2 = card drop, 3 = populate, 4 = glow, 5 = interactive
  onFlipComplete?: () => void;
  flipping: boolean;
  isFlippedFront: boolean;
  onCardClick?: () => void;
};

function LanyardCard({ user, phase, flipping, onFlipComplete, isFlippedFront, onCardClick }: CardSceneProps) {
  const groupRef = useRef<THREE.Group>(null);
  const cardRef = useRef<THREE.Group>(null);
  const lanyardRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const { viewport, pointer } = useThree();

  // Physics state for full drag-to-follow + spring-back
  const physics = useRef({
    // Current card position (offset from center)
    posX: 0,
    posY: 0,
    // Velocity for spring-back
    velX: 0,
    velY: 0,
    // Tilt angles from drag momentum
    tiltX: 0,
    tiltY: 0,
    // Drag state
    dragging: false,
    // Pointer world position when drag started
    dragStartPointerX: 0,
    dragStartPointerY: 0,
    // Card position when drag started
    dragStartPosX: 0,
    dragStartPosY: 0,
    // Previous pointer for velocity calc
    prevPointerX: 0,
    prevPointerY: 0,
    // Click detection
    pointerDownTime: 0,
    pointerDownPos: { x: 0, y: 0 },
  });

  // Card entry animation
  const entryProgress = useRef(0);
  const flipAngle = useRef(0);
  const flipScale = useRef(1);
  // User flip angle (click to flip)
  const userFlipAngle = useRef(0);
  const userFlipTarget = useRef(0);

  // Update flip target when isFlippedFront changes
  useEffect(() => {
    userFlipTarget.current = isFlippedFront ? 0 : Math.PI;
  }, [isFlippedFront]);

  // Drag handlers
  const onPointerDown = useCallback((e: THREE.Event) => {
    if (phase < 5) return;
    (e as any).stopPropagation?.();
    const p = physics.current;
    p.dragging = true;
    p.dragStartPointerX = pointer.x * viewport.width / 2;
    p.dragStartPointerY = pointer.y * viewport.height / 2;
    p.dragStartPosX = p.posX;
    p.dragStartPosY = p.posY;
    p.prevPointerX = pointer.x;
    p.prevPointerY = pointer.y;
    p.velX = 0;
    p.velY = 0;
    // Record for click detection
    p.pointerDownTime = Date.now();
    p.pointerDownPos = { x: pointer.x, y: pointer.y };
  }, [phase, pointer, viewport]);

  const onPointerUp = useCallback((e: THREE.Event) => {
    const p = physics.current;
    if (p.dragging) {
      // Click detection: if pointer barely moved and was quick
      const dx = pointer.x - p.pointerDownPos.x;
      const dy = pointer.y - p.pointerDownPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const elapsed = Date.now() - p.pointerDownTime;
      if (dist < 0.03 && elapsed < 300 && onCardClick) {
        onCardClick();
      }
    }
    p.dragging = false;
  }, [pointer, onCardClick]);

  useEffect(() => {
    const handleUp = () => { physics.current.dragging = false; };
    window.addEventListener("pointerup", handleUp);
    return () => window.removeEventListener("pointerup", handleUp);
  }, []);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const p = physics.current;
    const group = groupRef.current;
    const card = cardRef.current;
    const lanyard = lanyardRef.current;
    const glow = glowRef.current;

    if (!group || !card) return;

    // Entry animation progress
    if (phase >= 1) {
      entryProgress.current = Math.min(entryProgress.current + dt * 1.2, 1);
    }
    const entry = entryProgress.current;

    // Lanyard drop: slides from y=7 to y=2.8
    const lanyardY = THREE.MathUtils.lerp(7, 2.8, easeOutBack(Math.min(entry * 2, 1)));
    // Card drop: appears after lanyard (entry > 0.4)
    const cardEntry = Math.max(0, (entry - 0.4) / 0.6);
    const cardAlpha = easeOutBack(Math.min(cardEntry, 1));

    if (lanyard) {
      lanyard.position.y = lanyardY;
      lanyard.scale.y = THREE.MathUtils.lerp(0, 1, easeOutQuad(Math.min(entry * 2, 1)));
    }

    // Exit flip animation (Launch Trading Terminal)
    if (flipping) {
      flipAngle.current += dt * 6;
      flipScale.current = Math.min(flipScale.current + dt * 2, 4);
      if (flipAngle.current >= Math.PI && onFlipComplete) {
        onFlipComplete();
      }
    }

    // === Full drag-to-follow physics ===
    if (p.dragging && phase >= 5) {
      // Target position = card start pos + (current pointer - start pointer)
      const curPX = pointer.x * viewport.width / 2;
      const curPY = pointer.y * viewport.height / 2;
      const targetX = p.dragStartPosX + (curPX - p.dragStartPointerX);
      const targetY = p.dragStartPosY + (curPY - p.dragStartPointerY);

      // Smooth follow (slight lag for feel)
      p.posX += (targetX - p.posX) * 0.3;
      p.posY += (targetY - p.posY) * 0.3;

      // Tilt from drag velocity
      const dxP = pointer.x - p.prevPointerX;
      const dyP = pointer.y - p.prevPointerY;
      p.tiltY += (dxP * 2.5 - p.tiltY) * 0.15;
      p.tiltX += (-dyP * 2.0 - p.tiltX) * 0.15;

      // Track velocity for spring-back
      p.velX = (curPX - (p.dragStartPosX + (p.prevPointerX * viewport.width / 2 - p.dragStartPointerX))) * 0.5;
      p.velY = (curPY - (p.dragStartPosY + (p.prevPointerY * viewport.height / 2 - p.dragStartPointerY))) * 0.5;

      p.prevPointerX = pointer.x;
      p.prevPointerY = pointer.y;
    } else {
      // Spring-back to center with bounce
      const springK = 4.0;  // spring stiffness
      const damping = 0.88; // damping factor

      // Spring force toward origin
      const fx = -springK * p.posX;
      const fy = -springK * p.posY;

      p.velX += fx * dt;
      p.velY += fy * dt;
      p.velX *= damping;
      p.velY *= damping;
      p.posX += p.velX * dt;
      p.posY += p.velY * dt;

      // Tilt decays
      p.tiltX *= 0.92;
      p.tiltY *= 0.92;

      // Gentle idle sway when settled
      if (phase >= 5 && Math.abs(p.velX) < 0.01 && Math.abs(p.velY) < 0.01) {
        p.posX += Math.sin(Date.now() * 0.0008) * 0.0015;
        p.posY += Math.cos(Date.now() * 0.0006) * 0.001;
      }
    }

    // User flip animation (smooth lerp to target)
    const flipDiff = userFlipTarget.current - userFlipAngle.current;
    userFlipAngle.current += flipDiff * 0.12;

    // Apply transforms
    const pivotY = lanyardY - 2.4;
    group.position.y = pivotY + p.posY;
    group.position.x = p.posX;

    card.position.y = -1.6 * cardAlpha;
    card.scale.setScalar(cardAlpha * flipScale.current);
    card.rotation.y = flipAngle.current + userFlipAngle.current;
    card.rotation.x = p.tiltX * 0.3;
    card.rotation.z = p.tiltY * -0.15;

    // Glow pulse
    if (glow && phase >= 4) {
      const glowAlpha = Math.sin(Date.now() * 0.003) * 0.15 + 0.35;
      (glow.material as THREE.MeshBasicMaterial).opacity = glowAlpha;
    }
  });

  const cardW = 3.2;
  const cardH = 4.0;

  return (
    <group ref={groupRef}>
      {/* Lanyard strap — wider with text */}
      <mesh ref={lanyardRef} position={[0, 3.5, 0]}>
        <boxGeometry args={[0.45, 4.5, 0.03]} />
        <meshStandardMaterial color="#0c0d18" metalness={0.6} roughness={0.4} />
      </mesh>
      {/* Lanyard accent edges */}
      <mesh position={[-0.21, 3.5, 0.016]}>
        <boxGeometry args={[0.015, 4.5, 0.01]} />
        <meshBasicMaterial color="#00ffa3" transparent opacity={0.35} />
      </mesh>
      <mesh position={[0.21, 3.5, 0.016]}>
        <boxGeometry args={[0.015, 4.5, 0.01]} />
        <meshBasicMaterial color="#00ffa3" transparent opacity={0.35} />
      </mesh>
      {/* Lanyard Text — "VOLTREX TERMINAL" rotated */}
      <Text
        position={[0, 3.5, 0.018]}
        fontSize={0.21}
        color="#00ffa3"
        rotation={[0, 0, -Math.PI / 2]}
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.50}
        maxWidth={4.2}
        outlineWidth={0.002}
        outlineColor="#00ffa3"
      >
        VOLTREX TERMINAL
      </Text>

      {/* Lanyard metal clip */}
      <mesh position={[0, 0.35, 0.025]}>
        <boxGeometry args={[0.5, 0.15, 0.05]} />
        <meshStandardMaterial color="#4a4a5a" metalness={0.9} roughness={0.15} />
      </mesh>
      {/* Clip ring */}
      <mesh position={[0, 0.2, 0.03]}>
        <torusGeometry args={[0.08, 0.015, 8, 16]} />
        <meshStandardMaterial color="#5a5a6a" metalness={0.9} roughness={0.2} />
      </mesh>

      {/* Card group — interactive */}
      <group
        ref={cardRef}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
      >


        {/* ═══ FRONT FACE ═══ */}
        {/* Card body — glassmorphism */}
        <RoundedBox args={[cardW, cardH, 0.06]} radius={0.12} smoothness={4}>
          <meshPhysicalMaterial
            color="#071018"
            metalness={0.25}
            roughness={0.12}
            transmission={0.92}
            thickness={1.8}
            ior={1.45}
            clearcoat={1.0}
            clearcoatRoughness={0.02}
            envMapIntensity={1.4}
            side={THREE.FrontSide}
            transparent
            opacity={0.82}
          />
        </RoundedBox>


        {/* Inner dark overlay for depth */}
        <mesh position={[0, 0, 0.02]}>
          <planeGeometry args={[cardW - 0.15, cardH - 0.15]} />
          <meshBasicMaterial color="#080c12" transparent opacity={0.55} />
        </mesh>

        {/* Accent stripe top */}
        <mesh position={[0, cardH / 2 - 0.18, 0.032]}>
          <planeGeometry args={[cardW - 0.25, 0.045]} />
          <meshBasicMaterial color="#00ffa3" />
        </mesh>

        {/* VOLTREX TERMINAL header */}
        <Text
          position={[0, cardH / 2 - 0.55, 0.032]}
          fontSize={0.2}
          color="#00ffa3"
          anchorX="center"
          anchorY="middle"
          letterSpacing={0.18}
        >
          VOLTREX TERMINAL
        </Text>

        {/* Subtitle */}
        <Text
          position={[0, cardH / 2 - 0.88, 0.032]}
          fontSize={0.1}
          color="#667788"
          anchorX="center"
          anchorY="middle"
          letterSpacing={0.08}
        >
          AUTHORIZED TRADER
        </Text>

        {/* Divider line */}
        <mesh position={[0, cardH / 2 - 1.12, 0.032]}>
          <planeGeometry args={[0.5, 0.015]} />
          <meshBasicMaterial color="#00ffa3" />
        </mesh>

        {/* Trader name */}
        {phase >= 3 && (
          <Text
            position={[0, 0.35, 0.032]}
            fontSize={0.28}
            color="#ffffff"
            anchorX="center"
            anchorY="middle"
            maxWidth={cardW - 0.5}
          >
            {user.name.toUpperCase()}
          </Text>
        )}

        {/* Trader ID */}
        {phase >= 3 && (
          <Text
            position={[0, -0.15, 0.032]}
            fontSize={0.22}
            color="#00ffa3"
            anchorX="center"
            anchorY="middle"
            letterSpacing={0.12}
          >
            {user.trader_id}
          </Text>
        )}

        {/* Account tier badge */}
        {phase >= 3 && (
          <>
            {/* Badge background */}
            <mesh position={[0, -0.72, 0.028]}>
              <planeGeometry args={[1.4, 0.3]} />
              <meshBasicMaterial color="#00ffa3" transparent opacity={0.06} />
            </mesh>
            {/* Badge border */}
            <lineSegments position={[0, -0.72, 0.03]}>
              <edgesGeometry args={[new THREE.PlaneGeometry(1.4, 0.3)]} />
              <lineBasicMaterial color="#00ffa3" />
            </lineSegments>
            <Text
              position={[0, -0.72, 0.035]}
              fontSize={0.11}
              color="#00ffa3"
              anchorX="center"
              anchorY="middle"
              letterSpacing={0.18}
            >
              {user.account_tier}
            </Text>
          </>
        )}

        {/* Holographic stripe bottom */}
        <mesh position={[0, -cardH / 2 + 0.3, 0.032]}>
          <planeGeometry args={[cardW - 0.25, 0.15]} />
          <meshBasicMaterial
            color="#00ffa3"
            transparent
            opacity={0.04}
          />
        </mesh>

        {/* Clearance text at bottom */}
        <Text
          position={[0, -cardH / 2 + 0.3, 0.035]}
          fontSize={0.065}
          color="#00ffa3"
          anchorX="center"
          anchorY="middle"
          letterSpacing={0.2}
        >
          CLEARANCE LEVEL: SECURE
        </Text>

        {/* ═══ BACK FACE ═══ */}
        <RoundedBox
          args={[cardW - 0.02, cardH - 0.02, 0.04]}
          radius={0.12}
          smoothness={4}
          position={[0, 0, -0.015]}
          rotation={[0, Math.PI, 0]}
        >
          <meshStandardMaterial color="#0a0e14" metalness={0.4} roughness={0.4} />
        </RoundedBox>
        <Text
          position={[0, 0.3, -0.04]}
          fontSize={0.24}
          color="#00ffa3"
          anchorX="center"
          anchorY="middle"
          rotation={[0, Math.PI, 0]}
          letterSpacing={0.2}
        >
          VOLTREX
        </Text>
        <Text
          position={[0, -0.1, -0.04]}
          fontSize={0.1}
          color="#00ffa3"
          anchorX="center"
          anchorY="middle"
          rotation={[0, Math.PI, 0]}
          letterSpacing={0.25}
        >
          TERMINAL
        </Text>
        {/* Back face accent stripe */}
        <mesh position={[0, -0.5, -0.038]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[1.0, 0.01]} />
          <meshBasicMaterial color="#1a2535" />
        </mesh>
      </group>
    </group>
  );
}

function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function easeOutQuad(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Main Trader Card overlay component
 * ────────────────────────────────────────────────────────────────────────── */

type TraderCardProps = {
  user: User;
  onComplete: () => void;
};

export function TraderCard({ user, onComplete }: TraderCardProps) {
  const [phase, setPhase] = useState(5); // Default to 5 immediately to show fully populated card
  const [flipping, setFlipping] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [webglSupported, setWebglSupported] = useState(true);
  const [isFlippedFront, setIsFlippedFront] = useState(true);

  const completedRef = useRef(false);

  // WebGL support detection
  useEffect(() => {
    setWebglSupported(hasWebGL());
  }, []);

  const handleFlipComplete = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    setExiting(true);
    setTimeout(onComplete, 600);
  }, [onComplete]);

  const handleLaunch = useCallback(() => {
    setFlipping(true);
    // Failsafe backup to transition to dashboard in 1.2s if WebGL render loop fails or in 2D mode
    setTimeout(() => {
      handleFlipComplete();
    }, 1200);
  }, [handleFlipComplete]);

  const handleCardClick = useCallback(() => {
    if (flipping) return;
    setIsFlippedFront(prev => !prev);
  }, [flipping]);

  if (!webglSupported) {
    return (
      <AnimatePresence>
        {!exiting && (
          <motion.div
            className="trader-card-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="trader-card-2d-container">
              {phase >= 1 && (
                <motion.div
                  className="trader-card-2d-lanyard"
                  initial={{ y: -120 }}
                  animate={{ y: 0 }}
                  transition={{ type: "spring", stiffness: 100, damping: 15 }}
                />
              )}
              {phase >= 2 && (
                <motion.div
                  className={`trader-card-2d ${flipping ? "flipping" : ""}`}
                  initial={{ y: 350, scale: 0.6, opacity: 0 }}
                  animate={{ y: 0, scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 120, damping: 18 }}
                  onClick={handleCardClick}
                >
                  <div className="trader-card-2d-clip" />

                  {/* Front Face */}
                  <div className="trader-card-2d-front">
                    <div className="trader-card-2d-header">
                      <h3 className="trader-card-2d-brand">VOLTREX</h3>
                      <span className="trader-card-2d-subtitle">AUTHORIZED TRADER</span>
                      <div className="trader-card-2d-divider" />
                    </div>

                    <div className="trader-card-2d-body">
                      {phase >= 3 ? (
                        <h2 className="trader-card-2d-name">{user.name.toUpperCase()}</h2>
                      ) : (
                        <div style={{ height: 22 }} />
                      )}

                      {phase >= 3 ? (
                        <p className="trader-card-2d-id">{user.trader_id}</p>
                      ) : (
                        <div style={{ height: 18, marginTop: 8 }} />
                      )}

                      {phase >= 3 ? (
                        <span className="trader-card-2d-tier">{user.account_tier}</span>
                      ) : (
                        <div style={{ height: 25, marginTop: 14 }} />
                      )}
                    </div>

                    <div className="trader-card-2d-footer">
                      <span>CLEARANCE LEVEL: SECURE</span>
                    </div>
                  </div>

                  {/* Back Face */}
                  <div className="trader-card-2d-back">
                    <h3 className="trader-card-2d-brand" style={{ fontSize: 24 }}>VOLTREX</h3>
                  </div>
                </motion.div>
              )}
            </div>

            {/* CTA button */}
            <AnimatePresence>
              {phase >= 5 && !flipping && (
                <motion.div
                  className="trader-card-cta"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                >
                  <p className="trader-card-hint">
                    <RotateCw size={12} />
                    Click card to flip · Drag to move
                  </p>

                  <h1 className="trader-ready-title">
                    Your Trading Terminal <br />
                    <span>is ready.</span>
                  </h1>

                  <button onClick={handleLaunch} className="trader-card-launch-premium">
                    <Rocket size={15} />
                    Continue to the Terminal
                  </button>
                </motion.div>
              )}
            </AnimatePresence>


          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      {!exiting && (
        <motion.div
          className="trader-card-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="trader-card-canvas">
            <Canvas
              camera={{ position: [0, -0.3, 7.2], fov: 42 }}
              dpr={[1, 2]}
              gl={{ antialias: true, alpha: true }}
            >
              <ambientLight intensity={0.18} />
              <directionalLight position={[5, 5, 5]} intensity={0.7} />
              <pointLight position={[0, 1, 3]} intensity={2.2} color="#00ffa3" />
              <pointLight position={[4, 0, 2]} intensity={0.8} color="#00c2ff" />
              <fog attach="fog" args={["#020409", 8, 18]} />
              <color attach="background" args={["#020409"]} />
              <Suspense fallback={null}>
                <Environment preset="city" />
                <LanyardCard
                  user={user}
                  phase={phase}
                  flipping={flipping}
                  onFlipComplete={handleFlipComplete}
                  isFlippedFront={isFlippedFront}
                  onCardClick={handleCardClick}
                />
              </Suspense>
              <EffectComposer>
                <Bloom
                  intensity={0.22}
                  luminanceThreshold={0.2}
                  luminanceSmoothing={0.9}
                />
                <Noise opacity={0.015} />
                <Vignette
                  eskil={false}
                  offset={0.15}
                  darkness={0.9}
                />
              </EffectComposer>
            </Canvas>
          </div>

          {/* CTA button */}
          <AnimatePresence>
            {phase >= 5 && !flipping && (
              <motion.div
                className="trader-card-cta"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                <p className="trader-card-hint">
                  <RotateCw size={12} />
                  Click card to flip · Drag to move
                </p>

                <h1 className="trader-ready-title">
                  Your Trading Terminal <br />
                  <span>is ready.</span>
                </h1>

                <button onClick={handleLaunch} className="trader-card-launch-premium">
                  <Rocket size={15} />
                  Continue to the Terminal
                </button>
              </motion.div>
            )}
          </AnimatePresence>


        </motion.div>
      )}
    </AnimatePresence>
  );
}


