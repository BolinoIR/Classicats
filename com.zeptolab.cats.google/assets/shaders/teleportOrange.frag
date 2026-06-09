#pragma include(teleport.frag.incl)

uniform lowp vec4 u_teleportOrangeTone;
uniform lowp float u_teleportOrangeFactor;

void main()
{
	setTeleportColor(u_teleportOrangeTone, u_teleportOrangeFactor);    
}
