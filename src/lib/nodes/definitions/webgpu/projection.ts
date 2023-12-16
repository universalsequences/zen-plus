import { set_bnd } from './bounds';
export const DIFFUSION = 0.0000001;
export const DT = 0.00000001;
export const projection = (u: string, u_prev: string, v: string, v_prev: string) => {
    const PROJECTION_A_SHADER = `
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

${set_bnd(u)}
${set_bnd(v)}

@compute @workgroup_size(8,8,1)
fn main(@builtin(global_invocation_id) global_id : vec3<u32>) {
  let i: u32 = global_id.x;
  let j: u32 = global_id.y;

  // calculate divergence and store in v
  if (i > 0 && i < N - 1 && j > 0 && j < N - 1) {
    //${u}[idx(i, j)] = 0;
    ${v}[idx(i, j)] =   (${u_prev}[idx(i + 1,j)] - ${u_prev}[idx(i,j)] + ${v_prev}[idx(i,j + 1)] - ${v_prev}[idx(i,j)]);
  }
set_bnd_${u}(0, i, j);
set_bnd_${v}(0, i, j);
}
`;

    /***
        *
        Once you have calculated the divergence of the velocity field (stored in your div buffer),
        the next step in the fluid simulation's projection phase is to use this divergence field
        to compute a pressure field that will be used to correct the velocity field, making it divergence-free.
        The pressure field is typically computed by solving a Poisson equation, where the divergence field acts as a source term.

Solving the Poisson Equation for Pressure
Set Up the Poisson Equation: The goal is to find a pressure field p such that its gradient negates the divergence
in the velocity field. The Poisson equation to be solved is usually of the form ∇²p = div, where div is the divergence you've calculated.

*/


    const PROJECTION_B_SHADER = `
  @group(0) @binding(0) var<storage, read_write> u : array<f32>;
  @group(0) @binding(1) var<storage, read_write> v : array<f32>;
  @group(0) @binding(2) var<storage, read_write> u_prev : array<f32>;
  @group(0) @binding(3) var<storage, read_write> v_prev : array<f32>;

const N: u32 = 100; // Grid size, assuming a 100x100 grid
const dt: f32 = ${DT}; // Time step
const diff: f32 = 0.001; // Diffusion rate
const visc: f32 = 0.0001; // Viscosity


fn idx(x: u32, y: u32) -> u32 {
    return y * N + x;
}


fn linear_solve_pressure(i: u32, j: u32, N: u32, diff: f32, dt: f32) {
    if (i > 0 && i < N - 1 && j > 0 && j < N - 1) {
        let a: f32 = dt * diff * f32(N) * f32(N);
        let index: u32 = idx(i, j); 
        // we store pressure in u
        // remember v is the divergence
        ${u}[index] = (${v}[index] + a * (${u_prev}[idx(i - 1, j)] + ${u_prev}[idx(i + 1, j)] + ${u_prev}[idx(i, j - 1)] + ${u_prev}[idx(i, j + 1)])) / (1.0 + 4.0 * a);
    }
}

${set_bnd(u)}


@compute @workgroup_size(8,8,1)
fn main(@builtin(global_invocation_id) global_id : vec3<u32>) {
  let i: u32 = global_id.x;
  let j: u32 = global_id.y;

  linear_solve_pressure(i, j, N, diff, dt);
  set_bnd_${u}(0, i, j);
}
`;



    /*
      Applying Pressure Correction to Velocity
Once you have computed the pressure field, you use it to adjust the velocity field to make it divergence-free:

Subtract Pressure Gradient: This involves subtracting the gradient of the pressure field from the velocity field. In discrete terms, this typically looks like adjusting each component of the velocity based on the difference in pressure between adjacent cells.

      */
    const PROJECTION_C_SHADER = `
  @group(0) @binding(0) var<storage, read_write> u : array<f32>;
  @group(0) @binding(1) var<storage, read_write> v : array<f32>;
  @group(0) @binding(2) var<storage, read_write> u_prev : array<f32>;
  @group(0) @binding(3) var<storage, read_write> v_prev : array<f32>;

const N: u32 = 100; // Grid size, assuming a 100x100 grid
const dt: f32 = ${DT}; // Time step
const diff: f32 = ${DIFFUSION}; // Diffusion rate
const visc: f32 = 0.0001; // Viscosity


fn idx(x: u32, y: u32) -> u32 {
    return y * N + x;
}

${set_bnd(u)}
${set_bnd(v)}

@compute @workgroup_size(8,8,1)
fn main(@builtin(global_invocation_id) global_id : vec3<u32>) {
  let i: u32 = global_id.x;
  let j: u32 = global_id.y;
    if (i > 0 && i < N - 1 && j > 0 && j < N - 1) {
${u_prev}[idx(i,j)] -=  0.5 * (${u}[idx(i+1,j)] - ${u}[idx(i-1, j)]);
${v_prev}[idx(i,j)] -=  0.5 * (${u}[idx(i,j+1)] - ${u}[idx(i, j-1)]);
}
set_bnd_${u}(1, i, j);
set_bnd_${v}(2, i, j);
}
`;

    return [PROJECTION_A_SHADER, PROJECTION_B_SHADER, PROJECTION_C_SHADER];
}

