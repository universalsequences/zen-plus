import { DT } from './projection';

export const ADD_SOURCE_SHADER = `
 @group(0) @binding(0) var<storage, read_write> u : array<f32>;
  @group(0) @binding(1) var<storage, read_write> v : array<f32>;
  @group(0) @binding(2) var<storage, read_write> u_prev : array<f32>;
  @group(0) @binding(3) var<storage, read_write> v_prev : array<f32>;

const dt: f32 = ${DT}; // Time step
const N: u32 = 100;

fn idx(x: u32, y: u32) -> u32 {
    return y * N + x;
}

fn add_force(forceX: f32, forceY: f32, i: u32, j: u32) {
    let index: u32 = idx(i, j);
    if (i < N && j < N) {
      u_prev[index] += dt * forceX;
      v_prev[index] += dt * forceY;
    }
}

@compute @workgroup_size(8,8,1)
fn main(@builtin(global_invocation_id) global_id : vec3<u32>) {
  let i: u32 = global_id.x;
  let j: u32 = global_id.y;
let forceX: f32 = 2;
let forceY: f32 = -3;
   //add_force(forceX, forceY, i, j);
  let index: u32 = idx(i,j);
   u_prev[index] = u_prev[index] + dt*u[index];
   v_prev[index] = v_prev[index] + dt*v[index];
}
`
