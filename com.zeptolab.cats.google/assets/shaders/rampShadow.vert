#pragma include(builtInShaders/uber.vert.incl)

attribute vec2 a_shapeTexCoord;
attribute vec2 a_shadowTexCoord;

varying vec2 v_shapeTexCoord;
varying vec2 v_shadowTexCoord;

void main()
{
    updateScreenPosition();
    v_shadowTexCoord = a_shadowTexCoord;
    v_shapeTexCoord = a_shapeTexCoord;
}
