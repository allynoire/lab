#version 300 es

precision highp float;

const float PI = acos(-1.);
const vec4 COL1 = vec4(0.2196, 0.3961, 0.9725, 1.0);
const vec4 COL2 = vec4(0.9922, 0.4863, 0.949, 1.0);

uniform float u_time;

in vec2 v_texcoord;

out vec4 frag_color;

float rand(vec2 seed){
    return fract(sin(dot(seed, vec2(12.9898, 78.233))) * 43758.5453);
}

vec2 gradient(vec2 seed) {
    float r = rand(seed);
    float a = r * PI * 2. + u_time * r;
    return vec2(cos(a), sin(a));
}

float perlin(vec2 p, vec2 seed) {

    float[4] a;

    for (int dy = 0; dy <= 1; ++dy) {
        for (int dx = 0; dx <= 1; ++dx) {
            int k = dx + dy * 2;
            vec2 c = floor(p + vec2(dx, dy));
            vec2 gradient = gradient(c * seed);
            vec2 offset = vec2(c) - p;
            a[k] = dot(gradient, offset);
        }
    }
    
    p = smoothstep(0., 1., fract(p));
    
    return mix(mix(a[0], a[1], p.x), mix(a[2], a[3], p.x), p.y);
}

void main() {
    vec2 uv = v_texcoord;
    float p1 = perlin(uv * 10., vec2(.7, 0.2));
    float p2 = perlin(uv * 5., vec2(.2, .1));
    frag_color = mix(COL1, COL2, step(.02, mix(p1, p2, .8)));
}
