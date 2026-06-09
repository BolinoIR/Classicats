
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
    var PACKAGE_NAME = 'bin.hd.data.rest._.js';
    var REMOTE_PACKAGE_BASE = 'bin.hd.data.rest._.js';
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
              Module['removeRunDependency']('datafile_bin.hd.data.rest._.js');

    };
    Module['addRunDependency']('datafile_bin.hd.data.rest._.js');
  
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
 loadPackage({"files": [{"start": 0, "audio": 0, "end": 8743, "filename": "/bgr_8_anim.pb"}, {"start": 8743, "audio": 0, "end": 13289, "filename": "/bgr_8_1536_2048.jpeg"}, {"start": 13289, "audio": 0, "end": 15916, "filename": "/vignette.pb"}, {"start": 15916, "audio": 0, "end": 19054, "filename": "/bgr_1_1536_2048.jpeg"}, {"start": 19054, "audio": 0, "end": 28617, "filename": "/fx_bgr_08_light.pb"}, {"start": 28617, "audio": 0, "end": 31937, "filename": "/bgr_4_1536_2048.jpeg"}, {"start": 31937, "audio": 0, "end": 34688, "filename": "/ingame_get_medal.pb"}, {"start": 34688, "audio": 0, "end": 35419, "filename": "/gang_chest_grade.pb"}, {"start": 35419, "audio": 0, "end": 50653, "filename": "/walls_1536_2048.raw"}, {"start": 50653, "audio": 0, "end": 51668, "filename": "/box_idle_17c.pb"}, {"start": 51668, "audio": 0, "end": 56696, "filename": "/champ_result_1536_2048.raw"}, {"start": 56696, "audio": 0, "end": 72676, "filename": "/championship_map_1536_2048.raw"}, {"start": 72676, "audio": 0, "end": 89960, "filename": "/bets_popup_1536_2048.raw"}, {"start": 89960, "audio": 0, "end": 93664, "filename": "/bgr_7_1536_2048.jpeg"}, {"start": 93664, "audio": 0, "end": 95705, "filename": "/17c_timer_idle.pb"}, {"start": 95705, "audio": 0, "end": 252336, "filename": "/car_explosion.pb"}, {"start": 252336, "audio": 0, "end": 281425, "filename": "/rocket_explosion_1536_2048.raw"}, {"start": 281425, "audio": 0, "end": 289861, "filename": "/skip.pb"}, {"start": 289861, "audio": 0, "end": 320099, "filename": "/result_screen_popup_1536_2048.raw"}, {"start": 320099, "audio": 0, "end": 343825, "filename": "/frg_9_1536_2048.raw"}, {"start": 343825, "audio": 0, "end": 375176, "filename": "/bgr_vfx_1536_2048.raw"}, {"start": 375176, "audio": 0, "end": 394688, "filename": "/bets_screen_1536_2048.raw"}, {"start": 394688, "audio": 0, "end": 403237, "filename": "/championship_back_1536_2048.raw"}, {"start": 403237, "audio": 0, "end": 415858, "filename": "/frg_10_1536_2048.raw"}, {"start": 415858, "audio": 0, "end": 428827, "filename": "/frg_7_1536_2048.raw"}, {"start": 428827, "audio": 0, "end": 440386, "filename": "/tv_fx.pb"}, {"start": 440386, "audio": 0, "end": 479956, "filename": "/fx_bgr_10_background.pb"}, {"start": 479956, "audio": 0, "end": 494303, "filename": "/fx_bgr_03_light.pb"}, {"start": 494303, "audio": 0, "end": 515103, "filename": "/bgr_1_walls_1536_2048.raw"}, {"start": 515103, "audio": 0, "end": 536009, "filename": "/car_explosion_1536_2048.raw"}, {"start": 536009, "audio": 0, "end": 539709, "filename": "/bgr_3_1536_2048.jpeg"}, {"start": 539709, "audio": 0, "end": 548839, "filename": "/prestige_popup_1536_2048.raw"}, {"start": 548839, "audio": 0, "end": 568421, "filename": "/frg_6_1536_2048.raw"}, {"start": 568421, "audio": 0, "end": 575468, "filename": "/tutor.pb"}, {"start": 575468, "audio": 0, "end": 577462, "filename": "/quickfight_resultscreen.pb"}, {"start": 577462, "audio": 0, "end": 595554, "filename": "/championship_1536_2048.raw"}, {"start": 595554, "audio": 0, "end": 611589, "filename": "/fx_bgr_03.pb"}, {"start": 611589, "audio": 0, "end": 612842, "filename": "/ingame_winstreak.pb"}, {"start": 612842, "audio": 0, "end": 621410, "filename": "/teams_screen_1536_2048.raw"}, {"start": 621410, "audio": 0, "end": 642585, "filename": "/tv_frame_1536_2048.raw"}, {"start": 642585, "audio": 0, "end": 656210, "filename": "/fx_bgr_10_drops.pb"}, {"start": 656210, "audio": 0, "end": 667030, "filename": "/intro_giftbot.pb"}, {"start": 667030, "audio": 0, "end": 711937, "filename": "/bgr_1_suddendeath.pb"}, {"start": 711937, "audio": 0, "end": 738719, "filename": "/popup_bonus.pb"}, {"start": 738719, "audio": 0, "end": 741831, "filename": "/bgr_5_1536_2048.jpeg"}, {"start": 741831, "audio": 0, "end": 748484, "filename": "/frg_2_1536_2048.raw"}, {"start": 748484, "audio": 0, "end": 749487, "filename": "/gang_popups_1536_2048.raw"}, {"start": 749487, "audio": 0, "end": 777511, "filename": "/mentor_popup_1536_2048.raw"}, {"start": 777511, "audio": 0, "end": 797158, "filename": "/frg_8_1536_2048.raw"}, {"start": 797158, "audio": 0, "end": 798530, "filename": "/ingame_interface.pb"}, {"start": 798530, "audio": 0, "end": 801867, "filename": "/bgr_6_1536_2048.jpeg"}, {"start": 801867, "audio": 0, "end": 973034, "filename": "/box_opening_17c.pb"}, {"start": 973034, "audio": 0, "end": 1094755, "filename": "/tony_big.pb"}, {"start": 1094755, "audio": 0, "end": 1105560, "filename": "/prestige_popup_reward_1536_2048.raw"}, {"start": 1105560, "audio": 0, "end": 1110205, "filename": "/fx_bgr_05.pb"}, {"start": 1110205, "audio": 0, "end": 1125438, "filename": "/prestige_popup.pb"}, {"start": 1125438, "audio": 0, "end": 1236269, "filename": "/result_winstreak.pb"}, {"start": 1236269, "audio": 0, "end": 1240087, "filename": "/bgr_10_1536_2048.jpeg"}, {"start": 1240087, "audio": 0, "end": 1242099, "filename": "/wall_explosion.pb"}, {"start": 1242099, "audio": 0, "end": 1265767, "filename": "/rocket_explosion.pb"}, {"start": 1265767, "audio": 0, "end": 1289495, "filename": "/frg_5_1536_2048.raw"}, {"start": 1289495, "audio": 0, "end": 1303042, "filename": "/intro_giftbot_1536_2048.raw"}, {"start": 1303042, "audio": 0, "end": 1308255, "filename": "/wall_explosion_02.pb"}, {"start": 1308255, "audio": 0, "end": 1311336, "filename": "/bgr_9_1536_2048.jpeg"}, {"start": 1311336, "audio": 0, "end": 1314483, "filename": "/bgr_2_1536_2048.jpeg"}, {"start": 1314483, "audio": 0, "end": 1325985, "filename": "/frg_3_1536_2048.raw"}, {"start": 1325985, "audio": 0, "end": 1357088, "filename": "/result_popup.pb"}, {"start": 1357088, "audio": 0, "end": 1381895, "filename": "/bgr_2_suddendeath_1536_2048.raw"}, {"start": 1381895, "audio": 0, "end": 1387949, "filename": "/bets_screen_animation.pb"}, {"start": 1387949, "audio": 0, "end": 1391215, "filename": "/bgr_11_1536_2048.jpeg"}, {"start": 1391215, "audio": 0, "end": 1391887, "filename": "/ingame_heal_check.pb"}, {"start": 1391887, "audio": 0, "end": 1403568, "filename": "/frg_1_1536_2048.raw"}, {"start": 1403568, "audio": 0, "end": 1426492, "filename": "/frg_11_1536_2048.raw"}, {"start": 1426492, "audio": 0, "end": 1444703, "filename": "/frg_4_1536_2048.raw"}, {"start": 1444703, "audio": 0, "end": 1458391, "filename": "/box_opening_17c_1536_2048.raw"}, {"start": 1458391, "audio": 0, "end": 1485936, "filename": "/ingame_interface_1536_2048.raw"}, {"start": 1485936, "audio": 0, "end": 1487751, "filename": "/gpx/gangs_landing.jpg"}, {"start": 1487751, "audio": 0, "end": 1492993, "filename": "/gpx/fullscreen_off.png"}, {"start": 1492993, "audio": 0, "end": 1494160, "filename": "/gpx/gangs_bg.jpg"}, {"start": 1494160, "audio": 0, "end": 1499428, "filename": "/gpx/fullscreen_on.png"}, {"start": 1499428, "audio": 0, "end": 1503550, "filename": "/zps/super_box_open.zps"}, {"start": 1503550, "audio": 0, "end": 1508605, "filename": "/zps/gang_chest_grade.zps"}, {"start": 1508605, "audio": 0, "end": 1511625, "filename": "/zps/get_medal_trail.zps"}, {"start": 1511625, "audio": 0, "end": 1513828, "filename": "/zps/change_slot.zps"}, {"start": 1513828, "audio": 0, "end": 1518940, "filename": "/zps/lost_medal_flash.zps"}, {"start": 1518940, "audio": 0, "end": 1521890, "filename": "/zps/select_slot.zps"}, {"start": 1521890, "audio": 0, "end": 1527399, "filename": "/zps/bot_explosion.zps"}, {"start": 1527399, "audio": 0, "end": 1530125, "filename": "/zps/shotgun_shot_disapear.zps"}, {"start": 1530125, "audio": 0, "end": 1538610, "filename": "/zps/leagues_result_shine.zps"}, {"start": 1538610, "audio": 0, "end": 1543345, "filename": "/zps/legend_part.zps"}, {"start": 1543345, "audio": 0, "end": 1545651, "filename": "/zps/gacha_box_puff.zps"}, {"start": 1545651, "audio": 0, "end": 1548697, "filename": "/zps/confeti_fx.zps"}, {"start": 1548697, "audio": 0, "end": 1550418, "filename": "/zps/game_bgr_fx_common.zps"}, {"start": 1550418, "audio": 0, "end": 1551646, "filename": "/zps/sell_obj_buy_splash.zps"}, {"start": 1551646, "audio": 0, "end": 1559147, "filename": "/zps/flame_result_screen_2.zps"}, {"start": 1559147, "audio": 0, "end": 1565576, "filename": "/zps/drill_hit_1.zps"}, {"start": 1565576, "audio": 0, "end": 1570043, "filename": "/zps/shotgun_hit.zps"}, {"start": 1570043, "audio": 0, "end": 1572711, "filename": "/zps/burning_cat_fx.zps"}, {"start": 1572711, "audio": 0, "end": 1573762, "filename": "/zps/stats_shine.zps"}, {"start": 1573762, "audio": 0, "end": 1578902, "filename": "/zps/balloon_start.zps"}, {"start": 1578902, "audio": 0, "end": 1586766, "filename": "/zps/wall_exp_metal_square.zps"}, {"start": 1586766, "audio": 0, "end": 1594630, "filename": "/zps/wall_explosion_square.zps"}, {"start": 1594630, "audio": 0, "end": 1596259, "filename": "/zps/lost_medal_trail.zps"}, {"start": 1596259, "audio": 0, "end": 1599388, "filename": "/zps/bgr_04_side.zps"}, {"start": 1599388, "audio": 0, "end": 1604277, "filename": "/zps/bgr_9_foreground.zps"}, {"start": 1604277, "audio": 0, "end": 1613369, "filename": "/zps/bets_result_win.zps"}, {"start": 1613369, "audio": 0, "end": 1626870, "filename": "/zps/championship_over_popup.zps"}, {"start": 1626870, "audio": 0, "end": 1628818, "filename": "/zps/stage_future.zps"}, {"start": 1628818, "audio": 0, "end": 1632841, "filename": "/zps/impulse_circle.zps"}, {"start": 1632841, "audio": 0, "end": 1634537, "filename": "/zps/win_counter.zps"}, {"start": 1634537, "audio": 0, "end": 1636563, "filename": "/zps/bgr_10_foreground.zps"}, {"start": 1636563, "audio": 0, "end": 1640167, "filename": "/zps/bgr_9_back.zps"}, {"start": 1640167, "audio": 0, "end": 1641624, "filename": "/zps/flame_def_logs.zps"}, {"start": 1641624, "audio": 0, "end": 1643573, "filename": "/zps/bgr_8_confetti.zps"}, {"start": 1643573, "audio": 0, "end": 1647097, "filename": "/zps/magic_part.zps"}, {"start": 1647097, "audio": 0, "end": 1650355, "filename": "/zps/prestige_dots.zps"}, {"start": 1650355, "audio": 0, "end": 1653402, "filename": "/zps/bgr_8_flor.zps"}, {"start": 1653402, "audio": 0, "end": 1657876, "filename": "/zps/shotgun_trace.zps"}, {"start": 1657876, "audio": 0, "end": 1662001, "filename": "/zps/legendary_box_open.zps"}, {"start": 1662001, "audio": 0, "end": 1668372, "filename": "/zps/skill_active.zps"}, {"start": 1668372, "audio": 0, "end": 1669976, "filename": "/zps/fireworks.zps"}, {"start": 1669976, "audio": 0, "end": 1670884, "filename": "/zps/minigun_shell.zps"}, {"start": 1670884, "audio": 0, "end": 1677348, "filename": "/zps/drill_hit_3.zps"}, {"start": 1677348, "audio": 0, "end": 1679326, "filename": "/zps/minigun_shot.zps"}, {"start": 1679326, "audio": 0, "end": 1684584, "filename": "/zps/get_medal_flash.zps"}, {"start": 1684584, "audio": 0, "end": 1689299, "filename": "/zps/skills_upgrade.zps"}, {"start": 1689299, "audio": 0, "end": 1692211, "filename": "/zps/17b_main_menu_fx.zps"}, {"start": 1692211, "audio": 0, "end": 1697116, "filename": "/zps/bgr_06.zps"}, {"start": 1697116, "audio": 0, "end": 1699125, "filename": "/zps/bgr_10.zps"}, {"start": 1699125, "audio": 0, "end": 1704029, "filename": "/zps/impulse_direct.zps"}, {"start": 1704029, "audio": 0, "end": 1710420, "filename": "/zps/drill_hit_2.zps"}, {"start": 1710420, "audio": 0, "end": 1720708, "filename": "/zps/wall_explosion_rectangle.zps"}, {"start": 1720708, "audio": 0, "end": 1724792, "filename": "/zps/balloon_explosion.zps"}, {"start": 1724792, "audio": 0, "end": 1728618, "filename": "/zps/sell_obj.zps"}, {"start": 1728618, "audio": 0, "end": 1734443, "filename": "/zps/beam_shot.zps"}, {"start": 1734443, "audio": 0, "end": 1737589, "filename": "/zps/bots_bump.zps"}, {"start": 1737589, "audio": 0, "end": 1744172, "filename": "/zps/flame_result_screen_1.zps"}, {"start": 1744172, "audio": 0, "end": 1746898, "filename": "/zps/minigun_hit.zps"}, {"start": 1746898, "audio": 0, "end": 1749465, "filename": "/zps/bets_result_lose.zps"}, {"start": 1749465, "audio": 0, "end": 1753910, "filename": "/zps/rocket_trace.zps"}, {"start": 1753910, "audio": 0, "end": 1758313, "filename": "/zps/smoke_def_logs.zps"}, {"start": 1758313, "audio": 0, "end": 1761263, "filename": "/zps/saw_hit.zps"}, {"start": 1761263, "audio": 0, "end": 1762280, "filename": "/zps/awesome_hightlight.zps"}, {"start": 1762280, "audio": 0, "end": 1764037, "filename": "/zps/bgr_04_light.zps"}, {"start": 1764037, "audio": 0, "end": 1774325, "filename": "/zps/wall_exp_metal_rectangle.zps"}, {"start": 1774325, "audio": 0, "end": 1779468, "filename": "/zps/shotgun_start.zps"}, {"start": 1779468, "audio": 0, "end": 1781871, "filename": "/zps/bgr_04_bottom.zps"}, {"start": 1781871, "audio": 0, "end": 1782358, "filename": "/zps/prestige_rays.zps"}, {"start": 1782358, "audio": 0, "end": 1788017, "filename": "/zps/rocket_hit.zps"}, {"start": 1788017, "audio": 0, "end": 1789053, "filename": "/zps/skins_plate.zps"}, {"start": 1789053, "audio": 0, "end": 1791998, "filename": "/zps/autoheal.zps"}, {"start": 1791998, "audio": 0, "end": 1793486, "filename": "/zps/rocket_trace_const.zps"}, {"start": 1793486, "audio": 0, "end": 1801850, "filename": "/zps/fuse_particles.zps"}, {"start": 1801850, "audio": 0, "end": 1805972, "filename": "/zps/regular_box_open.zps"}], "remote_package_size": 1805972, "package_uuid": "409e2344-29e6-4a94-9188-699229c7f111"});

})();
