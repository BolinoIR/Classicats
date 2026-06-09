#pragma include(uber.frag.incl)
#pragma include(utils/mathUtils.incl)

uniform lowp vec4 u_firstColor;
uniform lowp vec4 u_secondColor;
uniform lowp float u_seed;
uniform lowp float u_noisePixelSize;

float getSeed() {
    #ifdef PAUSED
        return u_seed;
    #else
        return u_seed + u_time;
    #endif
}

void main()
{
    vec2 pos = ceil(v_position / u_noisePixelSize) * u_noisePixelSize;
    gl_FragColor = mix(u_firstColor, u_secondColor, rand(vec3(pos, getSeed())));

    updateMask();
}
