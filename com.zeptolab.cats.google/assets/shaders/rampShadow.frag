#pragma include(builtInShaders/uber.frag.incl)

varying vec2 v_shadowTexCoord;
varying vec2 v_shapeTexCoord;
uniform lowp vec4 u_shadowColor;
uniform lowp float u_shadowMinLevel;

const float attenuation_power = 0.75;

float shadowHeightMultiplier() {
    return 1.0 - pow(v_shadowTexCoord.y / u_shadowMinLevel, attenuation_power);
}

void main()
{
    float shadowHeight = shadowHeightMultiplier();
    float height = v_shapeTexCoord.y;

    float step = 0.03;
    float t = smoothstep(shadowHeight - step, shadowHeight + step, height);

    gl_FragColor = getWholeColor() * (vec4(0.0) * t + u_shadowColor * (1.0 - t));
    updateMask();
}
