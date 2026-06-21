struct Particle {
  position: vec4<f32>,
  velocity: vec4<f32>,
}

struct Params {
  tectonicVolatility: f32,
  viscosity: f32,
  cohesion: f32,
  audioSensitivity: f32,
  bass: f32,
  treble: f32,
  tectonicOffset: f32,
  gravityInverted: u32,
}

@group(0) @binding(0) var<storage, read> particlesIn: array<Particle>;
@group(0) @binding(1) var<storage, read_write> particlesOut: array<Particle>;
@group(0) @binding(2) var<uniform> params: Params;

fn getTerrainHeight(u: f32, v: f32) -> f32 {
  let H_base = 1.0;
  
  let mtn_u = u - 0.7415;
  let mtn_v = v - 0.7562;
  let H_mtn = 12.0 * exp(-(mtn_u * mtn_u / 0.0392 + mtn_v * mtn_v / 0.0512));

  var H_inlet = 0.0;
  if (v > 0.8) {
    let inlet_v = v - 0.92;
    H_inlet = -4.0 * exp(-(inlet_v * inlet_v / 0.0128));
  }

  let lake_u = u - 0.38;
  let lake_v = v - 0.54;
  let H_lake = -2.5 * exp(-(lake_u * lake_u / 0.0072 + lake_v * lake_v / 0.0032));

  let PI = 3.14159265;
  let river_v = v - (0.05 + 0.05 * sin(PI * u));
  let H_river = -3.0 * exp(-(river_v * river_v / 0.0018));

  let baseHeight = max(0.0, H_base + H_mtn + H_inlet + H_lake + H_river);
  return baseHeight + (params.tectonicOffset * params.tectonicVolatility);
}

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let index = global_id.x;
  
  // Guard against out-of-bounds execution (2,500,000 particles)
  if (index >= 2500000u) {
    return;
  }

  var p = particlesIn[index];
  var pos = p.position.xyz;
  var vel = p.velocity.xyz;

  // 1. Grid-coupled flocking (Boids O(N) approximation)
  // Maps 3D space to a virtual grid to couple behaviors
  let gridSize = 16.0;
  let cell = floor(pos * gridSize);
  let cellCenter = (cell + vec3<f32>(0.5, 0.5, 0.5)) / gridSize;
  let toCenter = cellCenter - pos;
  let distToCenter = length(toCenter);
  
  var cohesionForce = vec3<f32>(0.0);
  if (distToCenter > 0.0) {
    cohesionForce = (toCenter / distToCenter) * params.cohesion * 0.05;
  }

  // 2. Navier-Stokes fluid simulation flow field
  // Simple trigonometric flow fields representing fluid vorticity
  let flowForce = vec3<f32>(
    sin(pos.y * 10.0 + params.tectonicOffset) * params.viscosity * 0.1,
    cos(pos.x * 10.0 - params.tectonicOffset) * params.viscosity * 0.1,
    sin(pos.z * 10.0 + params.tectonicOffset) * params.viscosity * 0.1
  );

  // 3. Gravity and Audio-reactive Volatility
  var gravity = vec3<f32>(0.0, -9.8, 0.0);
  if (params.gravityInverted != 0u) {
    gravity = vec3<f32>(0.0, 9.8, 0.0);
  }
  gravity.x += params.tectonicOffset * 3.0;
  gravity.z += sin(params.tectonicOffset) * 3.0;
  
  // Chaotic tectonic volatility perturbing the particles
  let noise = vec3<f32>(
    sin(f32(index) * 0.1) * params.tectonicVolatility * 0.2,
    cos(f32(index) * 0.2) * params.tectonicVolatility * 0.2,
    sin(f32(index) * 0.3) * params.tectonicVolatility * 0.2
  );

  // Combine forces
  let totalAcceleration = cohesionForce + flowForce + gravity * 0.01 + noise;

  // Integrate equations of motion
  vel = vel + totalAcceleration * 0.016;
  
  // Clamp speed to prevent instability
  let speed = length(vel);
  if (speed > 2.0) {
    vel = (vel / speed) * 2.0;
  }

  pos = pos + vel * 0.016;

  // Periodic boundary wrapping inside [-1.0, 1.0] domain
  if (pos.x < -1.0) { pos.x = 1.0; }
  if (pos.x > 1.0) { pos.x = -1.0; }
  if (pos.z < -1.0) { pos.z = 1.0; }
  if (pos.z > 1.0) { pos.z = -1.0; }

  // Obtain terrain height for safe wrapping and collision
  let u = clamp((pos.x + 1.0) / 2.0, 0.0, 1.0);
  let v = clamp((pos.z + 1.0) / 2.0, 0.0, 1.0);
  let rawTerrainHeight = getTerrainHeight(u, v);
  // Clamp terrainY to strictly less than 1.0 (e.g., 0.98) to prevent oscillation at bounds
  let terrainY = clamp((rawTerrainHeight / 15.0) * 2.0 - 1.0, -1.0, 0.98);

  // Wrap y coordinate safely without trapping the particle under the terrain
  if (pos.y < -1.0) {
    pos.y = 1.0;
  }
  if (pos.y > 1.0) {
    pos.y = terrainY;
  }

  // Terrain collision
  if (pos.y < terrainY) {
    pos.y = terrainY;
    vel.y = -vel.y * 0.3;
    vel.x = vel.x + params.tectonicOffset * 0.2;
  }

  let speedFactor = clamp(length(vel) / 2.0, 0.0, 1.0);

  // Write updated particle states
  particlesOut[index].position = vec4<f32>(pos, 1.0);
  particlesOut[index].velocity = vec4<f32>(vel, speedFactor);
}
