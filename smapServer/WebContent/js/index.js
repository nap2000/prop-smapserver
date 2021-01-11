var gUserLocale = navigator.language;
if (Modernizr.localstorage) {
	gUserLocale = localStorage.getItem('user_locale') || navigator.language;
} 


require.config({
    baseUrl: 'js/libs',
    waitSeconds: 0,
    locale: gUserLocale,
    paths: {
    	app: '../app',
	    jquery: 'jquery',
    	lang_location: '..'
    },
    shim: {
    	'app/common': ['jquery']
    }
});

require(['jquery', 'app/localise', 'app/common','app/globals'],
		function($,  localise, common, globals) {
	
	var params,
		pArray = [],
		param = [],
		i,
		loggedin=false,
		androidVersion;
	
	/*
	 * If the user is logged in then get their details
	 */
	params = location.search.substr(location.search.indexOf("?") + 1)
	pArray = params.split("&");
	for (i = 0; i < pArray.length; i++) {
		param = pArray[i].split("=");
		if(param.length > 1) {
			if ( param[0] === "loggedin" && param[1] === "yes" ) {
				getLoggedInUser(undefined, false, false, undefined, false, false);
				loggedin = true;
			} 
		}
	}

	/*
	 * Register service worker
	 */
	window.addEventListener('load', function() {
		if ('serviceWorker' in navigator) {
			navigator.serviceWorker.register('/app/myWorkServiceWorker.js').then(function (registration) {
				// Registration was successful
				console.log('ServiceWorker registration successful with scope: ', registration.scope);
			}, function (err) {
				// registration failed :(
				console.log('ServiceWorker registration failed: ', err);
			});
		}
	});

	/*
	 * If the user is not logged in then enable the login button and disable other menus
	 * which depend on their authorisation level
	 */
	if(loggedin) {
		setupUserProfile(true);
		localise.setlang();
		$('.loggedin').show();
		$('.notloggedin').hide();
	} else {
		setCustomMainLogo();
		$('.restrict_role').hide();
		$('.notloggedin').show();
		$('.loggedin').hide();
	}
	
	/*
	 * Enable self registration 
	 */
	if(isSelfRegistrationServer() && !loggedin) {
		$('#signup').show();
	} else {
		$('#signup').hide();
	}
	
	/*
	 * Add logout function
	 */
	$('#logout').click(function(){
		logout();
	});

	/*
	 * Add links to download fieldTask
	 */
	androidVersion = parseFloat(getAndroidVersion());
	if(androidVersion == 0 || androidVersion >= 4.1) {		// Default to downloading the new APK
		$('#ft').attr("href", "fieldTask.apk");
	} else {
		$('#ft').attr("href", "fieldTaskPreJellyBean.apk");
	}

 });

/*
 * Get the android version - return 0.0 if it cannot be determined
 */
function getAndroidVersion() {
    var ua = (navigator.userAgent).toLowerCase();
    var match = ua.match(/android\s([0-9\.]*)/);
    return match ? match[1] : 0;
};
