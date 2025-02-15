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

const WickCamera = function({width, height}) {

    const self = this;

    let x = width/2;
    let y = height/2;

    let followingObject = null;
    let followingSmoothness = 1;

    this.followObject = (object, smoothness) => {
    	followingObject = object;
    	followingSmoothness = smoothness || 1;
    }

    this.getPosition = () => {
    	return {
    		x, 
    		y
    	};
    }

    this.setPosition = (_x, _y) => {
    	x = _x;
    	y = _y;
    }

    this.update = () => {
    	if(followingObject) {
    		const dx = followingObject.x - x;
    		const dy = followingObject.y - y;
    		self.setPosition(
    			x + dx*followingSmoothness, 
    			y + dy*followingSmoothness
    		);
    	}
    }

};

