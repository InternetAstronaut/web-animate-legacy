/*! nouislider - 9.2.0 - 2017-01-11 10:35:34 */

(factory => {

    if ( typeof define === 'function' && define.amd ) {

        // AMD. Register as an anonymous module.
        define([], factory);

    } else if ( typeof exports === 'object' ) {

        // Node/CommonJS
        module.exports = factory();

    } else {

        // Browser globals
        window.noUiSlider = factory();
    }

})(() => {
    const VERSION = '9.2.0';


    // Creates a node, adds it to target, returns the new node.
    function addNodeTo ( target, className ) {
		const div = document.createElement('div');
		addClass(div, className);
		target.appendChild(div);
		return div;
	}

    // Removes duplicates from an array.
    function unique ( array ) {
		return array.filter(function(a){
			return !this[a] ? this[a] = true : false;
		}, {});
	}

    // Round a value to the closest 'to'.
    function closest ( value, to ) {
		return Math.round(value / to) * to;
	}

    // Current position of an element relative to the document.
    function offset ( elem, orientation ) {
        const rect = elem.getBoundingClientRect();
        const doc = elem.ownerDocument;
        const docElem = doc.documentElement;
        const pageOffset = getPageOffset();

        // getBoundingClientRect contains left scroll in Chrome on Android.
        // I haven't found a feature detection that proves this. Worst case
        // scenario on mis-match: the 'tap' feature on horizontal sliders breaks.
        if ( /webkit.*Chrome.*Mobile/i.test(navigator.userAgent) ) {
			pageOffset.x = 0;
		}

        return orientation ? (rect.top + pageOffset.y - docElem.clientTop) : (rect.left + pageOffset.x - docElem.clientLeft);
    }

    // Checks whether a value is numerical.
    function isNumeric ( a ) {
		return typeof a === 'number' && !isNaN( a ) && isFinite( a );
	}

    // Sets a class and removes it after [duration] ms.
    function addClassFor ( element, className, duration ) {
		if (duration > 0) {
		addClass(element, className);
			setTimeout(() => {
				removeClass(element, className);
			}, duration);
		}
	}

    // Limits a value to 0 - 100
    function limit ( a ) {
		return Math.max(Math.min(a, 100), 0);
	}

    // Wraps a variable as an array, if it isn't one yet.
    // Note that an input array is returned by reference!
    function asArray ( a ) {
		return Array.isArray(a) ? a : [a];
	}

    // Counts decimals
    function countDecimals ( numStr ) {
		numStr = String(numStr);
		const pieces = numStr.split(".");
		return pieces.length > 1 ? pieces[1].length : 0;
	}

    // http://youmightnotneedjquery.com/#add_class
    function addClass ( el, className ) {
		if ( el.classList ) {
			el.classList.add(className);
		} else {
			el.className += ` ${className}`;
		}
	}

    // http://youmightnotneedjquery.com/#remove_class
    function removeClass ( el, className ) {
		if ( el.classList ) {
			el.classList.remove(className);
		} else {
			el.className = el.className.replace(new RegExp(`(^|\\b)${className.split(' ').join('|')}(\\b|$)`, 'gi'), ' ');
		}
	}

    // https://plainjs.com/javascript/attributes/adding-removing-and-testing-for-classes-9/
    function hasClass ( el, className ) {
		return el.classList ? el.classList.contains(className) : new RegExp(`\\b${className}\\b`).test(el.className);
	}

    // https://developer.mozilla.org/en-US/docs/Web/API/Window/scrollY#Notes
    function getPageOffset ( ) {
        const supportPageOffset = window.pageXOffset !== undefined;
        const isCSS1Compat = ((document.compatMode || "") === "CSS1Compat");
        const x = supportPageOffset ? window.pageXOffset : isCSS1Compat ? document.documentElement.scrollLeft : document.body.scrollLeft;
        const y = supportPageOffset ? window.pageYOffset : isCSS1Compat ? document.documentElement.scrollTop : document.body.scrollTop;

        return {
			x,
			y
		};
    }

    // we provide a function to compute constants instead
    // of accessing window.* as soon as the module needs it
    // so that we do not compute anything if not needed
    function getActions ( ) {

		// Determine the events to bind. IE11 implements pointerEvents without
		// a prefix, which breaks compatibility with the IE10 implementation.
		return window.navigator.pointerEnabled ? {
			start: 'pointerdown',
			move: 'pointermove',
			end: 'pointerup'
		} : window.navigator.msPointerEnabled ? {
			start: 'MSPointerDown',
			move: 'MSPointerMove',
			end: 'MSPointerUp'
		} : {
			start: 'mousedown touchstart',
			move: 'mousemove touchmove',
			end: 'mouseup touchend'
		};
	}


    // Value calculation

    // Determine the size of a sub-range in relation to a full range.
    function subRangeRatio ( pa, pb ) {
		return (100 / (pb - pa));
	}

    // (percentage) How many percent is this value of this range?
    function fromPercentage ( range, value ) {
		return (value * 100) / ( range[1] - range[0] );
	}

    // (percentage) Where is this value on this range?
    function toPercentage ( range, value ) {
		return fromPercentage( range, range[0] < 0 ?
			value + Math.abs(range[0]) :
				value - range[0] );
	}

    // (value) How much is this percentage on this range?
    function isPercentage ( range, value ) {
		return ((value * ( range[1] - range[0] )) / 100) + range[0];
	}


    // Range conversion

    function getJ ( value, arr ) {

		let j = 1;

		while ( value >= arr[j] ){
			j += 1;
		}

		return j;
	}

    // (percentage) Input a value, find where, on a scale of 0-100, it applies.
    function toStepping ( xVal, xPct, value ) {
        if ( value >= xVal.slice(-1)[0] ){
			return 100;
		}

        const j = getJ( value, xVal );
        let va;
        let vb;
        let pa;
        let pb;

        va = xVal[j-1];
        vb = xVal[j];
        pa = xPct[j-1];
        pb = xPct[j];

        return pa + (toPercentage([va, vb], value) / subRangeRatio (pa, pb));
    }

    // (value) Input a percentage, find where it is on the specified range.
    function fromStepping ( xVal, xPct, value ) {
        // There is no range group that fits 100
        if ( value >= 100 ){
			return xVal.slice(-1)[0];
		}

        const j = getJ( value, xPct );
        let va;
        let vb;
        let pa;
        let pb;

        va = xVal[j-1];
        vb = xVal[j];
        pa = xPct[j-1];
        pb = xPct[j];

        return isPercentage([va, vb], (value - pa) * subRangeRatio (pa, pb));
    }

    // (percentage) Get the step that applies at a certain value.
    function getStep ( xPct, xSteps, snap, value ) {
        if ( value === 100 ) {
			return value;
		}

        const j = getJ( value, xPct );
        let a;
        let b;

        // If 'snap' is set, steps are used as fixed points on the slider.
        if ( snap ) {

			a = xPct[j-1];
			b = xPct[j];

			// Find the closest position, a or b.
			if ((value - a) > ((b-a)/2)){
				return b;
			}

			return a;
		}

        if ( !xSteps[j-1] ){
			return value;
		}

        return xPct[j-1] + closest(
			value - xPct[j-1],
			xSteps[j-1]
		);
    }


    // Entry parsing

    function handleEntryPoint(index, value, {xPct, xVal, xSteps, xHighestCompleteStep}) {

		let percentage;

		// Wrap numerical input in an array.
		if ( typeof value === "number" ) {
			value = [value];
		}

		// Reject any invalid input, by testing whether value is an array.
		if ( Object.prototype.toString.call( value ) !== '[object Array]' ){
			throw new Error(`noUiSlider (${VERSION}): 'range' contains invalid value.`);
		}

		// Covert min/max syntax to 0 and 100.
		if ( index === 'min' ) {
			percentage = 0;
		} else if ( index === 'max' ) {
			percentage = 100;
		} else {
			percentage = parseFloat( index );
		}

		// Check for correct input.
		if ( !isNumeric( percentage ) || !isNumeric( value[0] ) ) {
			throw new Error(`noUiSlider (${VERSION}): 'range' value isn't numeric.`);
		}

		// Store values.
		xPct.push( percentage );
		xVal.push( value[0] );

		// NaN will evaluate to false too, but to keep
		// logging clear, set step explicitly. Make sure
		// not to override the 'step' setting with false.
		if ( !percentage ) {
			if ( !isNaN( value[1] ) ) {
				xSteps[0] = value[1];
			}
		} else {
			xSteps.push( isNaN(value[1]) ? false : value[1] );
		}

		xHighestCompleteStep.push(0);
	}

    function handleStepPoint ( i, n, that ) {

		// Ignore 'false' stepping.
		if ( !n ) {
			return true;
		}

		// Factor to range ratio
		that.xSteps[i] = fromPercentage([
			 that.xVal[i]
			,that.xVal[i+1]
		], n) / subRangeRatio (
			that.xPct[i],
			that.xPct[i+1] );

		const totalSteps = (that.xVal[i+1] - that.xVal[i]) / that.xNumSteps[i];
		const highestStep = Math.ceil(Number(totalSteps.toFixed(3)) - 1);
		const step = that.xVal[i] + (that.xNumSteps[i] * highestStep);

		that.xHighestCompleteStep[i] = step;
	}


    // Interface

    // The interface to Spectrum handles all direction-based
    // conversions, so the above values are unaware.

    class Spectrum {
        constructor(entry, snap, direction, singleStep) {
            this.xPct = [];
            this.xVal = [];
            this.xSteps = [ singleStep || false ];
            this.xNumSteps = [ false ];
            this.xHighestCompleteStep = [];

            this.snap = snap;
            this.direction = direction;

            let index;
            const ordered = [ /* [0, 'min'], [1, '50%'], [2, 'max'] */ ];

            // Map the object keys to an array.
            for ( index in entry ) {
                if ( entry.hasOwnProperty(index) ) {
                    ordered.push([entry[index], index]);
                }
            }

            // Sort all entries by value (numeric sort).
            if ( ordered.length && typeof ordered[0][0] === "object" ) {
                ordered.sort((a, b) => { return a[0][0] - b[0][0]; });
            } else {
                ordered.sort((a, b) => { return a[0] - b[0]; });
            }


            // Convert all entries to subranges.
            for ( index = 0; index < ordered.length; index++ ) {
                handleEntryPoint(ordered[index][1], ordered[index][0], this);
            }

            // Store the actual step values.
            // xSteps is sorted in the same order as xPct and xVal.
            this.xNumSteps = this.xSteps.slice(0);

            // Convert all numeric steps to the percentage of the subrange they represent.
            for ( index = 0; index < this.xNumSteps.length; index++ ) {
                handleStepPoint(index, this.xNumSteps[index], this);
            }
        }

        getMargin(value) {

            const step = this.xNumSteps[0];

            if ( step && ((value / step) % 1) !== 0 ) {
                throw new Error(`noUiSlider (${VERSION}): 'limit', 'margin' and 'padding' must be divisible by step.`);
            }

            return this.xPct.length === 2 ? fromPercentage(this.xVal, value) : false;
        }

        toStepping(value) {

            value = toStepping( this.xVal, this.xPct, value );

            return value;
        }

        fromStepping(value) {

            return fromStepping( this.xVal, this.xPct, value );
        }

        getStep(value) {

            value = getStep(this.xPct, this.xSteps, this.snap, value );

            return value;
        }

        getNearbySteps(value) {

            const j = getJ(value, this.xPct);

            return {
                stepBefore: { startValue: this.xVal[j-2], step: this.xNumSteps[j-2], highestStep: this.xHighestCompleteStep[j-2] },
                thisStep: { startValue: this.xVal[j-1], step: this.xNumSteps[j-1], highestStep: this.xHighestCompleteStep[j-1] },
                stepAfter: { startValue: this.xVal[j-0], step: this.xNumSteps[j-0], highestStep: this.xHighestCompleteStep[j-0] }
            };
        }

        countStepDecimals() {
            const stepDecimals = this.xNumSteps.map(countDecimals);
            return Math.max.apply(null, stepDecimals);
        }

        // Outside testing
        convert(value) {
            return this.getStep(this.toStepping(value));
        }
    }

    /*	Every input option is tested and parsed. This'll prevent
        endless validation in internal methods. These tests are
        structured with an item for every option available. An
        option can be marked as required by setting the 'r' flag.
        The testing function is provided with three arguments:
            - The provided value for the option;
            - A reference to the options object;
            - The name for the option;

        The testing function returns false when an error is detected,
        or true when everything is OK. It can also modify the option
        object, to make sure all values can be correctly looped elsewhere. */

    const defaultFormatter = { 'to': function( value ){
		return value !== undefined && value.toFixed(2);
	}, 'from': Number };

    function testStep ( parsed, entry ) {

		if ( !isNumeric( entry ) ) {
			throw new Error(`noUiSlider (${VERSION}): 'step' is not numeric.`);
		}

		// The step option can still be used to set stepping
		// for linear sliders. Overwritten if set in 'range'.
		parsed.singleStep = entry;
	}

    function testRange ( parsed, entry ) {

		// Filter incorrect input.
		if ( typeof entry !== 'object' || Array.isArray(entry) ) {
			throw new Error(`noUiSlider (${VERSION}): 'range' is not an object.`);
		}

		// Catch missing start or end.
		if ( entry.min === undefined || entry.max === undefined ) {
			throw new Error(`noUiSlider (${VERSION}): Missing 'min' or 'max' in 'range'.`);
		}

		// Catch equal start or end.
		if ( entry.min === entry.max ) {
			throw new Error(`noUiSlider (${VERSION}): 'range' 'min' and 'max' cannot be equal.`);
		}

		parsed.spectrum = new Spectrum(entry, parsed.snap, parsed.dir, parsed.singleStep);
	}

    function testStart ( parsed, entry ) {

		entry = asArray(entry);

		// Validate input. Values aren't tested, as the public .val method
		// will always provide a valid location.
		if ( !Array.isArray( entry ) || !entry.length ) {
			throw new Error(`noUiSlider (${VERSION}): 'start' option is incorrect.`);
		}

		// Store the number of handles.
		parsed.handles = entry.length;

		// When the slider is initialized, the .val method will
		// be called with the start options.
		parsed.start = entry;
	}

    function testSnap ( parsed, entry ) {

		// Enforce 100% stepping within subranges.
		parsed.snap = entry;

		if ( typeof entry !== 'boolean' ){
			throw new Error(`noUiSlider (${VERSION}): 'snap' option must be a boolean.`);
		}
	}

    function testAnimate ( parsed, entry ) {

		// Enforce 100% stepping within subranges.
		parsed.animate = entry;

		if ( typeof entry !== 'boolean' ){
			throw new Error(`noUiSlider (${VERSION}): 'animate' option must be a boolean.`);
		}
	}

    function testAnimationDuration ( parsed, entry ) {

		parsed.animationDuration = entry;

		if ( typeof entry !== 'number' ){
			throw new Error(`noUiSlider (${VERSION}): 'animationDuration' option must be a number.`);
		}
	}

    function testConnect ( parsed, entry ) {

		let connect = [false];
		let i;

		// Map legacy options
		if ( entry === 'lower' ) {
			entry = [true, false];
		}

		else if ( entry === 'upper' ) {
			entry = [false, true];
		}

		// Handle boolean options
		if ( entry === true || entry === false ) {

			for ( i = 1; i < parsed.handles; i++ ) {
				connect.push(entry);
			}

			connect.push(false);
		}

		// Reject invalid input
		else if ( !Array.isArray( entry ) || !entry.length || entry.length !== parsed.handles + 1 ) {
			throw new Error(`noUiSlider (${VERSION}): 'connect' option doesn't match handle count.`);
		}

		else {
			connect = entry;
		}

		parsed.connect = connect;
	}

    function testOrientation ( parsed, entry ) {

		// Set orientation to an a numerical value for easy
		// array selection.
		switch ( entry ){
		  case 'horizontal':
			parsed.ort = 0;
			break;
		  case 'vertical':
			parsed.ort = 1;
			break;
		  default:
			throw new Error(`noUiSlider (${VERSION}): 'orientation' option is invalid.`);
		}
	}

    function testMargin ( parsed, entry ) {

		if ( !isNumeric(entry) ){
			throw new Error(`noUiSlider (${VERSION}): 'margin' option must be numeric.`);
		}

		// Issue #582
		if ( entry === 0 ) {
			return;
		}

		parsed.margin = parsed.spectrum.getMargin(entry);

		if ( !parsed.margin ) {
			throw new Error(`noUiSlider (${VERSION}): 'margin' option is only supported on linear sliders.`);
		}
	}

    function testLimit ( parsed, entry ) {

		if ( !isNumeric(entry) ){
			throw new Error(`noUiSlider (${VERSION}): 'limit' option must be numeric.`);
		}

		parsed.limit = parsed.spectrum.getMargin(entry);

		if ( !parsed.limit || parsed.handles < 2 ) {
			throw new Error(`noUiSlider (${VERSION}): 'limit' option is only supported on linear sliders with 2 or more handles.`);
		}
	}

    function testPadding ( parsed, entry ) {

		if ( !isNumeric(entry) ){
			throw new Error(`noUiSlider (${VERSION}): 'padding' option must be numeric.`);
		}

		if ( entry === 0 ) {
			return;
		}

		parsed.padding = parsed.spectrum.getMargin(entry);

		if ( !parsed.padding ) {
			throw new Error(`noUiSlider (${VERSION}): 'padding' option is only supported on linear sliders.`);
		}

		if ( parsed.padding < 0 ) {
			throw new Error(`noUiSlider (${VERSION}): 'padding' option must be a positive number.`);
		}

		if ( parsed.padding >= 50 ) {
			throw new Error(`noUiSlider (${VERSION}): 'padding' option must be less than half the range.`);
		}
	}

    function testDirection ( parsed, entry ) {

		// Set direction as a numerical value for easy parsing.
		// Invert connection for RTL sliders, so that the proper
		// handles get the connect/background classes.
		switch ( entry ) {
		  case 'ltr':
			parsed.dir = 0;
			break;
		  case 'rtl':
			parsed.dir = 1;
			break;
		  default:
			throw new Error(`noUiSlider (${VERSION}): 'direction' option was not recognized.`);
		}
	}

    function testBehaviour ( parsed, entry ) {

		// Make sure the input is a string.
		if ( typeof entry !== 'string' ) {
			throw new Error(`noUiSlider (${VERSION}): 'behaviour' must be a string containing options.`);
		}

		// Check if the string contains any keywords.
		// None are required.
		const tap = entry.includes('tap');
		const drag = entry.includes('drag');
		const fixed = entry.includes('fixed');
		const snap = entry.includes('snap');
		const hover = entry.includes('hover');

		if ( fixed ) {

			if ( parsed.handles !== 2 ) {
				throw new Error(`noUiSlider (${VERSION}): 'fixed' behaviour must be used with 2 handles`);
			}

			// Use margin to enforce fixed state
			testMargin(parsed, parsed.start[1] - parsed.start[0]);
		}

		parsed.events = {
			tap: tap || snap,
			drag,
			fixed,
			snap,
			hover
		};
	}

    function testTooltips ( parsed, entry ) {

		if ( entry === false ) {
			return;
		}

		else if ( entry === true ) {

			parsed.tooltips = [];

			for ( let i = 0; i < parsed.handles; i++ ) {
				parsed.tooltips.push(true);
			}
		}

		else {

			parsed.tooltips = asArray(entry);

			if ( parsed.tooltips.length !== parsed.handles ) {
				throw new Error(`noUiSlider (${VERSION}): must pass a formatter for all handles.`);
			}

			parsed.tooltips.forEach(formatter => {
				if ( typeof formatter !== 'boolean' && (typeof formatter !== 'object' || typeof formatter.to !== 'function') ) {
					throw new Error(`noUiSlider (${VERSION}): 'tooltips' must be passed a formatter or 'false'.`);
				}
			});
		}
	}

    function testFormat ( parsed, entry ) {

		parsed.format = entry;

		// Any object with a to and from method is supported.
		if ( typeof entry.to === 'function' && typeof entry.from === 'function' ) {
			return true;
		}

		throw new Error(`noUiSlider (${VERSION}): 'format' requires 'to' and 'from' methods.`);
	}

    function testCssPrefix ( parsed, entry ) {

		if ( entry !== undefined && typeof entry !== 'string' && entry !== false ) {
			throw new Error(`noUiSlider (${VERSION}): 'cssPrefix' must be a string or \`false\`.`);
		}

		parsed.cssPrefix = entry;
	}

    function testCssClasses ( parsed, entry ) {

		if ( entry !== undefined && typeof entry !== 'object' ) {
			throw new Error(`noUiSlider (${VERSION}): 'cssClasses' must be an object.`);
		}

		if ( typeof parsed.cssPrefix === 'string' ) {
			parsed.cssClasses = {};

			for ( const key in entry ) {
				if ( !entry.hasOwnProperty(key) ) { continue; }

				parsed.cssClasses[key] = parsed.cssPrefix + entry[key];
			}
		} else {
			parsed.cssClasses = entry;
		}
	}

    function testUseRaf ( parsed, entry ) {
		if ( entry === true || entry === false ) {
			parsed.useRequestAnimationFrame = entry;
		} else {
			throw new Error(`noUiSlider (${VERSION}): 'useRequestAnimationFrame' option should be true (default) or false.`);
		}
	}

    // Test all developer settings and parse to assumption-safe values.
    function testOptions ( options ) {

		// To prove a fix for #537, freeze options here.
		// If the object is modified, an error will be thrown.
		// Object.freeze(options);

		const parsed = {
			margin: 0,
			limit: 0,
			padding: 0,
			animate: true,
			animationDuration: 300,
			format: defaultFormatter
		};

		// Tests are executed in the order they are presented here.
		const tests = {
			'step': { r: false, t: testStep },
			'start': { r: true, t: testStart },
			'connect': { r: true, t: testConnect },
			'direction': { r: true, t: testDirection },
			'snap': { r: false, t: testSnap },
			'animate': { r: false, t: testAnimate },
			'animationDuration': { r: false, t: testAnimationDuration },
			'range': { r: true, t: testRange },
			'orientation': { r: false, t: testOrientation },
			'margin': { r: false, t: testMargin },
			'limit': { r: false, t: testLimit },
			'padding': { r: false, t: testPadding },
			'behaviour': { r: true, t: testBehaviour },
			'format': { r: false, t: testFormat },
			'tooltips': { r: false, t: testTooltips },
			'cssPrefix': { r: false, t: testCssPrefix },
			'cssClasses': { r: false, t: testCssClasses },
			'useRequestAnimationFrame': { r: false, t: testUseRaf }
		};

		const defaults = {
			'connect': false,
			'direction': 'ltr',
			'behaviour': 'tap',
			'orientation': 'horizontal',
			'cssPrefix' : 'noUi-',
			'cssClasses': {
				target: 'target',
				base: 'base',
				origin: 'origin',
				handle: 'handle',
				handleLower: 'handle-lower',
				handleUpper: 'handle-upper',
				horizontal: 'horizontal',
				vertical: 'vertical',
				background: 'background',
				connect: 'connect',
				ltr: 'ltr',
				rtl: 'rtl',
				draggable: 'draggable',
				drag: 'state-drag',
				tap: 'state-tap',
				active: 'active',
				tooltip: 'tooltip',
				pips: 'pips',
				pipsHorizontal: 'pips-horizontal',
				pipsVertical: 'pips-vertical',
				marker: 'marker',
				markerHorizontal: 'marker-horizontal',
				markerVertical: 'marker-vertical',
				markerNormal: 'marker-normal',
				markerLarge: 'marker-large',
				markerSub: 'marker-sub',
				value: 'value',
				valueHorizontal: 'value-horizontal',
				valueVertical: 'value-vertical',
				valueNormal: 'value-normal',
				valueLarge: 'value-large',
				valueSub: 'value-sub'
			},
			'useRequestAnimationFrame': true
		};

		// Run all options through a testing mechanism to ensure correct
		// input. It should be noted that options might get modified to
		// be handled properly. E.g. wrapping integers in arrays.
		Object.keys(tests).forEach(name => {

			// If the option isn't set, but it is required, throw an error.
			if ( options[name] === undefined && defaults[name] === undefined ) {

				if ( tests[name].r ) {
					throw new Error(`noUiSlider (${VERSION}): '${name}' is required.`);
				}

				return true;
			}

			tests[name].t( parsed, options[name] === undefined ? defaults[name] : options[name] );
		});

		// Forward pips options
		parsed.pips = options.pips;

		const styles = [['left', 'top'], ['right', 'bottom']];

		// Pre-define the styles.
		parsed.style = styles[parsed.dir][parsed.ort];
		parsed.styleOposite = styles[parsed.dir?0:1][parsed.ort];

		return parsed;
	}


    function closure ( target, options, originalOptions ){

        const actions = getActions( );

        // All variables local to 'closure' are prefixed with 'scope_'
        const scope_Target = target;
        let scope_Locations = [];
        let scope_Base;
        let scope_Handles;
        const scope_HandleNumbers = [];
        let scope_ActiveHandle = false;
        let scope_Connects;
        let scope_Spectrum = options.spectrum;
        const scope_Values = [];
        const scope_Events = {};
        let scope_Self;


        // Append a origin to the base
        function addOrigin ( base, handleNumber ) {

            const origin = addNodeTo(base, options.cssClasses.origin);
            const handle = addNodeTo(origin, options.cssClasses.handle);

            handle.setAttribute('data-handle', handleNumber);

            if ( handleNumber === 0 ) {
                addClass(handle, options.cssClasses.handleLower);
            }

            else if ( handleNumber === options.handles - 1 ) {
                addClass(handle, options.cssClasses.handleUpper);
            }

            return origin;
        }

        // Insert nodes for connect elements
        function addConnect ( base, add ) {

            if ( !add ) {
                return false;
            }

            return addNodeTo(base, options.cssClasses.connect);
        }

        // Add handles to the slider base.
        function addElements ( connectOptions, base ) {

            scope_Handles = [];
            scope_Connects = [];

            scope_Connects.push(addConnect(base, connectOptions[0]));

            // [::::O====O====O====]
            // connectOptions = [0, 1, 1, 1]

            for ( let i = 0; i < options.handles; i++ ) {
                // Keep a list of all added handles.
                scope_Handles.push(addOrigin(base, i));
                scope_HandleNumbers[i] = i;
                scope_Connects.push(addConnect(base, connectOptions[i + 1]));
            }
        }

        // Initialize a single slider.
        function addSlider ( target ) {

            // Apply classes and data to the target.
            addClass(target, options.cssClasses.target);

            if ( options.dir === 0 ) {
                addClass(target, options.cssClasses.ltr);
            } else {
                addClass(target, options.cssClasses.rtl);
            }

            if ( options.ort === 0 ) {
                addClass(target, options.cssClasses.horizontal);
            } else {
                addClass(target, options.cssClasses.vertical);
            }

            scope_Base = addNodeTo(target, options.cssClasses.base);
        }


        function addTooltip({firstChild}, handleNumber) {

            if ( !options.tooltips[handleNumber] ) {
                return false;
            }

            return addNodeTo(firstChild, options.cssClasses.tooltip);
        }

        // The tooltips option is a shorthand for using the 'update' event.
        function tooltips ( ) {

            // Tooltips are added with options.tooltips in original order.
            const tips = scope_Handles.map(addTooltip);

            bindEvent('update', (values, handleNumber, unencoded) => {

                if ( !tips[handleNumber] ) {
                    return;
                }

                let formattedValue = values[handleNumber];

                if ( options.tooltips[handleNumber] !== true ) {
                    formattedValue = options.tooltips[handleNumber].to(unencoded[handleNumber]);
                }

                tips[handleNumber].innerHTML = formattedValue;
            });
        }


        function getGroup ( mode, values, stepped ) {

            // Use the range.
            if ( mode === 'range' || mode === 'steps' ) {
                return scope_Spectrum.xVal;
            }

            if ( mode === 'count' ) {

                if ( !values ) {
                    throw new Error(`noUiSlider (${VERSION}): 'values' required for mode 'count'.`);
                }

                // Divide 0 - 100 in 'count' parts.
                const spread = ( 100 / (values - 1) );
                let v;
                let i = 0;

                values = [];

                // List these parts and have them handled as 'positions'.
                while ( (v = i++ * spread) <= 100 ) {
                    values.push(v);
                }

                mode = 'positions';
            }

            if ( mode === 'positions' ) {

                // Map all percentages to on-range values.
                return values.map(value => {
                    return scope_Spectrum.fromStepping( stepped ? scope_Spectrum.getStep( value ) : value );
                });
            }

            if ( mode === 'values' ) {

                // If the value must be stepped, it needs to be converted to a percentage first.
                if ( stepped ) {

                    return values.map(value => {

                        // Convert to percentage, apply step, return to value.
                        return scope_Spectrum.fromStepping( scope_Spectrum.getStep( scope_Spectrum.toStepping( value ) ) );
                    });

                }

                // Otherwise, we can simply use the values.
                return values;
            }
        }

        function generateSpread ( density, mode, group ) {

            function safeIncrement(value, increment) {
                // Avoid floating point variance by dropping the smallest decimal places.
                return (value + increment).toFixed(7) / 1;
            }

            const indexes = {};
            const firstInRange = scope_Spectrum.xVal[0];
            const lastInRange = scope_Spectrum.xVal[scope_Spectrum.xVal.length-1];
            let ignoreFirst = false;
            let ignoreLast = false;
            let prevPct = 0;

            // Create a copy of the group, sort it and filter away all duplicates.
            group = unique(group.slice().sort((a, b) => { return a - b; }));

            // Make sure the range starts with the first element.
            if ( group[0] !== firstInRange ) {
                group.unshift(firstInRange);
                ignoreFirst = true;
            }

            // Likewise for the last one.
            if ( group[group.length - 1] !== lastInRange ) {
                group.push(lastInRange);
                ignoreLast = true;
            }

            group.forEach((current, index) => {

                // Get the current step and the lower + upper positions.
                let step;
                let i;
                let q;
                const low = current;
                const high = group[index+1];
                let newPct;
                let pctDifference;
                let pctPos;
                let type;
                let steps;
                let realSteps;
                let stepsize;

                // When using 'steps' mode, use the provided steps.
                // Otherwise, we'll step on to the next subrange.
                if ( mode === 'steps' ) {
                    step = scope_Spectrum.xNumSteps[ index ];
                }

                // Default to a 'full' step.
                if ( !step ) {
                    step = high-low;
                }

                // Low can be 0, so test for false. If high is undefined,
                // we are at the last subrange. Index 0 is already handled.
                if ( low === false || high === undefined ) {
                    return;
                }

                // Make sure step isn't 0, which would cause an infinite loop (#654)
                step = Math.max(step, 0.0000001);

                // Find all steps in the subrange.
                for ( i = low; i <= high; i = safeIncrement(i, step) ) {

                    // Get the percentage value for the current step,
                    // calculate the size for the subrange.
                    newPct = scope_Spectrum.toStepping( i );
                    pctDifference = newPct - prevPct;

                    steps = pctDifference / density;
                    realSteps = Math.round(steps);

                    // This ratio represents the ammount of percentage-space a point indicates.
                    // For a density 1 the points/percentage = 1. For density 2, that percentage needs to be re-devided.
                    // Round the percentage offset to an even number, then divide by two
                    // to spread the offset on both sides of the range.
                    stepsize = pctDifference/realSteps;

                    // Divide all points evenly, adding the correct number to this subrange.
                    // Run up to <= so that 100% gets a point, event if ignoreLast is set.
                    for ( q = 1; q <= realSteps; q += 1 ) {

                        // The ratio between the rounded value and the actual size might be ~1% off.
                        // Correct the percentage offset by the number of points
                        // per subrange. density = 1 will result in 100 points on the
                        // full range, 2 for 50, 4 for 25, etc.
                        pctPos = prevPct + ( q * stepsize );
                        indexes[pctPos.toFixed(5)] = ['x', 0];
                    }

                    // Determine the point type.
                    type = (group.includes(i)) ? 1 : ( mode === 'steps' ? 2 : 0 );

                    // Enforce the 'ignoreFirst' option by overwriting the type for 0.
                    if ( !index && ignoreFirst ) {
                        type = 0;
                    }

                    if ( !(i === high && ignoreLast)) {
                        // Mark the 'type' of this point. 0 = plain, 1 = real value, 2 = step value.
                        indexes[newPct.toFixed(5)] = [i, type];
                    }

                    // Update the percentage count.
                    prevPct = newPct;
                }
            });

            return indexes;
        }

        function addMarking ( spread, filterFunc, formatter ) {

            const element = document.createElement('div');
            let out = '';
            const valueSizeClasses = [
                options.cssClasses.valueNormal,
                options.cssClasses.valueLarge,
                options.cssClasses.valueSub
            ];
            const markerSizeClasses = [
                options.cssClasses.markerNormal,
                options.cssClasses.markerLarge,
                options.cssClasses.markerSub
            ];
            const valueOrientationClasses = [
                options.cssClasses.valueHorizontal,
                options.cssClasses.valueVertical
            ];
            const markerOrientationClasses = [
                options.cssClasses.markerHorizontal,
                options.cssClasses.markerVertical
            ];

            addClass(element, options.cssClasses.pips);
            addClass(element, options.ort === 0 ? options.cssClasses.pipsHorizontal : options.cssClasses.pipsVertical);

            function getClasses( type, source ){
                const a = source === options.cssClasses.value;
                const orientationClasses = a ? valueOrientationClasses : markerOrientationClasses;
                const sizeClasses = a ? valueSizeClasses : markerSizeClasses;

                return `${source} ${orientationClasses[options.ort]} ${sizeClasses[type]}`;
            }

            function getTags( offset, source, values ) {
                return `class="${getClasses(values[1], source)}" style="${options.style}: ${offset}%"`;
            }

            function addSpread ( offset, values ){

                // Apply the filter function, if it is set.
                values[1] = (values[1] && filterFunc) ? filterFunc(values[0], values[1]) : values[1];

                // Add a marker for every point
                out += `<div ${getTags(offset, options.cssClasses.marker, values)}></div>`;

                // Values are only appended for points marked '1' or '2'.
                if ( values[1] ) {
                    out += `<div ${getTags(offset, options.cssClasses.value, values)}>${formatter.to(values[0])}</div>`;
                }
            }

            // Append all points.
            Object.keys(spread).forEach(a => {
                addSpread(a, spread[a]);
            });

            element.innerHTML = out;

            return element;
        }

        function pips ( grid ) {

            const mode = grid.mode;
            const density = grid.density || 1;
            const filter = grid.filter || false;
            const values = grid.values || false;
            const stepped = grid.stepped || false;
            const group = getGroup( mode, values, stepped );
            const spread = generateSpread( density, mode, group );
            const format = grid.format || {
                to: Math.round
            };

            return scope_Target.appendChild(addMarking(
                spread,
                filter,
                format
            ));
        }


        // Shorthand for base dimensions.
        function baseSize ( ) {
            const rect = scope_Base.getBoundingClientRect();
            const alt = `offset${['Width', 'Height'][options.ort]}`;
            return options.ort === 0 ? (rect.width||scope_Base[alt]) : (rect.height||scope_Base[alt]);
        }

        // Handler for attaching events trough a proxy.
        function attachEvent ( events, element, callback, data ) {

            // This function can be used to 'filter' events to the slider.
            // element is a node, not a nodeList

            const method = e => {

                if ( scope_Target.hasAttribute('disabled') ) {
                    return false;
                }

                // Stop if an active 'tap' transition is taking place.
                if ( hasClass(scope_Target, options.cssClasses.tap) ) {
                    return false;
                }

                e = fixEvent(e, data.pageOffset);

                // Handle reject of multitouch
                if ( !e ) {
                    return false;
                }

                // Ignore right or middle clicks on start #454
                if ( events === actions.start && e.buttons !== undefined && e.buttons > 1 ) {
                    return false;
                }

                // Ignore right or middle clicks on start #454
                if ( data.hover && e.buttons ) {
                    return false;
                }

                e.calcPoint = e.points[ options.ort ];

                // Call the event handler with the event [ and additional data ].
                callback ( e, data );
            };

            const methods = [];

            // Bind a closure on the target for every event type.
            events.split(' ').forEach(eventName => {
                element.addEventListener(eventName, method, false);
                methods.push([eventName, method]);
            });

            return methods;
        }

        // Provide a clean event with standardized offset values.
        function fixEvent ( e, pageOffset ) {

            // Prevent scrolling and panning on touch events, while
            // attempting to slide. The tap event also depends on this.
            e.preventDefault();

            // Filter the event to register the type, which can be
            // touch, mouse or pointer. Offset changes need to be
            // made on an event specific basis.
            const touch = e.type.indexOf('touch') === 0;
            const mouse = e.type.indexOf('mouse') === 0;
            let pointer = e.type.indexOf('pointer') === 0;
            let x;
            let y;

            // IE10 implemented pointer events with a prefix;
            if ( e.type.indexOf('MSPointer') === 0 ) {
                pointer = true;
            }

            if ( touch ) {

                // Fix bug when user touches with two or more fingers on mobile devices.
                // It's useful when you have two or more sliders on one page,
                // that can be touched simultaneously.
                // #649, #663, #668
                if ( e.touches.length > 1 ) {
                    return false;
                }

                // noUiSlider supports one movement at a time,
                // so we can select the first 'changedTouch'.
                x = e.changedTouches[0].pageX;
                y = e.changedTouches[0].pageY;
            }

            pageOffset = pageOffset || getPageOffset();

            if ( mouse || pointer ) {
                x = e.clientX + pageOffset.x;
                y = e.clientY + pageOffset.y;
            }

            e.pageOffset = pageOffset;
            e.points = [x, y];
            e.cursor = mouse || pointer; // Fix #435

            return e;
        }

        // Translate a coordinate in the document to a percentage on the slider
        function calcPointToPercentage ( calcPoint ) {
            const location = calcPoint - offset(scope_Base, options.ort);
            const proposal = ( location * 100 ) / baseSize();
            return options.dir ? 100 - proposal : proposal;
        }

        // Find handle closest to a certain percentage on the slider
        function getClosestHandle ( proposal ) {

            let closest = 100;
            let handleNumber = false;

            scope_Handles.forEach((handle, index) => {

                // Disabled handles are ignored
                if ( handle.hasAttribute('disabled') ) {
                    return;
                }

                const pos = Math.abs(scope_Locations[index] - proposal);

                if ( pos < closest ) {
                    handleNumber = index;
                    closest = pos;
                }
            });

            return handleNumber;
        }

        // Moves handle(s) by a percentage
        // (bool, % to move, [% where handle started, ...], [index in scope_Handles, ...])
        function moveHandles ( upward, proposal, locations, handleNumbers ) {

            const proposals = locations.slice();

            let b = [!upward, upward];
            let f = [upward, !upward];

            // Copy handleNumbers so we don't change the dataset
            handleNumbers = handleNumbers.slice();

            // Check to see which handle is 'leading'.
            // If that one can't move the second can't either.
            if ( upward ) {
                handleNumbers.reverse();
            }

            // Step 1: get the maximum percentage that any of the handles can move
            if ( handleNumbers.length > 1 ) {

                handleNumbers.forEach((handleNumber, o) => {

                    const to = checkHandlePosition(proposals, handleNumber, proposals[handleNumber] + proposal, b[o], f[o]);

                    // Stop if one of the handles can't move.
                    if ( to === false ) {
                        proposal = 0;
                    } else {
                        proposal = to - proposals[handleNumber];
                        proposals[handleNumber] = to;
                    }
                });
            }

            // If using one handle, check backward AND forward
            else {
                b = f = [true];
            }

            let state = false;

            // Step 2: Try to set the handles with the found percentage
            handleNumbers.forEach((handleNumber, o) => {
                state = setHandle(handleNumber, locations[handleNumber] + proposal, b[o], f[o]) || state;
            });

            // Step 3: If a handle moved, fire events
            if ( state ) {
                handleNumbers.forEach(handleNumber => {
                    fireEvent('update', handleNumber);
                    fireEvent('slide', handleNumber);
                });
            }
        }

        // External event handling
        function fireEvent ( eventName, handleNumber, tap ) {

            Object.keys(scope_Events).forEach(targetEvent => {

                const eventType = targetEvent.split('.')[0];

                if ( eventName === eventType ) {
                    scope_Events[targetEvent].forEach(callback => {

                        callback.call(
                            // Use the slider public API as the scope ('this')
                            scope_Self,
                            // Return values as array, so arg_1[arg_2] is always valid.
                            scope_Values.map(options.format.to),
                            // Handle index, 0 or 1
                            handleNumber,
                            // Unformatted slider values
                            scope_Values.slice(),
                            // Event is fired by tap, true or false
                            tap || false,
                            // Left offset of the handle, in relation to the slider
                            scope_Locations.slice()
                        );
                    });
                }
            });
        }


        // Fire 'end' when a mouse or pen leaves the document.
        function documentLeave ( event, data ) {
            if ( event.type === "mouseout" && event.target.nodeName === "HTML" && event.relatedTarget === null ){
                eventEnd (event, data);
            }
        }

        // Handle movement on document for handle and range drag.
        function eventMove ( event, data ) {

            // Fix #498
            // Check value of .buttons in 'start' to work around a bug in IE10 mobile (data.buttonsProperty).
            // https://connect.microsoft.com/IE/feedback/details/927005/mobile-ie10-windows-phone-buttons-property-of-pointermove-event-always-zero
            // IE9 has .buttons and .which zero on mousemove.
            // Firefox breaks the spec MDN defines.
            if ( !navigator.appVersion.includes("MSIE 9") && event.buttons === 0 && data.buttonsProperty !== 0 ) {
                return eventEnd(event, data);
            }

            // Check if we are moving up or down
            const movement = (options.dir ? -1 : 1) * (event.calcPoint - data.startCalcPoint);

            // Convert the movement into a percentage of the slider width/height
            const proposal = (movement * 100) / data.baseSize;

            moveHandles(movement > 0, proposal, data.locations, data.handleNumbers);
        }

        // Unbind move events on document, call callbacks.
        function eventEnd({cursor}, {handleNumbers}) {

            // The handle is no longer active, so remove the class.
            if ( scope_ActiveHandle ) {
                removeClass(scope_ActiveHandle, options.cssClasses.active);
                scope_ActiveHandle = false;
            }

            // Remove cursor styles and text-selection events bound to the body.
            if ( cursor ) {
                document.body.style.cursor = '';
                document.body.removeEventListener('selectstart', document.body.noUiListener);
            }

            // Unbind the move and end events, which are added on 'start'.
            document.documentElement.noUiListeners.forEach(c => {
                document.documentElement.removeEventListener(c[0], c[1]);
            });

            // Remove dragging class.
            removeClass(scope_Target, options.cssClasses.drag);

            setZindex();

            handleNumbers.forEach(handleNumber => {
                fireEvent('set', handleNumber);
                fireEvent('change', handleNumber);
                fireEvent('end', handleNumber);
            });
        }

        // Bind move events on document.
        function eventStart(event, {handleNumbers}) {

            if ( handleNumbers.length === 1 ) {

                const handle = scope_Handles[handleNumbers[0]];

                // Ignore 'disabled' handles
                if ( handle.hasAttribute('disabled') ) {
                    return false;
                }

                // Mark the handle as 'active' so it can be styled.
                scope_ActiveHandle = handle.children[0];
                addClass(scope_ActiveHandle, options.cssClasses.active);
            }

            // Fix #551, where a handle gets selected instead of dragged.
            event.preventDefault();

            // A drag should never propagate up to the 'tap' event.
            event.stopPropagation();

            // Attach the move and end events.
            const moveEvent = attachEvent(actions.move, document.documentElement, eventMove, {
                startCalcPoint: event.calcPoint,
                baseSize: baseSize(),
                pageOffset: event.pageOffset,
                handleNumbers,
                buttonsProperty: event.buttons,
                locations: scope_Locations.slice()
            });

            const endEvent = attachEvent(actions.end, document.documentElement, eventEnd, {
                handleNumbers
            });

            const outEvent = attachEvent("mouseout", document.documentElement, documentLeave, {
                handleNumbers
            });

            document.documentElement.noUiListeners = moveEvent.concat(endEvent, outEvent);

            // Text selection isn't an issue on touch devices,
            // so adding cursor styles can be skipped.
            if ( event.cursor ) {

                // Prevent the 'I' cursor and extend the range-drag cursor.
                document.body.style.cursor = getComputedStyle(event.target).cursor;

                // Mark the target with a dragging state.
                if ( scope_Handles.length > 1 ) {
                    addClass(scope_Target, options.cssClasses.drag);
                }

                const f = () => {
                    return false;
                };

                document.body.noUiListener = f;

                // Prevent text selection when dragging the handles.
                document.body.addEventListener('selectstart', f, false);
            }

            handleNumbers.forEach(handleNumber => {
                fireEvent('start', handleNumber);
            });
        }

        // Move closest handle to tapped location.
        function eventTap ( event ) {

            // The tap event shouldn't propagate up
            event.stopPropagation();

            const proposal = calcPointToPercentage(event.calcPoint);
            const handleNumber = getClosestHandle(proposal);

            // Tackle the case that all handles are 'disabled'.
            if ( handleNumber === false ) {
                return false;
            }

            // Flag the slider as it is now in a transitional state.
            // Transition takes a configurable amount of ms (default 300). Re-enable the slider after that.
            if ( !options.events.snap ) {
                addClassFor(scope_Target, options.cssClasses.tap, options.animationDuration);
            }

            setHandle(handleNumber, proposal, true, true);

            setZindex();

            fireEvent('slide', handleNumber, true);
            fireEvent('set', handleNumber, true);
            fireEvent('change', handleNumber, true);
            fireEvent('update', handleNumber, true);

            if ( options.events.snap ) {
                eventStart(event, { handleNumbers: [handleNumber] });
            }
        }

        // Fires a 'hover' event for a hovered mouse/pen position.
        function eventHover({calcPoint}) {

            const proposal = calcPointToPercentage(calcPoint);

            const to = scope_Spectrum.getStep(proposal);
            const value = scope_Spectrum.fromStepping(to);

            Object.keys(scope_Events).forEach(targetEvent => {
                if ( 'hover' === targetEvent.split('.')[0] ) {
                    scope_Events[targetEvent].forEach(callback => {
                        callback.call( scope_Self, value );
                    });
                }
            });
        }

        // Attach events to several slider parts.
        function bindSliderEvents({fixed, tap, hover, drag}) {

            // Attach the standard drag event to the handles.
            if ( !fixed ) {

                scope_Handles.forEach(({children}, index) => {

                    // These events are only bound to the visual handle
                    // element, not the 'real' origin element.
                    attachEvent ( actions.start, children[0], eventStart, {
                        handleNumbers: [index]
                    });
                });
            }

            // Attach the tap event to the slider base.
            if ( tap ) {
                attachEvent (actions.start, scope_Base, eventTap, {});
            }

            // Fire hover events
            if ( hover ) {
                attachEvent (actions.move, scope_Base, eventHover, { hover: true });
            }

            // Make the range draggable.
            if ( drag ){

                scope_Connects.forEach((connect, index) => {

                    if ( connect === false || index === 0 || index === scope_Connects.length - 1 ) {
                        return;
                    }

                    const handleBefore = scope_Handles[index - 1];
                    const handleAfter = scope_Handles[index];
                    const eventHolders = [connect];

                    addClass(connect, options.cssClasses.draggable);

                    // When the range is fixed, the entire range can
                    // be dragged by the handles. The handle in the first
                    // origin will propagate the start event upward,
                    // but it needs to be bound manually on the other.
                    if ( fixed ) {
                        eventHolders.push(handleBefore.children[0]);
                        eventHolders.push(handleAfter.children[0]);
                    }

                    eventHolders.forEach(eventHolder => {
                        attachEvent ( actions.start, eventHolder, eventStart, {
                            handles: [handleBefore, handleAfter],
                            handleNumbers: [index - 1, index]
                        });
                    });
                });
            }
        }


        // Split out the handle positioning logic so the Move event can use it, too
        function checkHandlePosition ( reference, handleNumber, to, lookBackward, lookForward ) {

            // For sliders with multiple handles, limit movement to the other handle.
            // Apply the margin option by adding it to the handle positions.
            if ( scope_Handles.length > 1 ) {

                if ( lookBackward && handleNumber > 0 ) {
                    to = Math.max(to, reference[handleNumber - 1] + options.margin);
                }

                if ( lookForward && handleNumber < scope_Handles.length - 1 ) {
                    to = Math.min(to, reference[handleNumber + 1] - options.margin);
                }
            }

            // The limit option has the opposite effect, limiting handles to a
            // maximum distance from another. Limit must be > 0, as otherwise
            // handles would be unmoveable.
            if ( scope_Handles.length > 1 && options.limit ) {

                if ( lookBackward && handleNumber > 0 ) {
                    to = Math.min(to, reference[handleNumber - 1] + options.limit);
                }

                if ( lookForward && handleNumber < scope_Handles.length - 1 ) {
                    to = Math.max(to, reference[handleNumber + 1] - options.limit);
                }
            }

            // The padding option keeps the handles a certain distance from the
            // edges of the slider. Padding must be > 0.
            if ( options.padding ) {

                if ( handleNumber === 0 ) {
                    to = Math.max(to, options.padding);
                }

                if ( handleNumber === scope_Handles.length - 1 ) {
                    to = Math.min(to, 100 - options.padding);
                }
            }

            to = scope_Spectrum.getStep(to);

            // Limit percentage to the 0 - 100 range
            to = limit(to);

            // Return false if handle can't move
            if ( to === reference[handleNumber] ) {
                return false;
            }

            return to;
        }

        function toPct ( pct ) {
            return `${pct}%`;
        }

        // Updates scope_Locations and scope_Values, updates visual state
        function updateHandlePosition ( handleNumber, to ) {

            // Update locations.
            scope_Locations[handleNumber] = to;

            // Convert the value to the slider stepping/range.
            scope_Values[handleNumber] = scope_Spectrum.fromStepping(to);

            // Called synchronously or on the next animationFrame
            const stateUpdate = () => {
                scope_Handles[handleNumber].style[options.style] = toPct(to);
                updateConnect(handleNumber);
                updateConnect(handleNumber + 1);
            };

            // Set the handle to the new position.
            // Use requestAnimationFrame for efficient painting.
            // No significant effect in Chrome, Edge sees dramatic performace improvements.
            // Option to disable is useful for unit tests, and single-step debugging.
            if ( window.requestAnimationFrame && options.useRequestAnimationFrame ) {
                window.requestAnimationFrame(stateUpdate);
            } else {
                stateUpdate();
            }
        }

        function setZindex ( ) {

            scope_HandleNumbers.forEach(handleNumber => {
                // Handles before the slider middle are stacked later = higher,
                // Handles after the middle later is lower
                // [[7] [8] .......... | .......... [5] [4]
                const dir = (scope_Locations[handleNumber] > 50 ? -1 : 1);
                const zIndex = 3 + (scope_Handles.length + (dir * handleNumber));
                scope_Handles[handleNumber].childNodes[0].style.zIndex = zIndex;
            });
        }

        // Test suggested values and apply margin, step.
        function setHandle ( handleNumber, to, lookBackward, lookForward ) {

            to = checkHandlePosition(scope_Locations, handleNumber, to, lookBackward, lookForward);

            if ( to === false ) {
                return false;
            }

            updateHandlePosition(handleNumber, to);

            return true;
        }

        // Updates style attribute for connect nodes
        function updateConnect ( index ) {

            // Skip connects set to false
            if ( !scope_Connects[index] ) {
                return;
            }

            let l = 0;
            let h = 100;

            if ( index !== 0 ) {
                l = scope_Locations[index - 1];
            }

            if ( index !== scope_Connects.length - 1 ) {
                h = scope_Locations[index];
            }

            scope_Connects[index].style[options.style] = toPct(l);
            scope_Connects[index].style[options.styleOposite] = toPct(100 - h);
        }

        // ...
        function setValue ( to, handleNumber ) {

            // Setting with null indicates an 'ignore'.
            // Inputting 'false' is invalid.
            if ( to === null || to === false ) {
                return;
            }

            // If a formatted number was passed, attemt to decode it.
            if ( typeof to === 'number' ) {
                to = String(to);
            }

            to = options.format.from(to);

            // Request an update for all links if the value was invalid.
            // Do so too if setting the handle fails.
            if ( to !== false && !isNaN(to) ) {
                setHandle(handleNumber, scope_Spectrum.toStepping(to), false, false);
            }
        }

        // Set the slider value.
        function valueSet ( input, fireSetEvent ) {

            const values = asArray(input);
            const isInit = scope_Locations[0] === undefined;

            // Event fires by default
            fireSetEvent = (fireSetEvent === undefined ? true : !!fireSetEvent);

            values.forEach(setValue);

            // Animation is optional.
            // Make sure the initial values were set before using animated placement.
            if ( options.animate && !isInit ) {
                addClassFor(scope_Target, options.cssClasses.tap, options.animationDuration);
            }

            // Now that all base values are set, apply constraints
            scope_HandleNumbers.forEach(handleNumber => {
                setHandle(handleNumber, scope_Locations[handleNumber], true, false);
            });

            setZindex();

            scope_HandleNumbers.forEach(handleNumber => {

                fireEvent('update', handleNumber);

                // Fire the event only for handles that received a new value, as per #579
                if ( values[handleNumber] !== null && fireSetEvent ) {
                    fireEvent('set', handleNumber);
                }
            });
        }

        // Reset slider to initial values
        function valueReset ( fireSetEvent ) {
            valueSet(options.start, fireSetEvent);
        }

        // Get the slider value.
        function valueGet ( ) {

            const values = scope_Values.map(options.format.to);

            // If only one handle is used, return a single value.
            if ( values.length === 1 ){
                return values[0];
            }

            return values;
        }

        // Removes classes from the root and empties it.
        function destroy ( ) {

            for ( const key in options.cssClasses ) {
                if ( !options.cssClasses.hasOwnProperty(key) ) { continue; }
                removeClass(scope_Target, options.cssClasses[key]);
            }

            while (scope_Target.firstChild) {
                scope_Target.removeChild(scope_Target.firstChild);
            }

            delete scope_Target.noUiSlider;
        }

        // Get the current step size for the slider.
        function getCurrentStep ( ) {

            // Check all locations, map them to their stepping point.
            // Get the step point, then find it in the input list.
            return scope_Locations.map((location, index) => {

                const nearbySteps = scope_Spectrum.getNearbySteps( location );
                const value = scope_Values[index];
                let increment = nearbySteps.thisStep.step;
                let decrement = null;

                // If the next value in this step moves into the next step,
                // the increment is the start of the next step - the current value
                if ( increment !== false ) {
                    if ( value + increment > nearbySteps.stepAfter.startValue ) {
                        increment = nearbySteps.stepAfter.startValue - value;
                    }
                }


                // If the value is beyond the starting point
                if ( value > nearbySteps.thisStep.startValue ) {
                    decrement = nearbySteps.thisStep.step;
                }

                else if ( nearbySteps.stepBefore.step === false ) {
                    decrement = false;
                }

                // If a handle is at the start of a step, it always steps back into the previous step first
                else {
                    decrement = value - nearbySteps.stepBefore.highestStep;
                }


                // Now, if at the slider edges, there is not in/decrement
                if ( location === 100 ) {
                    increment = null;
                }

                else if ( location === 0 ) {
                    decrement = null;
                }

                // As per #391, the comparison for the decrement step can have some rounding issues.
                const stepDecimals = scope_Spectrum.countStepDecimals();

                // Round per #391
                if ( increment !== null && increment !== false ) {
                    increment = Number(increment.toFixed(stepDecimals));
                }

                if ( decrement !== null && decrement !== false ) {
                    decrement = Number(decrement.toFixed(stepDecimals));
                }

                return [decrement, increment];
            });
        }

        // Attach an event to this slider, possibly including a namespace
        function bindEvent ( namespacedEvent, callback ) {
            scope_Events[namespacedEvent] = scope_Events[namespacedEvent] || [];
            scope_Events[namespacedEvent].push(callback);

            // If the event bound is 'update,' fire it immediately for all handles.
            if ( namespacedEvent.split('.')[0] === 'update' ) {
                scope_Handles.forEach((a, index) => {
                    fireEvent('update', index);
                });
            }
        }

        // Undo attachment of event
        function removeEvent ( namespacedEvent ) {

            const event = namespacedEvent && namespacedEvent.split('.')[0];
            const namespace = event && namespacedEvent.substring(event.length);

            Object.keys(scope_Events).forEach(bind => {
                const tEvent = bind.split('.')[0];
                const tNamespace = bind.substring(tEvent.length);

                if ( (!event || event === tEvent) && (!namespace || namespace === tNamespace) ) {
                    delete scope_Events[bind];
                }
            });
        }

        // Updateable: margin, limit, padding, step, range, animate, snap
        function updateOptions ( optionsToUpdate, fireSetEvent ) {

            // Spectrum is created using the range, snap, direction and step options.
            // 'snap' and 'step' can be updated, 'direction' cannot, due to event binding.
            // If 'snap' and 'step' are not passed, they should remain unchanged.
            const v = valueGet();

            const updateAble = ['margin', 'limit', 'padding', 'range', 'animate', 'snap', 'step', 'format'];

            // Only change options that we're actually passed to update.
            updateAble.forEach(name => {
                if ( optionsToUpdate[name] !== undefined ) {
                    originalOptions[name] = optionsToUpdate[name];
                }
            });

            const newOptions = testOptions(originalOptions);

            // Load new options into the slider state
            updateAble.forEach(name => {
                if ( optionsToUpdate[name] !== undefined ) {
                    options[name] = newOptions[name];
                }
            });

            // Save current spectrum direction as testOptions in testRange call
            // doesn't rely on current direction
            newOptions.spectrum.direction = scope_Spectrum.direction;
            scope_Spectrum = newOptions.spectrum;

            // Limit, margin and padding depend on the spectrum but are stored outside of it. (#677)
            options.margin = newOptions.margin;
            options.limit = newOptions.limit;
            options.padding = newOptions.padding;

            // Invalidate the current positioning so valueSet forces an update.
            scope_Locations = [];
            valueSet(optionsToUpdate.start || v, fireSetEvent);
        }

        // Throw an error if the slider was already initialized.
        if ( scope_Target.noUiSlider ) {
            throw new Error(`noUiSlider (${VERSION}): Slider was already initialized.`);
        }

        // Create the base element, initialise HTML and set classes.
        // Add handles and connect elements.
        addSlider(scope_Target);
        addElements(options.connect, scope_Base);

        scope_Self = {
            destroy,
            steps: getCurrentStep,
            on: bindEvent,
            off: removeEvent,
            get: valueGet,
            set: valueSet,
            reset: valueReset,
            // Exposed for unit testing, don't use this in your application.
            __moveHandles(a, b, c) { moveHandles(a, b, scope_Locations, c); },
            options: originalOptions, // Issue #600, #678
            updateOptions,
            target: scope_Target, // Issue #597
            pips // Issue #594
        };

        // Attach user events.
        bindSliderEvents(options.events);

        // Use the public value method to set the start values.
        valueSet(options.start);

        if ( options.pips ) {
            pips(options.pips);
        }

        if ( options.tooltips ) {
            tooltips();
        }

        return scope_Self;

    }


    // Run the standard initializer
    function initialize ( target, originalOptions ) {

		if ( !target.nodeName ) {
			throw new Error(`noUiSlider (${VERSION}): create requires a single element.`);
		}

		// Test the options and create the slider environment;
		const options = testOptions( originalOptions, target );
		const api = closure( target, options, originalOptions );

		target.noUiSlider = api;

		return api;
	}

    // Use an object instead of a function for future expansibility;
    return {
		version: VERSION,
		create: initialize
	};
});