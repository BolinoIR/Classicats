(function() {
    if (window.location.protocol === 'http:') {
        window.location.href = window.location.href.replace('http', 'https');
    }

    // declare listener for Add 2 home chrome functionality if supported by sw
    window.addEventListener('beforeinstallprompt', (e) => {
        // Prevent Chrome 67 and earlier from automatically showing the prompt
        e.preventDefault();
        // Stash the event so it can be triggered later.
        window.deferredPrompt = e;
    });

    function setCookie (name, value) {
        window.document.cookie = name + '=' + value + ';path=/; expires=Fri, 31 Dec 9999 23:59:59 GMT;';
    }

    const getCookie = (cname) => {
        var name = cname + "=";
        var decodedCookie = decodeURIComponent(document.cookie);
        var ca = decodedCookie.split(';');
        for (var i = 0; i < ca.length; i++) {
            var c = ca[i];
            while (c.charAt(0) == ' ') {
                c = c.substring(1);
            }
            if (c.indexOf(name) == 0) {
                return c.substring(name.length, c.length);
            }
        }
        return null;
    }

    function removeURLParameter (url, parameter) {
        //prefer to use l.search if you have a location/link object
        var urlparts = ('?' + url).split('?');
        if (urlparts.length >= 2) {

            var prefix = encodeURIComponent(parameter) + '=';
            var pars = urlparts[1].split(/[&;]/g);

            //reverse iteration as may be destructive
            for (var i = pars.length; i-- > 0;) {
                //idiom for string.startsWith
                if (pars[i].lastIndexOf(prefix, 0) !== -1) {
                    pars.splice(i, 1);
                }
            }

            return urlparts[0] + (pars.length > 0 ? pars.join('&') : '');
        }
        return url;
    }

    function deleteCookie (name) {
        document.cookie = name + '=;path=/;expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    }

    function urlBase64Decode (str) {
        var output = str.replace('-', '+').replace('_', '/');
        switch (output.length % 4) {
            case 0:
                break;
            case 2:
                output += '==';
                break;
            case 3:
                output += '=';
                break;
            default:
                throw 'Illegal base64url string!';
        }
        return window.atob(output);
    }

    function getClaimFromToken (tkn) {
        var _token = tkn;
        var claim = {};
        if (typeof _token !== 'undefined') {
            var encoded = _token.split('.')[1];
            claim = JSON.parse(urlBase64Decode(encoded));
        }
        return claim;
    }

    function getVarUrl (variable) {
        var query = window.location.search.substring(1);
        var vars = query.split('&');
        for (var i = 0; i < vars.length; i++) {
            var pair = vars[i].split('=');
            if (decodeURIComponent(pair[0]) === variable) {
                return decodeURIComponent(pair[1]);
            }
        }
        return undefined;
    }

    var token = getVarUrl('token');
    var is_new = getVarUrl('is_new');

    // controlla che is_new sia accompagnato anche dal token in qs
    if (is_new && token) setCookie('is_new', 1);

    if (token && window.location.pathname.match(/\/auth\//gi) !== null) {
        window.document.cookie = 'gpxtoken=' + token + ';path=/; expires=Fri, 31 Dec 9999 23:59:59 GMT;';

        var redirect_url = getClaimFromToken(token).redirect_url !== undefined ? decodeURIComponent(getClaimFromToken(token).redirect_url) : undefined;
        //clean redirectUrl from overrideid and cc=1 and guest=

        redirect_url = removeURLParameter(redirect_url, 'override_id');
        redirect_url = removeURLParameter(redirect_url, 'cc');

        //check if in redirect url there's avoidFakeNewUser=1, if is not present remove is_new cookie
        // because if you play the game with a xsolla token and is_new on query string you can always send is_new event inside InitManager.js file
        if (redirect_url.match(/avoidFakeNewUser=1/g) === null) {
            deleteCookie('is_new');
        } else {
            // remove this parameter from redirect url other fields
            //redirect_url = redirect_url.replace('avoidFakeNewUser=1', '').replace('&avoidFakeNewUser=1', '').replace('?avoidFakeNewUser=1', '');
            redirect_url = removeURLParameter(redirect_url, 'avoidFakeNewUser');
        }

        window.location.href = window.location.origin + '/game/' + (redirect_url ? '?' + redirect_url : '');
    } else {
        // TODO:
        // I don't have token and not in game page
    }
})()
