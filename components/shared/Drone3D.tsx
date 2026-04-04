"use client";

/**
 * Drone3D — Three.js procedural quadcopter
 *
 * Geometry from primitives:
 *   - 2 body plates (BoxGeometry)
 *   - 4 diagonal arms (CylinderGeometry)
 *   - 4 motor housings + accent rings
 *   - 4 × rotor discs + 2 blades each (spinning)
 *   - camera gimbal arm + housing + lens
 *   - 4 landing legs + 2 skids
 *   - 4 LED PointLights (pulsing)
 *
 * Driven by:
 *   - anime.js v4 entrance (scale spring)
 *   - Three.js RAF: float, auto-rotate, rotor spin, LED pulse
 */

import { useEffect, useRef } from "react";

export function Drone3D() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let animId = 0;
    let renderer: import("three").WebGLRenderer | null = null;

    async function init() {
      if (!mountRef.current) return;

      const THREE = await import("three");

      const W = 520;
      const H = 520;

      /* ── Renderer ────────────────────────────────────────── */
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setSize(W, H);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.toneMapping    = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.4;
      mountRef.current.appendChild(renderer.domElement);

      const scene  = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(48, W / H, 0.1, 100);
      camera.position.set(2.8, 2.2, 4.0);
      camera.lookAt(0, 0, 0);

      /* ── Lighting ────────────────────────────────────────── */
      scene.add(new THREE.AmbientLight(0x0A1628, 2.5));

      const keyLight = new THREE.DirectionalLight(0x00ffb2, 4.5);
      keyLight.position.set(4, 7, 4);
      scene.add(keyLight);

      const rimLight = new THREE.DirectionalLight(0x5533FF, 2.0);
      rimLight.position.set(-4, 2, -3);
      scene.add(rimLight);

      const underLight = new THREE.DirectionalLight(0x001A33, 0.8);
      underLight.position.set(0, -5, 0);
      scene.add(underLight);

      /* ── Materials ───────────────────────────────────────── */
      const bodyMat = new THREE.MeshStandardMaterial({
        color: 0x080E1A, metalness: 0.96, roughness: 0.16,
      });
      const armMat = new THREE.MeshStandardMaterial({
        color: 0x0E1824, metalness: 0.92, roughness: 0.20,
      });
      const motorMat = new THREE.MeshStandardMaterial({
        color: 0x050B12, metalness: 0.98, roughness: 0.08,
      });
      const accentMat = new THREE.MeshStandardMaterial({
        color: 0x00ffb2, metalness: 0.8, roughness: 0.1,
        emissive: new THREE.Color(0x002211), emissiveIntensity: 1.2,
      });
      const rotorDiscMat = new THREE.MeshStandardMaterial({
        color: 0x00ffb2, transparent: true, opacity: 0.20,
        side: THREE.DoubleSide, metalness: 0.2, roughness: 0.9,
      });
      const bladeMat = new THREE.MeshStandardMaterial({
        color: 0x0D1829, metalness: 0.85, roughness: 0.3,
        transparent: true, opacity: 0.85,
      });

      /* ── Drone group ─────────────────────────────────────── */
      const drone = new THREE.Group();
      drone.rotation.x = -0.12;
      drone.scale.setScalar(0); // starts invisible (anime.js will scale in)

      // Body plates
      const botPlate = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.08, 0.7), bodyMat);
      botPlate.position.y = -0.05;
      drone.add(botPlate);

      const topPlate = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.07, 0.54), armMat);
      topPlate.position.y = 0.09;
      drone.add(topPlate);

      // Accent spine cross (top)
      const spineH = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.03, 0.035), accentMat);
      spineH.position.y = 0.135;
      drone.add(spineH);
      const spineV = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.03, 0.44), accentMat);
      spineV.position.y = 0.135;
      drone.add(spineV);

      // Four arms + motors + rotors
      const ARM_OFFSETS = [
        { x:  0.72, z:  0.72 },
        { x: -0.72, z:  0.72 },
        { x:  0.72, z: -0.72 },
        { x: -0.72, z: -0.72 },
      ];
      const LED_COLORS = [0x00FF88, 0x00FF88, 0xFF2D4A, 0xFF2D4A] as const;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rotorObjects: Array<{ mesh: any; dir: number }> = [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ledLights: any[] = [];
      const glowRing = new THREE.Mesh(
        new THREE.RingGeometry(0.28, 1.5, 52),
        new THREE.MeshBasicMaterial({
          color: 0x00ffb2, transparent: true, opacity: 0.04, side: THREE.DoubleSide,
        })
      );
      glowRing.rotation.x = -Math.PI / 2;
      glowRing.position.y = -0.9;
      drone.add(glowRing);

      ARM_OFFSETS.forEach(({ x, z }, idx) => {
        const dir = idx % 2 === 0 ? 1 : -1;

        // Arm
        const arm = new THREE.Mesh(
          new THREE.CylinderGeometry(0.028, 0.028, 1.08, 8), armMat
        );
        arm.rotation.z = Math.PI / 2;
        arm.rotation.y = -Math.atan2(z, x);
        arm.position.set(x * 0.46, 0, z * 0.46);
        drone.add(arm);

        // Motor housing
        const mh = new THREE.Mesh(
          new THREE.CylinderGeometry(0.135, 0.115, 0.10, 20), motorMat
        );
        mh.position.set(x, 0.02, z);
        drone.add(mh);

        // Motor accent ring
        const mt = new THREE.Mesh(
          new THREE.CylinderGeometry(0.088, 0.088, 0.038, 20), accentMat
        );
        mt.position.set(x, 0.105, z);
        drone.add(mt);

        // Rotor disc
        const disc = new THREE.Mesh(
          new THREE.CylinderGeometry(0.44, 0.44, 0.006, 40), rotorDiscMat.clone()
        );
        disc.position.set(x, 0.145, z);
        drone.add(disc);
        rotorObjects.push({ mesh: disc, dir });

        // Rotor blades (2 per motor)
        for (let b = 0; b < 2; b++) {
          const blade = new THREE.Mesh(
            new THREE.BoxGeometry(0.8, 0.007, 0.068), bladeMat
          );
          blade.rotation.y = (b * Math.PI) / 2;
          blade.position.set(x, 0.145, z);
          drone.add(blade);
          rotorObjects.push({ mesh: blade, dir });
        }

        // LED light + sphere
        const led = new THREE.PointLight(LED_COLORS[idx], 3.0, 2.5);
        led.position.set(x, 0.16, z);
        drone.add(led);
        ledLights.push(led);

        const ledSphere = new THREE.Mesh(
          new THREE.SphereGeometry(0.026, 10, 10),
          new THREE.MeshStandardMaterial({
            color: LED_COLORS[idx],
            emissive: new THREE.Color(LED_COLORS[idx]),
            emissiveIntensity: 4,
          })
        );
        ledSphere.position.set(x, 0.16, z);
        drone.add(ledSphere);
      });

      // Camera gimbal
      const gimbalArm = new THREE.Mesh(
        new THREE.BoxGeometry(0.055, 0.14, 0.055), motorMat
      );
      gimbalArm.position.set(0.04, -0.18, 0.19);
      drone.add(gimbalArm);

      const gimbalHousing = new THREE.Mesh(
        new THREE.SphereGeometry(0.115, 18, 18), motorMat
      );
      gimbalHousing.position.set(0.04, -0.27, 0.19);
      drone.add(gimbalHousing);

      const lensOuter = new THREE.Mesh(
        new THREE.CylinderGeometry(0.068, 0.074, 0.042, 18), motorMat
      );
      lensOuter.rotation.x = Math.PI / 2;
      lensOuter.position.set(0.04, -0.27, 0.275);
      drone.add(lensOuter);

      const lensInner = new THREE.Mesh(
        new THREE.CylinderGeometry(0.038, 0.038, 0.032, 18),
        new THREE.MeshStandardMaterial({
          color: 0x001122, metalness: 0.98, roughness: 0.0,
          emissive: new THREE.Color(0x001A33), emissiveIntensity: 2,
        })
      );
      lensInner.rotation.x = Math.PI / 2;
      lensInner.position.set(0.04, -0.27, 0.292);
      drone.add(lensInner);

      // Landing legs
      const legGeo = new THREE.CylinderGeometry(0.013, 0.013, 0.28, 8);
      [
        { x:  0.32, z:  0.26 },
        { x: -0.32, z:  0.26 },
        { x:  0.32, z: -0.26 },
        { x: -0.32, z: -0.26 },
      ].forEach(({ x, z }) => {
        const leg = new THREE.Mesh(legGeo, armMat);
        leg.position.set(x, -0.26, z);
        drone.add(leg);
      });

      // Skids
      const skidGeo = new THREE.CylinderGeometry(0.011, 0.011, 0.68, 8);
      [-0.26, 0.26].forEach((z) => {
        const skid = new THREE.Mesh(skidGeo, armMat);
        skid.rotation.z = Math.PI / 2;
        skid.position.set(0, -0.40, z);
        drone.add(skid);
      });

      scene.add(drone);

      /* ── anime.js entrance spring ────────────────────────── */
      import("animejs").then(({ animate }) => {
        const obj = { s: 0 };
        animate(obj, {
          s:        1,
          duration: 1400,
          ease:     "outElastic(1, 0.55)",
          onUpdate: () => { drone.scale.setScalar(obj.s); },
        });
      });

      /* ── RAF loop ────────────────────────────────────────── */
      let t = 0;
      function loop() {
        animId = requestAnimationFrame(loop);
        t += 0.016;

        drone.position.y = Math.sin(t * 0.75) * 0.13;
        drone.rotation.y = t * 0.26;
        drone.rotation.z = Math.sin(t * 0.42) * 0.04;
        drone.rotation.x = -0.12 + Math.cos(t * 0.58) * 0.04;

        rotorObjects.forEach(({ mesh, dir }) => {
          mesh.rotation.y += dir * 0.46;
        });

        ledLights.forEach((l, i) => {
          l.intensity = 2.5 + Math.sin(t * 3.5 + i * 1.57) * 1.4;
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (glowRing.material as any).opacity =
          0.03 + Math.sin(t * 1.1) * 0.022;

        renderer!.render(scene, camera);
      }
      loop();
    }

    init();

    return () => {
      cancelAnimationFrame(animId);
      if (renderer) {
        if (mountRef.current && renderer.domElement.parentNode === mountRef.current) {
          mountRef.current.removeChild(renderer.domElement);
        }
        renderer.dispose();
        renderer = null;
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="drone-3d-canvas"
      style={{
        width:  520,
        height: 520,
        filter: "drop-shadow(0 0 48px rgba(0,255,178,0.22)) drop-shadow(0 0 16px rgba(0,255,178,0.12))",
      }}
    />
  );
}
