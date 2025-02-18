/*jshint eqnull:true*/
(root => {
  const GLOBAL_KEY = "Random";

  const imul = (typeof Math.imul !== "function" || Math.imul(0xffffffff, 5) !== -5 ?
    (a, b) => {
      const ah = (a >>> 16) & 0xffff;
      const al = a & 0xffff;
      const bh = (b >>> 16) & 0xffff;
      const bl = b & 0xffff;
      // the shift by 0 fixes the sign on the high part
      // the final |0 converts the unsigned value into a signed value
      return (al * bl) + (((ah * bl + al * bh) << 16) >>> 0) | 0;
    } :
    Math.imul);

  const stringRepeat = (typeof String.prototype.repeat === "function" && "x".repeat(3) === "xxx" ?
    (x, y) => {
      return x.repeat(y);
    } : (pattern, count) => {
      let result = "";
      while (count > 0) {
        if (count & 1) {
          result += pattern;
        }
        count >>= 1;
        pattern += pattern;
      }
      return result;
    });

  class Random {
    constructor(engine) {
      if (!(this instanceof Random)) {
        return new Random(engine);
      }

      if (engine == null) {
        engine = Random.engines.nativeMath;
      } else if (typeof engine !== "function") {
        throw new TypeError(`Expected engine to be a function, got ${typeof engine}`);
      }
      this.engine = engine;
    }

    static noConflict() {
      root[GLOBAL_KEY] = oldGlobal;
      return this;
    }
  }

  const proto = Random.prototype;

  Random.engines = {
    nativeMath() {
      return (Math.random() * 0x100000000) | 0;
    },
    mt19937: (Int32Array => {
      // http://en.wikipedia.org/wiki/Mersenne_twister
      function refreshData(data) {
        let k = 0;
        let tmp = 0;
        for (;
          (k | 0) < 227; k = (k + 1) | 0) {
          tmp = (data[k] & 0x80000000) | (data[(k + 1) | 0] & 0x7fffffff);
          data[k] = data[(k + 397) | 0] ^ (tmp >>> 1) ^ ((tmp & 0x1) ? 0x9908b0df : 0);
        }

        for (;
          (k | 0) < 623; k = (k + 1) | 0) {
          tmp = (data[k] & 0x80000000) | (data[(k + 1) | 0] & 0x7fffffff);
          data[k] = data[(k - 227) | 0] ^ (tmp >>> 1) ^ ((tmp & 0x1) ? 0x9908b0df : 0);
        }

        tmp = (data[623] & 0x80000000) | (data[0] & 0x7fffffff);
        data[623] = data[396] ^ (tmp >>> 1) ^ ((tmp & 0x1) ? 0x9908b0df : 0);
      }

      function temper(value) {
        value ^= value >>> 11;
        value ^= (value << 7) & 0x9d2c5680;
        value ^= (value << 15) & 0xefc60000;
        return value ^ (value >>> 18);
      }

      function seedWithArray(data, source) {
        let i = 1;
        let j = 0;
        const sourceLength = source.length;
        let k = Math.max(sourceLength, 624) | 0;
        let previous = data[0] | 0;
        for (;
          (k | 0) > 0; --k) {
          data[i] = previous = ((data[i] ^ imul((previous ^ (previous >>> 30)), 0x0019660d)) + (source[j] | 0) + (j | 0)) | 0;
          i = (i + 1) | 0;
          ++j;
          if ((i | 0) > 623) {
            data[0] = data[623];
            i = 1;
          }
          if (j >= sourceLength) {
            j = 0;
          }
        }
        for (k = 623;
          (k | 0) > 0; --k) {
          data[i] = previous = ((data[i] ^ imul((previous ^ (previous >>> 30)), 0x5d588b65)) - i) | 0;
          i = (i + 1) | 0;
          if ((i | 0) > 623) {
            data[0] = data[623];
            i = 1;
          }
        }
        data[0] = 0x80000000;
      }

      function mt19937() {
        const data = new Int32Array(624);
        let index = 0;
        let uses = 0;

        function next() {
          if ((index | 0) >= 624) {
            refreshData(data);
            index = 0;
          }

          const value = data[index];
          index = (index + 1) | 0;
          uses += 1;
          return temper(value) | 0;
        }
        next.getUseCount = () => {
          return uses;
        };
        next.discard = count => {
          uses += count;
          if ((index | 0) >= 624) {
            refreshData(data);
            index = 0;
          }
          while ((count - index) > 624) {
            count -= 624 - index;
            refreshData(data);
            index = 0;
          }
          index = (index + count) | 0;
          return next;
        };
        next.seed = initial => {
          let previous = 0;
          data[0] = previous = initial | 0;

          for (let i = 1; i < 624; i = (i + 1) | 0) {
            data[i] = previous = (imul((previous ^ (previous >>> 30)), 0x6c078965) + i) | 0;
          }
          index = 624;
          uses = 0;
          return next;
        };
        next.seedWithArray = source => {
          next.seed(0x012bd6aa);
          seedWithArray(data, source);
          return next;
        };
        next.autoSeed = () => {
          return next.seedWithArray(Random.generateEntropyArray());
        };
        return next;
      }

      return mt19937;
    })(typeof Int32Array === "function" ? Int32Array : Array),
    browserCrypto: typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function" && typeof Int32Array === "function" ? (() => {
      let data = null;
      let index = 128;

      return () => {
        if (index >= 128) {
          if (data === null) {
            data = new Int32Array(128);
          }
          crypto.getRandomValues(data);
          index = 0;
        }

        return data[index++] | 0;
      };
    })() : null
  };

  Random.generateEntropyArray = () => {
    const array = [];
    const engine = Random.engines.nativeMath;
    for (let i = 0; i < 16; ++i) {
      array[i] = engine() | 0;
    }
    array.push(new Date().getTime() | 0);
    return array;
  };

  function returnValue(value) {
    return () => {
      return value;
    };
  }

  // [-0x80000000, 0x7fffffff]
  Random.int32 = engine => {
    return engine() | 0;
  };
  proto.int32 = function () {
    return Random.int32(this.engine);
  };

  // [0, 0xffffffff]
  Random.uint32 = engine => {
    return engine() >>> 0;
  };
  proto.uint32 = function () {
    return Random.uint32(this.engine);
  };

  // [0, 0x1fffffffffffff]
  Random.uint53 = engine => {
    const high = engine() & 0x1fffff;
    const low = engine() >>> 0;
    return (high * 0x100000000) + low;
  };
  proto.uint53 = function () {
    return Random.uint53(this.engine);
  };

  // [0, 0x20000000000000]
  Random.uint53Full = engine => {
    while (true) {
      const high = engine() | 0;
      if (high & 0x200000) {
        if ((high & 0x3fffff) === 0x200000 && (engine() | 0) === 0) {
          return 0x20000000000000;
        }
      } else {
        const low = engine() >>> 0;
        return ((high & 0x1fffff) * 0x100000000) + low;
      }
    }
  };
  proto.uint53Full = function () {
    return Random.uint53Full(this.engine);
  };

  // [-0x20000000000000, 0x1fffffffffffff]
  Random.int53 = engine => {
    const high = engine() | 0;
    const low = engine() >>> 0;
    return ((high & 0x1fffff) * 0x100000000) + low + (high & 0x200000 ? -0x20000000000000 : 0);
  };
  proto.int53 = function () {
    return Random.int53(this.engine);
  };

  // [-0x20000000000000, 0x20000000000000]
  Random.int53Full = engine => {
    while (true) {
      const high = engine() | 0;
      if (high & 0x400000) {
        if ((high & 0x7fffff) === 0x400000 && (engine() | 0) === 0) {
          return 0x20000000000000;
        }
      } else {
        const low = engine() >>> 0;
        return ((high & 0x1fffff) * 0x100000000) + low + (high & 0x200000 ? -0x20000000000000 : 0);
      }
    }
  };
  proto.int53Full = function () {
    return Random.int53Full(this.engine);
  };

  function add(generate, addend) {
    if (addend === 0) {
      return generate;
    } else {
      return engine => {
        return generate(engine) + addend;
      };
    }
  }

  Random.integer = (() => {
    function isPowerOfTwoMinusOne(value) {
      return ((value + 1) & value) === 0;
    }

    function bitmask(masking) {
      return engine => {
        return engine() & masking;
      };
    }

    function downscaleToLoopCheckedRange(range) {
      const extendedRange = range + 1;
      const maximum = extendedRange * Math.floor(0x100000000 / extendedRange);
      return engine => {
        let value = 0;
        do {
          value = engine() >>> 0;
        } while (value >= maximum);
        return value % extendedRange;
      };
    }

    function downscaleToRange(range) {
      if (isPowerOfTwoMinusOne(range)) {
        return bitmask(range);
      } else {
        return downscaleToLoopCheckedRange(range);
      }
    }

    function isEvenlyDivisibleByMaxInt32(value) {
      return (value | 0) === 0;
    }

    function upscaleWithHighMasking(masking) {
      return engine => {
        const high = engine() & masking;
        const low = engine() >>> 0;
        return (high * 0x100000000) + low;
      };
    }

    function upscaleToLoopCheckedRange(extendedRange) {
      const maximum = extendedRange * Math.floor(0x20000000000000 / extendedRange);
      return engine => {
        let ret = 0;
        do {
          const high = engine() & 0x1fffff;
          const low = engine() >>> 0;
          ret = (high * 0x100000000) + low;
        } while (ret >= maximum);
        return ret % extendedRange;
      };
    }

    function upscaleWithinU53(range) {
      const extendedRange = range + 1;
      if (isEvenlyDivisibleByMaxInt32(extendedRange)) {
        const highRange = ((extendedRange / 0x100000000) | 0) - 1;
        if (isPowerOfTwoMinusOne(highRange)) {
          return upscaleWithHighMasking(highRange);
        }
      }
      return upscaleToLoopCheckedRange(extendedRange);
    }

    function upscaleWithinI53AndLoopCheck(min, max) {
      return engine => {
        let ret = 0;
        do {
          const high = engine() | 0;
          const low = engine() >>> 0;
          ret = ((high & 0x1fffff) * 0x100000000) + low + (high & 0x200000 ? -0x20000000000000 : 0);
        } while (ret < min || ret > max);
        return ret;
      };
    }

    return (min, max) => {
      min = Math.floor(min);
      max = Math.floor(max);
      if (min < -0x20000000000000 || !isFinite(min)) {
        throw new RangeError(`Expected min to be at least ${-0x20000000000000}`);
      } else if (max > 0x20000000000000 || !isFinite(max)) {
        throw new RangeError(`Expected max to be at most ${0x20000000000000}`);
      }

      const range = max - min;
      if (range <= 0 || !isFinite(range)) {
        return returnValue(min);
      } else if (range === 0xffffffff) {
        if (min === 0) {
          return Random.uint32;
        } else {
          return add(Random.int32, min + 0x80000000);
        }
      } else if (range < 0xffffffff) {
        return add(downscaleToRange(range), min);
      } else if (range === 0x1fffffffffffff) {
        return add(Random.uint53, min);
      } else if (range < 0x1fffffffffffff) {
        return add(upscaleWithinU53(range), min);
      } else if (max - 1 - min === 0x1fffffffffffff) {
        return add(Random.uint53Full, min);
      } else if (min === -0x20000000000000 && max === 0x20000000000000) {
        return Random.int53Full;
      } else if (min === -0x20000000000000 && max === 0x1fffffffffffff) {
        return Random.int53;
      } else if (min === -0x1fffffffffffff && max === 0x20000000000000) {
        return add(Random.int53, 1);
      } else if (max === 0x20000000000000) {
        return add(upscaleWithinI53AndLoopCheck(min - 1, max - 1), 1);
      } else {
        return upscaleWithinI53AndLoopCheck(min, max);
      }
    };
  })();
  proto.integer = function (min, max) {
    return Random.integer(min, max)(this.engine);
  };

  // [0, 1] (floating point)
  Random.realZeroToOneInclusive = engine => {
    return Random.uint53Full(engine) / 0x20000000000000;
  };
  proto.realZeroToOneInclusive = function () {
    return Random.realZeroToOneInclusive(this.engine);
  };

  // [0, 1) (floating point)
  Random.realZeroToOneExclusive = engine => {
    return Random.uint53(engine) / 0x20000000000000;
  };
  proto.realZeroToOneExclusive = function () {
    return Random.realZeroToOneExclusive(this.engine);
  };

  Random.real = (() => {
    function multiply(generate, multiplier) {
      if (multiplier === 1) {
        return generate;
      } else if (multiplier === 0) {
        return () => {
          return 0;
        };
      } else {
        return engine => {
          return generate(engine) * multiplier;
        };
      }
    }

    return (left, right, inclusive) => {
      if (!isFinite(left)) {
        throw new RangeError("Expected left to be a finite number");
      } else if (!isFinite(right)) {
        throw new RangeError("Expected right to be a finite number");
      }
      return add(
        multiply(
          inclusive ? Random.realZeroToOneInclusive : Random.realZeroToOneExclusive,
          right - left),
        left);
    };
  })();
  proto.real = function (min, max, inclusive) {
    return Random.real(min, max, inclusive)(this.engine);
  };

  Random.bool = (() => {
    function isLeastBitTrue(engine) {
      return (engine() & 1) === 1;
    }

    function lessThan(generate, value) {
      return engine => {
        return generate(engine) < value;
      };
    }

    function probability(percentage) {
      if (percentage <= 0) {
        return returnValue(false);
      } else if (percentage >= 1) {
        return returnValue(true);
      } else {
        const scaled = percentage * 0x100000000;
        if (scaled % 1 === 0) {
          return lessThan(Random.int32, (scaled - 0x80000000) | 0);
        } else {
          return lessThan(Random.uint53, Math.round(percentage * 0x20000000000000));
        }
      }
    }

    return (numerator, denominator) => {
      if (denominator == null) {
        if (numerator == null) {
          return isLeastBitTrue;
        }
        return probability(numerator);
      } else {
        if (numerator <= 0) {
          return returnValue(false);
        } else if (numerator >= denominator) {
          return returnValue(true);
        }
        return lessThan(Random.integer(0, denominator - 1), numerator);
      }
    };
  })();
  proto.bool = function (numerator, denominator) {
    return Random.bool(numerator, denominator)(this.engine);
  };

  function toInteger(value) {
    const number = +value;
    if (number < 0) {
      return Math.ceil(number);
    } else {
      return Math.floor(number);
    }
  }

  function convertSliceArgument(value, length) {
    if (value < 0) {
      return Math.max(value + length, 0);
    } else {
      return Math.min(value, length);
    }
  }
  Random.pick = (engine, array, begin, end) => {
    const length = array.length;
    const start = begin == null ? 0 : convertSliceArgument(toInteger(begin), length);
    const finish = end === void 0 ? length : convertSliceArgument(toInteger(end), length);
    if (start >= finish) {
      return void 0;
    }
    const distribution = Random.integer(start, finish - 1);
    return array[distribution(engine)];
  };
  proto.pick = function (array, begin, end) {
    return Random.pick(this.engine, array, begin, end);
  };

  function returnUndefined() {
    return void 0;
  }
  const slice = Array.prototype.slice;
  Random.picker = (array, begin, end) => {
    const clone = slice.call(array, begin, end);
    if (!clone.length) {
      return returnUndefined;
    }
    const distribution = Random.integer(0, clone.length - 1);
    return engine => {
      return clone[distribution(engine)];
    };
  };

  Random.shuffle = (engine, array, downTo) => {
    const length = array.length;
    if (length) {
      if (downTo == null) {
        downTo = 0;
      }
      for (let i = (length - 1) >>> 0; i > downTo; --i) {
        const distribution = Random.integer(0, i);
        const j = distribution(engine);
        if (i !== j) {
          const tmp = array[i];
          array[i] = array[j];
          array[j] = tmp;
        }
      }
    }
    return array;
  };
  proto.shuffle = function (array) {
    return Random.shuffle(this.engine, array);
  };

  Random.sample = (engine, population, sampleSize) => {
    if (sampleSize < 0 || sampleSize > population.length || !isFinite(sampleSize)) {
      throw new RangeError("Expected sampleSize to be within 0 and the length of the population");
    }

    if (sampleSize === 0) {
      return [];
    }

    const clone = slice.call(population);
    const length = clone.length;
    if (length === sampleSize) {
      return Random.shuffle(engine, clone, 0);
    }
    const tailLength = length - sampleSize;
    return Random.shuffle(engine, clone, tailLength - 1).slice(tailLength);
  };
  proto.sample = function (population, sampleSize) {
    return Random.sample(this.engine, population, sampleSize);
  };

  Random.die = sideCount => {
    return Random.integer(1, sideCount);
  };
  proto.die = function (sideCount) {
    return Random.die(sideCount)(this.engine);
  };

  Random.dice = (sideCount, dieCount) => {
    const distribution = Random.die(sideCount);
    return engine => {
      const result = [];
      result.length = dieCount;
      for (let i = 0; i < dieCount; ++i) {
        result[i] = distribution(engine);
      }
      return result;
    };
  };
  proto.dice = function (sideCount, dieCount) {
    return Random.dice(sideCount, dieCount)(this.engine);
  };

  // http://en.wikipedia.org/wiki/Universally_unique_identifier
  Random.uuid4 = (() => {
    function zeroPad(string, zeroCount) {
      return stringRepeat("0", zeroCount - string.length) + string;
    }

    return engine => {
      const a = engine() >>> 0;
      const b = engine() | 0;
      const c = engine() | 0;
      const d = engine() >>> 0;

      return `${zeroPad(a.toString(16), 8)}-${zeroPad((b & 0xffff).toString(16), 4)}-${zeroPad((((b >> 4) & 0x0fff) | 0x4000).toString(16), 4)}-${zeroPad(((c & 0x3fff) | 0x8000).toString(16), 4)}-${zeroPad(((c >> 4) & 0xffff).toString(16), 4)}${zeroPad(d.toString(16), 8)}`;
    };
  })();
  proto.uuid4 = function () {
    return Random.uuid4(this.engine);
  };

  Random.string = (() => {
    // has 2**x chars, for faster uniform distribution
    const DEFAULT_STRING_POOL = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-";

    return pool => {
      if (pool == null) {
        pool = DEFAULT_STRING_POOL;
      }

      const length = pool.length;
      if (!length) {
        throw new Error("Expected pool not to be an empty string");
      }

      const distribution = Random.integer(0, length - 1);
      return (engine, length) => {
        let result = "";
        for (let i = 0; i < length; ++i) {
          const j = distribution(engine);
          result += pool.charAt(j);
        }
        return result;
      };
    };
  })();
  proto.string = function (length, pool) {
    return Random.string(pool)(this.engine, length);
  };

  Random.hex = (() => {
    const LOWER_HEX_POOL = "0123456789abcdef";
    const lowerHex = Random.string(LOWER_HEX_POOL);
    const upperHex = Random.string(LOWER_HEX_POOL.toUpperCase());

    return upper => {
      if (upper) {
        return upperHex;
      } else {
        return lowerHex;
      }
    };
  })();
  proto.hex = function (length, upper) {
    return Random.hex(upper)(this.engine, length);
  };

  Random.date = (start, end) => {
    if (!(start instanceof Date)) {
      throw new TypeError(`Expected start to be a Date, got ${typeof start}`);
    } else if (!(end instanceof Date)) {
      throw new TypeError(`Expected end to be a Date, got ${typeof end}`);
    }
    const distribution = Random.integer(start.getTime(), end.getTime());
    return engine => {
      return new Date(distribution(engine));
    };
  };
  proto.date = function (start, end) {
    return Random.date(start, end)(this.engine);
  };

  if (typeof define === "function" && define.amd) {
    define(() => {
      return Random;
    });
  } else if (typeof module !== "undefined" && typeof require === "function") {
    module.exports = Random;
  } else {
    (() => {
      const oldGlobal = root[GLOBAL_KEY];
    })();
    root[GLOBAL_KEY] = Random;
  }
})(this);

window.random = new Random();
window.randomInt = (min, max) => { return random.integer(min,max); };
window.randomBool = () => { return random.bool() };
window.randomFloat = (min, max) => { return random.real(min,max); };