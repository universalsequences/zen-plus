import { Arg } from './zen';
import { Context } from './context';

export const interp = (time: Arg, ...points: Arg[]) => {
    return (context: Context) => {
        let t = context.gen(time);
        let pts = points.map(x => context.gen(x));

        let [interp, mt, mt2, mt3, t2, t3, c0, c1, c2, c3, c4, c5] =
            context.useVariables(
                "interp",
                "mt", "mt2", "mt3",
                "t", "t2", "t3",
                "c0", "c1", "c2", "c3", "c4", "c5");

        let out = "";
        if (pts.length === 2) {
            out = `
${context.varKeyword} ${mt} = 1 - ${t.variable};
${context.varKeyword} ${c1} = ${pts[0].variable} * ${mt};
${context.varKeyword} ${c2} = ${pts[1].variable} * ${t.variable};
${context.varKeyword} ${interp} = ${c1} + ${c2};
`;
        } else if (pts.length === 3) {
            out = `
${context.varKeyword} ${mt} = 1 - ${t.variable};
${context.varKeyword} ${c0} = ${pts[0].variable} * ${mt} * ${mt};
${context.varKeyword} ${c1} = 2 * ${pts[1].variable} * ${mt} * ${t.variable};
${context.varKeyword} ${c2} = ${pts[2].variable} * ${t.variable} * ${t.variable};

${context.varKeyword} ${interp} = ${c0} + ${c1} + ${c2};
`;
        } else if (pts.length === 4) {
            out = `
${context.varKeyword} ${mt} = 1 - ${t.variable};
${context.varKeyword} ${mt2} = ${mt} * ${mt};
${context.varKeyword} ${t2} = ${t.variable} * ${t.variable};
${context.varKeyword} ${c0} = ${pts[0].variable} * ${mt2} * ${mt};
${context.varKeyword} ${c1} = 3 * ${pts[1].variable} * ${mt2} * ${t.variable};
${context.varKeyword} ${c2} = 3 * ${pts[2].variable} * ${mt} * ${t2};
${context.varKeyword} ${c3} = ${pts[3].variable} * ${t2} * ${t.variable};

${context.varKeyword} ${interp} = ${c0} + ${c1} + ${c2} + ${c3};
`;
        } else if (pts.length === 6) {
            out = `
${context.varKeyword} ${mt} = 1 - ${t.variable};
${context.varKeyword} ${mt2} = ${mt} * ${mt};
${context.varKeyword} ${mt3} = ${mt2} * ${mt};
${context.varKeyword} ${t2} = ${t.variable} * ${t.variable};
${context.varKeyword} ${t3} = ${t2} * ${t.variable};
${context.varKeyword} ${c0} = ${pts[0].variable} * ${mt3} * ${mt2};
${context.varKeyword} ${c1} = 5 * ${pts[1].variable} * ${mt3} * ${t.variable};
${context.varKeyword} ${c2} = 10 * ${pts[2].variable} * ${mt2} * ${t2};
${context.varKeyword} ${c3} = 10 * ${pts[3].variable} * ${mt} * ${t3};
${context.varKeyword} ${c4} = 5 * ${pts[4].variable} * ${t3} * ${t2};
${context.varKeyword} ${c5} = ${pts[5].variable} * ${t3} * ${t3};

${context.varKeyword} ${interp} = ${c0} + ${c1} + ${c2} + ${c3} + ${c4} + ${c5};
`;
        }

        return context.emit(
            out, interp, t, ...pts);
    };
};
