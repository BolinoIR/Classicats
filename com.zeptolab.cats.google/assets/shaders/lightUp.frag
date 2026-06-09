#pragma include(builtInShaders/uber.frag.incl)

uniform lowp float u_lightUpFactor;

void main()
{
    defaultMain();
    gl_FragColor.rgb += u_lightUpFactor;
    gl_FragColor.rgb *= gl_FragColor.a;
}
