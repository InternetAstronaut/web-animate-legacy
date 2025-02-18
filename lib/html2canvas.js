/*
  html2canvas 0.4.1 <http://html2canvas.hertzen.com>
  Copyright (c) 2013 Niklas von Hertzen

  Released under MIT License
*/

((window, document, undefined) => {
  const _html2canvas = {};
  let previousElement;
  let computedCSS;
  let html2canvas;

  _html2canvas.Util = {};

  _html2canvas.Util.log = a => {
    if (_html2canvas.logging && window.console && window.console.log) {
      window.console.log(a);
    }
  };

  _html2canvas.Util.trimText = (isNative => {
    return input => {
      return isNative ? isNative.apply(input) : (`${input || ''}`).replace( /^\s+|\s+$/g , '' );
    };
  })(String.prototype.trim);

  _html2canvas.Util.asFloat = v => {
    return parseFloat(v);
  };

  (() => {
    // TODO: support all possible length values
    const TEXT_SHADOW_PROPERTY = /((rgba|rgb)\([^\)]+\)(\s-?\d+px){0,})/g;
    const TEXT_SHADOW_VALUES = /(-?\d+px)|(#.+)|(rgb\(.+\))|(rgba\(.+\))/g;
    _html2canvas.Util.parseTextShadows = value => {
      if (!value || value === 'none') {
        return [];
      }

      // find multiple shadow declarations
      const shadows = value.match(TEXT_SHADOW_PROPERTY);

      const results = [];
      for (let i = 0; shadows && (i < shadows.length); i++) {
        const s = shadows[i].match(TEXT_SHADOW_VALUES);
        results.push({
          color: s[0],
          offsetX: s[1] ? s[1].replace('px', '') : 0,
          offsetY: s[2] ? s[2].replace('px', '') : 0,
          blur: s[3] ? s[3].replace('px', '') : 0
        });
      }
      return results;
    };
  })();


  _html2canvas.Util.parseBackgroundImage = value => {
    const whitespace = ' \r\n\t';
    let method;
    let definition;
    let prefix;
    let prefix_i;
    let block;
    const results = [];
    let c;
    let mode = 0;
    let numParen = 0;
    let quote;
    let args;

    const appendResult = () => {
        if(method) {
            if(definition.substr( 0, 1 ) === '"') {
                definition = definition.substr( 1, definition.length - 2 );
            }
            if(definition) {
                args.push(definition);
            }
            if(method.substr( 0, 1 ) === '-' &&
                    (prefix_i = method.indexOf( '-', 1 ) + 1) > 0) {
                prefix = method.substr( 0, prefix_i);
                method = method.substr( prefix_i );
            }
            results.push({
                prefix,
                method: method.toLowerCase(),
                value: block,
                args
            });
        }
        args = []; //for some odd reason, setting .length = 0 didn't work in safari
        method =
            prefix =
            definition =
            block = '';
    };

    appendResult();
    for(let i = 0, ii = value.length; i<ii; i++) {
        c = value[i];
        if(mode === 0 && whitespace.includes(c)){
            continue;
        }
        switch(c) {
            case '"':
                if(!quote) {
                    quote = c;
                }
                else if(quote === c) {
                    quote = null;
                }
                break;

            case '(':
                if(quote) { break; }
                else if(mode === 0) {
                    mode = 1;
                    block += c;
                    continue;
                } else {
                    numParen++;
                }
                break;

            case ')':
                if(quote) { break; }
                else if(mode === 1) {
                    if(numParen === 0) {
                        mode = 0;
                        block += c;
                        appendResult();
                        continue;
                    } else {
                        numParen--;
                    }
                }
                break;

            case ',':
                if(quote) { break; }
                else if(mode === 0) {
                    appendResult();
                    continue;
                }
                else if (mode === 1) {
                    if(numParen === 0 && !method.match(/^url$/i)) {
                        args.push(definition);
                        definition = '';
                        block += c;
                        continue;
                    }
                }
                break;
        }

        block += c;
        if(mode === 0) { method += c; }
        else { definition += c; }
    }
    appendResult();

    return results;
  };

  _html2canvas.Util.Bounds = element => {
    let clientRect;
    const bounds = {};

    if (element.getBoundingClientRect){
      clientRect = element.getBoundingClientRect();

      // TODO add scroll position to bounds, so no scrolling of window necessary
      bounds.top = clientRect.top;
      bounds.bottom = clientRect.bottom || (clientRect.top + clientRect.height);
      bounds.left = clientRect.left;

      bounds.width = element.offsetWidth;
      bounds.height = element.offsetHeight;
    }

    return bounds;
  };

  // TODO ideally, we'd want everything to go through this function instead of Util.Bounds,
  // but would require further work to calculate the correct positions for elements with offsetParents
  _html2canvas.Util.OffsetBounds = element => {
    const parent = element.offsetParent ? _html2canvas.Util.OffsetBounds(element.offsetParent) : {top: 0, left: 0};

    return {
      top: element.offsetTop + parent.top,
      bottom: element.offsetTop + element.offsetHeight + parent.top,
      left: element.offsetLeft + parent.left,
      width: element.offsetWidth,
      height: element.offsetHeight
    };
  };

  function toPX(element, attribute, value ) {
    const rsLeft = element.runtimeStyle && element.runtimeStyle[attribute];
    let left;
    const style = element.style;

    // Check if we are not dealing with pixels, (Opera has issues with this)
    // Ported from jQuery css.js
    // From the awesome hack by Dean Edwards
    // http://erik.eae.net/archives/2007/07/27/18.54.15/#comment-102291

    // If we're not dealing with a regular pixel number
    // but a number that has a weird ending, we need to convert it to pixels

    if ( !/^-?[0-9]+\.?[0-9]*(?:px)?$/i.test( value ) && /^-?\d/.test(value) ) {
        // Remember the original values
        left = style.left;

        // Put in the new values to get a computed value out
        if (rsLeft) {
            element.runtimeStyle.left = element.currentStyle.left;
        }
        style.left = attribute === "fontSize" ? "1em" : (value || 0);
        value = `${style.pixelLeft}px`;

        // Revert the changed values
        style.left = left;
        if (rsLeft) {
            element.runtimeStyle.left = rsLeft;
        }
    }

    if (!/^(thin|medium|thick)$/i.test(value)) {
        return `${Math.round(parseFloat(value))}px`;
    }

    return value;
  }

  function asInt(val) {
      return parseInt(val, 10);
  }

  function parseBackgroundSizePosition(value, element, attribute, index) {
      value = (value || '').split(',');
      value = value[index || 0] || value[0] || 'auto';
      value = _html2canvas.Util.trimText(value).split(' ');

      if(attribute === 'backgroundSize' && (!value[0] || value[0].match(/cover|contain|auto/))) {
          //these values will be handled in the parent function
      } else {
          value[0] = (!value[0].includes("%")) ? toPX(element, `${attribute}X`, value[0]) : value[0];
          if(value[1] === undefined) {
              if(attribute === 'backgroundSize') {
                  value[1] = 'auto';
                  return value;
              } else {
                  // IE 9 doesn't return double digit always
                  value[1] = value[0];
              }
          }
          value[1] = (!value[1].includes("%")) ? toPX(element, `${attribute}Y`, value[1]) : value[1];
      }
      return value;
  }

  _html2canvas.Util.getCSS = (element, attribute, index) => {
      if (previousElement !== element) {
        computedCSS = document.defaultView.getComputedStyle(element, null);
      }

      const value = computedCSS[attribute];

      if (/^background(Size|Position)$/.test(attribute)) {
          return parseBackgroundSizePosition(value, element, attribute, index);
      } else if (/border(Top|Bottom)(Left|Right)Radius/.test(attribute)) {
        const arr = value.split(" ");
        if (arr.length <= 1) {
            arr[1] = arr[0];
        }
        return arr.map(asInt);
      }

    return value;
  };

  _html2canvas.Util.resizeBounds = (current_width, current_height, target_width, target_height, stretch_mode) => {
    const target_ratio = target_width / target_height;
    const current_ratio = current_width / current_height;
    let output_width;
    let output_height;

    if(!stretch_mode || stretch_mode === 'auto') {
      output_width = target_width;
      output_height = target_height;
    } else if(target_ratio < current_ratio ^ stretch_mode === 'contain') {
      output_height = target_height;
      output_width = target_height * current_ratio;
    } else {
      output_width = target_width;
      output_height = target_width / current_ratio;
    }

    return {
      width: output_width,
      height: output_height
    };
  };

  function backgroundBoundsFactory(prop, el, {width, height}, image, imageIndex, backgroundSize) {
    let bgposition =  _html2canvas.Util.getCSS( el, prop, imageIndex );
    let topPos;
    let left;
    let percentage;
    let val;

    if (bgposition.length === 1){
      val = bgposition[0];

      bgposition = [];

      bgposition[0] = val;
      bgposition[1] = val;
    }

    if (bgposition[0].toString().includes("%")){
      percentage = (parseFloat(bgposition[0])/100);
      left = width * percentage;
      if(prop !== 'backgroundSize') {
        left -= (backgroundSize || image).width*percentage;
      }
    } else {
      if(prop === 'backgroundSize') {
        if(bgposition[0] === 'auto') {
          left = image.width;
        } else {
          if (/contain|cover/.test(bgposition[0])) {
            const resized = _html2canvas.Util.resizeBounds(image.width, image.height, width, height, bgposition[0]);
            left = resized.width;
            topPos = resized.height;
          } else {
            left = parseInt(bgposition[0], 10);
          }
        }
      } else {
        left = parseInt( bgposition[0], 10);
      }
    }


    if(bgposition[1] === 'auto') {
      topPos = left / image.width * image.height;
    } else if (bgposition[1].toString().includes("%")){
      percentage = (parseFloat(bgposition[1])/100);
      topPos =  height * percentage;
      if(prop !== 'backgroundSize') {
        topPos -= (backgroundSize || image).height * percentage;
      }

    } else {
      topPos = parseInt(bgposition[1],10);
    }

    return [left, topPos];
  }

  _html2canvas.Util.BackgroundPosition = (el, bounds, image, imageIndex, backgroundSize) => {
      const result = backgroundBoundsFactory( 'backgroundPosition', el, bounds, image, imageIndex, backgroundSize );
      return { left: result[0], top: result[1] };
  };

  _html2canvas.Util.BackgroundSize = (el, bounds, image, imageIndex) => {
      const result = backgroundBoundsFactory( 'backgroundSize', el, bounds, image, imageIndex );
      return { width: result[0], height: result[1] };
  };

  _html2canvas.Util.Extend = (options, defaults) => {
    for (const key in options) {
      if (options.hasOwnProperty(key)) {
        defaults[key] = options[key];
      }
    }
    return defaults;
  };


  /*
   * Derived from jQuery.contents()
   * Copyright 2010, John Resig
   * Dual licensed under the MIT or GPL Version 2 licenses.
   * http://jquery.org/license
   */
  _html2canvas.Util.Children = ({nodeName, contentDocument, contentWindow, childNodes}) => {
    let children;
    try {
      children = nodeName && nodeName.toUpperCase() === "IFRAME" ? contentDocument || contentWindow.document : (array => {
        const ret = [];
        if (array !== null) {
          ((first, second) => {
            let i = first.length;
            let j = 0;

            if (typeof second.length === "number") {
              for (const l = second.length; j < l; j++) {
                first[i++] = second[j];
              }
            } else {
              while (second[j] !== undefined) {
                first[i++] = second[j++];
              }
            }

            first.length = i;

            return first;
          })(ret, array);
        }
        return ret;
      })(childNodes);

    } catch (ex) {
      _html2canvas.Util.log(`html2canvas.Util.Children failed with exception: ${ex.message}`);
      children = [];
    }
    return children;
  };

  _html2canvas.Util.isTransparent = backgroundColor => {
    return (backgroundColor === "transparent" || backgroundColor === "rgba(0, 0, 0, 0)");
  };
  _html2canvas.Util.Font = (() => {

    const fontData = {};

    return (font, fontSize, doc) => {
      if (fontData[`${font}-${fontSize}`] !== undefined) {
        return fontData[`${font}-${fontSize}`];
      }

      const container = doc.createElement('div');
      const img = doc.createElement('img');
      const span = doc.createElement('span');
      const sampleText = 'Hidden Text';
      let baseline;
      let middle;
      let metricsObj;

      container.style.visibility = "hidden";
      container.style.fontFamily = font;
      container.style.fontSize = fontSize;
      container.style.margin = 0;
      container.style.padding = 0;

      doc.body.appendChild(container);

      // http://probablyprogramming.com/2009/03/15/the-tiniest-gif-ever (handtinywhite.gif)
      img.src = "data:image/gif;base64,R0lGODlhAQABAIABAP///wAAACwAAAAAAQABAAACAkQBADs=";
      img.width = 1;
      img.height = 1;

      img.style.margin = 0;
      img.style.padding = 0;
      img.style.verticalAlign = "baseline";

      span.style.fontFamily = font;
      span.style.fontSize = fontSize;
      span.style.margin = 0;
      span.style.padding = 0;

      span.appendChild(doc.createTextNode(sampleText));
      container.appendChild(span);
      container.appendChild(img);
      baseline = (img.offsetTop - span.offsetTop) + 1;

      container.removeChild(span);
      container.appendChild(doc.createTextNode(sampleText));

      container.style.lineHeight = "normal";
      img.style.verticalAlign = "super";

      middle = (img.offsetTop-container.offsetTop) + 1;
      metricsObj = {
        baseline,
        lineWidth: 1,
        middle
      };

      fontData[`${font}-${fontSize}`] = metricsObj;

      doc.body.removeChild(container);

      return metricsObj;
    };
  })();

  (() => {
    const Util = _html2canvas.Util;
    const Generate = {};

    _html2canvas.Generate = Generate;

    const reGradients = [
    /^(-webkit-linear-gradient)\(([a-z\s]+)([\w\d\.\s,%\(\)]+)\)$/,
    /^(-o-linear-gradient)\(([a-z\s]+)([\w\d\.\s,%\(\)]+)\)$/,
    /^(-webkit-gradient)\((linear|radial),\s((?:\d{1,3}%?)\s(?:\d{1,3}%?),\s(?:\d{1,3}%?)\s(?:\d{1,3}%?))([\w\d\.\s,%\(\)\-]+)\)$/,
    /^(-moz-linear-gradient)\(((?:\d{1,3}%?)\s(?:\d{1,3}%?))([\w\d\.\s,%\(\)]+)\)$/,
    /^(-webkit-radial-gradient)\(((?:\d{1,3}%?)\s(?:\d{1,3}%?)),\s(\w+)\s([a-z\-]+)([\w\d\.\s,%\(\)]+)\)$/,
    /^(-moz-radial-gradient)\(((?:\d{1,3}%?)\s(?:\d{1,3}%?)),\s(\w+)\s?([a-z\-]*)([\w\d\.\s,%\(\)]+)\)$/,
    /^(-o-radial-gradient)\(((?:\d{1,3}%?)\s(?:\d{1,3}%?)),\s(\w+)\s([a-z\-]+)([\w\d\.\s,%\(\)]+)\)$/
    ];

    /*
   * TODO: Add IE10 vendor prefix (-ms) support
   * TODO: Add W3C gradient (linear-gradient) support
   * TODO: Add old Webkit -webkit-gradient(radial, ...) support
   * TODO: Maybe some RegExp optimizations are possible ;o)
   */
    Generate.parseGradient = (css, {height, width}) => {
      let gradient;
      let i;
      const len = reGradients.length;
      let m1;
      let stop;
      let m2;
      let m2Len;
      let step;
      let m3;
      let tl;
      let tr;
      let br;
      let bl;

      for(i = 0; i < len; i+=1){
        m1 = css.match(reGradients[i]);
        if(m1) {
          break;
        }
      }

      if(m1) {
        switch(m1[1]) {
          case '-webkit-linear-gradient':
          case '-o-linear-gradient':

            gradient = {
              type: 'linear',
              x0: null,
              y0: null,
              x1: null,
              y1: null,
              colorStops: []
            };

            // get coordinates
            m2 = m1[2].match(/\w+/g);
            if(m2){
              m2Len = m2.length;
              for(i = 0; i < m2Len; i+=1){
                switch(m2[i]) {
                  case 'top':
                    gradient.y0 = 0;
                    gradient.y1 = height;
                    break;

                  case 'right':
                    gradient.x0 = width;
                    gradient.x1 = 0;
                    break;

                  case 'bottom':
                    gradient.y0 = height;
                    gradient.y1 = 0;
                    break;

                  case 'left':
                    gradient.x0 = 0;
                    gradient.x1 = width;
                    break;
                }
              }
            }
            if(gradient.x0 === null && gradient.x1 === null){ // center
              gradient.x0 = gradient.x1 = width / 2;
            }
            if(gradient.y0 === null && gradient.y1 === null){ // center
              gradient.y0 = gradient.y1 = height / 2;
            }

            // get colors and stops
            m2 = m1[3].match(/((?:rgb|rgba)\(\d{1,3},\s\d{1,3},\s\d{1,3}(?:,\s[0-9\.]+)?\)(?:\s\d{1,3}(?:%|px))?)+/g);
            if(m2){
              m2Len = m2.length;
              step = 1 / Math.max(m2Len - 1, 1);
              for(i = 0; i < m2Len; i+=1){
                m3 = m2[i].match(/((?:rgb|rgba)\(\d{1,3},\s\d{1,3},\s\d{1,3}(?:,\s[0-9\.]+)?\))\s*(\d{1,3})?(%|px)?/);
                if(m3[2]){
                  stop = parseFloat(m3[2]);
                  if(m3[3] === '%'){
                    stop /= 100;
                  } else { // px - stupid opera
                    stop /= width;
                  }
                } else {
                  stop = i * step;
                }
                gradient.colorStops.push({
                  color: m3[1],
                  stop
                });
              }
            }
            break;

          case '-webkit-gradient':

            gradient = {
              type: m1[2] === 'radial' ? 'circle' : m1[2], // TODO: Add radial gradient support for older mozilla definitions
              x0: 0,
              y0: 0,
              x1: 0,
              y1: 0,
              colorStops: []
            };

            // get coordinates
            m2 = m1[3].match(/(\d{1,3})%?\s(\d{1,3})%?,\s(\d{1,3})%?\s(\d{1,3})%?/);
            if(m2){
              gradient.x0 = (m2[1] * width) / 100;
              gradient.y0 = (m2[2] * height) / 100;
              gradient.x1 = (m2[3] * width) / 100;
              gradient.y1 = (m2[4] * height) / 100;
            }

            // get colors and stops
            m2 = m1[4].match(/((?:from|to|color-stop)\((?:[0-9\.]+,\s)?(?:rgb|rgba)\(\d{1,3},\s\d{1,3},\s\d{1,3}(?:,\s[0-9\.]+)?\)\))+/g);
            if(m2){
              m2Len = m2.length;
              for(i = 0; i < m2Len; i+=1){
                m3 = m2[i].match(/(from|to|color-stop)\(([0-9\.]+)?(?:,\s)?((?:rgb|rgba)\(\d{1,3},\s\d{1,3},\s\d{1,3}(?:,\s[0-9\.]+)?\))\)/);
                stop = parseFloat(m3[2]);
                if(m3[1] === 'from') {
                  stop = 0.0;
                }
                if(m3[1] === 'to') {
                  stop = 1.0;
                }
                gradient.colorStops.push({
                  color: m3[3],
                  stop
                });
              }
            }
            break;

          case '-moz-linear-gradient':

            gradient = {
              type: 'linear',
              x0: 0,
              y0: 0,
              x1: 0,
              y1: 0,
              colorStops: []
            };

            // get coordinates
            m2 = m1[2].match(/(\d{1,3})%?\s(\d{1,3})%?/);

            // m2[1] == 0%   -> left
            // m2[1] == 50%  -> center
            // m2[1] == 100% -> right

            // m2[2] == 0%   -> top
            // m2[2] == 50%  -> center
            // m2[2] == 100% -> bottom

            if(m2){
              gradient.x0 = (m2[1] * width) / 100;
              gradient.y0 = (m2[2] * height) / 100;
              gradient.x1 = width - gradient.x0;
              gradient.y1 = height - gradient.y0;
            }

            // get colors and stops
            m2 = m1[3].match(/((?:rgb|rgba)\(\d{1,3},\s\d{1,3},\s\d{1,3}(?:,\s[0-9\.]+)?\)(?:\s\d{1,3}%)?)+/g);
            if(m2){
              m2Len = m2.length;
              step = 1 / Math.max(m2Len - 1, 1);
              for(i = 0; i < m2Len; i+=1){
                m3 = m2[i].match(/((?:rgb|rgba)\(\d{1,3},\s\d{1,3},\s\d{1,3}(?:,\s[0-9\.]+)?\))\s*(\d{1,3})?(%)?/);
                if(m3[2]){
                  stop = parseFloat(m3[2]);
                  if(m3[3]){ // percentage
                    stop /= 100;
                  }
                } else {
                  stop = i * step;
                }
                gradient.colorStops.push({
                  color: m3[1],
                  stop
                });
              }
            }
            break;

          case '-webkit-radial-gradient':
          case '-moz-radial-gradient':
          case '-o-radial-gradient':

            gradient = {
              type: 'circle',
              x0: 0,
              y0: 0,
              x1: width,
              y1: height,
              cx: 0,
              cy: 0,
              rx: 0,
              ry: 0,
              colorStops: []
            };

            // center
            m2 = m1[2].match(/(\d{1,3})%?\s(\d{1,3})%?/);
            if(m2){
              gradient.cx = (m2[1] * width) / 100;
              gradient.cy = (m2[2] * height) / 100;
            }

            // size
            m2 = m1[3].match(/\w+/);
            m3 = m1[4].match(/[a-z\-]*/);
            if(m2 && m3){
              switch(m3[0]){
                case 'farthest-corner':
                case 'cover': // is equivalent to farthest-corner
                case '': // mozilla removes "cover" from definition :(
                  tl = Math.sqrt(gradient.cx ** 2 + gradient.cy ** 2);
                  tr = Math.sqrt(gradient.cx ** 2 + (gradient.y1 - gradient.cy) ** 2);
                  br = Math.sqrt((gradient.x1 - gradient.cx) ** 2 + (gradient.y1 - gradient.cy) ** 2);
                  bl = Math.sqrt((gradient.x1 - gradient.cx) ** 2 + gradient.cy ** 2);
                  gradient.rx = gradient.ry = Math.max(tl, tr, br, bl);
                  break;
                case 'closest-corner':
                  tl = Math.sqrt(gradient.cx ** 2 + gradient.cy ** 2);
                  tr = Math.sqrt(gradient.cx ** 2 + (gradient.y1 - gradient.cy) ** 2);
                  br = Math.sqrt((gradient.x1 - gradient.cx) ** 2 + (gradient.y1 - gradient.cy) ** 2);
                  bl = Math.sqrt((gradient.x1 - gradient.cx) ** 2 + gradient.cy ** 2);
                  gradient.rx = gradient.ry = Math.min(tl, tr, br, bl);
                  break;
                case 'farthest-side':
                  if(m2[0] === 'circle'){
                    gradient.rx = gradient.ry = Math.max(
                      gradient.cx,
                      gradient.cy,
                      gradient.x1 - gradient.cx,
                      gradient.y1 - gradient.cy
                      );
                  } else { // ellipse

                    gradient.type = m2[0];

                    gradient.rx = Math.max(
                      gradient.cx,
                      gradient.x1 - gradient.cx
                      );
                    gradient.ry = Math.max(
                      gradient.cy,
                      gradient.y1 - gradient.cy
                      );
                  }
                  break;
                case 'closest-side':
                case 'contain': // is equivalent to closest-side
                  if(m2[0] === 'circle'){
                    gradient.rx = gradient.ry = Math.min(
                      gradient.cx,
                      gradient.cy,
                      gradient.x1 - gradient.cx,
                      gradient.y1 - gradient.cy
                      );
                  } else { // ellipse

                    gradient.type = m2[0];

                    gradient.rx = Math.min(
                      gradient.cx,
                      gradient.x1 - gradient.cx
                      );
                    gradient.ry = Math.min(
                      gradient.cy,
                      gradient.y1 - gradient.cy
                      );
                  }
                  break;

              // TODO: add support for "30px 40px" sizes (webkit only)
              }
            }

            // color stops
            m2 = m1[5].match(/((?:rgb|rgba)\(\d{1,3},\s\d{1,3},\s\d{1,3}(?:,\s[0-9\.]+)?\)(?:\s\d{1,3}(?:%|px))?)+/g);
            if(m2){
              m2Len = m2.length;
              step = 1 / Math.max(m2Len - 1, 1);
              for(i = 0; i < m2Len; i+=1){
                m3 = m2[i].match(/((?:rgb|rgba)\(\d{1,3},\s\d{1,3},\s\d{1,3}(?:,\s[0-9\.]+)?\))\s*(\d{1,3})?(%|px)?/);
                if(m3[2]){
                  stop = parseFloat(m3[2]);
                  if(m3[3] === '%'){
                    stop /= 100;
                  } else { // px - stupid opera
                    stop /= width;
                  }
                } else {
                  stop = i * step;
                }
                gradient.colorStops.push({
                  color: m3[1],
                  stop
                });
              }
            }
            break;
        }
      }

      return gradient;
    };

    function addScrollStops(grad) {
      return colorStop => {
        try {
          grad.addColorStop(colorStop.stop, colorStop.color);
        }
        catch(e) {
          Util.log(['failed to add color stop: ', e, '; tried to add: ', colorStop]);
        }
      };
    }

    Generate.Gradient = (src, bounds) => {
      if(bounds.width === 0 || bounds.height === 0) {
        return;
      }

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      let gradient;
      let grad;

      canvas.width = bounds.width;
      canvas.height = bounds.height;

      // TODO: add support for multi defined background gradients
      gradient = _html2canvas.Generate.parseGradient(src, bounds);

      if(gradient) {
        switch(gradient.type) {
          case 'linear':
            grad = ctx.createLinearGradient(gradient.x0, gradient.y0, gradient.x1, gradient.y1);
            gradient.colorStops.forEach(addScrollStops(grad));
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, bounds.width, bounds.height);
            break;

          case 'circle':
            grad = ctx.createRadialGradient(gradient.cx, gradient.cy, 0, gradient.cx, gradient.cy, gradient.rx);
            gradient.colorStops.forEach(addScrollStops(grad));
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, bounds.width, bounds.height);
            break;

          case 'ellipse':
            const canvasRadial = document.createElement('canvas');
            const ctxRadial = canvasRadial.getContext('2d');
            const ri = Math.max(gradient.rx, gradient.ry);
            const di = ri * 2;

            canvasRadial.width = canvasRadial.height = di;

            grad = ctxRadial.createRadialGradient(gradient.rx, gradient.ry, 0, gradient.rx, gradient.ry, ri);
            gradient.colorStops.forEach(addScrollStops(grad));

            ctxRadial.fillStyle = grad;
            ctxRadial.fillRect(0, 0, di, di);

            ctx.fillStyle = gradient.colorStops[gradient.colorStops.length - 1].color;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(canvasRadial, gradient.cx - gradient.rx, gradient.cy - gradient.ry, 2 * gradient.rx, 2 * gradient.ry);
            break;
        }
      }

      return canvas;
    };

    Generate.ListAlpha = number => {
      let tmp = "";
      let modulus;

      do {
        modulus = number % 26;
        tmp = String.fromCharCode((modulus) + 64) + tmp;
        number = number / 26;
      }while((number*26) > 26);

      return tmp;
    };

    Generate.ListRoman = number => {
      const romanArray = ["M", "CM", "D", "CD", "C", "XC", "L", "XL", "X", "IX", "V", "IV", "I"];
      const decimal = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
      let roman = "";
      let v;
      const len = romanArray.length;

      if (number <= 0 || number >= 4000) {
        return number;
      }

      for (v=0; v < len; v+=1) {
        while (number >= decimal[v]) {
          number -= decimal[v];
          roman += romanArray[v];
        }
      }

      return roman;
    };
  })();
  function h2cRenderContext(width, height) {
    const storage = [];
    return {
      storage,
      width,
      height,
      clip(...args) {
        storage.push({
          type: "function",
          name: "clip",
          'arguments': args
        });
      },
      translate(...args) {
        storage.push({
          type: "function",
          name: "translate",
          'arguments': args
        });
      },
      fill(...args) {
        storage.push({
          type: "function",
          name: "fill",
          'arguments': args
        });
      },
      save(...args) {
        storage.push({
          type: "function",
          name: "save",
          'arguments': args
        });
      },
      restore(...args) {
        storage.push({
          type: "function",
          name: "restore",
          'arguments': args
        });
      },
      fillRect(...args) {
        storage.push({
          type: "function",
          name: "fillRect",
          'arguments': args
        });
      },
      createPattern(...args) {
        storage.push({
          type: "function",
          name: "createPattern",
          'arguments': args
        });
      },
      drawShape() {

        const shape = [];

        storage.push({
          type: "function",
          name: "drawShape",
          'arguments': shape
        });

        return {
          moveTo(...args) {
            shape.push({
              name: "moveTo",
              'arguments': args
            });
          },
          lineTo(...args) {
            shape.push({
              name: "lineTo",
              'arguments': args
            });
          },
          arcTo(...args) {
            shape.push({
              name: "arcTo",
              'arguments': args
            });
          },
          bezierCurveTo(...args) {
            shape.push({
              name: "bezierCurveTo",
              'arguments': args
            });
          },
          quadraticCurveTo(...args) {
            shape.push({
              name: "quadraticCurveTo",
              'arguments': args
            });
          }
        };

      },
      drawImage(...args) {
        storage.push({
          type: "function",
          name: "drawImage",
          'arguments': args
        });
      },
      fillText(...args) {
        storage.push({
          type: "function",
          name: "fillText",
          'arguments': args
        });
      },
      setVariable(variable, value) {
        storage.push({
          type: "variable",
          name: variable,
          'arguments': value
        });
        return value;
      }
    };
  }
  _html2canvas.Parse = (images, options) => {
    window.scroll(0,0);

    const // select body by default
    element = (( options.elements === undefined ) ? document.body : options.elements[0]);

    let numDraws = 0;
    const doc = element.ownerDocument;
    const Util = _html2canvas.Util;
    const support = Util.Support(options, doc);
    const ignoreElementsRegExp = new RegExp(`(${options.ignoreElements})`);
    const body = doc.body;
    const getCSS = Util.getCSS;
    const pseudoHide = "___html2canvas___pseudoelement";
    const hidePseudoElements = doc.createElement('style');

    hidePseudoElements.innerHTML = `.${pseudoHide}-before:before { content: "" !important; display: none !important; }.${pseudoHide}-after:after { content: "" !important; display: none !important; }`;

    body.appendChild(hidePseudoElements);

    images = images || {};

    function documentWidth () {
      return Math.max(
        Math.max(doc.body.scrollWidth, doc.documentElement.scrollWidth),
        Math.max(doc.body.offsetWidth, doc.documentElement.offsetWidth),
        Math.max(doc.body.clientWidth, doc.documentElement.clientWidth)
        );
    }

    function documentHeight () {
      return Math.max(
        Math.max(doc.body.scrollHeight, doc.documentElement.scrollHeight),
        Math.max(doc.body.offsetHeight, doc.documentElement.offsetHeight),
        Math.max(doc.body.clientHeight, doc.documentElement.clientHeight)
        );
    }

    function getCSSInt(element, attribute) {
      const val = parseInt(getCSS(element, attribute), 10);
      return (isNaN(val)) ? 0 : val; // borders in old IE are throwing 'medium' for demo.html
    }

    function renderRect (ctx, x, y, w, h, bgcolor) {
      if (bgcolor !== "transparent"){
        ctx.setVariable("fillStyle", bgcolor);
        ctx.fillRect(x, y, w, h);
        numDraws+=1;
      }
    }

    function capitalize({length}, p1, p2) {
      if (length > 0) {
        return p1 + p2.toUpperCase();
      }
    }

    function textTransform (text, transform) {
      switch(transform){
        case "lowercase":
          return text.toLowerCase();
        case "capitalize":
          return text.replace( /(^|\s|:|-|\(|\))([a-z])/g, capitalize);
        case "uppercase":
          return text.toUpperCase();
        default:
          return text;
      }
    }

    function noLetterSpacing(letter_spacing) {
      return (/^(normal|none|0px)$/.test(letter_spacing));
    }

    function drawText(currentText, x, y, ctx){
      if (currentText !== null && Util.trimText(currentText).length > 0) {
        ctx.fillText(currentText, x, y);
        numDraws+=1;
      }
    }

    function setTextVariables(ctx, el, text_decoration, color) {
      const align = false;
      let bold = getCSS(el, "fontWeight");
      const family = getCSS(el, "fontFamily");
      const size = getCSS(el, "fontSize");
      const shadows = Util.parseTextShadows(getCSS(el, "textShadow"));

      switch(parseInt(bold, 10)){
        case 401:
          bold = "bold";
          break;
        case 400:
          bold = "normal";
          break;
      }

      ctx.setVariable("fillStyle", color);
      ctx.setVariable("font", [getCSS(el, "fontStyle"), getCSS(el, "fontVariant"), bold, size, family].join(" "));
      ctx.setVariable("textAlign", (align) ? "right" : "left");

      if (shadows.length) {
        // TODO: support multiple text shadows
        // apply the first text shadow
        ctx.setVariable("shadowColor", shadows[0].color);
        ctx.setVariable("shadowOffsetX", shadows[0].offsetX);
        ctx.setVariable("shadowOffsetY", shadows[0].offsetY);
        ctx.setVariable("shadowBlur", shadows[0].blur);
      }

      if (text_decoration !== "none"){
        return Util.Font(family, size, doc);
      }
    }

    function renderTextDecoration(
      ctx,
      text_decoration,
      {left, top, width},
      {baseline, lineWidth, middle},
      color
    ) {
      switch(text_decoration) {
        case "underline":
          // Draws a line at the baseline of the font
          // TODO As some browsers display the line as more than 1px if the font-size is big, need to take that into account both in position and size
          renderRect(ctx, left, Math.round(top + baseline + lineWidth), width, 1, color);
          break;
        case "overline":
          renderRect(ctx, left, Math.round(top), width, 1, color);
          break;
        case "line-through":
          // TODO try and find exact position for line-through
          renderRect(ctx, left, Math.ceil(top + middle + lineWidth), width, 1, color);
          break;
      }
    }

    function getTextBounds(state, text, textDecoration, isLast, transform) {
      let bounds;
      if (support.rangeBounds && !transform) {
        if (textDecoration !== "none" || Util.trimText(text).length !== 0) {
          bounds = textRangeBounds(text, state.node, state.textOffset);
        }
        state.textOffset += text.length;
      } else if (state.node && typeof state.node.nodeValue === "string" ){
        const newTextNode = (isLast) ? state.node.splitText(text.length) : null;
        bounds = textWrapperBounds(state.node, transform);
        state.node = newTextNode;
      }
      return bounds;
    }

    function textRangeBounds({length}, textNode, textOffset) {
      const range = doc.createRange();
      range.setStart(textNode, textOffset);
      range.setEnd(textNode, textOffset + length);
      return range.getBoundingClientRect();
    }

    function textWrapperBounds(oldTextNode, transform) {
      const parent = oldTextNode.parentNode;
      const wrapElement = doc.createElement('wrapper');
      const backupText = oldTextNode.cloneNode(true);

      wrapElement.appendChild(oldTextNode.cloneNode(true));
      parent.replaceChild(wrapElement, oldTextNode);

      const bounds = transform ? Util.OffsetBounds(wrapElement) : Util.Bounds(wrapElement);
      parent.replaceChild(backupText, wrapElement);
      return bounds;
    }

    function renderText(el, textNode, stack) {
      const ctx = stack.ctx;
      const color = getCSS(el, "color");
      const textDecoration = getCSS(el, "textDecoration");
      let textAlign = getCSS(el, "textAlign");
      let metrics;
      let textList;

      const state = {
        node: textNode,
        textOffset: 0
      };

      if (Util.trimText(textNode.nodeValue).length > 0) {
        textNode.nodeValue = textTransform(textNode.nodeValue, getCSS(el, "textTransform"));
        textAlign = textAlign.replace(["-webkit-auto"],["auto"]);

        textList = (!options.letterRendering && /^(left|right|justify|auto)$/.test(textAlign) && noLetterSpacing(getCSS(el, "letterSpacing"))) ?
        textNode.nodeValue.split(/(\b| )/)
        : textNode.nodeValue.split("");

        metrics = setTextVariables(ctx, el, textDecoration, color);

        if (options.chinese) {
          textList.forEach((word, index) => {
            if (/.*[\u4E00-\u9FA5].*$/.test(word)) {
              word = word.split("");
              word.unshift(index, 1);
              textList.splice(...word);
            }
          });
        }

        textList.forEach((text, index) => {
          const bounds = getTextBounds(state, text, textDecoration, (index < textList.length - 1), stack.transform.matrix);
          if (bounds) {
            drawText(text, bounds.left, bounds.bottom, ctx);
            renderTextDecoration(ctx, textDecoration, bounds, metrics, color);
          }
        });
      }
    }

    function listPosition (element, val) {
      const boundElement = doc.createElement( "boundelement" );
      let originalType;
      let bounds;

      boundElement.style.display = "inline";

      originalType = element.style.listStyleType;
      element.style.listStyleType = "none";

      boundElement.appendChild(doc.createTextNode(val));

      element.insertBefore(boundElement, element.firstChild);

      bounds = Util.Bounds(boundElement);
      element.removeChild(boundElement);
      element.style.listStyleType = originalType;
      return bounds;
    }

    function elementIndex(el) {
      let i = -1;
      let count = 1;
      const childs = el.parentNode.childNodes;

      if (el.parentNode) {
        while(childs[++i] !== el) {
          if (childs[i].nodeType === 1) {
            count++;
          }
        }
        return count;
      } else {
        return -1;
      }
    }

    function listItemText(element, type) {
      let currentIndex = elementIndex(element);
      let text;
      switch(type){
        case "decimal":
          text = currentIndex;
          break;
        case "decimal-leading-zero":
          text = (currentIndex.toString().length === 1) ? currentIndex = `0${currentIndex.toString()}` : currentIndex.toString();
          break;
        case "upper-roman":
          text = _html2canvas.Generate.ListRoman( currentIndex );
          break;
        case "lower-roman":
          text = _html2canvas.Generate.ListRoman( currentIndex ).toLowerCase();
          break;
        case "lower-alpha":
          text = _html2canvas.Generate.ListAlpha( currentIndex ).toLowerCase();
          break;
        case "upper-alpha":
          text = _html2canvas.Generate.ListAlpha( currentIndex );
          break;
      }

      return `${text}. `;
    }

    function renderListItem(element, stack, {left}) {
      let x;
      let text;
      const ctx = stack.ctx;
      const type = getCSS(element, "listStyleType");
      let listBounds;

      if (/^(decimal|decimal-leading-zero|upper-alpha|upper-latin|upper-roman|lower-alpha|lower-greek|lower-latin|lower-roman)$/i.test(type)) {
        text = listItemText(element, type);
        listBounds = listPosition(element, text);
        setTextVariables(ctx, element, "none", getCSS(element, "color"));

        if (getCSS(element, "listStylePosition") === "inside") {
          ctx.setVariable("textAlign", "left");
          x = left;
        } else {
          return;
        }

        drawText(text, x, listBounds.bottom, ctx);
      }
    }

    function loadImage (src){
      const img = images[src];
      return (img && img.succeeded === true) ? img.img : false;
    }

    function clipBounds({left, top, width, height}, {left, top, width, height}) {
      const x = Math.max(left, left);
      const y = Math.max(top, top);
      const x2 = Math.min((left + width), (left + width));
      const y2 = Math.min((top + height), (top + height));

      return {
        left:x,
        top:y,
        width:x2-x,
        height:y2-y
      };
    }

    function setZ(element, stack, parentStack){
      let newContext;
      const isPositioned = stack.cssPosition !== 'static';
      const zIndex = isPositioned ? getCSS(element, 'zIndex') : 'auto';
      const opacity = getCSS(element, 'opacity');
      const isFloated = getCSS(element, 'cssFloat') !== 'none';

      // https://developer.mozilla.org/en-US/docs/Web/Guide/CSS/Understanding_z_index/The_stacking_context
      // When a new stacking context should be created:
      // the root element (HTML),
      // positioned (absolutely or relatively) with a z-index value other than "auto",
      // elements with an opacity value less than 1. (See the specification for opacity),
      // on mobile WebKit and Chrome 22+, position: fixed always creates a new stacking context, even when z-index is "auto" (See this post)

      stack.zIndex = newContext = h2czContext(zIndex);
      newContext.isPositioned = isPositioned;
      newContext.isFloated = isFloated;
      newContext.opacity = opacity;
      newContext.ownStacking = (zIndex !== 'auto' || opacity < 1);

      if (parentStack) {
        parentStack.zIndex.children.push(stack);
      }
    }

    function renderImage(ctx, element, image, {left, top, width, height}, borders) {
      const paddingLeft = getCSSInt(element, 'paddingLeft');
      const paddingTop = getCSSInt(element, 'paddingTop');
      const paddingRight = getCSSInt(element, 'paddingRight');
      const paddingBottom = getCSSInt(element, 'paddingBottom');

      drawImage(
        ctx,
        image,
        0, //sx
        0, //sy
        image.width, //sw
        image.height, //sh
        left + paddingLeft + borders[3].width, //dx
        top + paddingTop + borders[0].width, // dy
        width - (borders[1].width + borders[3].width + paddingLeft + paddingRight), //dw
        height - (borders[0].width + borders[2].width + paddingTop + paddingBottom) //dh
        );
    }

    function getBorderData(element) {
      return ["Top", "Right", "Bottom", "Left"].map(side => {
        return {
          width: getCSSInt(element, `border${side}Width`),
          color: getCSS(element, `border${side}Color`)
        };
      });
    }

    function getBorderRadiusData(element) {
      return ["TopLeft", "TopRight", "BottomRight", "BottomLeft"].map(side => {
        return getCSS(element, `border${side}Radius`);
      });
    }

    const getCurvePoints = (kappa => {

      return (x, y, r1, r2) => {
        const // control point offset horizontal
        ox = (r1) * kappa; // y-middle

        const // control point offset vertical
        oy = (r2) * kappa;

        const // x-middle
        xm = x + r1;

        const ym = y + r2;
        return {
          topLeft: bezierCurve({
            x,
            y:ym
          }, {
            x,
            y:ym - oy
          }, {
            x:xm - ox,
            y
          }, {
            x:xm,
            y
          }),
          topRight: bezierCurve({
            x,
            y
          }, {
            x:x + ox,
            y
          }, {
            x:xm,
            y:ym - oy
          }, {
            x:xm,
            y:ym
          }),
          bottomRight: bezierCurve({
            x:xm,
            y
          }, {
            x:xm,
            y:y + oy
          }, {
            x:x + ox,
            y:ym
          }, {
            x,
            y:ym
          }),
          bottomLeft: bezierCurve({
            x:xm,
            y:ym
          }, {
            x:xm - ox,
            y:ym
          }, {
            x,
            y:y + oy
          }, {
            x,
            y
          })
        };
      };
    })(4 * ((Math.sqrt(2) - 1) / 3));

    function bezierCurve(start, startControl, endControl, end) {

      const lerp = ({x, y}, {x, y}, t) => {
        return {
          x:x + (x - x) * t,
          y:y + (y - y) * t
        };
      };

      return {
        start,
        startControl,
        endControl,
        end,
        subdivide(t) {
          const ab = lerp(start, startControl, t);
          const bc = lerp(startControl, endControl, t);
          const cd = lerp(endControl, end, t);
          const abbc = lerp(ab, bc, t);
          const bccd = lerp(bc, cd, t);
          const dest = lerp(abbc, bccd, t);
          return [bezierCurve(start, ab, abbc, dest), bezierCurve(dest, bccd, cd, end)];
        },
        curveTo(borderArgs) {
          borderArgs.push(["bezierCurve", startControl.x, startControl.y, endControl.x, endControl.y, end.x, end.y]);
        },
        curveToReversed(borderArgs) {
          borderArgs.push(["bezierCurve", endControl.x, endControl.y, startControl.x, startControl.y, start.x, start.y]);
        }
      };
    }

    function parseCorner(borderArgs, radius1, radius2, corner1, corner2, x, y) {
      if (radius1[0] > 0 || radius1[1] > 0) {
        borderArgs.push(["line", corner1[0].start.x, corner1[0].start.y]);
        corner1[0].curveTo(borderArgs);
        corner1[1].curveTo(borderArgs);
      } else {
        borderArgs.push(["line", x, y]);
      }

      if (radius2[0] > 0 || radius2[1] > 0) {
        borderArgs.push(["line", corner2[0].start.x, corner2[0].start.y]);
      }
    }

    function drawSide({c1, c2, c3, c4}, radius1, radius2, outer1, inner1, outer2, inner2) {
      const borderArgs = [];

      if (radius1[0] > 0 || radius1[1] > 0) {
        borderArgs.push(["line", outer1[1].start.x, outer1[1].start.y]);
        outer1[1].curveTo(borderArgs);
      } else {
        borderArgs.push([ "line", c1[0], c1[1]]);
      }

      if (radius2[0] > 0 || radius2[1] > 0) {
        borderArgs.push(["line", outer2[0].start.x, outer2[0].start.y]);
        outer2[0].curveTo(borderArgs);
        borderArgs.push(["line", inner2[0].end.x, inner2[0].end.y]);
        inner2[0].curveToReversed(borderArgs);
      } else {
        borderArgs.push([ "line", c2[0], c2[1]]);
        borderArgs.push([ "line", c3[0], c3[1]]);
      }

      if (radius1[0] > 0 || radius1[1] > 0) {
        borderArgs.push(["line", inner1[1].end.x, inner1[1].end.y]);
        inner1[1].curveToReversed(borderArgs);
      } else {
        borderArgs.push([ "line", c4[0], c4[1]]);
      }

      return borderArgs;
    }

    function calculateCurvePoints(bounds, borderRadius, borders) {
      const x = bounds.left;
      const y = bounds.top;
      const width = bounds.width;
      const height = bounds.height;
      const tlh = borderRadius[0][0];
      const tlv = borderRadius[0][1];
      const trh = borderRadius[1][0];
      const trv = borderRadius[1][1];
      const brh = borderRadius[2][0];
      const brv = borderRadius[2][1];
      const blh = borderRadius[3][0];
      const blv = borderRadius[3][1];
      const topWidth = width - trh;
      const rightHeight = height - brv;
      const bottomWidth = width - brh;
      const leftHeight = height - blv;

      return {
        topLeftOuter: getCurvePoints(
          x,
          y,
          tlh,
          tlv
          ).topLeft.subdivide(0.5),

        topLeftInner: getCurvePoints(
          x + borders[3].width,
          y + borders[0].width,
          Math.max(0, tlh - borders[3].width),
          Math.max(0, tlv - borders[0].width)
          ).topLeft.subdivide(0.5),

        topRightOuter: getCurvePoints(
          x + topWidth,
          y,
          trh,
          trv
          ).topRight.subdivide(0.5),

        topRightInner: getCurvePoints(
          x + Math.min(topWidth, width + borders[3].width),
          y + borders[0].width,
          (topWidth > width + borders[3].width) ? 0 :trh - borders[3].width,
          trv - borders[0].width
          ).topRight.subdivide(0.5),

        bottomRightOuter: getCurvePoints(
          x + bottomWidth,
          y + rightHeight,
          brh,
          brv
          ).bottomRight.subdivide(0.5),

        bottomRightInner: getCurvePoints(
          x + Math.min(bottomWidth, width + borders[3].width),
          y + Math.min(rightHeight, height + borders[0].width),
          Math.max(0, brh - borders[1].width),
          Math.max(0, brv - borders[2].width)
          ).bottomRight.subdivide(0.5),

        bottomLeftOuter: getCurvePoints(
          x,
          y + leftHeight,
          blh,
          blv
          ).bottomLeft.subdivide(0.5),

        bottomLeftInner: getCurvePoints(
          x + borders[3].width,
          y + leftHeight,
          Math.max(0, blh - borders[3].width),
          Math.max(0, blv - borders[2].width)
          ).bottomLeft.subdivide(0.5)
      };
    }

    function getBorderClip(element, borderPoints, borders, radius, {left, top, width, height}) {
      const backgroundClip = getCSS(element, 'backgroundClip');
      const borderArgs = [];

      switch(backgroundClip) {
        case "content-box":
        case "padding-box":
          parseCorner(borderArgs, radius[0], radius[1], borderPoints.topLeftInner, borderPoints.topRightInner, left + borders[3].width, top + borders[0].width);
          parseCorner(borderArgs, radius[1], radius[2], borderPoints.topRightInner, borderPoints.bottomRightInner, left + width - borders[1].width, top + borders[0].width);
          parseCorner(borderArgs, radius[2], radius[3], borderPoints.bottomRightInner, borderPoints.bottomLeftInner, left + width - borders[1].width, top + height - borders[2].width);
          parseCorner(borderArgs, radius[3], radius[0], borderPoints.bottomLeftInner, borderPoints.topLeftInner, left + borders[3].width, top + height - borders[2].width);
          break;

        default:
          parseCorner(borderArgs, radius[0], radius[1], borderPoints.topLeftOuter, borderPoints.topRightOuter, left, top);
          parseCorner(borderArgs, radius[1], radius[2], borderPoints.topRightOuter, borderPoints.bottomRightOuter, left + width, top);
          parseCorner(borderArgs, radius[2], radius[3], borderPoints.bottomRightOuter, borderPoints.bottomLeftOuter, left + width, top + height);
          parseCorner(borderArgs, radius[3], radius[0], borderPoints.bottomLeftOuter, borderPoints.topLeftOuter, left, top + height);
          break;
      }

      return borderArgs;
    }

    function parseBorders(element, bounds, borders){
      const x = bounds.left;
      const y = bounds.top;
      const width = bounds.width;
      const height = bounds.height;
      let borderSide;
      let bx;
      let by;
      let bw;
      let bh;
      let borderArgs;

      const // http://www.w3.org/TR/css3-background/#the-border-radius
      borderRadius = getBorderRadiusData(element);

      const borderPoints = calculateCurvePoints(bounds, borderRadius, borders);

      const borderData = {
        clip: getBorderClip(element, borderPoints, borders, borderRadius, bounds),
        borders: []
      };

      for (borderSide = 0; borderSide < 4; borderSide++) {

        if (borders[borderSide].width > 0) {
          bx = x;
          by = y;
          bw = width;
          bh = height - (borders[2].width);

          switch(borderSide) {
            case 0:
              // top border
              bh = borders[0].width;

              borderArgs = drawSide({
                c1: [bx, by],
                c2: [bx + bw, by],
                c3: [bx + bw - borders[1].width, by + bh],
                c4: [bx + borders[3].width, by + bh]
              }, borderRadius[0], borderRadius[1],
              borderPoints.topLeftOuter, borderPoints.topLeftInner, borderPoints.topRightOuter, borderPoints.topRightInner);
              break;
            case 1:
              // right border
              bx = x + width - (borders[1].width);
              bw = borders[1].width;

              borderArgs = drawSide({
                c1: [bx + bw, by],
                c2: [bx + bw, by + bh + borders[2].width],
                c3: [bx, by + bh],
                c4: [bx, by + borders[0].width]
              }, borderRadius[1], borderRadius[2],
              borderPoints.topRightOuter, borderPoints.topRightInner, borderPoints.bottomRightOuter, borderPoints.bottomRightInner);
              break;
            case 2:
              // bottom border
              by = (by + height) - (borders[2].width);
              bh = borders[2].width;

              borderArgs = drawSide({
                c1: [bx + bw, by + bh],
                c2: [bx, by + bh],
                c3: [bx + borders[3].width, by],
                c4: [bx + bw - borders[3].width, by]
              }, borderRadius[2], borderRadius[3],
              borderPoints.bottomRightOuter, borderPoints.bottomRightInner, borderPoints.bottomLeftOuter, borderPoints.bottomLeftInner);
              break;
            case 3:
              // left border
              bw = borders[3].width;

              borderArgs = drawSide({
                c1: [bx, by + bh + borders[2].width],
                c2: [bx, by],
                c3: [bx + bw, by + borders[0].width],
                c4: [bx + bw, by + bh]
              }, borderRadius[3], borderRadius[0],
              borderPoints.bottomLeftOuter, borderPoints.bottomLeftInner, borderPoints.topLeftOuter, borderPoints.topLeftInner);
              break;
          }

          borderData.borders.push({
            args: borderArgs,
            color: borders[borderSide].color
          });

        }
      }

      return borderData;
    }

    function createShape(ctx, args) {
      const shape = ctx.drawShape();
      args.forEach((border, index) => {
        shape[(index === 0) ? "moveTo" : `${border[0]}To` ].apply(null, border.slice(1));
      });
      return shape;
    }

    function renderBorders(ctx, borderArgs, color) {
      if (color !== "transparent") {
        ctx.setVariable( "fillStyle", color);
        createShape(ctx, borderArgs);
        ctx.fill();
        numDraws+=1;
      }
    }

    function renderFormValue(el, {top, left}, stack) {
      const valueWrap = doc.createElement('valuewrap');
      const cssPropertyArray = ['lineHeight','textAlign','fontFamily','color','fontSize','paddingLeft','paddingTop','width','height','border','borderLeftWidth','borderTopWidth'];
      let textValue;
      let textNode;

      cssPropertyArray.forEach(property => {
        try {
          valueWrap.style[property] = getCSS(el, property);
        } catch(e) {
          // Older IE has issues with "border"
          Util.log(`html2canvas: Parse: Exception caught in renderFormValue: ${e.message}`);
        }
      });

      valueWrap.style.borderColor = "black";
      valueWrap.style.borderStyle = "solid";
      valueWrap.style.display = "block";
      valueWrap.style.position = "absolute";

      if (/^(submit|reset|button|text|password)$/.test(el.type) || el.nodeName === "SELECT"){
        valueWrap.style.lineHeight = getCSS(el, "height");
      }

      valueWrap.style.top = `${top}px`;
      valueWrap.style.left = `${left}px`;

      textValue = (el.nodeName === "SELECT") ? (el.options[el.selectedIndex] || 0).text : el.value;
      if(!textValue) {
        textValue = el.placeholder;
      }

      textNode = doc.createTextNode(textValue);

      valueWrap.appendChild(textNode);
      body.appendChild(valueWrap);

      renderText(el, textNode, stack);
      body.removeChild(valueWrap);
    }

    function drawImage (ctx) {
      ctx.drawImage(...Array.prototype.slice.call(arguments, 1));
      numDraws+=1;
    }

    function getPseudoElement(el, which) {
      const elStyle = window.getComputedStyle(el, which);
      if(!elStyle || !elStyle.content || elStyle.content === "none" || elStyle.content === "-moz-alt-content" || elStyle.display === "none") {
        return;
      }
      let content = `${elStyle.content}`;
      const first = content.substr( 0, 1 );
      //strips quotes
      if(first === content.substr( content.length - 1 ) && first.match(/'|"/)) {
        content = content.substr( 1, content.length - 2 );
      }

      const isImage = content.substr( 0, 3 ) === 'url';
      const elps = document.createElement( isImage ? 'img' : 'span' );

      elps.className = `${pseudoHide}-before ${pseudoHide}-after`;

      Object.keys(elStyle).filter(indexedProperty).forEach(prop => {
        // Prevent assigning of read only CSS Rules, ex. length, parentRule
        try {
          elps.style[prop] = elStyle[prop];
        } catch (e) {
          Util.log(['Tried to assign readonly property ', prop, 'Error:', e]);
        }
      });

      if(isImage) {
        elps.src = Util.parseBackgroundImage(content)[0].args[0];
      } else {
        elps.innerHTML = content;
      }
      return elps;
    }

    function indexedProperty(property) {
      return (isNaN(window.parseInt(property, 10)));
    }

    function injectPseudoElements(el, stack) {
      const before = getPseudoElement(el, ':before');
      const after = getPseudoElement(el, ':after');
      if(!before && !after) {
        return;
      }

      if(before) {
        el.className += ` ${pseudoHide}-before`;
        el.parentNode.insertBefore(before, el);
        parseElement(before, stack, true);
        el.parentNode.removeChild(before);
        el.className = el.className.replace(`${pseudoHide}-before`, "").trim();
      }

      if (after) {
        el.className += ` ${pseudoHide}-after`;
        el.appendChild(after);
        parseElement(after, stack, true);
        el.removeChild(after);
        el.className = el.className.replace(`${pseudoHide}-after`, "").trim();
      }
    }

    function renderBackgroundRepeat(ctx, image, {left, top}, {left, top}) {
      const offsetX = Math.round(left + left);
      const offsetY = Math.round(top + top);

      ctx.createPattern(image);
      ctx.translate(offsetX, offsetY);
      ctx.fill();
      ctx.translate(-offsetX, -offsetY);
    }

    function backgroundRepeatShape(ctx, image, backgroundPosition, bounds, left, top, width, height) {
      const args = [];
      args.push(["line", Math.round(left), Math.round(top)]);
      args.push(["line", Math.round(left + width), Math.round(top)]);
      args.push(["line", Math.round(left + width), Math.round(height + top)]);
      args.push(["line", Math.round(left), Math.round(height + top)]);
      createShape(ctx, args);
      ctx.save();
      ctx.clip();
      renderBackgroundRepeat(ctx, image, backgroundPosition, bounds);
      ctx.restore();
    }

    function renderBackgroundColor(ctx, {left, top, width, height}, bgcolor) {
      renderRect(
        ctx,
        left,
        top,
        width,
        height,
        bgcolor
        );
    }

    function renderBackgroundRepeating(el, bounds, ctx, image, imageIndex) {
      const backgroundSize = Util.BackgroundSize(el, bounds, image, imageIndex);
      const backgroundPosition = Util.BackgroundPosition(el, bounds, image, imageIndex, backgroundSize);
      let backgroundRepeat = getCSS(el, "backgroundRepeat").split(",").map(Util.trimText);

      image = resizeImage(image, backgroundSize);

      backgroundRepeat = backgroundRepeat[imageIndex] || backgroundRepeat[0];

      switch (backgroundRepeat) {
        case "repeat-x":
          backgroundRepeatShape(ctx, image, backgroundPosition, bounds,
            bounds.left, bounds.top + backgroundPosition.top, 99999, image.height);
          break;

        case "repeat-y":
          backgroundRepeatShape(ctx, image, backgroundPosition, bounds,
            bounds.left + backgroundPosition.left, bounds.top, image.width, 99999);
          break;

        case "no-repeat":
          backgroundRepeatShape(ctx, image, backgroundPosition, bounds,
            bounds.left + backgroundPosition.left, bounds.top + backgroundPosition.top, image.width, image.height);
          break;

        default:
          renderBackgroundRepeat(ctx, image, backgroundPosition, {
            top: bounds.top,
            left: bounds.left,
            width: image.width,
            height: image.height
          });
          break;
      }
    }

    function renderBackgroundImage(element, bounds, ctx) {
      let backgroundImage = getCSS(element, "backgroundImage");
      const backgroundImages = Util.parseBackgroundImage(backgroundImage);
      let image;
      let imageIndex = backgroundImages.length;

      while(imageIndex--) {
        backgroundImage = backgroundImages[imageIndex];

        if (!backgroundImage.args || backgroundImage.args.length === 0) {
          continue;
        }

        const key = backgroundImage.method === 'url' ?
        backgroundImage.args[0] :
        backgroundImage.value;

        image = loadImage(key);

        // TODO add support for background-origin
        if (image) {
          renderBackgroundRepeating(element, bounds, ctx, image, imageIndex);
        } else {
          Util.log("html2canvas: Error loading background:", backgroundImage);
        }
      }
    }

    function resizeImage(image, {width, height}) {
      if(image.width === width && image.height === height) {
        return image;
      }

      let ctx;
      const canvas = doc.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      ctx = canvas.getContext("2d");
      drawImage(ctx, image, 0, 0, image.width, image.height, 0, 0, width, height );
      return canvas;
    }

    function setOpacity(ctx, element, parentStack) {
      return ctx.setVariable("globalAlpha", getCSS(element, "opacity") * ((parentStack) ? parentStack.opacity : 1));
    }

    function removePx(str) {
      return str.replace("px", "");
    }

    const transformRegExp = /(matrix)\((.+)\)/;

    function getTransform(element, parentStack) {
      const transform = getCSS(element, "transform") || getCSS(element, "-webkit-transform") || getCSS(element, "-moz-transform") || getCSS(element, "-ms-transform") || getCSS(element, "-o-transform");
      let transformOrigin = getCSS(element, "transform-origin") || getCSS(element, "-webkit-transform-origin") || getCSS(element, "-moz-transform-origin") || getCSS(element, "-ms-transform-origin") || getCSS(element, "-o-transform-origin") || "0px 0px";

      transformOrigin = transformOrigin.split(" ").map(removePx).map(Util.asFloat);

      let matrix;
      if (transform && transform !== "none") {
        const match = transform.match(transformRegExp);
        if (match) {
          switch(match[1]) {
            case "matrix":
              matrix = match[2].split(",").map(Util.trimText).map(Util.asFloat);
              break;
          }
        }
      }

      return {
        origin: transformOrigin,
        matrix
      };
    }

    function createStack(element, parentStack, bounds, transform) {
      const ctx = h2cRenderContext((!parentStack) ? documentWidth() : bounds.width , (!parentStack) ? documentHeight() : bounds.height);

      const stack = {
        ctx,
        opacity: setOpacity(ctx, element, parentStack),
        cssPosition: getCSS(element, "position"),
        borders: getBorderData(element),
        transform,
        clip: (parentStack && parentStack.clip) ? Util.Extend( {}, parentStack.clip ) : null
      };

      setZ(element, stack, parentStack);

      // TODO correct overflow for absolute content residing under a static position
      if (options.useOverflow === true && /(hidden|scroll|auto)/.test(getCSS(element, "overflow")) === true && /(BODY)/i.test(element.nodeName) === false){
        stack.clip = (stack.clip) ? clipBounds(stack.clip, bounds) : bounds;
      }

      return stack;
    }

    function getBackgroundBounds(borders, {left, top, width, height}, clip) {
      let backgroundBounds = {
        left: left + borders[3].width,
        top: top + borders[0].width,
        width: width - (borders[1].width + borders[3].width),
        height: height - (borders[0].width + borders[2].width)
      };

      if (clip) {
        backgroundBounds = clipBounds(backgroundBounds, clip);
      }

      return backgroundBounds;
    }

    function getBounds(element, {matrix, origin}) {
      const bounds = (matrix) ? Util.OffsetBounds(element) : Util.Bounds(element);
      origin[0] += bounds.left;
      origin[1] += bounds.top;
      return bounds;
    }

    function renderElement(element, parentStack, pseudoElement, ignoreBackground) {
      const transform = getTransform(element, parentStack);
      const bounds = getBounds(element, transform);
      let image;
      const stack = createStack(element, parentStack, bounds, transform);
      const borders = stack.borders;
      const ctx = stack.ctx;
      const backgroundBounds = getBackgroundBounds(borders, bounds, stack.clip);
      const borderData = parseBorders(element, bounds, borders);
      const backgroundColor = (ignoreElementsRegExp.test(element.nodeName)) ? "#efefef" : getCSS(element, "backgroundColor");


      createShape(ctx, borderData.clip);

      ctx.save();
      ctx.clip();

      if (backgroundBounds.height > 0 && backgroundBounds.width > 0 && !ignoreBackground) {
        renderBackgroundColor(ctx, bounds, backgroundColor);
        renderBackgroundImage(element, backgroundBounds, ctx);
      } else if (ignoreBackground) {
        stack.backgroundColor =  backgroundColor;
      }

      ctx.restore();

      borderData.borders.forEach(({args, color}) => {
        renderBorders(ctx, args, color);
      });

      if (!pseudoElement) {
        injectPseudoElements(element, stack);
      }

      switch(element.nodeName){
        case "IMG":
          if ((image = loadImage(element.getAttribute('src')))) {
            renderImage(ctx, element, image, bounds, borders);
          } else {
            Util.log(`html2canvas: Error loading <img>:${element.getAttribute('src')}`);
          }
          break;
        case "INPUT":
          // TODO add all relevant type's, i.e. HTML5 new stuff
          // todo add support for placeholder attribute for browsers which support it
          if (/^(text|url|email|submit|button|reset)$/.test(element.type) && (element.value || element.placeholder || "").length > 0){
            renderFormValue(element, bounds, stack);
          }
          break;
        case "TEXTAREA":
          if ((element.value || element.placeholder || "").length > 0){
            renderFormValue(element, bounds, stack);
          }
          break;
        case "SELECT":
          if ((element.options||element.placeholder || "").length > 0){
            renderFormValue(element, bounds, stack);
          }
          break;
        case "LI":
          renderListItem(element, stack, backgroundBounds);
          break;
        case "CANVAS":
          renderImage(ctx, element, element, bounds, borders);
          break;
      }

      return stack;
    }

    function isElementVisible(element) {
      return (getCSS(element, 'display') !== "none" && getCSS(element, 'visibility') !== "hidden" && !element.hasAttribute("data-html2canvas-ignore"));
    }

    function parseElement (element, stack, pseudoElement) {
      if (isElementVisible(element)) {
        stack = renderElement(element, stack, pseudoElement, false) || stack;
        if (!ignoreElementsRegExp.test(element.nodeName)) {
          parseChildren(element, stack, pseudoElement);
        }
      }
    }

    function parseChildren(element, stack, pseudoElement) {
      Util.Children(element).forEach(node => {
        if (node.nodeType === node.ELEMENT_NODE) {
          parseElement(node, stack, pseudoElement);
        } else if (node.nodeType === node.TEXT_NODE) {
          renderText(element, node, stack);
        }
      });
    }

    function init() {
      let background = getCSS(document.documentElement, "backgroundColor");
      const transparentBackground = (Util.isTransparent(background) && element === document.body);
      const stack = renderElement(element, null, false, transparentBackground);
      parseChildren(element, stack);

      if (transparentBackground) {
        background = stack.backgroundColor;
      }

      body.removeChild(hidePseudoElements);
      return {
        backgroundColor: background,
        stack
      };
    }

    return init();
  };

  function h2czContext(zindex) {
    return {
      zindex,
      children: []
    };
  }

  _html2canvas.Preload = options => {
    const images = {
      numLoaded: 0,   // also failed are counted here
      numFailed: 0,
      numTotal: 0,
      cleanupDone: false
    };

    let pageOrigin;
    const Util = _html2canvas.Util;
    let methods;
    let i;
    let count = 0;
    const element = options.elements[0] || document.body;
    const doc = element.ownerDocument;

    const // Fetch images of the present element only
    domImages = element.getElementsByTagName('img');

    const imgLen = domImages.length;
    const link = doc.createElement("a");

    const supportCORS = (({crossOrigin}) => {
      return crossOrigin !== undefined;
    })(new Image());

    let timeoutTimer;

    link.href = window.location.href;
    pageOrigin  = link.protocol + link.host;

    function isSameOrigin(url){
      link.href = url;
      link.href = link.href; // YES, BELIEVE IT OR NOT, that is required for IE9 - http://jsfiddle.net/niklasvh/2e48b/
      const origin = link.protocol + link.host;
      return (origin === pageOrigin);
    }

    function start(){
      Util.log(`html2canvas: start: images: ${images.numLoaded} / ${images.numTotal} (failed: ${images.numFailed})`);
      if (!images.firstRun && images.numLoaded >= images.numTotal){
        Util.log(`Finished loading images: # ${images.numTotal} (failed: ${images.numFailed})`);

        if (typeof options.complete === "function"){
          options.complete(images);
        }

      }
    }

    // TODO modify proxy to serve images with CORS enabled, where available
    function proxyGetImage(url, img, imageObj){
      let callback_name;
      let scriptUrl = options.proxy;
      let script;

      link.href = url;
      url = link.href; // work around for pages with base href="" set - WARNING: this may change the url

      callback_name = `html2canvas_${count++}`;
      imageObj.callbackname = callback_name;

      if (scriptUrl.includes("?")) {
        scriptUrl += "&";
      } else {
        scriptUrl += "?";
      }
      scriptUrl += `url=${encodeURIComponent(url)}&callback=${callback_name}`;
      script = doc.createElement("script");

      window[callback_name] = a => {
        if (a.substring(0,6) === "error:"){
          imageObj.succeeded = false;
          images.numLoaded++;
          images.numFailed++;
          start();
        } else {
          setImageLoadHandlers(img, imageObj);
          img.src = a;
        }
        window[callback_name] = undefined; // to work with IE<9  // NOTE: that the undefined callback property-name still exists on the window object (for IE<9)
        try {
          delete window[callback_name];  // for all browser that support this
        } catch(ex) {}
        script.parentNode.removeChild(script);
        script = null;
        delete imageObj.script;
        delete imageObj.callbackname;
      };

      script.setAttribute("type", "text/javascript");
      script.setAttribute("src", scriptUrl);
      imageObj.script = script;
      window.document.body.appendChild(script);
    }

    function loadPseudoElement(element, type) {
      const style = window.getComputedStyle(element, type);
      const content = style.content;
      if (content.substr(0, 3) === 'url') {
        methods.loadImage(_html2canvas.Util.parseBackgroundImage(content)[0].args[0]);
      }
      loadBackgroundImages(style.backgroundImage, element);
    }

    function loadPseudoElementImages(element) {
      loadPseudoElement(element, ":before");
      loadPseudoElement(element, ":after");
    }

    function loadGradientImage(backgroundImage, bounds) {
      const img = _html2canvas.Generate.Gradient(backgroundImage, bounds);

      if (img !== undefined){
        images[backgroundImage] = {
          img,
          succeeded: true
        };
        images.numTotal++;
        images.numLoaded++;
        start();
      }
    }

    function invalidBackgrounds(background_image) {
      return (background_image && background_image.method && background_image.args && background_image.args.length > 0 );
    }

    function loadBackgroundImages(background_image, el) {
      let bounds;

      _html2canvas.Util.parseBackgroundImage(background_image).filter(invalidBackgrounds).forEach(({method, args, value}) => {
        if (method === 'url') {
          methods.loadImage(args[0]);
        } else if(method.match(/\-?gradient$/)) {
          if(bounds === undefined) {
            bounds = _html2canvas.Util.Bounds(el);
          }
          loadGradientImage(value, bounds);
        }
      });
    }

    function getImages (el) {
      let elNodeType = false;

      // Firefox fails with permission denied on pages with iframes
      try {
        Util.Children(el).forEach(getImages);
      }
      catch( e ) {}

      try {
        elNodeType = el.nodeType;
      } catch (ex) {
        elNodeType = false;
        Util.log(`html2canvas: failed to access some element's nodeType - Exception: ${ex.message}`);
      }

      if (elNodeType === 1 || elNodeType === undefined) {
        loadPseudoElementImages(el);
        try {
          loadBackgroundImages(Util.getCSS(el, 'backgroundImage'), el);
        } catch(e) {
          Util.log(`html2canvas: failed to get background-image - Exception: ${e.message}`);
        }
        loadBackgroundImages(el);
      }
    }

    function setImageLoadHandlers(img, imageObj) {
      img.onload = () => {
        if ( imageObj.timer !== undefined ) {
          // CORS succeeded
          window.clearTimeout( imageObj.timer );
        }

        images.numLoaded++;
        imageObj.succeeded = true;
        img.onerror = img.onload = null;
        start();
      };
      img.onerror = () => {
        if (img.crossOrigin === "anonymous") {
          // CORS failed
          window.clearTimeout( imageObj.timer );

          // let's try with proxy instead
          if ( options.proxy ) {
            const src = img.src;
            img = new Image();
            imageObj.img = img;
            img.src = src;

            proxyGetImage( img.src, img, imageObj );
            return;
          }
        }

        images.numLoaded++;
        images.numFailed++;
        imageObj.succeeded = false;
        img.onerror = img.onload = null;
        start();
      };
    }

    methods = {
      loadImage(src) {
        let img;
        let imageObj;
        if ( src && images[src] === undefined ) {
          img = new Image();
          if ( src.match(/data:image\/.*;base64,/i) ) {
            img.src = src.replace(/url\(['"]{0,}|['"]{0,}\)$/ig, '');
            imageObj = images[src] = {
              img
            };
            images.numTotal++;
            setImageLoadHandlers(img, imageObj);
          } else if ( isSameOrigin( src ) || options.allowTaint ===  true ) {
            imageObj = images[src] = {
              img
            };
            images.numTotal++;
            setImageLoadHandlers(img, imageObj);
            img.src = src;
          } else if ( supportCORS && !options.allowTaint && options.useCORS ) {
            // attempt to load with CORS

            img.crossOrigin = "anonymous";
            imageObj = images[src] = {
              img
            };
            images.numTotal++;
            setImageLoadHandlers(img, imageObj);
            img.src = src;
          } else if ( options.proxy ) {
            imageObj = images[src] = {
              img
            };
            images.numTotal++;
            proxyGetImage( src, img, imageObj );
          }
        }
      },
      cleanupDOM(cause) {
        let img;
        let src;
        if (!images.cleanupDone) {
          if (cause && typeof cause === "string") {
            Util.log(`html2canvas: Cleanup because: ${cause}`);
          } else {
            Util.log(`html2canvas: Cleanup after timeout: ${options.timeout} ms.`);
          }

          for (src in images) {
            if (images.hasOwnProperty(src)) {
              img = images[src];
              if (typeof img === "object" && img.callbackname && img.succeeded === undefined) {
                // cancel proxy image request
                window[img.callbackname] = undefined; // to work with IE<9  // NOTE: that the undefined callback property-name still exists on the window object (for IE<9)
                try {
                  delete window[img.callbackname];  // for all browser that support this
                } catch(ex) {}
                if (img.script && img.script.parentNode) {
                  img.script.setAttribute("src", "about:blank");  // try to cancel running request
                  img.script.parentNode.removeChild(img.script);
                }
                images.numLoaded++;
                images.numFailed++;
                Util.log(`html2canvas: Cleaned up failed img: '${src}' Steps: ${images.numLoaded} / ${images.numTotal}`);
              }
            }
          }

          // cancel any pending requests
          if(window.stop !== undefined) {
            window.stop();
          } else if(document.execCommand !== undefined) {
            document.execCommand("Stop", false);
          }
          if (document.close !== undefined) {
            document.close();
          }
          images.cleanupDone = true;
          if (!(cause && typeof cause === "string")) {
            start();
          }
        }
      },

      renderingDone() {
        if (timeoutTimer) {
          window.clearTimeout(timeoutTimer);
        }
      }
    };

    if (options.timeout > 0) {
      timeoutTimer = window.setTimeout(methods.cleanupDOM, options.timeout);
    }

    Util.log('html2canvas: Preload starts: finding background-images');
    images.firstRun = true;

    getImages(element);

    Util.log('html2canvas: Preload: Finding images');
    // load <img> images
    for (i = 0; i < imgLen; i+=1){
      methods.loadImage( domImages[i].getAttribute( "src" ) );
    }

    images.firstRun = false;
    Util.log('html2canvas: Preload: Done.');
    if (images.numTotal === images.numLoaded) {
      start();
    }

    return methods;
  };

  _html2canvas.Renderer = (parseQueue, options) => {

    // http://www.w3.org/TR/CSS21/zindex.html
    function createRenderQueue(parseQueue) {
      const queue = [];
      let rootContext;

      rootContext = (function buildStackingContext(rootNode) {
        const rootContext = {};
        function insert(context, node, specialParent) {
          const zi = (node.zIndex.zindex === 'auto') ? 0 : Number(node.zIndex.zindex); // where children without z-index should be pushed into

          let // the stacking context for children
          contextForChildren = context;

          const isPositioned = node.zIndex.isPositioned;
          const isFloated = node.zIndex.isFloated;
          const stub = {node};
          let childrenDest = specialParent;

          if (node.zIndex.ownStacking) {
            // '!' comes before numbers in sorted array
            contextForChildren = stub.context = { '!': [{node, children: []}]};
            childrenDest = undefined;
          } else if (isPositioned || isFloated) {
            childrenDest = stub.children = [];
          }

          if (zi === 0 && specialParent) {
            specialParent.push(stub);
          } else {
            if (!context[zi]) { context[zi] = []; }
            context[zi].push(stub);
          }

          node.zIndex.children.forEach(childNode => {
            insert(contextForChildren, childNode, childrenDest);
          });
        }
        insert(rootContext, rootNode);
        return rootContext;
      })(parseQueue);

      function sortZ(context) {
        Object.keys(context).sort().forEach(zi => {
          const nonPositioned = [];
          const floated = [];
          const positioned = [];
          const list = [];

          // positioned after static
          context[zi].forEach(v => {
            if (v.node.zIndex.isPositioned || v.node.zIndex.opacity < 1) {
              // http://www.w3.org/TR/css3-color/#transparency
              // non-positioned element with opactiy < 1 should be stacked as if it were a positioned element with ‘z-index: 0’ and ‘opacity: 1’.
              positioned.push(v);
            } else if (v.node.zIndex.isFloated) {
              floated.push(v);
            } else {
              nonPositioned.push(v);
            }
          });

          (function walk(arr) {
            arr.forEach(v => {
              list.push(v);
              if (v.children) { walk(v.children); }
            });
          })(nonPositioned.concat(floated, positioned));

          list.forEach(v => {
            if (v.context) {
              sortZ(v.context);
            } else {
              queue.push(v.node);
            }
          });
        });
      }

      sortZ(rootContext);

      return queue;
    }

    function getRenderer(rendererName) {
      let renderer;

      if (typeof options.renderer === "string" && _html2canvas.Renderer[rendererName] !== undefined) {
        renderer = _html2canvas.Renderer[rendererName](options);
      } else if (typeof rendererName === "function") {
        renderer = rendererName(options);
      } else {
        throw new Error("Unknown renderer");
      }

      if ( typeof renderer !== "function" ) {
        throw new Error("Invalid renderer defined");
      }
      return renderer;
    }

    return getRenderer(options.renderer)(parseQueue, options, document, createRenderQueue(parseQueue.stack), _html2canvas);
  };

  _html2canvas.Util.Support = ({svgRendering}, doc) => {

    function supportSVGRendering() {
      const img = new Image();
      const canvas = doc.createElement("canvas");
      const ctx = (canvas.getContext === undefined) ? false : canvas.getContext("2d");
      if (ctx === false) {
        return false;
      }
      canvas.width = canvas.height = 10;
      img.src = [
      "data:image/svg+xml,",
      "<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10'>",
      "<foreignObject width='10' height='10'>",
      "<div xmlns='http://www.w3.org/1999/xhtml' style='width:10;height:10;'>",
      "sup",
      "</div>",
      "</foreignObject>",
      "</svg>"
      ].join("");
      try {
        ctx.drawImage(img, 0, 0);
        canvas.toDataURL();
      } catch(e) {
        return false;
      }
      _html2canvas.Util.log('html2canvas: Parse: SVG powered rendering available');
      return true;
    }

    // Test whether we can use ranges to measure bounding boxes
    // Opera doesn't provide valid bounds.height/bottom even though it supports the method.

    function supportRangeBounds() {
      let r;
      let testElement;
      let rangeBounds;
      let rangeHeight;
      let support = false;

      if (doc.createRange) {
        r = doc.createRange();
        if (r.getBoundingClientRect) {
          testElement = doc.createElement('boundtest');
          testElement.style.height = "123px";
          testElement.style.display = "block";
          doc.body.appendChild(testElement);

          r.selectNode(testElement);
          rangeBounds = r.getBoundingClientRect();
          rangeHeight = rangeBounds.height;

          if (rangeHeight === 123) {
            support = true;
          }
          doc.body.removeChild(testElement);
        }
      }

      return support;
    }

    return {
      rangeBounds: supportRangeBounds(),
      svgRendering: svgRendering && supportSVGRendering()
    };
  };
  window.html2canvas = (elements, opts) => {
    elements = (elements.length) ? elements : [elements];
    let queue;
    let canvas;

    let options = {
      // general
      logging: false,
      elements,
      background: "#fff",

      // preload options
      proxy: null,
      timeout: 0,    // no timeout
      useCORS: false, // try to load images as CORS (where available), before falling back to proxy
      allowTaint: false, // whether to allow images to taint the canvas, won't need proxy if set to true

      // parse options
      svgRendering: false, // use svg powered rendering where available (FF11+)
      ignoreElements: "IFRAME|OBJECT|PARAM",
      useOverflow: true,
      letterRendering: false,
      chinese: false,

      // render options

      width: null,
      height: null,
      taintTest: true, // do a taint test with all images before applying to canvas
      renderer: "Canvas"
    };

    options = _html2canvas.Util.Extend(opts, options);

    _html2canvas.logging = options.logging;
    options.complete = images => {

      if (typeof options.onpreloaded === "function") {
        if ( options.onpreloaded( images ) === false ) {
          return;
        }
      }
      queue = _html2canvas.Parse( images, options );

      if (typeof options.onparsed === "function") {
        if ( options.onparsed( queue ) === false ) {
          return;
        }
      }

      canvas = _html2canvas.Renderer( queue, options );

      if (typeof options.onrendered === "function") {
        options.onrendered( canvas );
      }


    };

    // for pages without images, we still want this to be async, i.e. return methods before executing
    window.setTimeout( () => {
      _html2canvas.Preload( options );
    }, 0 );

    return {
      render(queue, opts) {
        return _html2canvas.Renderer( queue, _html2canvas.Util.Extend(opts, options) );
      },
      parse(images, opts) {
        return _html2canvas.Parse( images, _html2canvas.Util.Extend(opts, options) );
      },
      preload(opts) {
        return _html2canvas.Preload( _html2canvas.Util.Extend(opts, options) );
      },
      log: _html2canvas.Util.log
    };
  };

  window.html2canvas.log = _html2canvas.Util.log; // for renderers
  window.html2canvas.Renderer = {
    Canvas: undefined // We are assuming this will be used
  };
  _html2canvas.Renderer.Canvas = (options = {}) => {
    const doc = document;
    const safeImages = [];
    let testCanvas = document.createElement("canvas");
    let testctx = testCanvas.getContext("2d");
    const Util = _html2canvas.Util;
    let canvas = options.canvas || doc.createElement('canvas');

    function createShape(ctx, args) {
      ctx.beginPath();
      args.forEach(arg => {
        ctx[arg.name](...arg['arguments']);
      });
      ctx.closePath();
    }

    function safeImage(item) {
      if (!safeImages.includes(item['arguments'][0].src)) {
        testctx.drawImage(item['arguments'][0], 0, 0);
        try {
          testctx.getImageData(0, 0, 1, 1);
        } catch(e) {
          testCanvas = doc.createElement("canvas");
          testctx = testCanvas.getContext("2d");
          return false;
        }
        safeImages.push(item['arguments'][0].src);
      }
      return true;
    }

    function renderItem(ctx, item) {
      switch(item.type){
        case "variable":
          ctx[item.name] = item['arguments'];
          break;
        case "function":
          switch(item.name) {
            case "createPattern":
              if (item['arguments'][0].width > 0 && item['arguments'][0].height > 0) {
                try {
                  ctx.fillStyle = ctx.createPattern(item['arguments'][0], "repeat");
                }
                catch(e) {
                  Util.log("html2canvas: Renderer: Error creating pattern", e.message);
                }
              }
              break;
            case "drawShape":
              createShape(ctx, item['arguments']);
              break;
            case "drawImage":
              if (item['arguments'][8] > 0 && item['arguments'][7] > 0) {
                if (!options.taintTest || (options.taintTest && safeImage(item))) {
                  ctx.drawImage(...item['arguments']);
                }
              }
              break;
            default:
              ctx[item.name](...item['arguments']);
          }
          break;
      }
    }

    return (
      {stack, backgroundColor},
      {width, height, background, elements},
      document,
      queue,
      _html2canvas
    ) => {
      let ctx = canvas.getContext("2d");
      let newCanvas;
      let bounds;
      let fstyle;
      const zStack = stack;

      canvas.width = canvas.style.width =  width || zStack.ctx.width;
      canvas.height = canvas.style.height = height || zStack.ctx.height;

      fstyle = ctx.fillStyle;
      ctx.fillStyle = (Util.isTransparent(zStack.backgroundColor) && background !== undefined) ? background : backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = fstyle;

      queue.forEach(storageContext => {
        // set common settings for canvas
        ctx.textBaseline = "bottom";
        ctx.save();

        if (storageContext.transform.matrix) {
          ctx.translate(storageContext.transform.origin[0], storageContext.transform.origin[1]);
          ctx.transform(...storageContext.transform.matrix);
          ctx.translate(-storageContext.transform.origin[0], -storageContext.transform.origin[1]);
        }

        if (storageContext.clip){
          ctx.beginPath();
          ctx.rect(storageContext.clip.left, storageContext.clip.top, storageContext.clip.width, storageContext.clip.height);
          ctx.clip();
        }

        if (storageContext.ctx.storage) {
          storageContext.ctx.storage.forEach(item => {
            renderItem(ctx, item);
          });
        }

        ctx.restore();
      });

      Util.log("html2canvas: Renderer: Canvas renderer done - returning canvas obj");

      if (elements.length === 1) {
        if (typeof elements[0] === "object" && elements[0].nodeName !== "BODY") {
          // crop image to the bounds of selected (single) element
          bounds = _html2canvas.Util.Bounds(elements[0]);
          newCanvas = document.createElement('canvas');
          newCanvas.width = Math.ceil(bounds.width);
          newCanvas.height = Math.ceil(bounds.height);
          ctx = newCanvas.getContext("2d");

          ctx.drawImage(canvas, bounds.left, bounds.top, bounds.width, bounds.height, 0, 0, bounds.width, bounds.height);
          canvas = null;
          return newCanvas;
        }
      }

      return canvas;
    };
  };
})(window, document);