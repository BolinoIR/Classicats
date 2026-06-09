!function r (s, a, u) {
  function l (t, e) {
    if (!a[t]) {
      if (!s[t]) {
        var i = "function" == typeof require && require;
        if (!e && i) return i(t, !0);
        if (d) return d(t, !0);
        var o = new Error("Cannot find module '" + t + "'");
        throw o.code = "MODULE_NOT_FOUND", o
      }
      var n = a[t] = {exports: {}};
      s[t][0].call(n.exports, function(e) {return l(s[t][1][e] || e)}, n, n.exports, r, s, a, u)
    }
    return a[t].exports
  }

  for (var d = "function" == typeof require && require, e = 0; e < u.length; e++) l(u[e]);
  return l
}({
  1: [function(e, t, i) {
    "use strict";
    var o = function() {
      function o (e, t) {
        for (var i = 0; i < t.length; i++) {
          var o = t[i];
          o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, o.key, o)
        }
      }

      return function(e, t, i) {return t && o(e.prototype, t), i && o(e, i), e}
    }();
    Object.defineProperty(i, "__esModule", {value: !0});
    var n = function() {
      function r (e, t, i) {
        var o = this;
        if (function(e, t) {if (!(e instanceof t)) throw new TypeError("Cannot call a class as a function")}(this, r), this.storeName = "files", !e.version) throw new Error("Illegal state exception, module should have version field");
        if (this.module = e, this.version = e.version, this.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB, this.indexedDB) try {
          var n = this.indexedDB.open("gpx-bigstorage (" + this.version + ")", 1);
          n.onerror = function(e) {i("Can't open BigStorage database" + n.error)}, n.onsuccess = function(e) {o.db = n.result, t(o), window.addEventListener("beforeunload", function() {o.db.close(), o.module.log("Closing database...")}, !1)}, n.onupgradeneeded = function(e) {try {o.db = n.result, o.db.onerror = function(e) {i("Can't upgrade BigStorage database: " + e)}, o.db.createObjectStore(o.storeName)} catch (e) {i("Can't upgrade BigStorage database")}}
        } catch (e) {i("ERR! Can't open BigStorage dabase " + e)} else i("Indexed db is not supported on this host")
      }

      return o(r, [{
        key: "put",
        value: function(t, i, o) {
          var n = this, r = 3 < arguments.length && void 0 !== arguments[3] ? arguments[3] : 0;
          try {
            var s = this.db.transaction(this.storeName, "readwrite");
            s.onerror = function(e) {n.module.log("ERR! Transaction write is errored, " + s.error)}, s.onabort = function(e) {n.module.log("ERR! Transaction write is aborted, " + s.error)}, s.oncomplete = function() {o()}, s.objectStore(this.storeName).put(i, t)
          } catch (e) {if (r < 3) this.module.log("ERR! Can't PUT data to cache, scheduling retry [" + (r + 1) + "] in 5 sec...", e), setTimeout(function() {return n.put(t, i, o, r + 1)}, 5e3); else this.module.log("ERR! Can't PUT data to cache, no more tries... ", e)}
        }
      }, {
        key: "get",
        value: function(e, t, i) {
          try {
            var o = this.db.transaction(this.storeName, "readonly").objectStore(this.storeName).get(e);
            o.onerror = function() {return i("Can't read value for key '" + e + "', " + o.error)}, o.onsuccess = function() {o.result && (0 < o.result.length || 0 < o.result.byteLength) ? t(o.result) : i("ERR! Result is empty for key '" + e + "', result: " + o.result)}
          } catch (e) {this.module.log("ERR! Can't get key from cache", e)}
        }
      }, {
        key: "forEach", value: function(i, o) {
          var e = this;
          try {
            var t = this.db.transaction(this.storeName, "readonly").objectStore(this.storeName).openCursor();
            t.onerror = function() {return onerror("Can't open cursor on " + e.storeName + ", " + t.error)}, t.onsuccess = function(e) {
              var t = e.target.result;
              t ? (i(t.key.toString(), t.value), t.continue()) : o()
            }
          } catch (e) {this.module.log("ERR! Can't get keys from cache", e), o()}
        }
      }]), r
    }();
    i.default = n
  }, {}], 2: [function(e, t, i) {
    "use strict";
    var o = function() {
      function o (e, t) {
        for (var i = 0; i < t.length; i++) {
          var o = t[i];
          o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, o.key, o)
        }
      }

      return function(e, t, i) {return t && o(e.prototype, t), i && o(e, i), e}
    }();
    Object.defineProperty(i, "__esModule", {value: !0});
    var n = function() {
      function e () {!function(e, t) {if (!(e instanceof t)) throw new TypeError("Cannot call a class as a function")}(this, e)}

      return o(e, [{key: "put", value: function(e, t, i) {}}, {
        key: "get",
        value: function(e, t, i) {i("BigStorage is not supported on this host")}
      }, {key: "forEach", value: function(e, t) {t()}}]), e
    }();
    i.default = n
  }, {}], 3: [function(e, t, i) {
    "use strict";
    Object.defineProperty(i, "__esModule", {value: !0});
    var o = e("./bigstorage-db"), n = e("./bigstorage-noop");
    i.default = function(t, i) {new o.default(t, i, function(e) {t.log("ERR! Can't initalize BigStorageDb, cause: " + e), i(new n.default)})}
  }, {"./bigstorage-db": 1, "./bigstorage-noop": 2}], 4: [function(e, t, i) {
    "use strict";
    var n = function() {
      function o (e, t) {
        for (var i = 0; i < t.length; i++) {
          var o = t[i];
          o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, o.key, o)
        }
      }

      return function(e, t, i) {return t && o(e.prototype, t), i && o(e, i), e}
    }();
    Object.defineProperty(i, "__esModule", {value: !0});
    var o = function() {
      function o () {!function(e, t) {if (!(e instanceof t)) throw new TypeError("Cannot call a class as a function")}(this, o)}

      return n(o, null, [{
        key: "decode", value: function(e) {
          var t = Date.now(), i = window.BrotliDecode(e);
          return o.brotliTime += Date.now() - t, i
        }
      }]), o
    }();
    o.brotliTime = 0, i.default = o
  }, {}], 5: [function(e, t, i) {
    "use strict";
    var o = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(e) {return typeof e} : function(e) {return e && "function" == typeof Symbol && e.constructor === Symbol && e !== Symbol.prototype ? "symbol" : typeof e},
      n = function() {
        function o (e, t) {
          for (var i = 0; i < t.length; i++) {
            var o = t[i];
            o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, o.key, o)
          }
        }

        return function(e, t, i) {return t && o(e.prototype, t), i && o(e, i), e}
      }();
    Object.defineProperty(i, "__esModule", {value: !0});
    var s = e("./loader-xhr"), r = function() {
      function i () {
        !function(e, t) {if (!(e instanceof t)) throw new TypeError("Cannot call a class as a function")}(this, i), this.caniuse = {};
        var f = this;
        this.wasmSupported = !1;
        try {
          if ("object" === ("undefined" == typeof WebAssembly ? "undefined" : o(WebAssembly)) && "function" == typeof WebAssembly.instantiate && "function" == typeof WebAssembly.compile) {
            var e = new WebAssembly.Module(Uint8Array.of(0, 97, 115, 109, 1, 0, 0, 0));
            e instanceof WebAssembly.Module && (this.wasmSupported = new WebAssembly.Instance(e) instanceof WebAssembly.Instance)
          }
        } catch (e) {}
        this.hardwareConcurrency = 0 | navigator.hardwareConcurrency, this.legacyVm = void 0 === Int32Array.from || !(Math.imul && Math.fround && Math.clz32 && Math.trunc), this.brotliSupported = !this.legacyVm, this.webpSupported = !1;
        var t = new Image;
        t.onload = function() {f.webpSupported = 2 === t.width && 1 === t.height}, t.src = "data:image/webp;base64,UklGRjIAAABXRUJQVlA4ICYAAACyAgCdASoCAAEALmk0mk0iIiIiIgBoSygABc6zbAAA/v56QAAAAA==", Math.imul && -5 === Math.imul(4294967295, 5) || (Math.imul = function(e, t) {
          var i = 65535 & e, o = 65535 & t;
          return i * o + ((e >>> 16) * o + i * (t >>> 16) << 16) | 0
        }), Math.imul = Math.imul, Math.fround || (Math.fround = function(e) {return e}), Math.fround = Math.fround, Math.clz32 || (Math.clz32 = function(e) {
          e >>>= 0;
          for (var t = 0; t < 32; t++) if (e & 1 << 31 - t) return t;
          return 32
        }), Math.clz32 = Math.clz32, Math.trunc || (Math.trunc = function(e) {return e < 0 ? Math.ceil(e) : Math.floor(e)}), Math.trunc = Math.trunc, this.systemInfo = function() {
          var e, t, i, o = navigator.appVersion, n = navigator.userAgent, r = navigator.appName,
            s = navigator.appVersion, a = parseInt(navigator.appVersion, 10);
          -1 != (t = n.indexOf("Opera")) ? (r = "Opera", s = n.substring(t + 6), -1 != (t = n.indexOf("Version")) && (s = n.substring(t + 8))) : -1 != (t = n.indexOf("MSIE")) ? (r = "Microsoft Internet Explorer", s = n.substring(t + 5)) : -1 != (t = n.indexOf("Edge")) ? (r = "Edge", s = n.substring(t + 5)) : -1 != (t = n.indexOf("Chrome")) ? (r = "Chrome", s = n.substring(t + 7)) : -1 != (t = n.indexOf("Safari")) ? (r = "Safari", s = n.substring(t + 7), -1 != (t = n.indexOf("Version")) && (s = n.substring(t + 8))) : -1 != (t = n.indexOf("Firefox")) ? (r = "Firefox", s = n.substring(t + 8)) : -1 != n.indexOf("Trident/") ? (r = "Microsoft Internet Explorer", s = n.substring(n.indexOf("rv:") + 3)) : (e = n.lastIndexOf(" ") + 1) < (t = n.lastIndexOf("/")) && (r = n.substring(e, t), s = n.substring(t + 1), r.toLowerCase() == r.toUpperCase() && (r = navigator.appName)), -1 != (i = s.indexOf(";")) && (s = s.substring(0, i)), -1 != (i = s.indexOf(" ")) && (s = s.substring(0, i)), -1 != (i = s.indexOf(")")) && (s = s.substring(0, i)), a = parseInt("" + s, 10), isNaN(a) ? (s = "" + parseFloat(navigator.appVersion), a = parseInt(navigator.appVersion, 10)) : s = "" + parseFloat(s);
          var u = /Mobile|mini|Fennec|Android|iP(ad|od|hone)/.test(o), l = "-", d = [{s: "Windows 3.11", r: /Win16/}, {
            s: "Windows 95",
            r: /(Windows 95|Win95|Windows_95)/
          }, {s: "Windows ME", r: /(Win 9x 4.90|Windows ME)/}, {
            s: "Windows 98",
            r: /(Windows 98|Win98)/
          }, {s: "Windows CE", r: /Windows CE/}, {
            s: "Windows 2000",
            r: /(Windows NT 5.0|Windows 2000)/
          }, {s: "Windows XP", r: /(Windows NT 5.1|Windows XP)/}, {
            s: "Windows Server 2003",
            r: /Windows NT 5.2/
          }, {s: "Windows Vista", r: /Windows NT 6.0/}, {
            s: "Windows 7",
            r: /(Windows 7|Windows NT 6.1)/
          }, {s: "Windows 8.1", r: /(Windows 8.1|Windows NT 6.3)/}, {
            s: "Windows 8",
            r: /(Windows 8|Windows NT 6.2)/
          }, {s: "Windows 10", r: /(Windows 10|Windows NT 10.0)/}, {
            s: "Windows NT 4.0",
            r: /(Windows NT 4.0|WinNT4.0|WinNT|Windows NT)/
          }, {s: "Windows ME", r: /Windows ME/}, {s: "Android", r: /Android/}, {
            s: "Open BSD",
            r: /OpenBSD/
          }, {s: "Sun OS", r: /SunOS/}, {s: "Linux", r: /(Linux|X11)/}, {
            s: "iOS",
            r: /(iPhone|iPad|iPod)/
          }, {s: "Mac OS X", r: /Mac OS X/}, {s: "Mac OS", r: /(MacPPC|MacIntel|Mac_PowerPC|Macintosh)/}, {
            s: "QNX",
            r: /QNX/
          }, {s: "UNIX", r: /UNIX/}, {s: "BeOS", r: /BeOS/}, {s: "OS/2", r: /OS\/2/}, {
            s: "Search Bot",
            r: /(nuhk|Googlebot|Yammybot|Openbot|Slurp|MSNBot|Ask Jeeves\/Teoma|ia_archiver)/
          }];
          for (var h in d) {
            var c = d[h];
            if (c.r.test(n)) {
              l = c.s;
              break
            }
          }
          var m = "-";
          try {
            switch (/Windows/.test(l) && (m = /Windows (.*)/.exec(l)[1], l = "Windows"), l) {
              case"Mac OS X":
                m = /Mac OS X (10[\.\_\d]+)/.exec(n)[1];
                break;
              case"Android":
                m = /Android ([\.\_\d]+)/.exec(n)[1];
                break;
              case"iOS":
                m = (m = /OS (\d+)_(\d+)_?(\d+)?/.exec(o))[1] + "." + m[2] + "." + (0 | m[3])
            }
          } catch (e) {}
          return {
            width: window.innerWidth,
            height: window.innerHeight,
            browser: r,
            browserVersion: s,
            mobile: u,
            os: l,
            osVersion: m,
            language: "en",
            hasWebGL: window.WebGLRenderingContext ? 1 : 0,
            gpu: function() {
              var e = document.createElement("canvas").getContext("experimental-webgl");
              if (e) {
                var t = e.getExtension("WEBGL_debug_renderer_info");
                if (t) return e.getParameter(t.UNMASKED_RENDERER_WEBGL)
              }
              return "-"
            }(),
            hasCursorLock: 0,
            hasFullscreen: 0,
            hasThreads: !1,
            hasWasm: f.wasmSupported,
            webglContextAttributes: {preserveDrawingBuffer: !1}
          }
        }()
      }

      return n(i, [{
        key: "getParameterByName",
        value: function(e, t) {
          t || (t = window.location.href), e = e.replace(/[\[\]]/g, "\\$&");
          var i = new RegExp("[?&]" + e + "(=([^&#]*)|&|#|$)").exec(t);
          return i ? i[2] ? decodeURIComponent(i[2].replace(/\+/g, " ")) : "" : null
        }
      }, {key: "caniuseBrotli", value: function(e) {return Promise.resolve(!1)}}, {
        key: "caniuseGzip",
        value: function(e) {return Promise.resolve(!1)}
      }, {
        key: "caniuseTool", value: function(o, n) {
          var r = this;
          return new Promise(function(e) {
            if (0 <= o.indexOf("/caniuse?time=")) e(!1); else {
              var i = o.substr(0, o.lastIndexOf("/")), t = n + "-" + i;
              void 0 === r.caniuse[t] && (r.caniuse[t] = new Promise(function(t) {
                new s.default(i + n.substr(0, 2) + "/caniuse?time=" + Date.now(), {
                  fail: function() {return t(!1)},
                  success: function(e) {return t(e === n)}
                })
              })), r.caniuse[t].then(e)
            }
          })
        }
      }]), i
    }();
    i.GpxHostClass = r, i.GpxHost = new r
  }, {"./loader-xhr": 8}], 6: [function(e, t, i) {
    "use strict";
    var o = function() {
      function o (e, t) {
        for (var i = 0; i < t.length; i++) {
          var o = t[i];
          o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, o.key, o)
        }
      }

      return function(e, t, i) {return t && o(e.prototype, t), i && o(e, i), e}
    }();
    Object.defineProperty(i, "__esModule", {value: !0});
    var n = function() {
      function i (e, t) {!function(e, t) {if (!(e instanceof t)) throw new TypeError("Cannot call a class as a function")}(this, i), this.mode = "no-op", this.module = e, t()}

      return o(i, [{
        key: "ptrToBuffer",
        value: function(e, t) {return new Int8Array(this.module.HEAP8.subarray(e, e + t))}
      }, {
        key: "bufferToPtr",
        value: function(e, t) {e.constructor === Int8Array ? this.module.HEAP8.set(e, t) : this.module.HEAP8.set(new Int8Array(e), t)}
      }, {key: "queueSize", value: function() {return 0}}, {key: "squeeze", value: function() {}}]), i
    }();
    i.default = n
  }, {}], 7: [function(e, t, i) {
    "use strict";
    Object.defineProperty(i, "__esModule", {value: !0});
    var o = Object.assign || function(e) {
      for (var t, i = 1, o = arguments.length; i < o; i++) for (var n in t = arguments[i]) Object.prototype.hasOwnProperty.call(t, n) && (e[n] = t[n]);
      return e
    }, n = {
      lines: 12,
      length: 7,
      width: 5,
      radius: 10,
      scale: 1,
      corners: 1,
      color: "#000",
      fadeColor: "transparent",
      animation: "spinner-line-fade-default",
      rotate: 0,
      direction: 1,
      speed: 1,
      zIndex: 2e9,
      className: "spinner",
      top: "50%",
      left: "50%",
      shadow: "0 0 1px transparent",
      position: "absolute"
    }, r = function() {
      function e (e) {void 0 === e && (e = {}), this.opts = o({}, n, e)}

      return e.prototype.spin = function(e) {
        return this.stop(), this.el = document.createElement("div"), this.el.className = this.opts.className, this.el.setAttribute("role", "progressbar"), d(this.el, {
          position: this.opts.position,
          width: 0,
          zIndex: this.opts.zIndex,
          left: this.opts.left,
          top: this.opts.top,
          transform: "scale(" + this.opts.scale + ")"
        }), e && e.insertBefore(this.el, e.firstChild || null), function(e, t) {
          var i = Math.round(t.corners * t.width * 500) / 1e3 + "px", o = "none";
          !0 === t.shadow ? o = "0 2px 4px #000" : "string" == typeof t.shadow && (o = t.shadow);
          for (var n = function(e) {
            for (var t = /^\s*([a-zA-Z]+\s+)?(-?\d+(\.\d+)?)([a-zA-Z]*)\s+(-?\d+(\.\d+)?)([a-zA-Z]*)(.*)$/, i = [], o = 0, n = e.split(","); o < n.length; o++) {
              var r = n[o], s = r.match(t);
              if (null !== s) {
                var a = +s[2], u = +s[5], l = s[4], d = s[7];
                0 !== a || l || (l = d), 0 !== u || d || (d = l), l === d && i.push({
                  prefix: s[1] || "",
                  x: a,
                  y: u,
                  xUnits: l,
                  yUnits: d,
                  end: s[8]
                })
              }
            }
            return i
          }(o), r = 0; r < t.lines; r++) {
            var s = ~~(360 / t.lines * r + t.rotate), a = d(document.createElement("div"), {
              position: "absolute",
              top: -t.width / 2 + "px",
              width: t.length + t.width + "px",
              height: t.width + "px",
              background: h(t.fadeColor, r),
              borderRadius: i,
              transformOrigin: "left",
              transform: "rotate(" + s + "deg) translateX(" + t.radius + "px)"
            }), u = r * t.direction / t.lines / t.speed;
            u -= 1 / t.speed;
            var l = d(document.createElement("div"), {
              width: "100%",
              height: "100%",
              background: h(t.color, r),
              borderRadius: i,
              boxShadow: c(n, s),
              animation: 1 / t.speed + "s linear " + u + "s infinite " + t.animation
            });
            a.appendChild(l), e.appendChild(a)
          }
        }(this.el, this.opts), this
      }, e.prototype.stop = function() {return this.el && ("undefined" != typeof requestAnimationFrame ? cancelAnimationFrame(this.animateId) : clearTimeout(this.animateId), this.el.parentNode && this.el.parentNode.removeChild(this.el), this.el = void 0), this}, e
    }();

    function d (e, t) {
      for (var i in t) e.style[i] = t[i];
      return e
    }

    function h (e, t) {return "string" == typeof e ? e : e[t % e.length]}

    function c (e, t) {
      for (var i, o, n, r, s, a = [], u = 0, l = e; u < l.length; u++) {
        var d = l[u],
          h = (i = d.x, o = d.y, void 0, n = t * Math.PI / 180, r = Math.sin(n), s = Math.cos(n), [Math.round(1e3 * (i * s + o * r)) / 1e3, Math.round(1e3 * (-i * r + o * s)) / 1e3]);
        a.push(d.prefix + h[0] + d.xUnits + " " + h[1] + d.yUnits + d.end)
      }
      return a.join(", ")
    }

    i.Spinner = r;
    var s = document.head || document.getElementsByTagName("head")[0], a = document.createElement("style");
    a.type = "text/css", a.styleSheet ? a.styleSheet.cssText = d : a.appendChild(document.createTextNode("\n@keyframes spinner-line-fade-more {\n    0%, 100% {\n      opacity: 0; /* minimum opacity */\n    }\n    1% {\n      opacity: 1;\n    }\n  }\n\n  @keyframes spinner-line-fade-quick {\n    0%, 39%, 100% {\n      opacity: 0.25; /* minimum opacity */\n    }\n    40% {\n      opacity: 1;\n    }\n  }\n\n  @keyframes spinner-line-fade-default {\n    0%, 100% {\n      opacity: 0.22; /* minimum opacity */\n    }\n    1% {\n      opacity: 1;\n    }\n  }\n\n")), s.appendChild(a);
    var u = new r({color: "#fff", lines: 12}), l = !1;

    function m () {u.countdownIntervalId && (clearInterval(u.countdownIntervalId), delete u.countdownIntervalId), u.countdownDiv && (u.el.removeChild(u.countdownDiv), delete u.countdownDiv)}

    i.showLoadingUi = function() {return !l && (l = !0, u.spin(document.body), !0)}, i.showLoadingCoundown = function(e) {
      if (!l) return 0;
      u.countdownDiv || (u.countdownDiv = d(document.createElement("div"), {
        top: 0,
        color: "white",
        "margin-left": "-5px",
        "margin-top": "25px",
        "font-size": "15px"
      }), u.el.appendChild(u.countdownDiv)), u.countdown = e, u.countdownDiv.innerHTML = "" + e, u.countdownIntervalId || (u.countdownIntervalId = setInterval(function() {u.countdown--, u.countdownDiv.innerHTML = "" + u.countdown, 0 === u.countdown && m()}, 300));
      return Date.now() + 300 * e
    }, i.hideLoadingCoundown = m, i.hideLoadingUi = function() {l && (m(), u.stop(), l = !1)}
  }, {}], 8: [function(e, t, i) {
    "use strict";
    var o = function() {
      function o (e, t) {
        for (var i = 0; i < t.length; i++) {
          var o = t[i];
          o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, o.key, o)
        }
      }

      return function(e, t, i) {return t && o(e.prototype, t), i && o(e, i), e}
    }();
    Object.defineProperty(i, "__esModule", {value: !0});
    var n = e("./bigstorage/bigstorage-noop"), s = e("./brotli");
    i.LoaderXhrData = {
      "bin.hd.data.rest.js": 19792,
      "bin.data.rest.js": 19700,
      "wbin._.js": 4716180,
      "bin.mem.js": 1338768,
      "bin.hd.data.rest._.js": 1805972,
      "bin.data.startup.js": 14557,
      "bin-standalone.mem.js": 1336272,
      "wbin-standalone._.js": 4712883,
      "bin.hd.data.startup._.js": 4776906,
      "bin-standalone.js": 46589823,
      "bin.hd.data.startup.js": 14699,
      "wbin-standalone.js": 254884,
      "bin.data.rest._.js": 1646803,
      "bin.data.startup._.js": 3968801
    }, i.LoaderXhrDataGzipped = {
      "bin.hd.data.rest.js": 4594,
      "bin.data.rest.js": 4593,
      "wbin._.js": 1349564,
      "bin.mem.js": 284340,
      "bin.hd.data.rest._.js": 764203,
      "bin.data.startup.js": 3694,
      "bin-standalone.mem.js": 283793,
      "wbin-standalone._.js": 1348541,
      "bin.hd.data.startup._.js": 2368985,
      "bin-standalone.js": 3171500,
      "bin.hd.data.startup.js": 3697,
      "wbin-standalone.js": 64466,
      "bin.data.rest._.js": 611544,
      "bin.data.startup._.js": 1573991
    };
    var r = function() {
      function r (e, t) {
        var i = this;
        !function(e, t) {if (!(e instanceof t)) throw new TypeError("Cannot call a class as a function")}(this, r), this.bytesReceived = 0, this.useCache = !1, this.resource = e, this.brotli = r.brotli, this.startedAt = Date.now(), this.bytesReceived = 0, this.success = t.success, this.fail = t.fail, this.progress = t.progress, this.responseType = t.responseType, this.method = t.method || "GET", this.data = t.data;
        var o = r.mapping(e);
        if ("string" == typeof o) {
          this.brotli && (o += ".br"), this.url = o, this.useCache = "GET" === this.method && this.url.indexOf("?") < 0 && !(this.url.startsWith("http:") || this.url.startsWith("https:"));
          var n = function(e) {r.log("Loader: DOWNLOADING '" + i.url + "', reason: " + e), i.makeHttpRequest()};
          this.useCache ? r.cache.get(this.url, function(e) {r.log("Loader: FROM CACHE '" + i.url + "'"), i.success(e, "cache")}, n) : n("cache is disabled")
        } else this.success(o, "external")
      }

      return o(r, [{
        key: "_onReadyStateChange",
        value: function() {
          if (4 === this.xhr.readyState) if (null != i.LoaderXhrDataGzipped[this.resource] ? r.bytesReceived += i.LoaderXhrDataGzipped[this.resource] : r.bytesReceived += this.bytesReceived, r.xhrTime += Date.now() - this.startedAt, 200 === this.xhr.status) {
            if (this.success) {
              var e = void 0;
              if (this.brotli) {
                var t = s.default.decode(new Int8Array(this.xhr.response));
                e = "arraybuffer" === this.responseType ? t.buffer : this.arrayBufferToString(t)
              } else e = this.xhr.response;
              this.useCache && (r.log("Loader: PUT '" + this.url + "'"), r.cache.put(this.url, e, function() {})), this.success(e, "http")
            }
          } else this.fail && (this.fail(this.url, this.xhr.status, "onReadyStateChange"), delete this.fail)
        }
      }, {
        key: "arrayBufferToString",
        value: function(e) {
          for (var t = new Uint16Array(e), i = t.length, o = "", n = Math.pow(2, 16) - 1, r = 0; r < i;) i < r + n && (n = i - r), o += String.fromCharCode.apply(null, t.subarray(r, r + n)), r += n;
          return o
        }
      }, {
        key: "makeHttpRequest", value: function() {
          var t = this;
          this.xhr = new XMLHttpRequest, this.xhr.open(this.method, this.url, !0), "POST" === this.method && this.xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded"), this.xhr.overrideMimeType("text/plain; charset=x-user-defined"), "function" == typeof this.xhr.addEventListener && (this.xhr.addEventListener("progress", function(e) {t.bytesReceived = e.loaded, t.progress && t.progress(e.total, e.loaded)}), this.xhr.addEventListener("error", function(e) {t.fail && (t.fail(t.url, t.xhr.status, "error event"), delete t.fail)})), this.xhr.onreadystatechange = function() {return t._onReadyStateChange()}, this.brotli ? this.xhr.responseType = "arraybuffer" : this.responseType && (this.xhr.responseType = this.responseType), this.xhr.send(this.data)
        }
      }], [{key: "mapping", value: function(e) {return e}}, {key: "log", value: function(e) {}}]), r
    }();
    r.cache = new n.default, r.bytesReceived = 0, r.xhrTime = 0, r.brotli = !1, i.default = r
  }, {"./bigstorage/bigstorage-noop": 2, "./brotli": 4}], 9: [function(require, module, exports) {
    "use strict";
    var _slicedToArray = function(e, t) {
        if (Array.isArray(e)) return e;
        if (Symbol.iterator in Object(e)) return function(e, t) {
          var i = [], o = !0, n = !1, r = void 0;
          try {for (var s, a = e[Symbol.iterator](); !(o = (s = a.next()).done) && (i.push(s.value), !t || i.length !== t); o = !0) ;} catch (e) {n = !0, r = e} finally {try {!o && a.return && a.return()} finally {if (n) throw r}}
          return i
        }(e, t);
        throw new TypeError("Invalid attempt to destructure non-iterable instance")
      },
      _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(e) {return typeof e} : function(e) {return e && "function" == typeof Symbol && e.constructor === Symbol && e !== Symbol.prototype ? "symbol" : typeof e},
      _createClass = function() {
        function o (e, t) {
          for (var i = 0; i < t.length; i++) {
            var o = t[i];
            o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, o.key, o)
          }
        }

        return function(e, t, i) {return t && o(e.prototype, t), i && o(e, i), e}
      }();

    function _classCallCheck (e, t) {if (!(e instanceof t)) throw new TypeError("Cannot call a class as a function")}

    Object.defineProperty(exports, "__esModule", {value: !0});
    var bigstorage_1 = require("./bigstorage/bigstorage"), brotli_1 = require("./brotli"), host_1 = require("./host"),
      libgamepix_1 = require("./libgamepix"), loader_ui_1 = require("./loader-ui"),
      loader_xhr_1 = require("./loader-xhr"), autogenerated_runtime_1 = require("./runtimes/autogenerated-runtime"),
      Loader = function() {
        function Loader (e, t, i) {
          var N = this;
          _classCallCheck(this, Loader), this.startedAt = 0, this.wasmCompileTime = 0, this.wasmInstantiateTime = 0, this.libStartupTime = 0, this.moduleReady = !1, this.binReady = !1, this.memReady = !1, this.dataReady = !1, this.runReady = !1, this.runtimeReady = !1, this.dataFileReady = !1, (i.loader = this).binfile = e, this.datajs = t, this.module = i, this.startedAt = Date.now(), this.module.scriptFileName = t, this.module.dataFileName = t, this.module.noInitialRun = !0, this.module.showLoadingUi || (this.module.showLoadingUi = loader_ui_1.showLoadingUi, this.module.showLoadingCoundown = loader_ui_1.showLoadingCoundown, this.module.hideLoadingUi = loader_ui_1.hideLoadingUi), this.module.preRun || (this.module.preRun = []), this.module.postRun || (this.module.postRun = []), this.module.log || (this.module.log = function() {
            var e = "object" === _typeof(window.vConsole) || 0 <= window.location.href.indexOf("ngrok.io") || 0 <= window.location.href.indexOf("localhost") || 0 <= window.location.href.indexOf("127.0.0.1"),
              t = [Date.now() - this.startedAt + "ms | "], i = !0, o = !1, n = void 0;
            try {
              for (var r, s = arguments[Symbol.iterator](); !(i = (r = s.next()).done); i = !0) {
                var a = r.value;
                t.push(a)
              }
            } catch (e) {o = !0, n = e} finally {try {!i && s.return && s.return()} finally {if (o) throw n}}
            0 < arguments.length && "string" == typeof arguments[0] ? 0 === arguments[0].indexOf("ERR!") ? console.error.apply(console, t) : e && (0 === arguments[0].indexOf("WARN!") ? console.warn.apply(console, t) : console.log.apply(console, t)) : e && console.log.apply(console, t)
          }.bind(this)), this.module.mapping || (this.module.mapping = function(e) {return e}), loader_xhr_1.default.mapping = this.module.mapping, void 0 === this.module.useIndexedDb && (this.module.useIndexedDb = !0), this.module.useIndexedDb || this.module.log("WARN! IndexedDb is disabled"), void 0 === this.module.wasm && (this.module.wasm = !0), this.module.wasm && !host_1.GpxHost.wasmSupported && (this.module.wasm = !1, this.module.log("WARN! WASM is diabled because host does not support it")), !this.module.wasm && host_1.GpxHost.wasmSupported && this.module.log("INFO: WASM disabled; using asm.js runtime"), this.wasmCompileTime = 0, this.wasmInstantiateTime = 0, this.datafile = this.datajs.replace(".js", "._.js"), this.mem = this.binfile.replace(".js", ".mem.js"), this.wasmjs = "w" + this.binfile, this.wasm = this.wasmjs.replace(".js", "._.js"), this.module.name = "cats", this.module.version = "cats.1 2019-09-11 09:57:32 (15e32dd)", this.module.projectVersion = "1", this.module.engineVersion = "", this.module.wasm && (this.module.version += " [wasm]"), this.module.brotli && (this.module.version += " [brotli]"), this.module.debug && (document.title = this.module.version), this.module.startedAt = Date.now(), this.module.noImageDecoding = !0, this.module.noAudioDecoding = !0, this.module.legacyVm = host_1.GpxHost.legacyVm, this.module.eval = !0, this.module.stages = {}, this.module.maxResolution || (0 < this.datajs.indexOf(".hd.") ? this.module.maxResolution = 1920 : this.module.maxResolution = 960), this.module.onRuntimeInitialized = function() {return N.runtimeReady = !0, N.tryRun()}, (this.module.width || this.module.height) && (this.module.log("WARN! Setting Module.width or Module.height is deprecated please use Module.aspect"), this.module.aspect = this.module.width / this.module.height), this.module.aspect || (this.module.log("ERR! Module.aspect is undefined using 0.7"), this.module.aspect = .7), this.module.width = window.innerWidth, this.module.width < 160 && (this.module.log("ERR! window.innerWidth, window.innerHeight is too small, using default resolution: " + this.module.maxResolution), this.module.width = this.module.maxResolution), this.module.height = this.module.width / this.module.aspect, this.module.getDpi = function() {return N.module.dpi}, this.module.loadResource = this.loadResource.bind(this);
          var L = this.module.mainReady;
          if (this.module.mainReady = function(e, t, i, o, n, r, s) {
            var a = void 0, u = Date.now(), l = u - N.module.startedAt,
              d = Math.max(N.module.stages.bin, N.module.stages.datafile, N.module.stages.datajs, N.module.stages.mem),
              h = N.module.stages["eval.bin"] + N.module.stages["eval.data"], c = t - N.module.mainStartedAt, m = u - t,
              f = l - d - brotli_1.default.brotliTime - h - c - m - N.wasmInstantiateTime,
              p = function(e) {return Math.round(100 * e) / 100}, g = parseFloat(N.module.argv[0]),
              y = parseFloat(N.module.argv[1]), v = g / N.module.canvas.width, b = y / N.module.canvas.height,
              w = [["--"], ["    Version: ", N.module.version, " ", N.module.runtime.name], ["       Size: ", p(loader_xhr_1.default.bytesReceived / 1024 / 1024), " Mb", " idb: ", N.module.useIndexedDb], ["     Canvas: ", p(g) + "x" + p(y) + " (" + p(g / y) + "), dpi: " + p(v) + "x" + p(b)], ["    Workers: ", JSON.stringify(N.module.workers || "") + " [" + N.module.libgamepix.mode + "] queue " + N.module.libgamepix.queueSize()], [" Total time: ", l, " ms, (" + (l - d) + " ms)"], ["        XHR: ", d, " ms, (" + loader_xhr_1.default.xhrTime + " ms)"], ["   lib time: ", N.libStartupTime, " ms"], ["  wasm load: ", N.wasmCompileTime + N.wasmInstantiateTime, " ms, (compile " + N.wasmCompileTime + " ms)"], ["       eval: ", h, " ms"], ["  eval main: ", c, " ms"], ["      frame: ", m, " ms, main: " + (i - t) + " ms"], ["     brotli: ", brotli_1.default.brotliTime, " ms"], ["       webp: ", o + n, " ms, callbackTime: " + n + " ms", host_1.GpxHost.webpSupported ? " [native]" : " [js]"], ["       task: ", r + s, " ms, lowTime: " + s + " ms"], ["frame count: ", e], ["       diff: ", f, " ms"]];
            if (N.module.debug && (document.title += " - mainReady"), N.module.appInsights) {
              var x = N.getGameProperties(), R = {}, _ = !0, A = !1, S = void 0;
              try {for (var T, E = Array.from(w)[Symbol.iterator](); !(_ = (T = E.next()).done); _ = !0) 1 < (a = T.value).length && ("number" == typeof a[1] ? R[(a[0] + "").trim()] = a[1] : x[(a[0] + "").trim()] = a.slice(1).join(""))} catch (e) {A = !0, S = e} finally {try {!_ && E.return && E.return()} finally {if (A) throw S}}
              N.module.appInsights.trackEvent({
                name: "mainReady",
                properties: x,
                measurements: R
              }), N.module.appInsights.flush(), N.module.log("Telemtry sent to application insights")
            }
            for (var M = [], O = 0; O < w.length; ++O) M[O] = w[O].join("");
            N.module.log(location.href), N.module.log("Host: " + JSON.stringify(host_1.GpxHost));
            var D = !0, W = !1, C = void 0;
            try {for (var I, k = Array.from(M)[Symbol.iterator](); !(D = (I = k.next()).done); D = !0) a = I.value, N.module.log(a)} catch (e) {W = !0, C = e} finally {try {!D && k.return && k.return()} finally {if (W) throw C}}
            "function" == typeof L && L(M), setTimeout(function() {return "function" == typeof N.module.onresize ? N.module.onresize() : void 0}, 1)
          }, this.module.brotli && (this.module.log("WARN! brotli is now deprecated, forced to false"), this.module.brotli = !1), this.module.debug || !this.module.progress) {
            var s = 0, a = this.module.progress;
            this.module.progress = function(e, t, i, o) {
              var n = "Progress(" + (Date.now() - N.module.startedAt) + "ms): " + e;
              i === t ? (n += " 100%", N.module.stages[e] = o) : n += " " + (t / i * 100).toFixed(2) + "%", 0 < o && (n += " (Total: " + o + "ms)"), N.module.log(n);
              var r = Date.now();
              return 1e3 < r - s && r - s < 3e4 && N.module.log("WARN: Hang on progress for " + (r - s) + "ms"), s = r, "function" == typeof a ? a(e, t, i, o) : void 0
            }
          }
          this.module.print = this.module.log, this.module.printErr = this.module.log, this.module.setStatus = function() {}, loader_xhr_1.default.brotli = this.module.brotli, loader_xhr_1.default.log = this.module.log, !0 === this.module.useIndexedDb ? bigstorage_1.default(this.module, function(e) {loader_xhr_1.default.cache = e, N.doLoad()}) : this.doLoad()
        }

        return _createClass(Loader, [{
          key: "evalBin", value: function() {
            var e = this;
            if (this.bin && this.memReady && !this.binReady) {
              var t = Date.now(),
                i = '\nif(typeof Browser==="object"){Module.Browser=Browser};if(typeof JSEvents==="object"){Module.JSEvents=JSEvents};Module.FS=FS;Module.GL=GL;if(!Module.lengthBytesUTF8){Module.lengthBytesUTF8=lengthBytesUTF8};if(!Module.stringToUTF8){Module.stringToUTF8=stringToUTF8};';
              if (this.module.eval) {
                this.binReady = !0, "function" != typeof this.bin && (this.bin = new Function(["Module"], this.bin + i)), this.module.progress("eval.bin", 1, 2, Date.now() - t);
                return setTimeout(function() {return e.bin(e.module), delete e.bin, e.module.progress("eval.bin", 2, 2, Date.now() - t), e.module.Browser.resizeListeners.push(function() {return e.onResize()}), e.moduleReady = !0, e.tryRun()}, 0)
              }
              var o = URL.createObjectURL(new Blob([this.bin, i], {type: "text/javascript"}));
              delete this.bin, this.module.progress("eval.bin", 1, 2, Date.now() - t);
              var n = document.createElement("script");
              return n.onload = function() {return e.binReady = !0, e.module.progress("eval.bin", 2, 2, Date.now() - t), e.module.Browser.resizeListeners.push(function() {return e.onResize()}), e.moduleReady = !0, e.tryRun()}, n.src = o, document.head.appendChild(n)
            }
          }
        }, {
          key: "evalData", value: function evalData () {
            var _this3 = this;
            if (this.dataFileReady && this.data && !this.dataReady) {
              var startedAt = Date.now();
              if (this.module.eval) {
                if (this.dataReady = !0, "function" == typeof this.data) this.data(); else {
                  var Module = this.module;
                  eval(this.data)
                }
                return delete this.data, this.module.progress("eval.data", 0, 0, Date.now() - startedAt), this.tryRun()
              }
              var url = URL.createObjectURL(new Blob([this.data], {type: "text/javascript"}));
              delete this.data;
              var script = document.createElement("script");
              return script.onload = function() {return _this3.dataReady = !0, _this3.module.progress("eval.data", 0, 0, Date.now() - startedAt), _this3.tryRun()}, script.src = url, document.head.appendChild(script)
            }
          }
        }, {
          key: "tryRun", value: function() {
            var e = this;
            if (this.module.log("try run module: " + this.moduleReady + " bin: " + this.binReady + " mem: " + this.memReady + " data: " + this.dataReady + " run: " + this.runReady + " runtime: " + this.runtimeReady), this.moduleReady && this.binReady && this.memReady && this.dataReady && this.runtimeReady && !this.runReady) return this.module.log("starting libgamepix"), this.libStartupTime = Date.now(), this.module.libgamepix = new libgamepix_1.default(this.module, function() {return e.libStartupTime = Date.now() - e.libStartupTime, e.run()})
          }
        }, {
          key: "run", value: function() {
            var o = this;
            this.runReady = !0;
            var c = Date.now();
            this.module.run(), this.module.progress("module.run", 0, 0, Date.now() - c);
            var n = function() {
              if (this.module.dpi = Math.min(window.devicePixelRatio, 2), 0 === this.module.runtime.name.indexOf("Unity")) this.module.log("WARN! Unity does not support devicePixelRatio != 1, forcing to full width & height"), this.module.dpi = 1; else if (null != this.module.fixedWidth) this.module.width = this.module.fixedWidth, this.module.height = this.module.width / this.module.aspect, this.module.dpi = 1; else if (null != this.module.fixedHeight) this.module.height = this.module.fixedHeight, this.module.width = this.module.height * this.module.aspect, this.module.dpi = 1; else {
                var e = this.module.width / this.module.height,
                  t = Math.max(this.module.width, this.module.height) * this.module.dpi;
                if (t > this.module.maxResolution) {
                  var i = this.module.width, o = this.module.height, n = this.module.maxResolution / t;
                  this.module.width = this.module.width * n, this.module.height = this.module.height * n, this.module.log("WARN! canvas size is too big, resized from " + i * this.module.dpi + "x" + o * this.module.dpi + " to " + this.module.width * this.module.dpi + "x" + this.module.height * this.module.dpi)
                }
                this.module.height < (this.module.minHeight || 0) && (this.module.height = this.module.minHeight, this.module.width = this.module.height * e), this.module.width < (this.module.minWidth || 0) && (this.module.width = this.module.minWidth, this.module.height = this.module.width / e)
              }
              var r = [this.module.width * this.module.dpi + "", this.module.height * this.module.dpi + ""], s = !0,
                a = !1, u = void 0;
              try {
                for (var l, d = arguments[Symbol.iterator](); !(s = (l = d.next()).done); s = !0) {
                  var h = l.value;
                  r.push(h + "")
                }
              } catch (e) {a = !0, u = e} finally {try {!s && d.return && d.return()} finally {if (a) throw u}}
              return host_1.GpxHost.systemInfo.width = this.module.width * this.module.dpi, host_1.GpxHost.systemInfo.height = this.module.height * this.module.dpi, this.module.webglContextAttributes = host_1.GpxHost.systemInfo.webglContextAttributes, this.module.canvas.style.width = host_1.GpxHost.systemInfo.width + "px", this.module.canvas.style.height = host_1.GpxHost.systemInfo.height + "px", c = Date.now(), this.module.mainStartedAt = c, this.module.argv = r, this.module.log("main(", r, ")"), this.module.callMain(r), this.module.progress("module.main", 0, 0, Date.now() - c)
            }.bind(this);
            if (this.module.ready) {
              return this.module.ready(function() {
                for (var e = arguments.length, t = Array(e), i = 0; i < e; i++) t[i] = arguments[i];
                return setTimeout(function() {n.apply(o, t)}, 0)
              })
            }
            return setTimeout(n, 0)
          }
        }, {
          key: "width",
          value: function() {return this.module.log("WARN! Module.width is legacy and will be removed"), this.module.canvas.width / this.module.dpi}
        }, {
          key: "height",
          value: function() {return this.module.log("WARN! Module.height is legacy and will be removed"), this.module.canvas.height / this.module.dpi}
        }, {
          key: "ratio",
          value: function() {return this.module.canvas.width / this.module.canvas.height}
        }, {
          key: "onResize",
          value: function() {return "function" == typeof this.module.onresize ? this.module.onresize() : void 0}
        }, {
          key: "getGameProperties",
          value: function() {
            var e = host_1.GpxHost.getParameterByName("device") || "Browser";
            return {
              "Game: ": this.module.name,
              "ProjectVersion: ": this.module.projectVersion,
              "Version: ": this.module.version.substr(0, this.module.version.indexOf(" ")),
              "Engine: ": this.module.engineVersion,
              "Navigator: ": ("undefined" != typeof navigator && null !== navigator ? navigator.userAgent : void 0) || "unknown",
              "Device: ": e,
              "Wasm: ": this.module.wasm + "",
              "Webp: ": host_1.GpxHost.webpSupported + ""
            }
          }
        }, {
          key: "doLoad", value: function() {
            var r, s = this, t = function() {
              s.loadResource("bin", s.binfile).then(function(e) {return s.bin = e, s.evalBin()}), s.loadResource("mem", s.mem, "arraybuffer").then(function(e) {
                return s.module.memoryInitializerRequest = {
                  status: 200,
                  response: e
                }, s.memReady = !0, s.evalBin()
              })
            };
            this.module.wasm ? (r = function(e) {s.module.log("ERR! instaniate(" + e.fileName + ":" + e.lineNumber + ":" + e.columnNumber + "): " + e.name + " - " + e.message), s.module.log("ERR!", e.stack), s.module.log("ERR! Starting asm.js"), s.module.wasm = !1, s.memReady = !1, s.binReady = !1, s.module.version += "{fallback to asm.js}", delete s.bin, t()}, s.memReady = !0, s.module.progress("mem", loader_xhr_1.LoaderXhrData[s.mem], loader_xhr_1.LoaderXhrData[s.mem], Date.now() - s.startedAt), s.loadResource("bin", s.wasm, "arraybuffer").then(function(e) {
              var t = Date.now(), i = WebAssembly.compile(e);
              return i.catch(r), i.then(function(n) {
                s.wasmCompileTime = Date.now() - t, s.module.instantiateWasm = function(t, i) {
                  var o = Date.now(),
                    e = autogenerated_runtime_1.default(s.module).then(function(e) {return t.env.logcall = e.logcall, t.env.wipedcall = e.wipedcall, t.env.globalscall = e.globalscall, window.runtime = e, s.module.runtime = e, WebAssembly.instantiate(n, t)});
                  return e.catch(r), e.then(function(e) {return s.wasmInstantiateTime = Date.now() - o, i(e, n)})
                }, s.loadResource("", s.wasmjs).then(function(e) {return s.bin = e, s.evalBin()})
              })
            })) : t(), this.loadResource("datafile", this.datafile, "arraybuffer").then(function(i) {return s.module.getPreloadedPackage = function(e, t) {return i}, s.dataFileReady = !0, s.evalData()}), this.loadResource("datajs", this.datajs).then(function(e) {return s.data = e, s.evalData()})
          }
        }, {
          key: "loadResource", value: function(n, s, t, r) {
            var a = this;
            return Promise.all([host_1.GpxHost.caniuseBrotli(s), host_1.GpxHost.caniuseGzip(s)]).then(function(e) {
              var t = _slicedToArray(e, 2), i = t[0], o = t[1];
              if (i) {
                var n = s.lastIndexOf("/");
                return s.substr(0, n) + "br/" + s.substr(n + 1)
              }
              if (o) {
                var r = s.lastIndexOf("/");
                return s.substr(0, r) + "gz/" + s.substr(r + 1)
              }
              return s
            }).then(function(o) {
              return new Promise(function(i) {
                var e = {
                  fail: function(e, t, i) {
                    var o = "ERR! Can't download " + e + ", status: " + t + ", context: " + i;
                    a.module.log(o), a.module.onerror && a.module.onerror(o)
                  },
                  progress: function(e, t) {e = loader_xhr_1.LoaderXhrData[o], a.module.progress(n, t, e, 0), r && r(e, t)},
                  success: function(e, t) {a.module.progress(n, loader_xhr_1.LoaderXhrData[o], loader_xhr_1.LoaderXhrData[o], Date.now() - a.startedAt), i(e)},
                  responseType: t
                };
                new loader_xhr_1.default(o, e)
              })
            })
          }
        }]), Loader
      }();
    exports.default = Loader, window.LoaderXhr = loader_xhr_1.default, window.GpxHost = host_1.GpxHost, window.Brotli = brotli_1.default, window.Loader = Loader, window.LoaderXhrData = loader_xhr_1.LoaderXhrData, window.LoaderXhrDataGzipped = loader_xhr_1.LoaderXhrDataGzipped
  }, {
    "./bigstorage/bigstorage": 3,
    "./brotli": 4,
    "./host": 5,
    "./libgamepix": 6,
    "./loader-ui": 7,
    "./loader-xhr": 8,
    "./runtimes/autogenerated-runtime": 10
  }], 10: [function(e, t, i) {
    "use strict";
    var o = function() {
      function o (e, t) {
        for (var i = 0; i < t.length; i++) {
          var o = t[i];
          o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, o.key, o)
        }
      }

      return function(e, t, i) {return t && o(e.prototype, t), i && o(e, i), e}
    }();
    Object.defineProperty(i, "__esModule", {value: !0});
    var n = e("./runtime-snapshot"), r = function() {
      function t (e) {
        var o = this;
        !function(e, t) {if (!(e instanceof t)) throw new TypeError("Cannot call a class as a function")}(this, t), this.name = "ReleaseRuntime", this.globalscall = function() {
          for (var e = arguments.length, t = Array(e), i = 0; i < e; i++) t[i] = arguments[i];
          n.globalscall(o.module, t)
        }, this.heapsnapshot = function(e) {n.heapsnapshot(o.module, e)}, this.heaprestore = function(e) {return n.heaprestore(o.module, e)}, this.module = e
      }

      return o(t, [{
        key: "logcall",
        value: function(e) {this.module.log("ERR! logcall is called in RELEASE environement, Function[" + e + "]")}
      }, {
        key: "wipedcall",
        value: function(e) {this.module.log("ERR! wipedcall is called in RELEASE environement, Function[" + e + "]")}
      }]), t
    }();
    i.default = function(t) {return new Promise(function(e) {return e(new r(t))})}
  }, {"./runtime-snapshot": 11}], 11: [function(e, t, i) {
    "use strict";
    Object.defineProperty(i, "__esModule", {value: !0}), i.heapsnapshot = function(f, p) {
      f.onglobals = function() {
        for (var e = arguments.length, t = Array(e), i = 0; i < e; i++) t[i] = arguments[i];
        var o = Date.now();
        t.push(o);
        var n = (new TextEncoder).encode(JSON.stringify(t)), r = f.HEAPU8;
        r.fill(0, f._gamepix_buffers_start(), f._gamepix_buffers_end());
        var s = function(e) {
          var i = 1 < arguments.length && void 0 !== arguments[1] ? arguments[1] : 8, o = [];

          function t (e) {
            if (0 === o.length) o.push(e); else {
              var t = o[o.length - 1];
              e.left - t.right > i ? o.push(e) : t.right = e.right
            }
          }

          for (var n = {
            left: -1,
            right: -1
          }, r = 0; r < e.length; ++r) if (0 !== e[r]) -1 === n.left && (n.left = r), n.right = r + 1; else if (-1 !== n.left) {
            var s = Object.assign({}, n);
            n.left = -1, n.right = -1, t(s)
          }
          return -1 !== n.left && t(n), o
        }(r), a = 4 + 2 * s.length * 4, u = 0;
        s.forEach(function(e) {return u += e.right - e.left}), u = 4 * Math.ceil(u / 4);
        var l = 4 + 4 * Math.ceil(n.byteLength / 4), d = new Uint8Array(l + a + u), h = new Uint32Array(d.buffer);
        h[0] = n.byteLength, d.set(n, 4);
        var c = l / 4, m = 4 * c + a;
        h[c] = s.length, s.forEach(function(e, t) {h[c + 2 * t + 1] = e.left, h[c + 2 * t + 2] = e.right, d.set(r.subarray(e.left, e.right), m), m += e.right - e.left}), p(d.buffer)
      }, f.asm.globalsread()
    }, i.heaprestore = function(e, t) {
      var i = new Uint8Array(t), o = new Uint32Array(t), n = i.subarray(4, 4 + o[0]),
        r = JSON.parse(new TextDecoder("utf-8").decode(n)), s = 4 + 4 * Math.ceil(o[0] / 4), a = r.pop(), u = s / 4,
        l = o[u], d = 4 * u + (4 + 2 * l * 4);
      e.HEAPU8.fill(0);
      for (var h = 0; h < l; ++h) {
        var c = o[u + 1 + 2 * h], m = o[u + 2 + 2 * h] - c;
        e.HEAPU8.set(i.subarray(d, d + m), c), d += m
      }
      return e.asm.globalswrite.apply(null, r), a
    }, i.globalscall = function(e) {
      if (void 0 !== e.onglobals) {
        var t = e.onglobals;
        delete e.onglobals;
        for (var i = arguments.length, o = Array(1 < i ? i - 1 : 0), n = 1; n < i; n++) o[n - 1] = arguments[n];
        t(o)
      }
    }
  }, {}]
}, {}, [9]);
//# sourceMappingURL=gamepix-loader.js.map
