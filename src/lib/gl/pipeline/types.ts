import { Context } from '../types';

export interface RenderJob {
    fragment: string;
    vertex: string;
    fragmentContext: Context;
    vertexContext: Context;
}

export type RenderPipeline = RenderJob[];

