#pragma include(builtInShaders/uber.vert.incl)

attribute vec2 a_glareTexCoord;
attribute vec2 a_shapeTexCoord;

varying vec2 v_glareTexCoord;
varying vec2 v_shapeTexCoord;

void main()
{
    updateScreenPosition();
    v_glareTexCoord = a_glareTexCoord;
    v_shapeTexCoord = a_shapeTexCoord;
}
