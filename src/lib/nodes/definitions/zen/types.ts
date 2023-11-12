import { AccumParams } from '../../../zen/accum';
import { ObjectNode } from '../../types';
import { RoundMode } from '../../../zen/math';
import { Clicker } from '../../../zen/click';
import { BlockGen, Interpolation } from '../../../zen/data';
import { History } from '../../../zen/index';
import {
    ParamGen
} from '../../../zen/index';
import { Material } from '../../../zen/physical-modeling/spider-web';
import { Component } from '../../../zen/physical-modeling/Component';
import { SpiderWeb } from '../../../zen/physical-modeling/web-maker';
import { PhysicalModel } from './physical-modeling/types';

export interface DataParams {
    size: number,
    channels: number,
    initData?: Float32Array
}

export type CustomParams = AccumParams | RoundMode | DataParams | BlockGen | Clicker | Component | SpiderWeb | string;

export interface CompoundOperator {
    name: string;
    history?: History;
    param?: ParamGen;
    params?: CustomParams;
    range?: Range;
    outputNumber?: number;
    variableName?: string;
    value?: number;
    material?: Material;
    physicalModel?: PhysicalModel;
    interpolation?: Interpolation;
    block1?: BlockGen;
    block2?: BlockGen;
    historyInput?: Statement;
}

export type Operator = "string" | CompoundOperator;

/**
 * A Statement is a list [OPERATOR, STATEMENT, STATEMENT...],
 * essentially a recursive type representing a function call
 */

export type BaseStatement = BlockGen | Component | number | [Operator, ...Statement[]];
export type Statement = BaseStatement & {
    node?: ObjectNode
};

