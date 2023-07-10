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
    waitSeconds: 0,
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
         'common', 
         'localise', 
         'globals'
         
         ], function($, common, localise, globals) {

	window.gUpdateFwdPassword = undefined;
	window.gSelectedNotification = -1;
	window.gNotifications = undefined;
	window.gTaskGroups = undefined;
	window.oversightQuestions = {};
	window.gSelectedOversightQuestion = undefined;
	window.gSelectedOversightSurvey = undefined;
	window.gEligibleUser = undefined;

	window.gTasks = {
		cache: {
			groupSurveys: {}
		}
	}

	$(document).ready(function() {

		setCustomNotifications();			// Apply custom javascript

		setTheme();
		setupUserProfile(true);
		localise.setlang();		    // Localise HTML

		// Get Notification Types for this server
		getNotificationTypes();

		// Get the user details
		getLoggedInUser(projectSet, false, true, undefined);

		// Set change function on projects
		$('#project_name').change(function() {
			globals.gCurrentProject = $('#project_name option:selected').val();
			globals.gCurrentSurvey = -1;
			globals.gCurrentTaskGroup = undefined;

			saveCurrentProject(globals.gCurrentProject,
				globals.gCurrentSurvey,
				globals.gCurrentTaskGroup);

			projectSet();
		});

		setupNotificationDialog();

		// Enable the save notifications function
		$('#saveNotification').click(function(){saveNotification();});

		$('#addNotification').click(function(){
			edit_notification(false, -1, false);
			$('#addNotificationPopup').modal("show");
		});

		// Add response to a source survey being selected
		$('#survey').change(function() {
			surveyChangedNotification(undefined, undefined, undefined, undefined);
		});

		// Add response to a source survey being selected
		$('#task_group').change(function() {
			taskGroupChanged($('#task_group').val());
		});

		// Add response to an oversight survey being selected
		$('#group_survey').change(function() {
			getOversightQuestionList($('#oversight_survey').val())
		});

		$('#user_to_assign').change(function() {
			if($('#user_to_assign').val() === '_data') {
				$('.assign_question').removeClass('d-none').show();
			} else {
				$('.assign_question').hide();
			}
		});

		$('#email_content_ap_insert').click(function() {
			var current = $('#email_content').val();
			$('#email_content').val(current
				+ (current.length > 0 ? " " : "")
				+ $('#email_content_ap option:selected').val());
		});

		$('#m_refresh').click(function(){
			getNotifications(globals.gCurrentProject);
		});
	});

	function projectSet() {

		populateTaskGroupList();
		loadSurveys(globals.gCurrentProject, undefined, false, false, undefined, false);			// Get surveys
		getReports(globals.gCurrentProject);	// Get notifications after reports as they are deondent on report names
	}

	/*
	 * Save a notification
	 */
	function saveNotification() {

		var url,
			notification,
			notificationString,
			$dialog,
			target = $('#target').val();

		if(target === "email") {
			notification = saveEmail();
		} else if(target === "sms") {
			notification = saveSMS();
		} else if(target === "document") {
			notification = saveDocument();
		} else if(target === "webhook") {
			notification = saveWebhook();
		} else if(target === "escalate") {
			var nEmail = saveEmail();	// Save email and escalate detail settings
			var notification = saveEscalate();
			notification.notifyDetails = Object.assign(nEmail.notifyDetails, notification.notifyDetails);
		}

		if(!notification.error) {

			notification.trigger = $('#trigger').val();
			if(notification.trigger !== 'task_reminder' && notification.trigger !== 'periodic') {
				notification.s_id = $('#survey').val();
			} else {
				notification.p_id = $('#project_name').val();		// Project only saved if survey not set, as other wise survey identifies project and survey can move
			}

			notification.enabled = $('#nt_enabled').is(':checked');
			notification.filter = $('#not_filter').val();
			notification.name = $('#name').val();
			notification.alert_id = $('#alerts').val();

			if(notification.trigger === 'task_reminder') {
				var idx = $('#task_group').val();
				if(gTaskGroups.length > 0 && idx < gTaskGroups.length) {
					notification.tgId = gTaskGroups[idx].tg_id;
					notification.s_id = gTaskGroups[idx].source_s_id;
				}
				var periodCount = $('#r_period').val();
				notification.period = periodCount + ' ' + $('#period_list_sel').val();

				// Validate
				if(!periodCount || periodCount <= 0) {
					alert(localise.set["msg_pc"]);
					return(-1);
				}
				if(!notification.s_id) {
					alert(localise.set["msg_rs"]);
					return(-1);
				}
			} else if(notification.trigger === 'periodic') {
				notification.periodic_period = $('#periodic_period').val();
				notification.periodic_time = $('#periodic_time').val();
				notification.periodic_week_day = $('#periodic_week_day').val();
				notification.periodic_month_day = $('#periodic_month_day').val();
				notification.periodic_month = $('#periodic_month').val();
				notification.r_id = $('#report').val();

				/*
				 * Validate
				 */
				if(target !== "email") {
					alert(localise.set["msg_oet"]);
					return(-1);
				}
				if(notification.periodic_period === 'yearly' && (notification.periodic_month < 1 || notification.periodic_month > 12)) {
					alert(localise.set["msg_mms"]);
					return(-1);
				}
				if(notification.periodic_period === 'yearly' && (notification.periodic_month_day < 1 || notification.periodic_month_day > 31)) {
					alert(localise.set["msg_dms"]);
					return(-1);
				}
				if(notification.periodic_period === 'monthly' && (notification.periodic_month_day < 1 || notification.periodic_month_day > 31)) {
					alert(localise.set["msg_dms"]);
					return(-1);
				}
			}

			if(notification.trigger === 'console_update') {
				var updateQuestion = $('#update_question').val();
				var updateValue = $('#update_value').val();
				var updateSurvey = $('#oversight_survey').val();

				// Validate
				if(!updateQuestion || updateQuestion.trim().length == 0) {
					alert(localise.set["n_nq"]);
					return(-1);
				}

				if(!updateValue || updateValue.trim().length == 0) {
					alert(localise.set["n_nv"]);
					return(-1);
				}

				notification.updateSurvey = updateSurvey;
				notification.updateQuestion = updateQuestion;
				notification.updateValue = updateValue;

			}

			if(window.gSelectedNotification !== -1) {
				notification.id = window.gSelectedNotification;
				url = "/surveyKPI/notifications/update";
			} else {
				url = "/surveyKPI/notifications/add";
			}
			url += "?tz=" + encodeURIComponent(globals.gTimezone);

			notificationString = JSON.stringify(notification);
			addHourglass();
			$.ajax({
				type: "POST",
				dataType: 'text',
				cache: false,
				async: true,
				url: url,
				data: { notification: notificationString },
				success: function(data, status) {
					removeHourglass();
					getNotifications(globals.gCurrentProject);
					$('#addNotificationPopup').modal("hide");
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
			alert(notification.errorMsg);
		}
	}

	/*
	 * Load the existing notifications from the server
	 */
	function getNotifications(projectId) {

		if(projectId != -1) {
			var url="/surveyKPI/notifications/" + projectId + "?tz=" + encodeURIComponent(globals.gTimezone);
			addHourglass();
			$.ajax({
				url: url,
				dataType: 'json',
				cache: false,
				success: function(data) {
					removeHourglass();
					window.gNotifications = data;
					if(data) {
						updateNotificationList(data);
					}
				},
				error: function(xhr, textStatus, err) {
					removeHourglass();
					if(xhr.readyState == 0 || xhr.status == 0) {
						return;  // Not an error
					} else {
						console.log("Error: Failed to get list of notifications: " + err);
					}
				}
			});
		}
	}

	/*
	 * Load the existing reports from the server
	 */
	function getReports(projectId) {

		if(projectId != -1) {
			var url="/surveyKPI/reporting/reports?pId=" + projectId + "&tz=" + encodeURIComponent(globals.gTimezone);
			addHourglass();
			$.ajax({
				url: url,
				dataType: 'json',
				cache: false,
				success: function(data) {
					removeHourglass();
					window.gReports = data;
					getNotifications(globals.gCurrentProject);
					if(data) {
						updateReportList(data);
					}
				},
				error: function(xhr, textStatus, err) {
					removeHourglass();
					if(xhr.readyState == 0 || xhr.status == 0) {
						return;  // Not an error
					} else {
						console.log("Error: Failed to get list of reports: " + err);
					}
				}
			});
		}
	}

	/*
	 * Delete a notification
	 */
	function delete_notification(id) {

		addHourglass();
		$.ajax({
			type: "DELETE",
			async: false,
			cache: false,
			url: "/surveyKPI/notifications/" + id,
			success: function(data, status) {
				removeHourglass();
				getNotifications(globals.gCurrentProject);
			},
			error: function(xhr, textStatus, err) {
				removeHourglass();
				if(xhr.readyState == 0 || xhr.status == 0) {
					return;  // Not an error
				} else {
					alert(localise.set["msg_err_del"] + xhr.responseText);
				}
			}
		});
	}

	/*
	 * update the list of reports
	 */
	function updateReportList(data) {

		var $selector=$('.report_select'),
			i;

		$selector.empty();
		if(data && data.length > 0) {
			for(i = 0; i < data.length; i++) {
				$selector.append(`<option value="${data[i].id}">${data[i].name}</option>`);
			}
		}
	}

	/*
	 * Update the notification list
	 */
	function updateNotificationList(data) {

		var $selector=$('#notification_list'),
			i,
			h = [],
			idx = -1,
			updateCurrentProject = true;

		h[++idx] = '<div class="table-responsive">';
		h[++idx] = '<table class="table table-striped">';

		h[++idx] = '<thead>';
		h[++idx] = '<tr>';

		h[++idx] = '<th scope="col" style="text-align: center;">';
		h[++idx] = localise.set["c_name"];
		h[++idx] = '</th>';

		h[++idx] = '<th scope="col" style="text-align: center;">';
		h[++idx] = localise.set["c_trigger"];
		h[++idx] = '</th>';

		h[++idx] = '<th scope="col" style="text-align: center;">';
		h[++idx] = localise.set["c_survey_tg"];
		h[++idx] = '</th>';

		h[++idx] = '<th scope="col" style="text-align: center;">';
		h[++idx] = localise.set["c_target"];
		h[++idx] = '</th>';

		h[++idx] = '<th scope="col" style="text-align: center;">';
		h[++idx] = localise.set["c_details"];
		h[++idx] = '</th>';

		h[++idx] = '<th scope="col" style="text-align: center;">';
		h[++idx] = localise.set["c_action"];
		h[++idx] = '</th>';

		h[++idx] = '</tr>';
		h[++idx] = '</thead>';

		h[++idx] = '<tbody>';
		for(i = 0; i < data.length; i++) {

			h[++idx] = '<tr';
			if(!data[i].enabled) {
				h[++idx] = ' class="disabled"';
			}
			h[++idx] = '>';

			// name
			var name = (data[i].name && data[i].name.trim().length > 0) ? data[i].name : i;
			h[++idx] = '<td style="text-align: center;">';
			h[++idx] = htmlEncode(name);
			h[++idx] = '</td>';

			// trigger
			var trigger = localise.set[data[i].trigger];
			if(!trigger) {
				trigger = localise.set['c_' + data[i].trigger]
			}
			h[++idx] = '<td style="text-align: center;">';
			h[++idx] = trigger;
			h[++idx] = '</td>';

			// survey / task group
			h[++idx] = '<td style="text-align: center;">';
			if(data[i].trigger === "task_reminder") {
				h[++idx] = htmlEncode(data[i].tg_name);
			} else if(data[i].trigger === "periodic") {
				h[++idx] = getReportName(data[i].r_id);
			} else {
				h[++idx] = htmlEncode(data[i].s_name);
			} 
			h[++idx] = '</td>';

			// target
			h[++idx] = '<td style="text-align: center;">';
			h[++idx] = localise.set["c_" + data[i].target];
			h[++idx] = '</td>';

			if(data[i].notifyDetails && !data[i].notifyDetails.emails) {
				data[i].notifyDetails.emails = [];
			}
			// details
			h[++idx] = '<td style="text-align: center; word-break: break-all;">';
			if(data[i].target === "email" && data[i].notifyDetails) {
				var notifyEmail = false;
				if((data[i].notifyDetails.emails.length > 0 && data[i].notifyDetails.emails[0].trim().length > 0)
						|| (data[i].notifyDetails.emailQuestionName && data[i].notifyDetails.emailQuestionName != "-1")
						|| (data[i].notifyDetails.emailMeta && data[i].notifyDetails.emailMeta.length > 0)
						|| data[i].notifyDetails.emailAssigned) {

					if(data[i].notifyDetails.emails && data[i].notifyDetails.emails.length > 0 && data[i].notifyDetails.emails[0].trim().length > 0) {
						h[++idx] = data[i].notifyDetails.emails.join(",");
						notifyEmail = true;
					}
					if(data[i].notifyDetails.emailQuestionName && data[i].notifyDetails.emailQuestionName != "-1") {
						if(notifyEmail) {
							h[++idx] = ', '
						}
						h[++idx] = localise.set["msg_n1"];
						notifyEmail = true;
					}
					if(data[i].notifyDetails.emailMeta && data[i].notifyDetails.emailMeta.length > 0
						&& data[i].notifyDetails.emailMeta != "-1") {
						if(notifyEmail) {
							h[++idx] = ', '
						}
						h[++idx] = localise.set["msg_n2"];
						h[++idx] = ' ';
						h[++idx] = htmlEncode(data[i].notifyDetails.emailMeta);
						notifyEmail = true;
					}
					if(data[i].notifyDetails.emailAssigned) {
						if(notifyEmail) {
							h[++idx] = ', '
						}
						h[++idx] = localise.set["t_eas"];
						notifyEmail = true;
					}
				}
			} else if(data[i].target === "sms" && data[i].notifyDetails) {
				if((data[i].notifyDetails.emails.length > 0 && data[i].notifyDetails.emails[0].trim().length > 0) ||
					(data[i].notifyDetails.emailQuestionName && data[i].notifyDetails.emailQuestionName != "-1")) {
					h[++idx] = localise.set["msg_sms_n1"];
					h[++idx] = ' ';
					h[++idx] = data[i].notifyDetails.emails.join(",");
					if(data[i].notifyDetails.emailQuestionName && data[i].notifyDetails.emailQuestionName != "-1") {
						if(data[i].notifyDetails.emails.length > 0 && data[i].notifyDetails.emails[0].trim().length > 0) {
							h[++idx] = ', '
						}
						h[++idx] = localise.set["msg_sms_n2"];
					}
				}
			} else if(data[i].target === "webhook" && data[i].notifyDetails) {
				h[++idx] = htmlEncode(data[i].notifyDetails.callback_url);
			} else if(data[i].target === "escalate"){
				h[++idx] = htmlEncode();
				var msg = '';
				if(data[i].trigger === 'cm_alert') {
					msg = localise.set["n_aa"];
					msg = msg.replace('%s1', data[i].alert_name);
					msg = msg + ' ';

				}
				msg = msg + localise.set["n_as"];
				msg = msg.replace("%s1", data[i].notifyDetails.survey_case);
				msg = msg.replace("%s2", data[i].remote_user);
				h[++idx] = htmlEncode(msg);
			}
			h[++idx] = '</td>';

			// actions
			h[++idx] = '<td style="text-align: center;">';
			h[++idx] = '<div class="d-flex">';

			h[++idx] = '<button type="button" data-idx="';
			h[++idx] = i;
			h[++idx] = '" class="btn btn-danger btn-sm rm_not mr-2">';
			h[++idx] = '<i class="fas fa-trash-alt"></i></button>';

			h[++idx] = '<button type="button" data-idx="';
			h[++idx] = i;
			h[++idx] = '" class="btn btn-info btn-sm edit_not">';
			h[++idx] = '<i class="fa fa-edit"></i></button>';

			h[++idx] = '</div>';
			h[++idx] = '</td>';
			// end actions

			h[++idx] = '</tr>';
		}
		h[++idx] = '</tbody>';
		h[++idx] = '</table>';
		h[++idx] = '</div>';

		$selector.empty().append(h.join(''));

		$(".rm_not", $selector).click(function(){
			var idx = $(this).data("idx");
			if(window.gNotifications.length > 0 && idx < window.gNotifications.length) {
				if (confirm(localise.set["msg_del_not"] + ' ' + window.gNotifications[idx].name)) {
					delete_notification(window.gNotifications[idx].id);
				}
			}
		});

		$(".edit_not", $selector).click(function(){
			var idx = $(this).data("idx");
			edit_notification(true, idx, false);
			$('#addNotificationPopup').modal("show");
		});

	}

	function getReportName(rId) {
		if(window.gReports) {
			for(var i = 0; i < window.gReports.length; i++) {
				if(window.gReports[i].id == rId) {
					return window.gReports[i].name;
				}
			}
		}
	}
});

