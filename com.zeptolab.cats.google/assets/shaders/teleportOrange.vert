#pragma include(teleport.vert.incl)

uniform lowp float u_teleportOrangeFactor;

void main() {
    setTeleportMovement(u_teleportOrangeFactor);
}
