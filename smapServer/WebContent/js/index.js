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
			androidVersion;

		setTheme();
		setLogo();    // Show default logo

		/*
         * If the user is logged in then get their details
         */
		isLoggedIn();

		// Remove any service workers - this should only be a temporary fix until no existing users have the service worker version
		removeServiceWorker();

		// Get the server version
		getServerVersion();

		/*
         * Enable self registration
         */
		if(isSelfRegistrationServer()) {
			$('#signup').show().removeClass('d-none');
		} else {
			$('#signup').hide();
		}

		/*
         * Add links to download fieldTask
         */
		androidVersion = parseFloat(getAndroidVersion());
		if(androidVersion == 0 || androidVersion >= 4.1) {		// Default to downloading the new APK
			$('.ftapk').attr("href", "fieldTask.apk");
		} else {
			$('.ftapk').attr("href", "fieldTaskPreJellyBean.apk");
		}

 });

function isLoggedIn() {
	$.ajax({
		cache: false,
		url: "/authenticate/login.txt",
		success: function (data, status) {
			if(data == 'loggedin') {
				getLoggedInUser(undefined, false, false, undefined, false, false);
				setTheme();
				setupUserProfile(true);
				localise.setlang();
				$('.loggedin').show().removeClass('d-none');
				$('.notloggedin').hide();
			} else {
				$('.restrict_role').hide();
				$('.notloggedin').show().removeClass('d-none');;
				$('.loggedin').hide();
			}

		}, error: function (data, status) {
			$('.restrict_role').hide();
			$('.notloggedin').show().removeClass('d-none');;
			$('.loggedin').hide();

		}
	});
}

function getServerVersion() {
	$.ajax({
		cache: false,
		url: "/surveyKPI/server/version",
		success: function (data, status) {
			if(handleLogout(data)) {
				if(data) {
					$('#smap_version').text(data.replaceAll('_','.'));
				}
			}
		}, error: function (data, status) {

		}
	});
}

/*
 * Get the android version - return 0.0 if it cannot be determined
 */
function getAndroidVersion() {
    var ua = (navigator.userAgent).toLowerCase();
    var match = ua.match(/android\s([0-9\.]*)/);
    return match ? match[1] : 0;
};

/*
 * Remove any service workers associated with this site
 */
function removeServiceWorker() {
	if ('serviceWorker' in navigator) {
		navigator.serviceWorker.getRegistrations()
			.then(function(registrations) {
				for(let registration of registrations) {
					registration.unregister();
				}
			});
	}
}
