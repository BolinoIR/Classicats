
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
    var PACKAGE_NAME = 'bin.data.rest._.js';
    var REMOTE_PACKAGE_BASE = 'bin.data.rest._.js';
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
Module['FS_createPath']('/', 'zps', true, true);

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
              Module['removeRunDependency']('datafile_bin.data.rest._.js');

    };
    Module['addRunDependency']('datafile_bin.data.rest._.js');
  
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
 loadPackage({"files": [{"start": 0, "audio": 0, "end": 8743, "filename": "/bgr_8_anim.pb"}, {"start": 8743, "audio": 0, "end": 10202, "filename": "/bgr_1_640_960.jpeg"}, {"start": 10202, "audio": 0, "end": 12829, "filename": "/vignette.pb"}, {"start": 12829, "audio": 0, "end": 22392, "filename": "/fx_bgr_08_light.pb"}, {"start": 22392, "audio": 0, "end": 23824, "filename": "/bgr_5_640_960.jpeg"}, {"start": 23824, "audio": 0, "end": 26575, "filename": "/ingame_get_medal.pb"}, {"start": 26575, "audio": 0, "end": 27306, "filename": "/gang_chest_grade.pb"}, {"start": 27306, "audio": 0, "end": 29065, "filename": "/bgr_8_640_960.jpeg"}, {"start": 29065, "audio": 0, "end": 30080, "filename": "/box_idle_17c.pb"}, {"start": 30080, "audio": 0, "end": 45859, "filename": "/frg_5_640_960.raw"}, {"start": 45859, "audio": 0, "end": 50897, "filename": "/prestige_popup_640_960.raw"}, {"start": 50897, "audio": 0, "end": 52938, "filename": "/17c_timer_idle.pb"}, {"start": 52938, "audio": 0, "end": 209569, "filename": "/car_explosion.pb"}, {"start": 209569, "audio": 0, "end": 223371, "filename": "/result_screen_popup_640_960.raw"}, {"start": 223371, "audio": 0, "end": 236412, "filename": "/walls_640_960.raw"}, {"start": 236412, "audio": 0, "end": 244848, "filename": "/skip.pb"}, {"start": 244848, "audio": 0, "end": 264614, "filename": "/frg_8_640_960.raw"}, {"start": 264614, "audio": 0, "end": 266081, "filename": "/bgr_10_640_960.jpeg"}, {"start": 266081, "audio": 0, "end": 267564, "filename": "/bgr_6_640_960.jpeg"}, {"start": 267564, "audio": 0, "end": 280815, "filename": "/frg_3_640_960.raw"}, {"start": 280815, "audio": 0, "end": 292955, "filename": "/mentor_popup_640_960.raw"}, {"start": 292955, "audio": 0, "end": 313959, "filename": "/rocket_explosion_640_960.raw"}, {"start": 313959, "audio": 0, "end": 315394, "filename": "/bgr_9_640_960.jpeg"}, {"start": 315394, "audio": 0, "end": 316854, "filename": "/bgr_11_640_960.jpeg"}, {"start": 316854, "audio": 0, "end": 328413, "filename": "/tv_fx.pb"}, {"start": 328413, "audio": 0, "end": 367983, "filename": "/fx_bgr_10_background.pb"}, {"start": 367983, "audio": 0, "end": 382330, "filename": "/fx_bgr_03_light.pb"}, {"start": 382330, "audio": 0, "end": 399973, "filename": "/bets_screen_640_960.raw"}, {"start": 399973, "audio": 0, "end": 409283, "filename": "/bgr_1_walls_640_960.raw"}, {"start": 409283, "audio": 0, "end": 430575, "filename": "/frg_9_640_960.raw"}, {"start": 430575, "audio": 0, "end": 437622, "filename": "/tutor.pb"}, {"start": 437622, "audio": 0, "end": 439616, "filename": "/quickfight_resultscreen.pb"}, {"start": 439616, "audio": 0, "end": 455651, "filename": "/fx_bgr_03.pb"}, {"start": 455651, "audio": 0, "end": 456904, "filename": "/ingame_winstreak.pb"}, {"start": 456904, "audio": 0, "end": 458449, "filename": "/bgr_3_640_960.jpeg"}, {"start": 458449, "audio": 0, "end": 472074, "filename": "/fx_bgr_10_drops.pb"}, {"start": 472074, "audio": 0, "end": 482894, "filename": "/intro_giftbot.pb"}, {"start": 482894, "audio": 0, "end": 492606, "filename": "/frg_11_640_960.raw"}, {"start": 492606, "audio": 0, "end": 537513, "filename": "/bgr_1_suddendeath.pb"}, {"start": 537513, "audio": 0, "end": 564127, "filename": "/popup_bonus.pb"}, {"start": 564127, "audio": 0, "end": 576019, "filename": "/frg_10_640_960.raw"}, {"start": 576019, "audio": 0, "end": 588573, "filename": "/frg_2_640_960.raw"}, {"start": 588573, "audio": 0, "end": 589945, "filename": "/ingame_interface.pb"}, {"start": 589945, "audio": 0, "end": 609732, "filename": "/bgr_vfx_640_960.raw"}, {"start": 609732, "audio": 0, "end": 780899, "filename": "/box_opening_17c.pb"}, {"start": 780899, "audio": 0, "end": 902620, "filename": "/tony_big.pb"}, {"start": 902620, "audio": 0, "end": 914136, "filename": "/frg_6_640_960.raw"}, {"start": 914136, "audio": 0, "end": 914613, "filename": "/gang_popups_640_960.raw"}, {"start": 914613, "audio": 0, "end": 919258, "filename": "/fx_bgr_05.pb"}, {"start": 919258, "audio": 0, "end": 930535, "filename": "/bgr_2_suddendeath_640_960.raw"}, {"start": 930535, "audio": 0, "end": 945768, "filename": "/prestige_popup.pb"}, {"start": 945768, "audio": 0, "end": 1056515, "filename": "/result_winstreak.pb"}, {"start": 1056515, "audio": 0, "end": 1058527, "filename": "/wall_explosion.pb"}, {"start": 1058527, "audio": 0, "end": 1060533, "filename": "/champ_result_640_960.raw"}, {"start": 1060533, "audio": 0, "end": 1084201, "filename": "/rocket_explosion.pb"}, {"start": 1084201, "audio": 0, "end": 1096738, "filename": "/teams_screen_640_960.raw"}, {"start": 1096738, "audio": 0, "end": 1108985, "filename": "/box_opening_17c_640_960.raw"}, {"start": 1108985, "audio": 0, "end": 1127303, "filename": "/frg_4_640_960.raw"}, {"start": 1127303, "audio": 0, "end": 1128791, "filename": "/bgr_4_640_960.jpeg"}, {"start": 1128791, "audio": 0, "end": 1140846, "filename": "/ingame_interface_640_960.raw"}, {"start": 1140846, "audio": 0, "end": 1149969, "filename": "/prestige_popup_reward_640_960.raw"}, {"start": 1149969, "audio": 0, "end": 1157583, "filename": "/bets_popup_640_960.raw"}, {"start": 1157583, "audio": 0, "end": 1173939, "filename": "/frg_7_640_960.raw"}, {"start": 1173939, "audio": 0, "end": 1179152, "filename": "/wall_explosion_02.pb"}, {"start": 1179152, "audio": 0, "end": 1199545, "filename": "/tv_frame_640_960.raw"}, {"start": 1199545, "audio": 0, "end": 1207911, "filename": "/championship_640_960.raw"}, {"start": 1207911, "audio": 0, "end": 1229443, "filename": "/intro_giftbot_640_960.raw"}, {"start": 1229443, "audio": 0, "end": 1259454, "filename": "/result_popup.pb"}, {"start": 1259454, "audio": 0, "end": 1265508, "filename": "/bets_screen_animation.pb"}, {"start": 1265508, "audio": 0, "end": 1283634, "filename": "/car_explosion_640_960.raw"}, {"start": 1283634, "audio": 0, "end": 1284306, "filename": "/ingame_heal_check.pb"}, {"start": 1284306, "audio": 0, "end": 1285725, "filename": "/bgr_2_640_960.jpeg"}, {"start": 1285725, "audio": 0, "end": 1299803, "filename": "/frg_1_640_960.raw"}, {"start": 1299803, "audio": 0, "end": 1315302, "filename": "/championship_map_640_960.raw"}, {"start": 1315302, "audio": 0, "end": 1325080, "filename": "/championship_back_640_960.raw"}, {"start": 1325080, "audio": 0, "end": 1326767, "filename": "/bgr_7_640_960.jpeg"}, {"start": 1326767, "audio": 0, "end": 1328582, "filename": "/gpx/gangs_landing.jpg"}, {"start": 1328582, "audio": 0, "end": 1333824, "filename": "/gpx/fullscreen_off.png"}, {"start": 1333824, "audio": 0, "end": 1334991, "filename": "/gpx/gangs_bg.jpg"}, {"start": 1334991, "audio": 0, "end": 1340259, "filename": "/gpx/fullscreen_on.png"}, {"start": 1340259, "audio": 0, "end": 1344381, "filename": "/zps/super_box_open.zps"}, {"start": 1344381, "audio": 0, "end": 1349436, "filename": "/zps/gang_chest_grade.zps"}, {"start": 1349436, "audio": 0, "end": 1352456, "filename": "/zps/get_medal_trail.zps"}, {"start": 1352456, "audio": 0, "end": 1354659, "filename": "/zps/change_slot.zps"}, {"start": 1354659, "audio": 0, "end": 1359771, "filename": "/zps/lost_medal_flash.zps"}, {"start": 1359771, "audio": 0, "end": 1362721, "filename": "/zps/select_slot.zps"}, {"start": 1362721, "audio": 0, "end": 1368230, "filename": "/zps/bot_explosion.zps"}, {"start": 1368230, "audio": 0, "end": 1370956, "filename": "/zps/shotgun_shot_disapear.zps"}, {"start": 1370956, "audio": 0, "end": 1379441, "filename": "/zps/leagues_result_shine.zps"}, {"start": 1379441, "audio": 0, "end": 1384176, "filename": "/zps/legend_part.zps"}, {"start": 1384176, "audio": 0, "end": 1386482, "filename": "/zps/gacha_box_puff.zps"}, {"start": 1386482, "audio": 0, "end": 1389528, "filename": "/zps/confeti_fx.zps"}, {"start": 1389528, "audio": 0, "end": 1391249, "filename": "/zps/game_bgr_fx_common.zps"}, {"start": 1391249, "audio": 0, "end": 1392477, "filename": "/zps/sell_obj_buy_splash.zps"}, {"start": 1392477, "audio": 0, "end": 1399978, "filename": "/zps/flame_result_screen_2.zps"}, {"start": 1399978, "audio": 0, "end": 1406407, "filename": "/zps/drill_hit_1.zps"}, {"start": 1406407, "audio": 0, "end": 1410874, "filename": "/zps/shotgun_hit.zps"}, {"start": 1410874, "audio": 0, "end": 1413542, "filename": "/zps/burning_cat_fx.zps"}, {"start": 1413542, "audio": 0, "end": 1414593, "filename": "/zps/stats_shine.zps"}, {"start": 1414593, "audio": 0, "end": 1419733, "filename": "/zps/balloon_start.zps"}, {"start": 1419733, "audio": 0, "end": 1427597, "filename": "/zps/wall_exp_metal_square.zps"}, {"start": 1427597, "audio": 0, "end": 1435461, "filename": "/zps/wall_explosion_square.zps"}, {"start": 1435461, "audio": 0, "end": 1437090, "filename": "/zps/lost_medal_trail.zps"}, {"start": 1437090, "audio": 0, "end": 1440219, "filename": "/zps/bgr_04_side.zps"}, {"start": 1440219, "audio": 0, "end": 1445108, "filename": "/zps/bgr_9_foreground.zps"}, {"start": 1445108, "audio": 0, "end": 1454200, "filename": "/zps/bets_result_win.zps"}, {"start": 1454200, "audio": 0, "end": 1467701, "filename": "/zps/championship_over_popup.zps"}, {"start": 1467701, "audio": 0, "end": 1469649, "filename": "/zps/stage_future.zps"}, {"start": 1469649, "audio": 0, "end": 1473672, "filename": "/zps/impulse_circle.zps"}, {"start": 1473672, "audio": 0, "end": 1475368, "filename": "/zps/win_counter.zps"}, {"start": 1475368, "audio": 0, "end": 1477394, "filename": "/zps/bgr_10_foreground.zps"}, {"start": 1477394, "audio": 0, "end": 1480998, "filename": "/zps/bgr_9_back.zps"}, {"start": 1480998, "audio": 0, "end": 1482455, "filename": "/zps/flame_def_logs.zps"}, {"start": 1482455, "audio": 0, "end": 1484404, "filename": "/zps/bgr_8_confetti.zps"}, {"start": 1484404, "audio": 0, "end": 1487928, "filename": "/zps/magic_part.zps"}, {"start": 1487928, "audio": 0, "end": 1491186, "filename": "/zps/prestige_dots.zps"}, {"start": 1491186, "audio": 0, "end": 1494233, "filename": "/zps/bgr_8_flor.zps"}, {"start": 1494233, "audio": 0, "end": 1498707, "filename": "/zps/shotgun_trace.zps"}, {"start": 1498707, "audio": 0, "end": 1502832, "filename": "/zps/legendary_box_open.zps"}, {"start": 1502832, "audio": 0, "end": 1509203, "filename": "/zps/skill_active.zps"}, {"start": 1509203, "audio": 0, "end": 1510807, "filename": "/zps/fireworks.zps"}, {"start": 1510807, "audio": 0, "end": 1511715, "filename": "/zps/minigun_shell.zps"}, {"start": 1511715, "audio": 0, "end": 1518179, "filename": "/zps/drill_hit_3.zps"}, {"start": 1518179, "audio": 0, "end": 1520157, "filename": "/zps/minigun_shot.zps"}, {"start": 1520157, "audio": 0, "end": 1525415, "filename": "/zps/get_medal_flash.zps"}, {"start": 1525415, "audio": 0, "end": 1530130, "filename": "/zps/skills_upgrade.zps"}, {"start": 1530130, "audio": 0, "end": 1533042, "filename": "/zps/17b_main_menu_fx.zps"}, {"start": 1533042, "audio": 0, "end": 1537947, "filename": "/zps/bgr_06.zps"}, {"start": 1537947, "audio": 0, "end": 1539956, "filename": "/zps/bgr_10.zps"}, {"start": 1539956, "audio": 0, "end": 1544860, "filename": "/zps/impulse_direct.zps"}, {"start": 1544860, "audio": 0, "end": 1551251, "filename": "/zps/drill_hit_2.zps"}, {"start": 1551251, "audio": 0, "end": 1561539, "filename": "/zps/wall_explosion_rectangle.zps"}, {"start": 1561539, "audio": 0, "end": 1565623, "filename": "/zps/balloon_explosion.zps"}, {"start": 1565623, "audio": 0, "end": 1569449, "filename": "/zps/sell_obj.zps"}, {"start": 1569449, "audio": 0, "end": 1575274, "filename": "/zps/beam_shot.zps"}, {"start": 1575274, "audio": 0, "end": 1578420, "filename": "/zps/bots_bump.zps"}, {"start": 1578420, "audio": 0, "end": 1585003, "filename": "/zps/flame_result_screen_1.zps"}, {"start": 1585003, "audio": 0, "end": 1587729, "filename": "/zps/minigun_hit.zps"}, {"start": 1587729, "audio": 0, "end": 1590296, "filename": "/zps/bets_result_lose.zps"}, {"start": 1590296, "audio": 0, "end": 1594741, "filename": "/zps/rocket_trace.zps"}, {"start": 1594741, "audio": 0, "end": 1599144, "filename": "/zps/smoke_def_logs.zps"}, {"start": 1599144, "audio": 0, "end": 1602094, "filename": "/zps/saw_hit.zps"}, {"start": 1602094, "audio": 0, "end": 1603111, "filename": "/zps/awesome_hightlight.zps"}, {"start": 1603111, "audio": 0, "end": 1604868, "filename": "/zps/bgr_04_light.zps"}, {"start": 1604868, "audio": 0, "end": 1615156, "filename": "/zps/wall_exp_metal_rectangle.zps"}, {"start": 1615156, "audio": 0, "end": 1620299, "filename": "/zps/shotgun_start.zps"}, {"start": 1620299, "audio": 0, "end": 1622702, "filename": "/zps/bgr_04_bottom.zps"}, {"start": 1622702, "audio": 0, "end": 1623189, "filename": "/zps/prestige_rays.zps"}, {"start": 1623189, "audio": 0, "end": 1628848, "filename": "/zps/rocket_hit.zps"}, {"start": 1628848, "audio": 0, "end": 1629884, "filename": "/zps/skins_plate.zps"}, {"start": 1629884, "audio": 0, "end": 1632829, "filename": "/zps/autoheal.zps"}, {"start": 1632829, "audio": 0, "end": 1634317, "filename": "/zps/rocket_trace_const.zps"}, {"start": 1634317, "audio": 0, "end": 1642681, "filename": "/zps/fuse_particles.zps"}, {"start": 1642681, "audio": 0, "end": 1646803, "filename": "/zps/regular_box_open.zps"}], "remote_package_size": 1646803, "package_uuid": "8ad213fb-06a6-4f78-9b52-47ea0501a772"});

})();
