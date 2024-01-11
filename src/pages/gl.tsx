"use client"
import '@/styles/styles.scss';
import './globals.css';
import React, { useEffect, useState, useRef } from 'react';
import App from './App';
import * as gl from '@/lib/gl/index';
import { Context } from '@/lib/gl/types';
import useShaderDisplay from '@/hooks/gl/useShaderDisplay';


const Home = () => {
    let uv = gl.uv();
    let u = gl.uniform(gl.GLType.Float, 0);
    let len = gl.sub(gl.length(uv), gl.cos(gl.mult(gl.sin(gl.mult(10, u())), uv.y)));
    let exp1 = gl.mult(
        gl.mult(uv.x, gl.sin(gl.mult(uv.y, u()))),
        gl.sin(
            gl.add(
                gl.sin(gl.mult(10, uv.x)),
                len,
                uv.x)));

    useEffect(() => {
        let i = 0;
        setInterval(() => {
            if (u) {
                u.set!(i);
                i += 0.1;
            }
        }, 50);
    }, []);

    let q = gl.smoothstep(
        uv.x,
        len,
        gl.div(
            exp1,
            gl.cos(
                gl.add(
                    len,
                    gl.add(
                        len,
                        uv.x,
                        gl.mult(
                            10,
                            len,
                            exp1))))));


    let w = gl.sin(gl.mult(10, q));
    let vec = gl.vec4(gl.sub(q, len), gl.mult(len, q, w), gl.add(q, w), 1);
    let generated = gl.zen(vec);
    console.log(generated);

    return <div>
        <Shader width={500} height={500} code={generated.code} context={generated.context} />
    </div>
};

const Shader: React.FC<{ code: string, context: Context, width: number, height: number }> = ({ code, width, height, context }) => {
    let ref = useRef<HTMLCanvasElement>(null);

    let { webGLRenderingContext, webGLProgram } = useShaderDisplay({ width, height, canvasRef: ref, fragmentShaderSrc: code });
    useEffect(() => {
        if (webGLProgram && webGLRenderingContext) {
            context.webGLProgram = webGLProgram;
            context.webGLRenderingContext = webGLRenderingContext;
        }
    }, [webGLProgram, webGLRenderingContext]);

    return <canvas style={{ width, height }} className="bg-black" ref={ref} />;
};

export default Home;
