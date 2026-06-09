#pragma include(builtInShaders/uber.frag.incl)

uniform sampler2D u_gradient;
uniform highp vec2 u_gradientCoordLow;
uniform highp vec2 u_gradientCoordHigh;
uniform lowp float u_gradientFactor;

void main()
{
	lowp vec4 fullColor = getColor();
    lowp float grayscale = dot(fullColor.rgb, vec3(0.299, 0.587, 0.114));
    highp vec2 gradientCoord = mix(u_gradientCoordLow, u_gradientCoordHigh, 0.05 + grayscale * 0.9);

    gl_FragColor.rgb = mix(fullColor.rgb, texture2D(u_gradient, gradientCoord).rgb, u_gradientFactor);
    gl_FragColor.a = fullColor.a;

    updateMask();
}
