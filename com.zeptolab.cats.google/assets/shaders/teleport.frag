#pragma include(teleport.frag.incl)

uniform lowp vec4 u_teleportBlueTone;
uniform lowp float u_teleportBlueFactor;

void main()
{
	setTeleportColor(u_teleportBlueTone, u_teleportBlueFactor);    
}
