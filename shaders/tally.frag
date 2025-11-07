#version 300 es

precision highp float;

const vec3 COL1 = vec3(0.8863, 0.2235, 0.2235);
const vec3 COL2 = vec3(0.1451, 0.1373, 0.5255);
const float PI = acos(-1.0);
const int TALLY_ITER = 20;

uniform sampler2D u_texture_0;

in vec4 v_position;

out vec4 frag_color;


// Indicates if x is in the normal box (-1, -1) to (1, 1)
float normalbox(vec2 x) {
    vec2 s = 1.0 - step(vec2(1), abs(x));
    return s.x * s.y; 
}

// Indicates if x is in the box defined by an upper and lower bound
float box(vec2 x, vec2 lower, vec2 upper) {
    vec2 s = step(upper, x) - step(lower, x);
    return s.x * s.y;
}

vec2 boxcoord(vec2 x, vec2 a, vec2 b) {
    return (x - a) / (b - a);
}

float texmask(sampler2D tex, vec2 x) {
    return texture(tex, x).r;
}

// Indicates the parity of x in the "tally hall pattern"
float tally(vec2 x) {
    float cos_t = cos(PI/4.0);
    float sin_t = sin(PI/4.0);
    float s = sqrt(2.0);

    mat2 R; // pi/4 rotation matrix
    R[0] = vec2(cos_t, sin_t);
    R[1] = vec2(-sin_t, cos_t);
    
    mat2 S; // sqrt(2) scaling matrix
    S[0] = vec2(s, 0);
    S[1] = vec2(0, s);

    mat2 T = R * S; // transformation matrix for pattern

    float parity;
    vec2 h = vec2(0, 1); // x-axis (horizontal) normal
    vec2 v = vec2(1, 0); // y-axis (vertical) normal

    for (int i = 0; i < TALLY_ITER; ++i) {
        if (normalbox(T * x) < 0.5)
            break;
        x = T * x;
    }
    
    parity = sign(dot(x, h) * dot(x, v) * dot(x, R[0]) * dot(x, R[1]));
    float id = step(0.0, parity);

    R[0] = vec2(0, 1);
    R[1] = vec2(-1, 0);

    for (int i = 0; i < 4; ++i) {
        vec2 uv1 = boxcoord(x, vec2(-.75, 0.75), vec2(-.25, 1));
        vec2 uv2 = boxcoord(x, vec2(.25, 0.75), vec2(.75, 1));
        id = abs(id - texmask(u_texture_0, uv1));
        id = abs(id - texmask(u_texture_0, uv2));
        x = x * R;
    }

    return id;
}

void main() {
    vec2 coord = v_position.xy;
    float id = tally(coord);
    
    

    // vec3 col = mix(COL1, COL2, tally(coord));
    vec3 col = mix(COL1, COL2, id);
    // frag_color = vec4(coord, 0, 1);
    frag_color = vec4(col, 1);
}

