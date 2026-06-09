#pragma include(builtInShaders/uber.frag.incl)

uniform lowp int u_alphaGradientDir; // Invisible at 0: left, 1: right, 2: top, 3: bottom

void main()
{
    // v_anchorPosition x,y
    /*
    (0,1)_________(1,0)
        |         |
        |         |
        |         |
        |_________|
    (0,0)         (1,1)
    */
    
    updateColor();
    
    lowp vec4 black = vec4(0.0,0.0,0.0,1.0);
    lowp vec4 fullColor = getColor();
    
    // WIP:iroige: Add a new parameter to decide if we do alpha gradient or color gradient
    /*
    if(u_alphaGradientDir == 0){
        // invisible left
        gl_FragColor.a *= clamp(v_anchorPosition.x, 0.0, 1.0);
    } else if(u_alphaGradientDir == 1){
    	// Invisible right
    	gl_FragColor.a *= clamp(1.0 - v_anchorPosition.x, 0.0, 1.0);
    } else if(u_alphaGradientDir == 2){
        // Invisible top
        gl_FragColor.a *= clamp(v_anchorPosition.y, 0.0, 1.0);
    } else if(u_alphaGradientDir == 3){
        // visible at the top of the anchor and invisible at the bottom
        gl_FragColor.a *= clamp(1.0 - v_anchorPosition.y, 0.0, 1.0);
    }
     */
    
    lowp float factor = 1.0;
    
    if(u_alphaGradientDir == 0){
        // black left
        factor = clamp(v_anchorPosition.x, 0.0, 1.0);
    } else if(u_alphaGradientDir == 1){
        // black right
        factor = clamp(1.0 - v_anchorPosition.x, 0.0, 1.0);
    } else if(u_alphaGradientDir == 2){
        // black top
        factor = clamp(v_anchorPosition.y, 0.0, 1.0);
    } else if(u_alphaGradientDir == 3){
        // visible at the top of the anchor and black at the bottom
        factor = clamp(1.0 - v_anchorPosition.y, 0.0, 1.0);
    }
    
    gl_FragColor.rgb = fullColor.rgb * factor + black.rgb * (1.0 - factor);
    gl_FragColor.a = fullColor.a;

    updateMask();
}
