import React, { useEffect, useState, useRef } from 'react';
import * as gl from '@/lib/gl/index';
import { Context } from '@/lib/gl/types';
import useShaderDisplay from '@/hooks/gl/useShaderDisplay';


const Shader: React.FC<{ zenGraph: gl.RenderJob, width: number, height: number }> = ({ zenGraph, width, height }) => {
    let ref = useRef<HTMLCanvasElement>(null);
    let render = useRef<any>(null);
    let widthRef = useRef(width);
    let heightRef = useRef(height);

    useEffect(() => {
        widthRef.current = width;
        heightRef.current = height;
    }, [width, height]);


    useEffect(() => {
        if (ref.current) {
            console.log('mounting graph=', zenGraph);
            render.current = gl.mount([zenGraph], ref.current);
            const loop = () => {
                if (render.current) {
                    render.current(widthRef.current, heightRef.current);
                    requestAnimationFrame(loop);
                }
            };
            loop();

            zenGraph.fragmentContext.initializeUniforms();
            if (zenGraph.vertexContext) {
                zenGraph.vertexContext.initializeUniforms();
            }
        }
    }, [zenGraph]);

    return <div>
        <canvas style={{ width, height }} className="bg-black rendered-canvas" ref={ref} />
    </div>

};

export default Shader;
