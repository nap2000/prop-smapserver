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
		metismenu: '../../../../js/libs/wb/metisMenu/jquery.metisMenu',
		pace: '../../../../js/libs/wb/pace/pace.min'
	},
	shim: {

		'common': ['jquery'],
		'bootstrap': ['jquery'],
		'metismenu': ['jquery']
	}
});

require([
	'jquery',
	'common',
	'localise',
	'globals',
	'moment',
	'metismenu',
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
	var gMailoutId = -1;
	var gCurrentMailOutId = -1;

	$(document).ready(function() {

		setCustomSubs();
		setupUserProfile(true);
		localise.setlang();		// Localise HTML

		$("#side-menu").metisMenu()

		getLoggedInUser(projectChanged, false, true, undefined);

		// Set change function on projects
		$('#project_name').change(function () {
			globals.gCurrentSurvey = -1;
			globals.gCurrentMailout = undefined;
			projectChanged();
		});

		$('#m_refresh').click(function(e) {	// Add refresh action
			mailoutChanged();
		});

		$('#m_add').click(function(){
			gSelectedId = -1;
			initMailoutDialog("add");
			$('#addMailoutPopup').modal("show");
		});

		$('#m_edit').click(function(){
			initMailoutDialog("edit");
			$('#addMailoutPopup').modal("show");
		});

		$('#addMailoutPopup').on('shown.bs.modal', function () {
			$('#mo_name').focus();
		});

		$('#saveMailout').click(function(){saveMailout();});

		/*
		 * Backup / Import
		 */
		$('#m_backup').click(function () {	// Export to XLS
			var tz = Intl.DateTimeFormat().resolvedOptions().timeZone,
				tzParam = "",
				url = '/surveyKPI/mailout/xls/' + $('#mailout').val(),
				hasParam = false,
				statusFilterArray = $('#status_filter').val();

			// Add parameters
			if (tz) {
				url += (hasParam ? '&' : '?') + "tz=" + encodeURIComponent(tz);
				hasParam = true;
			}
			downloadFile(url);
		});

		$('#m_import_xls').click(function () {	// Import from XLS
			var mailoutId = $('#mailout').val();
			if (mailoutId > 0) {
				$('#import_mailoutpeople').modal("show");
			} else {
				alert(localise.set["mo_ns"]);
			}
		});
		$(('#importMailoutGo')).click(function () {
			importMailout();
		});

	});

	/*
	 * Initialise the dialog
	 */
	function initMailoutDialog(action) {

		if(action === 'edit') {
			$('#mo_name').val(gSelectedRecord.name);
			gMailoutId = $('#mailout').val();
		} else {
			// new
			$('#mo_name').val("");
			gMailoutId = -1;
		}

	}
	/*
	 * Save a person
	 */
	function saveMailout() {

		var url,
			mailout = {},
			mailoutString,
			errorMsg;

		mailout.id = gMailoutId;
		mailout.survey_ident = $('#survey_name').val();
		mailout.name = $('#mo_name').val();

		/*
		 * Validation
		 */

		// name
		if(!errorMsg) {
			if(!mailout.name || mailout.name.trim().length == 0) {
				errorMsg = localise.set["msg_val_name"];
			}
		}

		if(!errorMsg) {

			mailoutString = JSON.stringify(mailout);
			url = '/surveyKPI/mailout'

			addHourglass();
			$.ajax({
				type: "POST",
				dataType: 'text',
				cache: false,
				async: true,
				url: url,
				data: { mailout: mailoutString },
				success: function(data, status) {
					removeHourglass();
					$('#addMailoutPopup').modal("hide");
					loadMailouts($('#survey_name').val());
				},
				error: function(xhr, textStatus, err) {
					removeHourglass();
					if(xhr.readyState == 0 || xhr.status == 0) {
						return;  // Not an error
					} else {
						alert(localise.set["msg_err_save"] + xhr.responseText);
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

	/*
     * Function called when the current project is changed
     */
	function projectChanged() {

		globals.gCurrentProject = $('#project_name option:selected').val();

		loadSurveys(globals.gCurrentProject, undefined, false, false, surveyChanged, true);			// Get surveys

		saveCurrentProject(globals.gCurrentProject,
			globals.gCurrentSurvey,
			globals.gCurrentTaskGroup);

	}

	/*
	 * Function called when the current survey is changed
	 */
	function surveyChanged() {
		gCurrentMailOutId = -1;
		loadMailouts($('#survey_name').val());
	}

	/*
     * Function called when the mailout is changed
     */
	function mailoutChanged() {

		gCurrentMailOutId = $('#mailout').val();

		var url = "/api/v1/mailout/" + gCurrentMailOutId + "?dt=true";
		if(table) {
			table.ajax.url(url).load();
		} else {
			setMailoutData(url);
		}
	}

	function setMailoutData(url) {

		table = $('#sub_table').DataTable({
			processing: true,
			scrollY: '70vh',
			scrollX: true,
			scrollCollapse: true,
			ajax: url,
			select: true,
			rowId: 'email',
			columns: [
				{ "data": "email" },
				{ "data": "name" },
				{ "data": "status_loc"  }
			],
			order: [[ 0, "asc" ]],
			initComplete: function () {
				this.api().columns().every( function () {
					var column = this;
					var select = $('<select><option value=""></option></select>')
						.appendTo( $(column.footer()).empty() )
						.on( 'change', function () {
							var val = $.fn.dataTable.util.escapeRegex(
								$(this).val()
							);

							column
								.search( val ? '^'+val+'$' : '', true, false )
								.draw();
						} );

					column.data().unique().sort().each( function ( d, j ) {
						select.append( '<option value="'+d+'">'+d+'</option>' )
					} );
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

	}


	function loadMailouts(surveyIdent) {

		var url="/surveyKPI/mailout/" + surveyIdent;

		addHourglass();

		$.ajax({
			url: url,
			dataType: 'json',
			cache: false,
			success: function(data) {
				removeHourglass();
				var h = [],
					idx = -1,
					i,
					count = 0,
					item,
					selValue;

				if(data) {
					for (i = 0; i < data.length; i++) {
						item = data[i];
						h[++idx] = '<option';
						if (count++ == 0) {
							selValue = item.id;
						}
						h[++idx] = ' value="';
						h[++idx] = item.id;
						h[++idx] = '">';
						h[++idx] = item.name;
						h[++idx] = '</option>';
					}
				}

				$('#mailout').empty().append(h.join(''));
				if(gCurrentMailOutId > 0) {
					$('#mailout').val(gCurrentMailOutId);
				} else {
					$('#mailout').val(selValue);
				}

			},
			error: function(xhr, textStatus, err) {

				removeHourglass();
				if(xhr.readyState == 0 || xhr.status == 0) {
					return;  // Not an error
				} else {
					alert(err);
				}
			}
		});
	}

	/*
     * Import mailout emails from a spreadsheet
     */
	function importMailout() {

		var mailoutId = $('#mailout').val();

		var url = '/surveyKPI/mailout/xls/' + mailoutId;

		var f = document.forms.namedItem("loadMailoutPeople");
		var formData = new FormData(f);

		$('#load_mailouts_alert').hide();

		addHourglass();
		$.ajax({
			type: "POST",
			data: formData,
			cache: false,
			contentType: false,
			processData: false,
			url: url,
			success: function (data, status) {
				removeHourglass();
				$('#import_mailoutpeople').modal("hide");
				$('#load_mailouts_alert').show().removeClass('alert-danger').addClass('alert-success').empty("");

			},
			error: function (xhr, textStatus, err) {
				removeHourglass();
				var msg = xhr.responseText;
				$('#load_mailouts_alert').show().removeClass('alert-success').addClass('alert-danger').html(msg);

			}
		});
	}

});

