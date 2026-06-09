#pragma include(builtInShaders/uber.vert.incl)

varying vec4 v_blurTexCoords[4];

void main()
{
    defaultMain();
    
    v_blurTexCoords[0] = getTexCoord().xyxy + vec4(-0.028, 0.0, -0.02117271111562504, 0.0);
    v_blurTexCoords[1] = getTexCoord().xyxy + vec4(-0.01345418983887393, 0.0, -0.005761145402936892, 0.0);
    v_blurTexCoords[2] = getTexCoord().xyxy + vec4( 0.005761145402936892, 0.0, 0.01345418983887393, 0.0);
    v_blurTexCoords[3] = getTexCoord().xyxy + vec4( 0.02117271111562504, 0.0, 0.028, 0.0);
}
