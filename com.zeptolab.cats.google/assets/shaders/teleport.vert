#pragma include(teleport.vert.incl)

uniform lowp float u_teleportBlueFactor;

void main() {
    setTeleportMovement(u_teleportBlueFactor);
}
