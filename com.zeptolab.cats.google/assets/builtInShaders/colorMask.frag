#pragma include(uber.frag.incl)

uniform lowp vec4 u_maskColor;
uniform mediump float u_maskValue;

lowp vec4 getMaskColor() {
    #if defined(MASK_COLOR_NEED_PREMULTIPLY_ALPHA)
        return premultiplyAlpha(u_maskColor);
    #else
        return u_maskColor;
    #endif
}

void main()
{
    updateColor();

    vec4 maskColor = getMaskColor() * gl_FragColor.a;
    gl_FragColor.rgb = gl_FragColor.rgb + (maskColor.rgb - gl_FragColor.rgb) * u_maskValue;

    updateMask();
}
