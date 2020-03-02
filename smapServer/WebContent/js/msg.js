var gUserLocale = navigator.language;
if (Modernizr.localstorage) {
	gUserLocale = localStorage.getItem('user_locale') || navigator.language;
} 

require.config({
    baseUrl: '/js/libs',
    waitSeconds: 0,
    locale: gUserLocale,
    paths: {
    	app: '/js/app',
    	jquery: '/js/libs/jquery-2.1.1',
    	lang_location: '/js'
    },
    shim: {
    	'bootstrap.min': ['jquery'],
    	'app/common': ['jquery']
    }
});

require(['jquery', 'bootstrap.min', 'app/localise'],
	function($, bootstrap, localise) {
			localise.setlang();
});

