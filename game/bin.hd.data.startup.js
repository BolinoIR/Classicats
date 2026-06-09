
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
    var PACKAGE_NAME = 'bin.hd.data.startup._.js';
    var REMOTE_PACKAGE_BASE = 'bin.hd.data.startup._.js';
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
              Module['removeRunDependency']('datafile_bin.hd.data.startup._.js');

    };
    Module['addRunDependency']('datafile_bin.hd.data.startup._.js');
  
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
 loadPackage({"files": [{"start": 0, "audio": 0, "end": 26084, "filename": "/compact-broken.otf"}, {"start": 26084, "audio": 0, "end": 36594, "filename": "/stats_changes.pb"}, {"start": 36594, "audio": 0, "end": 47172, "filename": "/settings_1536_2048.raw"}, {"start": 47172, "audio": 0, "end": 70202, "filename": "/sticky_wheel_1536_2048.raw"}, {"start": 70202, "audio": 0, "end": 73146, "filename": "/box_timer_gang_fight.pb"}, {"start": 73146, "audio": 0, "end": 101006, "filename": "/gun.pb"}, {"start": 101006, "audio": 0, "end": 117974, "filename": "/drill_1536_2048.raw"}, {"start": 117974, "audio": 0, "end": 118540, "filename": "/body_texture_hotrod_1_1536_2048.raw"}, {"start": 118540, "audio": 0, "end": 139819, "filename": "/minigun_1536_2048.raw"}, {"start": 139819, "audio": 0, "end": 169297, "filename": "/balloon_gun.pb"}, {"start": 169297, "audio": 0, "end": 217941, "filename": "/khalaad-al-arabeh_0.ttf"}, {"start": 217941, "audio": 0, "end": 222665, "filename": "/leagues_arrow.pb"}, {"start": 222665, "audio": 0, "end": 240336, "filename": "/beam_1536_2048.raw"}, {"start": 240336, "audio": 0, "end": 273208, "filename": "/edit_screen_1536_2048.raw"}, {"start": 273208, "audio": 0, "end": 279772, "filename": "/body_texture_iron_1_1536_2048.raw"}, {"start": 279772, "audio": 0, "end": 280337, "filename": "/body_texture_hotrod_2_1536_2048.raw"}, {"start": 280337, "audio": 0, "end": 293038, "filename": "/chainsaw_1536_2048.raw"}, {"start": 293038, "audio": 0, "end": 311330, "filename": "/drill_long_1536_2048.raw"}, {"start": 311330, "audio": 0, "end": 314356, "filename": "/btn_success.pb"}, {"start": 314356, "audio": 0, "end": 332820, "filename": "/shotgun_1536_2048.raw"}, {"start": 332820, "audio": 0, "end": 610688, "filename": "/ingame_cats_anim.pb"}, {"start": 610688, "audio": 0, "end": 615751, "filename": "/loading.pb"}, {"start": 615751, "audio": 0, "end": 639995, "filename": "/popup_1536_2048.raw"}, {"start": 639995, "audio": 0, "end": 644461, "filename": "/autoheal.pb"}, {"start": 644461, "audio": 0, "end": 1064807, "filename": "/splash_1536_2048.jpeg"}, {"start": 1064807, "audio": 0, "end": 1083694, "filename": "/shotgun.pb"}, {"start": 1083694, "audio": 0, "end": 1170968, "filename": "/splash_logo_1536_2048.raw"}, {"start": 1170968, "audio": 0, "end": 1194206, "filename": "/autoheal_1536_2048.raw"}, {"start": 1194206, "audio": 0, "end": 1209858, "filename": "/saw_1536_2048.raw"}, {"start": 1209858, "audio": 0, "end": 1246428, "filename": "/ingame_cats_suits_1536_2048.raw"}, {"start": 1246428, "audio": 0, "end": 1249661, "filename": "/popup.pb"}, {"start": 1249661, "audio": 0, "end": 1256627, "filename": "/emblems_1536_2048.raw"}, {"start": 1256627, "audio": 0, "end": 2062837, "filename": "/strings.xml"}, {"start": 2062837, "audio": 0, "end": 2072359, "filename": "/defence_logs_1536_2048.raw"}, {"start": 2072359, "audio": 0, "end": 2090862, "filename": "/sell_bucket.pb"}, {"start": 2090862, "audio": 0, "end": 2192634, "filename": "/BebasNeue_Bold.otf"}, {"start": 2192634, "audio": 0, "end": 2207421, "filename": "/nitro_1536_2048.raw"}, {"start": 2207421, "audio": 0, "end": 2213095, "filename": "/loading_1536_2048.raw"}, {"start": 2213095, "audio": 0, "end": 2246046, "filename": "/defence_logs.pb"}, {"start": 2246046, "audio": 0, "end": 2246611, "filename": "/body_texture_cork_2_1536_2048.raw"}, {"start": 2246611, "audio": 0, "end": 2272877, "filename": "/minigun.pb"}, {"start": 2272877, "audio": 0, "end": 2290317, "filename": "/leagues_buttons_1536_2048.raw"}, {"start": 2290317, "audio": 0, "end": 2685651, "filename": "/res.init"}, {"start": 2685651, "audio": 0, "end": 2706195, "filename": "/skills_1536_2048.raw"}, {"start": 2706195, "audio": 0, "end": 2807576, "filename": "/drill_long.pb"}, {"start": 2807576, "audio": 0, "end": 2856682, "filename": "/ingame_cats_hats_1536_2048.raw"}, {"start": 2856682, "audio": 0, "end": 2860147, "filename": "/main_screen_bgr_1536_2048.jpeg"}, {"start": 2860147, "audio": 0, "end": 2948907, "filename": "/fx_1536_2048.raw"}, {"start": 2948907, "audio": 0, "end": 2954234, "filename": "/box_timer_17c.pb"}, {"start": 2954234, "audio": 0, "end": 2965460, "filename": "/icon_skin_suit.pb"}, {"start": 2965460, "audio": 0, "end": 3036795, "filename": "/drills.pb"}, {"start": 3036795, "audio": 0, "end": 3099799, "filename": "/wheel_1536_2048.raw"}, {"start": 3099799, "audio": 0, "end": 3113535, "filename": "/gun_1536_2048.raw"}, {"start": 3113535, "audio": 0, "end": 3114321, "filename": "/nitro_dissapear.pb"}, {"start": 3114321, "audio": 0, "end": 3126728, "filename": "/impulse_1536_2048.raw"}, {"start": 3126728, "audio": 0, "end": 3127287, "filename": "/body_texture_iron_3_1536_2048.raw"}, {"start": 3127287, "audio": 0, "end": 3252725, "filename": "/zepto_logo_1536_2048.raw"}, {"start": 3252725, "audio": 0, "end": 3259138, "filename": "/main_menu_light.pb"}, {"start": 3259138, "audio": 0, "end": 3368618, "filename": "/chainsaw.pb"}, {"start": 3368618, "audio": 0, "end": 3369173, "filename": "/body_texture_cork_3_1536_2048.raw"}, {"start": 3369173, "audio": 0, "end": 3369733, "filename": "/body_texture_iron_2_1536_2048.raw"}, {"start": 3369733, "audio": 0, "end": 3397905, "filename": "/gang_and_leaderboards_1536_2048.raw"}, {"start": 3397905, "audio": 0, "end": 3398500, "filename": "/body_texture_gold_2_1536_2048.raw"}, {"start": 3398500, "audio": 0, "end": 3537968, "filename": "/cat_edit_screen.pb"}, {"start": 3537968, "audio": 0, "end": 3561261, "filename": "/hud_1536_2048.raw"}, {"start": 3561261, "audio": 0, "end": 3599817, "filename": "/icons_1536_2048.raw"}, {"start": 3599817, "audio": 0, "end": 3616361, "filename": "/loaderbar_full_1536_2048.png"}, {"start": 3616361, "audio": 0, "end": 3635011, "filename": "/shared_1536_2048.raw"}, {"start": 3635011, "audio": 0, "end": 3637316, "filename": "/autoheal_shop.pb"}, {"start": 3637316, "audio": 0, "end": 3661782, "filename": "/body_1536_2048.raw"}, {"start": 3661782, "audio": 0, "end": 4200106, "filename": "/tony.pb"}, {"start": 4200106, "audio": 0, "end": 4200671, "filename": "/body_texture_green_1_1536_2048.raw"}, {"start": 4200671, "audio": 0, "end": 4218217, "filename": "/offers_plate_1536_2048.raw"}, {"start": 4218217, "audio": 0, "end": 4218827, "filename": "/body_texture_gold_3_1536_2048.raw"}, {"start": 4218827, "audio": 0, "end": 4223648, "filename": "/edit_screen_item_switch.pb"}, {"start": 4223648, "audio": 0, "end": 4244400, "filename": "/double_gun_1536_2048.raw"}, {"start": 4244400, "audio": 0, "end": 4260640, "filename": "/balloon_gun_1536_2048.raw"}, {"start": 4260640, "audio": 0, "end": 4283101, "filename": "/zepto_splash.pb"}, {"start": 4283101, "audio": 0, "end": 4294660, "filename": "/fuse.pb"}, {"start": 4294660, "audio": 0, "end": 4323447, "filename": "/buttons_1536_2048.raw"}, {"start": 4323447, "audio": 0, "end": 4347855, "filename": "/shop_1536_2048.raw"}, {"start": 4347855, "audio": 0, "end": 4371090, "filename": "/flash.pb"}, {"start": 4371090, "audio": 0, "end": 4379251, "filename": "/impulse.pb"}, {"start": 4379251, "audio": 0, "end": 4396659, "filename": "/tony_1536_2048.raw"}, {"start": 4396659, "audio": 0, "end": 4447853, "filename": "/ingame_cats_1536_2048.raw"}, {"start": 4447853, "audio": 0, "end": 4484895, "filename": "/beam.pb"}, {"start": 4484895, "audio": 0, "end": 4496308, "filename": "/double_gun.pb"}, {"start": 4496308, "audio": 0, "end": 4548112, "filename": "/skills_icons_1536_2048.raw"}, {"start": 4548112, "audio": 0, "end": 4587476, "filename": "/main_screen_1536_2048.raw"}, {"start": 4587476, "audio": 0, "end": 4588044, "filename": "/body_texture_green_2_1536_2048.raw"}, {"start": 4588044, "audio": 0, "end": 4598039, "filename": "/skills_attention.pb"}, {"start": 4598039, "audio": 0, "end": 4754743, "filename": "/body_stickers_1536_2048.raw"}, {"start": 4754743, "audio": 0, "end": 4764109, "filename": "/loaderbar_empty_1536_2048.png"}, {"start": 4764109, "audio": 0, "end": 4764668, "filename": "/body_texture_cork_1_1536_2048.raw"}, {"start": 4764668, "audio": 0, "end": 4776906, "filename": "/gpx/gamepix.png"}], "remote_package_size": 4776906, "package_uuid": "50de44b9-bd7d-4b9d-97d2-c220cdfd37de"});

})();
