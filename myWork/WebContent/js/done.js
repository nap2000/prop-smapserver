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
 * Purpose: Show a completion message to a use that has finished a survey
 */
var gUserLocale = navigator.language;
if (Modernizr.localstorage) {
	gUserLocale = localStorage.getItem('user_locale') || navigator.language;
}

requirejs.config({
	baseUrl: 'js/libs',
	waitSeconds: 0,
	locale: gUserLocale,
	paths: {
		app: '../app',
		i18n: '../../../../js/libs/i18n',
		async: '../../../../js/libs/async',
		localise: '../../../../js/app/localise',
		modernizr: '../../../../js/libs/modernizr',
		common: '../../../../js/app/common',
		globals: '../../../../js/app/globals',
		lang_location: '../../../../js'
	},
	shim: {
		'common': ['jquery']
	}
});

require([
	'jquery',
	'localise'
], function($, localise) {

	$(document).ready(function() {

		localise.setlang();		// Localise HTML

		$('.sent').show();

		$('#goback').click(function(){
			history.back();
		})

	});
	
	


});

