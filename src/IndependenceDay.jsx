import React, { useRef, useEffect, useState } from "react";
import "./IndependenceDay.css";
import * as THREE from "three";
import { gsap } from "gsap";
// **NEW: Import OrbitControls**
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const IndependenceDay = () => {
  const mountRef = useRef(null);
  const clothMeshRef = useRef(null);
  const controlsRef = useRef(null); // **NEW: Store controls reference**
  const [isHoisted, setIsHoisted] = useState(false);
  const [showMessage, setShowMessage] = useState(false);

  useEffect(() => {
    let scene, camera, renderer, clock, light, flagpole, rope, controls;

    const onWindowResize = () => {
      if (camera && renderer) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      }
    };

    const init = () => {
      // Renderer
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        precision: "highp",
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.outputColorSpace = THREE.SRGBColorSpace;

      if (mountRef.current) {
        mountRef.current.appendChild(renderer.domElement);
      } else {
        console.error("Mount ref is null, cannot append renderer.");
        return;
      }

      // Scene and Camera
      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(
        45,
        window.innerWidth / window.innerHeight,
        0.1,
        100
      );

      // **UPDATED: Better initial camera position for 3D viewing**
      camera.position.set(5, 4, 7);
      camera.lookAt(0, 2, 0);

      // **NEW: Initialize OrbitControls**
      controls = new OrbitControls(camera, renderer.domElement);

      // **NEW: Configure OrbitControls settings**
      controls.enableDamping = true; // Smooth camera movements
      controls.dampingFactor = 0.05;
      controls.screenSpacePanning = false;

      // Set boundaries for better viewing experience
      controls.minDistance = 2; // Minimum zoom distance
      controls.maxDistance = 20; // Maximum zoom distance
      controls.maxPolarAngle = Math.PI / 1.8; // Prevent camera going below ground

      // Set target to flag center for better orbiting
      controls.target.set(0, 2, 0);

      // Enable all control types
      controls.enableZoom = true;
      controls.enableRotate = true;
      controls.enablePan = true;

      // **NEW: Auto-rotate option (optional - remove if you don't want it)**
      // controls.autoRotate = true;
      // controls.autoRotateSpeed = 0.5;

      controlsRef.current = controls;

      // Enhanced background with gradient
      scene.background = new THREE.Color(0x87ceeb);
      scene.fog = new THREE.Fog(0x87ceeb, 10, 100);

      // Enhanced Lighting
      light = new THREE.DirectionalLight(0xffffff, 1.2);
      light.position.set(10, 10, 5);
      light.castShadow = true;
      light.shadow.mapSize.width = 2048;
      light.shadow.mapSize.height = 2048;
      light.shadow.camera.near = 0.5;
      light.shadow.camera.far = 50;
      scene.add(light);

      const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
      scene.add(ambientLight);

      // Add subtle rim lighting
      const rimLight = new THREE.DirectionalLight(0xffffff, 0.3);
      rimLight.position.set(-5, 3, -5);
      scene.add(rimLight);

      // Clock
      clock = new THREE.Clock();

      // **NEW: Create Flagpole**
      const poleGeometry = new THREE.CylinderGeometry(0.03, 0.05, 4, 12);
      const poleMaterial = new THREE.MeshLambertMaterial({
        color: 0x8b4513,
        roughness: 0.8,
      });
      flagpole = new THREE.Mesh(poleGeometry, poleMaterial);
      flagpole.position.set(-0.6, 2, 0);
      flagpole.castShadow = true;
      scene.add(flagpole);

      // **NEW: Flagpole Top (Golden Ball)**
      const topGeometry = new THREE.SphereGeometry(0.08, 16, 16);
      const topMaterial = new THREE.MeshPhongMaterial({
        color: 0xffd700,
        shininess: 100,
        reflectivity: 0.8,
      });
      const poleTop = new THREE.Mesh(topGeometry, topMaterial);
      poleTop.position.set(-0.6, 4.1, 0);
      poleTop.castShadow = true;
      scene.add(poleTop);

      // **NEW: Rope**
      const ropeGeometry = new THREE.CylinderGeometry(0.008, 0.008, 4, 6);
      const ropeMaterial = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
      rope = new THREE.Mesh(ropeGeometry, ropeMaterial);
      rope.position.set(-0.55, 2, 0);
      scene.add(rope);

      // **NEW: Ground Plane**
      const groundGeometry = new THREE.PlaneGeometry(20, 20);
      const groundMaterial = new THREE.MeshLambertMaterial({
        color: 0x228b22,
        transparent: true,
        opacity: 0.8,
      });
      const ground = new THREE.Mesh(groundGeometry, groundMaterial);
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = 0;
      ground.receiveShadow = true;
      scene.add(ground);

      // **ENHANCED: Flag Geometry with better proportions**
      const geometry = new THREE.PlaneGeometry(1.2, 0.8, 20, 15);
      const vertices = geometry.attributes.position.array;

      for (let i = 0; i < vertices.length; i += 3) {
        vertices[i + 2] = (Math.random() - 0.5) * 0.03;
      }

      // **FIXED: UV calculation**
      const uvs = new Float32Array(geometry.attributes.position.count * 2);
      const positions = geometry.attributes.position;

      for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);
        const y = positions.getY(i);

        uvs[i * 2] = (x + 0.6) / 1.2;
        uvs[i * 2 + 1] = (y + 0.4) / 0.8;
      }

      geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));

      // **ENHANCED: Improved shaders with better wave physics**
      const vertexShader = `
        uniform float time;
        uniform float hoistProgress;
        varying vec2 vUv;
        
        void main() {
          vec3 pos = position;
          
          // Enhanced wave motion that's stronger on the free edge
          float edgeDistance = (pos.x + 0.6) / 1.2; // Distance from pole (0 = attached, 1 = free)
          float waveStrength = edgeDistance * edgeDistance; // Quadratic increase
          
          float wave = sin(time * 3.0 + pos.x * 6.0) * 0.04 * waveStrength + 
                      cos(time * 2.5 + pos.y * 4.0) * 0.02 * waveStrength +
                      sin(time * 4.0 + pos.x * 12.0 + pos.y * 8.0) * 0.01 * waveStrength;
          
          pos.z += wave;
          
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `;

      const fragmentShader = `
        varying vec2 vUv;
        
        void main() {
          float y = vUv.y;
          
          if (y > 0.666) {
            // Saffron stripe (top)
            gl_FragColor = vec4(1.0, 0.6, 0.2, 1.0);
          } else if (y > 0.333) {
            // White stripe (middle) with enhanced Chakra
            gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
            
            // Enhanced Ashoka Chakra
            vec2 center = vec2(0.5, 0.5);
            float dist = length(vUv - center);
            
            if (dist < 0.13) {
              // Outer circle
              if (dist > 0.115) {
                gl_FragColor = vec4(0.0, 0.0, 0.5, 1.0);
              } else {
                gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
                
                // 24 spokes
                float angle = atan(vUv.y - center.y, vUv.x - center.x);
                float normalizedAngle = (angle + 3.14159) / (2.0 * 3.14159);
                float spokeIndex = floor(normalizedAngle * 24.0);
                float spokeAngle = spokeIndex * 2.0 * 3.14159 / 24.0;
                
                vec2 spokeDir = vec2(cos(spokeAngle), sin(spokeAngle));
                vec2 toCenter = normalize(vUv - center);
                float spokeDot = abs(dot(spokeDir, toCenter));
                
                if (spokeDot > 0.95 && dist > 0.04 && dist < 0.11) {
                  gl_FragColor = vec4(0.0, 0.0, 0.5, 1.0);
                }
                
                // Inner circle
                if (dist < 0.03) {
                  gl_FragColor = vec4(0.0, 0.0, 0.5, 1.0);
                }
              }
            }
          } else {
            // Green stripe (bottom)
            gl_FragColor = vec4(0.075, 0.5, 0.075, 1.0);
          }
        }
      `;

      const material = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          time: { value: 0 },
          hoistProgress: { value: 0 },
        },
        side: THREE.DoubleSide,
        transparent: true,
      });

      const clothMesh = new THREE.Mesh(geometry, material);

      // **ENHANCED: Start at bottom of pole, attached to rope**
      clothMesh.position.set(0, 0.5, 0); // Start at bottom
      clothMeshRef.current = clothMesh;
      clothMesh.castShadow = true;
      scene.add(clothMesh);

      // **NEW: Add some decorative clouds**
      const addClouds = () => {
        for (let i = 0; i < 5; i++) {
          const cloudGeometry = new THREE.SphereGeometry(0.5, 8, 8);
          const cloudMaterial = new THREE.MeshLambertMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.7,
          });
          const cloud = new THREE.Mesh(cloudGeometry, cloudMaterial);

          cloud.position.set(
            (Math.random() - 0.5) * 20,
            5 + Math.random() * 3,
            -10 - Math.random() * 5
          );

          cloud.scale.set(
            1 + Math.random(),
            0.5 + Math.random() * 0.5,
            1 + Math.random()
          );

          scene.add(cloud);
        }
      };
      addClouds();

      // **ENHANCED: Animation Loop with Controls Update**
      const animate = () => {
        requestAnimationFrame(animate);
        const delta = clock.getDelta();

        if (clothMesh.material.uniforms.time) {
          clothMesh.material.uniforms.time.value += delta;
        }

        // **NEW: Update controls for smooth damping**
        if (controls) {
          controls.update();
        }

        renderer.render(scene, camera);
      };

      animate();
      window.addEventListener("resize", onWindowResize);
    };

    init();

    return () => {
      if (
        renderer &&
        mountRef.current &&
        renderer.domElement.parentNode === mountRef.current
      ) {
        mountRef.current.removeChild(renderer.domElement);
      }
      window.removeEventListener("resize", onWindowResize);

      // **NEW: Dispose controls**
      if (controlsRef.current) {
        controlsRef.current.dispose();
      }
    };
  }, []);

  const handleHoist = () => {
    if (!isHoisted && clothMeshRef.current) {
      // **ENHANCED: Smooth hoisting animation**
      gsap.to(clothMeshRef.current.position, {
        y: 3.6, // Move to top of pole
        duration: 4,
        ease: "power2.out",
        onComplete: () => {
          setIsHoisted(true);
          setShowMessage(true);
        },
      });

      // **NEW: Add subtle rotation during hoisting**
      gsap.to(clothMeshRef.current.rotation, {
        y: Math.PI * 0.1,
        duration: 4,
        ease: "power2.out",
        yoyo: true,
        repeat: 1,
      });

      // **NEW: Animate message appearance**
      setTimeout(() => {
        gsap.fromTo(
          ".message",
          { opacity: 0, scale: 0.5, y: 50 },
          {
            opacity: 1,
            scale: 1,
            y: 0,
            duration: 1.5,
            ease: "back.out(1.7)",
          }
        );
      }, 4000);
    }
  };

  const handleReset = () => {
    if (isHoisted && clothMeshRef.current) {
      setIsHoisted(false);
      setShowMessage(false);

      gsap.to(clothMeshRef.current.position, {
        y: 0.5,
        duration: 2,
        ease: "power2.in",
      });

      gsap.to(clothMeshRef.current.rotation, {
        y: 0,
        duration: 2,
        ease: "power2.in",
      });
    }
  };

  // **NEW: Reset camera view function**
  const resetCameraView = () => {
    if (controlsRef.current) {
      gsap.to(controlsRef.current.object.position, {
        x: 5,
        y: 4,
        z: 7,
        duration: 1.5,
        ease: "power2.out",
        onUpdate: () => {
          controlsRef.current.update();
        },
      });

      gsap.to(controlsRef.current.target, {
        x: 0,
        y: 2,
        z: 0,
        duration: 1.5,
        ease: "power2.out",
      });
    }
  };

  return (
    <div className="festive-container" ref={mountRef}>
      <div className="controls">
        <button
          className="hoist-button"
          onClick={handleHoist}
          disabled={isHoisted}
        >
          🇮🇳 Hoist the Flag
        </button>
        {isHoisted && (
          <button className="reset-button" onClick={handleReset}>
            🔄 Reset
          </button>
        )}
        {/* **NEW: Camera reset button** */}
        <button className="camera-reset-button" onClick={resetCameraView}>
          📷 Reset View
        </button>
      </div>

      {/* **NEW: Control instructions** */}
      <div className="control-instructions">
        <p>
          🖱️ <strong>Left Click + Drag:</strong> Rotate view
        </p>
        <p>
          🖱️ <strong>Right Click + Drag:</strong> Pan camera
        </p>
        <p>
          🔄 <strong>Scroll Wheel:</strong> Zoom in/out
        </p>
      </div>

      {/* {showMessage && (
        <div className="celebration">
          <p className="message">
            🎆 Happy Independence Day! 🎆
            <br />
            <span className="sub-message">Jai Hind! 🇮🇳</span>
          </p>
        </div>
      )} */}
    </div>
  );
};

export default IndependenceDay;
