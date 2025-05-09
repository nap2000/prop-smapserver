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
	'localise',
	'app/db-storage'
], function($, localise, dbstorage) {

	$(document).ready(function() {

		setCustomChanges();
		localise.setlang();		// Localise HTML
		dbstorage.open();
		getHistory();

		if(location.search.indexOf("menu=yes") >= 0) {
			$('.menuopt').removeClass('d-none').show();
		}
	});

	$('#m_refresh').click(function(){
		getHistory();
	});


	function getHistory() {
		dbstorage.getHistory().then( function(history) {
			if (history) {
				showHistoryList(history);
			}
		});
	}
	function showHistoryList(history) {

		let $table = $('#historyList');
		$table.empty();
		if(history && history.length > 0) {
			for(item of history) {
				let status = item.status;
				if(!status || status === "") {
					status = "";
				} else if(item.status == "201" ) {
					status = localise.set["c_success"];
				} else {
					status = localise.set["c_error"] + " : " + item.status;
				}

				let action = "";
				if(item.action === "submit") {
					action = localise.set["submission"];
				} else if(item.action === "delete") {
					action = localise.set["c_deleted"];
				} else if(item.action === "save") {
					action = localise.set["c_save"];
				}

				if(item.date) {
					let elem = `<tr>
							<td>${item.date}</td>
							<td>${action}</td>
							<td>${item.name}</td>
							<td>${status}</td>
							<td>${item.instanceid}</td>
							</tr>tr>`;
					$table.append(elem);
				}
			}
		}
	}
});


