#pragma include(builtInShaders/uber.vert.incl)

varying vec2 v_blurTexCoords[8];

void main()
{
    defaultMain();
    
    v_blurTexCoords[0] = getTexCoord() + vec2(-0.028, 0.0);

    v_blurTexCoords[1] = getTexCoord() + vec2(-0.02117271111562504, 0.0);
    v_blurTexCoords[2] = getTexCoord() + vec2(-0.01345418983887393, 0.0);
    v_blurTexCoords[3] = getTexCoord() + vec2(-0.005761145402936892, 0.0);

    v_blurTexCoords[4] = getTexCoord() + vec2( 0.005761145402936892, 0.0);
    v_blurTexCoords[5] = getTexCoord() + vec2( 0.01345418983887393, 0.0);
    v_blurTexCoords[6] = getTexCoord() + vec2( 0.02117271111562504, 0.0);

    v_blurTexCoords[7] = getTexCoord() + vec2( 0.028, 0.0);
}
