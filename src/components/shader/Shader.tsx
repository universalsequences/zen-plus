import React, { useEffect, useState, useRef } from 'react';
import { Context } from '@/lib/gl/types';
import useShaderDisplay from '@/hooks/gl/useShaderDisplay';


const Shader: React.FC<{ code: string, context: Context, width: number, height: number }> = ({ code, width, height, context }) => {
    let ref = useRef<HTMLCanvasElement>(null);

    let { webGLRenderingContext, webGLProgram } = useShaderDisplay({ width, height, canvasRef: ref, fragmentShaderSrc: code });

    useEffect(() => {
        if (webGLProgram && webGLRenderingContext) {
            context.webGLProgram = webGLProgram;
            context.webGLRenderingContext = webGLRenderingContext;
            context.initializeUniforms();
        }
    }, [webGLProgram, webGLRenderingContext, context]);

    return <canvas style={{ width, height }} className="bg-black" ref={ref} />;
};

export default Shader;
