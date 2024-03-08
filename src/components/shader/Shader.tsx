import React, { useCallback, useEffect, useState, useRef } from 'react';
import { ContextMenu, useThemeContext } from '@radix-ui/themes';
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

    const download = useCallback(() => {
        if (ref.current) {
            var image = ref.current.toDataURL("image/png").replace("image/png", "image/octet-stream");

            // Convert base64 to blob
            // Create a temporary link to trigger the download
            var link = document.createElement('a');
            link.download = 'yourImageName.png';
            link.href = image;

            // This will trigger the download
            document.body.appendChild(link);
            link.click();

            // Clean up and remove the link
            document.body.removeChild(link);
        }
    }, []);

    return <div>
        <ContextMenu.Root>
            <ContextMenu.Content
                onMouseDown={(e: any) => e.stopPropagation()}
                style={{ zIndex: 10000000000000 }}
                color="indigo" className="object-context rounded-lg p-2 text-xs">
                <ContextMenu.Item
                    onClick={download}
                    className="text-white hover:bg-white hover:text-black px-2 py-1 outline-none cursor-pointer">
                    Download Image
                </ContextMenu.Item>
            </ContextMenu.Content>
            <ContextMenu.Trigger
                className="ContextMenuTrigger relative">
                <canvas style={{ width, height }} className="bg-black rendered-canvas" ref={ref} />
            </ContextMenu.Trigger>
        </ContextMenu.Root>
    </div>

};

export default Shader;
