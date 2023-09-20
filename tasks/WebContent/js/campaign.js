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
		moment: '../../../../js/libs/moment-with-locales.2.24.0',
		common: '../../../../js/app/common',
		lang_location: '../../../../js',
		pace: '../../../../js/libs/wb/pace/pace.min'
	},
	shim: {
		'common': ['jquery'],
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
	var gMailoutEditIdx = -1;
	var gCurrentMailOutIdx = -1;
	var gMailouts = [];
	var gSurveyList = [];
	var gRetry;

	$(document).ready(function() {

		setCustomSubs();
		setTheme();
		setupUserProfile(true);
		localise.setlang();		// Localise HTML

		$('#m_edit, #m_delete').addClass("disabled");

		getLoggedInUser(projectChanged, false, true, undefined);

		// Set change function on projects
		$('#project_name').change(function () {
			globals.gCurrentSurvey = -1;
			globals.gCurrentMailout = undefined;
			projectChanged();
		});

		//Set change function on survey
		$('#survey_name').change(function () {
			surveyChangedCampaign();
		});

		//Set change function on mailout id
		$('#mailout').change(function () {
			mailoutChanged(true);
		});

		$('#m_refresh').click(function(e) {	// Add refresh action
			mailoutChanged(true);
		});

		$('#m_add').click(function(){
			gSelectedId = -1;
			if((typeof $('#survey_name').val()) !== "string") {
				alert(localise.set["msg_sel_survey"]);	// There must be a selected survey
				return;
			}
			initMailoutDialog("add");
			$('#addMailoutPopup').modal("show");
		});

		$('#m_delete').click(function(){
			var msg = localise.set["mo_del"];
			msg = msg.replace("%s1", gMailouts[gCurrentMailOutIdx].name);
			$('#confirmDeleteMsg').html(msg);
			$('#confirmDeletePopup').modal("show");
		});

		$('#confirmDeleteGo').click(function(){
			addHourglass();
			$.ajax({
				type: "DELETE",
				cache: false,
				async: true,
				url: '/surveyKPI/mailout',
				data: { mailoutId: gMailouts[gCurrentMailOutIdx].id },
				success: function(data, status) {
					removeHourglass();
					$('#confirmDeletePopup').modal("hide");
					gCurrentMailOutIdx = -1;
					loadMailouts();
					clearMailoutStatus();
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
		});

		$('#confirmGenGo').click(function () {
			generateLinksGo();
		});

		$('#confirmSendGo').click(function () {
			sendUnsentGo();
		});

		/*
		 * Edit mailout
		 */
		$('#m_edit').click(function(){
			initMailoutDialog("edit");
			$('#addMailoutPopup').modal("show");
		});

		$('#addMailoutPopup').on('shown.bs.modal', function () {
			$('#mo_name').focus();
		});

		$('#saveMailout').click(function(){saveMailout();});

		/*
		 * Record details
		 */
		$('#m_view_details').click(function(e){
			e.preventDefault();
			$('#mo_initial_data').val(JSON.stringify(gSelectedRecord.initialData, null, 4));
			$('#mo_link').val(gSelectedRecord.url);
			$('#vrd').modal("show");
		});

		/*
		 * Backup / Import
		 */
		$('#m_export_xls').click(function () {	// Export to XLS

			if(gCurrentMailOutIdx && gCurrentMailOutIdx >= 0) {

				var tz = Intl.DateTimeFormat().resolvedOptions().timeZone,
					tzParam = "",
					url = '/surveyKPI/mailout/xls/' + gMailouts[gCurrentMailOutIdx].id,
					hasParam = false,
					statusFilterArray = $('#status_filter').val();


				// Add parameters
				if (tz) {
					url += (hasParam ? '&' : '?') + "tz=" + encodeURIComponent(tz);
					hasParam = true;
				}
				downloadFile(url);
			} else {
				alert(localise.set["mo_ns"]);
			}
		});

		$('#m_import_xls').click(function () {	// Import from XLS

			if (gCurrentMailOutIdx && gCurrentMailOutIdx >= 0) {
				$('#load_mailouts_alert').hide();
				$('#import_mailoutpeople').modal("show");
				$('.custom-file-input').val("");
				$('#importMailoutPeopleLabel').html("");
				$('#loadMailoutPeople')[0].reset();
			} else {
				alert(localise.set["mo_ns"]);
			}
		});

		// Respond to selection of a file for upload
		$('.custom-file-label').attr('data-browse', localise.set["c_browse"]);
		$('.custom-file-input').on('change',function(){
			var fileName = $(this).val();
			var endPath = fileName.lastIndexOf("\\");
			if(endPath > 0) {
				fileName = fileName.substring(endPath + 1);
			}
			$(this).next('.custom-file-label').html(fileName);
		});

		$(('#importMailoutGo')).click(function () {
			importMailout();
		});

		/*
		 * Generate links to complete the webforms
		 */
		$(('#m_gen')).click(function (e) {
			e.preventDefault();
			generateLinks();
		});

		/*
		 * Send unsent
		 */
		$(('#m_send')).click(function (e) {
			e.preventDefault();
			sendUnsent(false);
		});

		$(('#m_retry')).click(function (e) {
			e.preventDefault();
			sendUnsent(true);
		});

		/*
	     * SHow and hide the controls
	     */
		$('#hideFilters').click(function(){
			$('.filtersShown').hide();
			$('.filtersHidden').show();
			return false;
		});

		$('#showFilters').click(function(){
			$('.filtersShown').show();
			$('.filtersHidden').hide();
			return false;
		});
	});

	/*
	 * Initialise the dialog
	 */
	function initMailoutDialog(action) {

		if(action === 'edit') {
			$('#mo_name').val(gMailouts[gCurrentMailOutIdx].name);
			$('#mo_subject').val(gMailouts[gCurrentMailOutIdx].subject);
			$('#mo_content').val(gMailouts[gCurrentMailOutIdx].content);
			$('#mo_ms').prop('checked', gMailouts[gCurrentMailOutIdx].multiple_submit);
			$('#mo_anon').prop('checked', gMailouts[gCurrentMailOutIdx].anonymous);
			gMailoutEditIdx = gCurrentMailOutIdx;
		} else {
			// new
			$('#mo_name').val("");
			$('#mo_subject').val("");
			$('#mo_content').val("");
			$('#mo_ms').prop('checked', false);
			$('#mo_anon').prop('checked', false);
			gMailoutEditIdx = -1;
		}

	}
	/*
	 * Save a Mailout
	 */
	function saveMailout() {

		var url,
			mailout = {},
			mailoutString,
			errorMsg;
		var $survey = $('#survey_name');
		var surveyIdx = $survey.val();

		if(gMailoutEditIdx >= 0) {
			mailout.id = gMailouts[gMailoutEditIdx].id;
		} else {
			mailout.id = -1;
		}

		mailout.survey_ident = gSurveyList[surveyIdx].ident;
		mailout.name = $('#mo_name').val();
		mailout.subject = $('#mo_subject').val();
		mailout.content = $('#mo_content').val();
		mailout.multiple_submit = $('#mo_ms').prop('checked');
		mailout.anonymous = $('#mo_anon').prop('checked');

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
			url = '/api/v1/mailout'

			addHourglass();
			$.ajax({
				type: "POST",
				dataType: 'json',
				cache: false,
				async: true,
				url: url,
				data: { mailout: mailoutString },
				success: function(data, status) {
					removeHourglass();
					$('#addMailoutPopup').modal("hide");
					loadMailouts(data.id);
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

	/*
     * Function called when the current project is changed
     */
	function projectChanged() {

		globals.gCurrentProject = $('#project_name option:selected').val();

		loadSurveys(globals.gCurrentProject, undefined, false, false, surveysLoaded, true);			// Get surveys

		clearMailoutStatus();

		saveCurrentProject(globals.gCurrentProject,
			globals.gCurrentSurvey,
			globals.gCurrentTaskGroup);

	}

	/*
	 * Function called when the list of surveys is loaded
	 */
	function surveysLoaded(data) {
		gSurveyList = data;
		surveyChangedCampaign();
	}

	/*
	 * Function called when the current survey is changed
	 */
	function surveyChangedCampaign() {

		var $survey = $('#survey_name');
		var surveyIdx = $survey.val();

		globals.gCurrentSurvey = gSurveyList[surveyIdx].id;
		gCurrentMailOutIdx = -1;

		clearMailoutStatus()
		loadMailouts();

		saveCurrentProject(globals.gCurrentProject,
			globals.gCurrentSurvey,
			globals.gCurrentTaskGroup);
	}

	/*
     * Function called when the mailout is changed or refresh called
     */
	function mailoutChanged(showMissingMsg) {

		gCurrentMailOutIdx = $('#mailout').val();

		if(gCurrentMailOutIdx && gCurrentMailOutIdx >= 0) {

			$('#mo_subject_view').val(gMailouts[gCurrentMailOutIdx].subject);
			$('#mo_content_view').val(gMailouts[gCurrentMailOutIdx].content);
			$('#mo_ms_view').prop('checked', gMailouts[gCurrentMailOutIdx].multiple_submit);
			$('#mo_anon_view').prop('checked', gMailouts[gCurrentMailOutIdx].anonymous);

			var url = "/api/v1/mailout/" + gMailouts[gCurrentMailOutIdx].id + "/emails?dt=true";
			if (table) {
				table.ajax.url(url).load();
			} else {
				setMailoutData(url);
			}

			loadMailoutTotals();

		} else if(showMissingMsg) {
			alert(localise.set["mo_ns"]);
			clearMailoutStatus();
		}
	}

	function clearMailoutStatus() {
		if (table) {
			table.clear().draw();
		}

		$('#mo_sent').html(0);
		$('#mo_complete').html(0);
		$('#mo_unsent').html(0);
		$('#mo_pending').html(0);
		$('#mo_error').html(0);
		$('#mo_unsubscribed').html(0);
		$('#mo_expired').html(0);
		$('#mo_manual').html(0);

		$('#mo_subject_view').val("");
		$('#mo_content_view').val("");
		$('#mo_ms_view').prop('checked',false);
		$('#mo_ms_anon').prop('checked',false);
	}

	/*
	 * Create the table that shows mailout instance data
	 */
	function setMailoutData(url) {

		var $subTable = $('#sub_table');
		table = $subTable.DataTable({
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
				{ "data": "status_loc"  },
				{ "data": "status_details"  },
				{ "data": "url"  },
				{ "data": "submissions"  },
			],
			order: [[ 0, "asc" ]],
			initComplete: function () {
				this.api().columns().every( function () {
					var column = this;
					if(column.index() < 3) {
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

		$subTable.find('td').css('white-space','initial').css('word-wrap', 'break-word');

		// Respond to selection of a row
		table.off('select').on('select', function (e, dt, type, indexes) {
			recordSelected(indexes);
		});
		table.off('deselect').on('deselect', function (e, dt, type, indexes) {
			$('.selectedOnly').hide();
		});

	}

	/*
	 * Get the mailouts for the passed in survey
	 */
	function loadMailouts(id) {

		var $survey = $('#survey_name');
		var surveyIdx = $survey.val();
		var surveyIdent = gSurveyList[surveyIdx].ident;

		var url="/api/v1/mailout/" + surveyIdent;
		var $mailout = $('#mailout');

		addHourglass();

		$.ajax({
			url: url,
			dataType: 'json',
			cache: false,
			success: function(data) {
				removeHourglass();
				gMailouts = data;
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
						if (count++ === 0) {
							selValue = i;
						}
						h[++idx] = ' value="';
						h[++idx] = i;
						h[++idx] = '">';
						h[++idx] = htmlEncode(item.name);
						h[++idx] = '</option>';
					}

					if(data.length > 0) {
						$('#m_edit, #m_delete').removeClass("disabled");
					} else {
						$('#m_edit, #m_delete').addClass("disabled");
					}
				}

				$mailout.empty().append(h.join(''));

				if(id) {
					gCurrentMailOutIdx = getMailoutIdx(id);
				}

				if(gCurrentMailOutIdx >= 0) {
					$mailout.val(gCurrentMailOutIdx);
				} else {
					$mailout.val(selValue);
					gCurrentMailOutIdx = selValue;
				}
				mailoutChanged(false);

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
     * Get the mailout totals for the current mailout
     */
	function loadMailoutTotals() {

		var url = "/api/v1/mailout/" + gMailouts[gCurrentMailOutIdx].id + "/emails/totals";

		addHourglass();

		$.ajax({
			url: url,
			dataType: 'json',
			cache: false,
			success: function(data) {
				removeHourglass();

				if(data) {
					$('#mo_sent').text(data.sent);
					$('#mo_complete').text(data.complete);
					$('#mo_unsent').text(data.unsent);
					$('#mo_pending').text(data.pending);
					$('#mo_error').text(data.error);
					$('#mo_unsubscribed').text(data.unsubscribed);
					$('#mo_expired').text(data.expired);
					$('#mo_manual').text(data.manual);
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

		var url = '/surveyKPI/mailout/xls/' + gMailouts[gCurrentMailOutIdx].id;

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
				mailoutChanged(true);

			},
			error: function (xhr, textStatus, err) {
				removeHourglass();
				$('#load_mailouts_alert').show().removeClass('alert-success').addClass('alert-danger').html(htmlEncode(xhr.responseText));

			}
		});
	}

	/*
     * Generate links to complete the surveys
     */
	function generateLinks() {

		$('#confirmGenMsg').html(localise.set["mo_gen"]);
		$('#confirmGenPopup').modal("show");
	}

	function generateLinksGo() {

		if(gCurrentMailOutIdx && gCurrentMailOutIdx >= 0) {
			var url = '/surveyKPI/mailout/gen/' + gMailouts[gCurrentMailOutIdx].id;

			addHourglass();
			$.ajax({
				url: url,
				cache: false,
				success: function () {
					removeHourglass();
					mailoutChanged(true);
				},
				error: function (xhr, textStatus, err) {

					removeHourglass();
					if (xhr.readyState == 0 || xhr.status == 0) {
						return;  // Not an error
					} else {
						alert(err);
					}
				}
			});
		}
	}

	/*
     * Set new emails to pending
     */
	function sendUnsent(retry) {

		gRetry = retry;
		$('#confirmSendMsg').html(localise.set["mo_send"]);
		$('#confirmSendPopup').modal("show");
	}

	function sendUnsentGo() {

		if(gCurrentMailOutIdx && gCurrentMailOutIdx >= 0) {
			var url = '/surveyKPI/mailout/send/' + gMailouts[gCurrentMailOutIdx].id;

			if(gRetry) {
				url += "?retry=true"
			}
			addHourglass();
			$.ajax({
				url: url,
				cache: false,
				success: function () {
					removeHourglass();
					mailoutChanged(true);
				},
				error: function (xhr, textStatus, err) {

					removeHourglass();
					if (xhr.readyState == 0 || xhr.status == 0) {
						return;  // Not an error
					} else {
						alert(err);
					}
				}
			});
		}
	}

	function getMailoutIdx(id) {
		var i;

		if (gMailouts && gMailouts.length > 0) {
			for (i = 0; i < gMailouts.length; i++) {
				if(gMailouts[i].id === id) {
					return i;
				}
			}
		}
		return -1;
	}

});

