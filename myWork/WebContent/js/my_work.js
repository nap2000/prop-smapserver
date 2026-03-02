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
"use strict";

import "jquery";
import localise from "localise";
import globals from "globals";
import dbstorage from "./app/db-storage";
import { addCacheBuster, addHourglass, getLoggedInUser, handleLogout, htmlEncode, removeHourglass, saveCurrentProject, setupUserProfile } from "common";

var gUserLocale = navigator.language;
if (typeof localStorage !== "undefined") {
	try {
		if (typeof Modernizr !== "undefined" ? Modernizr.localstorage : true) {
			gUserLocale = localStorage.getItem("user_locale") || navigator.language;
		}
	} catch (error) {
		gUserLocale = navigator.language;
	}
}
window.gUserLocale = gUserLocale;

let gIsApp = false;

const $ = window.$;

localise.initLocale(gUserLocale).then(function () {
	window.localise = localise;

	$(document).ready(function() {

		setCustomWebForms();			// Apply custom javascript
		setTheme();
		setupUserProfile(true);
		localise.setlang();		// Localise HTML

		dbstorage.open();

		// Get the user details
		getLoggedInUser(projectSet, false, true, undefined);

		// Set change function on projects
		$('#project_name').change(function() {
			globals.gCurrentProject = $('#project_name option:selected').val();
			globals.gCurrentSurvey = -1;
			globals.gCurrentTaskGroup = undefined;

			getSurveysForList(globals.gCurrentProject);			// Get surveys

			saveCurrentProject(globals.gCurrentProject,
				globals.gCurrentSurvey,
				globals.gCurrentTaskGroup);
		});

		// Refresh menu
		$('#m_refresh').click(function () {
			$('.up_alert').hide();
			projectSet();
		});

		if(window.location.href.indexOf('tasks') > 0) {
			$('#tasksTab').find('a').click();
		}

	});
});
	
	function projectSet() {
		getSurveysForList();			// Get surveys
	}

	function getSurveysForList() {

		var url="/surveyKPI/assignments/mine";

		addHourglass();
		$.ajax({
			url: url,
			dataType: 'json',
			cache: false,
			success: function(data) {
				removeHourglass();
				if(handleLogout(data)) {
					surveyDataFromCache(data, globals.gCurrentProject);
				}
			},
			error: function(xhr, textStatus, err) {
				removeHourglass();
				if(xhr.readyState == 0 || xhr.status == 0) {
					return;  // Not an error
				} else {
					console.log("Error: Failed to get list of surveys: " + err);
				}
			}
		});
	}

	/*
	 * Fill in the survey list
	 * This is called using cache data, hence no need to update data store
	 */
	function surveyDataFromCache(surveyList, filterProjectId) {

		var i,
			h = [],
			idx = -1,
			formList = surveyList.forms,
			taskList = surveyList.data;


		// Refresh the view of forms
		if (formList) {
			addFormList(formList, filterProjectId);
		} else {
			$('#forms_count').html('(0)');
			$('#form_list').html('');
		}

		// Refresh the view of tasks
		if (taskList) {
			showTaskList(taskList, filterProjectId);
		} else {
			$('#tasks_count').html('(0)');
			$('#task_list').html('');
		}
	}

	function addFormList(formList, filterProjectId) {
		var i,
			h = [],
			idx = -1,
			$formList = $('#form_list'),
			count = 0;

		for(i = 0; i < formList.length; i++) {
			if(!formList[i].tasks_only && (!filterProjectId || filterProjectId == formList[i].pid)) {
				h[++idx] = '<a role="button" class="btn w-100 btn-lg';
				if(formList[i].read_only) {
					h[++idx] = ' bg-light';
				} else {
					h[++idx] = ' bg-warning';
				}
				h[++idx] = '" href="/app/myWork/webForm/';
				h[++idx] = formList[i].ident;

				h[++idx] = '" target="_blank">';
				h[++idx] = htmlEncode(formList[i].name);
				h[++idx] = '</a>';
				count++;
			}
		}
		$('#forms_count').html('(' + count+ ')');
		$formList.html(h.join(''));
	}

	function showTaskList(taskList, filterProjectId) {
		var i,
			h = [],
			idx = -1,
			$taskList = $('#task_list'),
			count = 0;

		for(i = 0; i < taskList.length; i++) {

			if(!filterProjectId || filterProjectId == taskList[i].task.pid) {
				var isCancelled = taskList[i].assignment.assignment_status === 'cancelled';
				var isNew = taskList[i].assignment.assignment_status === 'new';
				var isAccepted = taskList[i].assignment.assignment_status === 'accepted';
				var repeat = taskList[i].task.repeat || taskList[i].task.type === 'case'; 	// Can complete the task multiple times
				h[++idx] = '<div class="btn-group w-100 btn-group-lg d-flex" role="group" aria-label="Button group for task selection or rejection">';
				if(isCancelled) {
					h[++idx] = '<button class="btn btn-danger w-10 task-icon" type="button" disabled>'; 
				} else if(isNew) {
					h[++idx] = '<button class="btn btn-secondary w-10 task-icon" type="button" disabled>';
				} else {
					h[++idx] = '<button class="btn btn-info w-10 task-icon" type="button">';
				}
				if(taskList[i].task.type === 'case') {
					h[++idx] = '<i class="fa fa-folder-open"></i>';
				} else {
					h[++idx] = '<i class="fa fa-file"></i>';
				}
				h[++idx] = '</button>';
				h[++idx] = '<a id="a_';
				h[++idx] = i;
				if(isCancelled) {
					h[++idx] = '" class="task btn btn-danger w-100 disabled" role="button" aria-disabled="true"';
				} else if(isNew) {
					h[++idx] = '" class="task btn btn-secondary w-100 disabled" role="button" aria-disabled="true"';
				} else {
					h[++idx] = '" class="task btn btn-info w-100" role="button"';
					h[++idx] = ' target="_blank"';
				}

				h[++idx] = ' data-repeat="';
				if(repeat) {
					h[++idx] = 'true';
				} else {
					h[++idx] = 'false';
				}

				// Add the href
				var hasParam = false;
				var href = '#';
				if(!isCancelled) {
					href = '/app/myWork/webForm/';
					href += taskList[i].task.form_id;

					if (taskList[i].task.initial_data_source) {
						if (taskList[i].task.initial_data_source === 'survey' && taskList[i].task.update_id) {

							href += (hasParam ? '&' : '?');
							href += 'datakey=instanceid&datakeyvalue=';
							href += taskList[i].task.update_id;
							hasParam = true;

						} else if (taskList[i].task.initial_data_source === 'task') {
							href += (hasParam ? '&' : '?');
							href += 'taskkey=';
							href += taskList[i].task.id;
							hasParam = true;
						}
					}

					href += (hasParam ? '&' : '?');		// Add the assignment id
					href += 'assignment_id=';
					href += taskList[i].assignment.assignment_id;

					href += addCacheBuster(href);		// Add a cache buster
				}

				if(isNew) {
					h[++idx] = '" href="#" data-href="' + href + '">';
				} else {
					h[++idx] = '" href="' + href + '"';
					if(!isCancelled) {
						h[++idx] = ' data-href="' + href + '"';
					}
					h[++idx] = '>';
				}

				// Add the text
				h[++idx] = '<span class="text-center">'
					+ htmlEncode(taskList[i].task.title)
					+ " (" + localise.set["c_id"] + ": " + taskList[i].assignment.assignment_id + ")"
					+ (isCancelled ? (' : ' + localise.set["cancelled"]) : '')
					+ '</span>';
				h[++idx] = '</a>';

				// Add button with additional options
				if(!isCancelled && (isAccepted || isNew)) {
					h[++idx] = '<div class="btn-group w-20" role="group">';
					h[++idx] = '<button ';
					h[++idx] = 'id="a_r_' + i;
					h[++idx] = '" class="btn btn-secondary dropdown-toggle w-100" type="button" data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false">';
					h[++idx] = '...';
					h[++idx] = '</button>';
					h[++idx] = '<div class="dropdown-menu dropdown-menu-end">';
					if(isAccepted) {
						h[++idx] = '<a class="dropdown-item task-action-accept disabled" href="#" data-id="' + i + '" aria-disabled="true">' + localise.set["c_accept"] + '</a>';
					} else {
						h[++idx] = '<a class="dropdown-item task-action-accept" href="#" data-id="' + i + '">' + localise.set["c_accept"] + '</a>';
					}
					h[++idx] = '<a class="dropdown-item task-action-reject" href="#" data-id="' + i + '">' + localise.set["c_reject"] + '</a>';
					h[++idx] = '</div>';
					h[++idx] = '</div>';
				} else if(!isCancelled) {
					h[++idx] = '<button ';
					h[++idx] = 'id="a_r_' + i;
					h[++idx] = '" class="btn btn-danger w-20 reject" type="button"';
					h[++idx] = '" data-id="';
					h[++idx] = i;
					h[++idx] = '">';
					if(taskList[i].task.type === 'case') {
						h[++idx] = localise.set["mf_rel"];
					} else {
						h[++idx] = localise.set["c_reject"];
					}
					h[++idx] = '</button>';
				}

				h[++idx] = '</div>';        // input group
				if(!isCancelled) {
					count++;
				}
			}
		}

		$('#tasks_count').html('(' + count + ')');
		$taskList.html(h.join(''));

		$taskList.find('.task').off().click(function(){
			$('.up_alert').hide();
			var $this = $(this),
				repeat = $this.data("repeat");

			if($this.hasClass('disabled')) {
				return;
			}

			if(!repeat) {
				$this.removeClass('btn-warning').addClass('btn-success');		// Mark task as done
				$this.addClass('disabled');
				$this.closest(".btn-group").find(".reject").addClass("disabled");
			}
		});

		$taskList.find('.reject').off().click(function(){
			var $this = $(this);
			var tl = taskList;
			if(!$this.hasClass('disabled')) {
				reject($this.data("id"), tl);
			}
		});

		$taskList.find('.task-action-reject').off().click(function(e){
			e.preventDefault();
			var $this = $(this);
			var tl = taskList;
			reject($this.data("id"), tl);
		});

		$taskList.find('.task-action-accept').off().click(function(e){
			e.preventDefault();
			var $this = $(this);
			var tl = taskList;
			if($this.hasClass('disabled')) {
				return;
			}
			accept($this.data("id"), tl);
		});
	}


	function reject(idx, taskList) {

		$('.up_alert').hide();
		bootbox.prompt({
			title: localise.set["a_res_5"],
			centerVertical: true,
			locale: gUserLocale,
			callback: function(result){
				console.log(result);

				// Validate
				if(!result || result.trim().length < 5) {
					$('.up_alert').show().removeClass('alert-success').addClass('alert-danger').html(localise.set["a_res_5"]);
					return;
				}


				var taskUpdate = {
					assignment_id: taskList[idx].assignment.assignment_id,
					assignment_status: 'rejected',
					task_comment: result,
					type: taskList[idx].task.type,
					sIdent: taskList[idx].task.form_id,
					uuid: taskList[idx].task.update_id
				}

				addHourglass();
				$.ajax({
					type: "POST",
					data: {assignment: JSON.stringify(taskUpdate)},
					cache: false,
					contentType: "application/x-www-form-urlencoded",
					url: "/surveyKPI/assignments/mine/update_status",
					success: function(data, status) {
						removeHourglass();
						if(handleLogout(data)) {
							var $task = $('#a_' + idx);
							$task.removeClass('btn-info btn-secondary').addClass('btn-danger').addClass('disabled');
							$task.attr('href', '#').removeAttr('target').attr('aria-disabled', 'true');
							$task.closest('.btn-group').find('.task-icon')
								.removeClass('btn-info btn-secondary').addClass('btn-danger').prop('disabled', true);
							$('#a_r_' + idx).addClass('disabled');
						}
					},
					error: function(xhr, textStatus, err) {
						removeHourglass();
						$('.up_alert').show().removeClass('alert-success').addClass('alert-danger').text(localise.set["msg_err_upd"] + htmlEncode(xhr.responseText));

					}
				});
			}
		});


	}

	function accept(idx, taskList) {

		$('.up_alert').hide();
		var taskUpdate = {
			assignment_id: taskList[idx].assignment.assignment_id,
			assignment_status: 'accepted',
			task_id: taskList[idx].task.id,
			type: taskList[idx].task.type,
			sIdent: taskList[idx].task.form_id,
			uuid: taskList[idx].task.update_id
		};

		addHourglass();
		$.ajax({
			type: "POST",
			data: {assignment: JSON.stringify(taskUpdate)},
			cache: false,
			contentType: "application/x-www-form-urlencoded",
			url: "/surveyKPI/assignments/mine/update_status",
			success: function(data, status) {
				removeHourglass();
				if(handleLogout(data)) {
					taskList[idx].assignment.assignment_status = 'accepted';
					var $task = $('#a_' + idx);
					var href = $task.data('href');
					$task.removeClass('btn-secondary disabled').addClass('btn-info');
					$task.attr('href', href).attr('target', '_blank').attr('aria-disabled', 'false');
					$task.closest('.btn-group').find('.task-icon')
						.removeClass('btn-secondary').addClass('btn-info').prop('disabled', false);
				}
			},
			error: function(xhr, textStatus, err) {
				removeHourglass();
				$('.up_alert').show().removeClass('alert-success').addClass('alert-danger').text(localise.set["msg_err_upd"] + htmlEncode(xhr.responseText));
			}
		});
	}
