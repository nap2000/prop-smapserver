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
 * Purpose: Allow the user to select a web form in order to complete a survey
 */
var gUserLocale = navigator.language;
if (Modernizr.localstorage) {
	gUserLocale = localStorage.getItem('user_locale') || navigator.language;
} 

requirejs.config({
    baseUrl: '/js/libs',
    waitSeconds: 0,
    locale: gUserLocale,
    paths: {
    	app: '/js/app',
       	lang_location: '/js'
    },
    shim: {
    	'app/common': ['jquery'],
        'app/data': ['jquery']
    }
});

require([
         'jquery',
         'app/common',
         'app/globals',
         'app/localise'
         ], function($, common, globals, localise) {

	$(document).ready(function() {

		setupUserProfile(true);
		setTheme();
		localise.setlang();		// Localise HTML

        getLoggedInUser(undefined, false, false, undefined);

		const ctx = document.getElementById('myChart');

		new Chart(ctx, {
			type: 'bar',
			data: {
				labels: ['Red', 'Blue', 'Yellow', 'Green', 'Purple', 'Orange'],
				datasets: [{
					label: '# of Votes',
					data: [12, 19, 3, 5, 2, 3],
					borderWidth: 1
				}]
			},
			options: {
				scales: {
					y: {
						beginAtZero: true
					}
				}
			}
		});


	});


});

