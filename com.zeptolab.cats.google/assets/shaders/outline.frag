#pragma include(builtInShaders/uber.frag.incl)
#pragma include(builtInShaders/utils/mathUtils.incl)

uniform sampler2D u_gradient;
uniform highp vec2 u_gradientCoordLow;
uniform highp vec2 u_gradientCoordHigh;
uniform lowp vec4 u_outlineTone;
uniform lowp float u_outlineAlpha;

const int angleResolution = 16;
const int gradientResolution = 8;

bool pixelInRange(vec2 uv, vec2 dist) {
	float alpha = 0.0;
	for (int i = 0; i < angleResolution; i++) {
		float angle = 2.0 * PI * float(i) / float(angleResolution);
		vec2 disp = dist * vec2(cos(angle), sin(angle));
		if (getColor(uv + disp).a > 0.0) return true;
	}
	return false;
}

float getClosestDistance(vec2 uv, vec2 maxDist) {
	if (!pixelInRange(uv, maxDist)) return -1.0;
	
	float hi = 1.0; float lo = 0.0;
	
	for (int i = 1; i <= gradientResolution; i++) {
		float curr = (hi + lo) / 2.0;
		if (pixelInRange(uv, curr * maxDist)) {
			hi = curr;
		}
		else {
			lo = curr;
		}
	}
	return hi;	
}

void main()
{    
    updateColor();

    vec2 uv = getTexCoord();

	vec4 col = vec4(.0);
	
	//---	
	vec4 startingColour = u_outlineTone;
	startingColour.a = 1.;
	vec4 endingColour = u_outlineTone;
	endingColour.a = 0.;

	vec2 outline = vec2(0.03, 0.03);	

	float w = getClosestDistance(uv, outline);
	float glow = 0.01/w;
	glow *= 50.;

	if (( w > 0.0) && (getColor(vec2(uv.x, uv.y)).a < 0.2)) {
		col = mix(startingColour, endingColour, sqrt(w));
		col.a *= u_outlineAlpha;		
	}
	else {		
		lowp vec4 fullColor = getColor();
    	lowp float grayscale = dot(fullColor.rgb, vec3(0.299, 0.587, 0.114));
    	highp vec2 gradientCoord = mix(u_gradientCoordLow, u_gradientCoordHigh, grayscale);
    	col.rgb = texture2D(u_gradient, gradientCoord * 0.8).rgb;
    	col.a = fullColor.a;
	}
	gl_FragColor = col;
	//---

	// iroige: First simple version
	/*
	float outline = 0.02;

    if (col.a > 0.5)

		gl_FragColor = col;

	
	else {

		float a = getColor(vec2(uv.x + outline, uv.y)).g
		 +getColor(vec2(uv.x, uv.y - outline)).g
		 +getColor(vec2(uv.x - outline, uv.y)).g
		 +getColor(vec2(uv.x, uv.y + outline)).g;

		uv -= vec2(.5, .5);
		float d = length(uv) - 0.2; // signed distance function		
  		float glow = 0.01/d; // create glow and diminish it with distance
  		glow = clamp(glow, 0., .1); // remove artifacts

		if (col.a < 1.0 && a > 0.0){
			// Add green outline
			vec4 outlineColor = vec4(0.0, 1.0, 0.0, 0.3);			
			gl_FragColor = outlineColor;			
		} else {
			gl_FragColor = col;
		}
	}
	*/

	// iroige: Glow effect debug
	/*
	uv -= 0.5;
	float d = length(uv) - 0.2; // signed distance function
	vec4 colol = vec4(step(0., -d), step(0., -d), step(0., -d), 1);			
  	float glow = 0.01/d; // create glow and diminish it with distance
  	glow = clamp(glow, 0., 1.); // remove artifacts
  	colol += glow * 5.; // add glow	
  	gl_FragColor = colol;
  	*/  	

	updateMask();
}