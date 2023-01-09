/*
 This file is part of SMAP.

 SMAP is free software: you can redistribute it and/or modify
 it under the terms of the GNU General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 SMAP is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.

 You should have received a copy of the GNU General Public License
 along with SMAP.  If not, see <http://www.gnu.org/licenses/>.

 */

/*
 * Purpose: Manage the panels that display graphs, maps etc of results data
 */

var gUserLocale = navigator.language;
if (Modernizr.localstorage) {
    gUserLocale = localStorage.getItem('user_locale') || navigator.language;
}

"use strict";
requirejs.config({
    baseUrl: 'js/libs',
    locale: gUserLocale,
    waitSeconds: 60,
    paths: {
        app: '../app',
        i18n: '../../../../js/libs/i18n',
        async: '../../../../js/libs/async',
        localise: '../../../../js/app/localise',
        modernizr: '../../../../js/libs/modernizr',
        common: '../../../../js/app/common',
        globals: '../../../../js/app/globals',
        toggle: 'bootstrap-toggle.min',
        lang_location: '../../../../js',
        file_input: '../../../../js/libs/bootstrap.file-input',
        datetimepicker: '../../../../js/libs/bootstrap-datetimepicker.min',
        pace: '../../../../js/libs/wb/plugins/pace/pace.min',
        knockout: '../../../../js/libs/knockout',
	    slimscroll: '../../../../js/libs/wb/plugins/slimscroll/jquery.slimscroll.min'

    },
    shim: {

        'common': ['jquery'],
        'datetimepicker': ['moment'],
        'app/plugins': ['jquery'],
        'file_input': ['jquery'],
        'app/summary_report': ['jquery'],
	    'slimscroll': ['jquery'],
        'toggle': ['bootstrap.min']
    }
});

require([
    'jquery',
    'common',
    'localise',
    'globals',
    'moment',
    'datetimepicker',
	'slimscroll'

], function ($,
             common,
             localise,
             globals,
             moment) {

    $(document).ready(function () {

        setCustomLinkages();
        setTheme();
        setupUserProfile(true);
        localise.setlang();		// Localise HTML

    });         // End of document ready



});


