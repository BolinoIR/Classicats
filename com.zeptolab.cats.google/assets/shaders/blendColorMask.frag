#pragma include(builtInShaders/uber.frag.incl)

uniform lowp vec4 u_blendMaskColor;
uniform mediump float u_blendMaskValue;

void main()
{
    updateColor();

    vec4 maskColor = u_blendMaskColor * gl_FragColor.a;
    gl_FragColor.rgb = min(gl_FragColor.rgb + maskColor.rgb * u_blendMaskValue, 1.0);

    updateMask();
}
