#version 300 es

precision highp float;

const vec3 COL1 = vec3(0.8941, 0.2235, 0.2235);
const vec3 COL2 = vec3(0.1451, 0.1373, 0.5255);
const float PI = acos(-1.0);

const int MAX_ITER = 50;

uniform float u_time;

in vec2 v_texcoord;

out vec4 frag_color;

float normalbox(vec2 x) {
    vec2 s = 1.0 - step(vec2(1), abs(x));
    return s.x * s.y;
}

// Indicates the parity of x in the "tally hall pattern"
float iter(vec2 x, float phi) {
    
    

    float a = 1.;
    for (int i = 1; i <= MAX_ITER; ++i) {
        float q = 1.; // / float(i);
        float t = PI / 4. + phi * q;
        float d = mod(t, PI / 2.0);
        float s = max(1., sin(d) + cos(d));

        mat2 R; // pi/4 rotation matrix
        R[0] = vec2(cos(t), sin(t));
        R[1] = vec2(-sin(t), cos(t));

        mat2 T = R * s;

        if (normalbox(T * x) < 0.5)
            break;
        x = T * x;
        a *= -1.;
        // a *= sign(d - (PI / 4.));
    }
    
    vec2 h = vec2(0, 1); // x-axis (horizontal) normal
    vec2 v = vec2(1, 0); // y-axis (vertical) normal

    return step(.0, a);
}

void main() {
    vec2 uv = v_texcoord * 2. - 1.;
    vec3 col = mix(COL1, COL2, iter(uv, u_time * 0.2));
    // vec3 col = mix(COL1, COL2, iter(uv, PI * .3));
    frag_color = vec4(col, normalbox(uv));
}
