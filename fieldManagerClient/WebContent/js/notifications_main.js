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

	var	gNotifications,		// Globals in this java script file
		gNotificationTypes,
		gUpdateFwdPassword,
		gSelectedNotification = -1,
		gRemote_host,
		gRemote_user;

	$(document).ready(function() {

		setCustomNotifications();			// Apply custom javascript

		$('#notify_emails_cont').prop('title', localise.set['n_cs_e']);
		$('#notify_emails').prop('placeholder', localise.set['n_ea']);
		$('#email_question_cont').prop('title', localise.set['n_eqc']);
		$('#email_subject_cont').prop('placeholder', localise.set['n_esc']);

		setupUserProfile();
		localise.setlang();		// Localise HTML
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

		// Set change function target
		$('#target').change(function() {
			setTargetDependencies($(this).val());
		});
		setTargetDependencies("email");

		// Set change function attach
		$('#email_attach').change(function() {
			setAttachDependencies($(this).val());
		});

		// Enable the save notifications function
		$('#saveNotification').click(function(){saveNotification();});

		/*
		 * Functions for forwarding
		 */
		$('#fwd_host').change(function(){
			var host = $(this).val();
			if(host.length === 0) {
				return false;
			} else if(host.substr(0, 4) !== "http") {
				alert(localise.set["msg_val_prot"]);
				return false;
			}
		});

		$('#fwd_password').change(function(){
			gUpdateFwdPassword = true;
		});

		$('#fwd_upd_rem_survey').click(function(){
			getRemoteSurveys();
		});

		$('#fwd_rem_survey').change(function(){
			remoteSurveyChanged();
		});

		$('#addNotification').click(function(){
			edit_notification();
			$('#addNotificationPopup').modal("show");
		});

		// Set focus on notification name when edit notification is opened
		$('#addNotificationPopup').on('shown.bs.modal', function () {
			$('#name').focus();
		});

		// Add response to a source survey being selected
		$('#survey').change(function() {
			surveyChanged();
		});

		enableUserProfileBS();
	});

	function surveyChanged(qName, metaItem) {

		var language = "none",
			sId = $('#survey').val(),
			qList,
			metaList;

		if(sId) {
			if(!qName) {
				qName = "-1";
			}

			qList = globals.gSelector.getSurveyQuestions(sId, language);
			metaList = globals.gSelector.getSurveyMeta(sId);

			if(!qList) {
				getQuestionList(sId, language, 0, "-1", undefined, false,
					undefined, qName);
			} else {
				setSurveyViewQuestions(qList, undefined, undefined, undefined, qName );
			}

			if(!metaList) {
				getMetaList(sId, metaItem);
			} else {
				setSurveyViewMeta(metaList, metaItem);
			}
		}
	}

	function setTargetDependencies(target) {
		if(target === "email") {
			$('.email_options').show();
			$('.forward_options, .sms_options').hide();
		} else if(target === "forward") {
			$('.forward_options').show();
			$('.email_options, .sms_options').hide();
		} else if(target === "sms") {
			$('.sms_options').show();
			$('.email_options, .forward_options').hide();
		}
	}

	function setAttachDependencies(attach) {
		if(attach === "pdf" || attach === "pdf_landscape") {
			$('.pdf_options').show();
		} else  {
			$('.pdf_options').hide();
		}
	}

	function projectSet() {

		loadSurveys(globals.gCurrentProject, undefined, false, false, surveyChanged);			// Get surveys
		getNotifications(globals.gCurrentProject);
	}

	/*
	 * Save a notification
	 */
	function saveNotification() {

		var url,
			notificationString,
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

			notification.s_id = $('#survey').val();
			notification.enabled = $('#nt_enabled').is(':checked');
			notification.filter = $('#not_filter').val();
			notification.name = $('#name').val();

			if(gSelectedNotification !== -1) {
				notification.id = gSelectedNotification;
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
	 * Process a save notification when the target is "email"
	 */
	function saveEmail() {

		var notification = {};
		var emails = $('#notify_emails').val();
		var emailQuestionName = $('#email_question').val();
		var emailMetaItem = $('#email_meta').val();
		var emailArray;
		var i;

		// validate
		// Must specifify an email
		notification.error = false;
		if((!emails || emails.trim().length == 0) && (!emailQuestionName || emailQuestionName == "-1")
			&& (!emailMetaItem || emailMetaItem == "-1")) {
			notification.error = true;
			notification.errorMsg = localise.set["msg_inv_email"];
		}

		// Text email must be valid email addresses
		if(emails && emails.trim().length > 0) {
			emailArray = emails.split(",");
			for (i = 0; i < emailArray.length; i++) {
				if (!validateEmails(emailArray[i])) {
					notification.error = true;
					notification.errorMsg = localise.set["msg_inv_email"];
					break;
				}
			}
		}

		if(!notification.error) {
			notification.target = "email";
			notification.notifyDetails = {};
			notification.notifyDetails.emails = emailArray;
			notification.notifyDetails.emailQuestionName = emailQuestionName;
			notification.notifyDetails.emailMeta = emailMetaItem;
			notification.notifyDetails.subject = $('#email_subject').val();
			notification.notifyDetails.content = $('#email_content').val();
			notification.notifyDetails.attach = $('#email_attach').val();
			notification.notifyDetails.include_references = $('#include_references').prop('checked');
			notification.notifyDetails.launched_only = $('#launched_only').prop('checked');
		}

		return notification;
	}

	/*
	 * Process a save notification when the target is "sms"
	 */
	function saveSMS() {

		var notification = {};

		notification.target = "sms";
		notification.notifyDetails = {};
		notification.notifyDetails.emails = $('#notify_sms').val().split(",");
		notification.notifyDetails.emailQuestionName = $('#sms_question').val();
		notification.notifyDetails.content = $('#sms_content').val();
		notification.notifyDetails.attach = $('#sms_attach').val();

		return notification;
	}

	/*
	 * Process a save notification when the target is "document"
	 */
	function saveDocument() {

		var notification = {};

		notification.target = "document";
		notification.notifyDetails = {};


		return notification;
	}

	/*
	 * Process a save notification when the target is "forward"
	 */
	function saveForward() {

		var error = false,
			remote_s_ident,
			host,
			$dialog,
			rem_survey_id,
			rem_survey_nm,
			notification = {};

		host = $('#fwd_host').val();
		remote_s_ident = $('#fwd_rem_survey :selected').val();
		remote_s_nm = $('#fwd_rem_survey :selected').text();

		// Remove any trailing slashes from the host
		if(host.substr(-1) == '/') {
			host = host.substr(0, host.length - 1);
		}

		if(typeof remote_s_ident === "undefined" || remote_s_ident.length == 0) {
			error = true;
			alert(localise.set["msg_val_rf"]);

		} else if(host.substr(0, 4) !== "http") {
			error = true;
			alert(localise.set["msg_val_prot"]);
			$('#fwd_host').focus();
		}

		if(!error) {

			notification.target = "forward";
			notification.remote_s_ident = remote_s_ident;
			notification.remote_s_name = remote_s_nm;
			notification.remote_user = $('#fwd_user').val();
			notification.remote_password = $('#fwd_password').val();
			notification.remote_host = host;
			notification.update_password = gUpdateFwdPassword;

			// Save the values temporarily entered by the user
			gRemote_host = host;
			gRemote_user = $('#fwd_user').val();

		} else {
			notification.error = true;
		}

		return notification;
	}

	function edit_notification(idx) {

		var notification,
			title = localise.set["msg_add_notification"];

		document.getElementById("notification_edit_form").reset();
		setTargetDependencies("email");
		setAttachDependencies();

		if(typeof idx !== "undefined") {
			notification = gNotifications[idx];

			title = localise.set["msg_edit_notification"];
			$('#target').val(notification.target);
			$('#name').val(notification.name);
			setTargetDependencies(notification.target)
			setAttachDependencies(notification.notifyDetails.attach);

			$('#survey').val(notification.s_id);
			$('#not_filter').val(notification.filter);
			if(notification.notifyDetails && notification.notifyDetails.emails) {
				if(notification.notifyDetails.emailQuestionName || notification.notifyDetails.emailMeta) {
					surveyChanged(notification.notifyDetails.emailQuestionName, notification.notifyDetails.emailMeta);
				}

				if(notification.target == "email") {
					$('#notify_emails').val(notification.notifyDetails.emails.join(","));
					$('#email_subject').val(notification.notifyDetails.subject);
					$('#email_content').val(notification.notifyDetails.content);
					$('#email_attach').val(notification.notifyDetails.attach);
					$('#include_references').prop('checked', notification.notifyDetails.include_references);
					$('#launched_only').prop('checked', notification.notifyDetails.launched_only);
				} else if(notification.target == "sms") {
					$('#notify_sms').val(notification.notifyDetails.emails.join(","));
					$('#sms_content').val(notification.notifyDetails.content);
					$('#sms_attach').val(notification.notifyDetails.attach);
				}
			}
			$('#fwd_rem_survey_id').val(notification.remote_s_ident);
			$('#fwd_rem_survey_nm').val(notification.remote_s_name);
			$('#fwd_user').val(notification.remote_user);
			// Password not returned from server - leave blank

			$('#fwd_host').val(notification.remote_host);
			if(notification.enabled) {
				$('#nt_enabled').prop('checked',true);
			} else {
				$('#nt_enabled').prop('checked', false);
			}

			gUpdateFwdPassword = false;
			gSelectedNotification = notification.id;
		} else {

			$('#fwd_host').val(gRemote_host);	// Set the values to the ones last used
			$('#fwd_user').val(gRemote_user);

			$('#nt_enabled').prop('checked',true);
			gUpdateFwdPassword = true;
			gSelectedNotification = -1;
		}
		$('#addNotificationLabel').html(title);

	}

	/*
	 * Load the existing notifications from the server
	 */
	function getNotificationTypes() {

		addHourglass();
		$.ajax({
			url: '/surveyKPI/notifications/types',
			dataType: 'json',
			cache: false,
			success: function(data) {
				removeHourglass();
				gNotificationTypes = data;
				if(data) {
					updateNotificationTypes(data);
				}
			},
			error: function(xhr, textStatus, err) {
				removeHourglass();
				if(xhr.readyState == 0 || xhr.status == 0) {
					return;  // Not an error
				} else {
					console.log("Error: Failed to get list of notification types: " + err);
				}
			}
		});
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
					gNotifications = data;
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
	function updateNotificationTypes(data) {

		var $selector=$('#target'),
			i,
			h = [],
			idx = -1;

		for(i = 0; i < data.length; i++) {

			h[++idx] = '<option value="';
			h[++idx] = data[i];
			h[++idx] = '">';
			h[++idx] = localise.set["c_" + data[i]];
			h[++idx] = '</option>';
		}

		$selector.empty().append(h.join(''));

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

		h[++idx] = '<div class="row"><b>';

		h[++idx] = '<div class="col-sm-2">';
		h[++idx] = localise.set["c_name"];
		h[++idx] = '</div>';

		h[++idx] = '<div class="col-sm-2">';
		h[++idx] = localise.set["c_survey"];
		h[++idx] = '</div>';

		h[++idx] = '<div class="col-sm-1">';
		h[++idx] = localise.set["c_target"];
		h[++idx] = '</div>';

		h[++idx] = '<div class="col-sm-5">';
		h[++idx] = localise.set["c_details"];
		h[++idx] = '</div>';

		h[++idx] = '<div class="col-sm-2">';
		h[++idx] = localise.set["c_action"];
		h[++idx] = '</div>';
		h[++idx] = '</b></div>';

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

			// survey
			h[++idx] = '<div class="col-sm-2" style="word-wrap: break-word;">';
			h[++idx] = data[i].s_name;
			h[++idx] = '</div>';

			// target
			h[++idx] = '<div class="col-sm-1">';
			h[++idx] = data[i].target;
			h[++idx] = '</div>';

			if(data[i].notifyDetails && !data[i].notifyDetails.emails) {
				data[i].notifyDetails.emails = [];
			}
			// details
			h[++idx] = '<div class="col-sm-5" style="word-wrap: break-word;">';
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
			delete_notification(gNotifications[idx].id);
		});

		$(".edit_not", $selector).click(function(){
			var idx = $(this).data("idx");
			edit_notification(idx);
			$('#addNotificationPopup').modal("show");
		});

	}
});

