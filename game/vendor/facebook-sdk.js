(function() {
  if (window.FB) {
    return;
  }

  window.FB = {
    init: function() {},
    getLoginStatus: function(callback) {
      callback({ status: 'unknown' });
    },
    login: function(callback) {
      callback({ authResponse: null });
    },
    api: function(path, callback) {
      callback({});
    },
    ui: function(options, callback) {
      callback({ error_code: 1, error_message: 'Facebook payments disabled in Project Classicats' });
    }
  };

  if (typeof window.fbAsyncInit === 'function') {
    window.fbAsyncInit();
  }
})();
