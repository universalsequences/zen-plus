import { DT, DIFFUSION } from './projection';
import { set_bnd } from './bounds';
export const DIFFUSION_SHADER = `
  @group(0) @binding(0) var<storage, read_write> u : array<f32>;
  @group(0) @binding(1) var<storage, read_write> v : array<f32>;
  @group(0) @binding(2) var<storage, read_write> u_prev : array<f32>;
  @group(0) @binding(3) var<storage, read_write> v_prev : array<f32>;

const N: u32 = 100; // Grid size, assuming a 100x100 grid
const dt: f32 = ${DT}; // Time step
const diff: f32 = ${DIFFUSION}; // Diffusion rate
const visc: f32 = 0.0001; // Viscosity

// Utility function to calculate 1D index from 2D grid coordinates
fn idx(x: u32, y: u32) -> u32 {
    return y * N + x;
}

${set_bnd("u")}
${set_bnd("v")}
fn diffuse_u(i: u32, j: u32, N: u32, diff: f32, dt: f32) {
    if (i > 0 && i < N - 1 && j > 0 && j < N - 1) {
        let a: f32 = dt * diff * f32(N) * f32(N);
        let index: u32 = idx(i, j);
        u_prev[index] = (u[index] + a * (u_prev[idx(i - 1, j)] + u_prev[idx(i + 1, j)] + u_prev[idx(i, j - 1)] + u_prev[idx(i, j + 1)])) / (1.0 + 4.0 * a);
 
    }
}

fn diffuse_v(i: u32, j: u32, N: u32, diff: f32, dt: f32) {
    if (i > 0 && i < N - 1 && j > 0 && j < N - 1) {
        let a: f32 = dt * diff * f32(N) * f32(N);
        let index: u32 = idx(i, j);
        v_prev[index] = (v[index] + a * (v_prev[idx(i - 1, j)] + v_prev[idx(i + 1, j)] + v_prev[idx(i, j - 1)] + v_prev[idx(i, j + 1)])) / (1.0 + 4.0 * a);
 
    }
}



@compute @workgroup_size(8,8,1)
fn main(@builtin(global_invocation_id) global_id : vec3<u32>) {
  let i: u32 = global_id.x;
  let j: u32 = global_id.y;
  diffuse_u(i, j, N, diff, dt);
  set_bnd_u(1, i, j);
  diffuse_v(i, j, N, diff, dt);
  set_bnd_v(2, i, j);
  
}
`;

export const ADVECT_A_SHADER = `
  @group(0) @binding(0) var<storage, read_write> u : array<f32>;
  @group(0) @binding(1) var<storage, read_write> v : array<f32>;
  @group(0) @binding(2) var<storage, read_write> u_prev : array<f32>;
  @group(0) @binding(3) var<storage, read_write> v_prev : array<f32>;
// Assuming global buffer declarations for d, d0, u, and v

const N: u32 = 100; // Grid size, assuming a 100x100 grid

// Utility function to calculate 1D index from 2D grid coordinates
fn idx(x: u32, y: u32) -> u32 {
    return y * N + x;
}

// d: number[][] /* u */, d0: number[][] /*u_prev*/, u: number[][] /*u_prev*/, v: number[][] /*v_prev*/)
// d -> u
// d0 -> u_prev
// u -> u_prev
// v -> v_prev
fn advect(N: u32, b: u32, i: u32, j: u32, dt: f32) {
    if (i > 0 && i < N - 1 && j > 0 && j < N - 1) {
        var x: f32 = f32(i) - dt * u[idx(i, j)];
        var y: f32 = f32(j) - dt * v[idx(i, j)];

        x = max(0.5, min(f32(N) + 0.5, x));
        y = max(0.5, min(f32(N) + 0.5, y));

        let i0: u32 = u32(floor(x));
        let i1: u32 = i0 + 1;
        let j0: u32 = u32(floor(y));
        let j1: u32 = j0 + 1;

        let s1: f32 = x - f32(i0);
        let s0: f32 = 1.0 - s1;
        let t1: f32 = y - f32(j0);
        let t0: f32 = 1.0 - t1;

        u_prev[idx(i, j)] = s0 * (t0 * u_prev[idx(i0, j0)] + t1 * u_prev[idx(i0, j1)]) +
                          s1 * (t0 * u_prev[idx(i1, j0)] + t1 * u_prev[idx(i1, j1)]);
    }
}

${set_bnd("u")}

// Main compute shader function
@compute @workgroup_size(8,8,1)
fn main(@builtin(global_invocation_id) global_id : vec3<u32>, @builtin(workgroup_id) workgroup_id: vec3<u32>) {
    let N: u32 = 100; // Grid size
let dt: f32 = ${DT}; // Time step
    let b: u32 = 1; // Boundary condition parameter

    let i: u32 = global_id.x;
    let j: u32 = global_id.y;

    if (i < N && j < N) {
        advect(N, b, i, j, dt);
    }

    set_bnd_u(1, i, j);

    // Boundary conditions can be applied here or in a separate function
}

`;

export const ADVECT_B_SHADER = `
  @group(0) @binding(0) var<storage, read_write> u : array<f32>;
  @group(0) @binding(1) var<storage, read_write> v : array<f32>;
  @group(0) @binding(2) var<storage, read_write> u_prev : array<f32>;
  @group(0) @binding(3) var<storage, read_write> v_prev : array<f32>;
// Assuming global buffer declarations for d, d0, u, and v

const N: u32 = 100; // Grid size, assuming a 100x100 grid

// Utility function to calculate 1D index from 2D grid coordinates
fn idx(x: u32, y: u32) -> u32 {
    return y * N + x;
}

${set_bnd("v")}

// d -> v
// d0 -> v_prev
// u -> u_prev
// v -> v_prev
fn advect(N: u32, b: u32, i: u32, j: u32, dt: f32) {
    if (i > 0 && i < N - 1 && j > 0 && j < N - 1) {
 var x: f32 = f32(i) - dt * u[idx(i, j)];
        var y: f32 = f32(j) - dt * v[idx(i, j)];

        x = max(0.5, min(f32(N) + 0.5, x));
        y = max(0.5, min(f32(N) + 0.5, y));

        let i0: u32 = u32(floor(x));
        let i1: u32 = i0 + 1;
        let j0: u32 = u32(floor(y));
        let j1: u32 = j0 + 1;

        let s1: f32 = x - f32(i0);
        let s0: f32 = 1.0 - s1;
        let t1: f32 = y - f32(j0);
        let t0: f32 = 1.0 - t1;

        v_prev[idx(i, j)] = s0 * (t0 * v[idx(i0, j0)] + t1 * v[idx(i0, j1)]) +
                          s1 * (t0 * v[idx(i1, j0)] + t1 * v[idx(i1, j1)]);
 
   }
}

// Main compute shader function
@compute @workgroup_size(8,8,1)
fn main(@builtin(global_invocation_id) global_id : vec3<u32>, @builtin(workgroup_id) workgroup_id: vec3<u32>) {
    let N: u32 = 100; // Grid size
let dt: f32 = ${DT}; // Time step
    let b: u32 = 1; // Boundary condition parameter

    let i: u32 = global_id.x;
    let j: u32 = global_id.y;

    if (i < N && j < N) {
        advect(N, b, i, j, dt);
    }

    set_bnd_v(2, i, j);

    // Boundary conditions can be applied here or in a separate function
}

`;

