import React, { useRef, useEffect, useCallback, useState } from 'react';
import * as THREE from 'three';
import { useInterval } from '@/hooks/useInterval';
import { ObjectNode } from '@/lib/nodes/types';

/**
 * Uses a simple feedback-based shader to render a scope of incoming audio signal
 * It essentially draws 2 data points at the very left-side region as a line-segment
 * and pushes the remaining pixels over by 1 pixel-- representing the flow of time
 */
const ScopeTilde: React.FC<{ objectNode: ObjectNode }> = ({ objectNode }) => {

    const valueRef = useRef([0, 0]);
    const materialRef = useRef<THREE.ShaderMaterial>();
    const rendererRef = useRef<THREE.WebGLRenderer>();
    const mountRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef(new THREE.Scene());
    const cameraRef = useRef(new THREE.Camera());
    const renderTargetsRef = useRef<THREE.WebGLRenderTarget[]>([]);
    const currentRenderTargetIndex = useRef(0);
    const initialized = useRef(false);
    const renderCounter = useRef(0);


    useEffect(() => {
        if (!mountRef.current) return;
        if (initialized.current) return;
        initialized.current = true;
        // Renderer

        const renderer = new THREE.WebGLRenderer();
        renderer.setSize(mountRef.current.offsetWidth, mountRef.current.offsetHeight);
        mountRef.current.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        // Scene
        const scene = new THREE.Scene();
        sceneRef.current = scene;
        scene.background = new THREE.Color(0x000000); // Background color

        // Camera
        const camera = new THREE.Camera();
        cameraRef.current = camera;

        // Create two render targets for the feedback loop
        const rt1 = new THREE.WebGLRenderTarget(mountRef.current.offsetWidth, mountRef.current.offsetHeight);
        const rt2 = new THREE.WebGLRenderTarget(mountRef.current.offsetWidth, mountRef.current.offsetHeight);
        renderTargetsRef.current = [rt1, rt2];

        // Plane geometry for the shader
        const plane = new THREE.PlaneGeometry(2, 2);
        // Material with shader
        const material = new THREE.ShaderMaterial({
            uniforms: {
                u_prevFrame: { value: rt1.texture },
                u_maxValue1: { value: 0 },
                u_maxValue2: { value: 0 },
                resolution: { value: [mountRef.current.offsetWidth, mountRef.current.offsetHeight] },
                // Add other uniforms as needed
            },
            vertexShader: `
 varying vec2 vUv;
 void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
 }
 `,
            fragmentShader: `
        uniform float u_maxValue1;
        uniform float u_maxValue2;
        uniform sampler2D u_prevFrame;
        uniform vec2 resolution;
        varying vec2 vUv;

float linesegment(vec2 p, vec2 pointA, vec2 pointB) {
  vec2 pa = p - pointA;
  vec2 ba = pointB - pointA;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return  abs(length(pa - ba * h));
}

        void main() {
vec2 nuv = vUv;
          // Normalize the pixel coordinates to the range [0, 1]
vec2 pointA = vec2(-1.0, u_maxValue1);
vec2 pointB = vec2(-1.0 + 4.0/resolution.x, u_maxValue2);

          vec2 uv = gl_FragCoord.xy / resolution.xy;

          // Scale to the range [-1, 1]
          uv = uv * 2.0 - 1.0;

          // The y coordinate might need to be flipped depending on the origin (bottom-left or top-left)
          uv.y *= 1.0;

         float sdf = linesegment(uv, pointA, pointB);
         vec4 prevColor = texture2D(u_prevFrame, nuv-vec2(1.0/resolution.x, 0.0));

if (nuv.x > 2.0/resolution.x) {
gl_FragColor = prevColor;
} else {
gl_FragColor = mix(vec4(199.0/255.0,1.0,0.1,1.0), vec4(0.0,0.0,0.0,0.0), smoothstep(0.0, 0.05, sdf));
}
        }
      `,
        });

        const mesh = new THREE.Mesh(plane, material);
        scene.add(mesh);
        materialRef.current = material;

        render();
    }, []);

    // Render loop
    const render = () => {
        if (!rendererRef.current ||
            !sceneRef.current ||
            !cameraRef.current) {
            return;
        }

        renderCounter.current++;
        if (renderCounter.current % 2 === 0) {
            //requestAnimationFrame(render);
            //return;
        }
        // Update the shader uniform with the latest maxValue

        const currentIndex = currentRenderTargetIndex.current;
        const prevIndex = (currentRenderTargetIndex.current + 1) % 2;

        if (materialRef.current) {
            materialRef.current.uniforms.u_maxValue1.value = valueRef.current[0];
            materialRef.current.uniforms.u_maxValue2.value = valueRef.current[1];
            materialRef.current.uniforms.u_prevFrame.value = renderTargetsRef.current[prevIndex].texture;
            materialRef.current.needsUpdate = true;
        }

        rendererRef.current.setRenderTarget(renderTargetsRef.current[currentIndex]);

        // Render the scene
        rendererRef.current.render(sceneRef.current, cameraRef.current);

        rendererRef.current.setRenderTarget(null);
        rendererRef.current.render(sceneRef.current, cameraRef.current);
        currentRenderTargetIndex.current = prevIndex;
        requestAnimationFrame(render);
    };

    useEffect(() => {
        if (objectNode.audioNode) {
            let worklet = (objectNode.audioNode) as AudioWorkletNode;
            worklet.port.onmessage = onMessage;
        }
        return () => {
            if (objectNode.audioNode) {
                let worklet = (objectNode.audioNode) as AudioWorkletNode;
                worklet.port.onmessage = null;
            }
        }
    }, [objectNode.audioNode])

    const onMessage = useCallback((e: MessageEvent) => {
        valueRef.current[1] = valueRef.current[0];
        valueRef.current[0] = e.data;
    }, []);

    return (
        <div
            style={{
                backdropFilter: "blur(8px)",
                backgroundColor: "#62626239"
            }}
            ref={mountRef} className="w-64 h-24 text-white">
        </div>
    );
}
export default ScopeTilde;
