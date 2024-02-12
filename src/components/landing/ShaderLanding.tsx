import React, { useEffect, useRef } from 'react';
import * as gl from '@/lib/gl/index';

const ShaderLanding: React.FC<{}> = ({ }) => {
    let ref = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (!ref.current) {
            return;
        }
        let len = gl.length(gl.mult(gl.uv(), .3));
        let y = gl.length(gl.fract(gl.mult(len, gl.uv())));
        let x = gl.smoothstep(0, 1, gl.fract(gl.mult(7, gl.nuv())))
        let len2 = gl.length(x);
        let zenGraph = gl.zen(gl.mult(1, gl.vec4(len, gl.smoothstep(3, 0, gl.sub(y, gl.mult(.1, len))), gl.sub(len2, len), 1)));

        //zenGraph.indices = indices;
        //zenGraph.drawType = DrawType.TRIANGLE_STRIP;
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

    }, []);

    return (
        <div className="w-64 h-96 rounded-3xl relative flex overflow-hidden border-zinc-400 border">
            <canvas className="absolute top-0 left-0 w-64 h-96 rounded-3xl" ref={ref} />
            <div className="m-auto z-10">
                Yes
            </div>
        </div>
    );
};

export default ShaderLanding;
