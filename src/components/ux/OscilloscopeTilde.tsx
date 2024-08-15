import React, { useRef, useEffect, useState } from "react";
import { usePosition } from "@/contexts/PositionContext";
import * as THREE from "three";
import { ObjectNode } from "@/lib/nodes/types";

const OscilloscopeTilde: React.FC<{ objectNode: ObjectNode }> = ({ objectNode }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const sceneRef = useRef(new THREE.Scene());
  const cameraRef = useRef(new THREE.Camera());
  const materialRef = useRef<THREE.ShaderMaterial>();
  const textureLeftRef = useRef<THREE.DataTexture>();
  const textureRightRef = useRef<THREE.DataTexture>();
  const animationFrameRef = useRef<number>();

  const { sizeIndex } = usePosition();
  const { width = 300, height = 100 } = sizeIndex[objectNode.id] || {};

  useEffect(() => {
    if (!mountRef.current) return;

    // Set up renderer
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(width, height);
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Set up scene and camera
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    const camera = new THREE.Camera();
    cameraRef.current = camera;

    // Create textures
    const dataArray = new Uint8Array(256);
    textureLeftRef.current = new THREE.DataTexture(
      dataArray,
      dataArray.length,
      1,
      THREE.RedFormat,
      THREE.UnsignedByteType,
    );
    textureLeftRef.current.needsUpdate = true;

    textureRightRef.current = new THREE.DataTexture(
      dataArray.slice(),
      dataArray.length,
      1,
      THREE.RedFormat,
      THREE.UnsignedByteType,
    );
    textureRightRef.current.needsUpdate = true;
    const _smooth = 80.1;

    let intensity = 1.01;
    const lineWidth = 0.001;
    // Set up shader material with your original shader
    const material = new THREE.ShaderMaterial({
      uniforms: {
        leftChannel: { value: textureLeftRef.current },
        rightChannel: { value: textureRightRef.current },
        resolution: { value: new THREE.Vector2(width * 1, height * 1) },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
           vUv = uv;
           gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
        `,
      fragmentShader: `
        uniform sampler2D leftChannel;
        uniform sampler2D rightChannel;
        uniform vec2 resolution;
        varying vec2 vUv;

        float piecewise(sampler2D iChannel0, float x, float res) {
          float xTimesRes = x * res;

          // Left sample point:
          float x1 = floor(xTimesRes) / res;
          float y1 = texture(iChannel0, vec2(x1, 0.0)).x;

          // Right sample point:
          float x2 = ceil(xTimesRes) / res;
          float y2 = texture(iChannel0, vec2(x2, 0.0)).x;

          // Prevent small breaks in the line:
          x2 += 0.001;

          // Fit half of a sine wave between sample points:
          float sine = sin(((x - x1) / (x2 - x1) * 2.0 - 1.0) * 1.5707963267);
          return y1 + (0.5 + 0.5 * sine) * (y2 - y1);
        }

        vec2 getOscPoint(float x) {
          float left = x * 0.9375;
          float right = fract(x - 0.224399476 / 0.9375) * 0.9375;

          float pointX = piecewise(leftChannel, left, ${_smooth});
          float pointY = piecewise(rightChannel, right, ${_smooth});

          return vec2(pointX, pointY);
        }

        float stereo(vec2 uv) {
  float oneOverN = 1.0 / 100.0;

    float posOffset = 0.0;
    float timeOffset = 0.0;
    float xOffset = fract(posOffset + timeOffset) * oneOverN;

    float acc = 0.0;
    for (int i = 0; i < 100; i++) {
        float x = float(i) * oneOverN + xOffset;
        vec2 point = getOscPoint(x);

        vec2 pa = point - uv;
        float d = dot(pa, pa);

        acc += 1.0 / (d + ${lineWidth}*${lineWidth}); // Inverse square law

        }
    return acc * oneOverN * ${intensity} * ${lineWidth};
}

        void main() {
          vec2 uv = gl_FragCoord.xy / resolution.xy;
          uv -= 0.5;

          // Apply zoom
          uv *= 1.5;

          // Recenter the UV coordinates
          uv += 0.5;

          gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0) * stereo(uv);
        }
        `,
    });
    materialRef.current = material;

    // Create mesh and add to scene
    const geometry = new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // Start animation loop
    const animate = () => {
      if (objectNode.auxAudioNodes && objectNode.auxAudioNodes.length >= 2) {
        const leftAnalyser = objectNode.auxAudioNodes[0] as AnalyserNode;
        const rightAnalyser = objectNode.auxAudioNodes[1] as AnalyserNode;

        if (leftAnalyser instanceof AnalyserNode && rightAnalyser instanceof AnalyserNode) {
          const dataArrayLeft = new Uint8Array(leftAnalyser.frequencyBinCount);
          const dataArrayRight = new Uint8Array(rightAnalyser.frequencyBinCount);

          leftAnalyser.getByteTimeDomainData(dataArrayLeft);
          rightAnalyser.getByteTimeDomainData(dataArrayRight);

          for (let i = 0; i < dataArrayLeft.length; i++) {
            dataArrayLeft[i] *= 2;
            dataArrayRight[i] *= 2;
          }

          if (textureLeftRef.current && textureRightRef.current) {
            textureLeftRef.current.image.data.set(dataArrayLeft);
            textureLeftRef.current.needsUpdate = true;

            textureRightRef.current.image.data.set(dataArrayRight);
            textureRightRef.current.needsUpdate = true;
          }
        }
      }

      renderer.render(scene, camera);
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    animate();

    // Clean up
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      renderer.dispose();
      if (mountRef.current) {
        mountRef.current.innerHTML = "";
      }
    };
  }, [width, height, objectNode.auxAudioNodes]);

  return (
    <div
      style={{
        backdropFilter: "blur(1px)",
        backgroundColor: "#62626209",
        width,
        height,
      }}
      ref={mountRef}
      className="text-white"
    ></div>
  );
};

export default OscilloscopeTilde;
