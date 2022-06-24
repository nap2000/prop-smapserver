var gUserLocale = navigator.language;
if (typeof(localStorage) !== "undefined") {
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

	setTheme();
	// Show default logo
	try {
		let mainLogo = localStorage.getItem("main_logo");
		if (typeof mainLogo !== 'undefined' && mainLogo !== "undefined" && mainLogo) {
			let img = document.getElementById('main_logo');
			console.log("Logo: " + mainLogo);
			img.setAttribute("src", mainLogo);
		}
	} catch (e) {

	}

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
	 * If the user is not logged in then enable the login button and disable other menus
	 * which depend on their authorisation level
	 */
	if(loggedin) {
		setTheme();
		setupUserProfile(true);
		localise.setlang();
		$('.loggedin').show().removeClass("d-none");
		$('.notloggedin').hide();
	} else {
		setCustomMainLogo();
		$('.restrict_role').hide();
		$('.notloggedin').show().removeClass("d-none");;
		$('.loggedin').hide();
	}
	
	/*
	 * Enable self registration 
	 */
	if(isSelfRegistrationServer() && !loggedin) {
		$('#signup').show().removeClass("d-none");;
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
