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

require.config({
    baseUrl: 'js/libs',
    locale: gUserLocale,
    waitSeconds: 0,
    paths: {
     	app: '../app',
     	main: '..',
     	i18n: '../../../../js/libs/i18n',
     	async: '../../../../js/libs/async',
     	localise: '../../../../js/app/localise',
    	rmm: '../../../../js/libs/responsivemobilemenu',
    	common: '../../../../js/app/common',
        data: '../../../../js/app/data',
    	globals: '../../../../js/app/globals',
    	moment: '../../../../js/libs/moment-with-locales.min',
		tablesorter: '../../../../js/libs/jquery.tablesorter.min',
    	crf: '../../../../js/libs/commonReportFunctions',
    	pace: '../../../../js/libs/wb/plugins/pace/pace.min',
    	lang_location: '../../../../js'

    },
    shim: {
    	'rmm': ['jquery'],
    	'jquery.dataTables.min': ['jquery'],
    	'common': ['jquery'],
    	
    	'app/jqplot_image': ['jquery'],
    	'app/map-functions': ['jquery'],
    	'app/map-ol': ['jquery', 'globals'],
    	'app/graph-functions': ['main/jqplot_main'],
    	'app/graph-view2': ['jquery'],
    	'app/table-functions': ['jquery'],
    	'app/table-view': ['jquery'],
    	'app/media-view': ['jquery'],	
    	'app/survey_control': ['jquery_ui'],	
    	'app/plugins': ['jquery'],
    	'app/script': ['jquery_ui'],
    	'data': ['jquery'],
    	'tablesorter': ['jquery'],
    	'app/panels': ['jquery', 'moment'],
    	'crf': ['jquery'],
    	'pace': ['jquery'],
    	'main/jqplot_main': ['jquery']
    	
    	}
    });

require(['jquery', 'jquery_ui', 'rmm', 'common', 'localise', 'globals', 'moment',
         
         'main/jqplot_main',
         'jquery.dataTables.min',
         
         'app/jqplot_image',
         'app/map-functions',
         'app/map-ol',
         'app/graph-functions',
         'app/graph-view2',
         'app/table-functions',
         'app/table-view',
         'app/media-view',
         'app/survey_control',
         'app/plugins',
         'app/script',
         'data',
         'app/panels',
         'pace',
         'tablesorter',
         'crf'
         
         ], function($, jquery_ui, rmm, common, localise, globals, moment) {
    setCustomDashboard();			// Apply custom javascript
	window.localise = localise;
    initialiseDialogs();


});

