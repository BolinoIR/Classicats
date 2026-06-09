#pragma include(builtInShaders/uber.frag.incl)
#pragma include(builtInShaders/utils/mathUtils.incl)

// v_anchorPosition x,y
/*
(0,1)_________(1,0)
    |         |
    |         |
    |         |
    |_________|
(0,0)         (1,1)
*/

uniform lowp vec4 u_circularProgressTone;
uniform lowp float u_circularProgressFactor;
uniform lowp float u_circularProgressOffset;

/*
    progress - value 0..1 (we plan a semicircle fill adding some starting / ending offset).
    offset - angle offset used for filling. (8 means PI/8 radians).
 */
vec4 radial_progress(vec2 anchor, float progress, float offset)
{
    //float offset = 5.0;
    float SMOOTH = 0.005;
    float TWO_PI = 2.0 * PI;
    
    //progress *= 0.5; // a semicircle needs half of progress
    
    if(offset != 0.0)
        progress *= (1.0 + 2.0 / offset); // total angle distance / semicircle distance => (PI + 2.0 * PI / offset) / PI
    
    vec2 uv = anchor * 2.0 - 1.0;
    
    vec2 origin  = vec2(0.0, 0.0);
        
    float ir = 0.75;
    float or = 0.95;
    float d = length(uv);
    float ring = smoothstep(or+SMOOTH, or-SMOOTH, d) - smoothstep(ir+SMOOTH, ir-SMOOTH, d);
    float a = atan(uv.y - origin.y, uv.x - origin.x);
    
    if(offset != 0.0)
        a += (PI / offset);
        
    float theta = (a < 0.0) ? (a + TWO_PI) / TWO_PI : a / TWO_PI;
    float bar = step(theta, progress);
    float ui = ring * bar;
    vec4 colour = vec4(ui, ui, ui, ui);
    return colour;
}

void main()
{    
    updateColor();
	
	gl_FragColor = radial_progress(vec2(1.0 - v_anchorPosition.x, 1.0 - v_anchorPosition.y), u_circularProgressFactor, u_circularProgressOffset) * u_circularProgressTone;

	updateMask();
}
