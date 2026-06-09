#pragma include(uber.frag.incl)

uniform lowp vec4 u_tone;
uniform lowp float u_grayFactor;

void main()
{
    lowp vec4 fullColor = getColor();
    lowp vec3 grayscaleColor = vec3(1.0) * dot(fullColor.rgb, vec3(0.299, 0.587, 0.114));

    gl_FragColor.rgb = grayscaleColor.rgb * u_tone.rgb;

    gl_FragColor.rgb = fullColor.rgb + (gl_FragColor.rgb - fullColor.rgb) * u_grayFactor;
    gl_FragColor.a = fullColor.a;

    updateMask();
}
