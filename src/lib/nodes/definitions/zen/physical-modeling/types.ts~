import { createSpiderWeb, SpiderWeb } from '../../../../zen/physical-modeling/web-maker';
import { Statement } from '../AST';

export interface LazyComponent {
    web: SpiderWeb;
    material: LazyMaterial;
}

export interface LazyMaterial {
    x: Statement;
    y: Statement;
    pitch: Statement;
    release: Statement;
    noise: Statement;
    placement: Statement; // where hit goes
    couplingCoefficient: Statement;
}

export type PhysicalModel = LazyComponent[];

// how do we represent: Component1 -> Component2 (aka a connection)
/**
 * Hierarchy:
 * Physical Model
 *   Component
 *     - material
 *     - structure (web)
 *   Component
 *     - material
 *     - structure (web)
 * 
 * A physical model is a series of connected components
 * Uni-directional
 */
