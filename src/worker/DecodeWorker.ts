export function getDecodeWorker(isBrowser: boolean, wasmUrl: string) {
  const postMessage = isBrowser ? 'postMessage' : 'parentPort.postMessage';
  return `${isBrowser ? '' : 'const { parentPort } = require(\'worker_threads\');'} 
(function(event) {
  const AUDIO_TYPE = 0;\t// 音频
  const VIDEO_TYPE = 1; // 视频
  const PRIVT_TYPE = 2; // 私有帧

  const PLAYM4_AUDIO_FRAME = 100; // 音频帧
  const PLAYM4_VIDEO_FRAME = 101; // 视频帧

  const HK_TRUE = 1; // true
  const PLAYM4_NEED_MORE_DATA = 31; // 需要更多数据才能解析
  const PLAYM4_SYS_NOT_SUPPORT = 16; \t// 不支持

  let Module;
  if (!Module) Module = (typeof Module !== 'undefined' ? Module : null) || {};
  let moduleOverrides = {};
  for (let key in Module) {
    if (Module.hasOwnProperty(key)) {
      moduleOverrides[key] = Module[key];
    }
  }
  const ENVIRONMENT_IS_WEB = typeof window === 'object';
  const ENVIRONMENT_IS_WORKER = typeof importScripts === 'function';
  const ENVIRONMENT_IS_NODE = typeof process === 'object' && typeof require === 'function' && !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_WORKER;
  if (ENVIRONMENT_IS_NODE) {
    if (!Module['print']) Module['print'] = console.log;
    if (!Module['printErr']) Module['printErr'] = console.warn;
    let nodeFS;
    let nodePath;
    Module['read'] = function shell_read(filename, binary) {
      if (!nodeFS) nodeFS = require('fs');
      if (!nodePath) nodePath = require('path');
      filename = nodePath['normalize'](filename);
      const ret = nodeFS['readFileSync'](filename);
      return binary ? ret : ret.toString();
    };
    Module['readBinary'] = function readBinary(filename) {
      let ret = Module['read'](filename, true);
      if (!ret.buffer) {
        ret = new Uint8Array(ret);
      }
      assert(ret.buffer);
      return ret;
    };
    Module['load'] = function load(f) {
      globalEval(read(f));
    };
    if (!Module['thisProgram']) {
      if (process['argv'].length > 1) {
        Module['thisProgram'] = process['argv'][1].replace(/\\\\/g, '/');
      } else {
        Module['thisProgram'] = 'unknown-program';
      }
    }
    Module['arguments'] = process['argv'].slice(2);
    if (typeof module !== 'undefined') {
      module['exports'] = Module;
    }
    process['on']('uncaughtException', function(ex) {
      if (!(ex instanceof ExitStatus)) {
        throw ex;
      }
    });
    Module['inspect'] = function() {
      return '[Emscripten Module object]';
    };
  } else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
    Module['read'] = function shell_read(url) {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', url, false);
      xhr.send(null);
      return xhr.responseText;
    };
    if (ENVIRONMENT_IS_WORKER) {
      Module['readBinary'] = function readBinary(url) {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', url, false);
        xhr.responseType = 'arraybuffer';
        xhr.send(null);
        return new Uint8Array(xhr.response);
      };
    }
    Module['readAsync'] = function readAsync(url, onload, onerror) {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.responseType = 'arraybuffer';
      xhr.onload = function xhr_onload() {
        if (xhr.status === 200 || xhr.status === 0 && xhr.response) {
          onload(xhr.response);
        } else {
          onerror();
        }
      };
      xhr.onerror = onerror;
      xhr.send(null);
    };
    if (typeof arguments !== 'undefined') {
      Module['arguments'] = arguments;
    }
    if (typeof console !== 'undefined') {
      if (!Module['print']) Module['print'] = function shell_print(x) {
        console.log(x);
      };
      if (!Module['printErr']) Module['printErr'] = function shell_printErr(x) {
        console.warn(x);
      };
    } else {
      const TRY_USE_DUMP = false;
      if (!Module['print']) Module['print'] = TRY_USE_DUMP && typeof dump !== 'undefined' ? function(x) {
        dump(x);
      } : function(x) {
      };
    }
    if (ENVIRONMENT_IS_WORKER) {
      Module['load'] = importScripts;
    }
    if (typeof Module['setWindowTitle'] === 'undefined') {
      Module['setWindowTitle'] = function(title) {
        document.title = title;
      };
    }
  } else {
    throw 'Unknown runtime environment. Where are we?';
  }

  function globalEval(x) {
    eval.call(null, x);
  }

  if (!Module['load'] && Module['read']) {
    Module['load'] = function load(f) {
      globalEval(Module['read'](f));
    };
  }
  if (!Module['print']) {
    Module['print'] = function() {
    };
  }
  if (!Module['printErr']) {
    Module['printErr'] = Module['print'];
  }
  if (!Module['arguments']) {
    Module['arguments'] = [];
  }
  if (!Module['thisProgram']) {
    Module['thisProgram'] = './this.program';
  }
  if (!Module['quit']) {
    Module['quit'] = function(status, toThrow) {
      throw toThrow;
    };
  }
  Module.print = Module['print'];
  Module.printErr = Module['printErr'];
  Module['preRun'] = [];
  Module['postRun'] = [];
  for (let key in moduleOverrides) {
    if (moduleOverrides.hasOwnProperty(key)) {
      Module[key] = moduleOverrides[key];
    }
  }
  moduleOverrides = undefined;
  const Runtime = {
    setTempRet0: function(value) {
      tempRet0 = value;
      return value;
    }, getTempRet0: function() {
      return tempRet0;
    }, stackSave: function() {
      return STACKTOP;
    }, stackRestore: function(stackTop) {
      STACKTOP = stackTop;
    }, getNativeTypeSize: function(type) {
      switch (type) {
        case 'i1':
        case 'i8':
          return 1;
        case 'i16':
          return 2;
        case 'i32':
          return 4;
        case 'i64':
          return 8;
        case 'float':
          return 4;
        case 'double':
          return 8;
        default: {
          if (type[type.length - 1] === '*') {
            return Runtime.QUANTUM_SIZE;
          } else if (type[0] === 'i') {
            const bits = parseInt(type.substr(1));
            assert(bits % 8 === 0);
            return bits / 8;
          } else {
            return 0;
          }
        }
      }
    }, getNativeFieldSize: function(type) {
      return Math.max(Runtime.getNativeTypeSize(type), Runtime.QUANTUM_SIZE);
    }, STACK_ALIGN: 16, prepVararg: function(ptr, type) {
      if (type === 'double' || type === 'i64') {
        if ((ptr & 7) !== 0) {
          assert((ptr & 7) === 4);
          ptr += 4;
        }
      } else {
        assert((ptr & 3) === 0);
      }
      return ptr;
    }, getAlignSize: function(type, size, vararg) {
      if (!vararg && (type === 'i64' || type === 'double')) return 8;
      if (!type) return Math.min(size, 8);
      return Math.min(size || (type ? Runtime.getNativeFieldSize(type) : 0), Runtime.QUANTUM_SIZE);
    }, dynCall: function(sig, ptr, args) {
      if (args && args.length) {
        return Module['dynCall_' + sig].apply(null, [ptr].concat(args));
      } else {
        return Module['dynCall_' + sig].call(null, ptr);
      }
    }, functionPointers: [], warnOnce: function(text) {
      if (!Runtime.warnOnce.shown) Runtime.warnOnce.shown = {};
      if (!Runtime.warnOnce.shown[text]) {
        Runtime.warnOnce.shown[text] = 1;
        Module.printErr(text);
      }
    }, funcWrappers: {}, getFuncWrapper: function(func, sig) {
      if (!func) return;
      assert(sig);
      if (!Runtime.funcWrappers[sig]) {
        Runtime.funcWrappers[sig] = {};
      }
      var sigCache = Runtime.funcWrappers[sig];
      if (!sigCache[func]) {
        if (sig.length === 1) {
          sigCache[func] = function dynCall_wrapper() {
            return Runtime.dynCall(sig, func);
          };
        } else if (sig.length === 2) {
          sigCache[func] = function dynCall_wrapper(arg) {
            return Runtime.dynCall(sig, func, [arg]);
          };
        } else {
          sigCache[func] = function dynCall_wrapper() {
            return Runtime.dynCall(sig, func, Array.prototype.slice.call(arguments));
          };
        }
      }
      return sigCache[func];
    }, getCompilerSetting: function(name) {
      throw 'You must build with -s RETAIN_COMPILER_SETTINGS=1 for Runtime.getCompilerSetting or emscripten_get_compiler_setting to work';
    }, stackAlloc: function(size) {
      var ret = STACKTOP;
      STACKTOP = STACKTOP + size | 0;
      STACKTOP = STACKTOP + 15 & -16;
      return ret;
    }, staticAlloc: function(size) {
      var ret = STATICTOP;
      STATICTOP = STATICTOP + size | 0;
      STATICTOP = STATICTOP + 15 & -16;
      return ret;
    }, dynamicAlloc: function(size) {
      var ret = HEAP32[DYNAMICTOP_PTR >> 2];
      var end = (ret + size + 15 | 0) & -16;
      HEAP32[DYNAMICTOP_PTR >> 2] = end;
      if (end >= TOTAL_MEMORY) {
        var success = enlargeMemory();
        if (!success) {
          HEAP32[DYNAMICTOP_PTR >> 2] = ret;
          return 0;
        }
      }
      return ret;
    }, alignMemory: function(size, quantum) {
      var ret = size = Math.ceil(size / (quantum || 16)) * (quantum || 16);
      return ret;
    }, makeBigInt: function(low, high, unsigned) {
      var ret = unsigned ? +(low >>> 0) + +(high >>> 0) * 4294967296 : +(low >>> 0) + +(high | 0) * 4294967296;
      return ret;
    }, GLOBAL_BASE: 1024, QUANTUM_SIZE: 4, __dummy__: 0
  };
  Module['Runtime'] = Runtime;
  var ABORT = 0;
  var EXITSTATUS = 0;

  function assert(condition, text) {
    if (!condition) {
      abort('Assertion failed: ' + text);
    }
  }

  function getCFunc(ident) {
    var func = Module['_' + ident];
    if (!func) {
      try {
        func = eval('_' + ident);
      } catch (e) {
      }
    }
    assert(func, 'Cannot call unknown function ' + ident + ' (perhaps LLVM optimizations or closure removed it?)');
    return func;
  }

  var cwrap, ccall;
  (function() {
    var JSfuncs = {
      'stackSave': function() {
        Runtime.stackSave();
      }, 'stackRestore': function() {
        Runtime.stackRestore();
      }, 'arrayToC': function(arr) {
        var ret = Runtime.stackAlloc(arr.length);
        writeArrayToMemory(arr, ret);
        return ret;
      }, 'stringToC': function(str) {
        var ret = 0;
        if (str !== null && str !== undefined && str !== 0) {
          var len = (str.length << 2) + 1;
          ret = Runtime.stackAlloc(len);
          stringToUTF8(str, ret, len);
        }
        return ret;
      }
    };
    var toC = { 'string': JSfuncs['stringToC'], 'array': JSfuncs['arrayToC'] };
    ccall = function ccallFunc(ident, returnType, argTypes, args, opts) {
      var func = getCFunc(ident);
      var cArgs = [];
      var stack = 0;
      if (args) {
        for (let i = 0; i < args.length; i++) {
          var converter = toC[argTypes[i]];
          if (converter) {
            if (stack === 0) stack = Runtime.stackSave();
            cArgs[i] = converter(args[i]);
          } else {
            cArgs[i] = args[i];
          }
        }
      }
      var ret = func.apply(null, cArgs);
      if (returnType === 'string') ret = Pointer_stringify(ret);
      if (stack !== 0) {
        if (opts && opts.async) {
          EmterpreterAsync.asyncFinalizers.push(function() {
            Runtime.stackRestore(stack);
          });
          return;
        }
        Runtime.stackRestore(stack);
      }
      return ret;
    };
    var sourceRegex = /^function\\s*[a-zA-Z$_0-9]*\\s*\\(([^)]*)\\)\\s*{\\s*([^*]*?)[\\s;]*(?:return\\s*(.*?)[;\\s]*)?}$/;

    function parseJSFunc(jsfunc) {
      var parsed = jsfunc.toString().match(sourceRegex).slice(1);
      return { arguments: parsed[0], body: parsed[1], returnValue: parsed[2] };
    }

    var JSsource = null;

    function ensureJSsource() {
      if (!JSsource) {
        JSsource = {};
        for (let fun in JSfuncs) {
          if (JSfuncs.hasOwnProperty(fun)) {
            JSsource[fun] = parseJSFunc(JSfuncs[fun]);
          }
        }
      }
    }

    cwrap = function cwrap(ident, returnType, argTypes) {
      argTypes = argTypes || [];
      var cfunc = getCFunc(ident);
      var numericArgs = argTypes.every(function(type) {
        return type === 'number';
      });
      var numericRet = returnType !== 'string';
      if (numericRet && numericArgs) {
        return cfunc;
      }
      var argNames = argTypes.map(function(x, i) {
        return '$' + i;
      });
      var funcstr = '(function(' + argNames.join(',') + ') {';
      var nargs = argTypes.length;
      if (!numericArgs) {
        ensureJSsource();
        funcstr += 'var stack = ' + JSsource['stackSave'].body + ';';
        for (let i = 0; i < nargs; i++) {
          var arg = argNames[i];
          var type = argTypes[i];
          if (type === 'number') continue;
          var convertCode = JSsource[type + 'ToC'];
          funcstr += 'var ' + convertCode.arguments + ' = ' + arg + ';';
          funcstr += convertCode.body + ';';
          funcstr += arg + '=(' + convertCode.returnValue + ');';
        }
      }
      var cfuncname = parseJSFunc(function() {
        return cfunc;
      }).returnValue;
      funcstr += 'var ret = ' + cfuncname + '(' + argNames.join(',') + ');';
      if (!numericRet) {
        const strgfy = parseJSFunc(function() {
          return Pointer_stringify;
        }).returnValue;
        funcstr += 'ret = ' + strgfy + '(ret);';
      }
      if (!numericArgs) {
        ensureJSsource();
        funcstr += JSsource['stackRestore'].body.replace('()', '(stack)') + ';';
      }
      funcstr += 'return ret})';
      return eval(funcstr);
    };
  })();
  Module['ccall'] = ccall;
  Module['cwrap'] = cwrap;

  function setValue(ptr, value, type, noSafe) {
    type = type || 'i8';
    if (type.charAt(type.length - 1) === '*') type = 'i32';
    switch (type) {
      case 'i1':
        HEAP8[ptr >> 0] = value;
        break;
      case 'i8':
        HEAP8[ptr >> 0] = value;
        break;
      case 'i16':
        HEAP16[ptr >> 1] = value;
        break;
      case 'i32':
        HEAP32[ptr >> 2] = value;
        break;
      case 'i64':
        tempI64 = [value >>> 0, (tempDouble = value, +Math_abs(tempDouble) >= 1 ? tempDouble > 0 ? (Math_min(+Math_floor(tempDouble / 4294967296), 4294967295) | 0) >>> 0 : ~~+Math_ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0 : 0)], HEAP32[ptr >> 2] = tempI64[0], HEAP32[ptr + 4 >> 2] = tempI64[1];
        break;
      case 'float':
        HEAPF32[ptr >> 2] = value;
        break;
      case 'double':
        HEAPF64[ptr >> 3] = value;
        break;
      default:
        abort('invalid type for setValue: ' + type);
    }
  }

  Module['setValue'] = setValue;

  function getValue(ptr, type, noSafe) {
    type = type || 'i8';
    if (type.charAt(type.length - 1) === '*') type = 'i32';
    switch (type) {
      case 'i1':
        return HEAP8[ptr >> 0];
      case 'i8':
        return HEAP8[ptr >> 0];
      case 'i16':
        return HEAP16[ptr >> 1];
      case 'i32':
        return HEAP32[ptr >> 2];
      case 'i64':
        return HEAP32[ptr >> 2];
      case 'float':
        return HEAPF32[ptr >> 2];
      case 'double':
        return HEAPF64[ptr >> 3];
      default:
        abort('invalid type for setValue: ' + type);
    }
    return null;
  }

  Module['getValue'] = getValue;
  var ALLOC_NORMAL = 0;
  var ALLOC_STACK = 1;
  var ALLOC_STATIC = 2;
  var ALLOC_DYNAMIC = 3;
  var ALLOC_NONE = 4;
  Module['ALLOC_NORMAL'] = ALLOC_NORMAL;
  Module['ALLOC_STACK'] = ALLOC_STACK;
  Module['ALLOC_STATIC'] = ALLOC_STATIC;
  Module['ALLOC_DYNAMIC'] = ALLOC_DYNAMIC;
  Module['ALLOC_NONE'] = ALLOC_NONE;

  function allocate(slab, types, allocator, ptr) {
    var zeroinit, size;
    if (typeof slab === 'number') {
      zeroinit = true;
      size = slab;
    } else {
      zeroinit = false;
      size = slab.length;
    }
    var singleType = typeof types === 'string' ? types : null;
    var ret;
    if (allocator === ALLOC_NONE) {
      ret = ptr;
    } else {
      ret = [typeof _malloc === 'function' ? _malloc : Runtime.staticAlloc, Runtime.stackAlloc, Runtime.staticAlloc, Runtime.dynamicAlloc][allocator === undefined ? ALLOC_STATIC : allocator](Math.max(size, singleType ? 1 : types.length));
    }
    if (zeroinit) {
      var ptr = ret;
      var stop;
      assert((ret & 3) === 0);
      stop = ret + (size & ~3);
      for (; ptr < stop; ptr += 4) {
        HEAP32[ptr >> 2] = 0;
      }
      stop = ret + size;
      while (ptr < stop) {
        HEAP8[ptr++ >> 0] = 0;
      }
      return ret;
    }
    if (singleType === 'i8') {
      if (slab.subarray || slab.slice) {
        HEAPU8.set(slab, ret);
      } else {
        HEAPU8.set(new Uint8Array(slab), ret);
      }
      return ret;
    }
    var i = 0;
    var type;
    var typeSize;
    var previousType;
    while (i < size) {
      var curr = slab[i];
      if (typeof curr === 'function') {
        curr = Runtime.getFunctionIndex(curr);
      }
      type = singleType || types[i];
      if (type === 0) {
        i++;
        continue;
      }
      if (type === 'i64') type = 'i32';
      setValue(ret + i, curr, type);
      if (previousType !== type) {
        typeSize = Runtime.getNativeTypeSize(type);
        previousType = type;
      }
      i += typeSize;
    }
    return ret;
  }

  Module['allocate'] = allocate;

  function getMemory(size) {
    if (!staticSealed) return Runtime.staticAlloc(size);
    if (!runtimeInitialized) return Runtime.dynamicAlloc(size);
    return _malloc(size);
  }

  Module['getMemory'] = getMemory;

  function Pointer_stringify(ptr, length) {
    if (length === 0 || !ptr) return '';
    var hasUtf = 0;
    var t;
    var i = 0;
    while (1) {
      t = HEAPU8[ptr + i >> 0];
      hasUtf |= t;
      if (t === 0 && !length) break;
      i++;
      if (length && i === length) break;
    }
    if (!length) length = i;
    var ret = '';
    if (hasUtf < 128) {
      var MAX_CHUNK = 1024;
      var curr;
      while (length > 0) {
        curr = String.fromCharCode.apply(String, HEAPU8.subarray(ptr, ptr + Math.min(length, MAX_CHUNK)));
        ret = ret ? ret + curr : curr;
        ptr += MAX_CHUNK;
        length -= MAX_CHUNK;
      }
      return ret;
    }
    return Module['UTF8ToString'](ptr);
  }

  Module['Pointer_stringify'] = Pointer_stringify;

  function AsciiToString(ptr) {
    var str = '';
    while (1) {
      var ch = HEAP8[ptr++ >> 0];
      if (!ch) return str;
      str += String.fromCharCode(ch);
    }
  }

  Module['AsciiToString'] = AsciiToString;

  function stringToAscii(str, outPtr) {
    return writeAsciiToMemory(str, outPtr, false);
  }

  Module['stringToAscii'] = stringToAscii;
  var UTF8Decoder = typeof TextDecoder !== 'undefined' ? new TextDecoder('utf8') : undefined;

  function UTF8ArrayToString(u8Array, idx) {
    var endPtr = idx;
    while (u8Array[endPtr]) ++endPtr;
    if (endPtr - idx > 16 && u8Array.subarray && UTF8Decoder) {
      return UTF8Decoder.decode(u8Array.subarray(idx, endPtr));
    } else {
      var u0, u1, u2, u3, u4, u5;
      var str = '';
      while (1) {
        u0 = u8Array[idx++];
        if (!u0) return str;
        if (!(u0 & 128)) {
          str += String.fromCharCode(u0);
          continue;
        }
        u1 = u8Array[idx++] & 63;
        if ((u0 & 224) === 192) {
          str += String.fromCharCode((u0 & 31) << 6 | u1);
          continue;
        }
        u2 = u8Array[idx++] & 63;
        if ((u0 & 240) === 224) {
          u0 = (u0 & 15) << 12 | u1 << 6 | u2;
        } else {
          u3 = u8Array[idx++] & 63;
          if ((u0 & 248) === 240) {
            u0 = (u0 & 7) << 18 | u1 << 12 | u2 << 6 | u3;
          } else {
            u4 = u8Array[idx++] & 63;
            if ((u0 & 252) === 248) {
              u0 = (u0 & 3) << 24 | u1 << 18 | u2 << 12 | u3 << 6 | u4;
            } else {
              u5 = u8Array[idx++] & 63;
              u0 = (u0 & 1) << 30 | u1 << 24 | u2 << 18 | u3 << 12 | u4 << 6 | u5;
            }
          }
        }
        if (u0 < 65536) {
          str += String.fromCharCode(u0);
        } else {
          var ch = u0 - 65536;
          str += String.fromCharCode(55296 | ch >> 10, 56320 | ch & 1023);
        }
      }
    }
  }

  Module['UTF8ArrayToString'] = UTF8ArrayToString;

  function UTF8ToString(ptr) {
    return UTF8ArrayToString(HEAPU8, ptr);
  }

  Module['UTF8ToString'] = UTF8ToString;

  function stringToUTF8Array(str, outU8Array, outIdx, maxBytesToWrite) {
    if (!(maxBytesToWrite > 0)) return 0;
    var startIdx = outIdx;
    var endIdx = outIdx + maxBytesToWrite - 1;
    for (let i = 0; i < str.length; ++i) {
      var u = str.charCodeAt(i);
      if (u >= 55296 && u <= 57343) u = 65536 + ((u & 1023) << 10) | str.charCodeAt(++i) & 1023;
      if (u <= 127) {
        if (outIdx >= endIdx) break;
        outU8Array[outIdx++] = u;
      } else if (u <= 2047) {
        if (outIdx + 1 >= endIdx) break;
        outU8Array[outIdx++] = 192 | u >> 6;
        outU8Array[outIdx++] = 128 | u & 63;
      } else if (u <= 65535) {
        if (outIdx + 2 >= endIdx) break;
        outU8Array[outIdx++] = 224 | u >> 12;
        outU8Array[outIdx++] = 128 | u >> 6 & 63;
        outU8Array[outIdx++] = 128 | u & 63;
      } else if (u <= 2097151) {
        if (outIdx + 3 >= endIdx) break;
        outU8Array[outIdx++] = 240 | u >> 18;
        outU8Array[outIdx++] = 128 | u >> 12 & 63;
        outU8Array[outIdx++] = 128 | u >> 6 & 63;
        outU8Array[outIdx++] = 128 | u & 63;
      } else if (u <= 67108863) {
        if (outIdx + 4 >= endIdx) break;
        outU8Array[outIdx++] = 248 | u >> 24;
        outU8Array[outIdx++] = 128 | u >> 18 & 63;
        outU8Array[outIdx++] = 128 | u >> 12 & 63;
        outU8Array[outIdx++] = 128 | u >> 6 & 63;
        outU8Array[outIdx++] = 128 | u & 63;
      } else {
        if (outIdx + 5 >= endIdx) break;
        outU8Array[outIdx++] = 252 | u >> 30;
        outU8Array[outIdx++] = 128 | u >> 24 & 63;
        outU8Array[outIdx++] = 128 | u >> 18 & 63;
        outU8Array[outIdx++] = 128 | u >> 12 & 63;
        outU8Array[outIdx++] = 128 | u >> 6 & 63;
        outU8Array[outIdx++] = 128 | u & 63;
      }
    }
    outU8Array[outIdx] = 0;
    return outIdx - startIdx;
  }

  Module['stringToUTF8Array'] = stringToUTF8Array;

  function stringToUTF8(str, outPtr, maxBytesToWrite) {
    return stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite);
  }

  Module['stringToUTF8'] = stringToUTF8;

  function lengthBytesUTF8(str) {
    var len = 0;
    for (let i = 0; i < str.length; ++i) {
      var u = str.charCodeAt(i);
      if (u >= 55296 && u <= 57343) u = 65536 + ((u & 1023) << 10) | str.charCodeAt(++i) & 1023;
      if (u <= 127) {
        ++len;
      } else if (u <= 2047) {
        len += 2;
      } else if (u <= 65535) {
        len += 3;
      } else if (u <= 2097151) {
        len += 4;
      } else if (u <= 67108863) {
        len += 5;
      } else {
        len += 6;
      }
    }
    return len;
  }

  Module['lengthBytesUTF8'] = lengthBytesUTF8;
  var UTF16Decoder = typeof TextDecoder !== 'undefined' ? new TextDecoder('utf-16le') : undefined;

  function demangle(func) {
    var __cxa_demangle_func = Module['___cxa_demangle'] || Module['__cxa_demangle'];
    if (__cxa_demangle_func) {
      try {
        var s = func.substr(1);
        var len = lengthBytesUTF8(s) + 1;
        var buf = _malloc(len);
        stringToUTF8(s, buf, len);
        var status = _malloc(4);
        var ret = __cxa_demangle_func(buf, 0, 0, status);
        if (getValue(status, 'i32') === 0 && ret) {
          return Pointer_stringify(ret);
        }
      } catch (e) {
      } finally {
        if (buf) _free(buf);
        if (status) _free(status);
        if (ret) _free(ret);
      }
      return func;
    }
    Runtime.warnOnce('warning: build with  -s DEMANGLE_SUPPORT=1  to link in libcxxabi demangling');
    return func;
  }

  function demangleAll(text) {
    var regex = /__Z[\\w\\d_]+/g;
    return text.replace(regex, function(x) {
      var y = demangle(x);
      return x === y ? x : x + ' [' + y + ']';
    });
  }

  function jsStackTrace() {
    var err = new Error();
    if (!err.stack) {
      try {
        throw new Error(0);
      } catch (e) {
        err = e;
      }
      if (!err.stack) {
        return '(no stack trace available)';
      }
    }
    return err.stack.toString();
  }

  function stackTrace() {
    var js = jsStackTrace();
    if (Module['extraStackTrace']) js += '\\n' + Module['extraStackTrace']();
    return demangleAll(js);
  }

  Module['stackTrace'] = stackTrace;
  var WASM_PAGE_SIZE = 65536;
  var ASMJS_PAGE_SIZE = 16777216;

  function alignUp(x, multiple) {
    if (x % multiple > 0) {
      x += multiple - x % multiple;
    }
    return x;
  }

  let HEAP, buffer, HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64;

  function updateGlobalBuffer(buf) {
    Module['buffer'] = buffer = buf;
  }

  function updateGlobalBufferViews() {
    Module['HEAP8'] = HEAP8 = new Int8Array(buffer);
    Module['HEAP16'] = HEAP16 = new Int16Array(buffer);
    Module['HEAP32'] = HEAP32 = new Int32Array(buffer);
    Module['HEAPU8'] = HEAPU8 = new Uint8Array(buffer);
    Module['HEAPU16'] = HEAPU16 = new Uint16Array(buffer);
    Module['HEAPU32'] = HEAPU32 = new Uint32Array(buffer);
    Module['HEAPF32'] = HEAPF32 = new Float32Array(buffer);
    Module['HEAPF64'] = HEAPF64 = new Float64Array(buffer);
  }

  let STATIC_BASE, STATICTOP, staticSealed;
  let STACK_BASE, STACKTOP, STACK_MAX;
  let DYNAMIC_BASE, DYNAMICTOP_PTR;
  STATIC_BASE = STATICTOP = STACK_BASE = STACKTOP = STACK_MAX = DYNAMIC_BASE = DYNAMICTOP_PTR = 0;
  staticSealed = false;

  function abortOnCannotGrowMemory() {
    abort('Cannot enlarge memory arrays. Either (1) compile with  -s TOTAL_MEMORY=X  with X higher than the current value ' + TOTAL_MEMORY + ', (2) compile with  -s ALLOW_MEMORY_GROWTH=1  which allows increasing the size at runtime, or (3) if you want malloc to return NULL (0) instead of this abort, compile with  -s ABORTING_MALLOC=0 ');
  }

  function enlargeMemory() {
    abortOnCannotGrowMemory();
  }

  var TOTAL_STACK = Module['TOTAL_STACK'] || 5242880;
  var TOTAL_MEMORY = Module['TOTAL_MEMORY'] || 134217728;
  if (TOTAL_MEMORY < TOTAL_STACK) Module.printErr('TOTAL_MEMORY should be larger than TOTAL_STACK, was ' + TOTAL_MEMORY + '! (TOTAL_STACK=' + TOTAL_STACK + ')');
  if (Module['buffer']) {
    buffer = Module['buffer'];
  } else {
    if (typeof WebAssembly === 'object' && typeof WebAssembly.Memory === 'function') {
      Module['wasmMemory'] = new WebAssembly.Memory({
        'initial': TOTAL_MEMORY / WASM_PAGE_SIZE,
        'maximum': TOTAL_MEMORY / WASM_PAGE_SIZE
      });
      buffer = Module['wasmMemory'].buffer;
    } else {
      buffer = new ArrayBuffer(TOTAL_MEMORY);
    }
  }
  updateGlobalBufferViews();

  function getTotalMemory() {
    return TOTAL_MEMORY;
  }

  HEAP32[0] = 1668509029;
  HEAP16[1] = 25459;
  if (HEAPU8[2] !== 115 || HEAPU8[3] !== 99) throw 'Runtime error: expected the system to be little-endian!';
  Module['HEAP'] = HEAP;
  Module['buffer'] = buffer;
  Module['HEAP8'] = HEAP8;
  Module['HEAP16'] = HEAP16;
  Module['HEAP32'] = HEAP32;
  Module['HEAPU8'] = HEAPU8;
  Module['HEAPU16'] = HEAPU16;
  Module['HEAPU32'] = HEAPU32;
  Module['HEAPF32'] = HEAPF32;
  Module['HEAPF64'] = HEAPF64;

  function callRuntimeCallbacks(callbacks) {
    while (callbacks.length > 0) {
      var callback = callbacks.shift();
      if (typeof callback === 'function') {
        callback();
        continue;
      }
      var func = callback.func;
      if (typeof func === 'number') {
        if (callback.arg === undefined) {
          Module['dynCall_v'](func);
        } else {
          Module['dynCall_vi'](func, callback.arg);
        }
      } else {
        func(callback.arg === undefined ? null : callback.arg);
      }
    }
  }

  var __ATPRERUN__ = [];
  var __ATINIT__ = [];
  var __ATMAIN__ = [];
  var __ATEXIT__ = [];
  var __ATPOSTRUN__ = [];
  var runtimeInitialized = false;
  var runtimeExited = false;

  function preRun() {
    if (Module['preRun']) {
      if (typeof Module['preRun'] === 'function') Module['preRun'] = [Module['preRun']];
      while (Module['preRun'].length) {
        addOnPreRun(Module['preRun'].shift());
      }
    }
    callRuntimeCallbacks(__ATPRERUN__);
  }

  function ensureInitRuntime() {
    if (runtimeInitialized) return;
    runtimeInitialized = true;
    callRuntimeCallbacks(__ATINIT__);
  }

  function preMain() {
    callRuntimeCallbacks(__ATMAIN__);
  }

  function exitRuntime() {
    callRuntimeCallbacks(__ATEXIT__);
    runtimeExited = true;
  }

  function postRun() {
    if (Module['postRun']) {
      if (typeof Module['postRun'] === 'function') Module['postRun'] = [Module['postRun']];
      while (Module['postRun'].length) {
        addOnPostRun(Module['postRun'].shift());
      }
    }
    callRuntimeCallbacks(__ATPOSTRUN__);
  }

  function addOnPreRun(cb) {
    __ATPRERUN__.unshift(cb);
  }

  Module['addOnPreRun'] = addOnPreRun;

  function addOnInit(cb) {
    __ATINIT__.unshift(cb);
  }

  Module['addOnInit'] = addOnInit;

  function addOnPreMain(cb) {
    __ATMAIN__.unshift(cb);
  }

  Module['addOnPreMain'] = addOnPreMain;

  function addOnExit(cb) {
    __ATEXIT__.unshift(cb);
  }

  Module['addOnExit'] = addOnExit;

  function addOnPostRun(cb) {
    __ATPOSTRUN__.unshift(cb);
  }

  Module['addOnPostRun'] = addOnPostRun;

  function intArrayFromString(stringy, dontAddNull, length) {
    var len = length > 0 ? length : lengthBytesUTF8(stringy) + 1;
    var u8array = new Array(len);
    var numBytesWritten = stringToUTF8Array(stringy, u8array, 0, u8array.length);
    if (dontAddNull) u8array.length = numBytesWritten;
    return u8array;
  }

  Module['intArrayFromString'] = intArrayFromString;

  function intArrayToString(array) {
    var ret = [];
    for (let i = 0; i < array.length; i++) {
      var chr = array[i];
      if (chr > 255) {
        chr &= 255;
      }
      ret.push(String.fromCharCode(chr));
    }
    return ret.join('');
  }

  Module['intArrayToString'] = intArrayToString;

  function writeStringToMemory(string, buffer, dontAddNull) {
    Runtime.warnOnce('writeStringToMemory is deprecated and should not be called! Use stringToUTF8() instead!');
    var lastChar, end;
    if (dontAddNull) {
      end = buffer + lengthBytesUTF8(string);
      lastChar = HEAP8[end];
    }
    stringToUTF8(string, buffer, Infinity);
    if (dontAddNull) HEAP8[end] = lastChar;
  }

  Module['writeStringToMemory'] = writeStringToMemory;

  function writeArrayToMemory(array, buffer) {
    HEAP8.set(array, buffer);
  }

  Module['writeArrayToMemory'] = writeArrayToMemory;

  function writeAsciiToMemory(str, buffer, dontAddNull) {
    for (let i = 0; i < str.length; ++i) {
      HEAP8[buffer++ >> 0] = str.charCodeAt(i);
    }
    if (!dontAddNull) HEAP8[buffer >> 0] = 0;
  }

  Module['writeAsciiToMemory'] = writeAsciiToMemory;
  if (!Math['imul'] || Math['imul'](4294967295, 5) !== -5) Math['imul'] = function imul(a, b) {
    var ah = a >>> 16;
    var al = a & 65535;
    var bh = b >>> 16;
    var bl = b & 65535;
    return al * bl + (ah * bl + al * bh << 16) | 0;
  };
  Math.imul = Math['imul'];
  if (!Math['fround']) {
    var froundBuffer = new Float32Array(1);
    Math['fround'] = function(x) {
      froundBuffer[0] = x;
      return froundBuffer[0];
    };
  }
  Math.fround = Math['fround'];
  if (!Math['clz32']) Math['clz32'] = function(x) {
    x = x >>> 0;
    for (let i = 0; i < 32; i++) {
      if (x & 1 << 31 - i) return i;
    }
    return 32;
  };
  Math.clz32 = Math['clz32'];
  if (!Math['trunc']) Math['trunc'] = function(x) {
    return x < 0 ? Math.ceil(x) : Math.floor(x);
  };
  Math.trunc = Math['trunc'];
  const Math_abs = Math.abs;
  const Math_ceil = Math.ceil;
  const Math_floor = Math.floor;
  const Math_min = Math.min;
  let runDependencies = 0;
  let runDependencyWatcher = null;
  let dependenciesFulfilled = null;

  function addRunDependency(id) {
    runDependencies++;
    if (Module['monitorRunDependencies']) {
      Module['monitorRunDependencies'](runDependencies);
    }
  }

  Module['addRunDependency'] = addRunDependency;

  function removeRunDependency(id) {
    runDependencies--;
    if (Module['monitorRunDependencies']) {
      Module['monitorRunDependencies'](runDependencies);
    }
    if (runDependencies === 0) {
      if (runDependencyWatcher !== null) {
        clearInterval(runDependencyWatcher);
        runDependencyWatcher = null;
      }
      if (dependenciesFulfilled) {
        var callback = dependenciesFulfilled;
        dependenciesFulfilled = null;
        callback();
      }
    }
  }

  Module['removeRunDependency'] = removeRunDependency;
  Module['preloadedImages'] = {};
  Module['preloadedAudios'] = {};
  let memoryInitializer = null;

  function integrateWasmJS() {
    Module['wasmJSMethod'] = Module['wasmJSMethod'] || 'native-wasm';
    let wasmBinaryFile = Module['wasmBinaryFile'] || '${wasmUrl}';
    if (typeof Module['locateFile'] === 'function') {
      wasmBinaryFile = Module['locateFile'](wasmBinaryFile);
    }
    const wasmPageSize = 64 * 1024;
    const asm2wasmImports = {
      'f64-rem': function(x, y) {
        return x % y;
      }, 'f64-to-int': function(x) {
        return x | 0;
      }, 'i32s-div': function(x, y) {
        return (x | 0) / (y | 0) | 0;
      }, 'i32u-div': function(x, y) {
        return (x >>> 0) / (y >>> 0) >>> 0;
      }, 'i32s-rem': function(x, y) {
        return (x | 0) % (y | 0) | 0;
      }, 'i32u-rem': function(x, y) {
        return (x >>> 0) % (y >>> 0) >>> 0;
      }, 'debugger': function() {
        debugger;
      }
    };
    const info = { 'global': null, 'env': null, 'asm2wasm': asm2wasmImports, 'parent': Module };
    let exports = null;

    function lookupImport(mod, base) {
      let lookup = info;
      if (mod.indexOf('.') < 0) {
        lookup = (lookup || {})[mod];
      } else {
        const parts = mod.split('.');
        lookup = (lookup || {})[parts[0]];
        lookup = (lookup || {})[parts[1]];
      }
      if (base) {
        lookup = (lookup || {})[base];
      }
      if (lookup === undefined) {
        abort('bad lookupImport to (' + mod + ').' + base);
      }
      return lookup;
    }

    function mergeMemory(newBuffer) {
      const oldBuffer = Module['buffer'];
      if (newBuffer.byteLength < oldBuffer.byteLength) {
        Module['printErr']('the new buffer in mergeMemory is smaller than the previous one. in native wasm, we should grow memory here');
      }
      const oldView = new Int8Array(oldBuffer);
      const newView = new Int8Array(newBuffer);
      if (!memoryInitializer) {
        oldView.set(newView.subarray(Module['STATIC_BASE'], Module['STATIC_BASE'] + Module['STATIC_BUMP']), Module['STATIC_BASE']);
      }
      newView.set(oldView);
      updateGlobalBuffer(newBuffer);
      updateGlobalBufferViews();
    }

    function fixImports(imports) {
      if (!0) return imports;
      const ret = {};
      for (let i in imports) {
        var fixed = i;
        if (fixed[0] === '_') fixed = fixed.substr(1);
        ret[fixed] = imports[i];
      }
      return ret;
    }

    function getBinary() {
      try {
        var binary;
        if (Module['wasmBinary']) {
          binary = Module['wasmBinary'];
          binary = new Uint8Array(binary);
        } else if (Module['readBinary']) {
          binary = Module['readBinary'](wasmBinaryFile);
          console.log('binary', binary);
        } else {
          throw "on the web, we need the wasm binary to be preloaded and set on Module['wasmBinary']. emcc.py will do that for you when generating HTML (but not JS)";
        }
        return binary;
      } catch (err) {
        abort(err);
      }
    }

    function getBinaryPromise() {
      if (!Module['wasmBinary'] && (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) && typeof fetch === 'function') {
        return fetch(wasmBinaryFile, { credentials: 'same-origin' }).then(function(response) {
          console.log('getBinaryPromise');
          if (!response['ok']) {
            throw "failed to load wasm binary file at '" + wasmBinaryFile + "'";
          }
          return response['arrayBuffer']();
        });
      }
      return new Promise(function(resolve) {
        resolve(getBinary());
      });
    }

    function doNativeWasm(global, env) {
      if (typeof WebAssembly !== 'object') {
        Module['printErr']('no native wasm support detected');
        return false;
      }
      if (!(Module['wasmMemory'] instanceof WebAssembly.Memory)) {
        Module['printErr']('no native wasm Memory in use');
        return false;
      }
      env['memory'] = Module['wasmMemory'];
      info['global'] = { 'NaN': NaN, 'Infinity': Infinity };
      info['global.Math'] = global.Math;
      info['env'] = env;

      function receiveInstance(instance) {
        exports = instance.exports;
        if (exports.memory) mergeMemory(exports.memory);
        Module['asm'] = exports;
        Module['usingWasm'] = true;
        removeRunDependency('wasm-instantiate');
      }

      addRunDependency('wasm-instantiate');
      if (Module['instantiateWasm']) {
        try {
          return Module['instantiateWasm'](info, receiveInstance);
        } catch (e) {
          Module['printErr']('Module.instantiateWasm callback failed with error: ' + e);
          return false;
        }
      }

      function receiveInstantiatedSource(output) {
        receiveInstance(output['instance']);
      }

      function instantiateArrayBuffer(receiver) {
        getBinaryPromise().then(function(binary) {
          return WebAssembly.instantiate(binary, info);
        }).then(receiver).catch(function(reason) {
          Module['printErr']('failed to asynchronously prepare wasm: ' + reason);
          abort(reason);
        });
      }

      if (!Module['wasmBinary'] && typeof WebAssembly.instantiateStreaming === 'function') {
        WebAssembly.instantiateStreaming(fetch(wasmBinaryFile, { credentials: 'same-origin' }), info).then(function(output) {
          console.log('WebAssembly.instantiateStreaming', output);
          receiveInstantiatedSource(output);
        }).catch(function(reason) {
          Module['printErr']('wasm streaming compile failed: ' + reason);
          Module['printErr']('falling back to ArrayBuffer instantiation');
          instantiateArrayBuffer(receiveInstantiatedSource);
        });
      } else {
        instantiateArrayBuffer(receiveInstantiatedSource);
      }
      return {};
    }

    Module['asmPreload'] = Module['asm'];
    var asmjsReallocBuffer = Module['reallocBuffer'];
    var wasmReallocBuffer = function(size) {
      var PAGE_MULTIPLE = Module['usingWasm'] ? WASM_PAGE_SIZE : ASMJS_PAGE_SIZE;
      size = alignUp(size, PAGE_MULTIPLE);
      var old = Module['buffer'];
      var oldSize = old.byteLength;
      if (Module['usingWasm']) {
        try {
          var result = Module['wasmMemory'].grow((size - oldSize) / wasmPageSize);
          if (result !== (-1 | 0)) {
            return Module['buffer'] = Module['wasmMemory'].buffer;
          } else {
            return null;
          }
        } catch (e) {
          return null;
        }
      } else {
        exports['__growWasmMemory']((size - oldSize) / wasmPageSize);
        return Module['buffer'] !== old ? Module['buffer'] : null;
      }
    };
    Module['reallocBuffer'] = function(size) {
      if (finalMethod === 'asmjs') {
        return asmjsReallocBuffer(size);
      } else {
        return wasmReallocBuffer(size);
      }
    };
    var finalMethod = '';
    Module['asm'] = function(global, env, providedBuffer) {
      global = fixImports(global);
      env = fixImports(env);
      if (!env['table']) {
        const TABLE_SIZE = Module['wasmTableSize'] || 1024;
        const MAX_TABLE_SIZE = Module['wasmMaxTableSize'];
        if (typeof WebAssembly === 'object' && typeof WebAssembly.Table === 'function') {
          if (MAX_TABLE_SIZE !== undefined) {
            env['table'] = new WebAssembly.Table({
              'initial': TABLE_SIZE,
              'maximum': MAX_TABLE_SIZE,
              'element': 'anyfunc'
            });
          } else {
            env['table'] = new WebAssembly.Table({ 'initial': TABLE_SIZE, element: 'anyfunc' });
          }
        } else {
          env['table'] = new Array(TABLE_SIZE);
        }
        Module['wasmTable'] = env['table'];
      }
      if (!env['memoryBase']) {
        env['memoryBase'] = Module['STATIC_BASE'];
      }
      if (!env['tableBase']) {
        env['tableBase'] = 0;
      }
      var exports;
      exports = doNativeWasm(global, env, providedBuffer);
      if (!exports) abort('no binaryen method succeeded. consider enabling more options, like interpreting, if you want that: https://github.com/kripken/emscripten/wiki/WebAssembly#binaryen-methods');
      return exports;
    };
  }

  integrateWasmJS();
  STATIC_BASE = Runtime.GLOBAL_BASE;
  STATICTOP = STATIC_BASE + 163184;
  __ATINIT__.push({
    func: function() {
      __GLOBAL__sub_I_Decoder_cpp();
    }
  }, {
    func: function() {
      __GLOBAL__sub_I_bind_cpp();
    }
  });
  memoryInitializer = Module['wasmJSMethod'].indexOf('asmjs') >= 0 || Module['wasmJSMethod'].indexOf('interpret-asm2wasm') >= 0 ? 'Decoder.js.mem' : null;
  var STATIC_BUMP = 163184;
  Module['STATIC_BASE'] = STATIC_BASE;
  Module['STATIC_BUMP'] = STATIC_BUMP;
  var tempDoublePtr = STATICTOP;
  STATICTOP += 16;
  var structRegistrations = {};

  function embind_init_charCodes() {
    var codes = new Array(256);
    for (let i = 0; i < 256; ++i) {
      codes[i] = String.fromCharCode(i);
    }
    embind_charCodes = codes;
  }

  var embind_charCodes = undefined;

  function readLatin1String(ptr) {
    var ret = '';
    var c = ptr;
    while (HEAPU8[c]) {
      ret += embind_charCodes[HEAPU8[c++]];
    }
    return ret;
  }

  var char_0 = 48;
  var char_9 = 57;

  function makeLegalFunctionName(name) {
    if (undefined === name) {
      return '_unknown';
    }
    name = name.replace(/[^a-zA-Z0-9_]/g, '$');
    var f = name.charCodeAt(0);
    if (f >= char_0 && f <= char_9) {
      return '_' + name;
    } else {
      return name;
    }
  }

  function createNamedFunction(name, body) {
    name = makeLegalFunctionName(name);
    return (new Function('body', 'return function ' + name + '() {\\n' + '    "use strict";' + '    return body.apply(this, arguments);\\n' + '};\\n'))(body);
  }

  function extendError(baseErrorType, errorName) {
    var errorClass = createNamedFunction(errorName, function(message) {
      this.name = errorName;
      this.message = message;
      var stack = (new Error(message)).stack;
      if (stack !== undefined) {
        this.stack = this.toString() + '\\n' + stack.replace(/^Error(:[^\\n]*)?\\n/, '');
      }
    });
    errorClass.prototype = Object.create(baseErrorType.prototype);
    errorClass.prototype.constructor = errorClass;
    errorClass.prototype.toString = function() {
      if (this.message === undefined) {
        return this.name;
      } else {
        return this.name + ': ' + this.message;
      }
    };
    return errorClass;
  }

  var BindingError = undefined;

  function throwBindingError(message) {
    throw new BindingError(message);
  }

  function requireFunction(signature, rawFunction) {
    signature = readLatin1String(signature);

    function makeDynCaller(dynCall) {
      var args = [];
      for (let i = 1; i < signature.length; ++i) {
        args.push('a' + i);
      }
      var name = 'dynCall_' + signature + '_' + rawFunction;
      var body = 'return function ' + name + '(' + args.join(', ') + ') {\\n';
      body += '    return dynCall(rawFunction' + (args.length ? ', ' : '') + args.join(', ') + ');\\n';
      body += '};\\n';
      return (new Function('dynCall', 'rawFunction', body))(dynCall, rawFunction);
    }

    var fp;
    if (Module['FUNCTION_TABLE_' + signature] !== undefined) {
      fp = Module['FUNCTION_TABLE_' + signature][rawFunction];
    } else if (typeof FUNCTION_TABLE !== 'undefined') {
      fp = FUNCTION_TABLE[rawFunction];
    } else {
      var dc = Module['asm']['dynCall_' + signature];
      if (dc === undefined) {
        dc = Module['asm']['dynCall_' + signature.replace(/f/g, 'd')];
        if (dc === undefined) {
          throwBindingError('No dynCall invoker for signature: ' + signature);
        }
      }
      fp = makeDynCaller(dc);
    }
    if (typeof fp !== 'function') {
      throwBindingError('unknown function pointer with signature ' + signature + ': ' + rawFunction);
    }
    return fp;
  }

  function __embind_register_value_object(rawType, name, constructorSignature, rawConstructor, destructorSignature, rawDestructor) {
    structRegistrations[rawType] = {
      name: readLatin1String(name),
      rawConstructor: requireFunction(constructorSignature, rawConstructor),
      rawDestructor: requireFunction(destructorSignature, rawDestructor),
      fields: []
    };
  }

  function ___assert_fail(condition, filename, line, func) {
    ABORT = true;
    throw 'Assertion failed: ' + Pointer_stringify(condition) + ', at: ' + [filename ? Pointer_stringify(filename) : 'unknown filename', line, func ? Pointer_stringify(func) : 'unknown function'] + ' at ' + stackTrace();
  }

  var awaitingDependencies = {};
  var registeredTypes = {};
  var typeDependencies = {};
  var InternalError = undefined;

  function throwInternalError(message) {
    throw new InternalError(message);
  }

  function whenDependentTypesAreResolved(myTypes, dependentTypes, getTypeConverters) {
    myTypes.forEach(function(type) {
      typeDependencies[type] = dependentTypes;
    });

    function onComplete(typeConverters) {
      var myTypeConverters = getTypeConverters(typeConverters);
      if (myTypeConverters.length !== myTypes.length) {
        throwInternalError('Mismatched type converter count');
      }
      for (let i = 0; i < myTypes.length; ++i) {
        registerType(myTypes[i], myTypeConverters[i]);
      }
    }

    var typeConverters = new Array(dependentTypes.length);
    var unregisteredTypes = [];
    var registered = 0;
    dependentTypes.forEach(function(dt, i) {
      if (registeredTypes.hasOwnProperty(dt)) {
        typeConverters[i] = registeredTypes[dt];
      } else {
        unregisteredTypes.push(dt);
        if (!awaitingDependencies.hasOwnProperty(dt)) {
          awaitingDependencies[dt] = [];
        }
        awaitingDependencies[dt].push(function() {
          typeConverters[i] = registeredTypes[dt];
          ++registered;
          if (registered === unregisteredTypes.length) {
            onComplete(typeConverters);
          }
        });
      }
    });
    if (unregisteredTypes.length === 0) {
      onComplete(typeConverters);
    }
  }

  function registerType(rawType, registeredInstance, options) {
    options = options || {};
    if (!('argPackAdvance' in registeredInstance)) {
      throw new TypeError('registerType registeredInstance requires argPackAdvance');
    }
    var name = registeredInstance.name;
    if (!rawType) {
      throwBindingError('type "' + name + '" must have a positive integer typeid pointer');
    }
    if (registeredTypes.hasOwnProperty(rawType)) {
      if (options.ignoreDuplicateRegistrations) {
        return;
      } else {
        throwBindingError("Cannot register type '" + name + "' twice");
      }
    }
    registeredTypes[rawType] = registeredInstance;
    delete typeDependencies[rawType];
    if (awaitingDependencies.hasOwnProperty(rawType)) {
      var callbacks = awaitingDependencies[rawType];
      delete awaitingDependencies[rawType];
      callbacks.forEach(function(cb) {
        cb();
      });
    }
  }

  function __embind_register_void(rawType, name) {
    name = readLatin1String(name);
    registerType(rawType, {
      isVoid: true, name: name, 'argPackAdvance': 0, 'fromWireType': function() {
        return undefined;
      }, 'toWireType': function(destructors, o) {
        return undefined;
      }
    });
  }

  function _pthread_mutex_destroy() {
  }

  function __ZSt18uncaught_exceptionv() {
    return !!__ZSt18uncaught_exceptionv.uncaught_exception;
  }

  var EXCEPTIONS = {
    last: 0, caught: [], infos: {}, deAdjust: function(adjusted) {
      if (!adjusted || EXCEPTIONS.infos[adjusted]) return adjusted;
      for (let ptr in EXCEPTIONS.infos) {
        var info = EXCEPTIONS.infos[ptr];
        if (info.adjusted === adjusted) {
          return ptr;
        }
      }
      return adjusted;
    }, addRef: function(ptr) {
      if (!ptr) return;
      var info = EXCEPTIONS.infos[ptr];
      info.refcount++;
    }
  };

  function ___resumeException(ptr) {
    if (!EXCEPTIONS.last) {
      EXCEPTIONS.last = ptr;
    }
    throw ptr + ' - Exception catching is disabled, this exception cannot be caught. Compile with -s DISABLE_EXCEPTION_CATCHING=0 or DISABLE_EXCEPTION_CATCHING=2 to catch.';
  }

  function ___cxa_find_matching_catch() {
    var thrown = EXCEPTIONS.last;
    if (!thrown) {
      return (Runtime.setTempRet0(0), 0) | 0;
    }
    var info = EXCEPTIONS.infos[thrown];
    var throwntype = info.type;
    if (!throwntype) {
      return (Runtime.setTempRet0(0), thrown) | 0;
    }
    var typeArray = Array.prototype.slice.call(arguments);
    var pointer = Module['___cxa_is_pointer_type'](throwntype);
    if (!___cxa_find_matching_catch.buffer) ___cxa_find_matching_catch.buffer = _malloc(4);
    HEAP32[___cxa_find_matching_catch.buffer >> 2] = thrown;
    thrown = ___cxa_find_matching_catch.buffer;
    for (let i = 0; i < typeArray.length; i++) {
      if (typeArray[i] && Module['___cxa_can_catch'](typeArray[i], throwntype, thrown)) {
        thrown = HEAP32[thrown >> 2];
        info.adjusted = thrown;
        return (Runtime.setTempRet0(typeArray[i]), thrown) | 0;
      }
    }
    thrown = HEAP32[thrown >> 2];
    return (Runtime.setTempRet0(throwntype), thrown) | 0;
  }

  function ___cxa_throw(ptr, type, destructor) {
    EXCEPTIONS.infos[ptr] = {
      ptr: ptr,
      adjusted: ptr,
      type: type,
      destructor: destructor,
      refcount: 0,
      caught: false,
      rethrown: false
    };
    EXCEPTIONS.last = ptr;
    if (!('uncaught_exception' in __ZSt18uncaught_exceptionv)) {
      __ZSt18uncaught_exceptionv.uncaught_exception = 1;
    } else {
      __ZSt18uncaught_exceptionv.uncaught_exception++;
    }
    throw ptr + ' - Exception catching is disabled, this exception cannot be caught. Compile with -s DISABLE_EXCEPTION_CATCHING=0 or DISABLE_EXCEPTION_CATCHING=2 to catch.';
  }

  function getShiftFromSize(size) {
    switch (size) {
      case 1:
        return 0;
      case 2:
        return 1;
      case 4:
        return 2;
      case 8:
        return 3;
      default:
        throw new TypeError('Unknown type size: ' + size);
    }
  }

  function __embind_register_bool(rawType, name, size, trueValue, falseValue) {
    var shift = getShiftFromSize(size);
    name = readLatin1String(name);
    registerType(rawType, {
      name: name, 'fromWireType': function(wt) {
        return !!wt;
      }, 'toWireType': function(destructors, o) {
        return o ? trueValue : falseValue;
      }, 'argPackAdvance': 8, 'readValueFromPointer': function(pointer) {
        var heap;
        if (size === 1) {
          heap = HEAP8;
        } else if (size === 2) {
          heap = HEAP16;
        } else if (size === 4) {
          heap = HEAP32;
        } else {
          throw new TypeError('Unknown boolean type size: ' + name);
        }
        return this['fromWireType'](heap[pointer >> shift]);
      }, destructorFunction: null
    });
  }

  function ___gxx_personality_v0() {
  }

  function _pthread_cond_signal() {
    return 0;
  }

  function _abort() {
    Module['abort']();
  }

  function _pthread_cond_destroy() {
    return 0;
  }

  function simpleReadValueFromPointer(pointer) {
    return this['fromWireType'](HEAPU32[pointer >> 2]);
  }

  function __embind_register_std_string(rawType, name) {
    name = readLatin1String(name);
    registerType(rawType, {
      name: name, 'fromWireType': function(value) {
        var length = HEAPU32[value >> 2];
        var a = new Array(length);
        for (let i = 0; i < length; ++i) {
          a[i] = String.fromCharCode(HEAPU8[value + 4 + i]);
        }
        _free(value);
        return a.join('');
      }, 'toWireType': function(destructors, value) {
        if (value instanceof ArrayBuffer) {
          value = new Uint8Array(value);
        }

        function getTAElement(ta, index) {
          return ta[index];
        }

        function getStringElement(string, index) {
          return string.charCodeAt(index);
        }

        var getElement;
        if (value instanceof Uint8Array) {
          getElement = getTAElement;
        } else if (value instanceof Uint8ClampedArray) {
          getElement = getTAElement;
        } else if (value instanceof Int8Array) {
          getElement = getTAElement;
        } else if (typeof value === 'string') {
          getElement = getStringElement;
        } else {
          throwBindingError('Cannot pass non-string to std::string');
        }
        var length = value.length;
        var ptr = _malloc(4 + length);
        HEAPU32[ptr >> 2] = length;
        for (let i = 0; i < length; ++i) {
          var charCode = getElement(value, i);
          if (charCode > 255) {
            _free(ptr);
            throwBindingError('String has UTF-16 code units that do not fit in 8 bits');
          }
          HEAPU8[ptr + 4 + i] = charCode;
        }
        if (destructors !== null) {
          destructors.push(_free, ptr);
        }
        return ptr;
      }, 'argPackAdvance': 8, 'readValueFromPointer': simpleReadValueFromPointer, destructorFunction: function(ptr) {
        _free(ptr);
      }
    });
  }

  function _embind_repr(v) {
    if (v === null) {
      return 'null';
    }
    var t = typeof v;
    if (t === 'object' || t === 'array' || t === 'function') {
      return v.toString();
    } else {
      return '' + v;
    }
  }

  function integerReadValueFromPointer(name, shift, signed) {
    switch (shift) {
      case 0:
        return signed ? function readS8FromPointer(pointer) {
          return HEAP8[pointer];
        } : function readU8FromPointer(pointer) {
          return HEAPU8[pointer];
        };
      case 1:
        return signed ? function readS16FromPointer(pointer) {
          return HEAP16[pointer >> 1];
        } : function readU16FromPointer(pointer) {
          return HEAPU16[pointer >> 1];
        };
      case 2:
        return signed ? function readS32FromPointer(pointer) {
          return HEAP32[pointer >> 2];
        } : function readU32FromPointer(pointer) {
          return HEAPU32[pointer >> 2];
        };
      default:
        throw new TypeError('Unknown integer type: ' + name);
    }
  }

  function __embind_register_integer(primitiveType, name, size, minRange, maxRange) {
    name = readLatin1String(name);
    if (maxRange === -1) {
      maxRange = 4294967295;
    }
    var shift = getShiftFromSize(size);
    var fromWireType = function(value) {
      return value;
    };
    if (minRange === 0) {
      var bitshift = 32 - 8 * size;
      fromWireType = function(value) {
        return value << bitshift >>> bitshift;
      };
    }
    var isUnsignedType = name.indexOf('unsigned') != -1;
    registerType(primitiveType, {
      name: name,
      'fromWireType': fromWireType,
      'toWireType': function(destructors, value) {
        if (typeof value !== 'number' && typeof value !== 'boolean') {
          throw new TypeError('Cannot convert "' + _embind_repr(value) + '" to ' + this.name);
        }
        if (value < minRange || value > maxRange) {
          throw new TypeError('Passing a number "' + _embind_repr(value) + '" from JS side to C/C++ side to an argument of type "' + name + '", which is outside the valid range [' + minRange + ', ' + maxRange + ']!');
        }
        return isUnsignedType ? value >>> 0 : value | 0;
      },
      'argPackAdvance': 8,
      'readValueFromPointer': integerReadValueFromPointer(name, shift, minRange !== 0),
      destructorFunction: null
    });
  }

  function _pthread_once(ptr, func) {
    if (!_pthread_once.seen) _pthread_once.seen = {};
    if (ptr in _pthread_once.seen) return;
    Module['dynCall_v'](func);
    _pthread_once.seen[ptr] = 1;
  }

  function _pthread_create() {
    return 11;
  }

  function __embind_register_value_object_field(structType, fieldName, getterReturnType, getterSignature, getter, getterContext, setterArgumentType, setterSignature, setter, setterContext) {
    structRegistrations[structType].fields.push({
      fieldName: readLatin1String(fieldName),
      getterReturnType: getterReturnType,
      getter: requireFunction(getterSignature, getter),
      getterContext: getterContext,
      setterArgumentType: setterArgumentType,
      setter: requireFunction(setterSignature, setter),
      setterContext: setterContext
    });
  }

  function ___lock() {
  }

  function ___unlock() {
  }

  var PTHREAD_SPECIFIC = {};

  function _pthread_getspecific(key) {
    return PTHREAD_SPECIFIC[key] || 0;
  }

  function runDestructors(destructors) {
    while (destructors.length) {
      var ptr = destructors.pop();
      var del = destructors.pop();
      del(ptr);
    }
  }

  function __embind_finalize_value_object(structType) {
    var reg = structRegistrations[structType];
    delete structRegistrations[structType];
    var rawConstructor = reg.rawConstructor;
    var rawDestructor = reg.rawDestructor;
    var fieldRecords = reg.fields;
    var fieldTypes = fieldRecords.map(function(field) {
      return field.getterReturnType;
    }).concat(fieldRecords.map(function(field) {
      return field.setterArgumentType;
    }));
    whenDependentTypesAreResolved([structType], fieldTypes, function(fieldTypes) {
      var fields = {};
      fieldRecords.forEach(function(field, i) {
        var fieldName = field.fieldName;
        var getterReturnType = fieldTypes[i];
        var getter = field.getter;
        var getterContext = field.getterContext;
        var setterArgumentType = fieldTypes[i + fieldRecords.length];
        var setter = field.setter;
        var setterContext = field.setterContext;
        fields[fieldName] = {
          read: function(ptr) {
            return getterReturnType['fromWireType'](getter(getterContext, ptr));
          }, write: function(ptr, o) {
            var destructors = [];
            setter(setterContext, ptr, setterArgumentType['toWireType'](destructors, o));
            runDestructors(destructors);
          }
        };
      });
      return [{
        name: reg.name, 'fromWireType': function(ptr) {
          var rv = {};
          for (let i in fields) {
            rv[i] = fields[i].read(ptr);
          }
          rawDestructor(ptr);
          return rv;
        }, 'toWireType': function(destructors, o) {
          for (let fieldName in fields) {
            if (!(fieldName in o)) {
              throw new TypeError('Missing field');
            }
          }
          var ptr = rawConstructor();
          for (fieldName in fields) {
            fields[fieldName].write(ptr, o[fieldName]);
          }
          if (destructors !== null) {
            destructors.push(rawDestructor, ptr);
          }
          return ptr;
        }, 'argPackAdvance': 8, 'readValueFromPointer': simpleReadValueFromPointer, destructorFunction: rawDestructor
      }];
    });
  }

  function _clock() {
    if (_clock.start === undefined) _clock.start = Date.now();
    return (Date.now() - _clock.start) * (1e6 / 1e3) | 0;
  }

  var PTHREAD_SPECIFIC_NEXT_KEY = 1;
  var ERRNO_CODES = {
    EPERM: 1,
    ENOENT: 2,
    ESRCH: 3,
    EINTR: 4,
    EIO: 5,
    ENXIO: 6,
    E2BIG: 7,
    ENOEXEC: 8,
    EBADF: 9,
    ECHILD: 10,
    EAGAIN: 11,
    EWOULDBLOCK: 11,
    ENOMEM: 12,
    EACCES: 13,
    EFAULT: 14,
    ENOTBLK: 15,
    EBUSY: 16,
    EEXIST: 17,
    EXDEV: 18,
    ENODEV: 19,
    ENOTDIR: 20,
    EISDIR: 21,
    EINVAL: 22,
    ENFILE: 23,
    EMFILE: 24,
    ENOTTY: 25,
    ETXTBSY: 26,
    EFBIG: 27,
    ENOSPC: 28,
    ESPIPE: 29,
    EROFS: 30,
    EMLINK: 31,
    EPIPE: 32,
    EDOM: 33,
    ERANGE: 34,
    ENOMSG: 42,
    EIDRM: 43,
    ECHRNG: 44,
    EL2NSYNC: 45,
    EL3HLT: 46,
    EL3RST: 47,
    ELNRNG: 48,
    EUNATCH: 49,
    ENOCSI: 50,
    EL2HLT: 51,
    EDEADLK: 35,
    ENOLCK: 37,
    EBADE: 52,
    EBADR: 53,
    EXFULL: 54,
    ENOANO: 55,
    EBADRQC: 56,
    EBADSLT: 57,
    EDEADLOCK: 35,
    EBFONT: 59,
    ENOSTR: 60,
    ENODATA: 61,
    ETIME: 62,
    ENOSR: 63,
    ENONET: 64,
    ENOPKG: 65,
    EREMOTE: 66,
    ENOLINK: 67,
    EADV: 68,
    ESRMNT: 69,
    ECOMM: 70,
    EPROTO: 71,
    EMULTIHOP: 72,
    EDOTDOT: 73,
    EBADMSG: 74,
    ENOTUNIQ: 76,
    EBADFD: 77,
    EREMCHG: 78,
    ELIBACC: 79,
    ELIBBAD: 80,
    ELIBSCN: 81,
    ELIBMAX: 82,
    ELIBEXEC: 83,
    ENOSYS: 38,
    ENOTEMPTY: 39,
    ENAMETOOLONG: 36,
    ELOOP: 40,
    EOPNOTSUPP: 95,
    EPFNOSUPPORT: 96,
    ECONNRESET: 104,
    ENOBUFS: 105,
    EAFNOSUPPORT: 97,
    EPROTOTYPE: 91,
    ENOTSOCK: 88,
    ENOPROTOOPT: 92,
    ESHUTDOWN: 108,
    ECONNREFUSED: 111,
    EADDRINUSE: 98,
    ECONNABORTED: 103,
    ENETUNREACH: 101,
    ENETDOWN: 100,
    ETIMEDOUT: 110,
    EHOSTDOWN: 112,
    EHOSTUNREACH: 113,
    EINPROGRESS: 115,
    EALREADY: 114,
    EDESTADDRREQ: 89,
    EMSGSIZE: 90,
    EPROTONOSUPPORT: 93,
    ESOCKTNOSUPPORT: 94,
    EADDRNOTAVAIL: 99,
    ENETRESET: 102,
    EISCONN: 106,
    ENOTCONN: 107,
    ETOOMANYREFS: 109,
    EUSERS: 87,
    EDQUOT: 122,
    ESTALE: 116,
    ENOTSUP: 95,
    ENOMEDIUM: 123,
    EILSEQ: 84,
    EOVERFLOW: 75,
    ECANCELED: 125,
    ENOTRECOVERABLE: 131,
    EOWNERDEAD: 130,
    ESTRPIPE: 86
  };

  function _pthread_key_create(key, destructor) {
    if (key === 0) {
      return ERRNO_CODES.EINVAL;
    }
    HEAP32[key >> 2] = PTHREAD_SPECIFIC_NEXT_KEY;
    PTHREAD_SPECIFIC[PTHREAD_SPECIFIC_NEXT_KEY] = 0;
    PTHREAD_SPECIFIC_NEXT_KEY++;
    return 0;
  }

  function _pthread_mutex_init() {
  }

  var emval_free_list = [];
  var emval_handle_array = [{}, { value: undefined }, { value: null }, { value: true }, { value: false }];

  function __emval_decref(handle) {
    if (handle > 4 && --emval_handle_array[handle].refcount === 0) {
      emval_handle_array[handle] = undefined;
      emval_free_list.push(handle);
    }
  }

  function count_emval_handles() {
    var count = 0;
    for (let i = 5; i < emval_handle_array.length; ++i) {
      if (emval_handle_array[i] !== undefined) {
        ++count;
      }
    }
    return count;
  }

  function get_first_emval() {
    for (let i = 5; i < emval_handle_array.length; ++i) {
      if (emval_handle_array[i] !== undefined) {
        return emval_handle_array[i];
      }
    }
    return null;
  }

  function init_emval() {
    Module['count_emval_handles'] = count_emval_handles;
    Module['get_first_emval'] = get_first_emval;
  }

  function __emval_register(value) {
    switch (value) {
      case undefined: {
        return 1;
      }
      case null: {
        return 2;
      }
      case true: {
        return 3;
      }
      case false: {
        return 4;
      }
      default: {
        const handle = emval_free_list.length ? emval_free_list.pop() : emval_handle_array.length;
        emval_handle_array[handle] = { refcount: 1, value: value };
        return handle;
      }
    }
  }

  function __embind_register_emval(rawType, name) {
    name = readLatin1String(name);
    registerType(rawType, {
      name: name, 'fromWireType': function(handle) {
        var rv = emval_handle_array[handle].value;
        __emval_decref(handle);
        return rv;
      }, 'toWireType': function(destructors, value) {
        return __emval_register(value);
      }, 'argPackAdvance': 8, 'readValueFromPointer': simpleReadValueFromPointer, destructorFunction: null
    });
  }

  function _pthread_setspecific(key, value) {
    if (!(key in PTHREAD_SPECIFIC)) {
      return ERRNO_CODES.EINVAL;
    }
    PTHREAD_SPECIFIC[key] = value;
    return 0;
  }

  function ___cxa_allocate_exception(size) {
    return _malloc(size);
  }

  var SYSCALLS = {
    varargs: 0, get: function(varargs) {
      SYSCALLS.varargs += 4;
      return HEAP32[SYSCALLS.varargs - 4 >> 2];
    }, get64: function() {
      const low = SYSCALLS.get();
      const high = SYSCALLS.get();
      if (low >= 0) assert(high === 0); else assert(high === -1);
      return low;
    }
  };

  function ___syscall54(which, varargs) {
    SYSCALLS.varargs = varargs;
    try {
      return 0;
    } catch (e) {
      if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
      return -e.errno;
    }
  }

  function ___cxa_pure_virtual() {
    ABORT = true;
    throw 'Pure virtual function called!';
  }

  function floatReadValueFromPointer(name, shift) {
    switch (shift) {
      case 2:
        return function(pointer) {
          return this['fromWireType'](HEAPF32[pointer >> 2]);
        };
      case 3:
        return function(pointer) {
          return this['fromWireType'](HEAPF64[pointer >> 3]);
        };
      default:
        throw new TypeError('Unknown float type: ' + name);
    }
  }

  function __embind_register_float(rawType, name, size) {
    var shift = getShiftFromSize(size);
    name = readLatin1String(name);
    registerType(rawType, {
      name: name, 'fromWireType': function(value) {
        return value;
      }, 'toWireType': function(destructors, value) {
        if (typeof value !== 'number' && typeof value !== 'boolean') {
          throw new TypeError('Cannot convert "' + _embind_repr(value) + '" to ' + this.name);
        }
        return value;
      }, 'argPackAdvance': 8, 'readValueFromPointer': floatReadValueFromPointer(name, shift), destructorFunction: null
    });
  }

  function new_(constructor, argumentList) {
    if (!(constructor instanceof Function)) {
      throw new TypeError('new_ called with constructor type ' + typeof constructor + ' which is not a function');
    }
    var dummy = createNamedFunction(constructor.name || 'unknownFunctionName', function() {
    });
    dummy.prototype = constructor.prototype;
    var obj = new dummy();
    var r = constructor.apply(obj, argumentList);
    return r instanceof Object ? r : obj;
  }

  function craftInvokerFunction(humanName, argTypes, classType, cppInvokerFunc, cppTargetFunc) {
    var argCount = argTypes.length;
    if (argCount < 2) {
      throwBindingError("argTypes array size mismatch! Must at least get return value and 'this' types!");
    }
    var isClassMethodFunc = argTypes[1] !== null && classType !== null;
    var needsDestructorStack = false;
    for (let i = 1; i < argTypes.length; ++i) {
      if (argTypes[i] !== null && argTypes[i].destructorFunction === undefined) {
        needsDestructorStack = true;
        break;
      }
    }
    var returns = argTypes[0].name !== 'void';
    var argsList = '';
    var argsListWired = '';
    for (let i = 0; i < argCount - 2; ++i) {
      argsList += (i !== 0 ? ', ' : '') + 'arg' + i;
      argsListWired += (i !== 0 ? ', ' : '') + 'arg' + i + 'Wired';
    }
    var invokerFnBody = 'return function ' + makeLegalFunctionName(humanName) + '(' + argsList + ') {\\n' + 'if (arguments.length !== ' + (argCount - 2) + ') {\\n' + "throwBindingError('function " + humanName + " called with ' + arguments.length + ' arguments, expected " + (argCount - 2) + " args!');\\n" + '}\\n';
    if (needsDestructorStack) {
      invokerFnBody += 'var destructors = [];\\n';
    }
    var dtorStack = needsDestructorStack ? 'destructors' : 'null';
    var args1 = ['throwBindingError', 'invoker', 'fn', 'runDestructors', 'retType', 'classParam'];
    var args2 = [throwBindingError, cppInvokerFunc, cppTargetFunc, runDestructors, argTypes[0], argTypes[1]];
    if (isClassMethodFunc) {
      invokerFnBody += 'var thisWired = classParam.toWireType(' + dtorStack + ', this);\\n';
    }
    for (let i = 0; i < argCount - 2; ++i) {
      invokerFnBody += 'var arg' + i + 'Wired = argType' + i + '.toWireType(' + dtorStack + ', arg' + i + '); // ' + argTypes[i + 2].name + '\\n';
      args1.push('argType' + i);
      args2.push(argTypes[i + 2]);
    }
    if (isClassMethodFunc) {
      argsListWired = 'thisWired' + (argsListWired.length > 0 ? ', ' : '') + argsListWired;
    }
    invokerFnBody += (returns ? 'var rv = ' : '') + 'invoker(fn' + (argsListWired.length > 0 ? ', ' : '') + argsListWired + ');\\n';
    if (needsDestructorStack) {
      invokerFnBody += 'runDestructors(destructors);\\n';
    } else {
      for (let i = isClassMethodFunc ? 1 : 2; i < argTypes.length; ++i) {
        var paramName = i === 1 ? 'thisWired' : 'arg' + (i - 2) + 'Wired';
        if (argTypes[i].destructorFunction !== null) {
          invokerFnBody += paramName + '_dtor(' + paramName + '); // ' + argTypes[i].name + '\\n';
          args1.push(paramName + '_dtor');
          args2.push(argTypes[i].destructorFunction);
        }
      }
    }
    if (returns) {
      invokerFnBody += 'var ret = retType.fromWireType(rv);\\n' + 'return ret;\\n';
    } else {
    }
    invokerFnBody += '}\\n';
    args1.push(invokerFnBody);
    var invokerFunction = new_(Function, args1).apply(null, args2);
    return invokerFunction;
  }

  function ensureOverloadTable(proto, methodName, humanName) {
    if (undefined === proto[methodName].overloadTable) {
      var prevFunc = proto[methodName];
      proto[methodName] = function() {
        if (!proto[methodName].overloadTable.hasOwnProperty(arguments.length)) {
          throwBindingError("Function '" + humanName + "' called with an invalid number of arguments (" + arguments.length + ') - expects one of (' + proto[methodName].overloadTable + ')!');
        }
        return proto[methodName].overloadTable[arguments.length].apply(this, arguments);
      };
      proto[methodName].overloadTable = [];
      proto[methodName].overloadTable[prevFunc.argCount] = prevFunc;
    }
  }

  function exposePublicSymbol(name, value, numArguments) {
    if (Module.hasOwnProperty(name)) {
      if (undefined === numArguments || undefined !== Module[name].overloadTable && undefined !== Module[name].overloadTable[numArguments]) {
        throwBindingError("Cannot register public name '" + name + "' twice");
      }
      ensureOverloadTable(Module, name, name);
      if (Module.hasOwnProperty(numArguments)) {
        throwBindingError('Cannot register multiple overloads of a function with the same number of arguments (' + numArguments + ')!');
      }
      Module[name].overloadTable[numArguments] = value;
    } else {
      Module[name] = value;
      if (undefined !== numArguments) {
        Module[name].numArguments = numArguments;
      }
    }
  }

  function heap32VectorToArray(count, firstElement) {
    var array = [];
    for (let i = 0; i < count; i++) {
      array.push(HEAP32[(firstElement >> 2) + i]);
    }
    return array;
  }

  function replacePublicSymbol(name, value, numArguments) {
    if (!Module.hasOwnProperty(name)) {
      throwInternalError('Replacing nonexistant public symbol');
    }
    if (undefined !== Module[name].overloadTable && undefined !== numArguments) {
      Module[name].overloadTable[numArguments] = value;
    } else {
      Module[name] = value;
      Module[name].argCount = numArguments;
    }
  }

  var UnboundTypeError = undefined;

  function getTypeName(type) {
    var ptr = ___getTypeName(type);
    var rv = readLatin1String(ptr);
    _free(ptr);
    return rv;
  }

  function throwUnboundTypeError(message, types) {
    var unboundTypes = [];
    var seen = {};

    function visit(type) {
      if (seen[type]) {
        return;
      }
      if (registeredTypes[type]) {
        return;
      }
      if (typeDependencies[type]) {
        typeDependencies[type].forEach(visit);
        return;
      }
      unboundTypes.push(type);
      seen[type] = true;
    }

    types.forEach(visit);
    throw new UnboundTypeError(message + ': ' + unboundTypes.map(getTypeName).join([', ']));
  }

  function __embind_register_function(name, argCount, rawArgTypesAddr, signature, rawInvoker, fn) {
    var argTypes = heap32VectorToArray(argCount, rawArgTypesAddr);
    name = readLatin1String(name);
    rawInvoker = requireFunction(signature, rawInvoker);
    exposePublicSymbol(name, function() {
      throwUnboundTypeError('Cannot call ' + name + ' due to unbound types', argTypes);
    }, argCount - 1);
    whenDependentTypesAreResolved([], argTypes, function(argTypes) {
      var invokerArgsArray = [argTypes[0], null].concat(argTypes.slice(1));
      replacePublicSymbol(name, craftInvokerFunction(name, invokerArgsArray, null, rawInvoker, fn), argCount - 1);
      return [];
    });
  }

  function _pthread_join() {
  }

  function _pthread_cond_init() {
    return 0;
  }

  function ___syscall6(which, varargs) {
    SYSCALLS.varargs = varargs;
    try {
      var stream = SYSCALLS.getStreamFromFD();
      FS.close(stream);
      return 0;
    } catch (e) {
      if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
      return -e.errno;
    }
  }

  function ___setErrNo(value) {
    if (Module['___errno_location']) HEAP32[Module['___errno_location']() >> 2] = value;
    return value;
  }

  function _emscripten_memcpy_big(dest, src, num) {
    HEAPU8.set(HEAPU8.subarray(src, src + num), dest);
    return dest;
  }

  function __embind_register_std_wstring(rawType, charSize, name) {
    name = readLatin1String(name);
    var getHeap, shift;
    if (charSize === 2) {
      getHeap = function() {
        return HEAPU16;
      };
      shift = 1;
    } else if (charSize === 4) {
      getHeap = function() {
        return HEAPU32;
      };
      shift = 2;
    }
    registerType(rawType, {
      name: name, 'fromWireType': function(value) {
        var HEAP = getHeap();
        var length = HEAPU32[value >> 2];
        var a = new Array(length);
        var start = value + 4 >> shift;
        for (let i = 0; i < length; ++i) {
          a[i] = String.fromCharCode(HEAP[start + i]);
        }
        _free(value);
        return a.join('');
      }, 'toWireType': function(destructors, value) {
        var HEAP = getHeap();
        var length = value.length;
        var ptr = _malloc(4 + length * charSize);
        HEAPU32[ptr >> 2] = length;
        var start = ptr + 4 >> shift;
        for (let i = 0; i < length; ++i) {
          HEAP[start + i] = value.charCodeAt(i);
        }
        if (destructors !== null) {
          destructors.push(_free, ptr);
        }
        return ptr;
      }, 'argPackAdvance': 8, 'readValueFromPointer': simpleReadValueFromPointer, destructorFunction: function(ptr) {
        _free(ptr);
      }
    });
  }

  function ___cxa_begin_catch(ptr) {
    const info = EXCEPTIONS.infos[ptr];
    if (info && !info.caught) {
      info.caught = true;
      __ZSt18uncaught_exceptionv.uncaught_exception--;
    }
    if (info) info.rethrown = false;
    EXCEPTIONS.caught.push(ptr);
    EXCEPTIONS.addRef(EXCEPTIONS.deAdjust(ptr));
    return ptr;
  }

  function _gettimeofday(ptr) {
    const now = Date.now();
    HEAP32[ptr >> 2] = now / 1e3 | 0;
    HEAP32[ptr + 4 >> 2] = now % 1e3 * 1e3 | 0;
    return 0;
  }

  function _pthread_cond_wait() {
    return 0;
  }

  function __embind_register_memory_view(rawType, dataTypeIndex, name) {
    const typeMapping = [Int8Array, Uint8Array, Int16Array, Uint16Array, Int32Array, Uint32Array, Float32Array, Float64Array];
    const TA = typeMapping[dataTypeIndex];

    function decodeMemoryView(handle) {
      handle = handle >> 2;
      const heap = HEAPU32;
      const size = heap[handle];
      const data = heap[handle + 1];
      return new TA(heap['buffer'], data, size);
    }

    name = readLatin1String(name);
    registerType(rawType, {
      name: name,
      'fromWireType': decodeMemoryView,
      'argPackAdvance': 8,
      'readValueFromPointer': decodeMemoryView
    }, { ignoreDuplicateRegistrations: true });
  }

  function ___syscall140(which, varargs) {
    SYSCALLS.varargs = varargs;
    try {
      const stream = SYSCALLS.getStreamFromFD();
      const offset_low = SYSCALLS.get();
      const result = SYSCALLS.get();
      const whence = SYSCALLS.get();
      const offset = offset_low;
      FS.llseek(stream, offset, whence);
      HEAP32[result >> 2] = stream.position;
      if (stream.getdents && offset === 0 && whence === 0) stream.getdents = null;
      return 0;
    } catch (e) {
      if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
      return -e.errno;
    }
  }

  function ___syscall146(which, varargs) {
    SYSCALLS.varargs = varargs;
    try {
      var stream = SYSCALLS.get();
      var iov = SYSCALLS.get();
      var iovcnt = SYSCALLS.get();
      var ret = 0;
      if (!___syscall146.buffer) {
        ___syscall146.buffers = [null, [], []];
        ___syscall146.printChar = function(stream, curr) {
          var buffer = ___syscall146.buffers[stream];
          assert(buffer);
          if (curr === 0 || curr === 10) {
            (stream === 1 ? Module['print'] : Module['printErr'])(UTF8ArrayToString(buffer, 0));
            buffer.length = 0;
          } else {
            buffer.push(curr);
          }
        };
      }
      for (let i = 0; i < iovcnt; i++) {
        var ptr = HEAP32[iov + i * 8 >> 2];
        var len = HEAP32[iov + (i * 8 + 4) >> 2];
        for (let j = 0; j < len; j++) {
          ___syscall146.printChar(stream, HEAPU8[ptr + j]);
        }
        ret += len;
      }
      return ret;
    } catch (e) {
      if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
      return -e.errno;
    }
  }

  embind_init_charCodes();
  BindingError = Module['BindingError'] = extendError(Error, 'BindingError');
  InternalError = Module['InternalError'] = extendError(Error, 'InternalError');
  init_emval();
  UnboundTypeError = Module['UnboundTypeError'] = extendError(Error, 'UnboundTypeError');
  __ATEXIT__.push(function() {
    var fflush = Module['_fflush'];
    if (fflush) fflush(0);
    var printChar = ___syscall146.printChar;
    if (!printChar) return;
    var buffers = ___syscall146.buffers;
    if (buffers[1].length) printChar(1, 10);
    if (buffers[2].length) printChar(2, 10);
  });
  DYNAMICTOP_PTR = allocate(1, 'i32', ALLOC_STATIC);
  STACK_BASE = STACKTOP = Runtime.alignMemory(STATICTOP);
  STACK_MAX = STACK_BASE + TOTAL_STACK;
  DYNAMIC_BASE = Runtime.alignMemory(STACK_MAX);
  HEAP32[DYNAMICTOP_PTR >> 2] = DYNAMIC_BASE;
  staticSealed = true;
  Module['wasmTableSize'] = 494;
  Module['wasmMaxTableSize'] = 494;

  function invoke_iiiiiiii(index, a1, a2, a3, a4, a5, a6, a7) {
    try {
      return Module['dynCall_iiiiiiii'](index, a1, a2, a3, a4, a5, a6, a7);
    } catch (e) {
      if (typeof e !== 'number' && e !== 'longjmp') throw e;
      Module['setThrew'](1, 0);
    }
  }

  function invoke_viiiii(index, a1, a2, a3, a4, a5) {
    try {
      Module['dynCall_viiiii'](index, a1, a2, a3, a4, a5);
    } catch (e) {
      if (typeof e !== 'number' && e !== 'longjmp') throw e;
      Module['setThrew'](1, 0);
    }
  }

  function invoke_vi(index, a1) {
    try {
      Module['dynCall_vi'](index, a1);
    } catch (e) {
      if (typeof e !== 'number' && e !== 'longjmp') throw e;
      Module['setThrew'](1, 0);
    }
  }

  function invoke_vii(index, a1, a2) {
    try {
      Module['dynCall_vii'](index, a1, a2);
    } catch (e) {
      if (typeof e !== 'number' && e !== 'longjmp') throw e;
      Module['setThrew'](1, 0);
    }
  }

  function invoke_iiiiiii(index, a1, a2, a3, a4, a5, a6) {
    try {
      return Module['dynCall_iiiiiii'](index, a1, a2, a3, a4, a5, a6);
    } catch (e) {
      if (typeof e !== 'number' && e !== 'longjmp') throw e;
      Module['setThrew'](1, 0);
    }
  }

  function invoke_ii(index, a1) {
    try {
      return Module['dynCall_ii'](index, a1);
    } catch (e) {
      if (typeof e !== 'number' && e !== 'longjmp') throw e;
      Module['setThrew'](1, 0);
    }
  }

  function invoke_viiiiiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11) {
    try {
      Module['dynCall_viiiiiiiiiii'](index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11);
    } catch (e) {
      if (typeof e !== 'number' && e !== 'longjmp') throw e;
      Module['setThrew'](1, 0);
    }
  }

  function invoke_iiiiii(index, a1, a2, a3, a4, a5) {
    try {
      return Module['dynCall_iiiiii'](index, a1, a2, a3, a4, a5);
    } catch (e) {
      if (typeof e !== 'number' && e !== 'longjmp') throw e;
      Module['setThrew'](1, 0);
    }
  }

  function invoke_iiii(index, a1, a2, a3) {
    try {
      return Module['dynCall_iiii'](index, a1, a2, a3);
    } catch (e) {
      if (typeof e !== 'number' && e !== 'longjmp') throw e;
      Module['setThrew'](1, 0);
    }
  }

  function invoke_viiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8) {
    try {
      Module['dynCall_viiiiiiii'](index, a1, a2, a3, a4, a5, a6, a7, a8);
    } catch (e) {
      if (typeof e !== 'number' && e !== 'longjmp') throw e;
      Module['setThrew'](1, 0);
    }
  }

  function invoke_viiiiii(index, a1, a2, a3, a4, a5, a6) {
    try {
      Module['dynCall_viiiiii'](index, a1, a2, a3, a4, a5, a6);
    } catch (e) {
      if (typeof e !== 'number' && e !== 'longjmp') throw e;
      Module['setThrew'](1, 0);
    }
  }

  function invoke_viiiiiiiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12, a13) {
    try {
      Module['dynCall_viiiiiiiiiiiii'](index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12, a13);
    } catch (e) {
      if (typeof e !== 'number' && e !== 'longjmp') throw e;
      Module['setThrew'](1, 0);
    }
  }

  function invoke_viiiiiii(index, a1, a2, a3, a4, a5, a6, a7) {
    try {
      Module['dynCall_viiiiiii'](index, a1, a2, a3, a4, a5, a6, a7);
    } catch (e) {
      if (typeof e !== 'number' && e !== 'longjmp') throw e;
      Module['setThrew'](1, 0);
    }
  }

  function invoke_viiiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9) {
    try {
      Module['dynCall_viiiiiiiii'](index, a1, a2, a3, a4, a5, a6, a7, a8, a9);
    } catch (e) {
      if (typeof e !== 'number' && e !== 'longjmp') throw e;
      Module['setThrew'](1, 0);
    }
  }

  function invoke_viiiiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10) {
    try {
      Module['dynCall_viiiiiiiiii'](index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10);
    } catch (e) {
      if (typeof e !== 'number' && e !== 'longjmp') throw e;
      Module['setThrew'](1, 0);
    }
  }

  function invoke_iii(index, a1, a2) {
    try {
      return Module['dynCall_iii'](index, a1, a2);
    } catch (e) {
      if (typeof e !== 'number' && e !== 'longjmp') throw e;
      Module['setThrew'](1, 0);
    }
  }

  function invoke_i(index) {
    try {
      return Module['dynCall_i'](index);
    } catch (e) {
      if (typeof e !== 'number' && e !== 'longjmp') throw e;
      Module['setThrew'](1, 0);
    }
  }

  function invoke_viiiiiiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12) {
    try {
      Module['dynCall_viiiiiiiiiiii'](index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12);
    } catch (e) {
      if (typeof e !== 'number' && e !== 'longjmp') throw e;
      Module['setThrew'](1, 0);
    }
  }

  function invoke_iiiii(index, a1, a2, a3, a4) {
    try {
      return Module['dynCall_iiiii'](index, a1, a2, a3, a4);
    } catch (e) {
      if (typeof e !== 'number' && e !== 'longjmp') throw e;
      Module['setThrew'](1, 0);
    }
  }

  function invoke_viii(index, a1, a2, a3) {
    try {
      Module['dynCall_viii'](index, a1, a2, a3);
    } catch (e) {
      if (typeof e !== 'number' && e !== 'longjmp') throw e;
      Module['setThrew'](1, 0);
    }
  }

  function invoke_v(index) {
    try {
      Module['dynCall_v'](index);
    } catch (e) {
      if (typeof e !== 'number' && e !== 'longjmp') throw e;
      Module['setThrew'](1, 0);
    }
  }

  function invoke_iiiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8) {
    try {
      return Module['dynCall_iiiiiiiii'](index, a1, a2, a3, a4, a5, a6, a7, a8);
    } catch (e) {
      if (typeof e !== 'number' && e !== 'longjmp') throw e;
      Module['setThrew'](1, 0);
    }
  }

  function invoke_viiii(index, a1, a2, a3, a4) {
    try {
      Module['dynCall_viiii'](index, a1, a2, a3, a4);
    } catch (e) {
      if (typeof e !== 'number' && e !== 'longjmp') throw e;
      Module['setThrew'](1, 0);
    }
  }

  Module.asmGlobalArg = {
    'Math': Math,
    'Int8Array': Int8Array,
    'Int16Array': Int16Array,
    'Int32Array': Int32Array,
    'Uint8Array': Uint8Array,
    'Uint16Array': Uint16Array,
    'Uint32Array': Uint32Array,
    'Float32Array': Float32Array,
    'Float64Array': Float64Array,
    'NaN': NaN,
    'Infinity': Infinity
  };
  Module.asmLibraryArg = {
    'abort': abort,
    'assert': assert,
    'enlargeMemory': enlargeMemory,
    'getTotalMemory': getTotalMemory,
    'abortOnCannotGrowMemory': abortOnCannotGrowMemory,
    'invoke_iiiiiiii': invoke_iiiiiiii,
    'invoke_viiiii': invoke_viiiii,
    'invoke_vi': invoke_vi,
    'invoke_vii': invoke_vii,
    'invoke_iiiiiii': invoke_iiiiiii,
    'invoke_ii': invoke_ii,
    'invoke_viiiiiiiiiii': invoke_viiiiiiiiiii,
    'invoke_iiiiii': invoke_iiiiii,
    'invoke_iiii': invoke_iiii,
    'invoke_viiiiiiii': invoke_viiiiiiii,
    'invoke_viiiiii': invoke_viiiiii,
    'invoke_viiiiiiiiiiiii': invoke_viiiiiiiiiiiii,
    'invoke_viiiiiii': invoke_viiiiiii,
    'invoke_viiiiiiiii': invoke_viiiiiiiii,
    'invoke_viiiiiiiiii': invoke_viiiiiiiiii,
    'invoke_iii': invoke_iii,
    'invoke_i': invoke_i,
    'invoke_viiiiiiiiiiii': invoke_viiiiiiiiiiii,
    'invoke_iiiii': invoke_iiiii,
    'invoke_viii': invoke_viii,
    'invoke_v': invoke_v,
    'invoke_iiiiiiiii': invoke_iiiiiiiii,
    'invoke_viiii': invoke_viiii,
    'requireFunction': requireFunction,
    '_pthread_cond_wait': _pthread_cond_wait,
    '_pthread_join': _pthread_join,
    'simpleReadValueFromPointer': simpleReadValueFromPointer,
    'new_': new_,
    '___syscall54': ___syscall54,
    '__embind_register_integer': __embind_register_integer,
    'throwInternalError': throwInternalError,
    'get_first_emval': get_first_emval,
    '_abort': _abort,
    'whenDependentTypesAreResolved': whenDependentTypesAreResolved,
    '___gxx_personality_v0': ___gxx_personality_v0,
    'extendError': extendError,
    '___assert_fail': ___assert_fail,
    '__embind_register_void': __embind_register_void,
    '___cxa_find_matching_catch': ___cxa_find_matching_catch,
    '__embind_register_value_object_field': __embind_register_value_object_field,
    'exposePublicSymbol': exposePublicSymbol,
    '_pthread_cond_init': _pthread_cond_init,
    '__embind_register_function': __embind_register_function,
    'embind_init_charCodes': embind_init_charCodes,
    '___cxa_begin_catch': ___cxa_begin_catch,
    '___setErrNo': ___setErrNo,
    '__emval_register': __emval_register,
    'readLatin1String': readLatin1String,
    '___cxa_allocate_exception': ___cxa_allocate_exception,
    '_emscripten_memcpy_big': _emscripten_memcpy_big,
    '__embind_register_bool': __embind_register_bool,
    '___resumeException': ___resumeException,
    '__ZSt18uncaught_exceptionv': __ZSt18uncaught_exceptionv,
    '_embind_repr': _embind_repr,
    '__embind_register_std_wstring': __embind_register_std_wstring,
    '_pthread_getspecific': _pthread_getspecific,
    '_clock': _clock,
    'createNamedFunction': createNamedFunction,
    '__embind_register_emval': __embind_register_emval,
    '_pthread_cond_signal': _pthread_cond_signal,
    '__embind_finalize_value_object': __embind_finalize_value_object,
    '_pthread_mutex_destroy': _pthread_mutex_destroy,
    'throwUnboundTypeError': throwUnboundTypeError,
    'craftInvokerFunction': craftInvokerFunction,
    '__emval_decref': __emval_decref,
    '_pthread_once': _pthread_once,
    'getShiftFromSize': getShiftFromSize,
    'makeLegalFunctionName': makeLegalFunctionName,
    '_pthread_key_create': _pthread_key_create,
    '___unlock': ___unlock,
    'heap32VectorToArray': heap32VectorToArray,
    'init_emval': init_emval,
    '_pthread_create': _pthread_create,
    'floatReadValueFromPointer': floatReadValueFromPointer,
    '__embind_register_value_object': __embind_register_value_object,
    '_pthread_setspecific': _pthread_setspecific,
    'integerReadValueFromPointer': integerReadValueFromPointer,
    'registerType': registerType,
    '___cxa_throw': ___cxa_throw,
    '___lock': ___lock,
    '___syscall6': ___syscall6,
    'throwBindingError': throwBindingError,
    'ensureOverloadTable': ensureOverloadTable,
    'count_emval_handles': count_emval_handles,
    '_pthread_cond_destroy': _pthread_cond_destroy,
    '__embind_register_float': __embind_register_float,
    '_gettimeofday': _gettimeofday,
    'getTypeName': getTypeName,
    '___syscall140': ___syscall140,
    '_pthread_mutex_init': _pthread_mutex_init,
    '__embind_register_memory_view': __embind_register_memory_view,
    '__embind_register_std_string': __embind_register_std_string,
    'replacePublicSymbol': replacePublicSymbol,
    '___cxa_pure_virtual': ___cxa_pure_virtual,
    '___syscall146': ___syscall146,
    'runDestructors': runDestructors,
    'DYNAMICTOP_PTR': DYNAMICTOP_PTR,
    'tempDoublePtr': tempDoublePtr,
    'ABORT': ABORT,
    'STACKTOP': STACKTOP,
    'STACK_MAX': STACK_MAX
  };
  var asm = Module['asm'](Module.asmGlobalArg, Module.asmLibraryArg, buffer);
  Module['asm'] = asm;
  Module['stackSave'] = function() {
    return Module['asm']['stackSave'].apply(null, arguments);
  };
  Module['_SetIFrameDecInterval'] = function() {
    return Module['asm']['_SetIFrameDecInterval'].apply(null, arguments);
  };
  Module['_CloseStream'] = function() {
    return Module['asm']['_CloseStream'].apply(null, arguments);
  };
  Module['setThrew'] = function() {
    return Module['asm']['setThrew'].apply(null, arguments);
  };
  Module['_GetFrameData'] = function() {
    return Module['asm']['_GetFrameData'].apply(null, arguments);
  };
  Module['_sbrk'] = function() {
    return Module['asm']['_sbrk'].apply(null, arguments);
  };
  Module['_fflush'] = function() {
    return Module['asm']['_fflush'].apply(null, arguments);
  };
  Module['___cxa_is_pointer_type'] = function() {
    return Module['asm']['___cxa_is_pointer_type'].apply(null, arguments);
  };
  Module['_memset'] = function() {
    return Module['asm']['_memset'].apply(null, arguments);
  };
  Module['_SetDisplayRegion'] = function() {
    return Module['asm']['_SetDisplayRegion'].apply(null, arguments);
  };
  Module['_memcpy'] = function() {
    return Module['asm']['_memcpy'].apply(null, arguments);
  };
  Module['_llvm_bswap_i32'] = function() {
    return Module['asm']['_llvm_bswap_i32'].apply(null, arguments);
  };
  Module['stackAlloc'] = function() {
    return Module['asm']['stackAlloc'].apply(null, arguments);
  };
  Module['getTempRet0'] = function() {
    return Module['asm']['getTempRet0'].apply(null, arguments);
  };
  const __GLOBAL__sub_I_bind_cpp = Module['__GLOBAL__sub_I_bind_cpp'] = function() {
    return Module['asm']['__GLOBAL__sub_I_bind_cpp'].apply(null, arguments);
  };
  Module['setTempRet0'] = function() {
    return Module['asm']['setTempRet0'].apply(null, arguments);
  };
  Module['_SetSecretKey'] = function() {
    return Module['asm']['_SetSecretKey'].apply(null, arguments);
  };
  Module['_pthread_mutex_unlock'] = function() {
    return Module['asm']['_pthread_mutex_unlock'].apply(null, arguments);
  };
  const __GLOBAL__sub_I_Decoder_cpp = Module['__GLOBAL__sub_I_Decoder_cpp'] = function() {
    return Module['asm']['__GLOBAL__sub_I_Decoder_cpp'].apply(null, arguments);
  };
  Module['_emscripten_get_global_libc'] = function() {
    return Module['asm']['_emscripten_get_global_libc'].apply(null, arguments);
  };
  Module['_InputData'] = function() {
    return Module['asm']['_InputData'].apply(null, arguments);
  };
  const ___getTypeName = Module['___getTypeName'] = function() {
    return Module['asm']['___getTypeName'].apply(null, arguments);
  };
  Module['_GetJPEG'] = function() {
    return Module['asm']['_GetJPEG'].apply(null, arguments);
  };
  Module['_OpenStream'] = function() {
    return Module['asm']['_OpenStream'].apply(null, arguments);
  };
  Module['_GetBMP'] = function() {
    return Module['asm']['_GetBMP'].apply(null, arguments);
  };
  Module['_pthread_cond_broadcast'] = function() {
    return Module['asm']['_pthread_cond_broadcast'].apply(null, arguments);
  };
  Module['___errno_location'] = function() {
    return Module['asm']['___errno_location'].apply(null, arguments);
  };
  Module['runPostSets'] = function() {
    return Module['asm']['runPostSets'].apply(null, arguments);
  };
  Module['___cxa_can_catch'] = function() {
    return Module['asm']['___cxa_can_catch'].apply(null, arguments);
  };
  const _free = Module['_free'] = function() {
    return Module['asm']['_free'].apply(null, arguments);
  };
  Module['_GetFrameBuffer'] = function() {
    return Module['asm']['_GetFrameBuffer'].apply(null, arguments);
  };
  Module['establishStackSpace'] = function() {
    return Module['asm']['establishStackSpace'].apply(null, arguments);
  };
  Module['_memmove'] = function() {
    return Module['asm']['_memmove'].apply(null, arguments);
  };
  Module['_SetStreamOpenMode'] = function() {
    return Module['asm']['_SetStreamOpenMode'].apply(null, arguments);
  };
  Module['stackRestore'] = function() {
    return Module['asm']['stackRestore'].apply(null, arguments);
  };
  var _malloc = Module['_malloc'] = function() {
    return Module['asm']['_malloc'].apply(null, arguments);
  };
  Module['_pthread_mutex_lock'] = function() {
    return Module['asm']['_pthread_mutex_lock'].apply(null, arguments);
  };
  Module['_SetDecodeFrameType'] = function() {
    return Module['asm']['_SetDecodeFrameType'].apply(null, arguments);
  };
  Module['_Stop'] = function() {
    return Module['asm']['_Stop'].apply(null, arguments);
  };
  Module['dynCall_iiiiiiii'] = function() {
    return Module['asm']['dynCall_iiiiiiii'].apply(null, arguments);
  };
  Module['dynCall_viiiii'] = function() {
    return Module['asm']['dynCall_viiiii'].apply(null, arguments);
  };
  Module['dynCall_vi'] = function() {
    return Module['asm']['dynCall_vi'].apply(null, arguments);
  };
  Module['dynCall_vii'] = function() {
    return Module['asm']['dynCall_vii'].apply(null, arguments);
  };
  Module['dynCall_iiiiiii'] = function() {
    return Module['asm']['dynCall_iiiiiii'].apply(null, arguments);
  };
  Module['dynCall_ii'] = function() {
    return Module['asm']['dynCall_ii'].apply(null, arguments);
  };
  Module['dynCall_viiiiiiiiiii'] = function() {
    return Module['asm']['dynCall_viiiiiiiiiii'].apply(null, arguments);
  };
  Module['dynCall_iiiiii'] = function() {
    return Module['asm']['dynCall_iiiiii'].apply(null, arguments);
  };
  Module['dynCall_iiii'] = function() {
    return Module['asm']['dynCall_iiii'].apply(null, arguments);
  };
  Module['dynCall_viiiiiiii'] = function() {
    return Module['asm']['dynCall_viiiiiiii'].apply(null, arguments);
  };
  Module['dynCall_viiiiii'] = function() {
    return Module['asm']['dynCall_viiiiii'].apply(null, arguments);
  };
  Module['dynCall_viiiiiiiiiiiii'] = function() {
    return Module['asm']['dynCall_viiiiiiiiiiiii'].apply(null, arguments);
  };
  Module['dynCall_viiiiiii'] = function() {
    return Module['asm']['dynCall_viiiiiii'].apply(null, arguments);
  };
  Module['dynCall_viiiiiiiii'] = function() {
    return Module['asm']['dynCall_viiiiiiiii'].apply(null, arguments);
  };
  Module['dynCall_viiiiiiiiii'] = function() {
    return Module['asm']['dynCall_viiiiiiiiii'].apply(null, arguments);
  };
  Module['dynCall_iii'] = function() {
    return Module['asm']['dynCall_iii'].apply(null, arguments);
  };
  Module['dynCall_i'] = function() {
    return Module['asm']['dynCall_i'].apply(null, arguments);
  };
  Module['dynCall_viiiiiiiiiiii'] = function() {
    return Module['asm']['dynCall_viiiiiiiiiiii'].apply(null, arguments);
  };
  Module['dynCall_iiiii'] = function() {
    return Module['asm']['dynCall_iiiii'].apply(null, arguments);
  };
  Module['dynCall_viii'] = function() {
    return Module['asm']['dynCall_viii'].apply(null, arguments);
  };
  Module['dynCall_v'] = function() {
    return Module['asm']['dynCall_v'].apply(null, arguments);
  };
  Module['dynCall_iiiiiiiii'] = function() {
    return Module['asm']['dynCall_iiiiiiiii'].apply(null, arguments);
  };
  Module['dynCall_viiii'] = function() {
    return Module['asm']['dynCall_viiii'].apply(null, arguments);
  };
  Runtime.stackAlloc = Module['stackAlloc'];
  Runtime.stackSave = Module['stackSave'];
  Runtime.stackRestore = Module['stackRestore'];
  Runtime.establishStackSpace = Module['establishStackSpace'];
  Runtime.setTempRet0 = Module['setTempRet0'];
  Runtime.getTempRet0 = Module['getTempRet0'];
  Module['asm'] = asm;
  if (memoryInitializer) {
    if (typeof Module['locateFile'] === 'function') {
      memoryInitializer = Module['locateFile'](memoryInitializer);
    } else if (Module['memoryInitializerPrefixURL']) {
      memoryInitializer = Module['memoryInitializerPrefixURL'] + memoryInitializer;
    }
    if (ENVIRONMENT_IS_NODE) {
      var data = Module['readBinary'](memoryInitializer);
      HEAPU8.set(data, Runtime.GLOBAL_BASE);
    } else {
      addRunDependency('memory initializer');
      const applyMemoryInitializer = function(data) {
        if (data.byteLength) data = new Uint8Array(data);
        HEAPU8.set(data, Runtime.GLOBAL_BASE);
        if (Module['memoryInitializerRequest']) delete Module['memoryInitializerRequest'].response;
        removeRunDependency('memory initializer');
      };

      function doBrowserLoad() {
        Module['readAsync'](memoryInitializer, applyMemoryInitializer, function() {
          throw 'could not load memory initializer ' + memoryInitializer;
        });
      }

      if (Module['memoryInitializerRequest']) {
        function useRequest() {
          var request = Module['memoryInitializerRequest'];
          if (request.status !== 200 && request.status !== 0) {
            console.warn('a problem seems to have happened with Module.memoryInitializerRequest, status: ' + request.status + ', retrying ' + memoryInitializer);
            doBrowserLoad();
            return;
          }
          applyMemoryInitializer(request.response);
        }

        if (Module['memoryInitializerRequest'].response) {
          setTimeout(useRequest, 0);
        } else {
          Module['memoryInitializerRequest'].addEventListener('load', useRequest);
        }
      } else {
        doBrowserLoad();
      }
    }
  }

  function ExitStatus(status) {
    this.name = 'ExitStatus';
    this.message = 'Program terminated with exit(' + status + ')';
    this.status = status;
  }

  ExitStatus.prototype = new Error();
  ExitStatus.prototype.constructor = ExitStatus;
  var initialStackTop;
  var preloadStartTime = null;
  var calledMain = false;
  dependenciesFulfilled = function runCaller() {
    if (!Module['calledRun']) run();
    if (!Module['calledRun']) dependenciesFulfilled = runCaller;
  };
  Module['callMain'] = Module.callMain = function callMain(args) {
    args = args || [];
    ensureInitRuntime();
    var argc = args.length + 1;

    function pad() {
      for (let i = 0; i < 4 - 1; i++) {
        argv.push(0);
      }
    }

    var argv = [allocate(intArrayFromString(Module['thisProgram']), 'i8', ALLOC_NORMAL)];
    pad();
    for (let i = 0; i < argc - 1; i = i + 1) {
      argv.push(allocate(intArrayFromString(args[i]), 'i8', ALLOC_NORMAL));
      pad();
    }
    argv.push(0);
    argv = allocate(argv, 'i32', ALLOC_NORMAL);
    try {
      var ret = Module['_main'](argc, argv, 0);
      exit(ret, true);
    } catch (e) {
      if (e instanceof ExitStatus) {
      } else if (e === 'SimulateInfiniteLoop') {
        Module['noExitRuntime'] = true;
      } else {
        var toLog = e;
        if (e && typeof e === 'object' && e.stack) {
          toLog = [e, e.stack];
        }
        Module.printErr('exception thrown: ' + toLog);
        Module['quit'](1, e);
      }
    } finally {
      calledMain = true;
    }
  };

  function run(args) {
    args = args || Module['arguments'];
    if (preloadStartTime === null) preloadStartTime = Date.now();
    if (runDependencies > 0) {
      return;
    }
    preRun();
    if (runDependencies > 0) return;
    if (Module['calledRun']) return;

    function doRun() {
      if (Module['calledRun']) return;
      Module['calledRun'] = true;
      if (ABORT) return;
      ensureInitRuntime();
      preMain();
      if (Module['onRuntimeInitialized']) Module['onRuntimeInitialized']();
      if (Module['_main'] && shouldRunNow) Module['callMain'](args);
      postRun();
    }

    if (Module['setStatus']) {
      Module['setStatus']('Running...');
      setTimeout(function() {
        setTimeout(function() {
          Module['setStatus']('');
        }, 1);
        doRun();
      }, 1);
    } else {
      doRun();
    }
  }

  Module['run'] = Module.run = run;

  function exit(status, implicit) {
    if (implicit && Module['noExitRuntime']) {
      return;
    }
    if (Module['noExitRuntime']) {
    } else {
      ABORT = true;
      EXITSTATUS = status;
      STACKTOP = initialStackTop;
      exitRuntime();
      if (Module['onExit']) Module['onExit'](status);
    }
    if (ENVIRONMENT_IS_NODE) {
      process['exit'](status);
    }
    Module['quit'](status, new ExitStatus(status));
  }

  Module['exit'] = Module.exit = exit;
  const abortDecorators = [];

  function abort(what) {
    if (Module['onAbort']) {
      Module['onAbort'](what);
    }
    if (what !== undefined) {
      Module.print(what);
      Module.printErr(what);
      what = JSON.stringify(what);
    } else {
      what = '';
    }
    ABORT = true;
    EXITSTATUS = 1;
    var extra = '\\nIf this abort() is unexpected, build with -s ASSERTIONS=1 which can give more information.';
    var output = 'abort(' + what + ') at ' + stackTrace() + extra;
    if (abortDecorators) {
      abortDecorators.forEach(function(decorator) {
        output = decorator(output, what);
      });
    }
    throw output;
  }

  Module['abort'] = Module.abort = abort;
  if (Module['preInit']) {
    if (typeof Module['preInit'] === 'function') Module['preInit'] = [Module['preInit']];
    while (Module['preInit'].length > 0) {
      Module['preInit'].pop()();
    }
  }
  var shouldRunNow = true;
  if (Module['noInitialRun']) {
    shouldRunNow = false;
  }
  run();

  Module.postRun.push(function() {
    ${postMessage}({ 'function': 'loaded' });
  });

  var iStreamMode = 0; // 流模式

  var bOpenMode = false;
  var bOpenStream = false;

  var funGetFrameData = null;

  ${isBrowser ? 'onmessage' : 'parentPort.onmessage'} = function(event) {
    var eventData = event.data;
    var res = 0;
    switch (eventData.command) {
      case 'setWasmPath':
        console.log(eventData.data);
        Module['wasmBinaryFile'] = eventData.data;
        break;
      case 'SetStreamOpenMode':
        iStreamMode = eventData.data;
        res = Module._SetStreamOpenMode(iStreamMode);
        if (res !== HK_TRUE) {
          ${postMessage}({ 'function': 'SetStreamOpenMode', 'errorCode': res });
          return;
        }
        bOpenMode = true;
        break;

      case 'OpenStream':
        var iHeadLen = eventData.dataSize;
        var pHead = Module._malloc(iHeadLen + 4);
        if (pHead === null) {
          return;
        }
        var aHead = Module.HEAPU8.subarray(pHead, pHead + iHeadLen);
        console.log(eventData.data);
        aHead.set(eventData.data);

        res = Module._OpenStream(pHead, iHeadLen, eventData.bufPoolSize);
        ${postMessage}({ 'function': 'OpenStream', 'errorCode': res });
        if (res !== HK_TRUE) {
          // 释放内存
          Module._free(pHead);
          pHead = null;
          return;
        }
        bOpenStream = true;

        // 加4字节长度信息
        var a32 = new Uint32Array([iHeadLen]);
        var a8 = new Uint8Array(a32.buffer);
        var tempBuf = new Uint8Array(iHeadLen + 4);
        tempBuf.set(a8, 0);
        tempBuf.set(eventData.data, 4);
        a32 = null;
        a8 = null;

        aHead = Module.HEAPU8.subarray(pHead, pHead + iHeadLen + 4);
        aHead.set(tempBuf);
        tempBuf = null;

        res = Module._InputData(pHead, iHeadLen + 4);
        if (res !== HK_TRUE) {
          ${postMessage}({ 'function': 'InputData', 'errorCode': res });
          Module._free(pHead);
          pHead = null;
          return;
        }

        // 释放内存
        Module._free(pHead);
        pHead = null;

        if (funGetFrameData === null) {
          funGetFrameData = Module.cwrap('GetFrameData', 'number');
        }

        if (iStreamMode === 0) {
          // Module._GetFrameData();
          funGetFrameData();
        }
        break;

      case 'InputData':
        // 接收到的数据
        var iLen = eventData.dataSize;
        // console.log("DecodeWorker-InputData-len:%d", iLen);

        if (iLen > 0) {
          var pInputData = Module._malloc(iLen);
          if (pInputData === null) {
            return;
          }
          var inputData = new Uint8Array(eventData.data);
          // var aInputData = Module.HEAPU8.subarray(pInputData, pInputData + iLen);
          // aInputData.set(inputData);
          Module.writeArrayToMemory(inputData, pInputData);
          inputData = null;

          res = Module._InputData(pInputData, iLen);
          // console.log("DecodeWorker-InputData-ret:%d", res);
          if (res !== HK_TRUE) {
            if (res === 98) {
              res = 1;
            }
            ${postMessage}({ 'function': 'InputData', 'errorCode': res });
          }
          Module._free(pInputData);
          pData = null;
        }

        /// //////////////////
        if (funGetFrameData === null) {
          funGetFrameData = Module.cwrap('GetFrameData', 'number');
        }

        while (bOpenMode && bOpenStream) {
          var ret = getFrameData(funGetFrameData);
          // var ret = getFrameData();

          // 直到获取视频帧或数据不足为止
          if (PLAYM4_VIDEO_FRAME === ret || PLAYM4_NEED_MORE_DATA === ret) {
            break;
          }
        }
        break;

      case 'SetSecretKey':
        var keyLen = eventData.nKeyLen;
        var pKeyData = Module._malloc(keyLen);
        if (pKeyData === null) {
          return;
        }
        var nKeySize = eventData.data.length;
        var bufData = stringToBytes(eventData.data);
        var aKeyData = Module.HEAPU8.subarray(pKeyData, pKeyData + keyLen);
        aKeyData.set(new Uint8Array(bufData));

        res = Module._SetSecretKey(eventData.nKeyType, pKeyData, keyLen, nKeySize);
        if (res !== HK_TRUE) {
          ${postMessage}({ 'function': 'SetSecretKey', 'errorCode': res });
          Module._free(pKeyData);
          pKeyData = null;
          return;
        }

        Module._free(pKeyData);
        pKeyData = null;
        break;

      case 'GetBMP':
        var nBMPWidth = eventData.width;
        var nBMPHeight = eventData.height;
        var pYUVData = eventData.data;
        var nYUVSize = nBMPWidth * nBMPHeight * 3 / 2;
        var oBMPCropRect = eventData.rect;

        var pDataYUV = Module._malloc(nYUVSize);
        if (pDataYUV === null) {
          return;
        }

        Module.writeArrayToMemory(new Uint8Array(pYUVData, 0, nYUVSize), pDataYUV);

        // 分配BMP空间
        var nBmpSize = nBMPWidth * nBMPHeight * 4 + 60;
        var pBmpData = Module._malloc(nBmpSize);
        var pBmpSize = Module._malloc(4);
        if (pBmpData === null || pBmpSize === null) {
          Module._free(pDataYUV);
          pDataYUV = null;

          if (pBmpData != null) {
            Module._free(pBmpData);
            pBmpData = null;
          }

          if (pBmpSize != null) {
            Module._free(pBmpSize);
            pBmpSize = null;
          }
          return;
        }

        Module._memset(pBmpSize, nBmpSize, 4); // 防止bmp截图出现输入数据过大的错误码

        res = Module._GetBMP(pDataYUV, nYUVSize, pBmpData, pBmpSize,
            oBMPCropRect.left, oBMPCropRect.top, oBMPCropRect.right, oBMPCropRect.bottom);
        if (res !== HK_TRUE) {
          ${postMessage}({ 'function': 'GetBMP', 'errorCode': res });
          Module._free(pDataYUV);
          pDataYUV = null;
          Module._free(pBmpData);
          pBmpData = null;
          Module._free(pBmpSize);
          pBmpSize = null;
          return;
        }

        // 获取BMP图片大小
        var nBmpDataSize = Module.getValue(pBmpSize, 'i32');

        // 获取BMP图片数据
        var aBmpData = new Uint8Array(nBmpDataSize);
        aBmpData.set(Module.HEAPU8.subarray(pBmpData, pBmpData + nBmpDataSize));

        ${postMessage}({ 'function': 'GetBMP', 'data': aBmpData, 'errorCode': res }, [aBmpData.buffer]);

        if (pDataYUV != null) {
          Module._free(pDataYUV);
          pDataYUV = null;
        }
        if (pBmpData != null) {
          Module._free(pBmpData);
          pBmpData = null;
        }
        if (pBmpSize != null) {
          Module._free(pBmpSize);
          pBmpSize = null;
        }
        break;

      case 'GetJPEG':
        var nJpegWidth = eventData.width;
        var nJpegHeight = eventData.height;
        var pYUVData1 = eventData.data;
        var nYUVSize1 = nJpegWidth * nJpegHeight * 3 / 2;
        var oJpegCropRect = eventData.rect;

        var pDataYUV1 = Module._malloc(nYUVSize1);
        if (pDataYUV1 === null) {
          return;
        }

        Module.writeArrayToMemory(new Uint8Array(pYUVData1, 0, nYUVSize1), pDataYUV1);

        // 分配JPEG空间
        var pJpegData = Module._malloc(nYUVSize1);
        var pJpegSize = Module._malloc(4);
        if (pJpegData === null || pJpegSize === null) {
          if (pJpegData != null) {
            Module._free(pJpegData);
            pJpegData = null;
          }

          if (pJpegSize != null) {
            Module._free(pJpegSize);
            pJpegSize = null;
          }

          if (pDataYUV1 != null) {
            Module._free(pDataYUV1);
            pDataYUV1 = null;
          }
          return;
        }

        Module.setValue(pJpegSize, nJpegWidth * nJpegHeight * 2, 'i32'); // JPEG抓图，输入缓冲长度不小于当前帧YUV大小

        res = Module._GetJPEG(pDataYUV1, nYUVSize1, pJpegData, pJpegSize,
            oJpegCropRect.left, oJpegCropRect.top, oJpegCropRect.right, oJpegCropRect.bottom);
        if (res !== HK_TRUE) {
          ${postMessage}({ 'function': 'GetJPEG', 'errorCode': res });
          if (pJpegData != null) {
            Module._free(pJpegData);
            pJpegData = null;
          }

          if (pJpegSize != null) {
            Module._free(pJpegSize);
            pJpegSize = null;
          }

          if (pDataYUV1 != null) {
            Module._free(pDataYUV1);
            pDataYUV1 = null;
          }
          return;
        }

        // 获取JPEG图片大小
        var nJpegSize = Module.getValue(pJpegSize, 'i32');

        // 获取JPEG图片数据
        var aJpegData = new Uint8Array(nJpegSize);
        aJpegData.set(Module.HEAPU8.subarray(pJpegData, pJpegData + nJpegSize));

        ${postMessage}({ 'function': 'GetJPEG', 'data': aJpegData, 'errorCode': res }, [aJpegData.buffer]);

        ajpegSizeData = null;
        aJpegData = null;

        if (pDataYUV1 != null) {
          Module._free(pDataYUV1);
          pDataYUV1 = null;
        }
        if (pJpegData != null) {
          Module._free(pJpegData);
          pJpegData = null;
        }
        if (pJpegSize != null) {
          Module._free(pJpegSize);
          pJpegSize = null;
        }
        break;

      case 'SetDecodeFrameType':
        var nFrameType = eventData.data;
        res = Module._SetDecodeFrameType(nFrameType);
        if (res !== HK_TRUE) {
          ${postMessage}({ 'function': 'SetDecodeFrameType', 'errorCode': res });
        }
        break;

      case 'DisplayRegion':
        var nRegionNum = eventData.nRegionNum;
        var srcRect = eventData.srcRect;
        var hDestWnd = eventData.hDestWnd;
        var bEnable = eventData.bEnable;

        res = Module._SetDisplayRegion(nRegionNum, srcRect, hDestWnd, bEnable);
        if (res !== HK_TRUE) {
          ${postMessage}({ 'function': 'DisplayRegion', 'errorCode': res });
        }
        break;

      case 'CloseStream':
        res = Module._CloseStream();
        if (res !== HK_TRUE) {
          ${postMessage}({ 'function': 'CloseStream', 'errorCode': res });
        }
        break;

      case 'SetIFrameDecInterval':
        Module._SetIFrameDecInterval(eventData.data);
        break;

      default:
        break;
    }
  };

  function getOSDTime(oFrameInfo) {
    var iYear = oFrameInfo.year;
    var iMonth = oFrameInfo.month;
    var iDay = oFrameInfo.day;
    var iHour = oFrameInfo.hour;
    var iMinute = oFrameInfo.minute;
    var iSecond = oFrameInfo.second;

    if (iMonth < 10) {
      iMonth = '0' + iMonth;
    }
    if (iDay < 10) {
      iDay = '0' + iDay;
    }
    if (iHour < 10) {
      iHour = '0' + iHour;
    }
    if (iMinute < 10) {
      iMinute = '0' + iMinute;
    }
    if (iSecond < 10) {
      iSecond = '0' + iSecond;
    }

    return iYear + '-' + iMonth + '-' + iDay + ' ' + iHour + ':' + iMinute + ':' + iSecond;
  }

  // 获取帧数据
  function getFrameData(fun) {
    // function getFrameData() {
    // 获取帧数据
    // var res = Module._GetFrameData();
    var res = fun();

    if (res === HK_TRUE) {
      var oFrameInfo = Module._GetFrameInfo();
      // console.log("getFrameData-ok:%d %d %d %d %d %d \\n", oFrameInfo.year, oFrameInfo.month, oFrameInfo.day, oFrameInfo.hour, oFrameInfo.minute, oFrameInfo.second);

      switch (oFrameInfo.frameType) {
        case AUDIO_TYPE:
          var iSize = oFrameInfo.frameSize;
          if (iSize === 0) {
            return -1;
          }

          var pPCM = Module._GetFrameBuffer();
          // var audioBuf = new ArrayBuffer(iSize);
          var aPCMData = new Uint8Array(iSize);
          aPCMData.set(Module.HEAPU8.subarray(pPCM, pPCM + iSize));

          ${postMessage}({
            'function': 'GetFrameData',
            'type': 'audioType',
            'data': aPCMData.buffer,
            'frameInfo': oFrameInfo,
            'errorCode': res
          }, [aPCMData.buffer]);

          oFrameInfo = null;
          pPCM = null;
          audioBuf = null;
          aPCMData = null;
          return PLAYM4_AUDIO_FRAME;

        case VIDEO_TYPE:
          var szOSDTime = getOSDTime(oFrameInfo);

          var iWidth = oFrameInfo.width;
          var iHeight = oFrameInfo.height;

          var iYUVSize = iWidth * iHeight * 3 / 2;
          if (iYUVSize === 0) {
            return -1;
          }

          let pYUV = Module._GetFrameBuffer();

          // 图像数据渲染后压回，若从主码流切到子码流，存在数组大小与图像大小不匹配现象
          let aYUVData = new Uint8Array(iYUVSize);
          aYUVData.set(Module.HEAPU8.subarray(pYUV, pYUV + iYUVSize));

          ${postMessage}({
            'function': 'GetFrameData',
            'type': 'videoType',
            'data': aYUVData.buffer,
            'dataLen': aYUVData.length,
            'osd': szOSDTime,
            'frameInfo': oFrameInfo,
            'errorCode': res
          }, [aYUVData.buffer]);

          oFrameInfo = null;
          pYUV = null;
          buf = null;
          aYUVData = null;
          return PLAYM4_VIDEO_FRAME;

        case PRIVT_TYPE:
          ${postMessage}({
            'function': 'GetFrameData',
            'type': '',
            'data': null,
            'dataLen': -1,
            'osd': 0,
            'frameInfo': null,
            'errorCode': PLAYM4_SYS_NOT_SUPPORT
          });
          return PLAYM4_SYS_NOT_SUPPORT;

        default:
          ${postMessage}({
            'function': 'GetFrameData',
            'type': '',
            'data': null,
            'dataLen': -1,
            'osd': 0,
            'frameInfo': null,
            'errorCode': PLAYM4_SYS_NOT_SUPPORT
          });
          return PLAYM4_SYS_NOT_SUPPORT;
      }
    } else {
      if (PLAYM4_NEED_MORE_DATA === res || PLAYM4_SYS_NOT_SUPPORT === res) {
        ${postMessage}({
          'function': 'GetFrameData',
          'type': '',
          'data': null,
          'dataLen': -1,
          'osd': 0,
          'frameInfo': null,
          'errorCode': res
        });
      }

      return res;
    }
  }

  function stringToBytes(str) {
    let ch;
    let st;
    let re = [];
    for (let i = 0; i < str.length; i++) {
      ch = str.charCodeAt(i); // get char
      st = []; // set up "stack"
      do {
        st.push(ch & 0xFF); // push byte to stack
        ch = ch >> 8; // shift value down by 1 byte
      }
      while (ch);
      // add stack contents to result
      // done because chars have "wrong" endianness
      re = re.concat(st.reverse());
    }
    // return an array of bytes
    return re;
  }
})();
`;
}