#pragma include(builtInShaders/uber.frag.incl)
#pragma include(builtInShaders/utils/mathUtils.incl)

varying vec2 v_glareTexCoord;
varying vec2 v_shapeTexCoord;

#define MAX_INTERVALS 50
#define MAX_EDGE_COLORS 8
#define MAX_GLARE_COLORS 5

uniform lowp float u_glareTexHeight;
uniform highp vec4 u_edgeColors[MAX_EDGE_COLORS];
uniform highp vec4 u_glareColors[MAX_GLARE_COLORS];
uniform lowp float u_colorTexCoords[MAX_INTERVALS - 1];
uniform lowp int u_colorEdgeIndices[MAX_INTERVALS];
uniform lowp int u_colorGlareIndices[MAX_INTERVALS];

uniform mediump vec4 u_glareNoiseAmplitudes;
uniform mediump vec4 u_glareNoiseFrequencies;
uniform mediump vec4 u_glareNoiseOffsets;

const float attenuationLength = 0.02;

int getIntervalIndex(float s) {
    for(int i = 0; i < MAX_INTERVALS - 1; i++) {
        if (s < u_colorTexCoords[i])
            return i;
    }
    return 0;
}

float sineTriangle(float x) {
    return 2.0 * abs(mod(x, 2.0 * PI) - PI) / PI - 1.0;
}

float noiseWave(float t, int i) {
    float a = u_glareNoiseAmplitudes[i];
    float f = u_glareNoiseFrequencies[i];
    float o = u_glareNoiseOffsets[i];

    const float k = 10.0;

    return a * sineTriangle(f * (k * t + o));
}

bool insideLeft(float s) {
    return s < attenuationLength;
}
bool insideRight(float s) {
    return s >1.0 - attenuationLength;
}

float f(float x) {
    return x;
}

float attenuate(float x) {
    if (insideLeft(x))
        return f(x / attenuationLength);
    else if (insideRight(x))
        return f((1.0 - x) / attenuationLength);
    else
        return 1.0;
}

float isInside(float leftEdge, float rightEdge, float val) {
   return step(leftEdge, val) * (1.0 - step(rightEdge, val));
}

float glareHeight(float x) {
    float height = u_glareTexHeight;

    for (int i = 0; i < 4; i++) {
        height += noiseWave(x, i);
    }

    return isInside(0.0, 1.0, x) * attenuate(x) * height;
}

int getEdgeColorIndex(int intervalIndex)
{
   return u_colorEdgeIndices[intervalIndex];
}

int getGlareColorIndex(int intervalIndex)
{
   return u_colorGlareIndices[intervalIndex];
}

vec4 getEdgeColor(int intervalIndex)
{
    return u_edgeColors[getEdgeColorIndex(intervalIndex)];
}

vec4 getGlareColor(int intervalIndex)
{
    return u_glareColors[getGlareColorIndex(intervalIndex)];
}

void main()
{
    vec4 glareColor = getGlareColor(getIntervalIndex(v_glareTexCoord.x));
    vec4 edgeColor = getEdgeColor(getIntervalIndex(v_glareTexCoord.x));

    float step = 0.03;
    float glareHeight = glareHeight(v_shapeTexCoord.x);
    float height = v_shapeTexCoord.y;

    float t = smoothstep(glareHeight - step, glareHeight + step, height);

    gl_FragColor = getWholeColor() * (edgeColor * t + glareColor * (1.0 - t));
    updateMask();
}
