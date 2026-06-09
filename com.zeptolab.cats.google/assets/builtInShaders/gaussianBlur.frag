#pragma include(uber.frag.incl)

const int MAX_KERNEL_SIZE = 29;

uniform lowp vec2 u_blurDirection;
uniform lowp int u_kernelSize;
uniform lowp float u_kernel[MAX_KERNEL_SIZE];

#pragma fallback(uber.frag)

void main()
{
    gl_FragColor = vec4(0.0);

    vec2 startOffset = -0.5 * u_blurDirection * float(u_kernelSize - 1);

    for (int i = 0; i < u_kernelSize; i++) {
        gl_FragColor += getColor(v_texCoord + startOffset + u_blurDirection * float(i)) * u_kernel[i];
    }

    updateMask();
}
