import React, { useRef, useEffect } from 'react';
import * as gl from '@/lib/gl/index';
import { UGen, Arg } from '@/lib/gl/types';

const mod289 = (x: UGen): UGen => {
    return gl.sub(x, gl.mult(289, gl.floor(gl.mult(x, 1.0 / 289.))));

};

const permute = (x: UGen): UGen => {
    return mod289((gl.mult(gl.add(1, gl.mult(x, 34)), x)));
};

const taylorInvSqrt = (x: UGen): UGen => {
    return gl.sub(1.79284291400159, gl.mult(0.85373472095314, x));
};

const fade = (t: UGen): UGen => {
    return gl.mult(t, t, t, gl.add(10, gl.mult(t, gl.sub(gl.mult(t, 6), 15))));
};

const perlin = (P: UGen): UGen => {
    const i0 = gl.vector(mod289(gl.floor(P)));
    const i1 = gl.vector(mod289(gl.add(i0, gl.vec3(1, 1, 1))));
    const f0 = gl.fract(P);
    const f1 = gl.sub(f0, gl.vec3(1, 1, 1));
    const f = gl.vector(fade(f0));
    const ix = gl.vec4(i0.x, i1.x, i0.x, i1.x);
    const iy = gl.vec4(i0.y, i0.y, i1.y, i1.y);
    const iz0 = gl.vec4(i0.z, i0.z, i0.z, i0.z);
    const iz1 = gl.vec4(i1.z, (i1).z, (i1).z, (i1).z);
    const ixy = permute(gl.add(permute(ix), iy));
    const ixy0 = permute(gl.add(ixy, iz0));
    const ixy1 = permute(gl.add(ixy, iz1));
    let gx0 = gl.vector(gl.mult(ixy0, 1.0 / 7.0));
    let gy0 = gl.vector(gl.sub(gl.fract(gl.mult(gl.floor(gx0), 1.0 / 7.0)), 0.5));

    let gx1 = gl.vector(gl.mult(ixy1, 1.0 / 7.0));
    let gy1 = gl.vector(gl.sub(gl.fract(gl.mult(gl.floor(gx1), 1.0 / 7.0)), 0.5));

    gx0 = gl.vector(gl.fract(gx0));
    gx1 = gl.vector(gl.fract(gx1));

    let gz0 = gl.vector(gl.sub(gl.sub(gl.vec4(0.5, 0.5, 0.5, 0.5), gl.abs(gx0)), gl.abs(gy0)));
    let sz0 = gl.step(gz0, gl.vec4(0, 0, 0, 0));

    let gz1 = gl.vector(gl.sub(gl.sub(gl.vec4(0.5, 0.5, 0.5, 0.5), gl.abs(gx1)), gl.abs(gy1)));
    let sz1 = gl.step(gz1, gl.vec4(0, 0, 0, 0));

    gx0 = gl.vector(gl.sub(gx0, gl.mult(sz0, gl.sub(gl.step(0, gx0), .5))));

    gy0 = gl.vector(gl.sub(gy0, gl.mult(sz0, gl.sub(gl.step(0, gy0), .5))));
    gx1 = gl.vector(gl.sub(gx1, gl.mult(sz1, gl.sub(gl.step(0, gx1), .5))));
    gy1 = gl.vector(gl.sub(gy1, gl.mult(sz1, gl.sub(gl.step(0, gy1), .5))));
    let g0: UGen = gl.vec3(gx0.x, gy0.x, gz0.x);
    let g1: UGen = gl.vec3(gx0.x, gy0.x, gz0.x);
    let g2: UGen = gl.vec3(gx0.z, gy0.z, gz0.z);
    let g3: UGen = gl.vec3(gx0.w, gy0.w, gz0.w);
    let g4: UGen = gl.vec3(gx1.x, gy1.x, gz1.x);
    let g5: UGen = gl.vec3(gx1.y, gy1.y, gz1.y);
    let g6: UGen = gl.vec3(gx1.z, gy1.z, gz1.z);
    let g7: UGen = gl.vec3(gx1.w, gy1.w, gz1.w);

    let norm0 = gl.vector(taylorInvSqrt(gl.vec4(gl.dot(g0, g0), gl.dot(g2, g2), gl.dot(g1, g1), gl.dot(g3, g3))));
    let norm1 = gl.vector(taylorInvSqrt(gl.vec4(gl.dot(g4, g4), gl.dot(g6, g6), gl.dot(g5, g5), gl.dot(g7, g7))));

    g0 = gl.mult(g0, norm0.x);
    g2 = gl.mult(g2, norm0.y);
    g1 = gl.mult(g1, norm0.z);
    g3 = gl.mult(g3, norm0.w);

    g4 = gl.mult(g4, norm1.x);
    g6 = gl.mult(g6, norm1.y);
    g5 = gl.mult(g5, norm1.z);
    g7 = gl.mult(g7, norm1.w);

    const nz = gl.vector(gl.mix(
        gl.vec4(
            gl.dot(g0, gl.unpack("xyz")(f0)),
            gl.dot(g1, gl.vec3(gl.unpack("x")(f1),
                gl.unpack("y")(f1),
                gl.unpack("z")(f0))),
            gl.dot(g2, gl.vec3(gl.unpack("x")(f0),
                gl.unpack("y")(f1),
                gl.unpack("z")(f0))),
            gl.dot(g3, gl.vec3(gl.unpack("x")(f1),
                gl.unpack("y")(f1),
                gl.unpack("z")(f0)))),
        gl.vec4(
            gl.dot(g4, gl.vec3(gl.unpack("x")(f0),
                gl.unpack("y")(f0),
                gl.unpack("z")(f1))),
            gl.dot(g5, gl.vec3(gl.unpack("x")(f1),
                gl.unpack("y")(f0),
                gl.unpack("z")(f1))),
            gl.dot(g6, gl.vec3(gl.unpack("x")(f0),
                gl.unpack("y")(f1),
                gl.unpack("z")(f1))),
            gl.dot(g7, gl.vec3(gl.unpack("x")(f1),
                gl.unpack("y")(f1),
                gl.unpack("z")(f1)))),
        gl.unpack("z")(f)));


    return gl.mult(2.2, gl.mix(gl.mix(nz.x, nz.z, f.y), gl.mix(nz.y, nz.w, f.y), f.x));
};


const ShaderBackground: React.FC<{ scrollTop: number, height: number }> = ({ scrollTop, height }) => {
    const ref = useRef<HTMLCanvasElement>(null);
    const uniRef = useRef<any>(null);

    useEffect(() => {
        let ratio = Math.pow(scrollTop / height, .5);
        if (uniRef.current) {
            let val = ratio;
            uniRef.current.set!(val);
        }
    }, [scrollTop, height]);

    useEffect(() => {
        if (!ref.current) {
            return;
        }
        let uni = gl.uniform(gl.GLType.Float, .63);
        uniRef.current = uni;
        let time = gl.uniform(gl.GLType.Float, 0);
        let uv3 = gl.vec3(gl.uv().x, gl.sin(gl.mult(2, gl.uv().y, gl.uv().x)), gl.add(uni(), time()));
        let t = 0;

        let p = gl.smoothstep(0, 1.1, perlin(gl.mult(10, uv3)));
        let zenGraph = gl.zen(gl.mix(gl.vec4(.63, .63, .63, 1), gl.vec4(p, 0, gl.mult(0.9, gl.sub(p, gl.mult(p, uni()))), p), uni()));
        let render = gl.mount([zenGraph], ref.current);

        if (render) {
            let counter = 0;
            const loop = () => {
                if (render) {
                    counter++;
                    if (counter % 8 === 0) {
                        render(window.innerWidth, window.innerHeight);
                    }
                    requestAnimationFrame(loop);
                    t += 0.0005;
                    time.set!(t);
                }
            };
            loop();

            zenGraph.fragmentContext.initializeUniforms();
        }
    }, []);

    return (
        <canvas ref={ref} className="w-full h-full absolute top-0 left-0 z-0" />
    );
};

export default ShaderBackground
