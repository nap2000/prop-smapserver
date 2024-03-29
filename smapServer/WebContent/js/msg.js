/*
 * This file is used by dynamic webforms generated by surveyMobileAPI.
 * It is not referenced by other files within the client module
 */
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
        lang_location: '/js'
    },
    shim: {
        'app/common': ['jquery']
    }
});

require(['jquery', 'app/localise'],
    function($,  localise) {
        localise.setlang();
    });

