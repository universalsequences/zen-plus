// ThreeCanvas.tsx
import React, { useState, useEffect, useRef } from "react";
import { createWaveformTexture } from "@/utils/waveform/createWaveformTexture";
import * as THREE from "three";

const fragmentShader = `
        uniform sampler2D uAudioData;
        uniform float uZoomFactor;
        uniform float uStartPoint;
uniform vec4 stemColor;
uniform float width;
uniform float height;
uniform float isLooping;
uniform float loopStartX;
uniform float loopEndX;

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


void main() {

  vec2 uv = vUv;
  float xCoord = uv.x; // / uZoomFactor + uStartPoint;
  float pointX = piecewise(uAudioData,xCoord, 800.0);
  vec4 _stemColor = stemColor;
  vec4 color = vec4(0.0,0.0,0.0,1.0);
  float _smooth = 0.01;
  if (gl_FragCoord.x >= loopStartX && gl_FragCoord.x <= loopEndX) {
    if (isLooping > 0.0) {
      color = stemColor;;
      _stemColor = stemColor*.191;
      _smooth = 0.015;
    }
} else {
if (isLooping > 0.0) {
_smooth = 0.05;
_stemColor = vec4(0.0,0.0,0.0,1.0);
}
}
  float sampleValue = smoothstep(pointX-_smooth, pointX, abs((uv.y*2.0-1.0)));

  if (abs((uv.y*2.0-1.0)) <= 0.02) {
    sampleValue = 0.0;
  }
  gl_FragColor = mix(color, vec4(.1*_stemColor.xyz,0.0), sampleValue);
}
`;

const vertexShader = `
 varying vec2 vUv;
 void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
 }
`;

interface WaveformProps {
  color: [number, number, number, number];
  waveformKey: string;
  width: number;
  height: number;
  audioSamples: Float32Array;
  zoomLevel: number;
}

const ShaderWaveform: React.FC<WaveformProps> = ({
  color,
  waveformKey,
  width,
  height,
  audioSamples,
  zoomLevel,
}) => {
  const mount = useRef<HTMLDivElement>(null);
  // Refs for the Three.js objects we want to use in the effect
  const waveformTextureRef = useRef<THREE.DataTexture | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.Camera | null>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.loopEndX.value = width;
      materialRef.current.uniforms.isLooping.value = true;
      materialRef.current.uniforms.loopStartX.value = 0;
      materialRef.current.uniforms.stemColor.value = color;
      materialRef.current.needsUpdate = true;
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    }
  }, [color, width]);

  useEffect(() => {
    // if (initialized.current) return;
    console.log("initializing waveform...");
    sceneRef.current = new THREE.Scene();
    cameraRef.current = new THREE.OrthographicCamera(
      -width / 2,
      width / 2,
      height / 2,
      -height / 2,
      1,
      1000,
    );
    cameraRef.current.position.z = 10;

    rendererRef.current = new THREE.WebGLRenderer();
    rendererRef.current.setSize(width, height);
    mount.current?.appendChild(rendererRef.current.domElement);

    // Create waveform texture
    console.log("creating waveform...");
    waveformTextureRef.current = createWaveformTexture(
      waveformKey,
      audioSamples.slice(0, Math.floor(audioSamples.length / 2)),
      1.0,
      width * 2,
    );

    // Material with shader using the waveform texture
    const material = new THREE.ShaderMaterial({
      uniforms: {
        stemColor: { value: color },
        uAudioData: { value: waveformTextureRef.current },
        isLooping: { value: 0 },
        loopStartX: { value: 100 },
        loopEndX: { value: 0 },
        width: { value: width },
        height: { value: height },
      },
      vertexShader: vertexShader, // Replace with your vertex shader code
      fragmentShader: fragmentShader, // Replace with your fragment shader code
    });
    materialRef.current = material;

    // Geometry and mesh
    const geometry = new THREE.PlaneGeometry(width, height);
    const mesh = new THREE.Mesh(geometry, material);
    sceneRef.current.add(mesh);

    // Handle zoom
    const handleWheel = (event: WheelEvent) => {
      // Update zoom level here
    };
    mount.current?.addEventListener("wheel", handleWheel);

    // Animation loop
    //const animate = () => {

    //   requestAnimationFrame(animate);
    rendererRef.current.render(sceneRef.current, cameraRef.current);
    //};

    //animate();

    initialized.current = true;

    const mountNode = mount.current;
    // Cleanup
    return () => {
      if (rendererRef.current) {
        mountNode?.removeChild(rendererRef.current.domElement);
      }
      mountNode?.removeEventListener("wheel", handleWheel);
      geometry.dispose();
      material.dispose();
    };
  }, []);

  // This effect updates the waveform texture whenever `audioData` changes

  useEffect(() => {
    const texture = waveformTextureRef.current;
    if (audioSamples && waveformKey && zoomLevel && width) {
      const ret = createWaveformTexture(
        waveformKey,
        audioSamples.slice(0, Math.floor(audioSamples.length / 2)),
        zoomLevel,
        width * 2,
      );

      if (
        !texture ||
        !texture.image ||
        texture.image.data.length !== ret.image.data.length
      ) {
        // Create a new DataTexture if it doesn't exist or the size has changed
        const newTexture = new THREE.DataTexture(
          ret.image.data,
          ret.image.width,
          ret.image.height,
          THREE.LuminanceFormat,
          THREE.FloatType,
        );
        newTexture.needsUpdate = true;
        waveformTextureRef.current = newTexture;
      } else {
        // Update the existing texture
        const data = texture.image.data as Float32Array;
        data.set(ret.image.data);
        texture.needsUpdate = true;
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    }
  }, [audioSamples, waveformKey, zoomLevel, width]);

  return (
    <div
      ref={mount}
      style={{
        pointerEvents: "none",
        width: `${width}px`,
        height: `${height}px`,
      }}
    />
  );
};

export default ShaderWaveform;
