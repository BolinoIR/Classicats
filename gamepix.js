(function() {
  'use strict';

  var config = window.CLASSICATS_CONFIG || {};
  var apiBase = config.apiBase || '/api';
  var localApiBase = config.localApiBase || '/api';
  var storagePrefix = 'classicats.';

  function log() {
    var args = Array.prototype.slice.call(arguments);
    args.unshift('[Classicats]');
    console.log.apply(console, args);
  }

  function warn() {
    var args = Array.prototype.slice.call(arguments);
    args.unshift('[Classicats]');
    console.warn.apply(console, args);
  }

  function uuid() {
    if (window.crypto && window.crypto.randomUUID) {
      return window.crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0;
      var v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  function getCookie(name) {
    var prefix = name + '=';
    return document.cookie.split(';').map(function(part) {
      return part.trim();
    }).filter(function(part) {
      return part.indexOf(prefix) === 0;
    }).map(function(part) {
      return decodeURIComponent(part.slice(prefix.length));
    })[0] || null;
  }

  function setCookie(name, value) {
    document.cookie = name + '=' + encodeURIComponent(value) + ';path=/;max-age=315360000';
  }

  function queryStringParams() {
    return window.location.search.replace(/^\?/, '');
  }

  function request(path, options) {
    var url = (path.indexOf('http') === 0 ? path : localApiBase + path);
    var finalOptions = Object.assign({
      credentials: 'same-origin',
      headers: {'Content-Type': 'application/json'}
    }, options || {});

    return fetch(url, finalOptions).then(function(response) {
      if (!response.ok) {
        warn('HTTP', response.status, url);
      }
      return response;
    }).catch(function(error) {
      warn('Request failed', url, error);
      throw error;
    });
  }

  function loadPlayer() {
    var id = localStorage.getItem(storagePrefix + 'playerId');
    var name = localStorage.getItem(storagePrefix + 'playerName');
    if (!id) {
      id = 'classicats-' + uuid();
      localStorage.setItem(storagePrefix + 'playerId', id);
    }
    if (!name) {
      name = 'Classicat';
      localStorage.setItem(storagePrefix + 'playerName', name);
    }
    setCookie('gpxid', id);
    setCookie('gpxname', name);
    return {id: id, name: name};
  }

  function installDebugHooks() {
    if (window.__classicatsDebugHooksInstalled) {
      return;
    }
    window.__classicatsDebugHooksInstalled = true;

    window.addEventListener('error', function(event) {
      warn('Window error', event.message, event.filename + ':' + event.lineno);
    });
    window.addEventListener('error', function(event) {
      var target = event.target;
      if (target && target !== window) {
        var url = target.currentSrc || target.src || target.href || '';
        if (url) {
          warn('Resource failed', target.tagName || 'resource', url);
        }
      }
    }, true);
    window.addEventListener('unhandledrejection', function(event) {
      warn('Unhandled promise rejection', event.reason);
    });

    if (window.XMLHttpRequest) {
      var NativeXHR = window.XMLHttpRequest;
      window.XMLHttpRequest = function() {
        var xhr = new NativeXHR();
        var method = 'GET';
        var url = '';
        var open = xhr.open;
        xhr.open = function(nextMethod, nextUrl) {
          method = nextMethod;
          url = nextUrl;
          return open.apply(xhr, arguments);
        };
        xhr.addEventListener('loadend', function() {
          if (xhr.status >= 400 || xhr.status === 0) {
            warn('XHR finished', method, url, xhr.status);
          }
        });
        xhr.addEventListener('error', function() {
          warn('XHR error', method, url);
        });
        return xhr;
      };
    }

    if (window.WebSocket) {
      var NativeWebSocket = window.WebSocket;
      window.WebSocket = function(url, protocols) {
        log('WebSocket opening', url, protocols || '');
        var socket = protocols === undefined ? new NativeWebSocket(url) : new NativeWebSocket(url, protocols);
        socket.addEventListener('open', function() {
          log('WebSocket open', url);
        });
        socket.addEventListener('message', function(event) {
          var size = event.data && (event.data.byteLength || event.data.length) || 0;
          log('WebSocket message', url, size);
        });
        socket.addEventListener('close', function(event) {
          warn('WebSocket close', url, event.code, event.reason);
        });
        socket.addEventListener('error', function(event) {
          warn('WebSocket error', url, event);
        });
        return socket;
      };
      window.WebSocket.prototype = NativeWebSocket.prototype;
      window.WebSocket.CONNECTING = NativeWebSocket.CONNECTING;
      window.WebSocket.OPEN = NativeWebSocket.OPEN;
      window.WebSocket.CLOSING = NativeWebSocket.CLOSING;
      window.WebSocket.CLOSED = NativeWebSocket.CLOSED;
      Object.keys(NativeWebSocket).forEach(function(key) {
        window.WebSocket[key] = NativeWebSocket[key];
      });
    }
  }

  var player = loadPlayer();

  window.gpxAdv = window.gpxAdv || {
    show: function(type, options, callback) {
      log('Ad skipped', type, options);
      if (typeof callback === 'function') {
        callback(false);
      }
    }
  };

  window.OneSignal = window.OneSignal || [];

  window.GamePix = {
    currency: 'USD',
    currencySymbol: '$',
    CONST: {
      OPEN_SHOP: 'OPEN_SHOP',
      PURCHASE: 'Purchase'
    },
    Tools: {
      getCookie: getCookie,
      setCookie: setCookie
    },
    Profile: {
      createPaymentsApi: function() {
        return {
          init: function(payload, callback) {
            request('/prices').then(function(response) {
              return response.json();
            }).then(function(products) {
              if (typeof callback === 'function') {
                callback(products);
              }
            }).catch(function() {
              if (typeof callback === 'function') {
                callback({});
              }
            });
          }
        };
      }
    },
    init: function() {
      installDebugHooks();
      request('/players/login', {
        method: 'POST',
        body: JSON.stringify({
          id: player.id,
          name: player.name,
          guest: true,
          qs: queryStringParams()
        })
      }).catch(function() {
        return null;
      }).then(function() {
        log('Starting game as', player.id);
        window.dispatchEvent(new CustomEvent('startTheGame', {
          detail: {
            id: player.id,
            name: player.name,
            email: '',
            token: '',
            qsParams: queryStringParams()
          }
        }));
      });
    },
    loading: function(percent) {
      var bar = document.getElementById('loading-bar');
      if (bar) {
        bar.style.width = Math.max(0, Math.min(100, percent || 0)) + '%';
      }
      log('Loading', Math.round(percent || 0) + '%');
    },
    loaded: function() {
      return Promise.resolve();
    },
    lang: function() {
      var lang = (navigator.language || 'en').slice(0, 2).toLowerCase();
      return lang || 'en';
    },
    localize: function(key) {
      return key;
    },
    queryStringParams: queryStringParams,
    ping: function(event, payload) {
      log('Ping', event, payload || {});
      request('/events', {
        method: 'POST',
        body: JSON.stringify({event: event, payload: payload || {}, player_id: player.id})
      }).catch(function() {});
    },
    hook: function(type, payload, success, fail) {
      log('Hook', type, payload || {});
      if (typeof success === 'function') {
        success();
      } else if (typeof fail === 'function') {
        fail();
      }
    }
  };

  log('Shim ready', apiBase, config.websocketUrl || '');
})();
