#version 300 es

precision highp float;

const float PI = acos(-1.);
const vec4 COL1 = vec4(0.2, 1.0, 0.9333, 1.0);
const vec4 COL2 = vec4(0.6627, 0.4863, 0.9922, 1.0);
const vec4 COL3 = vec4(0.2196, 0.9725, 0.5098, 1.0);
const vec4 COL4 = vec4(0.9059, 0.8549, 0.1333, 1.0);

struct Ray {
    vec3 position;
    vec3 step;
};




uniform float u_time;

in vec4 v_position;
in vec2 v_texcoord;

out vec4 frag_color;


vec3 srandom3(in vec3 p) {
    p = vec3( dot(p, vec3(127.1, 311.7, 74.7)),
            dot(p, vec3(269.5, 183.3, 246.1)),
            dot(p, vec3(113.5, 271.9, 124.6)));
    return -1. + 2. * fract(sin(p) * 43758.5453123);
}

float cubeSDF( vec3 p ) {
    vec3 d = abs(p)-vec3(1);
    return min(max(d.x,max(d.y,d.z)),0.0) + length(max(d,0.0));
}

vec3 icdf(in vec3 x) {;
    return log(1. / x) / 1.702;
}

vec3 gradient(vec3 c) {

    return normalize(srandom3(c));

    // int i = c.x + c.y * N + c.z * N * N;
    // return vec3(noise[i], noise[i+1], noise[i+2]);
}


float perlin(vec3 p) {

    float[8] a;

    for (int dz = 0; dz <= 1; ++dz) {
    for (int dy = 0; dy <= 1; ++dy) {
    for (int dx = 0; dx <= 1; ++dx) {
        int k = dx + dy * 2 + dz * 4;
        vec3 c = vec3(floor(p + vec3(dx, dy, dz)));
        vec3 gradient = gradient(c);
        vec3 offset = vec3(c) - p;
        a[k] = dot(gradient, offset);
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

float normalcube(vec3 p) {
    vec3 s = 1. - step(1., abs(p));
    return s.x * s.y * s.z;
}

float density(vec3 p) {
    // density function. perlin noise within normal cube. outside is 0
    
    return (perlin(p * 2.)) * normalcube(p);
    return max(0., -cubeSDF(p));
}

vec4 transfer(float x) {
    float a = 0.2;
    float b = 0.9;
    vec4 color;
    if (x < a)
        color = mix(COL1, COL2, smoothstep(0., a, x / a));
    else if (x < b)
        color = mix(COL2, COL3, smoothstep(a, b, (x-a) / (b-a)));
    else
        color = mix(COL3, COL4, smoothstep(b, 1., (x-b) / (1. - b)));
    
    color = mix(COL1, COL2, step(.2, x));
    color.a = smoothstep(.0, 1., x);


    return color;
}

const int MAX_STEPS = 160;

void main() {
    vec2 uv = v_position.xy;
    vec3 camera_position = vec3(0, 0, 5);
    float focal_length = -2.;


    Ray ray;
    ray.position = vec3(uv, 0); // point on the image
    vec3 dir = normalize(vec3(0, 0, focal_length) - ray.position);
    ray.step = dir * .02;
    // ray.position += ray.step * (length(camera_position) - 1.);

    float t = u_time * 1.10;
    vec3 T = vec3(0, 0, 0);
    mat3 R;
    R[0] = vec3(cos(t), 0, sin(t));
    R[1] = vec3(0, 1, 0);
    R[2] = vec3(-sin(t), 0, cos(t));

    vec3 acc;
    for (int i = 0; i < MAX_STEPS; ++i) {
        vec3 p = R * (ray.position + camera_position);
        
        // vec4 s = mix(vec4(0), vec4(1, 1, 0, .5), normalcube(R * (p + camera_position)));
        vec4 s = transfer(density(p));
        
        acc = mix(acc, s.rgb, s.a);
        //acc += s.rgb * s.a;
        float d = cubeSDF(p);
        if (d > 0.1)
            ray.position += dir * d;
        else
            ray.position += ray.step;
    }
    // acc /= acc.a; ///= float(MAX_STEPS);
    // acc.rgb /= float(MAX_STEPS);
    frag_color = vec4(acc, 1);
    // frag_color = transfer(density(vec3(uv * 1.5, 0.0)));
    // frag_color = mix(COL1, COL2, step(.2, a));
}
