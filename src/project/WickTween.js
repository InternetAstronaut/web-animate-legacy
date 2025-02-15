/* Wick - (c) 2017 Zach Rispoli, Luca Damasco, and Josh Rispoli */

/*  This file is part of Wick. 
    
    Wick is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    Wick is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with Wick.  If not, see <http://www.gnu.org/licenses/>. */

const tweenValueNames = ["x","y","scaleX","scaleY","rotation","opacity"];

class WickTween {
    constructor() {
        this.x = 0;
        this.y = 0; 
        this.z = 0; 
        this.scaleX = 1;
        this.scaleY = 1;
        this.rotation = 0;
        this.opacity = 1;

        this.playheadPosition = 0;
        this.rotations = 0;

        this.uuid = random.uuid4();

        this.tweenType = 'Linear';
        this.tweenDir = 'None';
    }

    copy() {
        const copy = new WickTween();

        copy.x = this.x;
        copy.y = this.y; 
        copy.z = this.z; 
        copy.scaleX = this.scaleX;
        copy.scaleY = this.scaleY;
        copy.rotation = this.rotation;
        copy.opacity = this.opacity;

        copy.playheadPosition = this.playheadPosition;
        copy.rotations = this.rotations;

        copy.tweenType = this.tweenType;
        copy.tweenDir = this.tweenDir;

        return copy;
    }

    updateFromWickObjectState(wickObject) {
        const self = this;
        
        tweenValueNames.forEach(name => {
            self[name] = wickObject[name];
        });
    }

    applyTweenToWickObject(wickObject) {
        const that = this;

        tweenValueNames.forEach(name => {
            wickObject[name] = that[name];
        });
    }
}

WickTween.fromWickObjectState = wickObject => {
	const tween = new WickTween();

	tweenValueNames.forEach(name => {
		tween[name] = wickObject[name];
	});

	return tween;
}

WickTween.interpolateTweens = (tweenA, tweenB, t) => {
	const interpTween = new WickTween();

	const tweenFunc = (tweenA.tweenType === "Linear") ? (TWEEN.Easing.Linear.None) : (TWEEN.Easing[tweenA.tweenType][tweenA.tweenDir]);
	tweenValueNames.forEach(name => {
		const tt = tweenFunc(t);
        let valA = tweenA[name];
        let valB = tweenB[name];
        if(name === 'rotation') {
            while(valA < -180) valA += 360;
            while(valB < -180) valB += 360;
            while(valA > 180) valA -= 360;
            while(valB > 180) valB -= 360;
            valB += tweenA.rotations * 360;
        }
		interpTween[name] = lerp(valA, valB, tt);
	});

	return interpTween;
}
