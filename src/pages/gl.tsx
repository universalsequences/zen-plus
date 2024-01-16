"use client"
import { Arg, UGen } from '@/lib/gl/types';
import '@/styles/styles.scss';
import './globals.css';
import { vec4, unpack, vector } from '@/lib/gl/coordinates';
import { DrawType } from '@/lib/gl/zen';
import { GLType } from '@/lib/gl/types';
import { attribute, AttributeData, AttributeDefinition } from '@/lib/gl/attributes';
import React, { useEffect, useState, useRef } from 'react';
import App from './App';
import * as gl from '@/lib/gl/index';
import { Context } from '@/lib/gl/types';
import useShaderDisplay from '@/hooks/gl/useShaderDisplay';


const dsl = () => {
    // quad vertices
    const aVertexPosition = attribute(GLType.Vec3, [
        0.125, 0.125,
        -0.125, .125,
        0.125, -0.125,
        -0.125, -0.125,
        -0.125, -0.125,
        0.125, -0.125,
    ], 2);
    const av = vector(aVertexPosition());

    // generate 200 random offset vertices
    let offs = [];
    for (let i = 0; i < 16; i++) {
        offs.push(Math.cos(Math.sin(i * .5) + Math.tan(2.0002 * i) * .5));
    }
    // place in an instance attribute
    let offInstance = attribute(GLType.Vec2, offs, 2, true)();
    let off = vector(offInstance);
    let u = gl.uniform(GLType.Float, 1);

    let x = gl.sub(gl.sin(gl.add(gl.cos(av.y), gl.mult(gl.sub(u(), .3), off.x))), av.y);
    // FRAGMENT SHADER:
    // pass the instance attribute as varying to fragment shader
    //let offMod = gl.vec3(gl.add(off.x, av.x, gl.sin(gl.mult(10, x))), gl.mix(gl.add(off.y, av.y), gl.add(off.x, av.x), u()), av.z);
    let offMod = gl.vec2(off.x, x);
    let vary = gl.varying(offMod);

    let off_uv = gl.sub(gl.uv(), gl.vec2(vector(vary).x, vector(vary).y));
    let circle = gl.smoothstep(0.5, 0, gl.sub(gl.abs(gl.sub(gl.length(off_uv), .1)), .5));
    let circle2 = gl.length(gl.uv());
    let cx = gl.mult(2, gl.mult(circle2, circle));
    let cy = gl.add(gl.uv().x, gl.uv().y);
    let frag = vec4(cx, cy, 0.7, gl.mult(0.3, gl.sub(circle2, circle)));

    let i = 0;
    setInterval(() => {
        u.set!(4 * Math.cos(i * .3) + Math.sin(i));
        i += 0.01;
    }, 10);

    // VERTEX SHADER:
    // vertex shader simply offsets via the offset vertices instance attribute
    let vertex = vec4(gl.sin(gl.add(x, off.x, av.x, gl.sin(gl.mult(10, x)))), gl.mix(gl.add(off.y, av.y), gl.add(off.x, av.x), u()), av.z, 1);

    let zenGraph = gl.zen(frag, vertex, DrawType.LINE_STRIP);
    return zenGraph;

};

const Home = () => {
    let ref = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        if (ref.current) {
            const numSegments = 128 * 8; // Example segment count
            let height = .2;
            let r = .5
            let vertices = [];
            let normals = [];
            let indices = [];

            for (let i = 0; i <= numSegments; i++) {
                // Angle around the y-axis

                let angle = (i / numSegments) * Math.PI * 2;

                // Position on the circle
                let x = r * Math.cos(angle);
                let z = r * Math.sin(angle);

                // Two vertices per segment (top and bottom of this segment)
                vertices.push(x, height / 2, z); // Top vertex
                vertices.push(x, -height / 2, z); // Bottom vertex

                // Normal is the same for both vertices
                let normal = [x, 0, z]; // Normal vector

                normals.push(...normal); // Top normal
                normals.push(...normal); // Bottom normal
            }

            for (let i = 0; i < numSegments; i++) {
                // Indices for the vertices in the current segment
                let top1 = i * 2;
                let bottom1 = top1 + 1;
                let top2 = (i + 1) * 2;
                let bottom2 = top2 + -2;
                // Create two triangles for each segment
                // Triangle 1
                indices.push(top1, bottom1, top2);
                // Triangle 2
                indices.push(bottom1, bottom2, top2);

            }
            for (let i = 1; i < numSegments * 2; i += 2) {
                indices.push(i, i + 2, i + 1);
            }


            let vAttribute = attribute(GLType.Vec3, vertices, 3);
            let nAttribute = attribute(GLType.Vec3, normals, 3);

            let lightDir = gl.vec3(-.5, .8, .15);
            let varied = gl.vec3(gl.varying(nAttribute()));
            let normal = gl.normalize(varied);
            let lightIntensity = gl.max(gl.dot(normal, lightDir), 0.0);
            let frag = gl.mix(vec4(gl.sin(gl.mult(.40, gl.uv().x)), 0.2, 0.2, 1), vec4(0, .0, 1.0, 1), gl.smoothstep(0.4, 0, lightIntensity));

            let vVec3 = vector(vAttribute());

            const perspective = (fov: Arg, aspect: Arg, near: Arg, far: Arg) => {
                const f = gl.div(1.0, gl.tan(gl.div(fov, 2.0)));

                return gl.mat4(
                    gl.div(f, aspect), 0, 0, 0,
                    0, f, 0, 0,
                    0, 0, gl.div(gl.add(far, near), gl.sub(near, far)), -1.0,
                    0, 0, gl.div(gl.mult(2.0, gl.mult(far, near)), gl.sub(near, far)), 0
                );
            };

            const view = (cameraPosition: UGen, target: UGen, upVector: UGen) => {
                let zAxis = vector(gl.normalize(gl.sub(cameraPosition, target)));
                let xAxis = vector(gl.normalize(gl.cross(upVector, zAxis)));
                let yAxis = vector(gl.cross(zAxis, xAxis));

                return gl.mat4(
                    xAxis.x, yAxis.x, zAxis.x, 0,
                    xAxis.y, yAxis.y, zAxis.y, 0,
                    xAxis.z, yAxis.z, zAxis.z, 0,
                    gl.mult(-1, gl.dot(xAxis, cameraPosition)),
                    gl.mult(-1, gl.dot(yAxis, cameraPosition)),
                    gl.mult(-1, gl.dot(zAxis, cameraPosition)),
                    1);
            };

            let u = gl.uniform(GLType.Float, 0);
            let j = 0;
            setInterval(() => {
                u.set!(j);
                j += 0.01;
            }, 10);

            let projMat = perspective(Math.PI / 3, window.innerWidth / window.innerHeight, .1, 1000);

            let viewMat = view(gl.vec3(gl.sin(gl.mult(.23, u())), gl.add(gl.mult(3.2, gl.cos(gl.mult(.1, u()))), gl.mult(.1, gl.sin(u()))), gl.add(2.2, gl.sin(gl.mult(.3, gl.cos(u()))))), gl.vec3(0, 0, 0), gl.vec3(0, 1, 0));
            let vert = gl.mult(
                projMat,
                viewMat,
                vec4(
                    vVec3.x, gl.add(gl.mult(.030, gl.sin(u())), vVec3.y), gl.sin(gl.mult(4, vVec3.z)), 1));

            let zenGraph = gl.zen(frag, vert);

            zenGraph.indices = indices;
            zenGraph.drawType = DrawType.TRIANGLE_STRIP;
            let render = gl.mount([zenGraph], ref.current);

            if (render) {
                const loop = () => {
                    if (render) {
                        render(window.innerWidth, window.innerHeight);
                        requestAnimationFrame(loop);
                    }
                };
                loop();

                zenGraph.fragmentContext.initializeUniforms();
            }
        }
    }, []);

    return <div>
        <canvas style={{ width: "100vw", height: "100vh" }} className="bg-black" ref={ref} />
    </div>
};

export default Home;
