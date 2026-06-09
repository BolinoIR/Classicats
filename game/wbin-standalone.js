var Module = typeof Module !== "undefined" ? Module : {};
var moduleOverrides = {};
var key;
for (key in Module) {if (Module.hasOwnProperty(key)) {moduleOverrides[key] = Module[key]}}
var arguments_ = [];
var thisProgram = "./this.program";
var quit_ = function(status, toThrow) {throw toThrow};
var ENVIRONMENT_IS_WEB = false;
var ENVIRONMENT_IS_WORKER = false;
var ENVIRONMENT_IS_NODE = false;
var ENVIRONMENT_HAS_NODE = false;
var ENVIRONMENT_IS_SHELL = false;
ENVIRONMENT_IS_WEB = typeof window === "object";
ENVIRONMENT_IS_WORKER = typeof importScripts === "function";
ENVIRONMENT_HAS_NODE = typeof process === "object" && typeof process.versions === "object" && typeof process.versions.node === "string";
ENVIRONMENT_IS_NODE = ENVIRONMENT_HAS_NODE && !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_WORKER;
ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;
var scriptDirectory = "";

function locateFile (path) {
  if (Module["locateFile"]) {return Module["locateFile"](path, scriptDirectory)}
  return scriptDirectory + path
}

var read_, readAsync, readBinary, setWindowTitle;
if (ENVIRONMENT_IS_NODE) {
  scriptDirectory = __dirname + "/";
  var nodeFS;
  var nodePath;
  read_ = function shell_read (filename, binary) {
    var ret;
    if (!nodeFS) nodeFS = require("fs");
    if (!nodePath) nodePath = require("path");
    filename = nodePath["normalize"](filename);
    ret = nodeFS["readFileSync"](filename);
    return binary ? ret : ret.toString()
  };
  readBinary = function readBinary (filename) {
    var ret = read_(filename, true);
    if (!ret.buffer) {ret = new Uint8Array(ret)}
    assert(ret.buffer);
    return ret
  };
  if (process["argv"].length > 1) {thisProgram = process["argv"][1].replace(/\\/g, "/")}
  arguments_ = process["argv"].slice(2);
  if (typeof module !== "undefined") {module["exports"] = Module}
  process["on"]("uncaughtException", function(ex) {if (!(ex instanceof ExitStatus)) {throw ex}});
  process["on"]("unhandledRejection", abort);
  quit_ = function(status) {process["exit"](status)};
  Module["inspect"] = function() {return "[Emscripten Module object]"}
} else if (ENVIRONMENT_IS_SHELL) {
  if (typeof read != "undefined") {read_ = function shell_read (f) {return read(f)}}
  readBinary = function readBinary (f) {
    var data;
    if (typeof readbuffer === "function") {return new Uint8Array(readbuffer(f))}
    data = read(f, "binary");
    assert(typeof data === "object");
    return data
  };
  if (typeof scriptArgs != "undefined") {arguments_ = scriptArgs} else if (typeof arguments != "undefined") {arguments_ = arguments}
  if (typeof quit === "function") {quit_ = function(status) {quit(status)}}
  if (typeof print !== "undefined") {
    if (typeof console === "undefined") console = {};
    console.log = print;
    console.warn = console.error = typeof printErr !== "undefined" ? printErr : print
  }
} else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
  if (ENVIRONMENT_IS_WORKER) {scriptDirectory = self.location.href} else if (document.currentScript) {scriptDirectory = document.currentScript.src}
  if (scriptDirectory.indexOf("blob:") !== 0) {scriptDirectory = scriptDirectory.substr(0, scriptDirectory.lastIndexOf("/") + 1)} else {scriptDirectory = ""}
  read_ = function shell_read (url) {
    var xhr = new XMLHttpRequest;
    xhr.open("GET", url, false);
    xhr.send(null);
    return xhr.responseText
  };
  if (ENVIRONMENT_IS_WORKER) {
    readBinary = function readBinary (url) {
      var xhr = new XMLHttpRequest;
      xhr.open("GET", url, false);
      xhr.responseType = "arraybuffer";
      xhr.send(null);
      return new Uint8Array(xhr.response)
    }
  }
  readAsync = function readAsync (url, onload, onerror) {
    var xhr = new XMLHttpRequest;
    xhr.open("GET", url, true);
    xhr.responseType = "arraybuffer";
    xhr.onload = function xhr_onload () {
      if (xhr.status == 200 || xhr.status == 0 && xhr.response) {
        onload(xhr.response);
        return
      }
      onerror()
    };
    xhr.onerror = onerror;
    xhr.send(null)
  };
  setWindowTitle = function(title) {document.title = title}
} else {}
var out = Module["print"] || console.log.bind(console);
var err = Module["printErr"] || console.warn.bind(console);
for (key in moduleOverrides) {if (moduleOverrides.hasOwnProperty(key)) {Module[key] = moduleOverrides[key]}}
moduleOverrides = null;
if (Module["arguments"]) arguments_ = Module["arguments"];
if (Module["thisProgram"]) thisProgram = Module["thisProgram"];
if (Module["quit"]) quit_ = Module["quit"];

function dynamicAlloc (size) {
  var ret = HEAP32[DYNAMICTOP_PTR >> 2];
  var end = ret + size + 15 & -16;
  if (end > _emscripten_get_heap_size()) {abort()}
  HEAP32[DYNAMICTOP_PTR >> 2] = end;
  return ret
}

function getNativeTypeSize (type) {
  switch (type) {
    case"i1":
    case"i8":
      return 1;
    case"i16":
      return 2;
    case"i32":
      return 4;
    case"i64":
      return 8;
    case"float":
      return 4;
    case"double":
      return 8;
    default: {
      if (type[type.length - 1] === "*") {return 4} else if (type[0] === "i") {
        var bits = parseInt(type.substr(1));
        assert(bits % 8 === 0, "getNativeTypeSize invalid bits " + bits + ", type " + type);
        return bits / 8
      } else {return 0}
    }
  }
}

function warnOnce (text) {
  if (!warnOnce.shown) warnOnce.shown = {};
  if (!warnOnce.shown[text]) {
    warnOnce.shown[text] = 1;
    err(text)
  }
}

var funcWrappers = {};

function getFuncWrapper (func, sig) {
  if (!func) return;
  assert(sig);
  if (!funcWrappers[sig]) {funcWrappers[sig] = {}}
  var sigCache = funcWrappers[sig];
  if (!sigCache[func]) {if (sig.length === 1) {sigCache[func] = function dynCall_wrapper () {return dynCall(sig, func)}} else if (sig.length === 2) {sigCache[func] = function dynCall_wrapper (arg) {return dynCall(sig, func, [arg])}} else {sigCache[func] = function dynCall_wrapper () {return dynCall(sig, func, Array.prototype.slice.call(arguments))}}}
  return sigCache[func]
}

function dynCall (sig, ptr, args) {if (args && args.length) {return Module["dynCall_" + sig].apply(null, [ptr].concat(args))} else {return Module["dynCall_" + sig].call(null, ptr)}}

var tempRet0 = 0;
var setTempRet0 = function(value) {tempRet0 = value};
var getTempRet0 = function() {return tempRet0};
var wasmBinary;
if (Module["wasmBinary"]) wasmBinary = Module["wasmBinary"];
var noExitRuntime;
if (Module["noExitRuntime"]) noExitRuntime = Module["noExitRuntime"];
if (typeof WebAssembly !== "object") {err("no native wasm support detected")}

function setValue (ptr, value, type, noSafe) {
  type = type || "i8";
  if (type.charAt(type.length - 1) === "*") type = "i32";
  switch (type) {
    case"i1":
      HEAP8[ptr >> 0] = value;
      break;
    case"i8":
      HEAP8[ptr >> 0] = value;
      break;
    case"i16":
      HEAP16[ptr >> 1] = value;
      break;
    case"i32":
      HEAP32[ptr >> 2] = value;
      break;
    case"i64":
      tempI64 = [value >>> 0, (tempDouble = value, +Math_abs(tempDouble) >= 1 ? tempDouble > 0 ? (Math_min(+Math_floor(tempDouble / 4294967296), 4294967295) | 0) >>> 0 : ~~+Math_ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0 : 0)], HEAP32[ptr >> 2] = tempI64[0], HEAP32[ptr + 4 >> 2] = tempI64[1];
      break;
    case"float":
      HEAPF32[ptr >> 2] = value;
      break;
    case"double":
      HEAPF64[ptr >> 3] = value;
      break;
    default:
      abort("invalid type for setValue: " + type)
  }
}

var wasmMemory;
var wasmTable;
var ABORT = false;
var EXITSTATUS = 0;

function assert (condition, text) {if (!condition) {abort("Assertion failed: " + text)}}

var ALLOC_NORMAL = 0;
var ALLOC_NONE = 3;

function allocate (slab, types, allocator, ptr) {
  var zeroinit, size;
  if (typeof slab === "number") {
    zeroinit = true;
    size = slab
  } else {
    zeroinit = false;
    size = slab.length
  }
  var singleType = typeof types === "string" ? types : null;
  var ret;
  if (allocator == ALLOC_NONE) {ret = ptr} else {ret = [_malloc, stackAlloc, dynamicAlloc][allocator](Math.max(size, singleType ? 1 : types.length))}
  if (zeroinit) {
    var stop;
    ptr = ret;
    assert((ret & 3) == 0);
    stop = ret + (size & ~3);
    for (; ptr < stop; ptr += 4) {HEAP32[ptr >> 2] = 0}
    stop = ret + size;
    while (ptr < stop) {HEAP8[ptr++ >> 0] = 0}
    return ret
  }
  if (singleType === "i8") {
    if (slab.subarray || slab.slice) {HEAPU8.set(slab, ret)} else {HEAPU8.set(new Uint8Array(slab), ret)}
    return ret
  }
  var i = 0, type, typeSize, previousType;
  while (i < size) {
    var curr = slab[i];
    type = singleType || types[i];
    if (type === 0) {
      i++;
      continue
    }
    if (type == "i64") type = "i32";
    setValue(ret + i, curr, type);
    if (previousType !== type) {
      typeSize = getNativeTypeSize(type);
      previousType = type
    }
    i += typeSize
  }
  return ret
}

function getMemory (size) {
  if (!runtimeInitialized) return dynamicAlloc(size);
  return _malloc(size)
}

function AsciiToString (ptr) {
  var str = "";
  while (1) {
    var ch = HEAPU8[ptr++ >> 0];
    if (!ch) return str;
    str += String.fromCharCode(ch)
  }
}

var UTF8Decoder = typeof TextDecoder !== "undefined" ? new TextDecoder("utf8") : undefined;

function UTF8ArrayToString (u8Array, idx, maxBytesToRead) {
  var endIdx = idx + maxBytesToRead;
  var endPtr = idx;
  while (u8Array[endPtr] && !(endPtr >= endIdx)) ++endPtr;
  if (endPtr - idx > 16 && u8Array.subarray && UTF8Decoder) {return UTF8Decoder.decode(u8Array.subarray(idx, endPtr))} else {
    var str = "";
    while (idx < endPtr) {
      var u0 = u8Array[idx++];
      if (!(u0 & 128)) {
        str += String.fromCharCode(u0);
        continue
      }
      var u1 = u8Array[idx++] & 63;
      if ((u0 & 224) == 192) {
        str += String.fromCharCode((u0 & 31) << 6 | u1);
        continue
      }
      var u2 = u8Array[idx++] & 63;
      if ((u0 & 240) == 224) {u0 = (u0 & 15) << 12 | u1 << 6 | u2} else {u0 = (u0 & 7) << 18 | u1 << 12 | u2 << 6 | u8Array[idx++] & 63}
      if (u0 < 65536) {str += String.fromCharCode(u0)} else {
        var ch = u0 - 65536;
        str += String.fromCharCode(55296 | ch >> 10, 56320 | ch & 1023)
      }
    }
  }
  return str
}

function UTF8ToString (ptr, maxBytesToRead) {return ptr ? UTF8ArrayToString(HEAPU8, ptr, maxBytesToRead) : ""}

function stringToUTF8Array (str, outU8Array, outIdx, maxBytesToWrite) {
  if (!(maxBytesToWrite > 0)) return 0;
  var startIdx = outIdx;
  var endIdx = outIdx + maxBytesToWrite - 1;
  for (var i = 0; i < str.length; ++i) {
    var u = str.charCodeAt(i);
    if (u >= 55296 && u <= 57343) {
      var u1 = str.charCodeAt(++i);
      u = 65536 + ((u & 1023) << 10) | u1 & 1023
    }
    if (u <= 127) {
      if (outIdx >= endIdx) break;
      outU8Array[outIdx++] = u
    } else if (u <= 2047) {
      if (outIdx + 1 >= endIdx) break;
      outU8Array[outIdx++] = 192 | u >> 6;
      outU8Array[outIdx++] = 128 | u & 63
    } else if (u <= 65535) {
      if (outIdx + 2 >= endIdx) break;
      outU8Array[outIdx++] = 224 | u >> 12;
      outU8Array[outIdx++] = 128 | u >> 6 & 63;
      outU8Array[outIdx++] = 128 | u & 63
    } else {
      if (outIdx + 3 >= endIdx) break;
      outU8Array[outIdx++] = 240 | u >> 18;
      outU8Array[outIdx++] = 128 | u >> 12 & 63;
      outU8Array[outIdx++] = 128 | u >> 6 & 63;
      outU8Array[outIdx++] = 128 | u & 63
    }
  }
  outU8Array[outIdx] = 0;
  return outIdx - startIdx
}

function stringToUTF8 (str, outPtr, maxBytesToWrite) {return stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite)}

function lengthBytesUTF8 (str) {
  var len = 0;
  for (var i = 0; i < str.length; ++i) {
    var u = str.charCodeAt(i);
    if (u >= 55296 && u <= 57343) u = 65536 + ((u & 1023) << 10) | str.charCodeAt(++i) & 1023;
    if (u <= 127) ++len; else if (u <= 2047) len += 2; else if (u <= 65535) len += 3; else len += 4
  }
  return len
}

var UTF16Decoder = typeof TextDecoder !== "undefined" ? new TextDecoder("utf-16le") : undefined;

function allocateUTF8 (str) {
  var size = lengthBytesUTF8(str) + 1;
  var ret = _malloc(size);
  if (ret) stringToUTF8Array(str, HEAP8, ret, size);
  return ret
}

function allocateUTF8OnStack (str) {
  var size = lengthBytesUTF8(str) + 1;
  var ret = stackAlloc(size);
  stringToUTF8Array(str, HEAP8, ret, size);
  return ret
}

function writeArrayToMemory (array, buffer) {HEAP8.set(array, buffer)}

function writeAsciiToMemory (str, buffer, dontAddNull) {
  for (var i = 0; i < str.length; ++i) {HEAP8[buffer++ >> 0] = str.charCodeAt(i)}
  if (!dontAddNull) HEAP8[buffer >> 0] = 0
}

var WASM_PAGE_SIZE = 65536;
var buffer, HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64;

function updateGlobalBufferAndViews (buf) {
  buffer = buf;
  Module["HEAP8"] = HEAP8 = new Int8Array(buf);
  Module["HEAP16"] = HEAP16 = new Int16Array(buf);
  Module["HEAP32"] = HEAP32 = new Int32Array(buf);
  Module["HEAPU8"] = HEAPU8 = new Uint8Array(buf);
  Module["HEAPU16"] = HEAPU16 = new Uint16Array(buf);
  Module["HEAPU32"] = HEAPU32 = new Uint32Array(buf);
  Module["HEAPF32"] = HEAPF32 = new Float32Array(buf);
  Module["HEAPF64"] = HEAPF64 = new Float64Array(buf)
}

var DYNAMIC_BASE = 6580432, DYNAMICTOP_PTR = 1337536;
var INITIAL_TOTAL_MEMORY = Module["TOTAL_MEMORY"] || 134217728;
if (Module["wasmMemory"]) {wasmMemory = Module["wasmMemory"]} else {
  wasmMemory = new WebAssembly.Memory({
    "initial": INITIAL_TOTAL_MEMORY / WASM_PAGE_SIZE,
    "maximum": INITIAL_TOTAL_MEMORY / WASM_PAGE_SIZE
  })
}
if (wasmMemory) {buffer = wasmMemory.buffer}
INITIAL_TOTAL_MEMORY = buffer.byteLength;
updateGlobalBufferAndViews(buffer);
HEAP32[DYNAMICTOP_PTR >> 2] = DYNAMIC_BASE;

function callRuntimeCallbacks (callbacks) {
  while (callbacks.length > 0) {
    var callback = callbacks.shift();
    if (typeof callback == "function") {
      callback();
      continue
    }
    var func = callback.func;
    if (typeof func === "number") {if (callback.arg === undefined) {Module["dynCall_v"](func)} else {Module["dynCall_vi"](func, callback.arg)}} else {func(callback.arg === undefined ? null : callback.arg)}
  }
}

var __ATPRERUN__ = [];
var __ATINIT__ = [];
var __ATMAIN__ = [];
var __ATEXIT__ = [];
var __ATPOSTRUN__ = [];
var runtimeInitialized = false;
var runtimeExited = false;

function preRun () {
  if (Module["preRun"]) {
    if (typeof Module["preRun"] == "function") Module["preRun"] = [Module["preRun"]];
    while (Module["preRun"].length) {addOnPreRun(Module["preRun"].shift())}
  }
  callRuntimeCallbacks(__ATPRERUN__)
}

function initRuntime () {
  runtimeInitialized = true;
  if (!Module["noFSInit"] && !FS.init.initialized) FS.init();
  TTY.init();
  SOCKFS.root = FS.mount(SOCKFS, {}, null);
  callRuntimeCallbacks(__ATINIT__)
}

function preMain () {
  FS.ignorePermissions = false;
  callRuntimeCallbacks(__ATMAIN__)
}

function exitRuntime () {runtimeExited = true}

function postRun () {
  if (Module["postRun"]) {
    if (typeof Module["postRun"] == "function") Module["postRun"] = [Module["postRun"]];
    while (Module["postRun"].length) {addOnPostRun(Module["postRun"].shift())}
  }
  callRuntimeCallbacks(__ATPOSTRUN__)
}

function addOnPreRun (cb) {__ATPRERUN__.unshift(cb)}

function addOnPostRun (cb) {__ATPOSTRUN__.unshift(cb)}

var Math_abs = Math.abs;
var Math_ceil = Math.ceil;
var Math_floor = Math.floor;
var Math_min = Math.min;
var runDependencies = 0;
var runDependencyWatcher = null;
var dependenciesFulfilled = null;

function getUniqueRunDependency (id) {return id}

function addRunDependency (id) {
  runDependencies++;
  if (Module["monitorRunDependencies"]) {Module["monitorRunDependencies"](runDependencies)}
}

function removeRunDependency (id) {
  runDependencies--;
  if (Module["monitorRunDependencies"]) {Module["monitorRunDependencies"](runDependencies)}
  if (runDependencies == 0) {
    if (runDependencyWatcher !== null) {
      clearInterval(runDependencyWatcher);
      runDependencyWatcher = null
    }
    if (dependenciesFulfilled) {
      var callback = dependenciesFulfilled;
      dependenciesFulfilled = null;
      callback()
    }
  }
}

Module["preloadedImages"] = {};
Module["preloadedAudios"] = {};
var dataURIPrefix = "data:application/octet-stream;base64,";

function isDataURI (filename) {return String.prototype.startsWith ? filename.startsWith(dataURIPrefix) : filename.indexOf(dataURIPrefix) === 0}

var wasmBinaryFile = "wbin-standalone._.js";
if (!isDataURI(wasmBinaryFile)) {wasmBinaryFile = locateFile(wasmBinaryFile)}

function getBinary () {
  try {
    if (wasmBinary) {return new Uint8Array(wasmBinary)}
    if (readBinary) {return readBinary(wasmBinaryFile)} else {throw"both async and sync fetching of the wasm failed"}
  } catch (err) {abort(err)}
}

function getBinaryPromise () {
  if (!wasmBinary && (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) && typeof fetch === "function") {
    return fetch(wasmBinaryFile, {credentials: "same-origin"}).then(function(response) {
      if (!response["ok"]) {throw"failed to load wasm binary file at '" + wasmBinaryFile + "'"}
      return response["arrayBuffer"]()
    }).catch(function() {return getBinary()})
  }
  return new Promise(function(resolve, reject) {resolve(getBinary())})
}

function createWasm (env) {
  var info = {"env": env};

  function receiveInstance (instance, module) {
    var exports = instance.exports;
    Module["asm"] = exports;
    removeRunDependency("wasm-instantiate")
  }

  addRunDependency("wasm-instantiate");

  function receiveInstantiatedSource (output) {receiveInstance(output["instance"])}

  function instantiateArrayBuffer (receiver) {
    return getBinaryPromise().then(function(binary) {return WebAssembly.instantiate(binary, info)}).then(receiver, function(reason) {
      err("failed to asynchronously prepare wasm: " + reason);
      abort(reason)
    })
  }

  function instantiateAsync () {
    if (!wasmBinary && typeof WebAssembly.instantiateStreaming === "function" && !isDataURI(wasmBinaryFile) && typeof fetch === "function") {
      fetch(wasmBinaryFile, {credentials: "same-origin"}).then(function(response) {
        var result = WebAssembly.instantiateStreaming(response, info);
        return result.then(receiveInstantiatedSource, function(reason) {
          err("wasm streaming compile failed: " + reason);
          err("falling back to ArrayBuffer instantiation");
          instantiateArrayBuffer(receiveInstantiatedSource)
        })
      })
    } else {return instantiateArrayBuffer(receiveInstantiatedSource)}
  }

  if (Module["instantiateWasm"]) {
    try {
      var exports = Module["instantiateWasm"](info, receiveInstance);
      return exports
    } catch (e) {
      err("Module.instantiateWasm callback failed with error: " + e);
      return false
    }
  }
  instantiateAsync();
  return {}
}

Module["asm"] = function(global, env, providedBuffer) {
  env["memory"] = wasmMemory;
  env["table"] = wasmTable = new WebAssembly.Table({"initial": 13713, "maximum": 13713 + 0, "element": "anyfunc"});
  var exports = createWasm(env);
  return exports
};
var tempDouble;
var tempI64;
var ASM_CONSTS = [function() {return Date.now()}, function() {return typeof GamePix !== "undefined" && typeof GamePix.CONST !== "undefined" ? 1 : 0}, function($0) {
  var value = GamePix.CONST.OPEN_SHOP;
  if (typeof value === "undefined") {
    console.log("ERR! " + UTF8ToString($0) + " is not defined!");
    value = UTF8ToString($0)
  }
  var length = Module["lengthBytesUTF8"](value) + 1;
  var buffer = Module["_malloc"](length);
  Module["stringToUTF8"](value, buffer, length);
  return buffer
}, function($0) {
  var value = GamePix.CONST.PURCHASE;
  if (typeof value === "undefined") {
    console.log("ERR! " + UTF8ToString($0) + " is not defined!");
    value = UTF8ToString($0)
  }
  var length = Module["lengthBytesUTF8"](value) + 1;
  var buffer = Module["_malloc"](length);
  Module["stringToUTF8"](value, buffer, length);
  return buffer
}, function() {return Module.paymentsProtocol === "GPXPLAY" ? 1 : 0}, function() {
  Module.paymentsApi = GamePix.Profile.createPaymentsApi();
  Module.paymentsApi.init(Module.paymentsPayload, function(cachedProducts) {Module.cachedProducts = cachedProducts})
}, function() {
  if (typeof Stripe !== "undefined") {
    Module.stripe = Stripe("pk_live_9ZbPfnW75BldWteqmuMGaX5l");
    Module.renewStripePaymentRequest = function() {
      Module.stripePaymentRequest = Module.stripe.paymentRequest({
        country: "IT",
        currency: "usd",
        total: {label: "canIPay", amount: 100},
        requestPayerName: true,
        requestPayerEmail: true
      });
      Module.stripePay = false;
      Module.stripeProcessing = false;

      function checkStripePay () {
        if (Module.stripeProcessing) {return}
        Module.stripePaymentRequest.canMakePayment().then(function(result) {if (result) {Module.stripePay = true} else {Module.stripePay = false}})
      }

      clearInterval(Module.checkInterval);
      Module.checkInterval = setInterval(checkStripePay, 3e4);
      checkStripePay()
    };
    Module.renewStripePaymentRequest()
  }
}, function($0, $1, $2) {
  var status = "";
  var invoice = "";
  new LoaderXhr(UTF8ToString($0), {
    success: function(token) {
      var options = {access_token: token};

      function processEvent (event) {
        invoice = invoice || "";
        data = status.length > 0 ? invoice + "" : "Cancelled";
        if (event === "POPUP_BLOCKED") {
          data = event;
          status = ""
        }
        var dataLength = Module["lengthBytesUTF8"](data) + 1;
        var dataBuffer = Module["_malloc"](dataLength);
        Module["stringToUTF8"](data, dataBuffer, dataLength);
        if (status.length > 0) {Module["__xsollaCall"]($1, $2, dataBuffer)} else {Module["__xsollaCall"]($2, $1, dataBuffer)}
        Module["_free"](dataBuffer)
      }

      XPayStationWidget.init(options);
      XPayStationWidget.off();
      XPayStationWidget.on(XPayStationWidget.eventTypes.CLOSE, processEvent);
      XPayStationWidget.on(XPayStationWidget.eventTypes.STATUS, function(event, data) {
        status = data.paymentInfo.status;
        invoice = data.paymentInfo.invoice
      });
      try {XPayStationWidget.open()} catch (e) {
        console.error(e, e.stack);
        invoice = "";
        status = "";
        processEvent("POPUP_BLOCKED")
      }
    }, fail: function() {}
  })
}, function($0, $1, $2, $3, $4) {
  var amount = $0;
  var currency = UTF8ToString($1).toLowerCase();
  var label = UTF8ToString($2);
  var successCallback = $3;
  var failCallback = $4;
  var stripe = Module.stripe;
  var fireNotAvailable = function() {
    var data = "NOT_AVAILABLE";
    var dataLength = Module["lengthBytesUTF8"](data) + 1;
    var dataBuffer = Module["_malloc"](dataLength);
    Module["stringToUTF8"](data, dataBuffer, dataLength);
    Module["__paymentRequestCall"](failCallback, successCallback, dataBuffer);
    Module["_free"](dataBuffer)
  };
  if (typeof stripe === "undefined" || Module.stripePay === false || Module.stripeProcessing) {
    fireNotAvailable();
    return
  }
  Module.stripeProcessing = true;
  var paymentRequest = Module.stripePaymentRequest;
  paymentRequest.update({currency: currency, total: {label: label, amount: amount}});
  paymentRequest.on("cancel", function(ev) {
    if (!Module.stripeProcessing) {return}
    delete Module.stripeEvent;
    Module["__paymentRequestCall"](failCallback, successCallback, 0);
    Module.renewStripePaymentRequest()
  });
  paymentRequest.on("token", function(ev) {
    if (!Module.stripeProcessing) {return}
    if (typeof Module.stripeEvent !== "undefined") {
      ev.complete("fail");
      return
    }
    Module.stripeEvent = ev;
    var data = ev.token.id;
    var dataLength = Module["lengthBytesUTF8"](data) + 1;
    var dataBuffer = Module["_malloc"](dataLength);
    Module["stringToUTF8"](data, dataBuffer, dataLength);
    Module["__paymentRequestCall"](successCallback, failCallback, dataBuffer);
    Module["_free"](dataBuffer);
    Module.renewStripePaymentRequest()
  });
  paymentRequest.show()
}, function() {
  if (typeof Module.stripeEvent !== "undefined") {
    Module.stripeEvent.complete("success");
    delete Module.stripeEvent
  }
}, function() {
  if (typeof Module.stripeEvent !== "undefined") {
    Module.stripeEvent.complete("fail");
    delete Module.stripeEvent
  }
}, function($0, $1, $2, $3) {
  var action = UTF8ToString($0);
  var productId = UTF8ToString($1);
  var options = {"method": "pay", "action": action};
  if (action == "purchaseitem") {
    options["product"] = UTF8ToString($2);
    if ($3 != 0) {options["pricepoint_id"] = UTF8ToString($3)}
  } else {options["product_id"] = productId}
  window.FB.ui(options, function(response) {
    if (typeof response === "undefined") {response = {"error_code": 1, "error_message": "unknown"}}
    if (response.error_code) {
      var message = response.error_code + ":" + response.error_message;
      var messageLength = Module["lengthBytesUTF8"](message) + 1;
      var productIdLength = Module["lengthBytesUTF8"](productId) + 1;
      var messageBuffer = Module["_malloc"](messageLength);
      var productIdBuffer = Module["_malloc"](productIdLength);
      Module["stringToUTF8"](message, messageBuffer, messageLength);
      Module["stringToUTF8"](productId, productIdBuffer, productIdLength);
      Module["_call_facebook_pay_fail"](productIdBuffer, messageBuffer);
      Module["_free"](messageBuffer);
      Module["_free"](productIdBuffer)
    } else {
      var paymentId = response.payment_id + "";
      var purchaseToken = (response.purchase_token || response.signed_request) + "";
      var paymentIdLength = Module["lengthBytesUTF8"](paymentId) + 1;
      var purchaseTokenLength = Module["lengthBytesUTF8"](purchaseToken) + 1;
      var productIdLength = Module["lengthBytesUTF8"](productId) + 1;
      var paymentIdBuffer = Module["_malloc"](paymentIdLength);
      var purchaseTokenBuffer = Module["_malloc"](purchaseTokenLength);
      var productIdBuffer = Module["_malloc"](productIdLength);
      Module["stringToUTF8"](paymentId, paymentIdBuffer, paymentIdLength);
      Module["stringToUTF8"](purchaseToken, purchaseTokenBuffer, purchaseTokenLength);
      Module["stringToUTF8"](productId, productIdBuffer, productIdLength);
      Module["_call_facebook_pay_success"](productIdBuffer, paymentIdBuffer, purchaseTokenBuffer);
      Module["_free"](paymentIdBuffer);
      Module["_free"](purchaseTokenBuffer);
      Module["_free"](productIdBuffer)
    }
  })
}, function($0, $1, $2, $3, $4) {
  function closeFn () {
    delete Module.OK_callback;
    Module.ping("hide_payment_screen");
    Module["__odnoklassnikiCallback"](callbackPtr)
  }

  Module.hook("show_payment_screen", closeFn, closeFn);
  Module.OK_callback = closeFn;
  var name = UTF8ToString($0);
  var description = UTF8ToString($1);
  var code = UTF8ToString($2);
  var price = Math.round($3);
  var options = null;
  var attributes = null;
  var currency = "ok";
  var callback = "true";
  var uiConf = undefined;
  var callbackPtr = $4;
  FAPI.UI.showPayment(name, description, code, price, options, attributes, currency, callback, uiConf)
}, function($0, $1) {
  var profileId = UTF8ToString($0);
  if (profileId.indexOf("@") > 0) {profileId = profileId.substr(0, profileId.indexOf("@"))}
  FAPI.Client.call({
    "uids": profileId,
    "fields": "pic50x50",
    "method": "users.getInfo"
  }, function(method, result, data) {
    var url = "";
    if (result[0] !== undefined && result[0].pic50x50 !== undefined) {url = result[0].pic50x50} else {console.error("Can't get user pic50x50", method, result, data)}
    if (url.length === 0 || url.indexOf("stub_50x50.gif") >= 0) {url = "/assets/external/production/cat_icon.jpeg"}
    var urlLength = Module["lengthBytesUTF8"](url) + 1;
    var urlBuffer = Module["_malloc"](urlLength);
    Module["stringToUTF8"](url, urlBuffer, urlLength);
    Module["__odnoklassnikiPictureCallback"]($1, urlBuffer);
    Module["_free"](urlBuffer)
  })
}, function() {
  Module["_send"] = function(key, data, callback) {
    if (!callback) {callback = function() {}}
    if (!data) {data = ""}
    var clfield = key + "_callback_" + Math.random();
    var keyLength = Module["lengthBytesUTF8"](key) + 1;
    var clfieldLength = Module["lengthBytesUTF8"](clfield) + 1;
    var dataLength = Module["lengthBytesUTF8"](data) + 1;
    var clfieldBuffer = Module["_malloc"](clfieldLength);
    var keyBuffer = Module["_malloc"](keyLength);
    var dataBuffer = Module["_malloc"](dataLength);
    Module["stringToUTF8"](key, keyBuffer, keyLength);
    Module["stringToUTF8"](clfield, clfieldBuffer, clfieldLength);
    Module["stringToUTF8"](data, dataBuffer, dataLength);
    Module[clfield] = callback;
    Module["__send"](keyBuffer, dataBuffer, clfieldBuffer);
    Module["_free"](keyBuffer);
    Module["_free"](clfieldBuffer);
    Module["_free"](dataBuffer)
  };
  Module["send"] = Module["_send"];
  window["_send"] = Module["_send"]
}, function() {
  Module["_set"] = function(key, data, callback) {Module["send"](key, data, callback)};
  Module["set"] = Module["_set"];
  window["_set"] = Module["_set"]
}, function() {
  Module["_get"] = function(key, callback) {Module["send"]("$get_" + key, "", callback)};
  Module["get"] = Module["_get"];
  window["_get"] = Module["_get"]
}, function($0, $1) {
  var event = UTF8ToString($0);
  var innerobj = UTF8ToString($1);
  if (innerobj.length > 0) {innerobj = innerobj.slice(0, -1)}
  var object = JSON.parse("{" + innerobj + "}");
  if (object.type === undefined) {object.type = event}
  if (typeof Module["ping"] !== "undefined") {Module["ping"](event, object)} else if (typeof _ping !== "undefined") {_ping(event, object)} else if (typeof GamePix !== "undefined") {GamePix.game.ping(event, object)}
}, function($0, $1, $2, $3, $4) {
  var hookConst = UTF8ToString($0);
  var actionConst = UTF8ToString($1);
  var value = UTF8ToString($2);
  var successPtr = $3;
  var failPtr = $4;
  var obj = undefined;
  try {
    obj = JSON.parse(("{" + value + "}").replace(",}", "}"));
    obj["action"] = actionConst
  } catch (e) {obj = {action: actionConst, value: value}}
  obj.type = hookConst;
  var onsuccess = function(data) {
    if (typeof data === "undefined" || data === null) {
      Module["___hookSuccess"](successPtr, failPtr, 0);
      return
    }
    var dataLength = Module["lengthBytesUTF8"](data) + 1;
    var dataBuffer = Module["_malloc"](dataLength);
    Module["stringToUTF8"](data, dataBuffer, dataLength);
    Module["___hookSuccess"](successPtr, failPtr, dataBuffer);
    Module["_free"](dataBuffer)
  };
  var onfail = function(data) {
    if (typeof data === "undefined" || data === null) {
      Module["___hookFail"](successPtr, failPtr, 0);
      return
    }
    var dataLength = Module["lengthBytesUTF8"](data) + 1;
    var dataBuffer = Module["_malloc"](dataLength);
    Module["stringToUTF8"](data, dataBuffer, dataLength);
    Module["___hookFail"](successPtr, failPtr, dataBuffer);
    Module["_free"](dataBuffer)
  };
  if (typeof Module["hook"] !== "undefined") {Module["hook"](hookConst, obj, onsuccess, onfail)} else if (typeof _hook !== "undefined") {_hook(hookConst, obj, onsuccess, onfail)} else if (typeof GamePix !== "undefined") {GamePix.hook(GamePix.Hooks[hookConst]).action(GamePix.Actions[actionConst]).value(value).onSuccess(onsuccess).onFail(onfail)} else {onsuccess()}
}, function($0, $1) {
  var key = UTF8ToString($0);
  var lang = UTF8ToString($1);
  if (typeof Module["localize"] !== "undefined") {
    var result = Module["localize"](key, lang);
    var resultLength = Module["lengthBytesUTF8"](result) + 1;
    var resultBuffer = Module["_malloc"](resultLength);
    Module["stringToUTF8"](result, resultBuffer, resultLength);
    return resultBuffer
  } else {return 0}
}, function($0) {return Math.fround($0)}, function($0) {
  var base = UTF8ToString($0);
  var datajs = base + ".js";
  var datafile = base + "._.js";
  var context = {};
  var baseLength = Module["lengthBytesUTF8"](base) + 1;
  var baseBuffer = Module["_malloc"](baseLength);
  Module["stringToUTF8"](base, baseBuffer, baseLength);
  var tryRun = function() {
    if (!(context.data && context.dataReady)) {return}
    var Module = window.Module;
    Module.getPreloadedPackage = function(name, size) {return context.binary};
    if (typeof context.data === "function") {context.data(Module)} else {eval(context.data)}
    delete context.data;
    delete context.binary;
    Module["__load_package_success"](baseBuffer);
    Module["_free"](baseBuffer)
  };
  Module.loadResource("package_file", datafile, "arraybuffer", function(total, current) {Module["__load_package_progress"](baseBuffer, current, LoaderXhrData[datafile])}).then(function(data) {
    Module["__load_package_progress"](baseBuffer, LoaderXhrData[datafile], LoaderXhrData[datafile]);
    context.binary = data;
    context.dataReady = true;
    tryRun()
  });
  Module.loadResource("package", datajs).then(function(script) {
    context.data = script;
    tryRun()
  })
}, function($0, $1) {
  var clfield = UTF8ToString($0);
  var innerobj = UTF8ToString($1);
  if (innerobj.length > 0) {innerobj = innerobj.slice(0, -1)}
  var object = JSON.parse("{" + innerobj + "}");
  if (clfield in Module) {
    Module[clfield](object);
    delete Module[clfield]
  }
}, function() {if (typeof Module["ls"] === "undefined") {Module["ls"] = typeof GamePix !== "undefined" ? GamePix.localStorage || localStorage : localStorage}}, function($0) {if (typeof Module["ls"]["sync"] === "function") {Module["ls"]["sync"](function() {Module["__storage_sync_done"]($0)})} else {Module["__storage_sync_done"]($0)}}, function($0) {if (typeof Module["ls"]["setLocalStoragePrefix"] === "function") {Module["ls"]["setLocalStoragePrefix"](UTF8ToString($0))}}, function($0, $1) {
  var key = UTF8ToString($1) + UTF8ToString($0);
  Module["ls"].removeItem(key)
}, function($0, $1, $2) {
  var key = UTF8ToString($2) + UTF8ToString($0);
  var value = Module["ls"].getItem(key);
  if (value === null || value === "undefined" || value === undefined) {return 0}
  stringToUTF8(value, $1, 16 * 1024);
  return 1
}, function($0, $1, $2) {
  var key = UTF8ToString($2) + UTF8ToString($0);
  var value = UTF8ToString($1);
  Module["ls"].setItem(key, value)
}, function($0, $1, $2) {
  var channelPtr = $0;
  var url = UTF8ToString($1);
  var file = UTF8ToString($2);
  var loadFn, successFn, failFn;
  successFn = function(data) {
    var path = file.substr(0, file.lastIndexOf("/"));
    if (path.length > 0) {Module.FS.createPath("/", path.substr(1))}
    Module.FS.writeFile(file, new Uint8Array(data));
    Module["_Async_doLoadNextCallback"](true, channelPtr)
  };
  failFn = function(url, status, origin) {
    if (status == 0) {
      Module.log("WARN! LoaderXhr loading '" + url + "' failed, status code " + status + ", origin " + origin + ", retrying after 5 sec...");
      setTimeout(loadFn, 5e3)
    } else {
      Module.log("ERR! LoaderXhr loading '" + url + "' failed, status code " + status + ", origin " + origin);
      Module["_Async_doLoadNextCallback"](false, channelPtr)
    }
  };
  loadFn = function() {new LoaderXhr(url, {success: successFn, fail: failFn, responseType: "arraybuffer"})};
  loadFn()
}, function() {
  function onend () {Module["_fireFsEndCallback"]()}

  function each (file, body) {
    if (!file.startsWith("async/")) {return}
    file = file.substr(6);
    if (body instanceof ArrayBuffer) {body = new Uint8Array(body)}
    var length = Module["lengthBytesUTF8"](file) + 1;
    var buffer = Module["_malloc"](length);
    Module["stringToUTF8"](file, buffer, length);
    if (Module["_shouldCreateFile"](buffer) === 1) {
      var parts = file.split("/");
      if (parts.length === 0) {
        Module.log("ERR! Can't create file '" + file + "', because it's not valid file path");
        Module["_free"](buffer);
        return
      }
      var filename = parts[parts.length - 1].trim();
      if (filename.length === 0) {
        Module.onerror("ERR! Can't create file '" + file + "', because file name is empty");
        Module["_free"](buffer);
        return
      }
      var path = "";
      for (var i = 0; i < parts.length - 1; ++i) {
        var part = parts[i].trim();
        if (part.length === 0) {continue}
        Module.FS.createPath(path, part, true, true);
        path = path + "/" + part
      }
      try {Module.FS.unlink(path + "/" + filename)} catch (e) {}
      Module.FS.createDataFile(path, filename, body, true, true, true)
    }
    Module["_free"](buffer)
  }

  LoaderXhr.cache.forEach(each, onend)
}, function() {
  if (typeof Module["_canvas_image_callback"] === "undefined") {return}
  var imgData = Module["canvas"].toDataURL("image/png");
  var callback = Module["_canvas_image_callback"];
  delete Module["_canvas_image_callback"];
  callback(imgData)
}, function() {
  Module["_get_canvas_image"] = function(callback) {
    Module["_canvas_image_callback"] = callback;
    if (typeof Module["_canvas_image_canvas"] === "undefined") {Module["_canvas_image_canvas"] = document.createElement("canvas")}
  };
  Module["get_canvas_image"] = Module["_get_canvas_image"];
  window["_get_canvas_image"] = Module["_get_canvas_image"]
}, function() {
  if (typeof wx !== "undefined" && typeof GameGlobal !== "undefined") {
    Module.tencent = true;
    return 1
  }
  return 0
}, function() {
  if (!Module["calledRun"]) {
    Module.log("WARN! Module['calledRun'] forced to true!");
    Module["calledRun"] = true
  }
  Module["canvas"].addEventListener("touchstart", function(event) {}, true);
  canvas.addEventListener("touchmove", function(event) {event.preventDefault()}, true);
  var hidden, visibilityChange;
  if (typeof document.hidden !== "undefined") {
    hidden = "hidden";
    visibilityChange = "visibilitychange"
  } else if (typeof document.mozHidden !== "undefined") {
    hidden = "mozHidden";
    visibilityChange = "mozvisibilitychange"
  } else if (typeof document.msHidden !== "undefined") {
    hidden = "msHidden";
    visibilityChange = "msvisibilitychange"
  } else if (typeof document.webkitHidden !== "undefined") {
    hidden = "webkitHidden";
    visibilityChange = "webkitvisibilitychange"
  }
  document.addEventListener(visibilityChange, function() {document[hidden] ? _browser_pause() : _browser_resume()}, false);
  if (typeof GamePix !== "undefined") {
    var root = GamePix;
    if (typeof GamePix.on !== "undefined") {root = GamePix.on}
    root.pause = function() {_gamepix_pause()};
    root.resume = function() {_gamepix_resume()};
    root.soundOn = function() {_gamepix_sound_on()};
    root.soundOff = function() {_gamepix_sound_off()}
  }
  var fixSounds = function(event) {if (SDL && SDL.audioContext && SDL.audioContext.state) {if (SDL.audioContext.state !== "running") {SDL.audioContext.resume()}}};
  window.addEventListener("touchstart", fixSounds, true);
  window.addEventListener("mousedown", fixSounds, true);
  window.addEventListener("beforeunload", function(e) {_browser_terminate()}, false)
}, function($0) {
  var value = Module.scriptFileName;
  if (typeof value === "undefined") {
    console.log("ERR! " + UTF8ToString($0) + " is not defined!");
    value = UTF8ToString($0)
  }
  var length = Module["lengthBytesUTF8"](value) + 1;
  var buffer = Module["_malloc"](length);
  Module["stringToUTF8"](value, buffer, length);
  return buffer
}, function($0) {
  var value = Module.dataFileName;
  if (typeof value === "undefined") {
    console.log("ERR! " + UTF8ToString($0) + " is not defined!");
    value = UTF8ToString($0)
  }
  var length = Module["lengthBytesUTF8"](value) + 1;
  var buffer = Module["_malloc"](length);
  Module["stringToUTF8"](value, buffer, length);
  return buffer
}, function($0, $1, $2, $3, $4, $5, $6) {
  Module.libgamepix.squeeze();
  if (typeof Module["mainReady"] !== "undefined") {Module["mainReady"]($0, $1, $2, $3, $4, $5, $6)}
}, function() {if (typeof Module["onresize"] !== "undefined") {setTimeout(function() {Module["onresize"]()}, 1)}}, function() {if (window.beforeMainHook !== undefined) {window.beforeMainHook(Module)}}, function() {
  var getMousePos = function(event) {
    var rect = Module["canvas"].getBoundingClientRect();
    var cw = Module["canvas"].width;
    var ch = Module["canvas"].height;
    var scrollX = (typeof window.scrollX !== "undefined" ? window.scrollX : window.pageXOffset) | 0;
    var scrollY = (typeof window.scrollY !== "undefined" ? window.scrollY : window.pageYOffset) | 0;
    var x = event.pageX - (scrollX + rect.left);
    var y = event.pageY - (scrollY + rect.top);
    x = x * (cw / rect.width);
    y = y * (ch / rect.height);
    return [x, y]
  };
  var isTouchHeld = false;
  var isTouchDevice = "ontouchstart" in document.documentElement;
  if (isTouchDevice) {
    var lastTouchFinger = 0;
    var heldTouches = {};
    var multitouch = function(event) {
      if (event.target != Module["canvas"]) {return}
      var touches = event.changedTouches;
      for (var touchIndex = 0; touchIndex < touches.length; touchIndex++) {
        var main = touches[touchIndex];
        var identifier = main.identifier;
        var xy = getMousePos(main);
        var type;
        switch (event.type) {
          case"touchstart":
            type = 0;
            break;
          case"touchmove":
            type = 1;
            break;
          case"touchend":
            type = 2;
            break;
          default:
            return
        }
        if (type == 0) {
          if (isTouchHeld) {lastTouchFinger += 1} else {lastTouchFinger = 0}
          heldTouches[identifier] = lastTouchFinger
        }
        var finger = heldTouches[identifier];
        if (type == 2) {delete heldTouches[identifier]}
        isTouchHeld = Object.keys(heldTouches).length > 0;
        Module["_sys_glfw_main_loop_touch"](finger, type, xy[0], xy[1]);
        event.preventDefault()
      }
    };
    document.addEventListener("touchmove", multitouch, true);
    document.addEventListener("touchstart", multitouch, true);
    document.addEventListener("touchend", multitouch, true)
  }
  var isMousePressed = false;
  var onMouseButtonDown = function(event) {
    if (isTouchHeld || event.button != 0 || event.target != Module["canvas"]) {return}
    var xy = getMousePos(event);
    Module["_sys_glfw_main_loop_touch"](0, 0, xy[0], xy[1]);
    isMousePressed = true;
    event.preventDefault()
  };
  var onMouseMove = function(event) {
    if (isTouchHeld || !isMousePressed || event.target != Module["canvas"]) {return}
    var xy = getMousePos(event);
    Module["_sys_glfw_main_loop_touch"](0, 1, xy[0], xy[1]);
    event.preventDefault()
  };
  var onMouseButtonUp = function(event) {
    if (isTouchHeld || !isMousePressed || event.button != 0) {return}
    var xy = getMousePos(event);
    Module["_sys_glfw_main_loop_touch"](0, 2, xy[0], xy[1]);
    isMousePressed = false;
    event.preventDefault()
  };
  var onMouseWheel = function(event) {
    var delta = 0;
    switch (event.type) {
      case"DOMMouseScroll":
        delta = event.detail / 3;
        break;
      case"mousewheel":
        delta = event.wheelDelta / 120;
        break;
      case"wheel":
        delta = event.deltaY;
        switch (event.deltaMode) {
          case 0:
            delta /= 100;
            break;
          case 1:
            delta /= 3;
            break;
          case 2:
            delta *= 80;
            break;
          default:
            throw"unrecognized mouse wheel delta mode: " + event.deltaMode
        }
        break;
      default:
        throw"unrecognized mouse wheel event: " + event.type
    }
    if (delta !== 0) {Module["_sys_glfw_main_loop_touch"](0, 3, delta, delta)}
    event.preventDefault()
  };
  var onMouseLeave = function(event) {
    if (isTouchHeld || !isMousePressed || event.button != 0) {return}
    var xy = getMousePos(event);
    Module["_sys_glfw_main_loop_touch"](0, 4, xy[0], xy[1]);
    isMousePressed = false
  };
  var nonPassiveOptions = {capture: true, passive: false};
  document.addEventListener("mousemove", onMouseMove, true);
  document.addEventListener("mousedown", onMouseButtonDown, true);
  document.addEventListener("mouseup", onMouseButtonUp, true);
  document.addEventListener("mousewheel", onMouseWheel, nonPassiveOptions);
  document.addEventListener("DOMMouseScroll", onMouseWheel, nonPassiveOptions);
  document.addEventListener("mouseleave", onMouseLeave, true)
}, function() {
  if (!Module["loadWebTexture_interval"]) {Module["loadWebTexture_interval"] = 5e3}
  if (!Module["loadWebTexture_countdown"]) {Module["loadWebTexture_countdown"] = 5}
  var texturePremultiplyCanvas = document.createElement("canvas");
  var texturePremultiplyContext = texturePremultiplyCanvas.getContext("2d");

  function doload (image, textureId, isWebp, isJpeg, premultiply, generateMipMap, debugPath) {
    var gl = Module.canvas.GLctxObject.GLctx;

    function isPowerOf2 (n) {return n && (n & n - 1) === 0}

    var format = isJpeg ? gl.RGB : gl.RGBA;
    var texture = Module.GL.textures[textureId];
    if (!texture) {
      Module.log("WARN! Texture " + textureId + " deleted");
      return
    }
    gl.bindTexture(gl.TEXTURE_2D, texture);
    if (gl.getError() != gl.NO_ERROR) {
      Module.log("WARN! Texture " + textureId + " not bound");
      return
    }
    if (isWebp && premultiply) {
      var canvas = texturePremultiplyCanvas;
      var context = texturePremultiplyContext;
      canvas.width = image.width;
      canvas.height = image.height;
      context.drawImage(image, 0, 0);
      var imageData = context.getImageData(0, 0, image.width, image.height);
      var data = imageData.data;
      for (var i = 0; i < data.byteLength; i = i + 4) {
        var a = data[i + 3];
        var factor = a > 0 ? a / 255 : 0;
        data[i] = data[i] * factor | 0;
        data[i + 1] = data[i + 1] * factor | 0;
        data[i + 2] = data[i + 2] * factor | 0
      }
      gl.texImage2D(gl.TEXTURE_2D, 0, format, format, gl.UNSIGNED_BYTE, imageData)
    } else {gl.texImage2D(gl.TEXTURE_2D, 0, format, format, gl.UNSIGNED_BYTE, image)}
    if (generateMipMap) {if (isPowerOf2(image.width) && isPowerOf2(image.height)) {gl.generateMipmap(gl.TEXTURE_2D)} else {Module.log("ERR! Can't generate mipmap for image '" + debugPath + "', not power of 2: " + image.width + "x" + image.height)}}
  }

  var throttledTextures = [];
  Module["loadWebTexture_throttling"] = false;
  Module["loadWebTexture_load_throttled_lastcall"] = Date.now();
  Module["loadWebTexture_load_throttled"] = function() {
    var gl = Module.canvas.GLctxObject.GLctx;
    if (throttledTextures.length == 0) {
      Module["loadWebTexture_load_throttled_lastcall"] = Date.now();
      return
    }
    if (!Module.showLoadingUi()) {return}
    Module._browser_pause();
    var endAt = Module.showLoadingCoundown(Module["loadWebTexture_countdown"]);
    var prevTexture = gl.getParameter(gl.TEXTURE_BINDING_2D);

    function onend () {
      if (prevTexture) {gl.bindTexture(gl.TEXTURE_2D, prevTexture)}
      Module._browser_resume();
      Module["loadWebTexture_load_throttled_lastcall"] = Date.now();
      Module.hideLoadingUi()
    }

    function loadThrottledTextures () {
      if (throttledTextures.length == 0 || Date.now() > endAt) {
        setTimeout(onend, 100);
        return
      }
      var args = throttledTextures.shift();
      doload.apply(this, args);
      setTimeout(loadThrottledTextures, 1)
    }

    setTimeout(loadThrottledTextures, 1)
  };
  Module["loadWebTexture_onload"] = function(image, textureId, isWebp, isJpeg, premultiply, generateMipMap, loadImmediate, debugPath) {
    var gl = Module.canvas.GLctxObject.GLctx;
    if (!loadImmediate && Module["loadWebTexture_throttling"]) {throttledTextures.push([image, textureId, isWebp, isJpeg, premultiply, generateMipMap, debugPath])} else {
      var prevTexture = gl.getParameter(gl.TEXTURE_BINDING_2D);
      doload(image, textureId, isWebp, isJpeg, premultiply, generateMipMap, debugPath);
      if (prevTexture) {gl.bindTexture(gl.TEXTURE_2D, prevTexture)}
    }
  }
}, function() {if (Module["loadWebTexture_throttling"] && Date.now() - Module["loadWebTexture_load_throttled_lastcall"] > Module["loadWebTexture_interval"]) {Module["loadWebTexture_load_throttled"]()}}, function() {return GpxHost.webpSupported ? 1 : 0}, function($0, $1, $2, $3, $4, $5, $6, $7) {
  var isWebp = $2 == 0;
  var isJpeg = $2 == 2;
  var type = isJpeg ? "image/jpeg" : isWebp ? "image/webp" : "image/png";
  var textureId = $3;
  var imageblob = new Blob([Module.libgamepix.ptrToBuffer($0, $1)], {type: type});
  var url = URL.createObjectURL(imageblob);
  var debugPath = $4 == 0 ? "" : UTF8ToString($4);
  var premultiply = $5 == 1;
  var generateMipMap = $6 == 1;
  var loadImmediate = $7 == 1;
  var image = new Image;
  image.onload = function() {
    Module["loadWebTexture_onload"](image, textureId, isWebp, isJpeg, premultiply, generateMipMap, loadImmediate, debugPath);
    URL.revokeObjectURL(url)
  };
  image.onerror = function() {
    Module.log("ERR! Can't load image " + debugPath);
    URL.revokeObjectURL(url)
  };
  image.src = url
}, function($0, $1) {
  var file = LoaderXhr.mapping(UTF8ToString($0));
  var textureId = $1;
  Module.loadTexture(file, textureId)
}, function($0) {
  window[UTF8ToString($0)] = document.createElement("canvas");
  window[UTF8ToString($0)].width = 128;
  window[UTF8ToString($0)].height = 128
}, function($0, $1, $2) {
  var _2d = window[UTF8ToString($0)].getContext("2d");
  _2d.font = UTF8ToString($1);
  return _2d.measureText(String.fromCharCode($2)).width
}, function($0, $1, $2, $3) {
  var _2d = window[UTF8ToString($0)].getContext("2d");
  _2d.textBaseline = "top";
  _2d.font = UTF8ToString($1);
  _2d.clearRect(0, 0, 128, 128);
  _2d.fillText(String.fromCharCode($2), 0, 0);
  var imageData = _2d.getImageData(0, 0, 128, 128);
  HEAPU8.set(imageData.data, $3)
}, function() {
  var fn = function() {Module["_launchTasksOrSendHeartbeat"]()};
  Module["pauseId"] = setInterval(fn, 1e3)
}, function() {
  clearInterval(Module["pauseId"]);
  delete Module["pauseId"]
}, function() {
  document.addEventListener("keyup", function(event) {
    if (event.altKey || event.ctrlKey) {return}
    var keyCode = event.keyCode;
    var key = event.key;
    var charCode = event.charCode;
    if (key.toLowerCase() === "alt" || key.toLowerCase() === "shift" || key.toLowerCase() === "control") {return}
    if (keyCode == 8) {key = "\b"} else if (keyCode == 13) {return}
    var keyLength = Module["lengthBytesUTF8"](key) + 1;
    var keyBuffer = Module["_malloc"](keyLength);
    Module["stringToUTF8"](key, keyBuffer, keyLength);
    Module["_emOnKeyPress"](keyBuffer);
    Module["_free"](keyBuffer)
  })
}, function() {
  var configuredWebSocket = window.CLASSICATS_CONFIG && window.CLASSICATS_CONFIG.websocketUrl;
  window.Module["websocket"] = window.Module["websocket"] && typeof window.Module["websocket"] === "object" ? window.Module["websocket"] : {"url": "wss://", "subprotocol": null, "emit": function() {}};
  if (configuredWebSocket) {
    window.Module["websocket"]["url"] = configuredWebSocket;
    window.Module["websocket"]["subprotocol"] = null;
  }
  var queryString = window.location.search || "";
  var keyValPairs = [];
  var params = {};
  queryString = queryString.substr(1);
  if (queryString.length) {
    keyValPairs = queryString.split("&");
    for (pairNum in keyValPairs) {
      var key = keyValPairs[pairNum].split("=")[0];
      if (!key.length) continue;
      params[key] = keyValPairs[pairNum].split("=")[1]
    }
  }
  var server = params["server"] || (configuredWebSocket ? configuredWebSocket.replace(/^wss?:\/\//, "").replace(/\/.*$/, "") : (Module.backend ? Module.backend.substr(Module.backend.indexOf("://") + 3) : ""));
  if (server.length == 0) {return 0}
  server = server.replace("~", ":");
  if (!configuredWebSocket && server.indexOf(":443") < 0) {window.Module["websocket"]["url"] = "ws://"}
  var serverLength = Module["lengthBytesUTF8"](server) + 1;
  var serverBuffer = Module["_malloc"](serverLength);
  Module["stringToUTF8"](server, serverBuffer, serverLength);
  return serverBuffer
}, function() {return (new Date).getTimezoneOffset()}, function($0, $1) {
  var productId = UTF8ToString($0);
  var locale = UTF8ToString($1);
  if (typeof Module["getProductInfo"] !== "undefined") {
    var info = Module["getProductInfo"](productId, locale);
    if (typeof info !== "undefined") {
      var pageLength = Module["lengthBytesUTF8"](info.page) + 1;
      var pageBuffer = Module["_malloc"](pageLength);
      Module["stringToUTF8"](info.page, pageBuffer, pageLength);
      var signLength = Module["lengthBytesUTF8"](info.currencySign) + 1;
      var signBuffer = Module["_malloc"](signLength);
      Module["stringToUTF8"](info.currencySign, signBuffer, signLength);
      var currencyLength = Module["lengthBytesUTF8"](info.currency) + 1;
      var currencyBuffer = Module["_malloc"](currencyLength);
      Module["stringToUTF8"](info.currency, currencyBuffer, currencyLength);
      var pricePointId = info.pricePointId || "";
      var pricePointIdLength = Module["lengthBytesUTF8"](pricePointId) + 1;
      var pricePointIdBuffer = Module["_malloc"](pricePointIdLength);
      Module["stringToUTF8"](pricePointId, pricePointIdBuffer, pricePointIdLength);
      Module["_onProductInfo"](pageBuffer, signBuffer, currencyBuffer, info.price, pricePointIdBuffer);
      Module["_free"](pageBuffer);
      Module["_free"](signBuffer);
      Module["_free"](currencyBuffer);
      Module["_free"](pricePointIdBuffer)
    }
  }
}, function() {window.sm = {ret: ""}}, function($0) {
  var code = UTF8ToString($0);
  eval.call(window.sm, code)
}, function($0) {
  var code = UTF8ToString($0);
  eval.call(window.sm, code);
  return window.sm.ret
}, function($0) {
  var code = UTF8ToString($0);
  eval.call(window.sm, code);
  var ret = JSON.stringify(window.sm.ret);
  var retLength = Module["lengthBytesUTF8"](ret) + 1;
  var retBuffer = Module["_malloc"](retLength);
  Module["stringToUTF8"](ret, retBuffer, retLength);
  return retBuffer
}];

function _emscripten_asm_const_iii (code, sig_ptr, argbuf) {
  var sig = AsciiToString(sig_ptr);
  var args = [];
  var align_to = function(ptr, align) {return ptr + align - 1 & ~(align - 1)};
  var buf = argbuf;
  for (var i = 0; i < sig.length; i++) {
    var c = sig[i];
    if (c == "d" || c == "f") {
      buf = align_to(buf, 8);
      args.push(HEAPF64[buf >> 3]);
      buf += 8
    } else if (c == "i") {
      buf = align_to(buf, 4);
      args.push(HEAP32[buf >> 2]);
      buf += 4
    }
  }
  return ASM_CONSTS[code].apply(null, args)
}

function _emscripten_asm_const_dii (code, sig_ptr, argbuf) {
  var sig = AsciiToString(sig_ptr);
  var args = [];
  var align_to = function(ptr, align) {return ptr + align - 1 & ~(align - 1)};
  var buf = argbuf;
  for (var i = 0; i < sig.length; i++) {
    var c = sig[i];
    if (c == "d" || c == "f") {
      buf = align_to(buf, 8);
      args.push(HEAPF64[buf >> 3]);
      buf += 8
    } else if (c == "i") {
      buf = align_to(buf, 4);
      args.push(HEAP32[buf >> 2]);
      buf += 4
    }
  }
  return ASM_CONSTS[code].apply(null, args)
}

__ATINIT__.push({func: function() {___wasm_call_ctors()}});

function demangle (func) {return func}

function demangleAll (text) {
  var regex = /\b_Z[\w\d_]+/g;
  return text.replace(regex, function(x) {
    var y = demangle(x);
    return x === y ? x : y + " [" + x + "]"
  })
}

function jsStackTrace () {
  var err = new Error;
  if (!err.stack) {
    try {throw new Error(0)} catch (e) {err = e}
    if (!err.stack) {return "(no stack trace available)"}
  }
  return err.stack.toString()
}

function stackTrace () {
  var js = jsStackTrace();
  if (Module["extraStackTrace"]) js += "\n" + Module["extraStackTrace"]();
  return demangleAll(js)
}

function ___setErrNo (value) {
  if (Module["___errno_location"]) HEAP32[Module["___errno_location"]() >> 2] = value;
  return value
}

var PATH = {
  splitPath: function(filename) {
    var splitPathRe = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
    return splitPathRe.exec(filename).slice(1)
  },
  normalizeArray: function(parts, allowAboveRoot) {
    var up = 0;
    for (var i = parts.length - 1; i >= 0; i--) {
      var last = parts[i];
      if (last === ".") {parts.splice(i, 1)} else if (last === "..") {
        parts.splice(i, 1);
        up++
      } else if (up) {
        parts.splice(i, 1);
        up--
      }
    }
    if (allowAboveRoot) {for (; up; up--) {parts.unshift("..")}}
    return parts
  },
  normalize: function(path) {
    var isAbsolute = path.charAt(0) === "/", trailingSlash = path.substr(-1) === "/";
    path = PATH.normalizeArray(path.split("/").filter(function(p) {return !!p}), !isAbsolute).join("/");
    if (!path && !isAbsolute) {path = "."}
    if (path && trailingSlash) {path += "/"}
    return (isAbsolute ? "/" : "") + path
  },
  dirname: function(path) {
    var result = PATH.splitPath(path), root = result[0], dir = result[1];
    if (!root && !dir) {return "."}
    if (dir) {dir = dir.substr(0, dir.length - 1)}
    return root + dir
  },
  basename: function(path) {
    if (path === "/") return "/";
    var lastSlash = path.lastIndexOf("/");
    if (lastSlash === -1) return path;
    return path.substr(lastSlash + 1)
  },
  extname: function(path) {return PATH.splitPath(path)[3]},
  join: function() {
    var paths = Array.prototype.slice.call(arguments, 0);
    return PATH.normalize(paths.join("/"))
  },
  join2: function(l, r) {return PATH.normalize(l + "/" + r)}
};
var PATH_FS = {
  resolve: function() {
    var resolvedPath = "", resolvedAbsolute = false;
    for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
      var path = i >= 0 ? arguments[i] : FS.cwd();
      if (typeof path !== "string") {throw new TypeError("Arguments to path.resolve must be strings")} else if (!path) {return ""}
      resolvedPath = path + "/" + resolvedPath;
      resolvedAbsolute = path.charAt(0) === "/"
    }
    resolvedPath = PATH.normalizeArray(resolvedPath.split("/").filter(function(p) {return !!p}), !resolvedAbsolute).join("/");
    return (resolvedAbsolute ? "/" : "") + resolvedPath || "."
  }, relative: function(from, to) {
    from = PATH_FS.resolve(from).substr(1);
    to = PATH_FS.resolve(to).substr(1);

    function trim (arr) {
      var start = 0;
      for (; start < arr.length; start++) {if (arr[start] !== "") break}
      var end = arr.length - 1;
      for (; end >= 0; end--) {if (arr[end] !== "") break}
      if (start > end) return [];
      return arr.slice(start, end - start + 1)
    }

    var fromParts = trim(from.split("/"));
    var toParts = trim(to.split("/"));
    var length = Math.min(fromParts.length, toParts.length);
    var samePartsLength = length;
    for (var i = 0; i < length; i++) {
      if (fromParts[i] !== toParts[i]) {
        samePartsLength = i;
        break
      }
    }
    var outputParts = [];
    for (var i = samePartsLength; i < fromParts.length; i++) {outputParts.push("..")}
    outputParts = outputParts.concat(toParts.slice(samePartsLength));
    return outputParts.join("/")
  }
};
var TTY = {
  ttys: [],
  init: function() {},
  shutdown: function() {},
  register: function(dev, ops) {
    TTY.ttys[dev] = {input: [], output: [], ops: ops};
    FS.registerDevice(dev, TTY.stream_ops)
  },
  stream_ops: {
    open: function(stream) {
      var tty = TTY.ttys[stream.node.rdev];
      if (!tty) {throw new FS.ErrnoError(19)}
      stream.tty = tty;
      stream.seekable = false
    },
    close: function(stream) {stream.tty.ops.flush(stream.tty)},
    flush: function(stream) {stream.tty.ops.flush(stream.tty)},
    read: function(stream, buffer, offset, length, pos) {
      if (!stream.tty || !stream.tty.ops.get_char) {throw new FS.ErrnoError(6)}
      var bytesRead = 0;
      for (var i = 0; i < length; i++) {
        var result;
        try {result = stream.tty.ops.get_char(stream.tty)} catch (e) {throw new FS.ErrnoError(5)}
        if (result === undefined && bytesRead === 0) {throw new FS.ErrnoError(11)}
        if (result === null || result === undefined) break;
        bytesRead++;
        buffer[offset + i] = result
      }
      if (bytesRead) {stream.node.timestamp = Date.now()}
      return bytesRead
    },
    write: function(stream, buffer, offset, length, pos) {
      if (!stream.tty || !stream.tty.ops.put_char) {throw new FS.ErrnoError(6)}
      try {for (var i = 0; i < length; i++) {stream.tty.ops.put_char(stream.tty, buffer[offset + i])}} catch (e) {throw new FS.ErrnoError(5)}
      if (length) {stream.node.timestamp = Date.now()}
      return i
    }
  },
  default_tty_ops: {
    get_char: function(tty) {
      if (!tty.input.length) {
        var result = null;
        if (ENVIRONMENT_IS_NODE) {
          var BUFSIZE = 256;
          var buf = Buffer.alloc ? Buffer.alloc(BUFSIZE) : new Buffer(BUFSIZE);
          var bytesRead = 0;
          var isPosixPlatform = process.platform != "win32";
          var fd = process.stdin.fd;
          if (isPosixPlatform) {
            var usingDevice = false;
            try {
              fd = fs.openSync("/dev/stdin", "r");
              usingDevice = true
            } catch (e) {}
          }
          try {bytesRead = fs.readSync(fd, buf, 0, BUFSIZE, null)} catch (e) {if (e.toString().indexOf("EOF") != -1) bytesRead = 0; else throw e}
          if (usingDevice) {fs.closeSync(fd)}
          if (bytesRead > 0) {result = buf.slice(0, bytesRead).toString("utf-8")} else {result = null}
        } else if (typeof window != "undefined" && typeof window.prompt == "function") {
          result = window.prompt("Input: ");
          if (result !== null) {result += "\n"}
        } else if (typeof readline == "function") {
          result = readline();
          if (result !== null) {result += "\n"}
        }
        if (!result) {return null}
        tty.input = intArrayFromString(result, true)
      }
      return tty.input.shift()
    }, put_char: function(tty, val) {
      if (val === null || val === 10) {
        out(UTF8ArrayToString(tty.output, 0));
        tty.output = []
      } else {if (val != 0) tty.output.push(val)}
    }, flush: function(tty) {
      if (tty.output && tty.output.length > 0) {
        out(UTF8ArrayToString(tty.output, 0));
        tty.output = []
      }
    }
  },
  default_tty1_ops: {
    put_char: function(tty, val) {
      if (val === null || val === 10) {
        err(UTF8ArrayToString(tty.output, 0));
        tty.output = []
      } else {if (val != 0) tty.output.push(val)}
    }, flush: function(tty) {
      if (tty.output && tty.output.length > 0) {
        err(UTF8ArrayToString(tty.output, 0));
        tty.output = []
      }
    }
  }
};
var MEMFS = {
  ops_table: null,
  mount: function(mount) {return MEMFS.createNode(null, "/", 16384 | 511, 0)},
  createNode: function(parent, name, mode, dev) {
    if (FS.isBlkdev(mode) || FS.isFIFO(mode)) {throw new FS.ErrnoError(1)}
    if (!MEMFS.ops_table) {
      MEMFS.ops_table = {
        dir: {
          node: {
            getattr: MEMFS.node_ops.getattr,
            setattr: MEMFS.node_ops.setattr,
            lookup: MEMFS.node_ops.lookup,
            mknod: MEMFS.node_ops.mknod,
            rename: MEMFS.node_ops.rename,
            unlink: MEMFS.node_ops.unlink,
            rmdir: MEMFS.node_ops.rmdir,
            readdir: MEMFS.node_ops.readdir,
            symlink: MEMFS.node_ops.symlink
          }, stream: {llseek: MEMFS.stream_ops.llseek}
        },
        file: {
          node: {getattr: MEMFS.node_ops.getattr, setattr: MEMFS.node_ops.setattr},
          stream: {
            llseek: MEMFS.stream_ops.llseek,
            read: MEMFS.stream_ops.read,
            write: MEMFS.stream_ops.write,
            allocate: MEMFS.stream_ops.allocate,
            mmap: MEMFS.stream_ops.mmap,
            msync: MEMFS.stream_ops.msync
          }
        },
        link: {
          node: {
            getattr: MEMFS.node_ops.getattr,
            setattr: MEMFS.node_ops.setattr,
            readlink: MEMFS.node_ops.readlink
          }, stream: {}
        },
        chrdev: {node: {getattr: MEMFS.node_ops.getattr, setattr: MEMFS.node_ops.setattr}, stream: FS.chrdev_stream_ops}
      }
    }
    var node = FS.createNode(parent, name, mode, dev);
    if (FS.isDir(node.mode)) {
      node.node_ops = MEMFS.ops_table.dir.node;
      node.stream_ops = MEMFS.ops_table.dir.stream;
      node.contents = {}
    } else if (FS.isFile(node.mode)) {
      node.node_ops = MEMFS.ops_table.file.node;
      node.stream_ops = MEMFS.ops_table.file.stream;
      node.usedBytes = 0;
      node.contents = null
    } else if (FS.isLink(node.mode)) {
      node.node_ops = MEMFS.ops_table.link.node;
      node.stream_ops = MEMFS.ops_table.link.stream
    } else if (FS.isChrdev(node.mode)) {
      node.node_ops = MEMFS.ops_table.chrdev.node;
      node.stream_ops = MEMFS.ops_table.chrdev.stream
    }
    node.timestamp = Date.now();
    if (parent) {parent.contents[name] = node}
    return node
  },
  getFileDataAsRegularArray: function(node) {
    if (node.contents && node.contents.subarray) {
      var arr = [];
      for (var i = 0; i < node.usedBytes; ++i) arr.push(node.contents[i]);
      return arr
    }
    return node.contents
  },
  getFileDataAsTypedArray: function(node) {
    if (!node.contents) return new Uint8Array;
    if (node.contents.subarray) return node.contents.subarray(0, node.usedBytes);
    return new Uint8Array(node.contents)
  },
  expandFileStorage: function(node, newCapacity) {
    var prevCapacity = node.contents ? node.contents.length : 0;
    if (prevCapacity >= newCapacity) return;
    var CAPACITY_DOUBLING_MAX = 1024 * 1024;
    newCapacity = Math.max(newCapacity, prevCapacity * (prevCapacity < CAPACITY_DOUBLING_MAX ? 2 : 1.125) | 0);
    if (prevCapacity != 0) newCapacity = Math.max(newCapacity, 256);
    var oldContents = node.contents;
    node.contents = new Uint8Array(newCapacity);
    if (node.usedBytes > 0) node.contents.set(oldContents.subarray(0, node.usedBytes), 0);
    return
  },
  resizeFileStorage: function(node, newSize) {
    if (node.usedBytes == newSize) return;
    if (newSize == 0) {
      node.contents = null;
      node.usedBytes = 0;
      return
    }
    if (!node.contents || node.contents.subarray) {
      var oldContents = node.contents;
      node.contents = new Uint8Array(new ArrayBuffer(newSize));
      if (oldContents) {node.contents.set(oldContents.subarray(0, Math.min(newSize, node.usedBytes)))}
      node.usedBytes = newSize;
      return
    }
    if (!node.contents) node.contents = [];
    if (node.contents.length > newSize) node.contents.length = newSize; else while (node.contents.length < newSize) node.contents.push(0);
    node.usedBytes = newSize
  },
  node_ops: {
    getattr: function(node) {
      var attr = {};
      attr.dev = FS.isChrdev(node.mode) ? node.id : 1;
      attr.ino = node.id;
      attr.mode = node.mode;
      attr.nlink = 1;
      attr.uid = 0;
      attr.gid = 0;
      attr.rdev = node.rdev;
      if (FS.isDir(node.mode)) {attr.size = 4096} else if (FS.isFile(node.mode)) {attr.size = node.usedBytes} else if (FS.isLink(node.mode)) {attr.size = node.link.length} else {attr.size = 0}
      attr.atime = new Date(node.timestamp);
      attr.mtime = new Date(node.timestamp);
      attr.ctime = new Date(node.timestamp);
      attr.blksize = 4096;
      attr.blocks = Math.ceil(attr.size / attr.blksize);
      return attr
    },
    setattr: function(node, attr) {
      if (attr.mode !== undefined) {node.mode = attr.mode}
      if (attr.timestamp !== undefined) {node.timestamp = attr.timestamp}
      if (attr.size !== undefined) {MEMFS.resizeFileStorage(node, attr.size)}
    },
    lookup: function(parent, name) {throw FS.genericErrors[2]},
    mknod: function(parent, name, mode, dev) {return MEMFS.createNode(parent, name, mode, dev)},
    rename: function(old_node, new_dir, new_name) {
      if (FS.isDir(old_node.mode)) {
        var new_node;
        try {new_node = FS.lookupNode(new_dir, new_name)} catch (e) {}
        if (new_node) {for (var i in new_node.contents) {throw new FS.ErrnoError(39)}}
      }
      delete old_node.parent.contents[old_node.name];
      old_node.name = new_name;
      new_dir.contents[new_name] = old_node;
      old_node.parent = new_dir
    },
    unlink: function(parent, name) {delete parent.contents[name]},
    rmdir: function(parent, name) {
      var node = FS.lookupNode(parent, name);
      for (var i in node.contents) {throw new FS.ErrnoError(39)}
      delete parent.contents[name]
    },
    readdir: function(node) {
      var entries = [".", ".."];
      for (var key in node.contents) {
        if (!node.contents.hasOwnProperty(key)) {continue}
        entries.push(key)
      }
      return entries
    },
    symlink: function(parent, newname, oldpath) {
      var node = MEMFS.createNode(parent, newname, 511 | 40960, 0);
      node.link = oldpath;
      return node
    },
    readlink: function(node) {
      if (!FS.isLink(node.mode)) {throw new FS.ErrnoError(22)}
      return node.link
    }
  },
  stream_ops: {
    read: function(stream, buffer, offset, length, position) {
      var contents = stream.node.contents;
      if (position >= stream.node.usedBytes) return 0;
      var size = Math.min(stream.node.usedBytes - position, length);
      if (size > 8 && contents.subarray) {buffer.set(contents.subarray(position, position + size), offset)} else {for (var i = 0; i < size; i++) buffer[offset + i] = contents[position + i]}
      return size
    },
    write: function(stream, buffer, offset, length, position, canOwn) {
      if (!length) return 0;
      var node = stream.node;
      node.timestamp = Date.now();
      if (buffer.subarray && (!node.contents || node.contents.subarray)) {
        if (canOwn) {
          node.contents = buffer.subarray(offset, offset + length);
          node.usedBytes = length;
          return length
        } else if (node.usedBytes === 0 && position === 0) {
          node.contents = new Uint8Array(buffer.subarray(offset, offset + length));
          node.usedBytes = length;
          return length
        } else if (position + length <= node.usedBytes) {
          node.contents.set(buffer.subarray(offset, offset + length), position);
          return length
        }
      }
      MEMFS.expandFileStorage(node, position + length);
      if (node.contents.subarray && buffer.subarray) node.contents.set(buffer.subarray(offset, offset + length), position); else {for (var i = 0; i < length; i++) {node.contents[position + i] = buffer[offset + i]}}
      node.usedBytes = Math.max(node.usedBytes, position + length);
      return length
    },
    llseek: function(stream, offset, whence) {
      var position = offset;
      if (whence === 1) {position += stream.position} else if (whence === 2) {if (FS.isFile(stream.node.mode)) {position += stream.node.usedBytes}}
      if (position < 0) {throw new FS.ErrnoError(22)}
      return position
    },
    allocate: function(stream, offset, length) {
      MEMFS.expandFileStorage(stream.node, offset + length);
      stream.node.usedBytes = Math.max(stream.node.usedBytes, offset + length)
    },
    mmap: function(stream, buffer, offset, length, position, prot, flags) {
      if (!FS.isFile(stream.node.mode)) {throw new FS.ErrnoError(19)}
      var ptr;
      var allocated;
      var contents = stream.node.contents;
      if (!(flags & 2) && (contents.buffer === buffer || contents.buffer === buffer.buffer)) {
        allocated = false;
        ptr = contents.byteOffset
      } else {
        if (position > 0 || position + length < stream.node.usedBytes) {if (contents.subarray) {contents = contents.subarray(position, position + length)} else {contents = Array.prototype.slice.call(contents, position, position + length)}}
        allocated = true;
        var fromHeap = buffer.buffer == HEAP8.buffer;
        ptr = _malloc(length);
        if (!ptr) {throw new FS.ErrnoError(12)}
        (fromHeap ? HEAP8 : buffer).set(contents, ptr)
      }
      return {ptr: ptr, allocated: allocated}
    },
    msync: function(stream, buffer, offset, length, mmapFlags) {
      if (!FS.isFile(stream.node.mode)) {throw new FS.ErrnoError(19)}
      if (mmapFlags & 2) {return 0}
      var bytesWritten = MEMFS.stream_ops.write(stream, buffer, 0, length, offset, false);
      return 0
    }
  }
};
var IDBFS = {
  dbs: {},
  indexedDB: function() {
    if (typeof indexedDB !== "undefined") return indexedDB;
    var ret = null;
    if (typeof window === "object") ret = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
    assert(ret, "IDBFS used, but indexedDB not supported");
    return ret
  },
  DB_VERSION: 21,
  DB_STORE_NAME: "FILE_DATA",
  mount: function(mount) {return MEMFS.mount.apply(null, arguments)},
  syncfs: function(mount, populate, callback) {
    IDBFS.getLocalSet(mount, function(err, local) {
      if (err) return callback(err);
      IDBFS.getRemoteSet(mount, function(err, remote) {
        if (err) return callback(err);
        var src = populate ? remote : local;
        var dst = populate ? local : remote;
        IDBFS.reconcile(src, dst, callback)
      })
    })
  },
  getDB: function(name, callback) {
    var db = IDBFS.dbs[name];
    if (db) {return callback(null, db)}
    var req;
    try {req = IDBFS.indexedDB().open(name, IDBFS.DB_VERSION)} catch (e) {return callback(e)}
    if (!req) {return callback("Unable to connect to IndexedDB")}
    req.onupgradeneeded = function(e) {
      var db = e.target.result;
      var transaction = e.target.transaction;
      var fileStore;
      if (db.objectStoreNames.contains(IDBFS.DB_STORE_NAME)) {fileStore = transaction.objectStore(IDBFS.DB_STORE_NAME)} else {fileStore = db.createObjectStore(IDBFS.DB_STORE_NAME)}
      if (!fileStore.indexNames.contains("timestamp")) {fileStore.createIndex("timestamp", "timestamp", {unique: false})}
    };
    req.onsuccess = function() {
      db = req.result;
      IDBFS.dbs[name] = db;
      callback(null, db)
    };
    req.onerror = function(e) {
      callback(this.error);
      e.preventDefault()
    }
  },
  getLocalSet: function(mount, callback) {
    var entries = {};

    function isRealDir (p) {return p !== "." && p !== ".."}

    function toAbsolute (root) {return function(p) {return PATH.join2(root, p)}}

    var check = FS.readdir(mount.mountpoint).filter(isRealDir).map(toAbsolute(mount.mountpoint));
    while (check.length) {
      var path = check.pop();
      var stat;
      try {stat = FS.stat(path)} catch (e) {return callback(e)}
      if (FS.isDir(stat.mode)) {check.push.apply(check, FS.readdir(path).filter(isRealDir).map(toAbsolute(path)))}
      entries[path] = {timestamp: stat.mtime}
    }
    return callback(null, {type: "local", entries: entries})
  },
  getRemoteSet: function(mount, callback) {
    var entries = {};
    IDBFS.getDB(mount.mountpoint, function(err, db) {
      if (err) return callback(err);
      try {
        var transaction = db.transaction([IDBFS.DB_STORE_NAME], "readonly");
        transaction.onerror = function(e) {
          callback(this.error);
          e.preventDefault()
        };
        var store = transaction.objectStore(IDBFS.DB_STORE_NAME);
        var index = store.index("timestamp");
        index.openKeyCursor().onsuccess = function(event) {
          var cursor = event.target.result;
          if (!cursor) {return callback(null, {type: "remote", db: db, entries: entries})}
          entries[cursor.primaryKey] = {timestamp: cursor.key};
          cursor.continue()
        }
      } catch (e) {return callback(e)}
    })
  },
  loadLocalEntry: function(path, callback) {
    var stat, node;
    try {
      var lookup = FS.lookupPath(path);
      node = lookup.node;
      stat = FS.stat(path)
    } catch (e) {return callback(e)}
    if (FS.isDir(stat.mode)) {
      return callback(null, {
        timestamp: stat.mtime,
        mode: stat.mode
      })
    } else if (FS.isFile(stat.mode)) {
      node.contents = MEMFS.getFileDataAsTypedArray(node);
      return callback(null, {timestamp: stat.mtime, mode: stat.mode, contents: node.contents})
    } else {return callback(new Error("node type not supported"))}
  },
  storeLocalEntry: function(path, entry, callback) {
    try {
      if (FS.isDir(entry.mode)) {FS.mkdir(path, entry.mode)} else if (FS.isFile(entry.mode)) {FS.writeFile(path, entry.contents, {canOwn: true})} else {return callback(new Error("node type not supported"))}
      FS.chmod(path, entry.mode);
      FS.utime(path, entry.timestamp, entry.timestamp)
    } catch (e) {return callback(e)}
    callback(null)
  },
  removeLocalEntry: function(path, callback) {
    try {
      var lookup = FS.lookupPath(path);
      var stat = FS.stat(path);
      if (FS.isDir(stat.mode)) {FS.rmdir(path)} else if (FS.isFile(stat.mode)) {FS.unlink(path)}
    } catch (e) {return callback(e)}
    callback(null)
  },
  loadRemoteEntry: function(store, path, callback) {
    var req = store.get(path);
    req.onsuccess = function(event) {callback(null, event.target.result)};
    req.onerror = function(e) {
      callback(this.error);
      e.preventDefault()
    }
  },
  storeRemoteEntry: function(store, path, entry, callback) {
    var req = store.put(entry, path);
    req.onsuccess = function() {callback(null)};
    req.onerror = function(e) {
      callback(this.error);
      e.preventDefault()
    }
  },
  removeRemoteEntry: function(store, path, callback) {
    var req = store.delete(path);
    req.onsuccess = function() {callback(null)};
    req.onerror = function(e) {
      callback(this.error);
      e.preventDefault()
    }
  },
  reconcile: function(src, dst, callback) {
    var total = 0;
    var create = [];
    Object.keys(src.entries).forEach(function(key) {
      var e = src.entries[key];
      var e2 = dst.entries[key];
      if (!e2 || e.timestamp > e2.timestamp) {
        create.push(key);
        total++
      }
    });
    var remove = [];
    Object.keys(dst.entries).forEach(function(key) {
      var e = dst.entries[key];
      var e2 = src.entries[key];
      if (!e2) {
        remove.push(key);
        total++
      }
    });
    if (!total) {return callback(null)}
    var errored = false;
    var db = src.type === "remote" ? src.db : dst.db;
    var transaction = db.transaction([IDBFS.DB_STORE_NAME], "readwrite");
    var store = transaction.objectStore(IDBFS.DB_STORE_NAME);

    function done (err) {
      if (err && !errored) {
        errored = true;
        return callback(err)
      }
    }

    transaction.onerror = function(e) {
      done(this.error);
      e.preventDefault()
    };
    transaction.oncomplete = function(e) {if (!errored) {callback(null)}};
    create.sort().forEach(function(path) {
      if (dst.type === "local") {
        IDBFS.loadRemoteEntry(store, path, function(err, entry) {
          if (err) return done(err);
          IDBFS.storeLocalEntry(path, entry, done)
        })
      } else {
        IDBFS.loadLocalEntry(path, function(err, entry) {
          if (err) return done(err);
          IDBFS.storeRemoteEntry(store, path, entry, done)
        })
      }
    });
    remove.sort().reverse().forEach(function(path) {if (dst.type === "local") {IDBFS.removeLocalEntry(path, done)} else {IDBFS.removeRemoteEntry(store, path, done)}})
  }
};
var NODEFS = {
  isWindows: false,
  staticInit: function() {
    NODEFS.isWindows = !!process.platform.match(/^win/);
    var flags = process["binding"]("constants");
    if (flags["fs"]) {flags = flags["fs"]}
    NODEFS.flagsForNodeMap = {
      1024: flags["O_APPEND"],
      64: flags["O_CREAT"],
      128: flags["O_EXCL"],
      0: flags["O_RDONLY"],
      2: flags["O_RDWR"],
      4096: flags["O_SYNC"],
      512: flags["O_TRUNC"],
      1: flags["O_WRONLY"]
    }
  },
  bufferFrom: function(arrayBuffer) {return Buffer.alloc ? Buffer.from(arrayBuffer) : new Buffer(arrayBuffer)},
  mount: function(mount) {
    assert(ENVIRONMENT_HAS_NODE);
    return NODEFS.createNode(null, "/", NODEFS.getMode(mount.opts.root), 0)
  },
  createNode: function(parent, name, mode, dev) {
    if (!FS.isDir(mode) && !FS.isFile(mode) && !FS.isLink(mode)) {throw new FS.ErrnoError(22)}
    var node = FS.createNode(parent, name, mode);
    node.node_ops = NODEFS.node_ops;
    node.stream_ops = NODEFS.stream_ops;
    return node
  },
  getMode: function(path) {
    var stat;
    try {
      stat = fs.lstatSync(path);
      if (NODEFS.isWindows) {stat.mode = stat.mode | (stat.mode & 292) >> 2}
    } catch (e) {
      if (!e.code) throw e;
      throw new FS.ErrnoError(-e.errno)
    }
    return stat.mode
  },
  realPath: function(node) {
    var parts = [];
    while (node.parent !== node) {
      parts.push(node.name);
      node = node.parent
    }
    parts.push(node.mount.opts.root);
    parts.reverse();
    return PATH.join.apply(null, parts)
  },
  flagsForNode: function(flags) {
    flags &= ~2097152;
    flags &= ~2048;
    flags &= ~32768;
    flags &= ~524288;
    var newFlags = 0;
    for (var k in NODEFS.flagsForNodeMap) {
      if (flags & k) {
        newFlags |= NODEFS.flagsForNodeMap[k];
        flags ^= k
      }
    }
    if (!flags) {return newFlags} else {throw new FS.ErrnoError(22)}
  },
  node_ops: {
    getattr: function(node) {
      var path = NODEFS.realPath(node);
      var stat;
      try {stat = fs.lstatSync(path)} catch (e) {
        if (!e.code) throw e;
        throw new FS.ErrnoError(-e.errno)
      }
      if (NODEFS.isWindows && !stat.blksize) {stat.blksize = 4096}
      if (NODEFS.isWindows && !stat.blocks) {stat.blocks = (stat.size + stat.blksize - 1) / stat.blksize | 0}
      return {
        dev: stat.dev,
        ino: stat.ino,
        mode: stat.mode,
        nlink: stat.nlink,
        uid: stat.uid,
        gid: stat.gid,
        rdev: stat.rdev,
        size: stat.size,
        atime: stat.atime,
        mtime: stat.mtime,
        ctime: stat.ctime,
        blksize: stat.blksize,
        blocks: stat.blocks
      }
    }, setattr: function(node, attr) {
      var path = NODEFS.realPath(node);
      try {
        if (attr.mode !== undefined) {
          fs.chmodSync(path, attr.mode);
          node.mode = attr.mode
        }
        if (attr.timestamp !== undefined) {
          var date = new Date(attr.timestamp);
          fs.utimesSync(path, date, date)
        }
        if (attr.size !== undefined) {fs.truncateSync(path, attr.size)}
      } catch (e) {
        if (!e.code) throw e;
        throw new FS.ErrnoError(-e.errno)
      }
    }, lookup: function(parent, name) {
      var path = PATH.join2(NODEFS.realPath(parent), name);
      var mode = NODEFS.getMode(path);
      return NODEFS.createNode(parent, name, mode)
    }, mknod: function(parent, name, mode, dev) {
      var node = NODEFS.createNode(parent, name, mode, dev);
      var path = NODEFS.realPath(node);
      try {if (FS.isDir(node.mode)) {fs.mkdirSync(path, node.mode)} else {fs.writeFileSync(path, "", {mode: node.mode})}} catch (e) {
        if (!e.code) throw e;
        throw new FS.ErrnoError(-e.errno)
      }
      return node
    }, rename: function(oldNode, newDir, newName) {
      var oldPath = NODEFS.realPath(oldNode);
      var newPath = PATH.join2(NODEFS.realPath(newDir), newName);
      try {fs.renameSync(oldPath, newPath)} catch (e) {
        if (!e.code) throw e;
        throw new FS.ErrnoError(-e.errno)
      }
    }, unlink: function(parent, name) {
      var path = PATH.join2(NODEFS.realPath(parent), name);
      try {fs.unlinkSync(path)} catch (e) {
        if (!e.code) throw e;
        throw new FS.ErrnoError(-e.errno)
      }
    }, rmdir: function(parent, name) {
      var path = PATH.join2(NODEFS.realPath(parent), name);
      try {fs.rmdirSync(path)} catch (e) {
        if (!e.code) throw e;
        throw new FS.ErrnoError(-e.errno)
      }
    }, readdir: function(node) {
      var path = NODEFS.realPath(node);
      try {return fs.readdirSync(path)} catch (e) {
        if (!e.code) throw e;
        throw new FS.ErrnoError(-e.errno)
      }
    }, symlink: function(parent, newName, oldPath) {
      var newPath = PATH.join2(NODEFS.realPath(parent), newName);
      try {fs.symlinkSync(oldPath, newPath)} catch (e) {
        if (!e.code) throw e;
        throw new FS.ErrnoError(-e.errno)
      }
    }, readlink: function(node) {
      var path = NODEFS.realPath(node);
      try {
        path = fs.readlinkSync(path);
        path = NODEJS_PATH.relative(NODEJS_PATH.resolve(node.mount.opts.root), path);
        return path
      } catch (e) {
        if (!e.code) throw e;
        throw new FS.ErrnoError(-e.errno)
      }
    }
  },
  stream_ops: {
    open: function(stream) {
      var path = NODEFS.realPath(stream.node);
      try {if (FS.isFile(stream.node.mode)) {stream.nfd = fs.openSync(path, NODEFS.flagsForNode(stream.flags))}} catch (e) {
        if (!e.code) throw e;
        throw new FS.ErrnoError(-e.errno)
      }
    },
    close: function(stream) {
      try {if (FS.isFile(stream.node.mode) && stream.nfd) {fs.closeSync(stream.nfd)}} catch (e) {
        if (!e.code) throw e;
        throw new FS.ErrnoError(-e.errno)
      }
    },
    read: function(stream, buffer, offset, length, position) {
      if (length === 0) return 0;
      try {return fs.readSync(stream.nfd, NODEFS.bufferFrom(buffer.buffer), offset, length, position)} catch (e) {throw new FS.ErrnoError(-e.errno)}
    },
    write: function(stream, buffer, offset, length, position) {try {return fs.writeSync(stream.nfd, NODEFS.bufferFrom(buffer.buffer), offset, length, position)} catch (e) {throw new FS.ErrnoError(-e.errno)}},
    llseek: function(stream, offset, whence) {
      var position = offset;
      if (whence === 1) {position += stream.position} else if (whence === 2) {
        if (FS.isFile(stream.node.mode)) {
          try {
            var stat = fs.fstatSync(stream.nfd);
            position += stat.size
          } catch (e) {throw new FS.ErrnoError(-e.errno)}
        }
      }
      if (position < 0) {throw new FS.ErrnoError(22)}
      return position
    }
  }
};
var WORKERFS = {
  DIR_MODE: 16895,
  FILE_MODE: 33279,
  reader: null,
  mount: function(mount) {
    assert(ENVIRONMENT_IS_WORKER);
    if (!WORKERFS.reader) WORKERFS.reader = new FileReaderSync;
    var root = WORKERFS.createNode(null, "/", WORKERFS.DIR_MODE, 0);
    var createdParents = {};

    function ensureParent (path) {
      var parts = path.split("/");
      var parent = root;
      for (var i = 0; i < parts.length - 1; i++) {
        var curr = parts.slice(0, i + 1).join("/");
        if (!createdParents[curr]) {createdParents[curr] = WORKERFS.createNode(parent, parts[i], WORKERFS.DIR_MODE, 0)}
        parent = createdParents[curr]
      }
      return parent
    }

    function base (path) {
      var parts = path.split("/");
      return parts[parts.length - 1]
    }

    Array.prototype.forEach.call(mount.opts["files"] || [], function(file) {WORKERFS.createNode(ensureParent(file.name), base(file.name), WORKERFS.FILE_MODE, 0, file, file.lastModifiedDate)});
    (mount.opts["blobs"] || []).forEach(function(obj) {WORKERFS.createNode(ensureParent(obj["name"]), base(obj["name"]), WORKERFS.FILE_MODE, 0, obj["data"])});
    (mount.opts["packages"] || []).forEach(function(pack) {
      pack["metadata"].files.forEach(function(file) {
        var name = file.filename.substr(1);
        WORKERFS.createNode(ensureParent(name), base(name), WORKERFS.FILE_MODE, 0, pack["blob"].slice(file.start, file.end))
      })
    });
    return root
  },
  createNode: function(parent, name, mode, dev, contents, mtime) {
    var node = FS.createNode(parent, name, mode);
    node.mode = mode;
    node.node_ops = WORKERFS.node_ops;
    node.stream_ops = WORKERFS.stream_ops;
    node.timestamp = (mtime || new Date).getTime();
    assert(WORKERFS.FILE_MODE !== WORKERFS.DIR_MODE);
    if (mode === WORKERFS.FILE_MODE) {
      node.size = contents.size;
      node.contents = contents
    } else {
      node.size = 4096;
      node.contents = {}
    }
    if (parent) {parent.contents[name] = node}
    return node
  },
  node_ops: {
    getattr: function(node) {
      return {
        dev: 1,
        ino: undefined,
        mode: node.mode,
        nlink: 1,
        uid: 0,
        gid: 0,
        rdev: undefined,
        size: node.size,
        atime: new Date(node.timestamp),
        mtime: new Date(node.timestamp),
        ctime: new Date(node.timestamp),
        blksize: 4096,
        blocks: Math.ceil(node.size / 4096)
      }
    },
    setattr: function(node, attr) {
      if (attr.mode !== undefined) {node.mode = attr.mode}
      if (attr.timestamp !== undefined) {node.timestamp = attr.timestamp}
    },
    lookup: function(parent, name) {throw new FS.ErrnoError(2)},
    mknod: function(parent, name, mode, dev) {throw new FS.ErrnoError(1)},
    rename: function(oldNode, newDir, newName) {throw new FS.ErrnoError(1)},
    unlink: function(parent, name) {throw new FS.ErrnoError(1)},
    rmdir: function(parent, name) {throw new FS.ErrnoError(1)},
    readdir: function(node) {
      var entries = [".", ".."];
      for (var key in node.contents) {
        if (!node.contents.hasOwnProperty(key)) {continue}
        entries.push(key)
      }
      return entries
    },
    symlink: function(parent, newName, oldPath) {throw new FS.ErrnoError(1)},
    readlink: function(node) {throw new FS.ErrnoError(1)}
  },
  stream_ops: {
    read: function(stream, buffer, offset, length, position) {
      if (position >= stream.node.size) return 0;
      var chunk = stream.node.contents.slice(position, position + length);
      var ab = WORKERFS.reader.readAsArrayBuffer(chunk);
      buffer.set(new Uint8Array(ab), offset);
      return chunk.size
    },
    write: function(stream, buffer, offset, length, position) {throw new FS.ErrnoError(5)},
    llseek: function(stream, offset, whence) {
      var position = offset;
      if (whence === 1) {position += stream.position} else if (whence === 2) {if (FS.isFile(stream.node.mode)) {position += stream.node.size}}
      if (position < 0) {throw new FS.ErrnoError(22)}
      return position
    }
  }
};
var FS = {
  root: null,
  mounts: [],
  devices: {},
  streams: [],
  nextInode: 1,
  nameTable: null,
  currentPath: "/",
  initialized: false,
  ignorePermissions: true,
  trackingDelegate: {},
  tracking: {openFlags: {READ: 1, WRITE: 2}},
  ErrnoError: null,
  genericErrors: {},
  filesystems: null,
  syncFSRequests: 0,
  handleFSError: function(e) {
    if (!(e instanceof FS.ErrnoError)) throw e + " : " + stackTrace();
    return ___setErrNo(e.errno)
  },
  lookupPath: function(path, opts) {
    path = PATH_FS.resolve(FS.cwd(), path);
    opts = opts || {};
    if (!path) return {path: "", node: null};
    var defaults = {follow_mount: true, recurse_count: 0};
    for (var key in defaults) {if (opts[key] === undefined) {opts[key] = defaults[key]}}
    if (opts.recurse_count > 8) {throw new FS.ErrnoError(40)}
    var parts = PATH.normalizeArray(path.split("/").filter(function(p) {return !!p}), false);
    var current = FS.root;
    var current_path = "/";
    for (var i = 0; i < parts.length; i++) {
      var islast = i === parts.length - 1;
      if (islast && opts.parent) {break}
      current = FS.lookupNode(current, parts[i]);
      current_path = PATH.join2(current_path, parts[i]);
      if (FS.isMountpoint(current)) {if (!islast || islast && opts.follow_mount) {current = current.mounted.root}}
      if (!islast || opts.follow) {
        var count = 0;
        while (FS.isLink(current.mode)) {
          var link = FS.readlink(current_path);
          current_path = PATH_FS.resolve(PATH.dirname(current_path), link);
          var lookup = FS.lookupPath(current_path, {recurse_count: opts.recurse_count});
          current = lookup.node;
          if (count++ > 40) {throw new FS.ErrnoError(40)}
        }
      }
    }
    return {path: current_path, node: current}
  },
  getPath: function(node) {
    var path;
    while (true) {
      if (FS.isRoot(node)) {
        var mount = node.mount.mountpoint;
        if (!path) return mount;
        return mount[mount.length - 1] !== "/" ? mount + "/" + path : mount + path
      }
      path = path ? node.name + "/" + path : node.name;
      node = node.parent
    }
  },
  hashName: function(parentid, name) {
    var hash = 0;
    for (var i = 0; i < name.length; i++) {hash = (hash << 5) - hash + name.charCodeAt(i) | 0}
    return (parentid + hash >>> 0) % FS.nameTable.length
  },
  hashAddNode: function(node) {
    var hash = FS.hashName(node.parent.id, node.name);
    node.name_next = FS.nameTable[hash];
    FS.nameTable[hash] = node
  },
  hashRemoveNode: function(node) {
    var hash = FS.hashName(node.parent.id, node.name);
    if (FS.nameTable[hash] === node) {FS.nameTable[hash] = node.name_next} else {
      var current = FS.nameTable[hash];
      while (current) {
        if (current.name_next === node) {
          current.name_next = node.name_next;
          break
        }
        current = current.name_next
      }
    }
  },
  lookupNode: function(parent, name) {
    var err = FS.mayLookup(parent);
    if (err) {throw new FS.ErrnoError(err, parent)}
    var hash = FS.hashName(parent.id, name);
    for (var node = FS.nameTable[hash]; node; node = node.name_next) {
      var nodeName = node.name;
      if (node.parent.id === parent.id && nodeName === name) {return node}
    }
    return FS.lookup(parent, name)
  },
  createNode: function(parent, name, mode, rdev) {
    if (!FS.FSNode) {
      FS.FSNode = function(parent, name, mode, rdev) {
        if (!parent) {parent = this}
        this.parent = parent;
        this.mount = parent.mount;
        this.mounted = null;
        this.id = FS.nextInode++;
        this.name = name;
        this.mode = mode;
        this.node_ops = {};
        this.stream_ops = {};
        this.rdev = rdev
      };
      FS.FSNode.prototype = {};
      var readMode = 292 | 73;
      var writeMode = 146;
      Object.defineProperties(FS.FSNode.prototype, {
        read: {
          get: function() {return (this.mode & readMode) === readMode},
          set: function(val) {val ? this.mode |= readMode : this.mode &= ~readMode}
        },
        write: {
          get: function() {return (this.mode & writeMode) === writeMode},
          set: function(val) {val ? this.mode |= writeMode : this.mode &= ~writeMode}
        },
        isFolder: {get: function() {return FS.isDir(this.mode)}},
        isDevice: {get: function() {return FS.isChrdev(this.mode)}}
      })
    }
    var node = new FS.FSNode(parent, name, mode, rdev);
    FS.hashAddNode(node);
    return node
  },
  destroyNode: function(node) {FS.hashRemoveNode(node)},
  isRoot: function(node) {return node === node.parent},
  isMountpoint: function(node) {return !!node.mounted},
  isFile: function(mode) {return (mode & 61440) === 32768},
  isDir: function(mode) {return (mode & 61440) === 16384},
  isLink: function(mode) {return (mode & 61440) === 40960},
  isChrdev: function(mode) {return (mode & 61440) === 8192},
  isBlkdev: function(mode) {return (mode & 61440) === 24576},
  isFIFO: function(mode) {return (mode & 61440) === 4096},
  isSocket: function(mode) {return (mode & 49152) === 49152},
  flagModes: {
    "r": 0,
    "rs": 1052672,
    "r+": 2,
    "w": 577,
    "wx": 705,
    "xw": 705,
    "w+": 578,
    "wx+": 706,
    "xw+": 706,
    "a": 1089,
    "ax": 1217,
    "xa": 1217,
    "a+": 1090,
    "ax+": 1218,
    "xa+": 1218
  },
  modeStringToFlags: function(str) {
    var flags = FS.flagModes[str];
    if (typeof flags === "undefined") {throw new Error("Unknown file open mode: " + str)}
    return flags
  },
  flagsToPermissionString: function(flag) {
    var perms = ["r", "w", "rw"][flag & 3];
    if (flag & 512) {perms += "w"}
    return perms
  },
  nodePermissions: function(node, perms) {
    if (FS.ignorePermissions) {return 0}
    if (perms.indexOf("r") !== -1 && !(node.mode & 292)) {return 13} else if (perms.indexOf("w") !== -1 && !(node.mode & 146)) {return 13} else if (perms.indexOf("x") !== -1 && !(node.mode & 73)) {return 13}
    return 0
  },
  mayLookup: function(dir) {
    var err = FS.nodePermissions(dir, "x");
    if (err) return err;
    if (!dir.node_ops.lookup) return 13;
    return 0
  },
  mayCreate: function(dir, name) {
    try {
      var node = FS.lookupNode(dir, name);
      return 17
    } catch (e) {}
    return FS.nodePermissions(dir, "wx")
  },
  mayDelete: function(dir, name, isdir) {
    var node;
    try {node = FS.lookupNode(dir, name)} catch (e) {return e.errno}
    var err = FS.nodePermissions(dir, "wx");
    if (err) {return err}
    if (isdir) {
      if (!FS.isDir(node.mode)) {return 20}
      if (FS.isRoot(node) || FS.getPath(node) === FS.cwd()) {return 16}
    } else {if (FS.isDir(node.mode)) {return 21}}
    return 0
  },
  mayOpen: function(node, flags) {
    if (!node) {return 2}
    if (FS.isLink(node.mode)) {return 40} else if (FS.isDir(node.mode)) {if (FS.flagsToPermissionString(flags) !== "r" || flags & 512) {return 21}}
    return FS.nodePermissions(node, FS.flagsToPermissionString(flags))
  },
  MAX_OPEN_FDS: 4096,
  nextfd: function(fd_start, fd_end) {
    fd_start = fd_start || 0;
    fd_end = fd_end || FS.MAX_OPEN_FDS;
    for (var fd = fd_start; fd <= fd_end; fd++) {if (!FS.streams[fd]) {return fd}}
    throw new FS.ErrnoError(24)
  },
  getStream: function(fd) {return FS.streams[fd]},
  createStream: function(stream, fd_start, fd_end) {
    if (!FS.FSStream) {
      FS.FSStream = function() {};
      FS.FSStream.prototype = {};
      Object.defineProperties(FS.FSStream.prototype, {
        object: {
          get: function() {return this.node},
          set: function(val) {this.node = val}
        },
        isRead: {get: function() {return (this.flags & 2097155) !== 1}},
        isWrite: {get: function() {return (this.flags & 2097155) !== 0}},
        isAppend: {get: function() {return this.flags & 1024}}
      })
    }
    var newStream = new FS.FSStream;
    for (var p in stream) {newStream[p] = stream[p]}
    stream = newStream;
    var fd = FS.nextfd(fd_start, fd_end);
    stream.fd = fd;
    FS.streams[fd] = stream;
    return stream
  },
  closeStream: function(fd) {FS.streams[fd] = null},
  chrdev_stream_ops: {
    open: function(stream) {
      var device = FS.getDevice(stream.node.rdev);
      stream.stream_ops = device.stream_ops;
      if (stream.stream_ops.open) {stream.stream_ops.open(stream)}
    }, llseek: function() {throw new FS.ErrnoError(29)}
  },
  major: function(dev) {return dev >> 8},
  minor: function(dev) {return dev & 255},
  makedev: function(ma, mi) {return ma << 8 | mi},
  registerDevice: function(dev, ops) {FS.devices[dev] = {stream_ops: ops}},
  getDevice: function(dev) {return FS.devices[dev]},
  getMounts: function(mount) {
    var mounts = [];
    var check = [mount];
    while (check.length) {
      var m = check.pop();
      mounts.push(m);
      check.push.apply(check, m.mounts)
    }
    return mounts
  },
  syncfs: function(populate, callback) {
    if (typeof populate === "function") {
      callback = populate;
      populate = false
    }
    FS.syncFSRequests++;
    if (FS.syncFSRequests > 1) {console.log("warning: " + FS.syncFSRequests + " FS.syncfs operations in flight at once, probably just doing extra work")}
    var mounts = FS.getMounts(FS.root.mount);
    var completed = 0;

    function doCallback (err) {
      FS.syncFSRequests--;
      return callback(err)
    }

    function done (err) {
      if (err) {
        if (!done.errored) {
          done.errored = true;
          return doCallback(err)
        }
        return
      }
      if (++completed >= mounts.length) {doCallback(null)}
    }

    mounts.forEach(function(mount) {
      if (!mount.type.syncfs) {return done(null)}
      mount.type.syncfs(mount, populate, done)
    })
  },
  mount: function(type, opts, mountpoint) {
    var root = mountpoint === "/";
    var pseudo = !mountpoint;
    var node;
    if (root && FS.root) {throw new FS.ErrnoError(16)} else if (!root && !pseudo) {
      var lookup = FS.lookupPath(mountpoint, {follow_mount: false});
      mountpoint = lookup.path;
      node = lookup.node;
      if (FS.isMountpoint(node)) {throw new FS.ErrnoError(16)}
      if (!FS.isDir(node.mode)) {throw new FS.ErrnoError(20)}
    }
    var mount = {type: type, opts: opts, mountpoint: mountpoint, mounts: []};
    var mountRoot = type.mount(mount);
    mountRoot.mount = mount;
    mount.root = mountRoot;
    if (root) {FS.root = mountRoot} else if (node) {
      node.mounted = mount;
      if (node.mount) {node.mount.mounts.push(mount)}
    }
    return mountRoot
  },
  unmount: function(mountpoint) {
    var lookup = FS.lookupPath(mountpoint, {follow_mount: false});
    if (!FS.isMountpoint(lookup.node)) {throw new FS.ErrnoError(22)}
    var node = lookup.node;
    var mount = node.mounted;
    var mounts = FS.getMounts(mount);
    Object.keys(FS.nameTable).forEach(function(hash) {
      var current = FS.nameTable[hash];
      while (current) {
        var next = current.name_next;
        if (mounts.indexOf(current.mount) !== -1) {FS.destroyNode(current)}
        current = next
      }
    });
    node.mounted = null;
    var idx = node.mount.mounts.indexOf(mount);
    node.mount.mounts.splice(idx, 1)
  },
  lookup: function(parent, name) {return parent.node_ops.lookup(parent, name)},
  mknod: function(path, mode, dev) {
    var lookup = FS.lookupPath(path, {parent: true});
    var parent = lookup.node;
    var name = PATH.basename(path);
    if (!name || name === "." || name === "..") {throw new FS.ErrnoError(22)}
    var err = FS.mayCreate(parent, name);
    if (err) {throw new FS.ErrnoError(err)}
    if (!parent.node_ops.mknod) {throw new FS.ErrnoError(1)}
    return parent.node_ops.mknod(parent, name, mode, dev)
  },
  create: function(path, mode) {
    mode = mode !== undefined ? mode : 438;
    mode &= 4095;
    mode |= 32768;
    return FS.mknod(path, mode, 0)
  },
  mkdir: function(path, mode) {
    mode = mode !== undefined ? mode : 511;
    mode &= 511 | 512;
    mode |= 16384;
    return FS.mknod(path, mode, 0)
  },
  mkdirTree: function(path, mode) {
    var dirs = path.split("/");
    var d = "";
    for (var i = 0; i < dirs.length; ++i) {
      if (!dirs[i]) continue;
      d += "/" + dirs[i];
      try {FS.mkdir(d, mode)} catch (e) {if (e.errno != 17) throw e}
    }
  },
  mkdev: function(path, mode, dev) {
    if (typeof dev === "undefined") {
      dev = mode;
      mode = 438
    }
    mode |= 8192;
    return FS.mknod(path, mode, dev)
  },
  symlink: function(oldpath, newpath) {
    if (!PATH_FS.resolve(oldpath)) {throw new FS.ErrnoError(2)}
    var lookup = FS.lookupPath(newpath, {parent: true});
    var parent = lookup.node;
    if (!parent) {throw new FS.ErrnoError(2)}
    var newname = PATH.basename(newpath);
    var err = FS.mayCreate(parent, newname);
    if (err) {throw new FS.ErrnoError(err)}
    if (!parent.node_ops.symlink) {throw new FS.ErrnoError(1)}
    return parent.node_ops.symlink(parent, newname, oldpath)
  },
  rename: function(old_path, new_path) {
    var old_dirname = PATH.dirname(old_path);
    var new_dirname = PATH.dirname(new_path);
    var old_name = PATH.basename(old_path);
    var new_name = PATH.basename(new_path);
    var lookup, old_dir, new_dir;
    try {
      lookup = FS.lookupPath(old_path, {parent: true});
      old_dir = lookup.node;
      lookup = FS.lookupPath(new_path, {parent: true});
      new_dir = lookup.node
    } catch (e) {throw new FS.ErrnoError(16)}
    if (!old_dir || !new_dir) throw new FS.ErrnoError(2);
    if (old_dir.mount !== new_dir.mount) {throw new FS.ErrnoError(18)}
    var old_node = FS.lookupNode(old_dir, old_name);
    var relative = PATH_FS.relative(old_path, new_dirname);
    if (relative.charAt(0) !== ".") {throw new FS.ErrnoError(22)}
    relative = PATH_FS.relative(new_path, old_dirname);
    if (relative.charAt(0) !== ".") {throw new FS.ErrnoError(39)}
    var new_node;
    try {new_node = FS.lookupNode(new_dir, new_name)} catch (e) {}
    if (old_node === new_node) {return}
    var isdir = FS.isDir(old_node.mode);
    var err = FS.mayDelete(old_dir, old_name, isdir);
    if (err) {throw new FS.ErrnoError(err)}
    err = new_node ? FS.mayDelete(new_dir, new_name, isdir) : FS.mayCreate(new_dir, new_name);
    if (err) {throw new FS.ErrnoError(err)}
    if (!old_dir.node_ops.rename) {throw new FS.ErrnoError(1)}
    if (FS.isMountpoint(old_node) || new_node && FS.isMountpoint(new_node)) {throw new FS.ErrnoError(16)}
    if (new_dir !== old_dir) {
      err = FS.nodePermissions(old_dir, "w");
      if (err) {throw new FS.ErrnoError(err)}
    }
    try {if (FS.trackingDelegate["willMovePath"]) {FS.trackingDelegate["willMovePath"](old_path, new_path)}} catch (e) {console.log("FS.trackingDelegate['willMovePath']('" + old_path + "', '" + new_path + "') threw an exception: " + e.message)}
    FS.hashRemoveNode(old_node);
    try {old_dir.node_ops.rename(old_node, new_dir, new_name)} catch (e) {throw e} finally {FS.hashAddNode(old_node)}
    try {if (FS.trackingDelegate["onMovePath"]) FS.trackingDelegate["onMovePath"](old_path, new_path)} catch (e) {console.log("FS.trackingDelegate['onMovePath']('" + old_path + "', '" + new_path + "') threw an exception: " + e.message)}
  },
  rmdir: function(path) {
    var lookup = FS.lookupPath(path, {parent: true});
    var parent = lookup.node;
    var name = PATH.basename(path);
    var node = FS.lookupNode(parent, name);
    var err = FS.mayDelete(parent, name, true);
    if (err) {throw new FS.ErrnoError(err)}
    if (!parent.node_ops.rmdir) {throw new FS.ErrnoError(1)}
    if (FS.isMountpoint(node)) {throw new FS.ErrnoError(16)}
    try {if (FS.trackingDelegate["willDeletePath"]) {FS.trackingDelegate["willDeletePath"](path)}} catch (e) {console.log("FS.trackingDelegate['willDeletePath']('" + path + "') threw an exception: " + e.message)}
    parent.node_ops.rmdir(parent, name);
    FS.destroyNode(node);
    try {if (FS.trackingDelegate["onDeletePath"]) FS.trackingDelegate["onDeletePath"](path)} catch (e) {console.log("FS.trackingDelegate['onDeletePath']('" + path + "') threw an exception: " + e.message)}
  },
  readdir: function(path) {
    var lookup = FS.lookupPath(path, {follow: true});
    var node = lookup.node;
    if (!node.node_ops.readdir) {throw new FS.ErrnoError(20)}
    return node.node_ops.readdir(node)
  },
  unlink: function(path) {
    var lookup = FS.lookupPath(path, {parent: true});
    var parent = lookup.node;
    var name = PATH.basename(path);
    var node = FS.lookupNode(parent, name);
    var err = FS.mayDelete(parent, name, false);
    if (err) {throw new FS.ErrnoError(err)}
    if (!parent.node_ops.unlink) {throw new FS.ErrnoError(1)}
    if (FS.isMountpoint(node)) {throw new FS.ErrnoError(16)}
    try {if (FS.trackingDelegate["willDeletePath"]) {FS.trackingDelegate["willDeletePath"](path)}} catch (e) {console.log("FS.trackingDelegate['willDeletePath']('" + path + "') threw an exception: " + e.message)}
    parent.node_ops.unlink(parent, name);
    FS.destroyNode(node);
    try {if (FS.trackingDelegate["onDeletePath"]) FS.trackingDelegate["onDeletePath"](path)} catch (e) {console.log("FS.trackingDelegate['onDeletePath']('" + path + "') threw an exception: " + e.message)}
  },
  readlink: function(path) {
    var lookup = FS.lookupPath(path);
    var link = lookup.node;
    if (!link) {throw new FS.ErrnoError(2)}
    if (!link.node_ops.readlink) {throw new FS.ErrnoError(22)}
    return PATH_FS.resolve(FS.getPath(link.parent), link.node_ops.readlink(link))
  },
  stat: function(path, dontFollow) {
    var lookup = FS.lookupPath(path, {follow: !dontFollow});
    var node = lookup.node;
    if (!node) {throw new FS.ErrnoError(2)}
    if (!node.node_ops.getattr) {throw new FS.ErrnoError(1)}
    return node.node_ops.getattr(node)
  },
  lstat: function(path) {return FS.stat(path, true)},
  chmod: function(path, mode, dontFollow) {
    var node;
    if (typeof path === "string") {
      var lookup = FS.lookupPath(path, {follow: !dontFollow});
      node = lookup.node
    } else {node = path}
    if (!node.node_ops.setattr) {throw new FS.ErrnoError(1)}
    node.node_ops.setattr(node, {mode: mode & 4095 | node.mode & ~4095, timestamp: Date.now()})
  },
  lchmod: function(path, mode) {FS.chmod(path, mode, true)},
  fchmod: function(fd, mode) {
    var stream = FS.getStream(fd);
    if (!stream) {throw new FS.ErrnoError(9)}
    FS.chmod(stream.node, mode)
  },
  chown: function(path, uid, gid, dontFollow) {
    var node;
    if (typeof path === "string") {
      var lookup = FS.lookupPath(path, {follow: !dontFollow});
      node = lookup.node
    } else {node = path}
    if (!node.node_ops.setattr) {throw new FS.ErrnoError(1)}
    node.node_ops.setattr(node, {timestamp: Date.now()})
  },
  lchown: function(path, uid, gid) {FS.chown(path, uid, gid, true)},
  fchown: function(fd, uid, gid) {
    var stream = FS.getStream(fd);
    if (!stream) {throw new FS.ErrnoError(9)}
    FS.chown(stream.node, uid, gid)
  },
  truncate: function(path, len) {
    if (len < 0) {throw new FS.ErrnoError(22)}
    var node;
    if (typeof path === "string") {
      var lookup = FS.lookupPath(path, {follow: true});
      node = lookup.node
    } else {node = path}
    if (!node.node_ops.setattr) {throw new FS.ErrnoError(1)}
    if (FS.isDir(node.mode)) {throw new FS.ErrnoError(21)}
    if (!FS.isFile(node.mode)) {throw new FS.ErrnoError(22)}
    var err = FS.nodePermissions(node, "w");
    if (err) {throw new FS.ErrnoError(err)}
    node.node_ops.setattr(node, {size: len, timestamp: Date.now()})
  },
  ftruncate: function(fd, len) {
    var stream = FS.getStream(fd);
    if (!stream) {throw new FS.ErrnoError(9)}
    if ((stream.flags & 2097155) === 0) {throw new FS.ErrnoError(22)}
    FS.truncate(stream.node, len)
  },
  utime: function(path, atime, mtime) {
    var lookup = FS.lookupPath(path, {follow: true});
    var node = lookup.node;
    node.node_ops.setattr(node, {timestamp: Math.max(atime, mtime)})
  },
  open: function(path, flags, mode, fd_start, fd_end) {
    if (path === "") {throw new FS.ErrnoError(2)}
    flags = typeof flags === "string" ? FS.modeStringToFlags(flags) : flags;
    mode = typeof mode === "undefined" ? 438 : mode;
    if (flags & 64) {mode = mode & 4095 | 32768} else {mode = 0}
    var node;
    if (typeof path === "object") {node = path} else {
      path = PATH.normalize(path);
      try {
        var lookup = FS.lookupPath(path, {follow: !(flags & 131072)});
        node = lookup.node
      } catch (e) {}
    }
    var created = false;
    if (flags & 64) {
      if (node) {if (flags & 128) {throw new FS.ErrnoError(17)}} else {
        node = FS.mknod(path, mode, 0);
        created = true
      }
    }
    if (!node) {throw new FS.ErrnoError(2)}
    if (FS.isChrdev(node.mode)) {flags &= ~512}
    if (flags & 65536 && !FS.isDir(node.mode)) {throw new FS.ErrnoError(20)}
    if (!created) {
      var err = FS.mayOpen(node, flags);
      if (err) {throw new FS.ErrnoError(err)}
    }
    if (flags & 512) {FS.truncate(node, 0)}
    flags &= ~(128 | 512);
    var stream = FS.createStream({
      node: node,
      path: FS.getPath(node),
      flags: flags,
      seekable: true,
      position: 0,
      stream_ops: node.stream_ops,
      ungotten: [],
      error: false
    }, fd_start, fd_end);
    if (stream.stream_ops.open) {stream.stream_ops.open(stream)}
    if (Module["logReadFiles"] && !(flags & 1)) {
      if (!FS.readFiles) FS.readFiles = {};
      if (!(path in FS.readFiles)) {
        FS.readFiles[path] = 1;
        console.log("FS.trackingDelegate error on read file: " + path)
      }
    }
    try {
      if (FS.trackingDelegate["onOpenFile"]) {
        var trackingFlags = 0;
        if ((flags & 2097155) !== 1) {trackingFlags |= FS.tracking.openFlags.READ}
        if ((flags & 2097155) !== 0) {trackingFlags |= FS.tracking.openFlags.WRITE}
        FS.trackingDelegate["onOpenFile"](path, trackingFlags)
      }
    } catch (e) {console.log("FS.trackingDelegate['onOpenFile']('" + path + "', flags) threw an exception: " + e.message)}
    return stream
  },
  close: function(stream) {
    if (FS.isClosed(stream)) {throw new FS.ErrnoError(9)}
    if (stream.getdents) stream.getdents = null;
    try {if (stream.stream_ops.close) {stream.stream_ops.close(stream)}} catch (e) {throw e} finally {FS.closeStream(stream.fd)}
    stream.fd = null
  },
  isClosed: function(stream) {return stream.fd === null},
  llseek: function(stream, offset, whence) {
    if (FS.isClosed(stream)) {throw new FS.ErrnoError(9)}
    if (!stream.seekable || !stream.stream_ops.llseek) {throw new FS.ErrnoError(29)}
    if (whence != 0 && whence != 1 && whence != 2) {throw new FS.ErrnoError(22)}
    stream.position = stream.stream_ops.llseek(stream, offset, whence);
    stream.ungotten = [];
    return stream.position
  },
  read: function(stream, buffer, offset, length, position) {
    if (length < 0 || position < 0) {throw new FS.ErrnoError(22)}
    if (FS.isClosed(stream)) {throw new FS.ErrnoError(9)}
    if ((stream.flags & 2097155) === 1) {throw new FS.ErrnoError(9)}
    if (FS.isDir(stream.node.mode)) {throw new FS.ErrnoError(21)}
    if (!stream.stream_ops.read) {throw new FS.ErrnoError(22)}
    var seeking = typeof position !== "undefined";
    if (!seeking) {position = stream.position} else if (!stream.seekable) {throw new FS.ErrnoError(29)}
    var bytesRead = stream.stream_ops.read(stream, buffer, offset, length, position);
    if (!seeking) stream.position += bytesRead;
    return bytesRead
  },
  write: function(stream, buffer, offset, length, position, canOwn) {
    if (length < 0 || position < 0) {throw new FS.ErrnoError(22)}
    if (FS.isClosed(stream)) {throw new FS.ErrnoError(9)}
    if ((stream.flags & 2097155) === 0) {throw new FS.ErrnoError(9)}
    if (FS.isDir(stream.node.mode)) {throw new FS.ErrnoError(21)}
    if (!stream.stream_ops.write) {throw new FS.ErrnoError(22)}
    if (stream.flags & 1024) {FS.llseek(stream, 0, 2)}
    var seeking = typeof position !== "undefined";
    if (!seeking) {position = stream.position} else if (!stream.seekable) {throw new FS.ErrnoError(29)}
    var bytesWritten = stream.stream_ops.write(stream, buffer, offset, length, position, canOwn);
    if (!seeking) stream.position += bytesWritten;
    try {if (stream.path && FS.trackingDelegate["onWriteToFile"]) FS.trackingDelegate["onWriteToFile"](stream.path)} catch (e) {console.log("FS.trackingDelegate['onWriteToFile']('" + stream.path + "') threw an exception: " + e.message)}
    return bytesWritten
  },
  allocate: function(stream, offset, length) {
    if (FS.isClosed(stream)) {throw new FS.ErrnoError(9)}
    if (offset < 0 || length <= 0) {throw new FS.ErrnoError(22)}
    if ((stream.flags & 2097155) === 0) {throw new FS.ErrnoError(9)}
    if (!FS.isFile(stream.node.mode) && !FS.isDir(stream.node.mode)) {throw new FS.ErrnoError(19)}
    if (!stream.stream_ops.allocate) {throw new FS.ErrnoError(95)}
    stream.stream_ops.allocate(stream, offset, length)
  },
  mmap: function(stream, buffer, offset, length, position, prot, flags) {
    if ((prot & 2) !== 0 && (flags & 2) === 0 && (stream.flags & 2097155) !== 2) {throw new FS.ErrnoError(13)}
    if ((stream.flags & 2097155) === 1) {throw new FS.ErrnoError(13)}
    if (!stream.stream_ops.mmap) {throw new FS.ErrnoError(19)}
    return stream.stream_ops.mmap(stream, buffer, offset, length, position, prot, flags)
  },
  msync: function(stream, buffer, offset, length, mmapFlags) {
    if (!stream || !stream.stream_ops.msync) {return 0}
    return stream.stream_ops.msync(stream, buffer, offset, length, mmapFlags)
  },
  munmap: function(stream) {return 0},
  ioctl: function(stream, cmd, arg) {
    if (!stream.stream_ops.ioctl) {throw new FS.ErrnoError(25)}
    return stream.stream_ops.ioctl(stream, cmd, arg)
  },
  readFile: function(path, opts) {
    opts = opts || {};
    opts.flags = opts.flags || "r";
    opts.encoding = opts.encoding || "binary";
    if (opts.encoding !== "utf8" && opts.encoding !== "binary") {throw new Error('Invalid encoding type "' + opts.encoding + '"')}
    var ret;
    var stream = FS.open(path, opts.flags);
    var stat = FS.stat(path);
    var length = stat.size;
    var buf = new Uint8Array(length);
    FS.read(stream, buf, 0, length, 0);
    if (opts.encoding === "utf8") {ret = UTF8ArrayToString(buf, 0)} else if (opts.encoding === "binary") {ret = buf}
    FS.close(stream);
    return ret
  },
  writeFile: function(path, data, opts) {
    opts = opts || {};
    opts.flags = opts.flags || "w";
    var stream = FS.open(path, opts.flags, opts.mode);
    if (typeof data === "string") {
      var buf = new Uint8Array(lengthBytesUTF8(data) + 1);
      var actualNumBytes = stringToUTF8Array(data, buf, 0, buf.length);
      FS.write(stream, buf, 0, actualNumBytes, undefined, opts.canOwn)
    } else if (ArrayBuffer.isView(data)) {FS.write(stream, data, 0, data.byteLength, undefined, opts.canOwn)} else {throw new Error("Unsupported data type")}
    FS.close(stream)
  },
  cwd: function() {return FS.currentPath},
  chdir: function(path) {
    var lookup = FS.lookupPath(path, {follow: true});
    if (lookup.node === null) {throw new FS.ErrnoError(2)}
    if (!FS.isDir(lookup.node.mode)) {throw new FS.ErrnoError(20)}
    var err = FS.nodePermissions(lookup.node, "x");
    if (err) {throw new FS.ErrnoError(err)}
    FS.currentPath = lookup.path
  },
  createDefaultDirectories: function() {
    FS.mkdir("/tmp");
    FS.mkdir("/home");
    FS.mkdir("/home/web_user")
  },
  createDefaultDevices: function() {
    FS.mkdir("/dev");
    FS.registerDevice(FS.makedev(1, 3), {
      read: function() {return 0},
      write: function(stream, buffer, offset, length, pos) {return length}
    });
    FS.mkdev("/dev/null", FS.makedev(1, 3));
    TTY.register(FS.makedev(5, 0), TTY.default_tty_ops);
    TTY.register(FS.makedev(6, 0), TTY.default_tty1_ops);
    FS.mkdev("/dev/tty", FS.makedev(5, 0));
    FS.mkdev("/dev/tty1", FS.makedev(6, 0));
    var random_device;
    if (typeof crypto === "object" && typeof crypto["getRandomValues"] === "function") {
      var randomBuffer = new Uint8Array(1);
      random_device = function() {
        crypto.getRandomValues(randomBuffer);
        return randomBuffer[0]
      }
    } else if (ENVIRONMENT_IS_NODE) {
      try {
        var crypto_module = require("crypto");
        random_device = function() {return crypto_module["randomBytes"](1)[0]}
      } catch (e) {}
    } else {}
    if (!random_device) {random_device = function() {abort("random_device")}}
    FS.createDevice("/dev", "random", random_device);
    FS.createDevice("/dev", "urandom", random_device);
    FS.mkdir("/dev/shm");
    FS.mkdir("/dev/shm/tmp")
  },
  createSpecialDirectories: function() {
    FS.mkdir("/proc");
    FS.mkdir("/proc/self");
    FS.mkdir("/proc/self/fd");
    FS.mount({
      mount: function() {
        var node = FS.createNode("/proc/self", "fd", 16384 | 511, 73);
        node.node_ops = {
          lookup: function(parent, name) {
            var fd = +name;
            var stream = FS.getStream(fd);
            if (!stream) throw new FS.ErrnoError(9);
            var ret = {
              parent: null,
              mount: {mountpoint: "fake"},
              node_ops: {readlink: function() {return stream.path}}
            };
            ret.parent = ret;
            return ret
          }
        };
        return node
      }
    }, {}, "/proc/self/fd")
  },
  createStandardStreams: function() {
    if (Module["stdin"]) {FS.createDevice("/dev", "stdin", Module["stdin"])} else {FS.symlink("/dev/tty", "/dev/stdin")}
    if (Module["stdout"]) {FS.createDevice("/dev", "stdout", null, Module["stdout"])} else {FS.symlink("/dev/tty", "/dev/stdout")}
    if (Module["stderr"]) {FS.createDevice("/dev", "stderr", null, Module["stderr"])} else {FS.symlink("/dev/tty1", "/dev/stderr")}
    var stdin = FS.open("/dev/stdin", "r");
    var stdout = FS.open("/dev/stdout", "w");
    var stderr = FS.open("/dev/stderr", "w")
  },
  ensureErrnoError: function() {
    if (FS.ErrnoError) return;
    FS.ErrnoError = function ErrnoError (errno, node) {
      this.node = node;
      this.setErrno = function(errno) {this.errno = errno};
      this.setErrno(errno);
      this.message = "FS error"
    };
    FS.ErrnoError.prototype = new Error;
    FS.ErrnoError.prototype.constructor = FS.ErrnoError;
    [2].forEach(function(code) {
      FS.genericErrors[code] = new FS.ErrnoError(code);
      FS.genericErrors[code].stack = "<generic error, no stack>"
    })
  },
  staticInit: function() {
    FS.ensureErrnoError();
    FS.nameTable = new Array(4096);
    FS.mount(MEMFS, {}, "/");
    FS.createDefaultDirectories();
    FS.createDefaultDevices();
    FS.createSpecialDirectories();
    FS.filesystems = {"MEMFS": MEMFS, "IDBFS": IDBFS, "NODEFS": NODEFS, "WORKERFS": WORKERFS}
  },
  init: function(input, output, error) {
    FS.init.initialized = true;
    FS.ensureErrnoError();
    Module["stdin"] = input || Module["stdin"];
    Module["stdout"] = output || Module["stdout"];
    Module["stderr"] = error || Module["stderr"];
    FS.createStandardStreams()
  },
  quit: function() {
    FS.init.initialized = false;
    var fflush = Module["_fflush"];
    if (fflush) fflush(0);
    for (var i = 0; i < FS.streams.length; i++) {
      var stream = FS.streams[i];
      if (!stream) {continue}
      FS.close(stream)
    }
  },
  getMode: function(canRead, canWrite) {
    var mode = 0;
    if (canRead) mode |= 292 | 73;
    if (canWrite) mode |= 146;
    return mode
  },
  joinPath: function(parts, forceRelative) {
    var path = PATH.join.apply(null, parts);
    if (forceRelative && path[0] == "/") path = path.substr(1);
    return path
  },
  absolutePath: function(relative, base) {return PATH_FS.resolve(base, relative)},
  standardizePath: function(path) {return PATH.normalize(path)},
  findObject: function(path, dontResolveLastLink) {
    var ret = FS.analyzePath(path, dontResolveLastLink);
    if (ret.exists) {return ret.object} else {
      ___setErrNo(ret.error);
      return null
    }
  },
  analyzePath: function(path, dontResolveLastLink) {
    try {
      var lookup = FS.lookupPath(path, {follow: !dontResolveLastLink});
      path = lookup.path
    } catch (e) {}
    var ret = {
      isRoot: false,
      exists: false,
      error: 0,
      name: null,
      path: null,
      object: null,
      parentExists: false,
      parentPath: null,
      parentObject: null
    };
    try {
      var lookup = FS.lookupPath(path, {parent: true});
      ret.parentExists = true;
      ret.parentPath = lookup.path;
      ret.parentObject = lookup.node;
      ret.name = PATH.basename(path);
      lookup = FS.lookupPath(path, {follow: !dontResolveLastLink});
      ret.exists = true;
      ret.path = lookup.path;
      ret.object = lookup.node;
      ret.name = lookup.node.name;
      ret.isRoot = lookup.path === "/"
    } catch (e) {ret.error = e.errno}
    return ret
  },
  createFolder: function(parent, name, canRead, canWrite) {
    var path = PATH.join2(typeof parent === "string" ? parent : FS.getPath(parent), name);
    var mode = FS.getMode(canRead, canWrite);
    return FS.mkdir(path, mode)
  },
  createPath: function(parent, path, canRead, canWrite) {
    parent = typeof parent === "string" ? parent : FS.getPath(parent);
    var parts = path.split("/").reverse();
    while (parts.length) {
      var part = parts.pop();
      if (!part) continue;
      var current = PATH.join2(parent, part);
      try {FS.mkdir(current)} catch (e) {}
      parent = current
    }
    return current
  },
  createFile: function(parent, name, properties, canRead, canWrite) {
    var path = PATH.join2(typeof parent === "string" ? parent : FS.getPath(parent), name);
    var mode = FS.getMode(canRead, canWrite);
    return FS.create(path, mode)
  },
  createDataFile: function(parent, name, data, canRead, canWrite, canOwn) {
    var path = name ? PATH.join2(typeof parent === "string" ? parent : FS.getPath(parent), name) : parent;
    var mode = FS.getMode(canRead, canWrite);
    var node = FS.create(path, mode);
    if (data) {
      if (typeof data === "string") {
        var arr = new Array(data.length);
        for (var i = 0, len = data.length; i < len; ++i) arr[i] = data.charCodeAt(i);
        data = arr
      }
      FS.chmod(node, mode | 146);
      var stream = FS.open(node, "w");
      FS.write(stream, data, 0, data.length, 0, canOwn);
      FS.close(stream);
      FS.chmod(node, mode)
    }
    return node
  },
  createDevice: function(parent, name, input, output) {
    var path = PATH.join2(typeof parent === "string" ? parent : FS.getPath(parent), name);
    var mode = FS.getMode(!!input, !!output);
    if (!FS.createDevice.major) FS.createDevice.major = 64;
    var dev = FS.makedev(FS.createDevice.major++, 0);
    FS.registerDevice(dev, {
      open: function(stream) {stream.seekable = false},
      close: function(stream) {if (output && output.buffer && output.buffer.length) {output(10)}},
      read: function(stream, buffer, offset, length, pos) {
        var bytesRead = 0;
        for (var i = 0; i < length; i++) {
          var result;
          try {result = input()} catch (e) {throw new FS.ErrnoError(5)}
          if (result === undefined && bytesRead === 0) {throw new FS.ErrnoError(11)}
          if (result === null || result === undefined) break;
          bytesRead++;
          buffer[offset + i] = result
        }
        if (bytesRead) {stream.node.timestamp = Date.now()}
        return bytesRead
      },
      write: function(stream, buffer, offset, length, pos) {
        for (var i = 0; i < length; i++) {try {output(buffer[offset + i])} catch (e) {throw new FS.ErrnoError(5)}}
        if (length) {stream.node.timestamp = Date.now()}
        return i
      }
    });
    return FS.mkdev(path, mode, dev)
  },
  createLink: function(parent, name, target, canRead, canWrite) {
    var path = PATH.join2(typeof parent === "string" ? parent : FS.getPath(parent), name);
    return FS.symlink(target, path)
  },
  forceLoadFile: function(obj) {
    if (obj.isDevice || obj.isFolder || obj.link || obj.contents) return true;
    var success = true;
    if (typeof XMLHttpRequest !== "undefined") {throw new Error("Lazy loading should have been performed (contents set) in createLazyFile, but it was not. Lazy loading only works in web workers. Use --embed-file or --preload-file in emcc on the main thread.")} else if (read_) {
      try {
        obj.contents = intArrayFromString(read_(obj.url), true);
        obj.usedBytes = obj.contents.length
      } catch (e) {success = false}
    } else {throw new Error("Cannot load without read() or XMLHttpRequest.")}
    if (!success) ___setErrNo(5);
    return success
  },
  createLazyFile: function(parent, name, url, canRead, canWrite) {
    function LazyUint8Array () {
      this.lengthKnown = false;
      this.chunks = []
    }

    LazyUint8Array.prototype.get = function LazyUint8Array_get (idx) {
      if (idx > this.length - 1 || idx < 0) {return undefined}
      var chunkOffset = idx % this.chunkSize;
      var chunkNum = idx / this.chunkSize | 0;
      return this.getter(chunkNum)[chunkOffset]
    };
    LazyUint8Array.prototype.setDataGetter = function LazyUint8Array_setDataGetter (getter) {this.getter = getter};
    LazyUint8Array.prototype.cacheLength = function LazyUint8Array_cacheLength () {
      var xhr = new XMLHttpRequest;
      xhr.open("HEAD", url, false);
      xhr.send(null);
      if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
      var datalength = Number(xhr.getResponseHeader("Content-length"));
      var header;
      var hasByteServing = (header = xhr.getResponseHeader("Accept-Ranges")) && header === "bytes";
      var usesGzip = (header = xhr.getResponseHeader("Content-Encoding")) && header === "gzip";
      var chunkSize = 1024 * 1024;
      if (!hasByteServing) chunkSize = datalength;
      var doXHR = function(from, to) {
        if (from > to) throw new Error("invalid range (" + from + ", " + to + ") or no bytes requested!");
        if (to > datalength - 1) throw new Error("only " + datalength + " bytes available! programmer error!");
        var xhr = new XMLHttpRequest;
        xhr.open("GET", url, false);
        if (datalength !== chunkSize) xhr.setRequestHeader("Range", "bytes=" + from + "-" + to);
        if (typeof Uint8Array != "undefined") xhr.responseType = "arraybuffer";
        if (xhr.overrideMimeType) {xhr.overrideMimeType("text/plain; charset=x-user-defined")}
        xhr.send(null);
        if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
        if (xhr.response !== undefined) {return new Uint8Array(xhr.response || [])} else {return intArrayFromString(xhr.responseText || "", true)}
      };
      var lazyArray = this;
      lazyArray.setDataGetter(function(chunkNum) {
        var start = chunkNum * chunkSize;
        var end = (chunkNum + 1) * chunkSize - 1;
        end = Math.min(end, datalength - 1);
        if (typeof lazyArray.chunks[chunkNum] === "undefined") {lazyArray.chunks[chunkNum] = doXHR(start, end)}
        if (typeof lazyArray.chunks[chunkNum] === "undefined") throw new Error("doXHR failed!");
        return lazyArray.chunks[chunkNum]
      });
      if (usesGzip || !datalength) {
        chunkSize = datalength = 1;
        datalength = this.getter(0).length;
        chunkSize = datalength;
        console.log("LazyFiles on gzip forces download of the whole file when length is accessed")
      }
      this._length = datalength;
      this._chunkSize = chunkSize;
      this.lengthKnown = true
    };
    if (typeof XMLHttpRequest !== "undefined") {
      if (!ENVIRONMENT_IS_WORKER) throw"Cannot do synchronous binary XHRs outside webworkers in modern browsers. Use --embed-file or --preload-file in emcc";
      var lazyArray = new LazyUint8Array;
      Object.defineProperties(lazyArray, {
        length: {
          get: function() {
            if (!this.lengthKnown) {this.cacheLength()}
            return this._length
          }
        }, chunkSize: {
          get: function() {
            if (!this.lengthKnown) {this.cacheLength()}
            return this._chunkSize
          }
        }
      });
      var properties = {isDevice: false, contents: lazyArray}
    } else {var properties = {isDevice: false, url: url}}
    var node = FS.createFile(parent, name, properties, canRead, canWrite);
    if (properties.contents) {node.contents = properties.contents} else if (properties.url) {
      node.contents = null;
      node.url = properties.url
    }
    Object.defineProperties(node, {usedBytes: {get: function() {return this.contents.length}}});
    var stream_ops = {};
    var keys = Object.keys(node.stream_ops);
    keys.forEach(function(key) {
      var fn = node.stream_ops[key];
      stream_ops[key] = function forceLoadLazyFile () {
        if (!FS.forceLoadFile(node)) {throw new FS.ErrnoError(5)}
        return fn.apply(null, arguments)
      }
    });
    stream_ops.read = function stream_ops_read (stream, buffer, offset, length, position) {
      if (!FS.forceLoadFile(node)) {throw new FS.ErrnoError(5)}
      var contents = stream.node.contents;
      if (position >= contents.length) return 0;
      var size = Math.min(contents.length - position, length);
      if (contents.slice) {for (var i = 0; i < size; i++) {buffer[offset + i] = contents[position + i]}} else {for (var i = 0; i < size; i++) {buffer[offset + i] = contents.get(position + i)}}
      return size
    };
    node.stream_ops = stream_ops;
    return node
  },
  createPreloadedFile: function(parent, name, url, canRead, canWrite, onload, onerror, dontCreateFile, canOwn, preFinish) {
    Browser.init();
    var fullname = name ? PATH_FS.resolve(PATH.join2(parent, name)) : parent;
    var dep = getUniqueRunDependency("cp " + fullname);

    function processData (byteArray) {
      function finish (byteArray) {
        if (preFinish) preFinish();
        if (!dontCreateFile) {FS.createDataFile(parent, name, byteArray, canRead, canWrite, canOwn)}
        if (onload) onload();
        removeRunDependency(dep)
      }

      var handled = false;
      Module["preloadPlugins"].forEach(function(plugin) {
        if (handled) return;
        if (plugin["canHandle"](fullname)) {
          plugin["handle"](byteArray, fullname, finish, function() {
            if (onerror) onerror();
            removeRunDependency(dep)
          });
          handled = true
        }
      });
      if (!handled) finish(byteArray)
    }

    addRunDependency(dep);
    if (typeof url == "string") {Browser.asyncLoad(url, function(byteArray) {processData(byteArray)}, onerror)} else {processData(url)}
  },
  indexedDB: function() {return window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB},
  DB_NAME: function() {return "EM_FS_" + window.location.pathname},
  DB_VERSION: 20,
  DB_STORE_NAME: "FILE_DATA",
  saveFilesToDB: function(paths, onload, onerror) {
    onload = onload || function() {};
    onerror = onerror || function() {};
    var indexedDB = FS.indexedDB();
    try {var openRequest = indexedDB.open(FS.DB_NAME(), FS.DB_VERSION)} catch (e) {return onerror(e)}
    openRequest.onupgradeneeded = function openRequest_onupgradeneeded () {
      console.log("creating db");
      var db = openRequest.result;
      db.createObjectStore(FS.DB_STORE_NAME)
    };
    openRequest.onsuccess = function openRequest_onsuccess () {
      var db = openRequest.result;
      var transaction = db.transaction([FS.DB_STORE_NAME], "readwrite");
      var files = transaction.objectStore(FS.DB_STORE_NAME);
      var ok = 0, fail = 0, total = paths.length;

      function finish () {if (fail == 0) onload(); else onerror()}

      paths.forEach(function(path) {
        var putRequest = files.put(FS.analyzePath(path).object.contents, path);
        putRequest.onsuccess = function putRequest_onsuccess () {
          ok++;
          if (ok + fail == total) finish()
        };
        putRequest.onerror = function putRequest_onerror () {
          fail++;
          if (ok + fail == total) finish()
        }
      });
      transaction.onerror = onerror
    };
    openRequest.onerror = onerror
  },
  loadFilesFromDB: function(paths, onload, onerror) {
    onload = onload || function() {};
    onerror = onerror || function() {};
    var indexedDB = FS.indexedDB();
    try {var openRequest = indexedDB.open(FS.DB_NAME(), FS.DB_VERSION)} catch (e) {return onerror(e)}
    openRequest.onupgradeneeded = onerror;
    openRequest.onsuccess = function openRequest_onsuccess () {
      var db = openRequest.result;
      try {var transaction = db.transaction([FS.DB_STORE_NAME], "readonly")} catch (e) {
        onerror(e);
        return
      }
      var files = transaction.objectStore(FS.DB_STORE_NAME);
      var ok = 0, fail = 0, total = paths.length;

      function finish () {if (fail == 0) onload(); else onerror()}

      paths.forEach(function(path) {
        var getRequest = files.get(path);
        getRequest.onsuccess = function getRequest_onsuccess () {
          if (FS.analyzePath(path).exists) {FS.unlink(path)}
          FS.createDataFile(PATH.dirname(path), PATH.basename(path), getRequest.result, true, true, true);
          ok++;
          if (ok + fail == total) finish()
        };
        getRequest.onerror = function getRequest_onerror () {
          fail++;
          if (ok + fail == total) finish()
        }
      });
      transaction.onerror = onerror
    };
    openRequest.onerror = onerror
  }
};

function _emscripten_set_main_loop_timing (mode, value) {
  Browser.mainLoop.timingMode = mode;
  Browser.mainLoop.timingValue = value;
  if (!Browser.mainLoop.func) {return 1}
  if (mode == 0) {
    Browser.mainLoop.scheduler = function Browser_mainLoop_scheduler_setTimeout () {
      var timeUntilNextTick = Math.max(0, Browser.mainLoop.tickStartTime + value - _emscripten_get_now()) | 0;
      setTimeout(Browser.mainLoop.runner, timeUntilNextTick)
    };
    Browser.mainLoop.method = "timeout"
  } else if (mode == 1) {
    Browser.mainLoop.scheduler = function Browser_mainLoop_scheduler_rAF () {Browser.requestAnimationFrame(Browser.mainLoop.runner)};
    Browser.mainLoop.method = "rAF"
  } else if (mode == 2) {
    if (typeof setImmediate === "undefined") {
      var setImmediates = [];
      var emscriptenMainLoopMessageId = "setimmediate";
      var Browser_setImmediate_messageHandler = function(event) {
        if (event.data === emscriptenMainLoopMessageId || event.data.target === emscriptenMainLoopMessageId) {
          event.stopPropagation();
          setImmediates.shift()()
        }
      };
      addEventListener("message", Browser_setImmediate_messageHandler, true);
      setImmediate = function Browser_emulated_setImmediate (func) {
        setImmediates.push(func);
        if (ENVIRONMENT_IS_WORKER) {
          if (Module["setImmediates"] === undefined) Module["setImmediates"] = [];
          Module["setImmediates"].push(func);
          postMessage({target: emscriptenMainLoopMessageId})
        } else postMessage(emscriptenMainLoopMessageId, "*")
      }
    }
    Browser.mainLoop.scheduler = function Browser_mainLoop_scheduler_setImmediate () {setImmediate(Browser.mainLoop.runner)};
    Browser.mainLoop.method = "immediate"
  }
  return 0
}

function _emscripten_get_now () {abort()}

function _emscripten_set_main_loop (func, fps, simulateInfiniteLoop, arg, noSetTiming) {
  noExitRuntime = true;
  assert(!Browser.mainLoop.func, "emscripten_set_main_loop: there can only be one main loop function at once: call emscripten_cancel_main_loop to cancel the previous one before setting a new one with different parameters.");
  Browser.mainLoop.func = func;
  Browser.mainLoop.arg = arg;
  var browserIterationFunc;
  if (typeof arg !== "undefined") {browserIterationFunc = function() {Module["dynCall_vi"](func, arg)}} else {browserIterationFunc = function() {Module["dynCall_v"](func)}}
  var thisMainLoopId = Browser.mainLoop.currentlyRunningMainloop;
  Browser.mainLoop.runner = function Browser_mainLoop_runner () {
    if (ABORT) return;
    if (Browser.mainLoop.queue.length > 0) {
      var start = Date.now();
      var blocker = Browser.mainLoop.queue.shift();
      blocker.func(blocker.arg);
      if (Browser.mainLoop.remainingBlockers) {
        var remaining = Browser.mainLoop.remainingBlockers;
        var next = remaining % 1 == 0 ? remaining - 1 : Math.floor(remaining);
        if (blocker.counted) {Browser.mainLoop.remainingBlockers = next} else {
          next = next + .5;
          Browser.mainLoop.remainingBlockers = (8 * remaining + next) / 9
        }
      }
      console.log('main loop blocker "' + blocker.name + '" took ' + (Date.now() - start) + " ms");
      Browser.mainLoop.updateStatus();
      if (thisMainLoopId < Browser.mainLoop.currentlyRunningMainloop) return;
      setTimeout(Browser.mainLoop.runner, 0);
      return
    }
    if (thisMainLoopId < Browser.mainLoop.currentlyRunningMainloop) return;
    Browser.mainLoop.currentFrameNumber = Browser.mainLoop.currentFrameNumber + 1 | 0;
    if (Browser.mainLoop.timingMode == 1 && Browser.mainLoop.timingValue > 1 && Browser.mainLoop.currentFrameNumber % Browser.mainLoop.timingValue != 0) {
      Browser.mainLoop.scheduler();
      return
    } else if (Browser.mainLoop.timingMode == 0) {Browser.mainLoop.tickStartTime = _emscripten_get_now()}
    if (Browser.mainLoop.method === "timeout" && Module.ctx) {
      err("Looks like you are rendering without using requestAnimationFrame for the main loop. You should use 0 for the frame rate in emscripten_set_main_loop in order to use requestAnimationFrame, as that can greatly improve your frame rates!");
      Browser.mainLoop.method = ""
    }
    Browser.mainLoop.runIter(browserIterationFunc);
    if (thisMainLoopId < Browser.mainLoop.currentlyRunningMainloop) return;
    if (typeof SDL === "object" && SDL.audio && SDL.audio.queueNewAudioData) SDL.audio.queueNewAudioData();
    Browser.mainLoop.scheduler()
  };
  if (!noSetTiming) {
    if (fps && fps > 0) _emscripten_set_main_loop_timing(0, 1e3 / fps); else _emscripten_set_main_loop_timing(1, 1);
    Browser.mainLoop.scheduler()
  }
  if (simulateInfiniteLoop) {throw"SimulateInfiniteLoop"}
}

var Browser = {
  mainLoop: {
    scheduler: null,
    method: "",
    currentlyRunningMainloop: 0,
    func: null,
    arg: 0,
    timingMode: 0,
    timingValue: 0,
    currentFrameNumber: 0,
    queue: [],
    pause: function() {
      Browser.mainLoop.scheduler = null;
      Browser.mainLoop.currentlyRunningMainloop++
    },
    resume: function() {
      Browser.mainLoop.currentlyRunningMainloop++;
      var timingMode = Browser.mainLoop.timingMode;
      var timingValue = Browser.mainLoop.timingValue;
      var func = Browser.mainLoop.func;
      Browser.mainLoop.func = null;
      _emscripten_set_main_loop(func, 0, false, Browser.mainLoop.arg, true);
      _emscripten_set_main_loop_timing(timingMode, timingValue);
      Browser.mainLoop.scheduler()
    },
    updateStatus: function() {
      if (Module["setStatus"]) {
        var message = Module["statusMessage"] || "Please wait...";
        var remaining = Browser.mainLoop.remainingBlockers;
        var expected = Browser.mainLoop.expectedBlockers;
        if (remaining) {if (remaining < expected) {Module["setStatus"](message + " (" + (expected - remaining) + "/" + expected + ")")} else {Module["setStatus"](message)}} else {Module["setStatus"]("")}
      }
    },
    runIter: function(func) {
      if (ABORT) return;
      if (Module["preMainLoop"]) {
        var preRet = Module["preMainLoop"]();
        if (preRet === false) {return}
      }
      try {func()} catch (e) {
        if (e instanceof ExitStatus) {return} else {
          if (e && typeof e === "object" && e.stack) err("exception thrown: " + [e, e.stack]);
          throw e
        }
      }
      if (Module["postMainLoop"]) Module["postMainLoop"]()
    }
  },
  isFullscreen: false,
  pointerLock: false,
  moduleContextCreatedCallbacks: [],
  workers: [],
  init: function() {
    if (!Module["preloadPlugins"]) Module["preloadPlugins"] = [];
    if (Browser.initted) return;
    Browser.initted = true;
    try {
      new Blob;
      Browser.hasBlobConstructor = true
    } catch (e) {
      Browser.hasBlobConstructor = false;
      console.log("warning: no blob constructor, cannot create blobs with mimetypes")
    }
    Browser.BlobBuilder = typeof MozBlobBuilder != "undefined" ? MozBlobBuilder : typeof WebKitBlobBuilder != "undefined" ? WebKitBlobBuilder : !Browser.hasBlobConstructor ? console.log("warning: no BlobBuilder") : null;
    Browser.URLObject = typeof window != "undefined" ? window.URL ? window.URL : window.webkitURL : undefined;
    if (!Module.noImageDecoding && typeof Browser.URLObject === "undefined") {
      console.log("warning: Browser does not support creating object URLs. Built-in browser image decoding will not be available.");
      Module.noImageDecoding = true
    }
    var imagePlugin = {};
    imagePlugin["canHandle"] = function imagePlugin_canHandle (name) {return !Module.noImageDecoding && /\.(jpg|jpeg|png|bmp)$/i.test(name)};
    imagePlugin["handle"] = function imagePlugin_handle (byteArray, name, onload, onerror) {
      var b = null;
      if (Browser.hasBlobConstructor) {
        try {
          b = new Blob([byteArray], {type: Browser.getMimetype(name)});
          if (b.size !== byteArray.length) {b = new Blob([new Uint8Array(byteArray).buffer], {type: Browser.getMimetype(name)})}
        } catch (e) {warnOnce("Blob constructor present but fails: " + e + "; falling back to blob builder")}
      }
      if (!b) {
        var bb = new Browser.BlobBuilder;
        bb.append(new Uint8Array(byteArray).buffer);
        b = bb.getBlob()
      }
      var url = Browser.URLObject.createObjectURL(b);
      var img = new Image;
      img.onload = function img_onload () {
        assert(img.complete, "Image " + name + " could not be decoded");
        var canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        var ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        Module["preloadedImages"][name] = canvas;
        Browser.URLObject.revokeObjectURL(url);
        if (onload) onload(byteArray)
      };
      img.onerror = function img_onerror (event) {
        console.log("Image " + url + " could not be decoded");
        if (onerror) onerror()
      };
      img.src = url
    };
    Module["preloadPlugins"].push(imagePlugin);
    var audioPlugin = {};
    audioPlugin["canHandle"] = function audioPlugin_canHandle (name) {
      return !Module.noAudioDecoding && name.substr(-4) in {
        ".ogg": 1,
        ".wav": 1,
        ".mp3": 1
      }
    };
    audioPlugin["handle"] = function audioPlugin_handle (byteArray, name, onload, onerror) {
      var done = false;

      function finish (audio) {
        if (done) return;
        done = true;
        Module["preloadedAudios"][name] = audio;
        if (onload) onload(byteArray)
      }

      function fail () {
        if (done) return;
        done = true;
        Module["preloadedAudios"][name] = new Audio;
        if (onerror) onerror()
      }

      if (Browser.hasBlobConstructor) {
        try {var b = new Blob([byteArray], {type: Browser.getMimetype(name)})} catch (e) {return fail()}
        var url = Browser.URLObject.createObjectURL(b);
        var audio = new Audio;
        audio.addEventListener("canplaythrough", function() {finish(audio)}, false);
        audio.onerror = function audio_onerror (event) {
          if (done) return;
          console.log("warning: browser could not fully decode audio " + name + ", trying slower base64 approach");

          function encode64 (data) {
            var BASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
            var PAD = "=";
            var ret = "";
            var leftchar = 0;
            var leftbits = 0;
            for (var i = 0; i < data.length; i++) {
              leftchar = leftchar << 8 | data[i];
              leftbits += 8;
              while (leftbits >= 6) {
                var curr = leftchar >> leftbits - 6 & 63;
                leftbits -= 6;
                ret += BASE[curr]
              }
            }
            if (leftbits == 2) {
              ret += BASE[(leftchar & 3) << 4];
              ret += PAD + PAD
            } else if (leftbits == 4) {
              ret += BASE[(leftchar & 15) << 2];
              ret += PAD
            }
            return ret
          }

          audio.src = "data:audio/x-" + name.substr(-3) + ";base64," + encode64(byteArray);
          finish(audio)
        };
        audio.src = url;
        Browser.safeSetTimeout(function() {finish(audio)}, 1e4)
      } else {return fail()}
    };
    Module["preloadPlugins"].push(audioPlugin);

    function pointerLockChange () {Browser.pointerLock = document["pointerLockElement"] === Module["canvas"] || document["mozPointerLockElement"] === Module["canvas"] || document["webkitPointerLockElement"] === Module["canvas"] || document["msPointerLockElement"] === Module["canvas"]}

    var canvas = Module["canvas"];
    if (canvas) {
      canvas.requestPointerLock = canvas["requestPointerLock"] || canvas["mozRequestPointerLock"] || canvas["webkitRequestPointerLock"] || canvas["msRequestPointerLock"] || function() {};
      canvas.exitPointerLock = document["exitPointerLock"] || document["mozExitPointerLock"] || document["webkitExitPointerLock"] || document["msExitPointerLock"] || function() {};
      canvas.exitPointerLock = canvas.exitPointerLock.bind(document);
      document.addEventListener("pointerlockchange", pointerLockChange, false);
      document.addEventListener("mozpointerlockchange", pointerLockChange, false);
      document.addEventListener("webkitpointerlockchange", pointerLockChange, false);
      document.addEventListener("mspointerlockchange", pointerLockChange, false);
      if (Module["elementPointerLock"]) {
        canvas.addEventListener("click", function(ev) {
          if (!Browser.pointerLock && Module["canvas"].requestPointerLock) {
            Module["canvas"].requestPointerLock();
            ev.preventDefault()
          }
        }, false)
      }
    }
  },
  createContext: function(canvas, useWebGL, setInModule, webGLContextAttributes) {
    if (useWebGL && Module.ctx && canvas == Module.canvas) return Module.ctx;
    var ctx;
    var contextHandle;
    if (useWebGL) {
      var contextAttributes = {antialias: false, alpha: false, majorVersion: 1};
      if (webGLContextAttributes) {for (var attribute in webGLContextAttributes) {contextAttributes[attribute] = webGLContextAttributes[attribute]}}
      if (typeof GL !== "undefined") {
        contextHandle = GL.createContext(canvas, contextAttributes);
        if (contextHandle) {ctx = GL.getContext(contextHandle).GLctx}
      }
    } else {ctx = canvas.getContext("2d")}
    if (!ctx) return null;
    if (setInModule) {
      if (!useWebGL) assert(typeof GLctx === "undefined", "cannot set in module if GLctx is used, but we are a non-GL context that would replace it");
      Module.ctx = ctx;
      if (useWebGL) GL.makeContextCurrent(contextHandle);
      Module.useWebGL = useWebGL;
      Browser.moduleContextCreatedCallbacks.forEach(function(callback) {callback()});
      Browser.init()
    }
    return ctx
  },
  destroyContext: function(canvas, useWebGL, setInModule) {},
  fullscreenHandlersInstalled: false,
  lockPointer: undefined,
  resizeCanvas: undefined,
  requestFullscreen: function(lockPointer, resizeCanvas, vrDevice) {
    Browser.lockPointer = lockPointer;
    Browser.resizeCanvas = resizeCanvas;
    Browser.vrDevice = vrDevice;
    if (typeof Browser.lockPointer === "undefined") Browser.lockPointer = true;
    if (typeof Browser.resizeCanvas === "undefined") Browser.resizeCanvas = false;
    if (typeof Browser.vrDevice === "undefined") Browser.vrDevice = null;
    var canvas = Module["canvas"];

    function fullscreenChange () {
      Browser.isFullscreen = false;
      var canvasContainer = canvas.parentNode;
      if ((document["fullscreenElement"] || document["mozFullScreenElement"] || document["msFullscreenElement"] || document["webkitFullscreenElement"] || document["webkitCurrentFullScreenElement"]) === canvasContainer) {
        canvas.exitFullscreen = Browser.exitFullscreen;
        if (Browser.lockPointer) canvas.requestPointerLock();
        Browser.isFullscreen = true;
        if (Browser.resizeCanvas) {Browser.setFullscreenCanvasSize()} else {Browser.updateCanvasDimensions(canvas)}
      } else {
        canvasContainer.parentNode.insertBefore(canvas, canvasContainer);
        canvasContainer.parentNode.removeChild(canvasContainer);
        if (Browser.resizeCanvas) {Browser.setWindowedCanvasSize()} else {Browser.updateCanvasDimensions(canvas)}
      }
      if (Module["onFullScreen"]) Module["onFullScreen"](Browser.isFullscreen);
      if (Module["onFullscreen"]) Module["onFullscreen"](Browser.isFullscreen)
    }

    if (!Browser.fullscreenHandlersInstalled) {
      Browser.fullscreenHandlersInstalled = true;
      document.addEventListener("fullscreenchange", fullscreenChange, false);
      document.addEventListener("mozfullscreenchange", fullscreenChange, false);
      document.addEventListener("webkitfullscreenchange", fullscreenChange, false);
      document.addEventListener("MSFullscreenChange", fullscreenChange, false)
    }
    var canvasContainer = document.createElement("div");
    canvas.parentNode.insertBefore(canvasContainer, canvas);
    canvasContainer.appendChild(canvas);
    canvasContainer.requestFullscreen = canvasContainer["requestFullscreen"] || canvasContainer["mozRequestFullScreen"] || canvasContainer["msRequestFullscreen"] || (canvasContainer["webkitRequestFullscreen"] ? function() {canvasContainer["webkitRequestFullscreen"](Element["ALLOW_KEYBOARD_INPUT"])} : null) || (canvasContainer["webkitRequestFullScreen"] ? function() {canvasContainer["webkitRequestFullScreen"](Element["ALLOW_KEYBOARD_INPUT"])} : null);
    if (vrDevice) {canvasContainer.requestFullscreen({vrDisplay: vrDevice})} else {canvasContainer.requestFullscreen()}
  },
  requestFullScreen: function(lockPointer, resizeCanvas, vrDevice) {
    err("Browser.requestFullScreen() is deprecated. Please call Browser.requestFullscreen instead.");
    Browser.requestFullScreen = function(lockPointer, resizeCanvas, vrDevice) {return Browser.requestFullscreen(lockPointer, resizeCanvas, vrDevice)};
    return Browser.requestFullscreen(lockPointer, resizeCanvas, vrDevice)
  },
  exitFullscreen: function() {
    if (!Browser.isFullscreen) {return false}
    var CFS = document["exitFullscreen"] || document["cancelFullScreen"] || document["mozCancelFullScreen"] || document["msExitFullscreen"] || document["webkitCancelFullScreen"] || function() {};
    CFS.apply(document, []);
    return true
  },
  nextRAF: 0,
  fakeRequestAnimationFrame: function(func) {
    var now = Date.now();
    if (Browser.nextRAF === 0) {Browser.nextRAF = now + 1e3 / 60} else {while (now + 2 >= Browser.nextRAF) {Browser.nextRAF += 1e3 / 60}}
    var delay = Math.max(Browser.nextRAF - now, 0);
    setTimeout(func, delay)
  },
  requestAnimationFrame: function(func) {
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(func);
      return
    }
    var RAF = Browser.fakeRequestAnimationFrame;
    RAF(func)
  },
  safeCallback: function(func) {return function() {if (!ABORT) return func.apply(null, arguments)}},
  allowAsyncCallbacks: true,
  queuedAsyncCallbacks: [],
  pauseAsyncCallbacks: function() {Browser.allowAsyncCallbacks = false},
  resumeAsyncCallbacks: function() {
    Browser.allowAsyncCallbacks = true;
    if (Browser.queuedAsyncCallbacks.length > 0) {
      var callbacks = Browser.queuedAsyncCallbacks;
      Browser.queuedAsyncCallbacks = [];
      callbacks.forEach(function(func) {func()})
    }
  },
  safeRequestAnimationFrame: function(func) {
    return Browser.requestAnimationFrame(function() {
      if (ABORT) return;
      if (Browser.allowAsyncCallbacks) {func()} else {Browser.queuedAsyncCallbacks.push(func)}
    })
  },
  safeSetTimeout: function(func, timeout) {
    noExitRuntime = true;
    return setTimeout(function() {
      if (ABORT) return;
      if (Browser.allowAsyncCallbacks) {func()} else {Browser.queuedAsyncCallbacks.push(func)}
    }, timeout)
  },
  safeSetInterval: function(func, timeout) {
    noExitRuntime = true;
    return setInterval(function() {
      if (ABORT) return;
      if (Browser.allowAsyncCallbacks) {func()}
    }, timeout)
  },
  getMimetype: function(name) {
    return {
      "jpg": "image/jpeg",
      "jpeg": "image/jpeg",
      "png": "image/png",
      "bmp": "image/bmp",
      "ogg": "audio/ogg",
      "wav": "audio/wav",
      "mp3": "audio/mpeg"
    }[name.substr(name.lastIndexOf(".") + 1)]
  },
  getUserMedia: function(func) {
    if (!window.getUserMedia) {window.getUserMedia = navigator["getUserMedia"] || navigator["mozGetUserMedia"]}
    window.getUserMedia(func)
  },
  getMovementX: function(event) {return event["movementX"] || event["mozMovementX"] || event["webkitMovementX"] || 0},
  getMovementY: function(event) {return event["movementY"] || event["mozMovementY"] || event["webkitMovementY"] || 0},
  getMouseWheelDelta: function(event) {
    var delta = 0;
    switch (event.type) {
      case"DOMMouseScroll":
        delta = event.detail / 3;
        break;
      case"mousewheel":
        delta = event.wheelDelta / 120;
        break;
      case"wheel":
        delta = event.deltaY;
        switch (event.deltaMode) {
          case 0:
            delta /= 100;
            break;
          case 1:
            delta /= 3;
            break;
          case 2:
            delta *= 80;
            break;
          default:
            throw"unrecognized mouse wheel delta mode: " + event.deltaMode
        }
        break;
      default:
        throw"unrecognized mouse wheel event: " + event.type
    }
    return delta
  },
  mouseX: 0,
  mouseY: 0,
  mouseMovementX: 0,
  mouseMovementY: 0,
  touches: {},
  lastTouches: {},
  calculateMouseEvent: function(event) {
    if (Browser.pointerLock) {
      if (event.type != "mousemove" && "mozMovementX" in event) {Browser.mouseMovementX = Browser.mouseMovementY = 0} else {
        Browser.mouseMovementX = Browser.getMovementX(event);
        Browser.mouseMovementY = Browser.getMovementY(event)
      }
      if (typeof SDL != "undefined") {
        Browser.mouseX = SDL.mouseX + Browser.mouseMovementX;
        Browser.mouseY = SDL.mouseY + Browser.mouseMovementY
      } else {
        Browser.mouseX += Browser.mouseMovementX;
        Browser.mouseY += Browser.mouseMovementY
      }
    } else {
      var rect = Module["canvas"].getBoundingClientRect();
      var cw = Module["canvas"].width;
      var ch = Module["canvas"].height;
      var scrollX = typeof window.scrollX !== "undefined" ? window.scrollX : window.pageXOffset;
      var scrollY = typeof window.scrollY !== "undefined" ? window.scrollY : window.pageYOffset;
      if (event.type === "touchstart" || event.type === "touchend" || event.type === "touchmove") {
        var touch = event.touch;
        if (touch === undefined) {return}
        var adjustedX = touch.pageX - (scrollX + rect.left);
        var adjustedY = touch.pageY - (scrollY + rect.top);
        adjustedX = adjustedX * (cw / rect.width);
        adjustedY = adjustedY * (ch / rect.height);
        var coords = {x: adjustedX, y: adjustedY};
        if (event.type === "touchstart") {
          Browser.lastTouches[touch.identifier] = coords;
          Browser.touches[touch.identifier] = coords
        } else if (event.type === "touchend" || event.type === "touchmove") {
          var last = Browser.touches[touch.identifier];
          if (!last) last = coords;
          Browser.lastTouches[touch.identifier] = last;
          Browser.touches[touch.identifier] = coords
        }
        return
      }
      var x = event.pageX - (scrollX + rect.left);
      var y = event.pageY - (scrollY + rect.top);
      x = x * (cw / rect.width);
      y = y * (ch / rect.height);
      Browser.mouseMovementX = x - Browser.mouseX;
      Browser.mouseMovementY = y - Browser.mouseY;
      Browser.mouseX = x;
      Browser.mouseY = y
    }
  },
  asyncLoad: function(url, onload, onerror, noRunDep) {
    var dep = !noRunDep ? getUniqueRunDependency("al " + url) : "";
    readAsync(url, function(arrayBuffer) {
      assert(arrayBuffer, 'Loading data file "' + url + '" failed (no arrayBuffer).');
      onload(new Uint8Array(arrayBuffer));
      if (dep) removeRunDependency(dep)
    }, function(event) {if (onerror) {onerror()} else {throw'Loading data file "' + url + '" failed.'}});
    if (dep) addRunDependency(dep)
  },
  resizeListeners: [],
  updateResizeListeners: function() {
    var canvas = Module["canvas"];
    Browser.resizeListeners.forEach(function(listener) {listener(canvas.width, canvas.height)})
  },
  setCanvasSize: function(width, height, noUpdates) {
    var canvas = Module["canvas"];
    Browser.updateCanvasDimensions(canvas, width, height);
    if (!noUpdates) Browser.updateResizeListeners()
  },
  windowedWidth: 0,
  windowedHeight: 0,
  setFullscreenCanvasSize: function() {
    if (typeof SDL != "undefined") {
      var flags = HEAPU32[SDL.screen >> 2];
      flags = flags | 8388608;
      HEAP32[SDL.screen >> 2] = flags
    }
    Browser.updateCanvasDimensions(Module["canvas"]);
    Browser.updateResizeListeners()
  },
  setWindowedCanvasSize: function() {
    if (typeof SDL != "undefined") {
      var flags = HEAPU32[SDL.screen >> 2];
      flags = flags & ~8388608;
      HEAP32[SDL.screen >> 2] = flags
    }
    Browser.updateCanvasDimensions(Module["canvas"]);
    Browser.updateResizeListeners()
  },
  updateCanvasDimensions: function(canvas, wNative, hNative) {
    if (wNative && hNative) {
      canvas.widthNative = wNative;
      canvas.heightNative = hNative
    } else {
      wNative = canvas.widthNative;
      hNative = canvas.heightNative
    }
    var w = wNative;
    var h = hNative;
    if (Module["forcedAspectRatio"] && Module["forcedAspectRatio"] > 0) {if (w / h < Module["forcedAspectRatio"]) {w = Math.round(h * Module["forcedAspectRatio"])} else {h = Math.round(w / Module["forcedAspectRatio"])}}
    if ((document["fullscreenElement"] || document["mozFullScreenElement"] || document["msFullscreenElement"] || document["webkitFullscreenElement"] || document["webkitCurrentFullScreenElement"]) === canvas.parentNode && typeof screen != "undefined") {
      var factor = Math.min(screen.width / w, screen.height / h);
      w = Math.round(w * factor);
      h = Math.round(h * factor)
    }
    if (Browser.resizeCanvas) {
      if (canvas.width != w) canvas.width = w;
      if (canvas.height != h) canvas.height = h;
      if (typeof canvas.style != "undefined") {
        canvas.style.removeProperty("width");
        canvas.style.removeProperty("height")
      }
    } else {
      if (canvas.width != wNative) canvas.width = wNative;
      if (canvas.height != hNative) canvas.height = hNative;
      if (typeof canvas.style != "undefined") {
        if (w != wNative || h != hNative) {
          canvas.style.setProperty("width", w + "px", "important");
          canvas.style.setProperty("height", h + "px", "important")
        } else {
          canvas.style.removeProperty("width");
          canvas.style.removeProperty("height")
        }
      }
    }
  },
  wgetRequests: {},
  nextWgetRequestHandle: 0,
  getNextWgetRequestHandle: function() {
    var handle = Browser.nextWgetRequestHandle;
    Browser.nextWgetRequestHandle++;
    return handle
  }
};

function _SDL_GetTicks () {return Date.now() - SDL.startTime | 0}

function _SDL_LockSurface (surf) {
  var surfData = SDL.surfaces[surf];
  surfData.locked++;
  if (surfData.locked > 1) return 0;
  if (!surfData.buffer) {
    surfData.buffer = _malloc(surfData.width * surfData.height * 4);
    HEAP32[surf + 20 >> 2] = surfData.buffer
  }
  HEAP32[surf + 20 >> 2] = surfData.buffer;
  if (surf == SDL.screen && Module.screenIsReadOnly && surfData.image) return 0;
  if (SDL.defaults.discardOnLock) {
    if (!surfData.image) {surfData.image = surfData.ctx.createImageData(surfData.width, surfData.height)}
    if (!SDL.defaults.opaqueFrontBuffer) return
  } else {surfData.image = surfData.ctx.getImageData(0, 0, surfData.width, surfData.height)}
  if (surf == SDL.screen && SDL.defaults.opaqueFrontBuffer) {
    var data = surfData.image.data;
    var num = data.length;
    for (var i = 0; i < num / 4; i++) {data[i * 4 + 3] = 255}
  }
  if (SDL.defaults.copyOnLock && !SDL.defaults.discardOnLock) {if (surfData.isFlagSet(2097152)) {throw"CopyOnLock is not supported for SDL_LockSurface with SDL_HWPALETTE flag set" + (new Error).stack} else {HEAPU8.set(surfData.image.data, surfData.buffer)}}
  return 0
}

var SDL = {
  defaults: {width: 320, height: 200, copyOnLock: true, discardOnLock: false, opaqueFrontBuffer: true},
  version: null,
  surfaces: {},
  canvasPool: [],
  events: [],
  fonts: [null],
  audios: [null],
  rwops: [null],
  music: {audio: null, volume: 1},
  mixerFrequency: 22050,
  mixerFormat: 32784,
  mixerNumChannels: 2,
  mixerChunkSize: 1024,
  channelMinimumNumber: 0,
  GL: false,
  glAttributes: {
    0: 3,
    1: 3,
    2: 2,
    3: 0,
    4: 0,
    5: 1,
    6: 16,
    7: 0,
    8: 0,
    9: 0,
    10: 0,
    11: 0,
    12: 0,
    13: 0,
    14: 0,
    15: 1,
    16: 0,
    17: 0,
    18: 0
  },
  keyboardState: null,
  keyboardMap: {},
  canRequestFullscreen: false,
  isRequestingFullscreen: false,
  textInput: false,
  startTime: null,
  initFlags: 0,
  buttonState: 0,
  modState: 0,
  DOMButtons: [0, 0, 0],
  DOMEventToSDLEvent: {},
  TOUCH_DEFAULT_ID: 0,
  eventHandler: null,
  eventHandlerContext: null,
  eventHandlerTemp: 0,
  keyCodes: {
    16: 1249,
    17: 1248,
    18: 1250,
    20: 1081,
    33: 1099,
    34: 1102,
    35: 1101,
    36: 1098,
    37: 1104,
    38: 1106,
    39: 1103,
    40: 1105,
    44: 316,
    45: 1097,
    46: 127,
    91: 1251,
    93: 1125,
    96: 1122,
    97: 1113,
    98: 1114,
    99: 1115,
    100: 1116,
    101: 1117,
    102: 1118,
    103: 1119,
    104: 1120,
    105: 1121,
    106: 1109,
    107: 1111,
    109: 1110,
    110: 1123,
    111: 1108,
    112: 1082,
    113: 1083,
    114: 1084,
    115: 1085,
    116: 1086,
    117: 1087,
    118: 1088,
    119: 1089,
    120: 1090,
    121: 1091,
    122: 1092,
    123: 1093,
    124: 1128,
    125: 1129,
    126: 1130,
    127: 1131,
    128: 1132,
    129: 1133,
    130: 1134,
    131: 1135,
    132: 1136,
    133: 1137,
    134: 1138,
    135: 1139,
    144: 1107,
    160: 94,
    161: 33,
    162: 34,
    163: 35,
    164: 36,
    165: 37,
    166: 38,
    167: 95,
    168: 40,
    169: 41,
    170: 42,
    171: 43,
    172: 124,
    173: 45,
    174: 123,
    175: 125,
    176: 126,
    181: 127,
    182: 129,
    183: 128,
    188: 44,
    190: 46,
    191: 47,
    192: 96,
    219: 91,
    220: 92,
    221: 93,
    222: 39,
    224: 1251
  },
  scanCodes: {
    8: 42,
    9: 43,
    13: 40,
    27: 41,
    32: 44,
    35: 204,
    39: 53,
    44: 54,
    46: 55,
    47: 56,
    48: 39,
    49: 30,
    50: 31,
    51: 32,
    52: 33,
    53: 34,
    54: 35,
    55: 36,
    56: 37,
    57: 38,
    58: 203,
    59: 51,
    61: 46,
    91: 47,
    92: 49,
    93: 48,
    96: 52,
    97: 4,
    98: 5,
    99: 6,
    100: 7,
    101: 8,
    102: 9,
    103: 10,
    104: 11,
    105: 12,
    106: 13,
    107: 14,
    108: 15,
    109: 16,
    110: 17,
    111: 18,
    112: 19,
    113: 20,
    114: 21,
    115: 22,
    116: 23,
    117: 24,
    118: 25,
    119: 26,
    120: 27,
    121: 28,
    122: 29,
    127: 76,
    305: 224,
    308: 226,
    316: 70
  },
  loadRect: function(rect) {
    return {
      x: HEAP32[rect + 0 >> 2],
      y: HEAP32[rect + 4 >> 2],
      w: HEAP32[rect + 8 >> 2],
      h: HEAP32[rect + 12 >> 2]
    }
  },
  updateRect: function(rect, r) {
    HEAP32[rect >> 2] = r.x;
    HEAP32[rect + 4 >> 2] = r.y;
    HEAP32[rect + 8 >> 2] = r.w;
    HEAP32[rect + 12 >> 2] = r.h
  },
  intersectionOfRects: function(first, second) {
    var leftX = Math.max(first.x, second.x);
    var leftY = Math.max(first.y, second.y);
    var rightX = Math.min(first.x + first.w, second.x + second.w);
    var rightY = Math.min(first.y + first.h, second.y + second.h);
    return {x: leftX, y: leftY, w: Math.max(leftX, rightX) - leftX, h: Math.max(leftY, rightY) - leftY}
  },
  checkPixelFormat: function(fmt) {},
  loadColorToCSSRGB: function(color) {
    var rgba = HEAP32[color >> 2];
    return "rgb(" + (rgba & 255) + "," + (rgba >> 8 & 255) + "," + (rgba >> 16 & 255) + ")"
  },
  loadColorToCSSRGBA: function(color) {
    var rgba = HEAP32[color >> 2];
    return "rgba(" + (rgba & 255) + "," + (rgba >> 8 & 255) + "," + (rgba >> 16 & 255) + "," + (rgba >> 24 & 255) / 255 + ")"
  },
  translateColorToCSSRGBA: function(rgba) {return "rgba(" + (rgba & 255) + "," + (rgba >> 8 & 255) + "," + (rgba >> 16 & 255) + "," + (rgba >>> 24) / 255 + ")"},
  translateRGBAToCSSRGBA: function(r, g, b, a) {return "rgba(" + (r & 255) + "," + (g & 255) + "," + (b & 255) + "," + (a & 255) / 255 + ")"},
  translateRGBAToColor: function(r, g, b, a) {return r | g << 8 | b << 16 | a << 24},
  makeSurface: function(width, height, flags, usePageCanvas, source, rmask, gmask, bmask, amask) {
    flags = flags || 0;
    var is_SDL_HWSURFACE = flags & 1;
    var is_SDL_HWPALETTE = flags & 2097152;
    var is_SDL_OPENGL = flags & 67108864;
    var surf = _malloc(60);
    var pixelFormat = _malloc(44);
    var bpp = is_SDL_HWPALETTE ? 1 : 4;
    var buffer = 0;
    if (!is_SDL_HWSURFACE && !is_SDL_OPENGL) {buffer = _malloc(width * height * 4)}
    HEAP32[surf >> 2] = flags;
    HEAP32[surf + 4 >> 2] = pixelFormat;
    HEAP32[surf + 8 >> 2] = width;
    HEAP32[surf + 12 >> 2] = height;
    HEAP32[surf + 16 >> 2] = width * bpp;
    HEAP32[surf + 20 >> 2] = buffer;
    HEAP32[surf + 36 >> 2] = 0;
    HEAP32[surf + 40 >> 2] = 0;
    HEAP32[surf + 44 >> 2] = Module["canvas"].width;
    HEAP32[surf + 48 >> 2] = Module["canvas"].height;
    HEAP32[surf + 56 >> 2] = 1;
    HEAP32[pixelFormat >> 2] = -2042224636;
    HEAP32[pixelFormat + 4 >> 2] = 0;
    HEAP8[pixelFormat + 8 >> 0] = bpp * 8;
    HEAP8[pixelFormat + 9 >> 0] = bpp;
    HEAP32[pixelFormat + 12 >> 2] = rmask || 255;
    HEAP32[pixelFormat + 16 >> 2] = gmask || 65280;
    HEAP32[pixelFormat + 20 >> 2] = bmask || 16711680;
    HEAP32[pixelFormat + 24 >> 2] = amask || 4278190080;
    SDL.GL = SDL.GL || is_SDL_OPENGL;
    var canvas;
    if (!usePageCanvas) {
      if (SDL.canvasPool.length > 0) {canvas = SDL.canvasPool.pop()} else {canvas = document.createElement("canvas")}
      canvas.width = width;
      canvas.height = height
    } else {canvas = Module["canvas"]}
    var webGLContextAttributes = {
      antialias: SDL.glAttributes[13] != 0 && SDL.glAttributes[14] > 1,
      depth: SDL.glAttributes[6] > 0,
      stencil: SDL.glAttributes[7] > 0,
      alpha: SDL.glAttributes[3] > 0
    };
    var ctx = Browser.createContext(canvas, is_SDL_OPENGL, usePageCanvas, webGLContextAttributes);
    SDL.surfaces[surf] = {
      width: width,
      height: height,
      canvas: canvas,
      ctx: ctx,
      surf: surf,
      buffer: buffer,
      pixelFormat: pixelFormat,
      alpha: 255,
      flags: flags,
      locked: 0,
      usePageCanvas: usePageCanvas,
      source: source,
      isFlagSet: function(flag) {return flags & flag}
    };
    return surf
  },
  copyIndexedColorData: function(surfData, rX, rY, rW, rH) {
    if (!surfData.colors) {return}
    var fullWidth = Module["canvas"].width;
    var fullHeight = Module["canvas"].height;
    var startX = rX || 0;
    var startY = rY || 0;
    var endX = (rW || fullWidth - startX) + startX;
    var endY = (rH || fullHeight - startY) + startY;
    var buffer = surfData.buffer;
    if (!surfData.image.data32) {surfData.image.data32 = new Uint32Array(surfData.image.data.buffer)}
    var data32 = surfData.image.data32;
    var colors32 = surfData.colors32;
    for (var y = startY; y < endY; ++y) {
      var base = y * fullWidth;
      for (var x = startX; x < endX; ++x) {data32[base + x] = colors32[HEAPU8[buffer + base + x >> 0]]}
    }
  },
  freeSurface: function(surf) {
    var refcountPointer = surf + 56;
    var refcount = HEAP32[refcountPointer >> 2];
    if (refcount > 1) {
      HEAP32[refcountPointer >> 2] = refcount - 1;
      return
    }
    var info = SDL.surfaces[surf];
    if (!info.usePageCanvas && info.canvas) SDL.canvasPool.push(info.canvas);
    if (info.buffer) _free(info.buffer);
    _free(info.pixelFormat);
    _free(surf);
    SDL.surfaces[surf] = null;
    if (surf === SDL.screen) {SDL.screen = null}
  },
  blitSurface: function(src, srcrect, dst, dstrect, scale) {
    var srcData = SDL.surfaces[src];
    var dstData = SDL.surfaces[dst];
    var sr, dr;
    if (srcrect) {sr = SDL.loadRect(srcrect)} else {sr = {x: 0, y: 0, w: srcData.width, h: srcData.height}}
    if (dstrect) {dr = SDL.loadRect(dstrect)} else {dr = {x: 0, y: 0, w: srcData.width, h: srcData.height}}
    if (dstData.clipRect) {
      var widthScale = !scale || sr.w === 0 ? 1 : sr.w / dr.w;
      var heightScale = !scale || sr.h === 0 ? 1 : sr.h / dr.h;
      dr = SDL.intersectionOfRects(dstData.clipRect, dr);
      sr.w = dr.w * widthScale;
      sr.h = dr.h * heightScale;
      if (dstrect) {SDL.updateRect(dstrect, dr)}
    }
    var blitw, blith;
    if (scale) {
      blitw = dr.w;
      blith = dr.h
    } else {
      blitw = sr.w;
      blith = sr.h
    }
    if (sr.w === 0 || sr.h === 0 || blitw === 0 || blith === 0) {return 0}
    var oldAlpha = dstData.ctx.globalAlpha;
    dstData.ctx.globalAlpha = srcData.alpha / 255;
    dstData.ctx.drawImage(srcData.canvas, sr.x, sr.y, sr.w, sr.h, dr.x, dr.y, blitw, blith);
    dstData.ctx.globalAlpha = oldAlpha;
    if (dst != SDL.screen) {
      warnOnce("WARNING: copying canvas data to memory for compatibility");
      _SDL_LockSurface(dst);
      dstData.locked--
    }
    return 0
  },
  downFingers: {},
  savedKeydown: null,
  receiveEvent: function(event) {
    function unpressAllPressedKeys () {
      for (var code in SDL.keyboardMap) {
        SDL.events.push({
          type: "keyup",
          keyCode: SDL.keyboardMap[code]
        })
      }
    }

    switch (event.type) {
      case"touchstart":
      case"touchmove": {
        event.preventDefault();
        var touches = [];
        if (event.type === "touchstart") {
          for (var i = 0; i < event.touches.length; i++) {
            var touch = event.touches[i];
            if (SDL.downFingers[touch.identifier] != true) {
              SDL.downFingers[touch.identifier] = true;
              touches.push(touch)
            }
          }
        } else {touches = event.touches}
        var firstTouch = touches[0];
        if (firstTouch) {
          if (event.type == "touchstart") {SDL.DOMButtons[0] = 1}
          var mouseEventType;
          switch (event.type) {
            case"touchstart":
              mouseEventType = "mousedown";
              break;
            case"touchmove":
              mouseEventType = "mousemove";
              break
          }
          var mouseEvent = {type: mouseEventType, button: 0, pageX: firstTouch.clientX, pageY: firstTouch.clientY};
          SDL.events.push(mouseEvent)
        }
        for (var i = 0; i < touches.length; i++) {
          var touch = touches[i];
          SDL.events.push({type: event.type, touch: touch})
        }
        break
      }
      case"touchend": {
        event.preventDefault();
        for (var i = 0; i < event.changedTouches.length; i++) {
          var touch = event.changedTouches[i];
          if (SDL.downFingers[touch.identifier] === true) {delete SDL.downFingers[touch.identifier]}
        }
        var mouseEvent = {
          type: "mouseup",
          button: 0,
          pageX: event.changedTouches[0].clientX,
          pageY: event.changedTouches[0].clientY
        };
        SDL.DOMButtons[0] = 0;
        SDL.events.push(mouseEvent);
        for (var i = 0; i < event.changedTouches.length; i++) {
          var touch = event.changedTouches[i];
          SDL.events.push({type: "touchend", touch: touch})
        }
        break
      }
      case"DOMMouseScroll":
      case"mousewheel":
      case"wheel":
        var delta = -Browser.getMouseWheelDelta(event);
        delta = delta == 0 ? 0 : delta > 0 ? Math.max(delta, 1) : Math.min(delta, -1);
        var button = delta > 0 ? 3 : 4;
        SDL.events.push({type: "mousedown", button: button, pageX: event.pageX, pageY: event.pageY});
        SDL.events.push({type: "mouseup", button: button, pageX: event.pageX, pageY: event.pageY});
        SDL.events.push({type: "wheel", deltaX: 0, deltaY: delta});
        event.preventDefault();
        break;
      case"mousemove":
        if (SDL.DOMButtons[0] === 1) {
          SDL.events.push({
            type: "touchmove",
            touch: {identifier: 0, deviceID: -1, pageX: event.pageX, pageY: event.pageY}
          })
        }
        if (Browser.pointerLock) {
          if ("mozMovementX" in event) {
            event["movementX"] = event["mozMovementX"];
            event["movementY"] = event["mozMovementY"]
          }
          if (event["movementX"] == 0 && event["movementY"] == 0) {
            event.preventDefault();
            return
          }
        }
      case"keydown":
      case"keyup":
      case"keypress":
      case"mousedown":
      case"mouseup":
        if (event.type !== "keydown" || !SDL.unicode && !SDL.textInput || (event.keyCode === 8 || event.keyCode === 9)) {event.preventDefault()}
        if (event.type == "mousedown") {
          SDL.DOMButtons[event.button] = 1;
          SDL.events.push({
            type: "touchstart",
            touch: {identifier: 0, deviceID: -1, pageX: event.pageX, pageY: event.pageY}
          })
        } else if (event.type == "mouseup") {
          if (!SDL.DOMButtons[event.button]) {return}
          SDL.events.push({
            type: "touchend",
            touch: {identifier: 0, deviceID: -1, pageX: event.pageX, pageY: event.pageY}
          });
          SDL.DOMButtons[event.button] = 0
        }
        if (event.type === "keydown" || event.type === "mousedown") {SDL.canRequestFullscreen = true} else if (event.type === "keyup" || event.type === "mouseup") {
          if (SDL.isRequestingFullscreen) {
            Module["requestFullscreen"](true, true);
            SDL.isRequestingFullscreen = false
          }
          SDL.canRequestFullscreen = false
        }
        if (event.type === "keypress" && SDL.savedKeydown) {
          SDL.savedKeydown.keypressCharCode = event.charCode;
          SDL.savedKeydown = null
        } else if (event.type === "keydown") {SDL.savedKeydown = event}
        if (event.type !== "keypress" || SDL.textInput) {SDL.events.push(event)}
        break;
      case"mouseout":
        for (var i = 0; i < 3; i++) {
          if (SDL.DOMButtons[i]) {
            SDL.events.push({
              type: "mouseup",
              button: i,
              pageX: event.pageX,
              pageY: event.pageY
            });
            SDL.DOMButtons[i] = 0
          }
        }
        event.preventDefault();
        break;
      case"focus":
        SDL.events.push(event);
        event.preventDefault();
        break;
      case"blur":
        SDL.events.push(event);
        unpressAllPressedKeys();
        event.preventDefault();
        break;
      case"visibilitychange":
        SDL.events.push({type: "visibilitychange", visible: !document.hidden});
        unpressAllPressedKeys();
        event.preventDefault();
        break;
      case"unload":
        if (Browser.mainLoop.runner) {
          SDL.events.push(event);
          Browser.mainLoop.runner()
        }
        return;
      case"resize":
        SDL.events.push(event);
        if (event.preventDefault) {event.preventDefault()}
        break
    }
    if (SDL.events.length >= 1e4) {
      err("SDL event queue full, dropping events");
      SDL.events = SDL.events.slice(0, 1e4)
    }
    SDL.flushEventsToHandler();
    return
  },
  lookupKeyCodeForEvent: function(event) {
    var code = event.keyCode;
    if (code >= 65 && code <= 90) {code += 32} else {
      code = SDL.keyCodes[event.keyCode] || event.keyCode;
      if (event.location === KeyboardEvent.DOM_KEY_LOCATION_RIGHT && code >= (224 | 1 << 10) && code <= (227 | 1 << 10)) {code += 4}
    }
    return code
  },
  handleEvent: function(event) {
    if (event.handled) return;
    event.handled = true;
    switch (event.type) {
      case"touchstart":
      case"touchend":
      case"touchmove": {
        Browser.calculateMouseEvent(event);
        break
      }
      case"keydown":
      case"keyup": {
        var down = event.type === "keydown";
        var code = SDL.lookupKeyCodeForEvent(event);
        HEAP8[SDL.keyboardState + code >> 0] = down;
        SDL.modState = (HEAP8[SDL.keyboardState + 1248 >> 0] ? 64 : 0) | (HEAP8[SDL.keyboardState + 1249 >> 0] ? 1 : 0) | (HEAP8[SDL.keyboardState + 1250 >> 0] ? 256 : 0) | (HEAP8[SDL.keyboardState + 1252 >> 0] ? 128 : 0) | (HEAP8[SDL.keyboardState + 1253 >> 0] ? 2 : 0) | (HEAP8[SDL.keyboardState + 1254 >> 0] ? 512 : 0);
        if (down) {SDL.keyboardMap[code] = event.keyCode} else {delete SDL.keyboardMap[code]}
        break
      }
      case"mousedown":
      case"mouseup":
        if (event.type == "mousedown") {SDL.buttonState |= 1 << event.button} else if (event.type == "mouseup") {SDL.buttonState &= ~(1 << event.button)}
      case"mousemove": {
        Browser.calculateMouseEvent(event);
        break
      }
    }
  },
  flushEventsToHandler: function() {
    if (!SDL.eventHandler) return;
    while (SDL.pollEvent(SDL.eventHandlerTemp)) {Module["dynCall_iii"](SDL.eventHandler, SDL.eventHandlerContext, SDL.eventHandlerTemp)}
  },
  pollEvent: function(ptr) {
    if (SDL.initFlags & 512 && SDL.joystickEventState) {SDL.queryJoysticks()}
    if (ptr) {
      while (SDL.events.length > 0) {if (SDL.makeCEvent(SDL.events.shift(), ptr) !== false) return 1}
      return 0
    } else {return SDL.events.length > 0}
  },
  makeCEvent: function(event, ptr) {
    if (typeof event === "number") {
      _memcpy(ptr, event, 28);
      _free(event);
      return
    }
    SDL.handleEvent(event);
    switch (event.type) {
      case"keydown":
      case"keyup": {
        var down = event.type === "keydown";
        var key = SDL.lookupKeyCodeForEvent(event);
        var scan;
        if (key >= 1024) {scan = key - 1024} else {scan = SDL.scanCodes[key] || key}
        HEAP32[ptr >> 2] = SDL.DOMEventToSDLEvent[event.type];
        HEAP8[ptr + 8 >> 0] = down ? 1 : 0;
        HEAP8[ptr + 9 >> 0] = 0;
        HEAP32[ptr + 12 >> 2] = scan;
        HEAP32[ptr + 16 >> 2] = key;
        HEAP16[ptr + 20 >> 1] = SDL.modState;
        HEAP32[ptr + 24 >> 2] = event.keypressCharCode || key;
        break
      }
      case"keypress": {
        HEAP32[ptr >> 2] = SDL.DOMEventToSDLEvent[event.type];
        var cStr = intArrayFromString(String.fromCharCode(event.charCode));
        for (var i = 0; i < cStr.length; ++i) {HEAP8[ptr + (8 + i) >> 0] = cStr[i]}
        break
      }
      case"mousedown":
      case"mouseup":
      case"mousemove": {
        if (event.type != "mousemove") {
          var down = event.type === "mousedown";
          HEAP32[ptr >> 2] = SDL.DOMEventToSDLEvent[event.type];
          HEAP32[ptr + 4 >> 2] = 0;
          HEAP32[ptr + 8 >> 2] = 0;
          HEAP32[ptr + 12 >> 2] = 0;
          HEAP8[ptr + 16 >> 0] = event.button + 1;
          HEAP8[ptr + 17 >> 0] = down ? 1 : 0;
          HEAP32[ptr + 20 >> 2] = Browser.mouseX;
          HEAP32[ptr + 24 >> 2] = Browser.mouseY
        } else {
          HEAP32[ptr >> 2] = SDL.DOMEventToSDLEvent[event.type];
          HEAP32[ptr + 4 >> 2] = 0;
          HEAP32[ptr + 8 >> 2] = 0;
          HEAP32[ptr + 12 >> 2] = 0;
          HEAP32[ptr + 16 >> 2] = SDL.buttonState;
          HEAP32[ptr + 20 >> 2] = Browser.mouseX;
          HEAP32[ptr + 24 >> 2] = Browser.mouseY;
          HEAP32[ptr + 28 >> 2] = Browser.mouseMovementX;
          HEAP32[ptr + 32 >> 2] = Browser.mouseMovementY
        }
        break
      }
      case"wheel": {
        HEAP32[ptr >> 2] = SDL.DOMEventToSDLEvent[event.type];
        HEAP32[ptr + 16 >> 2] = event.deltaX;
        HEAP32[ptr + 20 >> 2] = event.deltaY;
        break
      }
      case"touchstart":
      case"touchend":
      case"touchmove": {
        var touch = event.touch;
        if (!Browser.touches[touch.identifier]) break;
        var w = Module["canvas"].width;
        var h = Module["canvas"].height;
        var x = Browser.touches[touch.identifier].x / w;
        var y = Browser.touches[touch.identifier].y / h;
        var lx = Browser.lastTouches[touch.identifier].x / w;
        var ly = Browser.lastTouches[touch.identifier].y / h;
        var dx = x - lx;
        var dy = y - ly;
        if (touch["deviceID"] === undefined) touch.deviceID = SDL.TOUCH_DEFAULT_ID;
        if (dx === 0 && dy === 0 && event.type === "touchmove") return false;
        HEAP32[ptr >> 2] = SDL.DOMEventToSDLEvent[event.type];
        HEAP32[ptr + 4 >> 2] = _SDL_GetTicks();
        tempI64 = [touch.deviceID >>> 0, (tempDouble = touch.deviceID, +Math_abs(tempDouble) >= 1 ? tempDouble > 0 ? (Math_min(+Math_floor(tempDouble / 4294967296), 4294967295) | 0) >>> 0 : ~~+Math_ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0 : 0)], HEAP32[ptr + 8 >> 2] = tempI64[0], HEAP32[ptr + 12 >> 2] = tempI64[1];
        tempI64 = [touch.identifier >>> 0, (tempDouble = touch.identifier, +Math_abs(tempDouble) >= 1 ? tempDouble > 0 ? (Math_min(+Math_floor(tempDouble / 4294967296), 4294967295) | 0) >>> 0 : ~~+Math_ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0 : 0)], HEAP32[ptr + 16 >> 2] = tempI64[0], HEAP32[ptr + 20 >> 2] = tempI64[1];
        HEAPF32[ptr + 24 >> 2] = x;
        HEAPF32[ptr + 28 >> 2] = y;
        HEAPF32[ptr + 32 >> 2] = dx;
        HEAPF32[ptr + 36 >> 2] = dy;
        if (touch.force !== undefined) {HEAPF32[ptr + 40 >> 2] = touch.force} else {HEAPF32[ptr + 40 >> 2] = event.type == "touchend" ? 0 : 1}
        break
      }
      case"unload": {
        HEAP32[ptr >> 2] = SDL.DOMEventToSDLEvent[event.type];
        break
      }
      case"resize": {
        HEAP32[ptr >> 2] = SDL.DOMEventToSDLEvent[event.type];
        HEAP32[ptr + 4 >> 2] = event.w;
        HEAP32[ptr + 8 >> 2] = event.h;
        break
      }
      case"joystick_button_up":
      case"joystick_button_down": {
        var state = event.type === "joystick_button_up" ? 0 : 1;
        HEAP32[ptr >> 2] = SDL.DOMEventToSDLEvent[event.type];
        HEAP8[ptr + 4 >> 0] = event.index;
        HEAP8[ptr + 5 >> 0] = event.button;
        HEAP8[ptr + 6 >> 0] = state;
        break
      }
      case"joystick_axis_motion": {
        HEAP32[ptr >> 2] = SDL.DOMEventToSDLEvent[event.type];
        HEAP8[ptr + 4 >> 0] = event.index;
        HEAP8[ptr + 5 >> 0] = event.axis;
        HEAP32[ptr + 8 >> 2] = SDL.joystickAxisValueConversion(event.value);
        break
      }
      case"focus": {
        var SDL_WINDOWEVENT_FOCUS_GAINED = 12;
        HEAP32[ptr >> 2] = SDL.DOMEventToSDLEvent[event.type];
        HEAP32[ptr + 4 >> 2] = 0;
        HEAP8[ptr + 8 >> 0] = SDL_WINDOWEVENT_FOCUS_GAINED;
        break
      }
      case"blur": {
        var SDL_WINDOWEVENT_FOCUS_LOST = 13;
        HEAP32[ptr >> 2] = SDL.DOMEventToSDLEvent[event.type];
        HEAP32[ptr + 4 >> 2] = 0;
        HEAP8[ptr + 8 >> 0] = SDL_WINDOWEVENT_FOCUS_LOST;
        break
      }
      case"visibilitychange": {
        var SDL_WINDOWEVENT_SHOWN = 1;
        var SDL_WINDOWEVENT_HIDDEN = 2;
        var visibilityEventID = event.visible ? SDL_WINDOWEVENT_SHOWN : SDL_WINDOWEVENT_HIDDEN;
        HEAP32[ptr >> 2] = SDL.DOMEventToSDLEvent[event.type];
        HEAP32[ptr + 4 >> 2] = 0;
        HEAP8[ptr + 8 >> 0] = visibilityEventID;
        break
      }
      default:
        throw"Unhandled SDL event: " + event.type
    }
  },
  makeFontString: function(height, fontName) {
    if (fontName.charAt(0) != "'" && fontName.charAt(0) != '"') {fontName = '"' + fontName + '"'}
    return height + "px " + fontName + ", serif"
  },
  estimateTextWidth: function(fontData, text) {
    var h = fontData.size;
    var fontString = SDL.makeFontString(h, fontData.name);
    var tempCtx = SDL.ttfContext;
    tempCtx.font = fontString;
    var ret = tempCtx.measureText(text).width | 0;
    return ret
  },
  allocateChannels: function(num) {
    if (SDL.numChannels && SDL.numChannels >= num && num != 0) return;
    SDL.numChannels = num;
    SDL.channels = [];
    for (var i = 0; i < num; i++) {SDL.channels[i] = {audio: null, volume: 1}}
  },
  setGetVolume: function(info, volume) {
    if (!info) return 0;
    var ret = info.volume * 128;
    if (volume != -1) {
      info.volume = Math.min(Math.max(volume, 0), 128) / 128;
      if (info.audio) {
        try {
          info.audio.volume = info.volume;
          if (info.audio.webAudioGainNode) info.audio.webAudioGainNode["gain"]["value"] = info.volume
        } catch (e) {err("setGetVolume failed to set audio volume: " + e)}
      }
    }
    return ret
  },
  setPannerPosition: function(info, x, y, z) {
    if (!info) return;
    if (info.audio) {if (info.audio.webAudioPannerNode) {info.audio.webAudioPannerNode["setPosition"](x, y, z)}}
  },
  playWebAudio: function(audio) {
    if (!audio) return;
    if (audio.webAudioNode) return;
    if (!SDL.webAudioAvailable()) return;
    try {
      var webAudio = audio.resource.webAudio;
      audio.paused = false;
      if (!webAudio.decodedBuffer) {
        if (webAudio.onDecodeComplete === undefined) abort("Cannot play back audio object that was not loaded");
        webAudio.onDecodeComplete.push(function() {if (!audio.paused) SDL.playWebAudio(audio)});
        return
      }
      audio.webAudioNode = SDL.audioContext["createBufferSource"]();
      audio.webAudioNode["buffer"] = webAudio.decodedBuffer;
      audio.webAudioNode["loop"] = audio.loop;
      audio.webAudioNode["onended"] = function() {audio["onended"]()};
      audio.webAudioPannerNode = SDL.audioContext["createPanner"]();
      audio.webAudioPannerNode["setPosition"](0, 0, -.5);
      audio.webAudioPannerNode["panningModel"] = "equalpower";
      audio.webAudioGainNode = SDL.audioContext["createGain"]();
      audio.webAudioGainNode["gain"]["value"] = audio.volume;
      audio.webAudioNode["connect"](audio.webAudioPannerNode);
      audio.webAudioPannerNode["connect"](audio.webAudioGainNode);
      audio.webAudioGainNode["connect"](SDL.audioContext["destination"]);
      audio.webAudioNode["start"](0, audio.currentPosition);
      audio.startTime = SDL.audioContext["currentTime"] - audio.currentPosition
    } catch (e) {err("playWebAudio failed: " + e)}
  },
  pauseWebAudio: function(audio) {
    if (!audio) return;
    if (audio.webAudioNode) {
      try {
        audio.currentPosition = (SDL.audioContext["currentTime"] - audio.startTime) % audio.resource.webAudio.decodedBuffer.duration;
        audio.webAudioNode["onended"] = undefined;
        audio.webAudioNode.stop(0);
        audio.webAudioNode = undefined
      } catch (e) {err("pauseWebAudio failed: " + e)}
    }
    audio.paused = true
  },
  openAudioContext: function() {if (!SDL.audioContext) {if (typeof AudioContext !== "undefined") SDL.audioContext = new AudioContext; else if (typeof webkitAudioContext !== "undefined") SDL.audioContext = new webkitAudioContext}},
  webAudioAvailable: function() {return !!SDL.audioContext},
  fillWebAudioBufferFromHeap: function(heapPtr, sizeSamplesPerChannel, dstAudioBuffer) {
    var numChannels = SDL.audio.channels;
    for (var c = 0; c < numChannels; ++c) {
      var channelData = dstAudioBuffer["getChannelData"](c);
      if (channelData.length != sizeSamplesPerChannel) {throw"Web Audio output buffer length mismatch! Destination size: " + channelData.length + " samples vs expected " + sizeSamplesPerChannel + " samples!"}
      if (SDL.audio.format == 32784) {for (var j = 0; j < sizeSamplesPerChannel; ++j) {channelData[j] = HEAP16[heapPtr + (j * numChannels + c) * 2 >> 1] / 32768}} else if (SDL.audio.format == 8) {
        for (var j = 0; j < sizeSamplesPerChannel; ++j) {
          var v = HEAP8[heapPtr + (j * numChannels + c) >> 0];
          channelData[j] = (v >= 0 ? v - 128 : v + 128) / 128
        }
      } else if (SDL.audio.format == 33056) {for (var j = 0; j < sizeSamplesPerChannel; ++j) {channelData[j] = HEAPF32[heapPtr + (j * numChannels + c) * 4 >> 2]}} else {throw"Invalid SDL audio format " + SDL.audio.format + "!"}
    }
  },
  debugSurface: function(surfData) {
    console.log("dumping surface " + [surfData.surf, surfData.source, surfData.width, surfData.height]);
    var image = surfData.ctx.getImageData(0, 0, surfData.width, surfData.height);
    var data = image.data;
    var num = Math.min(surfData.width, surfData.height);
    for (var i = 0; i < num; i++) {console.log("   diagonal " + i + ":" + [data[i * surfData.width * 4 + i * 4 + 0], data[i * surfData.width * 4 + i * 4 + 1], data[i * surfData.width * 4 + i * 4 + 2], data[i * surfData.width * 4 + i * 4 + 3]])}
  },
  joystickEventState: 1,
  lastJoystickState: {},
  joystickNamePool: {},
  recordJoystickState: function(joystick, state) {
    var buttons = new Array(state.buttons.length);
    for (var i = 0; i < state.buttons.length; i++) {buttons[i] = SDL.getJoystickButtonState(state.buttons[i])}
    SDL.lastJoystickState[joystick] = {
      buttons: buttons,
      axes: state.axes.slice(0),
      timestamp: state.timestamp,
      index: state.index,
      id: state.id
    }
  },
  getJoystickButtonState: function(button) {if (typeof button === "object") {return button["pressed"]} else {return button > 0}},
  queryJoysticks: function() {
    for (var joystick in SDL.lastJoystickState) {
      var state = SDL.getGamepad(joystick - 1);
      var prevState = SDL.lastJoystickState[joystick];
      if (typeof state === "undefined") return;
      if (state === null) return;
      if (typeof state.timestamp !== "number" || state.timestamp !== prevState.timestamp || !state.timestamp) {
        var i;
        for (i = 0; i < state.buttons.length; i++) {
          var buttonState = SDL.getJoystickButtonState(state.buttons[i]);
          if (buttonState !== prevState.buttons[i]) {
            SDL.events.push({
              type: buttonState ? "joystick_button_down" : "joystick_button_up",
              joystick: joystick,
              index: joystick - 1,
              button: i
            })
          }
        }
        for (i = 0; i < state.axes.length; i++) {
          if (state.axes[i] !== prevState.axes[i]) {
            SDL.events.push({
              type: "joystick_axis_motion",
              joystick: joystick,
              index: joystick - 1,
              axis: i,
              value: state.axes[i]
            })
          }
        }
        SDL.recordJoystickState(joystick, state)
      }
    }
  },
  joystickAxisValueConversion: function(value) {
    value = Math.min(1, Math.max(value, -1));
    return Math.ceil((value + 1) * 32767.5 - 32768)
  },
  getGamepads: function() {
    var fcn = navigator.getGamepads || navigator.webkitGamepads || navigator.mozGamepads || navigator.gamepads || navigator.webkitGetGamepads;
    if (fcn !== undefined) {return fcn.apply(navigator)} else {return []}
  },
  getGamepad: function(deviceIndex) {
    var gamepads = SDL.getGamepads();
    if (gamepads.length > deviceIndex && deviceIndex >= 0) {return gamepads[deviceIndex]}
    return null
  }
};

function _Mix_AllocateChannels (num) {
  SDL.allocateChannels(num);
  return num
}

function _Mix_HaltChannel (channel) {
  function halt (channel) {
    var info = SDL.channels[channel];
    if (info.audio) {
      info.audio.pause();
      info.audio = null
    }
    if (SDL.channelFinished) {getFuncWrapper(SDL.channelFinished, "vi")(channel)}
  }

  if (channel != -1) {halt(channel)} else {for (var i = 0; i < SDL.channels.length; ++i) halt(i)}
  return 0
}

function _Mix_Init (flags) {
  if (!flags) return 0;
  return 8
}

function _Mix_LoadWAV_RW (rwopsID, freesrc) {
  var rwops = SDL.rwops[rwopsID];
  if (rwops === undefined) return 0;
  var filename = "";
  var audio;
  var webAudio;
  var bytes;
  if (rwops.filename !== undefined) {
    filename = PATH_FS.resolve(rwops.filename);
    var raw = Module["preloadedAudios"][filename];
    if (!raw) {
      if (raw === null) err("Trying to reuse preloaded audio, but freePreloadedMediaOnUse is set!");
      if (!Module.noAudioDecoding) warnOnce("Cannot find preloaded audio " + filename);
      try {bytes = FS.readFile(filename)} catch (e) {
        err("Couldn't find file for: " + filename);
        return 0
      }
    }
    if (Module["freePreloadedMediaOnUse"]) {Module["preloadedAudios"][filename] = null}
    audio = raw
  } else if (rwops.bytes !== undefined) {if (SDL.webAudioAvailable()) bytes = HEAPU8.buffer.slice(rwops.bytes, rwops.bytes + rwops.count); else bytes = HEAPU8.subarray(rwops.bytes, rwops.bytes + rwops.count)} else {return 0}
  var arrayBuffer = bytes ? bytes.buffer || bytes : bytes;
  var canPlayWithWebAudio = Module["SDL_canPlayWithWebAudio"] === undefined || Module["SDL_canPlayWithWebAudio"](filename, arrayBuffer);
  if (bytes !== undefined && SDL.webAudioAvailable() && canPlayWithWebAudio) {
    audio = undefined;
    webAudio = {};
    webAudio.onDecodeComplete = [];
    var onDecodeComplete = function(data) {
      webAudio.decodedBuffer = data;
      webAudio.onDecodeComplete.forEach(function(e) {e()});
      webAudio.onDecodeComplete = undefined
    };
    SDL.audioContext["decodeAudioData"](arrayBuffer, onDecodeComplete)
  } else if (audio === undefined && bytes) {
    var blob = new Blob([bytes], {type: rwops.mimetype});
    var url = URL.createObjectURL(blob);
    audio = new Audio;
    audio.src = url;
    audio.mozAudioChannelType = "content"
  }
  var id = SDL.audios.length;
  SDL.audios.push({source: filename, audio: audio, webAudio: webAudio});
  return id
}

function _SDL_RWFromFile (_name, mode) {
  var id = SDL.rwops.length;
  var name = UTF8ToString(_name);
  SDL.rwops.push({filename: name, mimetype: Browser.getMimetype(name)});
  return id
}

function _SDL_FreeRW (rwopsID) {
  SDL.rwops[rwopsID] = null;
  while (SDL.rwops.length > 0 && SDL.rwops[SDL.rwops.length - 1] === null) {SDL.rwops.pop()}
}

function _Mix_LoadWAV (filename) {
  var rwops = _SDL_RWFromFile(filename);
  var result = _Mix_LoadWAV_RW(rwops);
  _SDL_FreeRW(rwops);
  return result
}

function _Mix_OpenAudio (frequency, format, channels, chunksize) {
  SDL.openAudioContext();
  SDL.allocateChannels(32);
  SDL.mixerFrequency = frequency;
  SDL.mixerFormat = format;
  SDL.mixerNumChannels = channels;
  SDL.mixerChunkSize = chunksize;
  return 0
}

function _Mix_Pause (channel) {
  if (channel === -1) {
    for (var i = 0; i < SDL.channels.length; i++) {_Mix_Pause(i)}
    return
  }
  var info = SDL.channels[channel];
  if (info && info.audio) {info.audio.pause()} else {}
}

function _Mix_PlayChannel (channel, id, loops) {
  var info = SDL.audios[id];
  if (!info) return -1;
  if (!info.audio && !info.webAudio) return -1;
  if (channel == -1) {
    for (var i = SDL.channelMinimumNumber; i < SDL.numChannels; i++) {
      if (!SDL.channels[i].audio) {
        channel = i;
        break
      }
    }
    if (channel == -1) {
      err("All " + SDL.numChannels + " channels in use!");
      return -1
    }
  }
  var channelInfo = SDL.channels[channel];
  var audio;
  if (info.webAudio) {
    audio = {};
    audio.resource = info;
    audio.paused = false;
    audio.currentPosition = 0;
    audio.play = function() {SDL.playWebAudio(this)};
    audio.pause = function() {SDL.pauseWebAudio(this)}
  } else {
    audio = info.audio.cloneNode(true);
    audio.numChannels = info.audio.numChannels;
    audio.frequency = info.audio.frequency
  }
  audio["onended"] = function SDL_audio_onended () {
    if (channelInfo.audio == this) {
      channelInfo.audio.paused = true;
      channelInfo.audio = null
    }
    if (SDL.channelFinished) getFuncWrapper(SDL.channelFinished, "vi")(channel)
  };
  channelInfo.audio = audio;
  audio.loop = loops != 0;
  audio.volume = channelInfo.volume;
  audio.play();
  return channel
}

function _Mix_PlayChannelTimed () {return _Mix_PlayChannel.apply(null, arguments)}

function _Mix_Resume (channel) {
  if (channel === -1) {
    for (var i = 0; i < SDL.channels.length; i++) {_Mix_Resume(i)}
    return
  }
  var info = SDL.channels[channel];
  if (info && info.audio) info.audio.play()
}

function _Mix_Volume (channel, volume) {
  if (channel == -1) {
    for (var i = 0; i < SDL.numChannels - 1; i++) {_Mix_Volume(i, volume)}
    return _Mix_Volume(SDL.numChannels - 1, volume)
  }
  return SDL.setGetVolume(SDL.channels[channel], volume)
}

function _SDL_GetError () {
  if (!SDL.errorMessage) {SDL.errorMessage = allocate(intArrayFromString("unknown SDL-emscripten error"), "i8", ALLOC_NORMAL)}
  return SDL.errorMessage
}

var ENV = {};

function ___buildEnvironment (environ) {
  var MAX_ENV_VALUES = 64;
  var TOTAL_ENV_SIZE = 1024;
  var poolPtr;
  var envPtr;
  if (!___buildEnvironment.called) {
    ___buildEnvironment.called = true;
    ENV["USER"] = ENV["LOGNAME"] = "web_user";
    ENV["PATH"] = "/";
    ENV["PWD"] = "/";
    ENV["HOME"] = "/home/web_user";
    ENV["LANG"] = (typeof navigator === "object" && navigator.languages && navigator.languages[0] || "C").replace("-", "_") + ".UTF-8";
    ENV["_"] = thisProgram;
    poolPtr = getMemory(TOTAL_ENV_SIZE);
    envPtr = getMemory(MAX_ENV_VALUES * 4);
    HEAP32[envPtr >> 2] = poolPtr;
    HEAP32[environ >> 2] = envPtr
  } else {
    envPtr = HEAP32[environ >> 2];
    poolPtr = HEAP32[envPtr >> 2]
  }
  var strings = [];
  var totalSize = 0;
  for (var key in ENV) {
    if (typeof ENV[key] === "string") {
      var line = key + "=" + ENV[key];
      strings.push(line);
      totalSize += line.length
    }
  }
  if (totalSize > TOTAL_ENV_SIZE) {throw new Error("Environment size exceeded TOTAL_ENV_SIZE!")}
  var ptrSize = 4;
  for (var i = 0; i < strings.length; i++) {
    var line = strings[i];
    writeAsciiToMemory(line, poolPtr);
    HEAP32[envPtr + i * ptrSize >> 2] = poolPtr;
    poolPtr += line.length + 1
  }
  HEAP32[envPtr + strings.length * ptrSize >> 2] = 0
}

function ___cxa_allocate_exception (size) {return _malloc(size)}

var ___exception_infos = {};

function ___cxa_free_exception (ptr) {try {return _free(ptr)} catch (e) {}}

function ___exception_decRef (ptr) {
  if (!ptr) return;
  var info = ___exception_infos[ptr];
  info.refcount--;
  if (info.refcount === 0 && !info.rethrown) {
    if (info.destructor) {Module["dynCall_ii"](info.destructor, ptr)}
    delete ___exception_infos[ptr];
    ___cxa_free_exception(ptr)
  }
}

function ___exception_deAdjust (adjusted) {
  if (!adjusted || ___exception_infos[adjusted]) return adjusted;
  for (var key in ___exception_infos) {
    var ptr = +key;
    var adj = ___exception_infos[ptr].adjusted;
    var len = adj.length;
    for (var i = 0; i < len; i++) {if (adj[i] === adjusted) {return ptr}}
  }
  return adjusted
}

function ___cxa_decrement_exception_refcount (ptr) {___exception_decRef(___exception_deAdjust(ptr))}

function ___cxa_pure_virtual () {
  ABORT = true;
  throw"Pure virtual function called!"
}

var ___exception_last = 0;

function ___cxa_throw (ptr, type, destructor) {
  ___exception_infos[ptr] = {
    ptr: ptr,
    adjusted: [ptr],
    type: type,
    destructor: destructor,
    refcount: 0,
    caught: false,
    rethrown: false
  };
  ___exception_last = ptr;
  if (!("uncaught_exception" in __ZSt18uncaught_exceptionv)) {__ZSt18uncaught_exceptionv.uncaught_exceptions = 1} else {__ZSt18uncaught_exceptionv.uncaught_exceptions++}
  throw ptr
}

function ___cxa_uncaught_exceptions () {return __ZSt18uncaught_exceptionv.uncaught_exceptions}

function ___lock () {}

function ___map_file (pathname, size) {
  ___setErrNo(1);
  return -1
}

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
var SOCKFS = {
  mount: function(mount) {
    Module["websocket"] = Module["websocket"] && "object" === typeof Module["websocket"] ? Module["websocket"] : {};
    Module["websocket"]._callbacks = {};
    Module["websocket"]["on"] = function(event, callback) {
      if ("function" === typeof callback) {this._callbacks[event] = callback}
      return this
    };
    Module["websocket"].emit = function(event, param) {if ("function" === typeof this._callbacks[event]) {this._callbacks[event].call(this, param)}};
    return FS.createNode(null, "/", 16384 | 511, 0)
  }, createSocket: function(family, type, protocol) {
    var streaming = type == 1;
    if (protocol) {assert(streaming == (protocol == 6))}
    var sock = {
      family: family,
      type: type,
      protocol: protocol,
      server: null,
      error: null,
      peers: {},
      pending: [],
      recv_queue: [],
      sock_ops: SOCKFS.websocket_sock_ops
    };
    var name = SOCKFS.nextname();
    var node = FS.createNode(SOCKFS.root, name, 49152, 0);
    node.sock = sock;
    var stream = FS.createStream({
      path: name,
      node: node,
      flags: FS.modeStringToFlags("r+"),
      seekable: false,
      stream_ops: SOCKFS.stream_ops
    });
    sock.stream = stream;
    return sock
  }, getSocket: function(fd) {
    var stream = FS.getStream(fd);
    if (!stream || !FS.isSocket(stream.node.mode)) {return null}
    return stream.node.sock
  }, stream_ops: {
    poll: function(stream) {
      var sock = stream.node.sock;
      return sock.sock_ops.poll(sock)
    }, ioctl: function(stream, request, varargs) {
      var sock = stream.node.sock;
      return sock.sock_ops.ioctl(sock, request, varargs)
    }, read: function(stream, buffer, offset, length, position) {
      var sock = stream.node.sock;
      var msg = sock.sock_ops.recvmsg(sock, length);
      if (!msg) {return 0}
      buffer.set(msg.buffer, offset);
      return msg.buffer.length
    }, write: function(stream, buffer, offset, length, position) {
      var sock = stream.node.sock;
      return sock.sock_ops.sendmsg(sock, buffer, offset, length)
    }, close: function(stream) {
      var sock = stream.node.sock;
      sock.sock_ops.close(sock)
    }
  }, nextname: function() {
    if (!SOCKFS.nextname.current) {SOCKFS.nextname.current = 0}
    return "socket[" + SOCKFS.nextname.current++ + "]"
  }, websocket_sock_ops: {
    createPeer: function(sock, addr, port) {
      var ws;
      if (typeof addr === "object") {
        ws = addr;
        addr = null;
        port = null
      }
      if (ws) {
        if (ws._socket) {
          addr = ws._socket.remoteAddress;
          port = ws._socket.remotePort
        } else {
          var result = /ws[s]?:\/\/([^:]+):(\d+)/.exec(ws.url);
          if (!result) {throw new Error("WebSocket URL must be in the format ws(s)://address:port")}
          addr = result[1];
          port = parseInt(result[2], 10)
        }
      } else {
        try {
          var runtimeConfig = Module["websocket"] && "object" === typeof Module["websocket"];
          var url = "ws:#".replace("#", "//");
          if (runtimeConfig) {if ("string" === typeof Module["websocket"]["url"]) {url = Module["websocket"]["url"]}}
          if (url === "ws://" || url === "wss://") {
            var parts = addr.split("/");
            url = url + parts[0] + ":" + port + "/" + parts.slice(1).join("/")
          }
          var subProtocols = "binary";
          if (runtimeConfig) {if ("string" === typeof Module["websocket"]["subprotocol"]) {subProtocols = Module["websocket"]["subprotocol"]}}
          var opts = undefined;
          if (subProtocols !== "null") {
            subProtocols = subProtocols.replace(/^ +| +$/g, "").split(/ *, */);
            opts = ENVIRONMENT_IS_NODE ? {"protocol": subProtocols.toString()} : subProtocols
          }
          if (runtimeConfig && null === Module["websocket"]["subprotocol"]) {
            subProtocols = "null";
            opts = undefined
          }
          var WebSocketConstructor;
          if (ENVIRONMENT_IS_NODE) {WebSocketConstructor = require("ws")} else if (ENVIRONMENT_IS_WEB) {WebSocketConstructor = window["WebSocket"]} else {WebSocketConstructor = WebSocket}
          ws = new WebSocketConstructor(url, opts);
          ws.binaryType = "arraybuffer"
        } catch (e) {throw new FS.ErrnoError(ERRNO_CODES.EHOSTUNREACH)}
      }
      var peer = {addr: addr, port: port, socket: ws, dgram_send_queue: []};
      SOCKFS.websocket_sock_ops.addPeer(sock, peer);
      SOCKFS.websocket_sock_ops.handlePeerEvents(sock, peer);
      if (sock.type === 2 && typeof sock.sport !== "undefined") {peer.dgram_send_queue.push(new Uint8Array([255, 255, 255, 255, "p".charCodeAt(0), "o".charCodeAt(0), "r".charCodeAt(0), "t".charCodeAt(0), (sock.sport & 65280) >> 8, sock.sport & 255]))}
      return peer
    },
    getPeer: function(sock, addr, port) {return sock.peers[addr + ":" + port]},
    addPeer: function(sock, peer) {sock.peers[peer.addr + ":" + peer.port] = peer},
    removePeer: function(sock, peer) {delete sock.peers[peer.addr + ":" + peer.port]},
    handlePeerEvents: function(sock, peer) {
      var first = true;
      var handleOpen = function() {
        Module["websocket"].emit("open", sock.stream.fd);
        try {
          var queued = peer.dgram_send_queue.shift();
          while (queued) {
            peer.socket.send(queued);
            queued = peer.dgram_send_queue.shift()
          }
        } catch (e) {peer.socket.close()}
      };

      function handleMessage (data) {
        if (typeof data === "string") {
          var encoder = new TextEncoder;
          data = encoder.encode(data)
        } else {
          assert(data.byteLength !== undefined);
          if (data.byteLength == 0) {return} else {data = new Uint8Array(data)}
        }
        var wasfirst = first;
        first = false;
        if (wasfirst && data.length === 10 && data[0] === 255 && data[1] === 255 && data[2] === 255 && data[3] === 255 && data[4] === "p".charCodeAt(0) && data[5] === "o".charCodeAt(0) && data[6] === "r".charCodeAt(0) && data[7] === "t".charCodeAt(0)) {
          var newport = data[8] << 8 | data[9];
          SOCKFS.websocket_sock_ops.removePeer(sock, peer);
          peer.port = newport;
          SOCKFS.websocket_sock_ops.addPeer(sock, peer);
          return
        }
        sock.recv_queue.push({addr: peer.addr, port: peer.port, data: data});
        Module["websocket"].emit("message", sock.stream.fd)
      }

      if (ENVIRONMENT_IS_NODE) {
        peer.socket.on("open", handleOpen);
        peer.socket.on("message", function(data, flags) {
          if (!flags.binary) {return}
          handleMessage(new Uint8Array(data).buffer)
        });
        peer.socket.on("close", function() {Module["websocket"].emit("close", sock.stream.fd)});
        peer.socket.on("error", function(error) {
          sock.error = ERRNO_CODES.ECONNREFUSED;
          Module["websocket"].emit("error", [sock.stream.fd, sock.error, "ECONNREFUSED: Connection refused"])
        })
      } else {
        peer.socket.onopen = handleOpen;
        peer.socket.onclose = function() {Module["websocket"].emit("close", sock.stream.fd)};
        peer.socket.onmessage = function peer_socket_onmessage (event) {handleMessage(event.data)};
        peer.socket.onerror = function(error) {
          sock.error = ERRNO_CODES.ECONNREFUSED;
          Module["websocket"].emit("error", [sock.stream.fd, sock.error, "ECONNREFUSED: Connection refused"])
        }
      }
    },
    poll: function(sock) {
      if (sock.type === 1 && sock.server) {return sock.pending.length ? 64 | 1 : 0}
      var mask = 0;
      var dest = sock.type === 1 ? SOCKFS.websocket_sock_ops.getPeer(sock, sock.daddr, sock.dport) : null;
      if (sock.recv_queue.length || !dest || dest && dest.socket.readyState === dest.socket.CLOSING || dest && dest.socket.readyState === dest.socket.CLOSED) {mask |= 64 | 1}
      if (!dest || dest && dest.socket.readyState === dest.socket.OPEN) {mask |= 4}
      if (dest && dest.socket.readyState === dest.socket.CLOSING || dest && dest.socket.readyState === dest.socket.CLOSED) {mask |= 16}
      return mask
    },
    ioctl: function(sock, request, arg) {
      switch (request) {
        case 21531:
          var bytes = 0;
          if (sock.recv_queue.length) {bytes = sock.recv_queue[0].data.length}
          HEAP32[arg >> 2] = bytes;
          return 0;
        default:
          return ERRNO_CODES.EINVAL
      }
    },
    close: function(sock) {
      if (sock.server) {
        try {sock.server.close()} catch (e) {}
        sock.server = null
      }
      var peers = Object.keys(sock.peers);
      for (var i = 0; i < peers.length; i++) {
        var peer = sock.peers[peers[i]];
        try {peer.socket.close()} catch (e) {}
        SOCKFS.websocket_sock_ops.removePeer(sock, peer)
      }
      return 0
    },
    bind: function(sock, addr, port) {
      if (typeof sock.saddr !== "undefined" || typeof sock.sport !== "undefined") {throw new FS.ErrnoError(ERRNO_CODES.EINVAL)}
      sock.saddr = addr;
      sock.sport = port;
      if (sock.type === 2) {
        if (sock.server) {
          sock.server.close();
          sock.server = null
        }
        try {sock.sock_ops.listen(sock, 0)} catch (e) {
          if (!(e instanceof FS.ErrnoError)) throw e;
          if (e.errno !== ERRNO_CODES.EOPNOTSUPP) throw e
        }
      }
    },
    connect: function(sock, addr, port) {
      if (sock.server) {throw new FS.ErrnoError(ERRNO_CODES.EOPNOTSUPP)}
      if (typeof sock.daddr !== "undefined" && typeof sock.dport !== "undefined") {
        var dest = SOCKFS.websocket_sock_ops.getPeer(sock, sock.daddr, sock.dport);
        if (dest) {if (dest.socket.readyState === dest.socket.CONNECTING) {throw new FS.ErrnoError(ERRNO_CODES.EALREADY)} else {throw new FS.ErrnoError(ERRNO_CODES.EISCONN)}}
      }
      var peer = SOCKFS.websocket_sock_ops.createPeer(sock, addr, port);
      sock.daddr = peer.addr;
      sock.dport = peer.port;
      throw new FS.ErrnoError(ERRNO_CODES.EINPROGRESS)
    },
    listen: function(sock, backlog) {
      if (!ENVIRONMENT_IS_NODE) {throw new FS.ErrnoError(ERRNO_CODES.EOPNOTSUPP)}
      if (sock.server) {throw new FS.ErrnoError(ERRNO_CODES.EINVAL)}
      var WebSocketServer = require("ws").Server;
      var host = sock.saddr;
      sock.server = new WebSocketServer({host: host, port: sock.sport});
      Module["websocket"].emit("listen", sock.stream.fd);
      sock.server.on("connection", function(ws) {
        if (sock.type === 1) {
          var newsock = SOCKFS.createSocket(sock.family, sock.type, sock.protocol);
          var peer = SOCKFS.websocket_sock_ops.createPeer(newsock, ws);
          newsock.daddr = peer.addr;
          newsock.dport = peer.port;
          sock.pending.push(newsock);
          Module["websocket"].emit("connection", newsock.stream.fd)
        } else {
          SOCKFS.websocket_sock_ops.createPeer(sock, ws);
          Module["websocket"].emit("connection", sock.stream.fd)
        }
      });
      sock.server.on("closed", function() {
        Module["websocket"].emit("close", sock.stream.fd);
        sock.server = null
      });
      sock.server.on("error", function(error) {
        sock.error = ERRNO_CODES.EHOSTUNREACH;
        Module["websocket"].emit("error", [sock.stream.fd, sock.error, "EHOSTUNREACH: Host is unreachable"])
      })
    },
    accept: function(listensock) {
      if (!listensock.server) {throw new FS.ErrnoError(ERRNO_CODES.EINVAL)}
      var newsock = listensock.pending.shift();
      newsock.stream.flags = listensock.stream.flags;
      return newsock
    },
    getname: function(sock, peer) {
      var addr, port;
      if (peer) {
        if (sock.daddr === undefined || sock.dport === undefined) {throw new FS.ErrnoError(ERRNO_CODES.ENOTCONN)}
        addr = sock.daddr;
        port = sock.dport
      } else {
        addr = sock.saddr || 0;
        port = sock.sport || 0
      }
      return {addr: addr, port: port}
    },
    sendmsg: function(sock, buffer, offset, length, addr, port) {
      if (sock.type === 2) {
        if (addr === undefined || port === undefined) {
          addr = sock.daddr;
          port = sock.dport
        }
        if (addr === undefined || port === undefined) {throw new FS.ErrnoError(ERRNO_CODES.EDESTADDRREQ)}
      } else {
        addr = sock.daddr;
        port = sock.dport
      }
      var dest = SOCKFS.websocket_sock_ops.getPeer(sock, addr, port);
      if (sock.type === 1) {if (!dest || dest.socket.readyState === dest.socket.CLOSING || dest.socket.readyState === dest.socket.CLOSED) {throw new FS.ErrnoError(ERRNO_CODES.ENOTCONN)} else if (dest.socket.readyState === dest.socket.CONNECTING) {throw new FS.ErrnoError(ERRNO_CODES.EAGAIN)}}
      if (ArrayBuffer.isView(buffer)) {
        offset += buffer.byteOffset;
        buffer = buffer.buffer
      }
      var data;
      data = buffer.slice(offset, offset + length);
      if (sock.type === 2) {
        if (!dest || dest.socket.readyState !== dest.socket.OPEN) {
          if (!dest || dest.socket.readyState === dest.socket.CLOSING || dest.socket.readyState === dest.socket.CLOSED) {dest = SOCKFS.websocket_sock_ops.createPeer(sock, addr, port)}
          dest.dgram_send_queue.push(data);
          return length
        }
      }
      try {
        dest.socket.send(data);
        return length
      } catch (e) {throw new FS.ErrnoError(ERRNO_CODES.EINVAL)}
    },
    recvmsg: function(sock, length) {
      if (sock.type === 1 && sock.server) {throw new FS.ErrnoError(ERRNO_CODES.ENOTCONN)}
      var queued = sock.recv_queue.shift();
      if (!queued) {
        if (sock.type === 1) {
          var dest = SOCKFS.websocket_sock_ops.getPeer(sock, sock.daddr, sock.dport);
          if (!dest) {throw new FS.ErrnoError(ERRNO_CODES.ENOTCONN)} else if (dest.socket.readyState === dest.socket.CLOSING || dest.socket.readyState === dest.socket.CLOSED) {return null} else {throw new FS.ErrnoError(ERRNO_CODES.EAGAIN)}
        } else {throw new FS.ErrnoError(ERRNO_CODES.EAGAIN)}
      }
      var queuedLength = queued.data.byteLength || queued.data.length;
      var queuedOffset = queued.data.byteOffset || 0;
      var queuedBuffer = queued.data.buffer || queued.data;
      var bytesRead = Math.min(length, queuedLength);
      var res = {buffer: new Uint8Array(queuedBuffer, queuedOffset, bytesRead), addr: queued.addr, port: queued.port};
      if (sock.type === 1 && bytesRead < queuedLength) {
        var bytesRemaining = queuedLength - bytesRead;
        queued.data = new Uint8Array(queuedBuffer, queuedOffset + bytesRead, bytesRemaining);
        sock.recv_queue.unshift(queued)
      }
      return res
    }
  }
};

function __inet_pton4_raw (str) {
  var b = str.split(".");
  for (var i = 0; i < 4; i++) {
    var tmp = Number(b[i]);
    if (isNaN(tmp)) return null;
    b[i] = tmp
  }
  return (b[0] | b[1] << 8 | b[2] << 16 | b[3] << 24) >>> 0
}

function __inet_pton6_raw (str) {
  var words;
  var w, offset, z;
  var valid6regx = /^((?=.*::)(?!.*::.+::)(::)?([\dA-F]{1,4}:(:|\b)|){5}|([\dA-F]{1,4}:){6})((([\dA-F]{1,4}((?!\3)::|:\b|$))|(?!\2\3)){2}|(((2[0-4]|1\d|[1-9])?\d|25[0-5])\.?\b){4})$/i;
  var parts = [];
  if (!valid6regx.test(str)) {return null}
  if (str === "::") {return [0, 0, 0, 0, 0, 0, 0, 0]}
  if (str.indexOf("::") === 0) {str = str.replace("::", "Z:")} else {str = str.replace("::", ":Z:")}
  if (str.indexOf(".") > 0) {
    str = str.replace(new RegExp("[.]", "g"), ":");
    words = str.split(":");
    words[words.length - 4] = parseInt(words[words.length - 4]) + parseInt(words[words.length - 3]) * 256;
    words[words.length - 3] = parseInt(words[words.length - 2]) + parseInt(words[words.length - 1]) * 256;
    words = words.slice(0, words.length - 2)
  } else {words = str.split(":")}
  offset = 0;
  z = 0;
  for (w = 0; w < words.length; w++) {
    if (typeof words[w] === "string") {
      if (words[w] === "Z") {
        for (z = 0; z < 8 - words.length + 1; z++) {parts[w + z] = 0}
        offset = z - 1
      } else {parts[w + offset] = _htons(parseInt(words[w], 16))}
    } else {parts[w + offset] = words[w]}
  }
  return [parts[1] << 16 | parts[0], parts[3] << 16 | parts[2], parts[5] << 16 | parts[4], parts[7] << 16 | parts[6]]
}

var DNS = {
  address_map: {id: 1, addrs: {}, names: {}}, lookup_name: function(name) {
    var res = __inet_pton4_raw(name);
    if (res !== null) {return name}
    res = __inet_pton6_raw(name);
    if (res !== null) {return name}
    var addr;
    if (DNS.address_map.addrs[name]) {addr = DNS.address_map.addrs[name]} else {
      var id = DNS.address_map.id++;
      assert(id < 65535, "exceeded max address mappings of 65535");
      addr = "172.29." + (id & 255) + "." + (id & 65280);
      DNS.address_map.names[addr] = name;
      DNS.address_map.addrs[name] = addr
    }
    return addr
  }, lookup_addr: function(addr) {
    if (DNS.address_map.names[addr]) {return DNS.address_map.names[addr]}
    return null
  }
};

function __inet_ntop4_raw (addr) {return (addr & 255) + "." + (addr >> 8 & 255) + "." + (addr >> 16 & 255) + "." + (addr >> 24 & 255)}

function __inet_ntop6_raw (ints) {
  var str = "";
  var word = 0;
  var longest = 0;
  var lastzero = 0;
  var zstart = 0;
  var len = 0;
  var i = 0;
  var parts = [ints[0] & 65535, ints[0] >> 16, ints[1] & 65535, ints[1] >> 16, ints[2] & 65535, ints[2] >> 16, ints[3] & 65535, ints[3] >> 16];
  var hasipv4 = true;
  var v4part = "";
  for (i = 0; i < 5; i++) {
    if (parts[i] !== 0) {
      hasipv4 = false;
      break
    }
  }
  if (hasipv4) {
    v4part = __inet_ntop4_raw(parts[6] | parts[7] << 16);
    if (parts[5] === -1) {
      str = "::ffff:";
      str += v4part;
      return str
    }
    if (parts[5] === 0) {
      str = "::";
      if (v4part === "0.0.0.0") v4part = "";
      if (v4part === "0.0.0.1") v4part = "1";
      str += v4part;
      return str
    }
  }
  for (word = 0; word < 8; word++) {
    if (parts[word] === 0) {
      if (word - lastzero > 1) {len = 0}
      lastzero = word;
      len++
    }
    if (len > longest) {
      longest = len;
      zstart = word - longest + 1
    }
  }
  for (word = 0; word < 8; word++) {
    if (longest > 1) {
      if (parts[word] === 0 && word >= zstart && word < zstart + longest) {
        if (word === zstart) {
          str += ":";
          if (zstart === 0) str += ":"
        }
        continue
      }
    }
    str += Number(_ntohs(parts[word] & 65535)).toString(16);
    str += word < 7 ? ":" : ""
  }
  return str
}

function __read_sockaddr (sa, salen) {
  var family = HEAP16[sa >> 1];
  var port = _ntohs(HEAPU16[sa + 2 >> 1]);
  var addr;
  switch (family) {
    case 2:
      if (salen !== 16) {return {errno: 22}}
      addr = HEAP32[sa + 4 >> 2];
      addr = __inet_ntop4_raw(addr);
      break;
    case 10:
      if (salen !== 28) {return {errno: 22}}
      addr = [HEAP32[sa + 8 >> 2], HEAP32[sa + 12 >> 2], HEAP32[sa + 16 >> 2], HEAP32[sa + 20 >> 2]];
      addr = __inet_ntop6_raw(addr);
      break;
    default:
      return {errno: 97}
  }
  return {family: family, addr: addr, port: port}
}

function __write_sockaddr (sa, family, addr, port) {
  switch (family) {
    case 2:
      addr = __inet_pton4_raw(addr);
      HEAP16[sa >> 1] = family;
      HEAP32[sa + 4 >> 2] = addr;
      HEAP16[sa + 2 >> 1] = _htons(port);
      break;
    case 10:
      addr = __inet_pton6_raw(addr);
      HEAP32[sa >> 2] = family;
      HEAP32[sa + 8 >> 2] = addr[0];
      HEAP32[sa + 12 >> 2] = addr[1];
      HEAP32[sa + 16 >> 2] = addr[2];
      HEAP32[sa + 20 >> 2] = addr[3];
      HEAP16[sa + 2 >> 1] = _htons(port);
      HEAP32[sa + 4 >> 2] = 0;
      HEAP32[sa + 24 >> 2] = 0;
      break;
    default:
      return {errno: 97}
  }
  return {}
}

var SYSCALLS = {
  DEFAULT_POLLMASK: 5, mappings: {}, umask: 511, calculateAt: function(dirfd, path) {
    if (path[0] !== "/") {
      var dir;
      if (dirfd === -100) {dir = FS.cwd()} else {
        var dirstream = FS.getStream(dirfd);
        if (!dirstream) throw new FS.ErrnoError(9);
        dir = dirstream.path
      }
      path = PATH.join2(dir, path)
    }
    return path
  }, doStat: function(func, path, buf) {
    try {var stat = func(path)} catch (e) {
      if (e && e.node && PATH.normalize(path) !== PATH.normalize(FS.getPath(e.node))) {return -20}
      throw e
    }
    HEAP32[buf >> 2] = stat.dev;
    HEAP32[buf + 4 >> 2] = 0;
    HEAP32[buf + 8 >> 2] = stat.ino;
    HEAP32[buf + 12 >> 2] = stat.mode;
    HEAP32[buf + 16 >> 2] = stat.nlink;
    HEAP32[buf + 20 >> 2] = stat.uid;
    HEAP32[buf + 24 >> 2] = stat.gid;
    HEAP32[buf + 28 >> 2] = stat.rdev;
    HEAP32[buf + 32 >> 2] = 0;
    tempI64 = [stat.size >>> 0, (tempDouble = stat.size, +Math_abs(tempDouble) >= 1 ? tempDouble > 0 ? (Math_min(+Math_floor(tempDouble / 4294967296), 4294967295) | 0) >>> 0 : ~~+Math_ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0 : 0)], HEAP32[buf + 40 >> 2] = tempI64[0], HEAP32[buf + 44 >> 2] = tempI64[1];
    HEAP32[buf + 48 >> 2] = 4096;
    HEAP32[buf + 52 >> 2] = stat.blocks;
    HEAP32[buf + 56 >> 2] = stat.atime.getTime() / 1e3 | 0;
    HEAP32[buf + 60 >> 2] = 0;
    HEAP32[buf + 64 >> 2] = stat.mtime.getTime() / 1e3 | 0;
    HEAP32[buf + 68 >> 2] = 0;
    HEAP32[buf + 72 >> 2] = stat.ctime.getTime() / 1e3 | 0;
    HEAP32[buf + 76 >> 2] = 0;
    tempI64 = [stat.ino >>> 0, (tempDouble = stat.ino, +Math_abs(tempDouble) >= 1 ? tempDouble > 0 ? (Math_min(+Math_floor(tempDouble / 4294967296), 4294967295) | 0) >>> 0 : ~~+Math_ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0 : 0)], HEAP32[buf + 80 >> 2] = tempI64[0], HEAP32[buf + 84 >> 2] = tempI64[1];
    return 0
  }, doMsync: function(addr, stream, len, flags) {
    var buffer = new Uint8Array(HEAPU8.subarray(addr, addr + len));
    FS.msync(stream, buffer, 0, len, flags)
  }, doMkdir: function(path, mode) {
    path = PATH.normalize(path);
    if (path[path.length - 1] === "/") path = path.substr(0, path.length - 1);
    FS.mkdir(path, mode, 0);
    return 0
  }, doMknod: function(path, mode, dev) {
    switch (mode & 61440) {
      case 32768:
      case 8192:
      case 24576:
      case 4096:
      case 49152:
        break;
      default:
        return -22
    }
    FS.mknod(path, mode, dev);
    return 0
  }, doReadlink: function(path, buf, bufsize) {
    if (bufsize <= 0) return -22;
    var ret = FS.readlink(path);
    var len = Math.min(bufsize, lengthBytesUTF8(ret));
    var endChar = HEAP8[buf + len];
    stringToUTF8(ret, buf, bufsize + 1);
    HEAP8[buf + len] = endChar;
    return len
  }, doAccess: function(path, amode) {
    if (amode & ~7) {return -22}
    var node;
    var lookup = FS.lookupPath(path, {follow: true});
    node = lookup.node;
    if (!node) {return -2}
    var perms = "";
    if (amode & 4) perms += "r";
    if (amode & 2) perms += "w";
    if (amode & 1) perms += "x";
    if (perms && FS.nodePermissions(node, perms)) {return -13}
    return 0
  }, doDup: function(path, flags, suggestFD) {
    var suggest = FS.getStream(suggestFD);
    if (suggest) FS.close(suggest);
    return FS.open(path, flags, 0, suggestFD, suggestFD).fd
  }, doReadv: function(stream, iov, iovcnt, offset) {
    var ret = 0;
    for (var i = 0; i < iovcnt; i++) {
      var ptr = HEAP32[iov + i * 8 >> 2];
      var len = HEAP32[iov + (i * 8 + 4) >> 2];
      var curr = FS.read(stream, HEAP8, ptr, len, offset);
      if (curr < 0) return -1;
      ret += curr;
      if (curr < len) break
    }
    return ret
  }, doWritev: function(stream, iov, iovcnt, offset) {
    var ret = 0;
    for (var i = 0; i < iovcnt; i++) {
      var ptr = HEAP32[iov + i * 8 >> 2];
      var len = HEAP32[iov + (i * 8 + 4) >> 2];
      var curr = FS.write(stream, HEAP8, ptr, len, offset);
      if (curr < 0) return -1;
      ret += curr
    }
    return ret
  }, varargs: 0, get: function(varargs) {
    SYSCALLS.varargs += 4;
    var ret = HEAP32[SYSCALLS.varargs - 4 >> 2];
    return ret
  }, getStr: function() {
    var ret = UTF8ToString(SYSCALLS.get());
    return ret
  }, getStreamFromFD: function() {
    var stream = FS.getStream(SYSCALLS.get());
    if (!stream) throw new FS.ErrnoError(9);
    return stream
  }, get64: function() {
    var low = SYSCALLS.get(), high = SYSCALLS.get();
    return low
  }, getZero: function() {SYSCALLS.get()}
};

function ___syscall102 (which, varargs) {
  SYSCALLS.varargs = varargs;
  try {
    var call = SYSCALLS.get(), socketvararg = SYSCALLS.get();
    SYSCALLS.varargs = socketvararg;
    var getSocketFromFD = function() {
      var socket = SOCKFS.getSocket(SYSCALLS.get());
      if (!socket) throw new FS.ErrnoError(9);
      return socket
    };
    var getSocketAddress = function(allowNull) {
      var addrp = SYSCALLS.get(), addrlen = SYSCALLS.get();
      if (allowNull && addrp === 0) return null;
      var info = __read_sockaddr(addrp, addrlen);
      if (info.errno) throw new FS.ErrnoError(info.errno);
      info.addr = DNS.lookup_addr(info.addr) || info.addr;
      return info
    };
    switch (call) {
      case 1: {
        var domain = SYSCALLS.get(), type = SYSCALLS.get(), protocol = SYSCALLS.get();
        var sock = SOCKFS.createSocket(domain, type, protocol);
        return sock.stream.fd
      }
      case 2: {
        var sock = getSocketFromFD(), info = getSocketAddress();
        sock.sock_ops.bind(sock, info.addr, info.port);
        return 0
      }
      case 3: {
        var sock = getSocketFromFD(), info = getSocketAddress();
        sock.sock_ops.connect(sock, info.addr, info.port);
        return 0
      }
      case 4: {
        var sock = getSocketFromFD(), backlog = SYSCALLS.get();
        sock.sock_ops.listen(sock, backlog);
        return 0
      }
      case 5: {
        var sock = getSocketFromFD(), addr = SYSCALLS.get(), addrlen = SYSCALLS.get();
        var newsock = sock.sock_ops.accept(sock);
        if (addr) {var res = __write_sockaddr(addr, newsock.family, DNS.lookup_name(newsock.daddr), newsock.dport)}
        return newsock.stream.fd
      }
      case 6: {
        var sock = getSocketFromFD(), addr = SYSCALLS.get(), addrlen = SYSCALLS.get();
        var res = __write_sockaddr(addr, sock.family, DNS.lookup_name(sock.saddr || "0.0.0.0"), sock.sport);
        return 0
      }
      case 7: {
        var sock = getSocketFromFD(), addr = SYSCALLS.get(), addrlen = SYSCALLS.get();
        if (!sock.daddr) {return -107}
        var res = __write_sockaddr(addr, sock.family, DNS.lookup_name(sock.daddr), sock.dport);
        return 0
      }
      case 11: {
        var sock = getSocketFromFD(), message = SYSCALLS.get(), length = SYSCALLS.get(), flags = SYSCALLS.get(),
          dest = getSocketAddress(true);
        if (!dest) {return FS.write(sock.stream, HEAP8, message, length)} else {return sock.sock_ops.sendmsg(sock, HEAP8, message, length, dest.addr, dest.port)}
      }
      case 12: {
        var sock = getSocketFromFD(), buf = SYSCALLS.get(), len = SYSCALLS.get(), flags = SYSCALLS.get(),
          addr = SYSCALLS.get(), addrlen = SYSCALLS.get();
        var msg = sock.sock_ops.recvmsg(sock, len);
        if (!msg) return 0;
        if (addr) {var res = __write_sockaddr(addr, sock.family, DNS.lookup_name(msg.addr), msg.port)}
        HEAPU8.set(msg.buffer, buf);
        return msg.buffer.byteLength
      }
      case 14: {return -92}
      case 15: {
        var sock = getSocketFromFD(), level = SYSCALLS.get(), optname = SYSCALLS.get(), optval = SYSCALLS.get(),
          optlen = SYSCALLS.get();
        if (level === 1) {
          if (optname === 4) {
            HEAP32[optval >> 2] = sock.error;
            HEAP32[optlen >> 2] = 4;
            sock.error = null;
            return 0
          }
        }
        return -92
      }
      case 16: {
        var sock = getSocketFromFD(), message = SYSCALLS.get(), flags = SYSCALLS.get();
        var iov = HEAP32[message + 8 >> 2];
        var num = HEAP32[message + 12 >> 2];
        var addr, port;
        var name = HEAP32[message >> 2];
        var namelen = HEAP32[message + 4 >> 2];
        if (name) {
          var info = __read_sockaddr(name, namelen);
          if (info.errno) return -info.errno;
          port = info.port;
          addr = DNS.lookup_addr(info.addr) || info.addr
        }
        var total = 0;
        for (var i = 0; i < num; i++) {total += HEAP32[iov + (8 * i + 4) >> 2]}
        var view = new Uint8Array(total);
        var offset = 0;
        for (var i = 0; i < num; i++) {
          var iovbase = HEAP32[iov + (8 * i + 0) >> 2];
          var iovlen = HEAP32[iov + (8 * i + 4) >> 2];
          for (var j = 0; j < iovlen; j++) {view[offset++] = HEAP8[iovbase + j >> 0]}
        }
        return sock.sock_ops.sendmsg(sock, view, 0, total, addr, port)
      }
      case 17: {
        var sock = getSocketFromFD(), message = SYSCALLS.get(), flags = SYSCALLS.get();
        var iov = HEAP32[message + 8 >> 2];
        var num = HEAP32[message + 12 >> 2];
        var total = 0;
        for (var i = 0; i < num; i++) {total += HEAP32[iov + (8 * i + 4) >> 2]}
        var msg = sock.sock_ops.recvmsg(sock, total);
        if (!msg) return 0;
        var name = HEAP32[message >> 2];
        if (name) {var res = __write_sockaddr(name, sock.family, DNS.lookup_name(msg.addr), msg.port)}
        var bytesRead = 0;
        var bytesRemaining = msg.buffer.byteLength;
        for (var i = 0; bytesRemaining > 0 && i < num; i++) {
          var iovbase = HEAP32[iov + (8 * i + 0) >> 2];
          var iovlen = HEAP32[iov + (8 * i + 4) >> 2];
          if (!iovlen) {continue}
          var length = Math.min(iovlen, bytesRemaining);
          var buf = msg.buffer.subarray(bytesRead, bytesRead + length);
          HEAPU8.set(buf, iovbase + bytesRead);
          bytesRead += length;
          bytesRemaining -= length
        }
        return bytesRead
      }
      default:
        abort("unsupported socketcall syscall " + call)
    }
  } catch (e) {
    if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno
  }
}

function ___syscall140 (which, varargs) {
  SYSCALLS.varargs = varargs;
  try {
    var stream = SYSCALLS.getStreamFromFD(), offset_high = SYSCALLS.get(), offset_low = SYSCALLS.get(),
      result = SYSCALLS.get(), whence = SYSCALLS.get();
    var HIGH_OFFSET = 4294967296;
    var offset = offset_high * HIGH_OFFSET + (offset_low >>> 0);
    var DOUBLE_LIMIT = 9007199254740992;
    if (offset <= -DOUBLE_LIMIT || offset >= DOUBLE_LIMIT) {return -75}
    FS.llseek(stream, offset, whence);
    tempI64 = [stream.position >>> 0, (tempDouble = stream.position, +Math_abs(tempDouble) >= 1 ? tempDouble > 0 ? (Math_min(+Math_floor(tempDouble / 4294967296), 4294967295) | 0) >>> 0 : ~~+Math_ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0 : 0)], HEAP32[result >> 2] = tempI64[0], HEAP32[result + 4 >> 2] = tempI64[1];
    if (stream.getdents && offset === 0 && whence === 0) stream.getdents = null;
    return 0
  } catch (e) {
    if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno
  }
}

function ___syscall142 (which, varargs) {
  SYSCALLS.varargs = varargs;
  try {
    var nfds = SYSCALLS.get(), readfds = SYSCALLS.get(), writefds = SYSCALLS.get(), exceptfds = SYSCALLS.get(),
      timeout = SYSCALLS.get();
    var total = 0;
    var srcReadLow = readfds ? HEAP32[readfds >> 2] : 0, srcReadHigh = readfds ? HEAP32[readfds + 4 >> 2] : 0;
    var srcWriteLow = writefds ? HEAP32[writefds >> 2] : 0, srcWriteHigh = writefds ? HEAP32[writefds + 4 >> 2] : 0;
    var srcExceptLow = exceptfds ? HEAP32[exceptfds >> 2] : 0,
      srcExceptHigh = exceptfds ? HEAP32[exceptfds + 4 >> 2] : 0;
    var dstReadLow = 0, dstReadHigh = 0;
    var dstWriteLow = 0, dstWriteHigh = 0;
    var dstExceptLow = 0, dstExceptHigh = 0;
    var allLow = (readfds ? HEAP32[readfds >> 2] : 0) | (writefds ? HEAP32[writefds >> 2] : 0) | (exceptfds ? HEAP32[exceptfds >> 2] : 0);
    var allHigh = (readfds ? HEAP32[readfds + 4 >> 2] : 0) | (writefds ? HEAP32[writefds + 4 >> 2] : 0) | (exceptfds ? HEAP32[exceptfds + 4 >> 2] : 0);
    var check = function(fd, low, high, val) {return fd < 32 ? low & val : high & val};
    for (var fd = 0; fd < nfds; fd++) {
      var mask = 1 << fd % 32;
      if (!check(fd, allLow, allHigh, mask)) {continue}
      var stream = FS.getStream(fd);
      if (!stream) throw new FS.ErrnoError(9);
      var flags = SYSCALLS.DEFAULT_POLLMASK;
      if (stream.stream_ops.poll) {flags = stream.stream_ops.poll(stream)}
      if (flags & 1 && check(fd, srcReadLow, srcReadHigh, mask)) {
        fd < 32 ? dstReadLow = dstReadLow | mask : dstReadHigh = dstReadHigh | mask;
        total++
      }
      if (flags & 4 && check(fd, srcWriteLow, srcWriteHigh, mask)) {
        fd < 32 ? dstWriteLow = dstWriteLow | mask : dstWriteHigh = dstWriteHigh | mask;
        total++
      }
      if (flags & 2 && check(fd, srcExceptLow, srcExceptHigh, mask)) {
        fd < 32 ? dstExceptLow = dstExceptLow | mask : dstExceptHigh = dstExceptHigh | mask;
        total++
      }
    }
    if (readfds) {
      HEAP32[readfds >> 2] = dstReadLow;
      HEAP32[readfds + 4 >> 2] = dstReadHigh
    }
    if (writefds) {
      HEAP32[writefds >> 2] = dstWriteLow;
      HEAP32[writefds + 4 >> 2] = dstWriteHigh
    }
    if (exceptfds) {
      HEAP32[exceptfds >> 2] = dstExceptLow;
      HEAP32[exceptfds + 4 >> 2] = dstExceptHigh
    }
    return total
  } catch (e) {
    if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno
  }
}

function ___syscall145 (which, varargs) {
  SYSCALLS.varargs = varargs;
  try {
    var stream = SYSCALLS.getStreamFromFD(), iov = SYSCALLS.get(), iovcnt = SYSCALLS.get();
    return SYSCALLS.doReadv(stream, iov, iovcnt)
  } catch (e) {
    if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno
  }
}

function ___syscall146 (which, varargs) {
  SYSCALLS.varargs = varargs;
  try {
    var stream = SYSCALLS.getStreamFromFD(), iov = SYSCALLS.get(), iovcnt = SYSCALLS.get();
    return SYSCALLS.doWritev(stream, iov, iovcnt)
  } catch (e) {
    if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno
  }
}

function ___syscall183 (which, varargs) {
  SYSCALLS.varargs = varargs;
  try {
    var buf = SYSCALLS.get(), size = SYSCALLS.get();
    if (size === 0) return -22;
    var cwd = FS.cwd();
    var cwdLengthInBytes = lengthBytesUTF8(cwd);
    if (size < cwdLengthInBytes + 1) return -34;
    stringToUTF8(cwd, buf, size);
    return buf
  } catch (e) {
    if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno
  }
}

function ___syscall221 (which, varargs) {
  SYSCALLS.varargs = varargs;
  try {
    var stream = SYSCALLS.getStreamFromFD(), cmd = SYSCALLS.get();
    switch (cmd) {
      case 0: {
        var arg = SYSCALLS.get();
        if (arg < 0) {return -22}
        var newStream;
        newStream = FS.open(stream.path, stream.flags, 0, arg);
        return newStream.fd
      }
      case 1:
      case 2:
        return 0;
      case 3:
        return stream.flags;
      case 4: {
        var arg = SYSCALLS.get();
        stream.flags |= arg;
        return 0
      }
      case 12: {
        var arg = SYSCALLS.get();
        var offset = 0;
        HEAP16[arg + offset >> 1] = 2;
        return 0
      }
      case 13:
      case 14:
        return 0;
      case 16:
      case 8:
        return -22;
      case 9:
        ___setErrNo(22);
        return -1;
      default: {return -22}
    }
  } catch (e) {
    if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno
  }
}

function ___syscall3 (which, varargs) {
  SYSCALLS.varargs = varargs;
  try {
    var stream = SYSCALLS.getStreamFromFD(), buf = SYSCALLS.get(), count = SYSCALLS.get();
    return FS.read(stream, HEAP8, buf, count)
  } catch (e) {
    if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno
  }
}

function ___syscall33 (which, varargs) {
  SYSCALLS.varargs = varargs;
  try {
    var path = SYSCALLS.getStr(), amode = SYSCALLS.get();
    return SYSCALLS.doAccess(path, amode)
  } catch (e) {
    if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno
  }
}

function ___syscall4 (which, varargs) {
  SYSCALLS.varargs = varargs;
  try {
    var stream = SYSCALLS.getStreamFromFD(), buf = SYSCALLS.get(), count = SYSCALLS.get();
    return FS.write(stream, HEAP8, buf, count)
  } catch (e) {
    if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno
  }
}

function ___syscall5 (which, varargs) {
  SYSCALLS.varargs = varargs;
  try {
    var pathname = SYSCALLS.getStr(), flags = SYSCALLS.get(), mode = SYSCALLS.get();
    var stream = FS.open(pathname, flags, mode);
    return stream.fd
  } catch (e) {
    if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno
  }
}

function ___syscall54 (which, varargs) {
  SYSCALLS.varargs = varargs;
  try {
    var stream = SYSCALLS.getStreamFromFD(), op = SYSCALLS.get();
    switch (op) {
      case 21509:
      case 21505: {
        if (!stream.tty) return -25;
        return 0
      }
      case 21510:
      case 21511:
      case 21512:
      case 21506:
      case 21507:
      case 21508: {
        if (!stream.tty) return -25;
        return 0
      }
      case 21519: {
        if (!stream.tty) return -25;
        var argp = SYSCALLS.get();
        HEAP32[argp >> 2] = 0;
        return 0
      }
      case 21520: {
        if (!stream.tty) return -25;
        return -22
      }
      case 21531: {
        var argp = SYSCALLS.get();
        return FS.ioctl(stream, op, argp)
      }
      case 21523: {
        if (!stream.tty) return -25;
        return 0
      }
      case 21524: {
        if (!stream.tty) return -25;
        return 0
      }
      default:
        abort("bad ioctl syscall " + op)
    }
  } catch (e) {
    if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno
  }
}

function ___syscall6 (which, varargs) {
  SYSCALLS.varargs = varargs;
  try {
    var stream = SYSCALLS.getStreamFromFD();
    FS.close(stream);
    return 0
  } catch (e) {
    if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno
  }
}

function __emscripten_syscall_munmap (addr, len) {
  if (addr === -1 || len === 0) {return -22}
  var info = SYSCALLS.mappings[addr];
  if (!info) return 0;
  if (len === info.len) {
    var stream = FS.getStream(info.fd);
    SYSCALLS.doMsync(addr, stream, len, info.flags);
    FS.munmap(stream);
    SYSCALLS.mappings[addr] = null;
    if (info.allocated) {_free(info.malloc)}
  }
  return 0
}

function ___syscall91 (which, varargs) {
  SYSCALLS.varargs = varargs;
  try {
    var addr = SYSCALLS.get(), len = SYSCALLS.get();
    return __emscripten_syscall_munmap(addr, len)
  } catch (e) {
    if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno
  }
}

function ___unlock () {}

function _abort () {Module["abort"]()}

function _emscripten_get_now_is_monotonic () {return 0 || ENVIRONMENT_IS_NODE || typeof dateNow !== "undefined" || typeof performance === "object" && performance && typeof performance["now"] === "function"}

function _clock_gettime (clk_id, tp) {
  var now;
  if (clk_id === 0) {now = Date.now()} else if (clk_id === 1 && _emscripten_get_now_is_monotonic()) {now = _emscripten_get_now()} else {
    ___setErrNo(22);
    return -1
  }
  HEAP32[tp >> 2] = now / 1e3 | 0;
  HEAP32[tp + 4 >> 2] = now % 1e3 * 1e3 * 1e3 | 0;
  return 0
}

function _emscripten_async_wget_data (url, arg, onload, onerror) {
  Browser.asyncLoad(UTF8ToString(url), function(byteArray) {
    var buffer = _malloc(byteArray.length);
    HEAPU8.set(byteArray, buffer);
    dynCall_viii(onload, arg, buffer, byteArray.length);
    _free(buffer)
  }, function() {if (onerror) dynCall_vi(onerror, arg)}, true)
}

function _emscripten_get_heap_size () {return HEAP8.length}

var setjmpId = 0;

function _saveSetjmp (env, label, table, size) {
  env = env | 0;
  label = label | 0;
  table = table | 0;
  size = size | 0;
  var i = 0;
  setjmpId = setjmpId + 1 | 0;
  HEAP32[env >> 2] = setjmpId;
  while ((i | 0) < (size | 0)) {
    if ((HEAP32[table + (i << 3) >> 2] | 0) == 0) {
      HEAP32[table + (i << 3) >> 2] = setjmpId;
      HEAP32[table + ((i << 3) + 4) >> 2] = label;
      HEAP32[table + ((i << 3) + 8) >> 2] = 0;
      setTempRet0(size | 0);
      return table | 0
    }
    i = i + 1 | 0
  }
  size = size * 2 | 0;
  table = _realloc(table | 0, 8 * (size + 1 | 0) | 0) | 0;
  table = _saveSetjmp(env | 0, label | 0, table | 0, size | 0) | 0;
  setTempRet0(size | 0);
  return table | 0
}

function _testSetjmp (id, table, size) {
  id = id | 0;
  table = table | 0;
  size = size | 0;
  var i = 0, curr = 0;
  while ((i | 0) < (size | 0)) {
    curr = HEAP32[table + (i << 3) >> 2] | 0;
    if ((curr | 0) == 0) break;
    if ((curr | 0) == (id | 0)) {return HEAP32[table + ((i << 3) + 4) >> 2] | 0}
    i = i + 1 | 0
  }
  return 0
}

function _longjmp (env, value) {
  _setThrew(env, value || 1);
  throw"longjmp"
}

function _emscripten_longjmp (env, value) {_longjmp(env, value)}

function _emscripten_memcpy_big (dest, src, num) {HEAPU8.set(HEAPU8.subarray(src, src + num), dest)}

function _exit (status) {exit(status)}

function _getTempRet0 () {return getTempRet0() | 0}

function _getaddrinfo (node, service, hint, out) {
  var addr = 0;
  var port = 0;
  var flags = 0;
  var family = 0;
  var type = 0;
  var proto = 0;
  var ai;

  function allocaddrinfo (family, type, proto, canon, addr, port) {
    var sa, salen, ai;
    var res;
    salen = family === 10 ? 28 : 16;
    addr = family === 10 ? __inet_ntop6_raw(addr) : __inet_ntop4_raw(addr);
    sa = _malloc(salen);
    res = __write_sockaddr(sa, family, addr, port);
    assert(!res.errno);
    ai = _malloc(32);
    HEAP32[ai + 4 >> 2] = family;
    HEAP32[ai + 8 >> 2] = type;
    HEAP32[ai + 12 >> 2] = proto;
    HEAP32[ai + 24 >> 2] = canon;
    HEAP32[ai + 20 >> 2] = sa;
    if (family === 10) {HEAP32[ai + 16 >> 2] = 28} else {HEAP32[ai + 16 >> 2] = 16}
    HEAP32[ai + 28 >> 2] = 0;
    return ai
  }

  if (hint) {
    flags = HEAP32[hint >> 2];
    family = HEAP32[hint + 4 >> 2];
    type = HEAP32[hint + 8 >> 2];
    proto = HEAP32[hint + 12 >> 2]
  }
  if (type && !proto) {proto = type === 2 ? 17 : 6}
  if (!type && proto) {type = proto === 17 ? 2 : 1}
  if (proto === 0) {proto = 6}
  if (type === 0) {type = 1}
  if (!node && !service) {return -2}
  if (flags & ~(1 | 2 | 4 | 1024 | 8 | 16 | 32)) {return -1}
  if (hint !== 0 && HEAP32[hint >> 2] & 2 && !node) {return -1}
  if (flags & 32) {return -2}
  if (type !== 0 && type !== 1 && type !== 2) {return -7}
  if (family !== 0 && family !== 2 && family !== 10) {return -6}
  if (service) {
    service = UTF8ToString(service);
    port = parseInt(service, 10);
    if (isNaN(port)) {
      if (flags & 1024) {return -2}
      return -8
    }
  }
  if (!node) {
    if (family === 0) {family = 2}
    if ((flags & 1) === 0) {if (family === 2) {addr = _htonl(2130706433)} else {addr = [0, 0, 0, 1]}}
    ai = allocaddrinfo(family, type, proto, null, addr, port);
    HEAP32[out >> 2] = ai;
    return 0
  }
  node = UTF8ToString(node);
  addr = __inet_pton4_raw(node);
  if (addr !== null) {
    if (family === 0 || family === 2) {family = 2} else if (family === 10 && flags & 8) {
      addr = [0, 0, _htonl(65535), addr];
      family = 10
    } else {return -2}
  } else {
    addr = __inet_pton6_raw(node);
    if (addr !== null) {if (family === 0 || family === 10) {family = 10} else {return -2}}
  }
  if (addr != null) {
    ai = allocaddrinfo(family, type, proto, node, addr, port);
    HEAP32[out >> 2] = ai;
    return 0
  }
  if (flags & 4) {return -2}
  node = DNS.lookup_name(node);
  addr = __inet_pton4_raw(node);
  if (family === 0) {family = 2} else if (family === 10) {addr = [0, 0, _htonl(65535), addr]}
  ai = allocaddrinfo(family, type, proto, null, addr, port);
  HEAP32[out >> 2] = ai;
  return 0
}

function _getenv (name) {
  if (name === 0) return 0;
  name = UTF8ToString(name);
  if (!ENV.hasOwnProperty(name)) return 0;
  if (_getenv.ret) _free(_getenv.ret);
  _getenv.ret = allocateUTF8(ENV[name]);
  return _getenv.ret
}

function _gettimeofday (ptr) {
  var now = Date.now();
  HEAP32[ptr >> 2] = now / 1e3 | 0;
  HEAP32[ptr + 4 >> 2] = now % 1e3 * 1e3 | 0;
  return 0
}

var GL = {
  counter: 1,
  lastError: 0,
  buffers: [],
  mappedBuffers: {},
  programs: [],
  framebuffers: [],
  renderbuffers: [],
  textures: [],
  uniforms: [],
  shaders: [],
  vaos: [],
  contexts: {},
  currentContext: null,
  offscreenCanvases: {},
  timerQueriesEXT: [],
  programInfos: {},
  stringCache: {},
  unpackAlignment: 4,
  init: function() {
    GL.miniTempBuffer = new Float32Array(GL.MINI_TEMP_BUFFER_SIZE);
    for (var i = 0; i < GL.MINI_TEMP_BUFFER_SIZE; i++) {GL.miniTempBufferViews[i] = GL.miniTempBuffer.subarray(0, i + 1)}
  },
  recordError: function recordError (errorCode) {if (!GL.lastError) {GL.lastError = errorCode}},
  getNewId: function(table) {
    var ret = GL.counter++;
    for (var i = table.length; i < ret; i++) {table[i] = null}
    return ret
  },
  MINI_TEMP_BUFFER_SIZE: 256,
  miniTempBuffer: null,
  miniTempBufferViews: [0],
  getSource: function(shader, count, string, length) {
    var source = "";
    for (var i = 0; i < count; ++i) {
      var len = length ? HEAP32[length + i * 4 >> 2] : -1;
      source += UTF8ToString(HEAP32[string + i * 4 >> 2], len < 0 ? undefined : len)
    }
    return source
  },
  createContext: function(canvas, webGLContextAttributes) {
    var ctx = canvas.getContext("webgl", webGLContextAttributes) || canvas.getContext("experimental-webgl", webGLContextAttributes);
    return ctx ? GL.registerContext(ctx, webGLContextAttributes) : 0
  },
  registerContext: function(ctx, webGLContextAttributes) {
    var handle = _malloc(8);
    var context = {
      handle: handle,
      attributes: webGLContextAttributes,
      version: webGLContextAttributes.majorVersion,
      GLctx: ctx
    };
    if (ctx.canvas) ctx.canvas.GLctxObject = context;
    GL.contexts[handle] = context;
    if (typeof webGLContextAttributes.enableExtensionsByDefault === "undefined" || webGLContextAttributes.enableExtensionsByDefault) {GL.initExtensions(context)}
    return handle
  },
  makeContextCurrent: function(contextHandle) {
    GL.currentContext = GL.contexts[contextHandle];
    Module.ctx = GLctx = GL.currentContext && GL.currentContext.GLctx;
    return !(contextHandle && !GLctx)
  },
  getContext: function(contextHandle) {return GL.contexts[contextHandle]},
  deleteContext: function(contextHandle) {
    if (GL.currentContext === GL.contexts[contextHandle]) GL.currentContext = null;
    if (typeof JSEvents === "object") JSEvents.removeAllHandlersOnTarget(GL.contexts[contextHandle].GLctx.canvas);
    if (GL.contexts[contextHandle] && GL.contexts[contextHandle].GLctx.canvas) GL.contexts[contextHandle].GLctx.canvas.GLctxObject = undefined;
    _free(GL.contexts[contextHandle]);
    GL.contexts[contextHandle] = null
  },
  acquireInstancedArraysExtension: function(ctx) {
    var ext = ctx.getExtension("ANGLE_instanced_arrays");
    if (ext) {
      ctx["vertexAttribDivisor"] = function(index, divisor) {ext["vertexAttribDivisorANGLE"](index, divisor)};
      ctx["drawArraysInstanced"] = function(mode, first, count, primcount) {ext["drawArraysInstancedANGLE"](mode, first, count, primcount)};
      ctx["drawElementsInstanced"] = function(mode, count, type, indices, primcount) {ext["drawElementsInstancedANGLE"](mode, count, type, indices, primcount)}
    }
  },
  acquireVertexArrayObjectExtension: function(ctx) {
    var ext = ctx.getExtension("OES_vertex_array_object");
    if (ext) {
      ctx["createVertexArray"] = function() {return ext["createVertexArrayOES"]()};
      ctx["deleteVertexArray"] = function(vao) {ext["deleteVertexArrayOES"](vao)};
      ctx["bindVertexArray"] = function(vao) {ext["bindVertexArrayOES"](vao)};
      ctx["isVertexArray"] = function(vao) {return ext["isVertexArrayOES"](vao)}
    }
  },
  acquireDrawBuffersExtension: function(ctx) {
    var ext = ctx.getExtension("WEBGL_draw_buffers");
    if (ext) {ctx["drawBuffers"] = function(n, bufs) {ext["drawBuffersWEBGL"](n, bufs)}}
  },
  initExtensions: function(context) {
    if (!context) context = GL.currentContext;
    if (context.initExtensionsDone) return;
    context.initExtensionsDone = true;
    var GLctx = context.GLctx;
    if (context.version < 2) {
      GL.acquireInstancedArraysExtension(GLctx);
      GL.acquireVertexArrayObjectExtension(GLctx);
      GL.acquireDrawBuffersExtension(GLctx)
    }
    GLctx.disjointTimerQueryExt = GLctx.getExtension("EXT_disjoint_timer_query");
    var automaticallyEnabledExtensions = ["OES_texture_float", "OES_texture_half_float", "OES_standard_derivatives", "OES_vertex_array_object", "WEBGL_compressed_texture_s3tc", "WEBGL_depth_texture", "OES_element_index_uint", "EXT_texture_filter_anisotropic", "EXT_frag_depth", "WEBGL_draw_buffers", "ANGLE_instanced_arrays", "OES_texture_float_linear", "OES_texture_half_float_linear", "EXT_blend_minmax", "EXT_shader_texture_lod", "WEBGL_compressed_texture_pvrtc", "EXT_color_buffer_half_float", "WEBGL_color_buffer_float", "EXT_sRGB", "WEBGL_compressed_texture_etc1", "EXT_disjoint_timer_query", "WEBGL_compressed_texture_etc", "WEBGL_compressed_texture_astc", "EXT_color_buffer_float", "WEBGL_compressed_texture_s3tc_srgb", "EXT_disjoint_timer_query_webgl2"];
    var exts = GLctx.getSupportedExtensions() || [];
    exts.forEach(function(ext) {if (automaticallyEnabledExtensions.indexOf(ext) != -1) {GLctx.getExtension(ext)}})
  },
  populateUniformTable: function(program) {
    var p = GL.programs[program];
    var ptable = GL.programInfos[program] = {
      uniforms: {},
      maxUniformLength: 0,
      maxAttributeLength: -1,
      maxUniformBlockNameLength: -1
    };
    var utable = ptable.uniforms;
    var numUniforms = GLctx.getProgramParameter(p, 35718);
    for (var i = 0; i < numUniforms; ++i) {
      var u = GLctx.getActiveUniform(p, i);
      var name = u.name;
      ptable.maxUniformLength = Math.max(ptable.maxUniformLength, name.length + 1);
      if (name.slice(-1) == "]") {name = name.slice(0, name.lastIndexOf("["))}
      var loc = GLctx.getUniformLocation(p, name);
      if (loc) {
        var id = GL.getNewId(GL.uniforms);
        utable[name] = [u.size, id];
        GL.uniforms[id] = loc;
        for (var j = 1; j < u.size; ++j) {
          var n = name + "[" + j + "]";
          loc = GLctx.getUniformLocation(p, n);
          id = GL.getNewId(GL.uniforms);
          GL.uniforms[id] = loc
        }
      }
    }
  }
};

function _glAttachShader (program, shader) {GLctx.attachShader(GL.programs[program], GL.shaders[shader])}

function _glBindBuffer (target, buffer) {GLctx.bindBuffer(target, GL.buffers[buffer])}

function _glBindFramebuffer (target, framebuffer) {GLctx.bindFramebuffer(target, GL.framebuffers[framebuffer])}

function _glBindRenderbuffer (target, renderbuffer) {GLctx.bindRenderbuffer(target, GL.renderbuffers[renderbuffer])}

function _glBindTexture (target, texture) {GLctx.bindTexture(target, GL.textures[texture])}

function _glBlendFunc (x0, x1) {GLctx["blendFunc"](x0, x1)}

function _glBufferData (target, size, data, usage) {GLctx.bufferData(target, data ? HEAPU8.subarray(data, data + size) : size, usage)}

function _glCheckFramebufferStatus (x0) {return GLctx["checkFramebufferStatus"](x0)}

function _glClear (x0) {GLctx["clear"](x0)}

function _glClearColor (x0, x1, x2, x3) {GLctx["clearColor"](x0, x1, x2, x3)}

function _glColorMask (red, green, blue, alpha) {GLctx.colorMask(!!red, !!green, !!blue, !!alpha)}

function _glCompileShader (shader) {GLctx.compileShader(GL.shaders[shader])}

function _glCompressedTexImage2D (target, level, internalFormat, width, height, border, imageSize, data) {GLctx["compressedTexImage2D"](target, level, internalFormat, width, height, border, data ? HEAPU8.subarray(data, data + imageSize) : null)}

function _glCreateProgram () {
  var id = GL.getNewId(GL.programs);
  var program = GLctx.createProgram();
  program.name = id;
  GL.programs[id] = program;
  return id
}

function _glCreateShader (shaderType) {
  var id = GL.getNewId(GL.shaders);
  GL.shaders[id] = GLctx.createShader(shaderType);
  return id
}

function _glDeleteBuffers (n, buffers) {
  for (var i = 0; i < n; i++) {
    var id = HEAP32[buffers + i * 4 >> 2];
    var buffer = GL.buffers[id];
    if (!buffer) continue;
    GLctx.deleteBuffer(buffer);
    buffer.name = 0;
    GL.buffers[id] = null;
    if (id == GL.currArrayBuffer) GL.currArrayBuffer = 0;
    if (id == GL.currElementArrayBuffer) GL.currElementArrayBuffer = 0
  }
}

function _glDeleteFramebuffers (n, framebuffers) {
  for (var i = 0; i < n; ++i) {
    var id = HEAP32[framebuffers + i * 4 >> 2];
    var framebuffer = GL.framebuffers[id];
    if (!framebuffer) continue;
    GLctx.deleteFramebuffer(framebuffer);
    framebuffer.name = 0;
    GL.framebuffers[id] = null
  }
}

function _glDeleteProgram (id) {
  if (!id) return;
  var program = GL.programs[id];
  if (!program) {
    GL.recordError(1281);
    return
  }
  GLctx.deleteProgram(program);
  program.name = 0;
  GL.programs[id] = null;
  GL.programInfos[id] = null
}

function _glDeleteRenderbuffers (n, renderbuffers) {
  for (var i = 0; i < n; i++) {
    var id = HEAP32[renderbuffers + i * 4 >> 2];
    var renderbuffer = GL.renderbuffers[id];
    if (!renderbuffer) continue;
    GLctx.deleteRenderbuffer(renderbuffer);
    renderbuffer.name = 0;
    GL.renderbuffers[id] = null
  }
}

function _glDeleteShader (id) {
  if (!id) return;
  var shader = GL.shaders[id];
  if (!shader) {
    GL.recordError(1281);
    return
  }
  GLctx.deleteShader(shader);
  GL.shaders[id] = null
}

function _glDeleteTextures (n, textures) {
  for (var i = 0; i < n; i++) {
    var id = HEAP32[textures + i * 4 >> 2];
    var texture = GL.textures[id];
    if (!texture) continue;
    GLctx.deleteTexture(texture);
    texture.name = 0;
    GL.textures[id] = null
  }
}

function _glDisable (x0) {GLctx["disable"](x0)}

function _glDisableVertexAttribArray (index) {GLctx.disableVertexAttribArray(index)}

function _glDrawArrays (mode, first, count) {GLctx.drawArrays(mode, first, count)}

function _glDrawElements (mode, count, type, indices) {GLctx.drawElements(mode, count, type, indices)}

function _glEnable (x0) {GLctx["enable"](x0)}

function _glEnableVertexAttribArray (index) {GLctx.enableVertexAttribArray(index)}

function _glFinish () {GLctx["finish"]()}

function _glFlush () {GLctx["flush"]()}

function _glFramebufferRenderbuffer (target, attachment, renderbuffertarget, renderbuffer) {GLctx.framebufferRenderbuffer(target, attachment, renderbuffertarget, GL.renderbuffers[renderbuffer])}

function _glFramebufferTexture2D (target, attachment, textarget, texture, level) {GLctx.framebufferTexture2D(target, attachment, textarget, GL.textures[texture], level)}

function __glGenObject (n, buffers, createFunction, objectTable) {
  for (var i = 0; i < n; i++) {
    var buffer = GLctx[createFunction]();
    var id = buffer && GL.getNewId(objectTable);
    if (buffer) {
      buffer.name = id;
      objectTable[id] = buffer
    } else {GL.recordError(1282)}
    HEAP32[buffers + i * 4 >> 2] = id
  }
}

function _glGenBuffers (n, buffers) {__glGenObject(n, buffers, "createBuffer", GL.buffers)}

function _glGenFramebuffers (n, ids) {__glGenObject(n, ids, "createFramebuffer", GL.framebuffers)}

function _glGenRenderbuffers (n, renderbuffers) {__glGenObject(n, renderbuffers, "createRenderbuffer", GL.renderbuffers)}

function _glGenTextures (n, textures) {__glGenObject(n, textures, "createTexture", GL.textures)}

function _glGetAttribLocation (program, name) {return GLctx.getAttribLocation(GL.programs[program], UTF8ToString(name))}

function _glGetError () {
  var error = GLctx.getError() || GL.lastError;
  GL.lastError = 0;
  return error
}

function emscriptenWebGLGet (name_, p, type) {
  if (!p) {
    GL.recordError(1281);
    return
  }
  var ret = undefined;
  switch (name_) {
    case 36346:
      ret = 1;
      break;
    case 36344:
      if (type != 0 && type != 1) {GL.recordError(1280)}
      return;
    case 36345:
      ret = 0;
      break;
    case 34466:
      var formats = GLctx.getParameter(34467);
      ret = formats ? formats.length : 0;
      break
  }
  if (ret === undefined) {
    var result = GLctx.getParameter(name_);
    switch (typeof result) {
      case"number":
        ret = result;
        break;
      case"boolean":
        ret = result ? 1 : 0;
        break;
      case"string":
        GL.recordError(1280);
        return;
      case"object":
        if (result === null) {
          switch (name_) {
            case 34964:
            case 35725:
            case 34965:
            case 36006:
            case 36007:
            case 32873:
            case 34229:
            case 34068: {
              ret = 0;
              break
            }
            default: {
              GL.recordError(1280);
              return
            }
          }
        } else if (result instanceof Float32Array || result instanceof Uint32Array || result instanceof Int32Array || result instanceof Array) {
          for (var i = 0; i < result.length; ++i) {
            switch (type) {
              case 0:
                HEAP32[p + i * 4 >> 2] = result[i];
                break;
              case 2:
                HEAPF32[p + i * 4 >> 2] = result[i];
                break;
              case 4:
                HEAP8[p + i >> 0] = result[i] ? 1 : 0;
                break
            }
          }
          return
        } else {
          try {ret = result.name | 0} catch (e) {
            GL.recordError(1280);
            err("GL_INVALID_ENUM in glGet" + type + "v: Unknown object returned from WebGL getParameter(" + name_ + ")! (error: " + e + ")");
            return
          }
        }
        break;
      default:
        GL.recordError(1280);
        err("GL_INVALID_ENUM in glGet" + type + "v: Native code calling glGet" + type + "v(" + name_ + ") and it returns " + result + " of type " + typeof result + "!");
        return
    }
  }
  switch (type) {
    case 1:
      tempI64 = [ret >>> 0, (tempDouble = ret, +Math_abs(tempDouble) >= 1 ? tempDouble > 0 ? (Math_min(+Math_floor(tempDouble / 4294967296), 4294967295) | 0) >>> 0 : ~~+Math_ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0 : 0)], HEAP32[p >> 2] = tempI64[0], HEAP32[p + 4 >> 2] = tempI64[1];
      break;
    case 0:
      HEAP32[p >> 2] = ret;
      break;
    case 2:
      HEAPF32[p >> 2] = ret;
      break;
    case 4:
      HEAP8[p >> 0] = ret ? 1 : 0;
      break
  }
}

function _glGetIntegerv (name_, p) {emscriptenWebGLGet(name_, p, 0)}

function _glGetProgramInfoLog (program, maxLength, length, infoLog) {
  var log = GLctx.getProgramInfoLog(GL.programs[program]);
  if (log === null) log = "(unknown error)";
  var numBytesWrittenExclNull = maxLength > 0 && infoLog ? stringToUTF8(log, infoLog, maxLength) : 0;
  if (length) HEAP32[length >> 2] = numBytesWrittenExclNull
}

function _glGetProgramiv (program, pname, p) {
  if (!p) {
    GL.recordError(1281);
    return
  }
  if (program >= GL.counter) {
    GL.recordError(1281);
    return
  }
  var ptable = GL.programInfos[program];
  if (!ptable) {
    GL.recordError(1282);
    return
  }
  if (pname == 35716) {
    var log = GLctx.getProgramInfoLog(GL.programs[program]);
    if (log === null) log = "(unknown error)";
    HEAP32[p >> 2] = log.length + 1
  } else if (pname == 35719) {HEAP32[p >> 2] = ptable.maxUniformLength} else if (pname == 35722) {
    if (ptable.maxAttributeLength == -1) {
      program = GL.programs[program];
      var numAttribs = GLctx.getProgramParameter(program, 35721);
      ptable.maxAttributeLength = 0;
      for (var i = 0; i < numAttribs; ++i) {
        var activeAttrib = GLctx.getActiveAttrib(program, i);
        ptable.maxAttributeLength = Math.max(ptable.maxAttributeLength, activeAttrib.name.length + 1)
      }
    }
    HEAP32[p >> 2] = ptable.maxAttributeLength
  } else if (pname == 35381) {
    if (ptable.maxUniformBlockNameLength == -1) {
      program = GL.programs[program];
      var numBlocks = GLctx.getProgramParameter(program, 35382);
      ptable.maxUniformBlockNameLength = 0;
      for (var i = 0; i < numBlocks; ++i) {
        var activeBlockName = GLctx.getActiveUniformBlockName(program, i);
        ptable.maxUniformBlockNameLength = Math.max(ptable.maxUniformBlockNameLength, activeBlockName.length + 1)
      }
    }
    HEAP32[p >> 2] = ptable.maxUniformBlockNameLength
  } else {HEAP32[p >> 2] = GLctx.getProgramParameter(GL.programs[program], pname)}
}

function _glGetShaderInfoLog (shader, maxLength, length, infoLog) {
  var log = GLctx.getShaderInfoLog(GL.shaders[shader]);
  if (log === null) log = "(unknown error)";
  var numBytesWrittenExclNull = maxLength > 0 && infoLog ? stringToUTF8(log, infoLog, maxLength) : 0;
  if (length) HEAP32[length >> 2] = numBytesWrittenExclNull
}

function _glGetShaderiv (shader, pname, p) {
  if (!p) {
    GL.recordError(1281);
    return
  }
  if (pname == 35716) {
    var log = GLctx.getShaderInfoLog(GL.shaders[shader]);
    if (log === null) log = "(unknown error)";
    HEAP32[p >> 2] = log.length + 1
  } else if (pname == 35720) {
    var source = GLctx.getShaderSource(GL.shaders[shader]);
    var sourceLength = source === null || source.length == 0 ? 0 : source.length + 1;
    HEAP32[p >> 2] = sourceLength
  } else {HEAP32[p >> 2] = GLctx.getShaderParameter(GL.shaders[shader], pname)}
}

function _glGetUniformLocation (program, name) {
  name = UTF8ToString(name);
  var arrayIndex = 0;
  if (name[name.length - 1] == "]") {
    var leftBrace = name.lastIndexOf("[");
    arrayIndex = name[leftBrace + 1] != "]" ? parseInt(name.slice(leftBrace + 1)) : 0;
    name = name.slice(0, leftBrace)
  }
  var uniformInfo = GL.programInfos[program] && GL.programInfos[program].uniforms[name];
  if (uniformInfo && arrayIndex >= 0 && arrayIndex < uniformInfo[0]) {return uniformInfo[1] + arrayIndex} else {return -1}
}

function _glLinkProgram (program) {
  GLctx.linkProgram(GL.programs[program]);
  GL.populateUniformTable(program)
}

function _glPixelStorei (pname, param) {
  if (pname == 3317) {GL.unpackAlignment = param}
  GLctx.pixelStorei(pname, param)
}

function _glRenderbufferStorage (x0, x1, x2, x3) {GLctx["renderbufferStorage"](x0, x1, x2, x3)}

function _glScissor (x0, x1, x2, x3) {GLctx["scissor"](x0, x1, x2, x3)}

function _glShaderSource (shader, count, string, length) {
  var source = GL.getSource(shader, count, string, length);
  GLctx.shaderSource(GL.shaders[shader], source)
}

function _glStencilFunc (x0, x1, x2) {GLctx["stencilFunc"](x0, x1, x2)}

function _glStencilOp (x0, x1, x2) {GLctx["stencilOp"](x0, x1, x2)}

function __computeUnpackAlignedImageSize (width, height, sizePerPixel, alignment) {
  function roundedToNextMultipleOf (x, y) {return x + y - 1 & -y}

  var plainRowSize = width * sizePerPixel;
  var alignedRowSize = roundedToNextMultipleOf(plainRowSize, alignment);
  return height * alignedRowSize
}

var __colorChannelsInGlTextureFormat = {6402: 1, 6406: 1, 6407: 3, 6408: 4, 6409: 1, 6410: 2, 35904: 3, 35906: 4};
var __sizeOfGlTextureElementType = {
  5121: 1,
  5123: 2,
  5125: 4,
  5126: 4,
  32819: 2,
  32820: 2,
  33635: 2,
  34042: 4,
  36193: 2
};

function emscriptenWebGLGetTexPixelData (type, format, width, height, pixels, internalFormat) {
  var sizePerPixel = __colorChannelsInGlTextureFormat[format] * __sizeOfGlTextureElementType[type];
  if (!sizePerPixel) {
    GL.recordError(1280);
    return
  }
  var bytes = __computeUnpackAlignedImageSize(width, height, sizePerPixel, GL.unpackAlignment);
  var end = pixels + bytes;
  switch (type) {
    case 5121:
      return HEAPU8.subarray(pixels, end);
    case 5126:
      return HEAPF32.subarray(pixels >> 2, end >> 2);
    case 5125:
    case 34042:
      return HEAPU32.subarray(pixels >> 2, end >> 2);
    case 5123:
    case 33635:
    case 32819:
    case 32820:
    case 36193:
      return HEAPU16.subarray(pixels >> 1, end >> 1);
    default:
      GL.recordError(1280)
  }
}

function _glTexImage2D (target, level, internalFormat, width, height, border, format, type, pixels) {GLctx.texImage2D(target, level, internalFormat, width, height, border, format, type, pixels ? emscriptenWebGLGetTexPixelData(type, format, width, height, pixels, internalFormat) : null)}

function _glTexParameteri (x0, x1, x2) {GLctx["texParameteri"](x0, x1, x2)}

function _glUniform1f (location, v0) {GLctx.uniform1f(GL.uniforms[location], v0)}

function _glUniform1i (location, v0) {GLctx.uniform1i(GL.uniforms[location], v0)}

function _glUniform2f (location, v0, v1) {GLctx.uniform2f(GL.uniforms[location], v0, v1)}

function _glUniform4f (location, v0, v1, v2, v3) {GLctx.uniform4f(GL.uniforms[location], v0, v1, v2, v3)}

function _glUniformMatrix3fv (location, count, transpose, value) {
  if (9 * count <= GL.MINI_TEMP_BUFFER_SIZE) {
    var view = GL.miniTempBufferViews[9 * count - 1];
    for (var i = 0; i < 9 * count; i += 9) {
      view[i] = HEAPF32[value + 4 * i >> 2];
      view[i + 1] = HEAPF32[value + (4 * i + 4) >> 2];
      view[i + 2] = HEAPF32[value + (4 * i + 8) >> 2];
      view[i + 3] = HEAPF32[value + (4 * i + 12) >> 2];
      view[i + 4] = HEAPF32[value + (4 * i + 16) >> 2];
      view[i + 5] = HEAPF32[value + (4 * i + 20) >> 2];
      view[i + 6] = HEAPF32[value + (4 * i + 24) >> 2];
      view[i + 7] = HEAPF32[value + (4 * i + 28) >> 2];
      view[i + 8] = HEAPF32[value + (4 * i + 32) >> 2]
    }
  } else {var view = HEAPF32.subarray(value >> 2, value + count * 36 >> 2)}
  GLctx.uniformMatrix3fv(GL.uniforms[location], !!transpose, view)
}

function _glUseProgram (program) {GLctx.useProgram(GL.programs[program])}

function _glVertexAttrib4f (x0, x1, x2, x3, x4) {GLctx["vertexAttrib4f"](x0, x1, x2, x3, x4)}

function _glVertexAttribPointer (index, size, type, normalized, stride, ptr) {GLctx.vertexAttribPointer(index, size, type, !!normalized, stride, ptr)}

function _glViewport (x0, x1, x2, x3) {GLctx["viewport"](x0, x1, x2, x3)}

function _glutPostRedisplay () {
  if (GLUT.displayFunc && !GLUT.requestedAnimationFrame) {
    GLUT.requestedAnimationFrame = true;
    Browser.requestAnimationFrame(function() {
      GLUT.requestedAnimationFrame = false;
      Browser.mainLoop.runIter(function() {dynCall_v(GLUT.displayFunc)})
    })
  }
}

var GLUT = {
  initTime: null,
  idleFunc: null,
  displayFunc: null,
  keyboardFunc: null,
  keyboardUpFunc: null,
  specialFunc: null,
  specialUpFunc: null,
  reshapeFunc: null,
  motionFunc: null,
  passiveMotionFunc: null,
  mouseFunc: null,
  buttons: 0,
  modifiers: 0,
  initWindowWidth: 256,
  initWindowHeight: 256,
  initDisplayMode: 18,
  windowX: 0,
  windowY: 0,
  windowWidth: 0,
  windowHeight: 0,
  requestedAnimationFrame: false,
  saveModifiers: function(event) {
    GLUT.modifiers = 0;
    if (event["shiftKey"]) GLUT.modifiers += 1;
    if (event["ctrlKey"]) GLUT.modifiers += 2;
    if (event["altKey"]) GLUT.modifiers += 4
  },
  onMousemove: function(event) {
    var lastX = Browser.mouseX;
    var lastY = Browser.mouseY;
    Browser.calculateMouseEvent(event);
    var newX = Browser.mouseX;
    var newY = Browser.mouseY;
    if (newX == lastX && newY == lastY) return;
    if (GLUT.buttons == 0 && event.target == Module["canvas"] && GLUT.passiveMotionFunc) {
      event.preventDefault();
      GLUT.saveModifiers(event);
      dynCall_vii(GLUT.passiveMotionFunc, lastX, lastY)
    } else if (GLUT.buttons != 0 && GLUT.motionFunc) {
      event.preventDefault();
      GLUT.saveModifiers(event);
      dynCall_vii(GLUT.motionFunc, lastX, lastY)
    }
  },
  getSpecialKey: function(keycode) {
    var key = null;
    switch (keycode) {
      case 8:
        key = 120;
        break;
      case 46:
        key = 111;
        break;
      case 112:
        key = 1;
        break;
      case 113:
        key = 2;
        break;
      case 114:
        key = 3;
        break;
      case 115:
        key = 4;
        break;
      case 116:
        key = 5;
        break;
      case 117:
        key = 6;
        break;
      case 118:
        key = 7;
        break;
      case 119:
        key = 8;
        break;
      case 120:
        key = 9;
        break;
      case 121:
        key = 10;
        break;
      case 122:
        key = 11;
        break;
      case 123:
        key = 12;
        break;
      case 37:
        key = 100;
        break;
      case 38:
        key = 101;
        break;
      case 39:
        key = 102;
        break;
      case 40:
        key = 103;
        break;
      case 33:
        key = 104;
        break;
      case 34:
        key = 105;
        break;
      case 36:
        key = 106;
        break;
      case 35:
        key = 107;
        break;
      case 45:
        key = 108;
        break;
      case 16:
      case 5:
        key = 112;
        break;
      case 6:
        key = 113;
        break;
      case 17:
      case 3:
        key = 114;
        break;
      case 4:
        key = 115;
        break;
      case 18:
      case 2:
        key = 116;
        break;
      case 1:
        key = 117;
        break
    }
    return key
  },
  getASCIIKey: function(event) {
    if (event["ctrlKey"] || event["altKey"] || event["metaKey"]) return null;
    var keycode = event["keyCode"];
    if (48 <= keycode && keycode <= 57) return keycode;
    if (65 <= keycode && keycode <= 90) return event["shiftKey"] ? keycode : keycode + 32;
    if (96 <= keycode && keycode <= 105) return keycode - 48;
    if (106 <= keycode && keycode <= 111) return keycode - 106 + 42;
    switch (keycode) {
      case 9:
      case 13:
      case 27:
      case 32:
      case 61:
        return keycode
    }
    var s = event["shiftKey"];
    switch (keycode) {
      case 186:
        return s ? 58 : 59;
      case 187:
        return s ? 43 : 61;
      case 188:
        return s ? 60 : 44;
      case 189:
        return s ? 95 : 45;
      case 190:
        return s ? 62 : 46;
      case 191:
        return s ? 63 : 47;
      case 219:
        return s ? 123 : 91;
      case 220:
        return s ? 124 : 47;
      case 221:
        return s ? 125 : 93;
      case 222:
        return s ? 34 : 39
    }
    return null
  },
  onKeydown: function(event) {
    if (GLUT.specialFunc || GLUT.keyboardFunc) {
      var key = GLUT.getSpecialKey(event["keyCode"]);
      if (key !== null) {
        if (GLUT.specialFunc) {
          event.preventDefault();
          GLUT.saveModifiers(event);
          dynCall_viii(GLUT.specialFunc, key, Browser.mouseX, Browser.mouseY)
        }
      } else {
        key = GLUT.getASCIIKey(event);
        if (key !== null && GLUT.keyboardFunc) {
          event.preventDefault();
          GLUT.saveModifiers(event);
          dynCall_viii(GLUT.keyboardFunc, key, Browser.mouseX, Browser.mouseY)
        }
      }
    }
  },
  onKeyup: function(event) {
    if (GLUT.specialUpFunc || GLUT.keyboardUpFunc) {
      var key = GLUT.getSpecialKey(event["keyCode"]);
      if (key !== null) {
        if (GLUT.specialUpFunc) {
          event.preventDefault();
          GLUT.saveModifiers(event);
          dynCall_viii(GLUT.specialUpFunc, key, Browser.mouseX, Browser.mouseY)
        }
      } else {
        key = GLUT.getASCIIKey(event);
        if (key !== null && GLUT.keyboardUpFunc) {
          event.preventDefault();
          GLUT.saveModifiers(event);
          dynCall_viii(GLUT.keyboardUpFunc, key, Browser.mouseX, Browser.mouseY)
        }
      }
    }
  },
  touchHandler: function(event) {
    if (event.target != Module["canvas"]) {return}
    var touches = event.changedTouches, main = touches[0], type = "";
    switch (event.type) {
      case"touchstart":
        type = "mousedown";
        break;
      case"touchmove":
        type = "mousemove";
        break;
      case"touchend":
        type = "mouseup";
        break;
      default:
        return
    }
    var simulatedEvent = document.createEvent("MouseEvent");
    simulatedEvent.initMouseEvent(type, true, true, window, 1, main.screenX, main.screenY, main.clientX, main.clientY, false, false, false, false, 0, null);
    main.target.dispatchEvent(simulatedEvent);
    event.preventDefault()
  },
  onMouseButtonDown: function(event) {
    Browser.calculateMouseEvent(event);
    GLUT.buttons |= 1 << event["button"];
    if (event.target == Module["canvas"] && GLUT.mouseFunc) {
      try {event.target.setCapture()} catch (e) {}
      event.preventDefault();
      GLUT.saveModifiers(event);
      dynCall_viiii(GLUT.mouseFunc, event["button"], 0, Browser.mouseX, Browser.mouseY)
    }
  },
  onMouseButtonUp: function(event) {
    Browser.calculateMouseEvent(event);
    GLUT.buttons &= ~(1 << event["button"]);
    if (GLUT.mouseFunc) {
      event.preventDefault();
      GLUT.saveModifiers(event);
      dynCall_viiii(GLUT.mouseFunc, event["button"], 1, Browser.mouseX, Browser.mouseY)
    }
  },
  onMouseWheel: function(event) {
    Browser.calculateMouseEvent(event);
    var e = window.event || event;
    var delta = -Browser.getMouseWheelDelta(event);
    delta = delta == 0 ? 0 : delta > 0 ? Math.max(delta, 1) : Math.min(delta, -1);
    var button = 3;
    if (delta < 0) {button = 4}
    if (GLUT.mouseFunc) {
      event.preventDefault();
      GLUT.saveModifiers(event);
      dynCall_viiii(GLUT.mouseFunc, button, 0, Browser.mouseX, Browser.mouseY)
    }
  },
  onFullscreenEventChange: function(event) {
    var width;
    var height;
    if (document["fullscreen"] || document["fullScreen"] || document["mozFullScreen"] || document["webkitIsFullScreen"]) {
      width = screen["width"];
      height = screen["height"]
    } else {
      width = GLUT.windowWidth;
      height = GLUT.windowHeight;
      document.removeEventListener("fullscreenchange", GLUT.onFullscreenEventChange, true);
      document.removeEventListener("mozfullscreenchange", GLUT.onFullscreenEventChange, true);
      document.removeEventListener("webkitfullscreenchange", GLUT.onFullscreenEventChange, true)
    }
    Browser.setCanvasSize(width, height, true);
    if (GLUT.reshapeFunc) {dynCall_vii(GLUT.reshapeFunc, width, height)}
    _glutPostRedisplay()
  },
  requestFullscreen: function() {Browser.requestFullscreen(false, false)},
  requestFullScreen: function() {
    err("GLUT.requestFullScreen() is deprecated. Please call GLUT.requestFullscreen instead.");
    GLUT.requestFullScreen = function() {return GLUT.requestFullscreen()};
    return GLUT.requestFullscreen()
  },
  exitFullscreen: function() {Browser.exitFullscreen()},
  cancelFullScreen: function() {
    err("GLUT.cancelFullScreen() is deprecated. Please call GLUT.exitFullscreen instead.");
    GLUT.cancelFullScreen = function() {return GLUT.exitFullscreen()};
    return GLUT.exitFullscreen()
  }
};

function _glutCreateWindow (name) {
  var contextAttributes = {
    antialias: (GLUT.initDisplayMode & 128) != 0,
    depth: (GLUT.initDisplayMode & 16) != 0,
    stencil: (GLUT.initDisplayMode & 32) != 0,
    alpha: (GLUT.initDisplayMode & 8) != 0
  };
  Module.ctx = Browser.createContext(Module["canvas"], true, true, contextAttributes);
  return Module.ctx ? 1 : 0
}

function _glutDisplayFunc (func) {GLUT.displayFunc = func}

function _glutInit (argcp, argv) {
  GLUT.initTime = Date.now();
  var isTouchDevice = "ontouchstart" in document.documentElement;
  if (isTouchDevice) {
    window.addEventListener("touchmove", GLUT.touchHandler, true);
    window.addEventListener("touchstart", GLUT.touchHandler, true);
    window.addEventListener("touchend", GLUT.touchHandler, true)
  }
  window.addEventListener("keydown", GLUT.onKeydown, true);
  window.addEventListener("keyup", GLUT.onKeyup, true);
  window.addEventListener("mousemove", GLUT.onMousemove, true);
  window.addEventListener("mousedown", GLUT.onMouseButtonDown, true);
  window.addEventListener("mouseup", GLUT.onMouseButtonUp, true);
  window.addEventListener("mousewheel", GLUT.onMouseWheel, true);
  window.addEventListener("DOMMouseScroll", GLUT.onMouseWheel, true);
  Browser.resizeListeners.push(function(width, height) {if (GLUT.reshapeFunc) {dynCall_vii(GLUT.reshapeFunc, width, height)}});
  __ATEXIT__.push(function() {
    if (isTouchDevice) {
      window.removeEventListener("touchmove", GLUT.touchHandler, true);
      window.removeEventListener("touchstart", GLUT.touchHandler, true);
      window.removeEventListener("touchend", GLUT.touchHandler, true)
    }
    window.removeEventListener("keydown", GLUT.onKeydown, true);
    window.removeEventListener("keyup", GLUT.onKeyup, true);
    window.removeEventListener("mousemove", GLUT.onMousemove, true);
    window.removeEventListener("mousedown", GLUT.onMouseButtonDown, true);
    window.removeEventListener("mouseup", GLUT.onMouseButtonUp, true);
    window.removeEventListener("mousewheel", GLUT.onMouseWheel, true);
    window.removeEventListener("DOMMouseScroll", GLUT.onMouseWheel, true);
    Module["canvas"].width = Module["canvas"].height = 1
  })
}

function _glutInitDisplayMode (mode) {GLUT.initDisplayMode = mode}

function _glutInitWindowSize (width, height) {Browser.setCanvasSize(GLUT.initWindowWidth = width, GLUT.initWindowHeight = height)}

function _glutReshapeWindow (width, height) {
  GLUT.exitFullscreen();
  Browser.setCanvasSize(width, height, true);
  if (GLUT.reshapeFunc) {dynCall_vii(GLUT.reshapeFunc, width, height)}
  _glutPostRedisplay()
}

function _glutMainLoop () {
  _glutReshapeWindow(Module["canvas"].width, Module["canvas"].height);
  _glutPostRedisplay();
  throw"SimulateInfiniteLoop"
}

var ___tm_current = 1337392;
var ___tm_timezone = (stringToUTF8("GMT", 1337440, 4), 1337440);

function _gmtime_r (time, tmPtr) {
  var date = new Date(HEAP32[time >> 2] * 1e3);
  HEAP32[tmPtr >> 2] = date.getUTCSeconds();
  HEAP32[tmPtr + 4 >> 2] = date.getUTCMinutes();
  HEAP32[tmPtr + 8 >> 2] = date.getUTCHours();
  HEAP32[tmPtr + 12 >> 2] = date.getUTCDate();
  HEAP32[tmPtr + 16 >> 2] = date.getUTCMonth();
  HEAP32[tmPtr + 20 >> 2] = date.getUTCFullYear() - 1900;
  HEAP32[tmPtr + 24 >> 2] = date.getUTCDay();
  HEAP32[tmPtr + 36 >> 2] = 0;
  HEAP32[tmPtr + 32 >> 2] = 0;
  var start = Date.UTC(date.getUTCFullYear(), 0, 1, 0, 0, 0, 0);
  var yday = (date.getTime() - start) / (1e3 * 60 * 60 * 24) | 0;
  HEAP32[tmPtr + 28 >> 2] = yday;
  HEAP32[tmPtr + 40 >> 2] = ___tm_timezone;
  return tmPtr
}

function _gmtime (time) {return _gmtime_r(time, ___tm_current)}

function _memcpy (dest, src, num) {
  dest = dest | 0;
  src = src | 0;
  num = num | 0;
  var ret = 0;
  var aligned_dest_end = 0;
  var block_aligned_dest_end = 0;
  var dest_end = 0;
  if ((num | 0) >= 8192) {
    _emscripten_memcpy_big(dest | 0, src | 0, num | 0) | 0;
    return dest | 0
  }
  ret = dest | 0;
  dest_end = dest + num | 0;
  if ((dest & 3) == (src & 3)) {
    while (dest & 3) {
      if ((num | 0) == 0) return ret | 0;
      HEAP8[dest >> 0] = HEAP8[src >> 0] | 0;
      dest = dest + 1 | 0;
      src = src + 1 | 0;
      num = num - 1 | 0
    }
    aligned_dest_end = dest_end & -4 | 0;
    block_aligned_dest_end = aligned_dest_end - 64 | 0;
    while ((dest | 0) <= (block_aligned_dest_end | 0)) {
      HEAP32[dest >> 2] = HEAP32[src >> 2] | 0;
      HEAP32[dest + 4 >> 2] = HEAP32[src + 4 >> 2] | 0;
      HEAP32[dest + 8 >> 2] = HEAP32[src + 8 >> 2] | 0;
      HEAP32[dest + 12 >> 2] = HEAP32[src + 12 >> 2] | 0;
      HEAP32[dest + 16 >> 2] = HEAP32[src + 16 >> 2] | 0;
      HEAP32[dest + 20 >> 2] = HEAP32[src + 20 >> 2] | 0;
      HEAP32[dest + 24 >> 2] = HEAP32[src + 24 >> 2] | 0;
      HEAP32[dest + 28 >> 2] = HEAP32[src + 28 >> 2] | 0;
      HEAP32[dest + 32 >> 2] = HEAP32[src + 32 >> 2] | 0;
      HEAP32[dest + 36 >> 2] = HEAP32[src + 36 >> 2] | 0;
      HEAP32[dest + 40 >> 2] = HEAP32[src + 40 >> 2] | 0;
      HEAP32[dest + 44 >> 2] = HEAP32[src + 44 >> 2] | 0;
      HEAP32[dest + 48 >> 2] = HEAP32[src + 48 >> 2] | 0;
      HEAP32[dest + 52 >> 2] = HEAP32[src + 52 >> 2] | 0;
      HEAP32[dest + 56 >> 2] = HEAP32[src + 56 >> 2] | 0;
      HEAP32[dest + 60 >> 2] = HEAP32[src + 60 >> 2] | 0;
      dest = dest + 64 | 0;
      src = src + 64 | 0
    }
    while ((dest | 0) < (aligned_dest_end | 0)) {
      HEAP32[dest >> 2] = HEAP32[src >> 2] | 0;
      dest = dest + 4 | 0;
      src = src + 4 | 0
    }
  } else {
    aligned_dest_end = dest_end - 4 | 0;
    while ((dest | 0) < (aligned_dest_end | 0)) {
      HEAP8[dest >> 0] = HEAP8[src >> 0] | 0;
      HEAP8[dest + 1 >> 0] = HEAP8[src + 1 >> 0] | 0;
      HEAP8[dest + 2 >> 0] = HEAP8[src + 2 >> 0] | 0;
      HEAP8[dest + 3 >> 0] = HEAP8[src + 3 >> 0] | 0;
      dest = dest + 4 | 0;
      src = src + 4 | 0
    }
  }
  while ((dest | 0) < (dest_end | 0)) {
    HEAP8[dest >> 0] = HEAP8[src >> 0] | 0;
    dest = dest + 1 | 0;
    src = src + 1 | 0
  }
  return ret | 0
}

function _pthread_cond_broadcast (x) {
  x = x | 0;
  return 0
}

function _pthread_cond_wait () {return 0}

function _pthread_mutexattr_destroy () {}

function _pthread_mutexattr_init () {}

function _pthread_mutexattr_settype () {}

function _roundf (d) {
  d = +d;
  return d >= +0 ? +Math_floor(d + +.5) : +Math_ceil(d - +.5)
}

function abortOnCannotGrowMemory (requestedSize) {abort("OOM")}

function _emscripten_resize_heap (requestedSize) {abortOnCannotGrowMemory(requestedSize)}

function _sbrk (increment) {
  increment = increment | 0;
  var oldDynamicTop = 0;
  var newDynamicTop = 0;
  var totalMemory = 0;
  totalMemory = _emscripten_get_heap_size() | 0;
  oldDynamicTop = HEAP32[DYNAMICTOP_PTR >> 2] | 0;
  newDynamicTop = oldDynamicTop + increment | 0;
  if ((increment | 0) > 0 & (newDynamicTop | 0) < (oldDynamicTop | 0) | (newDynamicTop | 0) < 0) {
    abortOnCannotGrowMemory(newDynamicTop | 0) | 0;
    ___setErrNo(12);
    return -1
  }
  if ((newDynamicTop | 0) > (totalMemory | 0)) {
    if (_emscripten_resize_heap(newDynamicTop | 0) | 0) {} else {
      ___setErrNo(12);
      return -1
    }
  }
  HEAP32[DYNAMICTOP_PTR >> 2] = newDynamicTop | 0;
  return oldDynamicTop | 0
}

function _sched_yield () {return 0}

function _setTempRet0 ($i) {setTempRet0($i | 0)}

var __sigalrm_handler = 0;

function _signal (sig, func) {
  if (sig == 14) {__sigalrm_handler = func} else {}
  return 0
}

function __isLeapYear (year) {return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)}

function __arraySum (array, index) {
  var sum = 0;
  for (var i = 0; i <= index; sum += array[i++]) ;
  return sum
}

var __MONTH_DAYS_LEAP = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
var __MONTH_DAYS_REGULAR = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function __addDays (date, days) {
  var newDate = new Date(date.getTime());
  while (days > 0) {
    var leap = __isLeapYear(newDate.getFullYear());
    var currentMonth = newDate.getMonth();
    var daysInCurrentMonth = (leap ? __MONTH_DAYS_LEAP : __MONTH_DAYS_REGULAR)[currentMonth];
    if (days > daysInCurrentMonth - newDate.getDate()) {
      days -= daysInCurrentMonth - newDate.getDate() + 1;
      newDate.setDate(1);
      if (currentMonth < 11) {newDate.setMonth(currentMonth + 1)} else {
        newDate.setMonth(0);
        newDate.setFullYear(newDate.getFullYear() + 1)
      }
    } else {
      newDate.setDate(newDate.getDate() + days);
      return newDate
    }
  }
  return newDate
}

function _strftime (s, maxsize, format, tm) {
  var tm_zone = HEAP32[tm + 40 >> 2];
  var date = {
    tm_sec: HEAP32[tm >> 2],
    tm_min: HEAP32[tm + 4 >> 2],
    tm_hour: HEAP32[tm + 8 >> 2],
    tm_mday: HEAP32[tm + 12 >> 2],
    tm_mon: HEAP32[tm + 16 >> 2],
    tm_year: HEAP32[tm + 20 >> 2],
    tm_wday: HEAP32[tm + 24 >> 2],
    tm_yday: HEAP32[tm + 28 >> 2],
    tm_isdst: HEAP32[tm + 32 >> 2],
    tm_gmtoff: HEAP32[tm + 36 >> 2],
    tm_zone: tm_zone ? UTF8ToString(tm_zone) : ""
  };
  var pattern = UTF8ToString(format);
  var EXPANSION_RULES_1 = {
    "%c": "%a %b %d %H:%M:%S %Y",
    "%D": "%m/%d/%y",
    "%F": "%Y-%m-%d",
    "%h": "%b",
    "%r": "%I:%M:%S %p",
    "%R": "%H:%M",
    "%T": "%H:%M:%S",
    "%x": "%m/%d/%y",
    "%X": "%H:%M:%S",
    "%Ec": "%c",
    "%EC": "%C",
    "%Ex": "%m/%d/%y",
    "%EX": "%H:%M:%S",
    "%Ey": "%y",
    "%EY": "%Y",
    "%Od": "%d",
    "%Oe": "%e",
    "%OH": "%H",
    "%OI": "%I",
    "%Om": "%m",
    "%OM": "%M",
    "%OS": "%S",
    "%Ou": "%u",
    "%OU": "%U",
    "%OV": "%V",
    "%Ow": "%w",
    "%OW": "%W",
    "%Oy": "%y"
  };
  for (var rule in EXPANSION_RULES_1) {pattern = pattern.replace(new RegExp(rule, "g"), EXPANSION_RULES_1[rule])}
  var WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  function leadingSomething (value, digits, character) {
    var str = typeof value === "number" ? value.toString() : value || "";
    while (str.length < digits) {str = character[0] + str}
    return str
  }

  function leadingNulls (value, digits) {return leadingSomething(value, digits, "0")}

  function compareByDay (date1, date2) {
    function sgn (value) {return value < 0 ? -1 : value > 0 ? 1 : 0}

    var compare;
    if ((compare = sgn(date1.getFullYear() - date2.getFullYear())) === 0) {if ((compare = sgn(date1.getMonth() - date2.getMonth())) === 0) {compare = sgn(date1.getDate() - date2.getDate())}}
    return compare
  }

  function getFirstWeekStartDate (janFourth) {
    switch (janFourth.getDay()) {
      case 0:
        return new Date(janFourth.getFullYear() - 1, 11, 29);
      case 1:
        return janFourth;
      case 2:
        return new Date(janFourth.getFullYear(), 0, 3);
      case 3:
        return new Date(janFourth.getFullYear(), 0, 2);
      case 4:
        return new Date(janFourth.getFullYear(), 0, 1);
      case 5:
        return new Date(janFourth.getFullYear() - 1, 11, 31);
      case 6:
        return new Date(janFourth.getFullYear() - 1, 11, 30)
    }
  }

  function getWeekBasedYear (date) {
    var thisDate = __addDays(new Date(date.tm_year + 1900, 0, 1), date.tm_yday);
    var janFourthThisYear = new Date(thisDate.getFullYear(), 0, 4);
    var janFourthNextYear = new Date(thisDate.getFullYear() + 1, 0, 4);
    var firstWeekStartThisYear = getFirstWeekStartDate(janFourthThisYear);
    var firstWeekStartNextYear = getFirstWeekStartDate(janFourthNextYear);
    if (compareByDay(firstWeekStartThisYear, thisDate) <= 0) {if (compareByDay(firstWeekStartNextYear, thisDate) <= 0) {return thisDate.getFullYear() + 1} else {return thisDate.getFullYear()}} else {return thisDate.getFullYear() - 1}
  }

  var EXPANSION_RULES_2 = {
    "%a": function(date) {return WEEKDAYS[date.tm_wday].substring(0, 3)},
    "%A": function(date) {return WEEKDAYS[date.tm_wday]},
    "%b": function(date) {return MONTHS[date.tm_mon].substring(0, 3)},
    "%B": function(date) {return MONTHS[date.tm_mon]},
    "%C": function(date) {
      var year = date.tm_year + 1900;
      return leadingNulls(year / 100 | 0, 2)
    },
    "%d": function(date) {return leadingNulls(date.tm_mday, 2)},
    "%e": function(date) {return leadingSomething(date.tm_mday, 2, " ")},
    "%g": function(date) {return getWeekBasedYear(date).toString().substring(2)},
    "%G": function(date) {return getWeekBasedYear(date)},
    "%H": function(date) {return leadingNulls(date.tm_hour, 2)},
    "%I": function(date) {
      var twelveHour = date.tm_hour;
      if (twelveHour == 0) twelveHour = 12; else if (twelveHour > 12) twelveHour -= 12;
      return leadingNulls(twelveHour, 2)
    },
    "%j": function(date) {return leadingNulls(date.tm_mday + __arraySum(__isLeapYear(date.tm_year + 1900) ? __MONTH_DAYS_LEAP : __MONTH_DAYS_REGULAR, date.tm_mon - 1), 3)},
    "%m": function(date) {return leadingNulls(date.tm_mon + 1, 2)},
    "%M": function(date) {return leadingNulls(date.tm_min, 2)},
    "%n": function() {return "\n"},
    "%p": function(date) {if (date.tm_hour >= 0 && date.tm_hour < 12) {return "AM"} else {return "PM"}},
    "%S": function(date) {return leadingNulls(date.tm_sec, 2)},
    "%t": function() {return "\t"},
    "%u": function(date) {return date.tm_wday || 7},
    "%U": function(date) {
      var janFirst = new Date(date.tm_year + 1900, 0, 1);
      var firstSunday = janFirst.getDay() === 0 ? janFirst : __addDays(janFirst, 7 - janFirst.getDay());
      var endDate = new Date(date.tm_year + 1900, date.tm_mon, date.tm_mday);
      if (compareByDay(firstSunday, endDate) < 0) {
        var februaryFirstUntilEndMonth = __arraySum(__isLeapYear(endDate.getFullYear()) ? __MONTH_DAYS_LEAP : __MONTH_DAYS_REGULAR, endDate.getMonth() - 1) - 31;
        var firstSundayUntilEndJanuary = 31 - firstSunday.getDate();
        var days = firstSundayUntilEndJanuary + februaryFirstUntilEndMonth + endDate.getDate();
        return leadingNulls(Math.ceil(days / 7), 2)
      }
      return compareByDay(firstSunday, janFirst) === 0 ? "01" : "00"
    },
    "%V": function(date) {
      var janFourthThisYear = new Date(date.tm_year + 1900, 0, 4);
      var janFourthNextYear = new Date(date.tm_year + 1901, 0, 4);
      var firstWeekStartThisYear = getFirstWeekStartDate(janFourthThisYear);
      var firstWeekStartNextYear = getFirstWeekStartDate(janFourthNextYear);
      var endDate = __addDays(new Date(date.tm_year + 1900, 0, 1), date.tm_yday);
      if (compareByDay(endDate, firstWeekStartThisYear) < 0) {return "53"}
      if (compareByDay(firstWeekStartNextYear, endDate) <= 0) {return "01"}
      var daysDifference;
      if (firstWeekStartThisYear.getFullYear() < date.tm_year + 1900) {daysDifference = date.tm_yday + 32 - firstWeekStartThisYear.getDate()} else {daysDifference = date.tm_yday + 1 - firstWeekStartThisYear.getDate()}
      return leadingNulls(Math.ceil(daysDifference / 7), 2)
    },
    "%w": function(date) {return date.tm_wday},
    "%W": function(date) {
      var janFirst = new Date(date.tm_year, 0, 1);
      var firstMonday = janFirst.getDay() === 1 ? janFirst : __addDays(janFirst, janFirst.getDay() === 0 ? 1 : 7 - janFirst.getDay() + 1);
      var endDate = new Date(date.tm_year + 1900, date.tm_mon, date.tm_mday);
      if (compareByDay(firstMonday, endDate) < 0) {
        var februaryFirstUntilEndMonth = __arraySum(__isLeapYear(endDate.getFullYear()) ? __MONTH_DAYS_LEAP : __MONTH_DAYS_REGULAR, endDate.getMonth() - 1) - 31;
        var firstMondayUntilEndJanuary = 31 - firstMonday.getDate();
        var days = firstMondayUntilEndJanuary + februaryFirstUntilEndMonth + endDate.getDate();
        return leadingNulls(Math.ceil(days / 7), 2)
      }
      return compareByDay(firstMonday, janFirst) === 0 ? "01" : "00"
    },
    "%y": function(date) {return (date.tm_year + 1900).toString().substring(2)},
    "%Y": function(date) {return date.tm_year + 1900},
    "%z": function(date) {
      var off = date.tm_gmtoff;
      var ahead = off >= 0;
      off = Math.abs(off) / 60;
      off = off / 60 * 100 + off % 60;
      return (ahead ? "+" : "-") + String("0000" + off).slice(-4)
    },
    "%Z": function(date) {return date.tm_zone},
    "%%": function() {return "%"}
  };
  for (var rule in EXPANSION_RULES_2) {if (pattern.indexOf(rule) >= 0) {pattern = pattern.replace(new RegExp(rule, "g"), EXPANSION_RULES_2[rule](date))}}
  var bytes = intArrayFromString(pattern, false);
  if (bytes.length > maxsize) {return 0}
  writeArrayToMemory(bytes, s);
  return bytes.length - 1
}

function _strftime_l (s, maxsize, format, tm) {return _strftime(s, maxsize, format, tm)}

function _time (ptr) {
  var ret = Date.now() / 1e3 | 0;
  if (ptr) {HEAP32[ptr >> 2] = ret}
  return ret
}

FS.staticInit();
Module["FS_createFolder"] = FS.createFolder;
Module["FS_createPath"] = FS.createPath;
Module["FS_createDataFile"] = FS.createDataFile;
Module["FS_createPreloadedFile"] = FS.createPreloadedFile;
Module["FS_createLazyFile"] = FS.createLazyFile;
Module["FS_createLink"] = FS.createLink;
Module["FS_createDevice"] = FS.createDevice;
Module["FS_unlink"] = FS.unlink;
if (ENVIRONMENT_HAS_NODE) {
  var fs = require("fs");
  var NODEJS_PATH = require("path");
  NODEFS.staticInit()
}
Module["requestFullScreen"] = function Module_requestFullScreen (lockPointer, resizeCanvas, vrDevice) {
  err("Module.requestFullScreen is deprecated. Please call Module.requestFullscreen instead.");
  Module["requestFullScreen"] = Module["requestFullscreen"];
  Browser.requestFullScreen(lockPointer, resizeCanvas, vrDevice)
};
Module["requestFullscreen"] = function Module_requestFullscreen (lockPointer, resizeCanvas, vrDevice) {Browser.requestFullscreen(lockPointer, resizeCanvas, vrDevice)};
Module["requestAnimationFrame"] = function Module_requestAnimationFrame (func) {Browser.requestAnimationFrame(func)};
Module["setCanvasSize"] = function Module_setCanvasSize (width, height, noUpdates) {Browser.setCanvasSize(width, height, noUpdates)};
Module["pauseMainLoop"] = function Module_pauseMainLoop () {Browser.mainLoop.pause()};
Module["resumeMainLoop"] = function Module_resumeMainLoop () {Browser.mainLoop.resume()};
Module["getUserMedia"] = function Module_getUserMedia () {Browser.getUserMedia()};
Module["createContext"] = function Module_createContext (canvas, useWebGL, setInModule, webGLContextAttributes) {return Browser.createContext(canvas, useWebGL, setInModule, webGLContextAttributes)};
if (ENVIRONMENT_IS_NODE) {
  _emscripten_get_now = function _emscripten_get_now_actual () {
    var t = process["hrtime"]();
    return t[0] * 1e3 + t[1] / 1e6
  }
} else if (typeof dateNow !== "undefined") {_emscripten_get_now = dateNow} else if (typeof performance === "object" && performance && typeof performance["now"] === "function") {_emscripten_get_now = function() {return performance["now"]()}} else {_emscripten_get_now = Date.now}
var GLctx;
GL.init();

function intArrayFromString (stringy, dontAddNull, length) {
  var len = length > 0 ? length : lengthBytesUTF8(stringy) + 1;
  var u8array = new Array(len);
  var numBytesWritten = stringToUTF8Array(stringy, u8array, 0, u8array.length);
  if (dontAddNull) u8array.length = numBytesWritten;
  return u8array
}

var asmGlobalArg = {};
var asmLibraryArg = {
  "Bb": _Mix_AllocateChannels,
  "T": _Mix_HaltChannel,
  "Ab": _Mix_Init,
  "zb": _Mix_LoadWAV,
  "yb": _Mix_OpenAudio,
  "ma": _Mix_Pause,
  "xb": _Mix_PlayChannelTimed,
  "la": _Mix_Resume,
  "F": _Mix_Volume,
  "S": _SDL_GetError,
  "wb": ___buildEnvironment,
  "d": ___cxa_allocate_exception,
  "vb": ___cxa_decrement_exception_refcount,
  "ub": ___cxa_pure_virtual,
  "c": ___cxa_throw,
  "tb": ___cxa_uncaught_exceptions,
  "ka": ___lock,
  "sb": ___map_file,
  "R": ___syscall102,
  "rb": ___syscall140,
  "qb": ___syscall142,
  "pb": ___syscall145,
  "ja": ___syscall146,
  "ob": ___syscall183,
  "n": ___syscall221,
  "nb": ___syscall3,
  "mb": ___syscall33,
  "lb": ___syscall4,
  "kb": ___syscall5,
  "ia": ___syscall54,
  "Q": ___syscall6,
  "jb": ___syscall91,
  "E": ___unlock,
  "b": _abort,
  "ha": _clock_gettime,
  "X": _emscripten_asm_const_dii,
  "a": _emscripten_asm_const_iii,
  "ib": _emscripten_async_wget_data,
  "v": _emscripten_longjmp,
  "hb": _emscripten_memcpy_big,
  "gb": _emscripten_set_main_loop,
  "fb": _exit,
  "h": _getTempRet0,
  "eb": _getaddrinfo,
  "P": _getenv,
  "W": _gettimeofday,
  "ga": _glAttachShader,
  "l": _glBindBuffer,
  "O": _glBindFramebuffer,
  "N": _glBindRenderbuffer,
  "t": _glBindTexture,
  "db": _glBlendFunc,
  "o": _glBufferData,
  "cb": _glCheckFramebufferStatus,
  "M": _glClear,
  "bb": _glClearColor,
  "L": _glColorMask,
  "ab": _glCompileShader,
  "D": _glCompressedTexImage2D,
  "fa": _glCreateProgram,
  "$a": _glCreateShader,
  "K": _glDeleteBuffers,
  "_a": _glDeleteFramebuffers,
  "ea": _glDeleteProgram,
  "da": _glDeleteRenderbuffers,
  "Za": _glDeleteShader,
  "Ya": _glDeleteTextures,
  "y": _glDisable,
  "k": _glDisableVertexAttribArray,
  "s": _glDrawArrays,
  "Xa": _glDrawElements,
  "q": _glEnable,
  "j": _glEnableVertexAttribArray,
  "Wa": _glFinish,
  "Va": _glFlush,
  "Ua": _glFramebufferRenderbuffer,
  "Ta": _glFramebufferTexture2D,
  "B": _glGenBuffers,
  "Sa": _glGenFramebuffers,
  "Ra": _glGenRenderbuffers,
  "V": _glGenTextures,
  "g": _glGetAttribLocation,
  "J": _glGetError,
  "ca": _glGetIntegerv,
  "Qa": _glGetProgramInfoLog,
  "ba": _glGetProgramiv,
  "Pa": _glGetShaderInfoLog,
  "aa": _glGetShaderiv,
  "e": _glGetUniformLocation,
  "Oa": _glLinkProgram,
  "$": _glPixelStorei,
  "Na": _glRenderbufferStorage,
  "Ma": _glScissor,
  "La": _glShaderSource,
  "I": _glStencilFunc,
  "H": _glStencilOp,
  "u": _glTexImage2D,
  "G": _glTexParameteri,
  "Ka": _glUniform1f,
  "A": _glUniform1i,
  "U": _glUniform2f,
  "x": _glUniform4f,
  "r": _glUniformMatrix3fv,
  "Ja": _glUseProgram,
  "Ia": _glVertexAttrib4f,
  "i": _glVertexAttribPointer,
  "Ha": _glViewport,
  "Ga": _glutCreateWindow,
  "Fa": _glutDisplayFunc,
  "Ea": _glutInit,
  "Da": _glutInitDisplayMode,
  "Ca": _glutInitWindowSize,
  "Ba": _glutMainLoop,
  "_": _glutPostRedisplay,
  "Aa": _gmtime,
  "za": invoke_iii,
  "ya": invoke_iiii,
  "xa": invoke_iiiii,
  "p": invoke_vi,
  "wa": invoke_vii,
  "va": invoke_viiii,
  "ua": _pthread_cond_broadcast,
  "ta": _pthread_cond_wait,
  "Z": _pthread_mutexattr_destroy,
  "sa": _pthread_mutexattr_init,
  "ra": _pthread_mutexattr_settype,
  "w": _roundf,
  "C": _saveSetjmp,
  "z": _sbrk,
  "qa": _sched_yield,
  "f": _setTempRet0,
  "pa": _signal,
  "oa": _strftime,
  "na": _strftime_l,
  "m": _testSetjmp,
  "Y": _time
};
var asm = Module["asm"](asmGlobalArg, asmLibraryArg, buffer);
Module["asm"] = asm;
var ___wasm_call_ctors = Module["___wasm_call_ctors"] = function() {return Module["asm"]["Cb"].apply(null, arguments)};
var _malloc = Module["_malloc"] = function() {return Module["asm"]["Db"].apply(null, arguments)};
var _free = Module["_free"] = function() {return Module["asm"]["Eb"].apply(null, arguments)};
var ___errno_location = Module["___errno_location"] = function() {return Module["asm"]["Fb"].apply(null, arguments)};
var _realloc = Module["_realloc"] = function() {return Module["asm"]["Gb"].apply(null, arguments)};
var _inapp_gpxplay_purchase_callback = Module["_inapp_gpxplay_purchase_callback"] = function() {return Module["asm"]["Hb"].apply(null, arguments)};
var __xsollaCall = Module["__xsollaCall"] = function() {return Module["asm"]["Ib"].apply(null, arguments)};
var __paymentRequestCall = Module["__paymentRequestCall"] = function() {return Module["asm"]["Jb"].apply(null, arguments)};
var _call_facebook_init_ready = Module["_call_facebook_init_ready"] = function() {return Module["asm"]["Kb"].apply(null, arguments)};
var _call_facebook_login_success = Module["_call_facebook_login_success"] = function() {return Module["asm"]["Lb"].apply(null, arguments)};
var _call_facebook_login_fail = Module["_call_facebook_login_fail"] = function() {return Module["asm"]["Mb"].apply(null, arguments)};
var _call_facebook_pay_success = Module["_call_facebook_pay_success"] = function() {return Module["asm"]["Nb"].apply(null, arguments)};
var _call_facebook_pay_fail = Module["_call_facebook_pay_fail"] = function() {return Module["asm"]["Ob"].apply(null, arguments)};
var _call_facebook_restore_purchase = Module["_call_facebook_restore_purchase"] = function() {return Module["asm"]["Pb"].apply(null, arguments)};
var _call_facebook_restore_end = Module["_call_facebook_restore_end"] = function() {return Module["asm"]["Qb"].apply(null, arguments)};
var _call_facebook_consume_success = Module["_call_facebook_consume_success"] = function() {return Module["asm"]["Rb"].apply(null, arguments)};
var _call_facebook_consume_fail = Module["_call_facebook_consume_fail"] = function() {return Module["asm"]["Sb"].apply(null, arguments)};
var __odnoklassnikiCallback = Module["__odnoklassnikiCallback"] = function() {return Module["asm"]["Tb"].apply(null, arguments)};
var __odnoklassnikiPictureCallback = Module["__odnoklassnikiPictureCallback"] = function() {return Module["asm"]["Ub"].apply(null, arguments)};
var ___hookSuccess = Module["___hookSuccess"] = function() {return Module["asm"]["Vb"].apply(null, arguments)};
var ___hookFail = Module["___hookFail"] = function() {return Module["asm"]["Wb"].apply(null, arguments)};
var __send = Module["__send"] = function() {return Module["asm"]["Xb"].apply(null, arguments)};
var __load_package_success = Module["__load_package_success"] = function() {return Module["asm"]["Yb"].apply(null, arguments)};
var __load_package_progress = Module["__load_package_progress"] = function() {return Module["asm"]["Zb"].apply(null, arguments)};
var __storage_sync_done = Module["__storage_sync_done"] = function() {return Module["asm"]["_b"].apply(null, arguments)};
var _Async_doLoadNextCallback = Module["_Async_doLoadNextCallback"] = function() {return Module["asm"]["$b"].apply(null, arguments)};
var _fireFsEndCallback = Module["_fireFsEndCallback"] = function() {return Module["asm"]["ac"].apply(null, arguments)};
var _shouldCreateFile = Module["_shouldCreateFile"] = function() {return Module["asm"]["bc"].apply(null, arguments)};
var _browser_sound_off = Module["_browser_sound_off"] = function() {return Module["asm"]["cc"].apply(null, arguments)};
var _browser_sound_on = Module["_browser_sound_on"] = function() {return Module["asm"]["dc"].apply(null, arguments)};
var _browser_pause = Module["_browser_pause"] = function() {return Module["asm"]["ec"].apply(null, arguments)};
var _browser_resume = Module["_browser_resume"] = function() {return Module["asm"]["fc"].apply(null, arguments)};
var _browser_terminate = Module["_browser_terminate"] = function() {return Module["asm"]["gc"].apply(null, arguments)};
var _gamepix_sound_off = Module["_gamepix_sound_off"] = function() {return Module["asm"]["hc"].apply(null, arguments)};
var _gamepix_sound_on = Module["_gamepix_sound_on"] = function() {return Module["asm"]["ic"].apply(null, arguments)};
var _gamepix_pause = Module["_gamepix_pause"] = function() {return Module["asm"]["jc"].apply(null, arguments)};
var _gamepix_resume = Module["_gamepix_resume"] = function() {return Module["asm"]["kc"].apply(null, arguments)};
var _doSetMainLoop = Module["_doSetMainLoop"] = function() {return Module["asm"]["lc"].apply(null, arguments)};
var _sys_glfw_main_loop_touch = Module["_sys_glfw_main_loop_touch"] = function() {return Module["asm"]["mc"].apply(null, arguments)};
var _gamepix_buffers_start = Module["_gamepix_buffers_start"] = function() {return Module["asm"]["nc"].apply(null, arguments)};
var _gamepix_buffers_end = Module["_gamepix_buffers_end"] = function() {return Module["asm"]["oc"].apply(null, arguments)};
var _emOnKeyPress = Module["_emOnKeyPress"] = function() {return Module["asm"]["pc"].apply(null, arguments)};
var _native_sound_off = Module["_native_sound_off"] = function() {return Module["asm"]["qc"].apply(null, arguments)};
var _native_sound_on = Module["_native_sound_on"] = function() {return Module["asm"]["rc"].apply(null, arguments)};
var _native_pause = Module["_native_pause"] = function() {return Module["asm"]["sc"].apply(null, arguments)};
var _native_resume = Module["_native_resume"] = function() {return Module["asm"]["tc"].apply(null, arguments)};
var _launchTasksOrSendHeartbeat = Module["_launchTasksOrSendHeartbeat"] = function() {return Module["asm"]["uc"].apply(null, arguments)};
var _main = Module["_main"] = function() {return Module["asm"]["vc"].apply(null, arguments)};
var _onProductInfo = Module["_onProductInfo"] = function() {return Module["asm"]["wc"].apply(null, arguments)};
var _ntohs = Module["_ntohs"] = function() {return Module["asm"]["xc"].apply(null, arguments)};
var _htons = Module["_htons"] = function() {return Module["asm"]["yc"].apply(null, arguments)};
var _htonl = Module["_htonl"] = function() {return Module["asm"]["zc"].apply(null, arguments)};
var __ZSt18uncaught_exceptionv = Module["__ZSt18uncaught_exceptionv"] = function() {return Module["asm"]["Ac"].apply(null, arguments)};
var _setThrew = Module["_setThrew"] = function() {return Module["asm"]["Bc"].apply(null, arguments)};
var dynCall_iii = Module["dynCall_iii"] = function() {return Module["asm"]["Cc"].apply(null, arguments)};
var dynCall_iiii = Module["dynCall_iiii"] = function() {return Module["asm"]["Dc"].apply(null, arguments)};
var dynCall_iiiii = Module["dynCall_iiiii"] = function() {return Module["asm"]["Ec"].apply(null, arguments)};
var dynCall_vi = Module["dynCall_vi"] = function() {return Module["asm"]["Fc"].apply(null, arguments)};
var dynCall_vii = Module["dynCall_vii"] = function() {return Module["asm"]["Gc"].apply(null, arguments)};
var dynCall_viiii = Module["dynCall_viiii"] = function() {return Module["asm"]["Hc"].apply(null, arguments)};
var stackSave = Module["stackSave"] = function() {return Module["asm"]["Ic"].apply(null, arguments)};
var stackAlloc = Module["stackAlloc"] = function() {return Module["asm"]["Jc"].apply(null, arguments)};
var stackRestore = Module["stackRestore"] = function() {return Module["asm"]["Kc"].apply(null, arguments)};
var dynCall_ii = Module["dynCall_ii"] = function() {return Module["asm"]["Lc"].apply(null, arguments)};
var dynCall_viii = Module["dynCall_viii"] = function() {return Module["asm"]["Mc"].apply(null, arguments)};
var dynCall_vif = Module["dynCall_vif"] = function() {return Module["asm"]["Nc"].apply(null, arguments)};
var dynCall_iiif = Module["dynCall_iiif"] = function() {return Module["asm"]["Oc"].apply(null, arguments)};
var dynCall_iif = Module["dynCall_iif"] = function() {return Module["asm"]["Pc"].apply(null, arguments)};
var dynCall_v = Module["dynCall_v"] = function() {return Module["asm"]["Qc"].apply(null, arguments)};
var dynCall_viijii = Module["dynCall_viijii"] = function() {return Module["asm"]["Rc"].apply(null, arguments)};
var dynCall_iifif = Module["dynCall_iifif"] = function() {return Module["asm"]["Sc"].apply(null, arguments)};
var dynCall_iiffi = Module["dynCall_iiffi"] = function() {return Module["asm"]["Tc"].apply(null, arguments)};
var dynCall_iiffff = Module["dynCall_iiffff"] = function() {return Module["asm"]["Uc"].apply(null, arguments)};
var dynCall_iiff = Module["dynCall_iiff"] = function() {return Module["asm"]["Vc"].apply(null, arguments)};
var dynCall_viffi = Module["dynCall_viffi"] = function() {return Module["asm"]["Wc"].apply(null, arguments)};
var dynCall_viif = Module["dynCall_viif"] = function() {return Module["asm"]["Xc"].apply(null, arguments)};
var dynCall_viiff = Module["dynCall_viiff"] = function() {return Module["asm"]["Yc"].apply(null, arguments)};
var dynCall_iifii = Module["dynCall_iifii"] = function() {return Module["asm"]["Zc"].apply(null, arguments)};
var dynCall_viiiii = Module["dynCall_viiiii"] = function() {return Module["asm"]["_c"].apply(null, arguments)};
var dynCall_iiiiii = Module["dynCall_iiiiii"] = function() {return Module["asm"]["$c"].apply(null, arguments)};
var dynCall_iiifiiiii = Module["dynCall_iiifiiiii"] = function() {return Module["asm"]["ad"].apply(null, arguments)};
var dynCall_vifi = Module["dynCall_vifi"] = function() {return Module["asm"]["bd"].apply(null, arguments)};
var dynCall_iiiiiiiiii = Module["dynCall_iiiiiiiiii"] = function() {return Module["asm"]["cd"].apply(null, arguments)};
var dynCall_iiifiii = Module["dynCall_iiifiii"] = function() {return Module["asm"]["dd"].apply(null, arguments)};
var dynCall_iiiiiiiii = Module["dynCall_iiiiiiiii"] = function() {return Module["asm"]["ed"].apply(null, arguments)};
var dynCall_iiiiiii = Module["dynCall_iiiiiii"] = function() {return Module["asm"]["fd"].apply(null, arguments)};
var dynCall_viiiiiiii = Module["dynCall_viiiiiiii"] = function() {return Module["asm"]["gd"].apply(null, arguments)};
var dynCall_viff = Module["dynCall_viff"] = function() {return Module["asm"]["hd"].apply(null, arguments)};
var dynCall_vijii = Module["dynCall_vijii"] = function() {return Module["asm"]["id"].apply(null, arguments)};
var dynCall_vifii = Module["dynCall_vifii"] = function() {return Module["asm"]["jd"].apply(null, arguments)};
var dynCall_vidii = Module["dynCall_vidii"] = function() {return Module["asm"]["kd"].apply(null, arguments)};
var dynCall_jii = Module["dynCall_jii"] = function() {return Module["asm"]["ld"].apply(null, arguments)};
var dynCall_fii = Module["dynCall_fii"] = function() {return Module["asm"]["md"].apply(null, arguments)};
var dynCall_dii = Module["dynCall_dii"] = function() {return Module["asm"]["nd"].apply(null, arguments)};
var dynCall_fi = Module["dynCall_fi"] = function() {return Module["asm"]["od"].apply(null, arguments)};
var dynCall_iiiiffii = Module["dynCall_iiiiffii"] = function() {return Module["asm"]["pd"].apply(null, arguments)};
var dynCall_vifff = Module["dynCall_vifff"] = function() {return Module["asm"]["qd"].apply(null, arguments)};
var dynCall_viiif = Module["dynCall_viiif"] = function() {return Module["asm"]["rd"].apply(null, arguments)};
var dynCall_viiiiii = Module["dynCall_viiiiii"] = function() {return Module["asm"]["sd"].apply(null, arguments)};
var dynCall_viiiiiiiii = Module["dynCall_viiiiiiiii"] = function() {return Module["asm"]["td"].apply(null, arguments)};
var dynCall_jiiii = Module["dynCall_jiiii"] = function() {return Module["asm"]["ud"].apply(null, arguments)};
var dynCall_jiii = Module["dynCall_jiii"] = function() {return Module["asm"]["vd"].apply(null, arguments)};
var dynCall_fiif = Module["dynCall_fiif"] = function() {return Module["asm"]["wd"].apply(null, arguments)};
var dynCall_viffff = Module["dynCall_viffff"] = function() {return Module["asm"]["xd"].apply(null, arguments)};
var dynCall_iiiiiiii = Module["dynCall_iiiiiiii"] = function() {return Module["asm"]["yd"].apply(null, arguments)};
var dynCall_viiiif = Module["dynCall_viiiif"] = function() {return Module["asm"]["zd"].apply(null, arguments)};
var dynCall_iifiii = Module["dynCall_iifiii"] = function() {return Module["asm"]["Ad"].apply(null, arguments)};
var dynCall_iifiiii = Module["dynCall_iifiiii"] = function() {return Module["asm"]["Bd"].apply(null, arguments)};
var dynCall_viifiiii = Module["dynCall_viifiiii"] = function() {return Module["asm"]["Cd"].apply(null, arguments)};
var dynCall_viiiiiii = Module["dynCall_viiiiiii"] = function() {return Module["asm"]["Dd"].apply(null, arguments)};
var dynCall_viifiiiii = Module["dynCall_viifiiiii"] = function() {return Module["asm"]["Ed"].apply(null, arguments)};
var dynCall_iiifiiii = Module["dynCall_iiifiiii"] = function() {return Module["asm"]["Fd"].apply(null, arguments)};
var dynCall_iiiiif = Module["dynCall_iiiiif"] = function() {return Module["asm"]["Gd"].apply(null, arguments)};
var dynCall_viiiffi = Module["dynCall_viiiffi"] = function() {return Module["asm"]["Hd"].apply(null, arguments)};
var dynCall_iiiifi = Module["dynCall_iiiifi"] = function() {return Module["asm"]["Id"].apply(null, arguments)};
var dynCall_iiiiifiii = Module["dynCall_iiiiifiii"] = function() {return Module["asm"]["Jd"].apply(null, arguments)};
var dynCall_iiiif = Module["dynCall_iiiif"] = function() {return Module["asm"]["Kd"].apply(null, arguments)};
var dynCall_ji = Module["dynCall_ji"] = function() {return Module["asm"]["Ld"].apply(null, arguments)};
var dynCall_fif = Module["dynCall_fif"] = function() {return Module["asm"]["Md"].apply(null, arguments)};
var dynCall_jiji = Module["dynCall_jiji"] = function() {return Module["asm"]["Nd"].apply(null, arguments)};
var dynCall_iidiiii = Module["dynCall_iidiiii"] = function() {return Module["asm"]["Od"].apply(null, arguments)};
var dynCall_iiiiij = Module["dynCall_iiiiij"] = function() {return Module["asm"]["Pd"].apply(null, arguments)};
var dynCall_iiiiid = Module["dynCall_iiiiid"] = function() {return Module["asm"]["Qd"].apply(null, arguments)};
var dynCall_iiiiijj = Module["dynCall_iiiiijj"] = function() {return Module["asm"]["Rd"].apply(null, arguments)};
var dynCall_iiiiiijj = Module["dynCall_iiiiiijj"] = function() {return Module["asm"]["Sd"].apply(null, arguments)};

function invoke_vi (index, a1) {
  var sp = stackSave();
  try {dynCall_vi(index, a1)} catch (e) {
    stackRestore(sp);
    if (e !== e + 0 && e !== "longjmp") throw e;
    _setThrew(1, 0)
  }
}

function invoke_vii (index, a1, a2) {
  var sp = stackSave();
  try {dynCall_vii(index, a1, a2)} catch (e) {
    stackRestore(sp);
    if (e !== e + 0 && e !== "longjmp") throw e;
    _setThrew(1, 0)
  }
}

function invoke_viiii (index, a1, a2, a3, a4) {
  var sp = stackSave();
  try {dynCall_viiii(index, a1, a2, a3, a4)} catch (e) {
    stackRestore(sp);
    if (e !== e + 0 && e !== "longjmp") throw e;
    _setThrew(1, 0)
  }
}

function invoke_iii (index, a1, a2) {
  var sp = stackSave();
  try {return dynCall_iii(index, a1, a2)} catch (e) {
    stackRestore(sp);
    if (e !== e + 0 && e !== "longjmp") throw e;
    _setThrew(1, 0)
  }
}

function invoke_iiiii (index, a1, a2, a3, a4) {
  var sp = stackSave();
  try {return dynCall_iiiii(index, a1, a2, a3, a4)} catch (e) {
    stackRestore(sp);
    if (e !== e + 0 && e !== "longjmp") throw e;
    _setThrew(1, 0)
  }
}

function invoke_iiii (index, a1, a2, a3) {
  var sp = stackSave();
  try {return dynCall_iiii(index, a1, a2, a3)} catch (e) {
    stackRestore(sp);
    if (e !== e + 0 && e !== "longjmp") throw e;
    _setThrew(1, 0)
  }
}

Module["asm"] = asm;
Module["getMemory"] = getMemory;
Module["stringToUTF8"] = stringToUTF8;
Module["lengthBytesUTF8"] = lengthBytesUTF8;
Module["addRunDependency"] = addRunDependency;
Module["removeRunDependency"] = removeRunDependency;
Module["FS_createFolder"] = FS.createFolder;
Module["FS_createPath"] = FS.createPath;
Module["FS_createDataFile"] = FS.createDataFile;
Module["FS_createPreloadedFile"] = FS.createPreloadedFile;
Module["FS_createLazyFile"] = FS.createLazyFile;
Module["FS_createLink"] = FS.createLink;
Module["FS_createDevice"] = FS.createDevice;
Module["FS_unlink"] = FS.unlink;
Module["callMain"] = callMain;
Module["calledRun"] = calledRun;
var calledRun;

function ExitStatus (status) {
  this.name = "ExitStatus";
  this.message = "Program terminated with exit(" + status + ")";
  this.status = status
}

var calledMain = false;
dependenciesFulfilled = function runCaller () {
  if (!calledRun) run();
  if (!calledRun) dependenciesFulfilled = runCaller
};

function callMain (args) {
  args = args || [];
  var argc = args.length + 1;
  var argv = stackAlloc((argc + 1) * 4);
  HEAP32[argv >> 2] = allocateUTF8OnStack(thisProgram);
  for (var i = 1; i < argc; i++) {HEAP32[(argv >> 2) + i] = allocateUTF8OnStack(args[i - 1])}
  HEAP32[(argv >> 2) + argc] = 0;
  try {
    var ret = Module["_main"](argc, argv);
    exit(ret, true)
  } catch (e) {
    if (e instanceof ExitStatus) {return} else if (e == "SimulateInfiniteLoop") {
      noExitRuntime = true;
      return
    } else {
      var toLog = e;
      if (e && typeof e === "object" && e.stack) {toLog = [e, e.stack]}
      err("exception thrown: " + toLog);
      quit_(1, e)
    }
  } finally {calledMain = true}
}

function run (args) {
  args = args || arguments_;
  if (runDependencies > 0) {return}
  preRun();
  if (runDependencies > 0) return;

  function doRun () {
    if (calledRun) return;
    calledRun = true;
    Module["calledRun"] = true;
    if (ABORT) return;
    initRuntime();
    preMain();
    if (Module["onRuntimeInitialized"]) Module["onRuntimeInitialized"]();
    if (shouldRunNow) callMain(args);
    postRun()
  }

  if (Module["setStatus"]) {
    Module["setStatus"]("Running...");
    setTimeout(function() {
      setTimeout(function() {Module["setStatus"]("")}, 1);
      doRun()
    }, 1)
  } else {doRun()}
}

Module["run"] = run;

function exit (status, implicit) {
  if (implicit && noExitRuntime && status === 0) {return}
  if (noExitRuntime) {} else {
    ABORT = true;
    EXITSTATUS = status;
    exitRuntime();
    if (Module["onExit"]) Module["onExit"](status)
  }
  quit_(status, new ExitStatus(status))
}

function abort (what) {
  if (Module["onAbort"]) {Module["onAbort"](what)}
  what += "";
  out(what);
  err(what);
  ABORT = true;
  EXITSTATUS = 1;
  throw"abort(" + what + "). Build with -s ASSERTIONS=1 for more info."
}

Module["abort"] = abort;
if (Module["preInit"]) {
  if (typeof Module["preInit"] == "function") Module["preInit"] = [Module["preInit"]];
  while (Module["preInit"].length > 0) {Module["preInit"].pop()()}
}
var shouldRunNow = false;
if (Module["noInitialRun"]) shouldRunNow = false;
noExitRuntime = true;
run();
