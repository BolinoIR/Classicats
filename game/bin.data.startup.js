
if (!Module.expectedDataFileDownloads) {
  Module.expectedDataFileDownloads = 0;
  Module.finishedDataFileDownloads = 0;
}
Module.expectedDataFileDownloads++;
(function() {
 var loadPackage = function(metadata) {

    var PACKAGE_PATH;
    if (typeof window === 'object') {
      PACKAGE_PATH = window['encodeURIComponent'](window.location.pathname.toString().substring(0, window.location.pathname.toString().lastIndexOf('/')) + '/');
    } else if (typeof location !== 'undefined') {
      // worker
      PACKAGE_PATH = encodeURIComponent(location.pathname.toString().substring(0, location.pathname.toString().lastIndexOf('/')) + '/');
    } else {
      throw 'using preloaded data can only be done on a web page or in a web worker';
    }
    var PACKAGE_NAME = 'bin.data.startup._.js';
    var REMOTE_PACKAGE_BASE = 'bin.data.startup._.js';
    if (typeof Module['locateFilePackage'] === 'function' && !Module['locateFile']) {
      Module['locateFile'] = Module['locateFilePackage'];
      err('warning: you defined Module.locateFilePackage, that has been renamed to Module.locateFile (using your locateFilePackage for now)');
    }
    var REMOTE_PACKAGE_NAME = Module['locateFile'] ? Module['locateFile'](REMOTE_PACKAGE_BASE, '') : REMOTE_PACKAGE_BASE;
  
    var REMOTE_PACKAGE_SIZE = metadata.remote_package_size;
    var PACKAGE_UUID = metadata.package_uuid;
  
    function fetchRemotePackage(packageName, packageSize, callback, errback) {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', packageName, true);
      xhr.responseType = 'arraybuffer';
      xhr.onprogress = function(event) {
        var url = packageName;
        var size = packageSize;
        if (event.total) size = event.total;
        if (event.loaded) {
          if (!xhr.addedTotal) {
            xhr.addedTotal = true;
            if (!Module.dataFileDownloads) Module.dataFileDownloads = {};
            Module.dataFileDownloads[url] = {
              loaded: event.loaded,
              total: size
            };
          } else {
            Module.dataFileDownloads[url].loaded = event.loaded;
          }
          var total = 0;
          var loaded = 0;
          var num = 0;
          for (var download in Module.dataFileDownloads) {
          var data = Module.dataFileDownloads[download];
            total += data.total;
            loaded += data.loaded;
            num++;
          }
          total = Math.ceil(total * Module.expectedDataFileDownloads/num);
          if (Module['setStatus']) Module['setStatus']('Downloading data... (' + loaded + '/' + total + ')');
        } else if (!Module.dataFileDownloads) {
          if (Module['setStatus']) Module['setStatus']('Downloading data...');
        }
      };
      xhr.onerror = function(event) {
        throw new Error("NetworkError for: " + packageName);
      }
      xhr.onload = function(event) {
        if (xhr.status == 200 || xhr.status == 304 || xhr.status == 206 || (xhr.status == 0 && xhr.response)) { // file URLs can return 0
          var packageData = xhr.response;
          callback(packageData);
        } else {
          throw new Error(xhr.statusText + " : " + xhr.responseURL);
        }
      };
      xhr.send(null);
    };

    function handleError(error) {
      console.error('package error:', error);
    };
  
      var fetchedCallback = null;
      var fetched = Module['getPreloadedPackage'] ? Module['getPreloadedPackage'](REMOTE_PACKAGE_NAME, REMOTE_PACKAGE_SIZE) : null;

      if (!fetched) fetchRemotePackage(REMOTE_PACKAGE_NAME, REMOTE_PACKAGE_SIZE, function(data) {
        if (fetchedCallback) {
          fetchedCallback(data);
          fetchedCallback = null;
        } else {
          fetched = data;
        }
      }, handleError);
    
  function runWithFS() {

    function assert(check, msg) {
      if (!check) throw msg + new Error().stack;
    }
Module['FS_createPath']('/', 'gpx', true, true);

    function DataRequest(start, end, audio) {
      this.start = start;
      this.end = end;
      this.audio = audio;
    }
    DataRequest.prototype = {
      requests: {},
      open: function(mode, name) {
        this.name = name;
        this.requests[name] = this;
        Module['addRunDependency']('fp ' + this.name);
      },
      send: function() {},
      onload: function() {
        var byteArray = this.byteArray.subarray(this.start, this.end);
        this.finish(byteArray);
      },
      finish: function(byteArray) {
        var that = this;

        Module['FS_createDataFile'](this.name, null, byteArray, true, true, true); // canOwn this data in the filesystem, it is a slide into the heap that will never change
        Module['removeRunDependency']('fp ' + that.name);

        this.requests[this.name] = null;
      }
    };

        var files = metadata.files;
        for (var i = 0; i < files.length; ++i) {
          new DataRequest(files[i].start, files[i].end, files[i].audio).open('GET', files[i].filename);
        }

  
    function processPackageData(arrayBuffer) {
      Module.finishedDataFileDownloads++;
      assert(arrayBuffer, 'Loading data file failed.');
      assert(arrayBuffer instanceof ArrayBuffer, 'bad input to processPackageData');
      var byteArray = new Uint8Array(arrayBuffer);
      var curr;
      
        // copy the entire loaded file into a spot in the heap. Files will refer to slices in that. They cannot be freed though
        // (we may be allocating before malloc is ready, during startup).
        var ptr = Module['getMemory'](byteArray.length);
        Module['HEAPU8'].set(byteArray, ptr);
        DataRequest.prototype.byteArray = Module['HEAPU8'].subarray(ptr, ptr+byteArray.length);
  
          var files = metadata.files;
          for (var i = 0; i < files.length; ++i) {
            DataRequest.prototype.requests[files[i].filename].onload();
          }
              Module['removeRunDependency']('datafile_bin.data.startup._.js');

    };
    Module['addRunDependency']('datafile_bin.data.startup._.js');
  
    if (!Module.preloadResults) Module.preloadResults = {};
  
      Module.preloadResults[PACKAGE_NAME] = {fromCache: false};
      if (fetched) {
        processPackageData(fetched);
        fetched = null;
      } else {
        fetchedCallback = processPackageData;
      }
    
  }
  if (Module['calledRun']) {
    runWithFS();
  } else {
    if (!Module['preRun']) Module['preRun'] = [];
    Module["preRun"].push(runWithFS); // FS is not initialized yet, wait for it
  }

 }
 loadPackage({"files": [{"start": 0, "audio": 0, "end": 9506, "filename": "/chainsaw_640_960.raw"}, {"start": 9506, "audio": 0, "end": 45378, "filename": "/fx_640_960.raw"}, {"start": 45378, "audio": 0, "end": 71462, "filename": "/compact-broken.otf"}, {"start": 71462, "audio": 0, "end": 81972, "filename": "/stats_changes.pb"}, {"start": 81972, "audio": 0, "end": 257378, "filename": "/splash_640_960.jpeg"}, {"start": 257378, "audio": 0, "end": 260322, "filename": "/box_timer_gang_fight.pb"}, {"start": 260322, "audio": 0, "end": 288182, "filename": "/gun.pb"}, {"start": 288182, "audio": 0, "end": 294519, "filename": "/body_texture_iron_1_640_960.raw"}, {"start": 294519, "audio": 0, "end": 318139, "filename": "/skills_icons_640_960.raw"}, {"start": 318139, "audio": 0, "end": 326158, "filename": "/drill_long_640_960.raw"}, {"start": 326158, "audio": 0, "end": 355636, "filename": "/balloon_gun.pb"}, {"start": 355636, "audio": 0, "end": 365677, "filename": "/hud_640_960.raw"}, {"start": 365677, "audio": 0, "end": 414321, "filename": "/khalaad-al-arabeh_0.ttf"}, {"start": 414321, "audio": 0, "end": 419045, "filename": "/leagues_arrow.pb"}, {"start": 419045, "audio": 0, "end": 436464, "filename": "/shared_640_960.raw"}, {"start": 436464, "audio": 0, "end": 445044, "filename": "/body_texture_hotrod_2_640_960.raw"}, {"start": 445044, "audio": 0, "end": 448070, "filename": "/btn_success.pb"}, {"start": 448070, "audio": 0, "end": 725938, "filename": "/ingame_cats_anim.pb"}, {"start": 725938, "audio": 0, "end": 734960, "filename": "/body_texture_gold_3_640_960.raw"}, {"start": 734960, "audio": 0, "end": 740023, "filename": "/loading.pb"}, {"start": 740023, "audio": 0, "end": 754195, "filename": "/balloon_gun_640_960.raw"}, {"start": 754195, "audio": 0, "end": 777609, "filename": "/ingame_cats_640_960.raw"}, {"start": 777609, "audio": 0, "end": 782075, "filename": "/autoheal.pb"}, {"start": 782075, "audio": 0, "end": 788499, "filename": "/body_texture_cork_2_640_960.raw"}, {"start": 788499, "audio": 0, "end": 809365, "filename": "/ingame_cats_hats_640_960.raw"}, {"start": 809365, "audio": 0, "end": 844049, "filename": "/splash_logo_640_960.raw"}, {"start": 844049, "audio": 0, "end": 855059, "filename": "/gun_640_960.raw"}, {"start": 855059, "audio": 0, "end": 883629, "filename": "/wheel_640_960.raw"}, {"start": 883629, "audio": 0, "end": 902348, "filename": "/shotgun.pb"}, {"start": 902348, "audio": 0, "end": 908455, "filename": "/autoheal_640_960.raw"}, {"start": 908455, "audio": 0, "end": 917069, "filename": "/body_texture_hotrod_1_640_960.raw"}, {"start": 917069, "audio": 0, "end": 920302, "filename": "/popup.pb"}, {"start": 920302, "audio": 0, "end": 1726512, "filename": "/strings.xml"}, {"start": 1726512, "audio": 0, "end": 1743412, "filename": "/main_screen_640_960.raw"}, {"start": 1743412, "audio": 0, "end": 1761915, "filename": "/sell_bucket.pb"}, {"start": 1761915, "audio": 0, "end": 1770301, "filename": "/skills_640_960.raw"}, {"start": 1770301, "audio": 0, "end": 1781957, "filename": "/beam_640_960.raw"}, {"start": 1781957, "audio": 0, "end": 1783304, "filename": "/loading_640_960.raw"}, {"start": 1783304, "audio": 0, "end": 1794908, "filename": "/shop_640_960.raw"}, {"start": 1794908, "audio": 0, "end": 1896680, "filename": "/BebasNeue_Bold.otf"}, {"start": 1896680, "audio": 0, "end": 1905998, "filename": "/body_texture_gold_2_640_960.raw"}, {"start": 1905998, "audio": 0, "end": 1907570, "filename": "/main_screen_bgr_640_960.jpeg"}, {"start": 1907570, "audio": 0, "end": 1938589, "filename": "/defence_logs.pb"}, {"start": 1938589, "audio": 0, "end": 1959977, "filename": "/sticky_wheel_640_960.raw"}, {"start": 1959977, "audio": 0, "end": 1986243, "filename": "/minigun.pb"}, {"start": 1986243, "audio": 0, "end": 2375386, "filename": "/res.init"}, {"start": 2375386, "audio": 0, "end": 2383060, "filename": "/drill_640_960.raw"}, {"start": 2383060, "audio": 0, "end": 2451800, "filename": "/body_stickers_640_960.raw"}, {"start": 2451800, "audio": 0, "end": 2553181, "filename": "/drill_long.pb"}, {"start": 2553181, "audio": 0, "end": 2557808, "filename": "/loaderbar_empty_640_960.png"}, {"start": 2557808, "audio": 0, "end": 2566134, "filename": "/body_texture_iron_3_640_960.raw"}, {"start": 2566134, "audio": 0, "end": 2571461, "filename": "/box_timer_17c.pb"}, {"start": 2571461, "audio": 0, "end": 2596401, "filename": "/minigun_640_960.raw"}, {"start": 2596401, "audio": 0, "end": 2607627, "filename": "/icon_skin_suit.pb"}, {"start": 2607627, "audio": 0, "end": 2678962, "filename": "/drills.pb"}, {"start": 2678962, "audio": 0, "end": 2679748, "filename": "/nitro_dissapear.pb"}, {"start": 2679748, "audio": 0, "end": 2696381, "filename": "/body_640_960.raw"}, {"start": 2696381, "audio": 0, "end": 2710049, "filename": "/gang_and_leaderboards_640_960.raw"}, {"start": 2710049, "audio": 0, "end": 2729445, "filename": "/nitro_640_960.raw"}, {"start": 2729445, "audio": 0, "end": 2735858, "filename": "/main_menu_light.pb"}, {"start": 2735858, "audio": 0, "end": 2741916, "filename": "/body_texture_iron_2_640_960.raw"}, {"start": 2741916, "audio": 0, "end": 2851396, "filename": "/chainsaw.pb"}, {"start": 2851396, "audio": 0, "end": 2863776, "filename": "/shotgun_640_960.raw"}, {"start": 2863776, "audio": 0, "end": 2871362, "filename": "/saw_640_960.raw"}, {"start": 2871362, "audio": 0, "end": 2879160, "filename": "/body_texture_green_1_640_960.raw"}, {"start": 2879160, "audio": 0, "end": 2897099, "filename": "/settings_640_960.raw"}, {"start": 2897099, "audio": 0, "end": 3036567, "filename": "/cat_edit_screen.pb"}, {"start": 3036567, "audio": 0, "end": 3048073, "filename": "/popup_640_960.raw"}, {"start": 3048073, "audio": 0, "end": 3065663, "filename": "/defence_logs_640_960.raw"}, {"start": 3065663, "audio": 0, "end": 3074373, "filename": "/body_texture_cork_1_640_960.raw"}, {"start": 3074373, "audio": 0, "end": 3076678, "filename": "/autoheal_shop.pb"}, {"start": 3076678, "audio": 0, "end": 3094892, "filename": "/icons_640_960.raw"}, {"start": 3094892, "audio": 0, "end": 3633216, "filename": "/tony.pb"}, {"start": 3633216, "audio": 0, "end": 3648667, "filename": "/buttons_640_960.raw"}, {"start": 3648667, "audio": 0, "end": 3657977, "filename": "/body_texture_cork_3_640_960.raw"}, {"start": 3657977, "audio": 0, "end": 3674137, "filename": "/ingame_cats_suits_640_960.raw"}, {"start": 3674137, "audio": 0, "end": 3678958, "filename": "/edit_screen_item_switch.pb"}, {"start": 3678958, "audio": 0, "end": 3701419, "filename": "/zepto_splash.pb"}, {"start": 3701419, "audio": 0, "end": 3712978, "filename": "/fuse.pb"}, {"start": 3712978, "audio": 0, "end": 3727130, "filename": "/edit_screen_640_960.raw"}, {"start": 3727130, "audio": 0, "end": 3733414, "filename": "/loaderbar_full_640_960.png"}, {"start": 3733414, "audio": 0, "end": 3750271, "filename": "/double_gun_640_960.raw"}, {"start": 3750271, "audio": 0, "end": 3773506, "filename": "/flash.pb"}, {"start": 3773506, "audio": 0, "end": 3781667, "filename": "/impulse.pb"}, {"start": 3781667, "audio": 0, "end": 3786819, "filename": "/body_texture_green_2_640_960.raw"}, {"start": 3786819, "audio": 0, "end": 3823945, "filename": "/beam.pb"}, {"start": 3823945, "audio": 0, "end": 3830694, "filename": "/tony_640_960.raw"}, {"start": 3830694, "audio": 0, "end": 3842107, "filename": "/double_gun.pb"}, {"start": 3842107, "audio": 0, "end": 3850091, "filename": "/offers_plate_640_960.raw"}, {"start": 3850091, "audio": 0, "end": 3860422, "filename": "/skills_attention.pb"}, {"start": 3860422, "audio": 0, "end": 3919466, "filename": "/zepto_logo_640_960.raw"}, {"start": 3919466, "audio": 0, "end": 3934728, "filename": "/emblems_640_960.raw"}, {"start": 3934728, "audio": 0, "end": 3946811, "filename": "/leagues_buttons_640_960.raw"}, {"start": 3946811, "audio": 0, "end": 3957549, "filename": "/impulse_640_960.raw"}, {"start": 3957549, "audio": 0, "end": 3968801, "filename": "/gpx/gamepix.png"}], "remote_package_size": 3968801, "package_uuid": "74055428-4a99-46f8-b74a-e99b8fd1cf8b"});

})();
