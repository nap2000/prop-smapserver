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
	    globals: '../../../../js/app/globals',
    	modernizr: '../../../../js/libs/modernizr',
	    moment: '../../../../js/libs/moment-with-locales.2.24.0',
    	common: '../../../../js/app/common',
    	lang_location: '../../../../js',
    	pace: '../../../../js/libs/wb/pace/pace.min'
    },
    shim: {

    	'common': ['jquery'],
    	'bootstrap': ['jquery']
    	}
    });

require([
         'jquery',
         'common',
         'localise',
		 'globals',
		 'moment',
         'pace'

         ], function($,
        		 common,
        		 localise,
        		 globals,
		         moment) {

	var table;
	var gSelectedIndexes;
	var gSelectedRecord;
	var gSelectedId;
	
	$(document).ready(function() {

        setCustomSubs();
		setTheme();
		setupUserProfile(true);
		localise.setlang();		// Localise HTML


		getLoggedInUser(gotUser, false, false, undefined);

		
	});

	function gotUser() {
		var tzString = globals.gTimezone ? "&tz=" + encodeURIComponent(globals.gTimezone) : "";
		table = $('#sub_table').DataTable({
			processing: true,
			scrollY: '70vh',
			scrollX: true,
			scrollCollapse: true,
			ajax: "/api/v1/subscriptions?dt=true" + tzString,
			select: true,
			rowId: 'id',
			columns: [
				{ "data": "email" },
				{ "data": "name" },
				{ "data": "status_loc"  },
				{ "data": "time_changed"  }
			],
			order: [[ 0, "asc" ]],
			initComplete: function () {
				this.api().columns().every( function () {
					var column = this;
					if (column.index() === 1 || column.index() === 2) {
						var select = $('<select><option value=""></option></select>')
							.appendTo($(column.footer()).empty())
							.on('change', function () {
								var val = $.fn.dataTable.util.escapeRegex(
									$(this).val()
								);

								column
									.search(val ? '^' + val + '$' : '', true, false)
									.draw();
							});

						column.data().unique().sort().each(function (d, j) {
							select.append('<option value="' + d + '">' + d + '</option>')
						});
					}
				} );

			}

		});

		$('#sub_table').find('td').css('white-space','initial').css('word-wrap', 'break-word');

		// Respond to selection of a row
		table.off('select').on('select', function (e, dt, type, indexes) {
			recordSelected(indexes);
		});
		table.off('deselect').on('deselect', function (e, dt, type, indexes) {
			$('.selectedOnly').hide();
		});

		$('#m_refresh').click(function(e) {	// Add refresh action
			table.ajax.reload();
		});

		$('#m_add').click(function(e){
			e.preventDefault();
			gSelectedId = -1;
			initPersonDialog(-1);
			$('#addPersonPopup').modal("show");
		});

		$('#m_edit').click(function(e){
			e.preventDefault();
			gSelectedId = gSelectedRecord.id;
			initPersonDialog(gSelectedRecord.id);
			$('#addPersonPopup').modal("show");
		});

		$('#m_del').click(function(e){
			e.preventDefault();
			gSelectedId = gSelectedRecord.id;

			msg = localise.set["msg_confirm_del"];
			msg += ": ";
			msg += gSelectedRecord.name;

			bootbox.confirm(msg, function(result){
				if(result) {
					deletePerson(gSelectedId);
				}
			});
		});


		$('#savePerson').click(function(){savePerson();});
	}
	/*
	 * Initialise the dialog
	 */
	function initPersonDialog(idx) {

		if(idx > 0) {
			// existing
			$('#p_email').val(gSelectedRecord.email);
			$('#p_name').val(gSelectedRecord.name);
		} else {
			// new
			$('#p_email').val("");
			$('#p_name').val("");
		}

	}

	/*
	 * Delete the entry for a person
	 */
	function deletePerson(id) {

		var url = '/surveyKPI/people/' + id;
		addHourglass();
		$.ajax({
			type: "DELETE",
			cache: false,
			async: true,
			url: url,
			success: function(data, status) {
				removeHourglass();
				table.rows( { selected: true } ).deselect();
				table.ajax.reload();
			},
			error: function(xhr, textStatus, err) {
				removeHourglass();
				if(xhr.readyState == 0 || xhr.status == 0) {
					return;  // Not an error
				} else {
					alert(localise.set["msg_err_del"] + " " + xhr.responseText);
				}
			}
		});
	}

	/*
	 * Save a person
	 */
	function savePerson() {

		var url,
			person = {},
			personString,
			errorMsg;

		person.email = $('#p_email').val();
		person.name = $('#p_name').val();

		/*
		 * Validation
		 *
		 * email
		 */

		if(person.email && person.email.trim().length > 0) {
			var emailArray = person.email.split(",");
			if(emailArray.length > 1) {
				errorMsg = localise.set["msg_inv_email"];
			}
			if (!validateEmails(person.email)) {
				errorMsg = localise.set["msg_inv_email"];
			}
		} else {
			errorMsg = localise.set["msg_inv_email"];
		}

		// name
		if(!errorMsg) {
			if(!person.name || person.name.trim().length == 0) {
				errorMsg = localise.set["msg_val_name"];
			}
		}

		if(!errorMsg) {

			person.id = gSelectedId;
			personString = JSON.stringify(person);
			url = '/surveyKPI/people'

			addHourglass();
			$.ajax({
				type: "POST",
				dataType: 'text',
				cache: false,
				async: true,
				url: url,
				data: { person: personString },
				success: function(data, status) {
					removeHourglass();
					table.ajax.reload();
					$('#addPersonPopup').modal("hide");
				},
				error: function(xhr, textStatus, err) {
					removeHourglass();
					if(xhr.readyState == 0 || xhr.status == 0) {
						return;  // Not an error
					} else {
						alert(localise.set["msg_err_save"] + " " + xhr.responseText);
					}
				}
			});

		} else {
			alert(errorMsg);
		}
	}

	function recordSelected(indexes) {
		$('.selectedOnly').show();
		gSelectedIndexes = indexes;
		gSelectedRecord = table.rows(gSelectedIndexes).data().toArray()[0];
	}
});

