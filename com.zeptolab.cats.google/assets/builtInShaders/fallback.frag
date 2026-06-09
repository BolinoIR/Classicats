#pragma include(utils/preferences.frag.incl)

void main() {
    #ifdef SHADER_DEBUG
        gl_FragColor = vec4(1, 0, 1, 1); // magenta, the default noticeable color for invalid shaders
    #else
        gl_FragColor = vec4(0, 0, 0, 1); // black, inconspicuous color for the release build
    #endif
}
