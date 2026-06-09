#pragma include(utils/preferences.vert.incl)

uniform highp mat3 u_transform;
attribute vec2 a_position;

void main()
{
    gl_Position = vec4(u_transform * vec3(a_position, 1.0), 1.0);
}
