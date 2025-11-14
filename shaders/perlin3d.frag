#version 300 es
#define VOL_TORUS

precision highp float;

struct Ray {
    vec3 position;
    vec3 direction;
    float step_size;
    vec3 start;
    vec3 end;
};

const float PI = acos(-1.);
const vec4 COL1 = vec4(0.2, 1.0, 0.9333, 1.0);
const vec4 COL2 = vec4(0.6627, 0.4863, 0.9922, 1.0);
const vec4 COL3 = vec4(0.2196, 0.9725, 0.5098, 1.0);
const vec4 COL4 = vec4(0.9059, 0.8549, 0.1333, 1.0);

uniform float u_time;

in vec4 v_position;

out vec4 frag_color;

vec3 srandom3(in vec3 p) {
    p = vec3( dot(p, vec3(127.1, 311.7, 74.7)),
            dot(p, vec3(269.5, 183.3, 246.1)),
            dot(p, vec3(113.5, 271.9, 124.6)));
    return -1. + 2. * fract(sin(p) * 43758.5453123);
}

// returns the signed distance from position `p` to the 'normal' cube
float volumeSDF(vec3 p) {
    #ifdef VOL_TORUS
        p.xyz = p.xzy;
        vec2 t = vec2(1, .5);
        return length( vec2(length(p.xz)-t.x,p.y) )-t.y;
    #elif defined(VOL_SPHERE)
        return length(p) - 1.;
    #else
        vec3 d = abs(p)-vec3(1);
        return min(max(d.x,max(d.y,d.z)),0.0) + length(max(d,0.0));
    #endif
}

// returns the gradient vector at position `p`
vec3 gradient(vec3 p) {
    return normalize(srandom3(p)); // diagonal bias, but good enough i guess
}

// returns the perlin noise at position `p`
float perlin(vec3 p) {

    float[8] a;

    int k = 0;
    for (int dz = 0; dz <= 1; ++dz) {
    for (int dy = 0; dy <= 1; ++dy) {
    for (int dx = 0; dx <= 1; ++dx) {
        vec3 c = floor(p + vec3(dx, dy, dz));
        a[k++] = dot(gradient(c), c - p);
    }}}
    
    p = smoothstep(0., 1., fract(p));
    return mix(
        mix(
            mix(a[0], a[1], p.x), 
            mix(a[2], a[3], p.x), 
            p.y
        ),
        mix(
            mix(a[4], a[5], p.x), 
            mix(a[6], a[7], p.x), 
            p.y
        ), 
        p.z
    );
}

// returns the volume density at position `p`
float density(vec3 p) {
    return (perlin(p * 2.)) * step(0., -volumeSDF(p));
}

// returns the color for a given density 'x'
vec4 transfer(float x) {
    vec4 color = mix(COL1, COL2, step(.2, x));
    color.a = smoothstep(.0, 1., x);
    return color;
}

const int M = 3; // iterations for entry and exit point approximation
const int N = 60; // number volume samples

void main() {
    // camera setup
    vec2 uv = v_position.xy;
    vec3 camera_position = vec3(0, 0, -6);
    float focal_length = -2.;
    
    // model transformation
    float a = u_time * 1.10;
    mat3x3 T;
    T[0] = vec3(cos(a), 0, sin(a));
    T[1] = vec3(0, 1, 0);
    T[2] = vec3(-sin(a), 0, cos(a));

    // ray setup
    Ray ray;
    ray.position = vec3(uv, 0) + camera_position;
    ray.direction = normalize(camera_position - vec3(0, 0, focal_length) - ray.position);
    
    // approximate ray entry point into boundary
    for (int i = 0; i < M; ++i) {
        vec3 p = T * ray.position;
        float d = volumeSDF(p);
        if (d > .01)
            ray.position += ray.direction * d;
    }
    ray.start = ray.position;

    // overshoot the boundary
    ray.position += ray.direction * 2.;

    // approximate ray exit point out of boundary
    for (int i = 0; i < M; ++i) {
        vec3 p = T * ray.position;
        float d = volumeSDF(p);
        if (d > .01)
            ray.position -= ray.direction * d;
    }
    ray.end = ray.position;

    // reset ray and compute step size
    ray.position = ray.start;
    ray.step_size = distance(ray.start, ray.end) / float(N);

    // step through cube and accumulate color
    vec3 color;
    for (int i = 0; i < N; ++i) {
        vec3 p = T * ray.position;
        vec4 s = transfer(density(p)); // sample density at `p` and transfer it into a color
        color = mix(color, s.rgb, s.a); // blend function
        ray.position += ray.direction * ray.step_size;
    }
    
    frag_color = vec4(color, 1);
}
