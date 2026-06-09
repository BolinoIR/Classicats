#pragma include(builtInShaders/uber.frag.incl)
#pragma include(builtInShaders/utils/mathUtils.incl)

uniform sampler2D u_fxTrailSamplerCurrent;
uniform sampler2D u_fxTrailSamplerPrevious;

void main()
{    
    updateColor();

    vec2 uv = getTexCoord();
	vec4 col = texture2D(u_fxTrailSamplerCurrent, uv).rgba;
    vec4 prev = texture2D(u_fxTrailSamplerPrevious, uv).rgba;
    gl_FragColor = prev * .8 + col;    

	updateMask();
}
