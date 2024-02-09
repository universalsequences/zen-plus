import React, { useCallback, useEffect, useState, useRef } from 'react';
import * as gl from '@/lib/gl/index';
import { Context } from '@/lib/gl/types';
import { useInterval } from '@/hooks/useInterval';
import useShaderDisplay from '@/hooks/gl/useShaderDisplay';


const Shader: React.FC<{ fps: number, zenGraph: gl.RenderJob, width: number, height: number }> = ({ zenGraph, width, height, fps = 60 }) => {
    let ref = useRef<HTMLCanvasElement>(null);
    let render = useRef<any>(null);
    let timeout = useRef<any>();
    let widthRef = useRef(width);
    let heightRef = useRef(height);

    useEffect(() => {
        widthRef.current = width;
        heightRef.current = height;
    }, [width, height]);

    const onTick = () => {
        requestAnimationFrame(() => {
            if (render.current) {
                render.current(widthRef.current, heightRef.current);
            }
        });
    }
    useInterval(onTick, 1000 / fps);

    useEffect(() => {
        if (ref.current) {
            if (render.current) {
                render.current("dispose");
            }
            render.current = gl.mount([zenGraph], ref.current);

            /*
            const loop = () => {
                if (render.current) {
                    render.current(widthRef.current, heightRef.current);
    
                    // need a way of controlling frame rate
                    // for now skip every 3
    
                    requestAnimationFrame(loop);
                }
            };
            loop();
            */

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
