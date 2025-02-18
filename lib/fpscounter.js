// Framerate keeper 
// http://www.html5gamedevs.com/topic/1828-how-to-calculate-fps-in-plain-javascript/
const fps = { startTime : 0,
	frameNumber : 0,
	getFPS() {
		this.frameNumber++;

		const d = new Date().getTime();
		const currentTime = ( d - this.startTime ) / 1000;
		const result = Math.floor( ( this.frameNumber / currentTime ) );

		if( currentTime > 1 ) {
			this.startTime = new Date().getTime();
			this.frameNumber = 0;
		}

		return result;
	}   
};