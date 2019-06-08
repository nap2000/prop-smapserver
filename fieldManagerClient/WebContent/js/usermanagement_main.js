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

requirejs.config({
    baseUrl: 'js/libs',
    locale: gUserLocale,
    waitSeconds: 0,
    paths: {
     	app: '../app',
     	i18n: '../../../../js/libs/i18n',
     	async: '../../../../js/libs/async',
     	localise: '../../../../js/app/localise',
    	bootstrapfileinput: '../../../../js/libs/bootstrap.file-input',
	    bootstrapcolorpicker: '../../../../js/libs/bootstrap-colorpicker.min',
    	common: '../../../../js/app/common',
    	globals: '../../../../js/app/globals',
    	crf: '../../../../js/libs/commonReportFunctions',
	    metismenu: '../../../../js/libs/wb/metisMenu/jquery.metisMenu',
    	lang_location: '../../../../js'
    },
    shim: {
       	'bootstrap': ['jquery'],
       	'bootstrapfileinput': ['jquery'],
	    'bootstrapcolorpicker': ['bootstrap', 'jquery'],
    	'common': ['jquery'],
	    'metismenu': ['jquery']
    	}
    });

require([
         'jquery',
         'common', 
         'localise', 
         'globals',
         'app/userManagement',
         'bootstrapfileinput',
		 'bootstrapcolorpicker',
		 'metismenu'
         
         ], function($, common, localise, globals) {

    setCustomUserMgmt();			// Apply custom javascript

});

