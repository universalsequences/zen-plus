export const set_bnd = (d: string) => `
fn set_bnd_${d}(b: u32, i: u32, j: u32) {
    let index: u32 = idx(i, j);
    
        if (i == 0) {
            ${d}[index] = select( ${d}[idx(1, j)], -${d}[idx(1, j)] , (b == 1) );
        }
        if (i == N - 1) {
            ${d}[index] = select(${d}[idx(N - 2, j)], -${d}[idx(N - 2, j)], (b == 1)) ;
        }
        if (j == 0) {
            ${d}[index] = select(${d}[idx(i, 1)], -${d}[idx(i, 1)] , (b == 2) );
        }
        if (j == N - 1) {
            ${d}[index] = select(${d}[idx(i, N - 2)], -${d}[idx(i, N - 2)] , (b == 2) );
        }

     // Corner conditions
    if (i == 0 && j == 0) {
        ${d}[index] = 0.5 * (${d}[idx(1, 0)] + ${d}[idx(0, 1)]);
    }
    if (i == 0 && j == N - 1) {
        ${d}[index] = 0.5 * (${d}[idx(1, N - 1)] + ${d}[idx(0, N - 2)]);
    }
    if (i == N - 1 && j == 0) {
        ${d}[index] = 0.5 * (${d}[idx(N - 2, 0)] + ${d}[idx(N - 1, 1)]);
    }
    if (i == N - 1 && j == N - 1) {
        ${d}[index] = 0.5 * (${d}[idx(N - 2, N - 1)] + ${d}[idx(N - 1, N - 2)]);
    }
}
`;
