#pragma include(builtInShaders/uber.frag.incl)

uniform lowp float u_fade;
varying vec2 v_blurTexCoords[8];

void main()
{
    gl_FragColor = vec4(0.0);
    gl_FragColor += getColor(v_blurTexCoords[0]) * 0.0044299121055113265;
    gl_FragColor += getColor(v_blurTexCoords[1]) * 0.03055419872324;
    gl_FragColor += getColor(v_blurTexCoords[2]) * 0.12204275586510001;
    gl_FragColor += getColor(v_blurTexCoords[3]) * 0.26318467722600003;
    gl_FragColor += getColor(v_texCoord) * 0.159576912161;
    gl_FragColor += getColor(v_blurTexCoords[4]) * 0.26318467722600003;
    gl_FragColor += getColor(v_blurTexCoords[5]) * 0.12204275586510001;
    gl_FragColor += getColor(v_blurTexCoords[6]) * 0.03055419872324;
    gl_FragColor += getColor(v_blurTexCoords[7]) * 0.0044299121055113265;
    gl_FragColor -= vec4(vec3(u_fade), 0.0);
}
