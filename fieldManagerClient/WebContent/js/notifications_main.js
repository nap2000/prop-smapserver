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
    	tablesorter: '../../../../js/libs/tablesorter',
    	lang_location: '../../../../js',
	    metismenu: '../../../../js/libs/wb/metisMenu/jquery.metisMenu'
    },
    shim: {
    	'common': ['jquery'],
    	'tablesorter': ['jquery'],
	    'metismenu': ['jquery'],
	
    	}
    });

require([
         'jquery', 
         'common', 
         'localise', 
         'globals',
         'tablesorter',
		 'metismenu'
         
         ], function($, common, localise, globals) {

	window.gUpdateFwdPassword = undefined;
	window.gSelectedNotification = -1;
	window.gNotifications = undefined;
	window.gTaskGroups = undefined;
	window.oversightSurveys = {};

	$(document).ready(function() {

		setCustomNotifications();			// Apply custom javascript

		setupUserProfile(true);
		localise.setlang();		    // Localise HTML
		$("#side-menu").metisMenu();

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
			edit_notification();
			$('#addNotificationPopup').modal("show");
		});

		// Add response to a source survey being selected
		$('#survey').change(function() {
			surveyChanged();
			getOversightSurveys($('#survey').val());
		});

		$('#email_content_ap_insert').click(function() {
			var current = $('#email_content').val();
			$('#email_content').val(current
				+ (current.length > 0 ? " " : "")
				+ $('#email_content_ap option:selected').val());
		});
	});

	function projectSet() {

		populateTaskGroupList();
		loadSurveys(globals.gCurrentProject, undefined, false, false, surveyChanged);			// Get surveys
		getNotifications(globals.gCurrentProject);
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
		} else if(target === "forward") {
			notification = saveForward();
		} else if(target === "sms") {
			notification = saveSMS();
		} else if(target === "document") {
			notification = saveDocument();
		}

		if(!notification.error) {

			notification.trigger = $('#trigger').val();
			notification.s_id = $('#survey').val();
			notification.enabled = $('#nt_enabled').is(':checked');
			notification.filter = $('#not_filter').val();
			notification.name = $('#name').val();

			if(notification.trigger === 'task_reminder') {
				var idx = $('#task_group').val();
				if(gTaskGroups.length > 0 && idx < gTaskGroups.length) {
					notification.tgId = gTaskGroups[idx].tg_id;
				}
				var periodCount = $('#r_period').val();
				notification.period = periodCount + ' ' + $('#period_list_sel').val();

				// Validate
				if(!periodCount || periodCount <= 0) {
					alert(localise.set["msg_pc"]);
					return(-1);
				}
				console.log("Reminder for tg: " + notification.tgId + ' after ' + notification.period);
			}


			if(window.gSelectedNotification !== -1) {
				notification.id = window.gSelectedNotification;
				url = "/surveyKPI/notifications/update";
			} else {
				url = "/surveyKPI/notifications/add";
			}


			notificationString = JSON.stringify(notification);
			$dialog = $(this);
			addHourglass();
			$.ajax({
				type: "POST",
				dataType: 'text',
				cache: false,
				async: false,
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
			alert(localise.set["msg_inv_email"]);
		}
	}

	/*
	 * Load the existing notifications from the server
	 */
	function getNotifications(projectId) {

		if(projectId != -1) {
			var url="/surveyKPI/notifications/" + projectId;

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
	 * Update the list of remote survey
	 */
	function updateRemoteSurveys(surveyList) {

		console.log("updateRemoteSurvey");

		var $rs = $('#fwd_rem_survey'),
			i, survey,
			h = [],
			idx = -1;

		for(i = 0; i < surveyList.length; i++) {
			survey = surveyList[i];
			h[++idx] = '<option value="';
			h[++idx] = survey.formID;
			h[++idx] = '">';
			h[++idx] = survey.name;
			h[++idx] = '</option>';
		}

		$rs.empty().append(h.join(''));
		remoteSurveyChanged();

	}

	/*
	 * Get available surveys from a remote host
	 */
	function getRemoteSurveys() {

		var host,
			user,
			password,
			remote = {},
			remoteString;

		remote.address = $('#fwd_host').val();
		remote.user = $('#fwd_user').val();
		remote.password = $('#fwd_password').val();


		if(!remote.address || remote.address.length == 0) {
			alert(localise.set["msg_val_rh"]);
			$('#fwd_host').focus();
			return;
		} else if(!remote.user || remote.user.length == 0) {
			alert(localise.set["msg_val_u_id"]);
			$('#fwd_user').focus();
			return;
		} else if(!remote.password || remote.user.password == 0) {
			alert(localise.set["msg_val_pass"]);
			$('#fwd_password').focus();
			return;
		}

		remoteString = JSON.stringify(remote);
		addHourglass();
		$.ajax({
			type: "POST",
			async: true,
			cache: false,
			dataType: "json",
			url: "/surveyKPI/notifications/getRemoteSurveys",
			data: { remote: remoteString },
			success: function(data, status) {
				removeHourglass();
				updateRemoteSurveys(data);
			},
			error: function(xhr, textStatus, err) {
				removeHourglass();
				$('#fwd_rem_survey').empty();
				if(xhr.readyState == 0 || xhr.status == 0) {
					return;  // Not an error
				} else {
					var msg;
					if(xhr.responseText.indexOf("RSA premaster") >= 0) {
						msg = localise.set["msg_err_cert"];
					} else {
						msg = xhr.responseText;
					}
					alert(localise.set["msg_err_get_f"] + msg);
				}
			}
		});

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

		h[++idx] = '<b><div class="row">';

		h[++idx] = '<div class="col-sm-2">';
		h[++idx] = localise.set["c_name"];
		h[++idx] = '</div>';

		h[++idx] = '<div class="col-sm-1">';
		h[++idx] = localise.set["c_trigger"];
		h[++idx] = '</div>';

		h[++idx] = '<div class="col-sm-2">';
		h[++idx] = localise.set["c_survey_tg"];
		h[++idx] = '</div>';

		h[++idx] = '<div class="col-sm-1">';
		h[++idx] = localise.set["c_target"];
		h[++idx] = '</div>';

		h[++idx] = '<div class="col-sm-4">';
		h[++idx] = localise.set["c_details"];
		h[++idx] = '</div>';

		h[++idx] = '<div class="col-sm-2">';
		h[++idx] = localise.set["c_action"];
		h[++idx] = '</div>';
		h[++idx] = '</div></b>';        // Header row

		for(i = 0; i < data.length; i++) {

			h[++idx] = '<div class="row"';
			if(!data[i].enabled) {
				h[++idx] = ' class="disabled"';
			}
			h[++idx] = '>';

			// name
			var name = (data[i].name && data[i].name.trim().length > 0) ? data[i].name : i;
			h[++idx] = '<div class="col-sm-2" style="word-wrap: break-word;">';
			h[++idx] = name;
			h[++idx] = '</div>';

			// trigger
			h[++idx] = '<div class="col-sm-1">';
			h[++idx] = localise.set[data[i].trigger];
			h[++idx] = '</div>';

			// survey / task group
			h[++idx] = '<div class="col-sm-2" style="word-wrap: break-word;">';
			if(data[i].trigger === "submission") {
				h[++idx] = data[i].s_name;
			} else {
				h[++idx] = data[i].tg_name;
			}
			h[++idx] = '</div>';

			// target
			h[++idx] = '<div class="col-sm-1">';
			h[++idx] = localise.set["c_" + data[i].target];
			h[++idx] = '</div>';

			if(data[i].notifyDetails && !data[i].notifyDetails.emails) {
				data[i].notifyDetails.emails = [];
			}
			// details
			h[++idx] = '<div class="col-sm-4" style="word-wrap: break-word;">';
			if(data[i].target === "email" && data[i].notifyDetails) {
				var notifyEmail = false;
				if((data[i].notifyDetails.emails.length > 0 && data[i].notifyDetails.emails[0].trim().length > 0)
					|| (data[i].notifyDetails.emailQuestionName && data[i].notifyDetails.emailQuestionName != "-1")
					|| (data[i].notifyDetails.emailMeta && data[i].notifyDetails.emailMeta.length > 0)) {

					h[++idx] = data[i].notifyDetails.emails.join(",");
					if(data[i].notifyDetails.emailQuestionName && data[i].notifyDetails.emailQuestionName != "-1") {
						notifyEmail = true;
						if(data[i].notifyDetails.emails.length > 0 && data[i].notifyDetails.emails[0].trim().length > 0) {
							h[++idx] = ', '
						}
						h[++idx] = localise.set["msg_n1"];
					}
					if(data[i].notifyDetails.emailMeta && data[i].notifyDetails.emailMeta.length > 0
						&& data[i].notifyDetails.emailMeta != "-1") {
						if(notifyEmail || (data[i].notifyDetails.emails.length > 0 && data[i].notifyDetails.emails[0].trim().length > 0)) {
							h[++idx] = ', '
						}
						h[++idx] = localise.set["msg_n2"];
						h[++idx] = ' ';
						h[++idx] = data[i].notifyDetails.emailMeta;
					}
				}
			} else if(data[i].target === "forward"){
				h[++idx] = data[i].remote_host;
				h[++idx] = ':';
				h[++idx] = data[i].remote_s_name;
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
			}
			h[++idx] = '</div>';

			// actions
			h[++idx] = '<div class="col-sm-2">';

			h[++idx] = '<button type="button" data-idx="';
			h[++idx] = i;
			h[++idx] = '" class="btn btn-default btn-sm edit_not warning">';
			h[++idx] = '<span class="glyphicon glyphicon-edit" aria-hidden="true"></span></button>';

			h[++idx] = '<button type="button" data-idx="';
			h[++idx] = i;
			h[++idx] = '" class="btn btn-default btn-sm rm_not danger">';
			h[++idx] = '<span class="glyphicon glyphicon-trash" aria-hidden="true"></span></button>';

			h[++idx] = '</div>';
			// end actions

			h[++idx] = '</div>';
		}


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
			edit_notification(idx);
			$('#addNotificationPopup').modal("show");
		});

	}

});

