import { API } from '@/lib/nodes/context';
import { index } from '@/lib/onchain/index';
import { doc } from './doc';
import { Lazy, ObjectNode, Message } from '@/lib/nodes/types';
import { Statement, Operator } from '@/lib/nodes/definitions/zen/types';
import { compileStatement, printStatement } from '../zen/AST';


export const api: API = {
};
