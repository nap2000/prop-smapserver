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

import "jquery";
import "localise";
import { addHourglass, getLoggedInUser, handleLogout, htmlEncode, removeHourglass, setupUserProfile, shapeFormsChanged, validGeneralName } from "common";
import { dashboardURL, dashboardStateURL, getQuestionInfo, initialiseDialogs, openModal, closeModal } from "./script";
import globals from "globals";
import "./script";
import "rmm";
import "moment";
import { copyView, gMetaInProgress, getData, showSettings } from "./survey_control";
import extendedModel from "./extended_model";
import { initializeMap } from "./map-ol";

var gNewPanel = false;	// Set to true when editing settings of a new panel
var gExpandedPanelSeq;	// Set to the sequence number of a newly created panel
var pSettingsModal;

$(document).ready(function() {

	var aDate;

	window.moment = window.moment || moment; // Required as common.js not part of module

	setTheme();
	setupUserProfile(true);
	localise.setlang();		// Localise HTML

	// Initialise p_settings as BS5 modal
	pSettingsModal = new bootstrap.Modal(document.getElementById('p_settings'), { backdrop: 'static' });

	document.getElementById('settings_x_close').addEventListener('click', function() {
		cancelSettings();
	});

	document.getElementById('settings_cancel').addEventListener('click', function() {
		cancelSettings();
	});

	document.getElementById('settings_save').addEventListener('click', function() {
		saveSettings();
	});

	function cancelSettings() {
		if(gNewPanel) {
			gNewPanel = false;
			delPanel($('#p' + globals.gViewIdx).find('.pDel'), globals.gViewIdx);
		}
		pSettingsModal.hide();
	}

	function saveSettings() {
		var i, views, view,
			newType, newTitle,
			qMeta, groupMeta,
			qId,
			sId,
	        uId,
	        subjectType,
			qId_is_calc = false;

		// Check that the meta data for the question has been retrieved
		if(gMetaInProgress !== 0) {
			alert(localise.set["msg_wait"]);
			return false;
		}

		// Check that the settings are valid
		newType = $('#settings_type option:selected').attr("value");
		newTitle = $('#settings_title').val();
		qId = $('#settings_question option:selected').val();
		if(qId.indexOf(":") > 0) {
			var calcs = qId.split(":");
			if(calcs.length > 0) {
				qId = calcs[1];
				qId_is_calc = true;
			}
		}
		subjectType = $('#subject_type option:selected').val();

		sId  = $('#settings_survey option:selected').val();
		if(subjectType === "survey" && sId <= 0) {
			alert(localise.set["msg_sel_survey"]);
			return false;
		}
		uId = $('#settings_user option:selected').val();

		if(subjectType === "survey" && newType == "graph" && (!qId || qId == -1)) {
			alert(localise.set["msg_sel_q"]);
			return false;
		}

		if(!validGeneralName(newTitle)) {
			alert(localise.set["msg_val_gen_nm"]);
			return false;
		}

		gNewPanel = false;
		views = globals.gSelector.getViews();
		view = views[globals.gViewIdx];

		view.sId  = sId;
		view.uId = uId;
		view.qId = qId;
		view.qId_is_calc = qId_is_calc;
        view.inc_ro = $('#settings_inc_ro').prop('checked');

        if(subjectType === "user") {
	        view.dateQuestionId = $('#usage_settings_date_question option:selected').val();
        } else {
	        view.dateQuestionId = $('#settings_date_question option:selected').val();
        }
		view.timeGroup = $('#time_group').val();
		view.fromDate = $('#from_date').val();
		if(typeof view.fromDate !== "undefined" && view.fromDate.length === 0) {
			view.fromDate = undefined;
		}
		view.toDate = $('#to_date').val();
		if(typeof view.toDate !== "undefined" && view.toDate.length === 0) {
			view.toDate = undefined;
		}

		if(view.toDate < view.fromDate) {
			alert(localise.set["msg_sel_dates"]);
			return false;
		}

		if(newType === "map") {
			view.selectedGeomQuestion = $('.geomSelect', '#p_settings').val();
			view.groupQuestionId = $('#settings_group option:selected').val();
			view.groupQuestionText = "Location";
			view.region = $('#settings_group option:selected').val();
		} else {
			view.groupQuestionId = $('#settings_group option:selected').val();
			view.groupQuestionText = $('#settings_group option:selected').text();
			if(view.groupQuestionText == "None") {
				view.groupQuestionText = "";
			}
        	view.region = "none";
		}

		// Add geom Questions
        view.geomFormQuestions = [];
        $('.geomSelect', '#p_settings').each(function() {
        	if($(this).val()) {
		        view.geomFormQuestions.push({
			        form: $(this).data("form"),
			        question: $(this).val()
		        });
	        }
        });

		// Determine if we need to redraw the panel
		if(newType !== view.type) {
			setPanelType(newType, globals.gViewIdx, view.timeGroup, view.qId, view.subject_type);
		}
		if(newTitle !== view.title) {
			$('#p' + view.pId).find('.panel_title').text(newTitle);
		}
		view.type = newType;
		view.title = newTitle;
		view.layerId = $('#display_panel option:selected').val();
		if(view.layerId != "-1") {
			view.state = "minimised";
		}
		if(subjectType === "survey") {
			view.sName = $('#settings_survey option:selected').text();
		} else {
			view.sName = $('#settings_user option:selected').text();
		}
		view.question = $('#settings_question option:selected').text();
		view.lang = $('#settings_language option:selected').val();
		view.fn = $('#q1_function option:selected').val();
        view.subject_type = subjectType;

		view.key_words = $('#settings_key_words').val();

		// Set the data names and labels
		qMeta = globals.gSelector.getQuestion(view.qId, view.lang);

		// Set the group type
		groupMeta = globals.gSelector.getQuestion(view.groupQuestionId, view.lang);
		if(groupMeta && view.groupQuestionId > 0) {
			if(groupMeta.type === "geopoint" || groupMeta.type === "geopolygon" ||
					groupMeta.type === "geolinestring" ||
					groupMeta.type === "geoshape" ||
					groupMeta.type === "geotrace" ||
					groupMeta.type === "geocompound" ||
					groupMeta.type === "string") {
				view.groupType = groupMeta.type;
			} else {
				view.groupType = "normal";
			}
		} else {
			view.groupType = "normal";
		}

		view.filter = getFilter();
		view.advanced_filter = $('#set_ad_filter').val();

		savePanels(view);	// Save to the database
        pSettingsModal.hide();
	}

	// Initialise other dialogs
    initialiseDialogs();

	/*
	 * Get the user details so we have the default project
	 * Then load the available projects for the user and load the panels for the default project
	 */
	getLoggedInUser(loggedInUserIdentified, false, true);

	// Set change function on projects
	$('#project_name').change(function() {
		globals.gCurrentProject = $('#project_name option:selected').val();
		globals.gCurrentSurvey = -1;
		globals.gCurrentTaskGroup = undefined;

		getPanels(globals.gCurrentProject);
		saveCurrentProject(globals.gCurrentProject,
				globals.gCurrentSurvey,
				globals.gCurrentTaskGroup);

		getViewSurveys({sId:"-1"});
 	 });

	// Respond to changes to the shape forms selector
	$('.shapeforms').change(function() {
		shapeFormsChanged();
	});


	// Add panel buttons
    $('.db_settings_add').click(function() {
    	addNewPanel($(this).val());
    });

	// Initialise SortableJS on panels container
	var panelsEl = document.getElementById('panels');
	if(panelsEl && typeof Sortable !== 'undefined') {
		new Sortable(panelsEl, {
			animation: 150,
			handle: '.card-header',
			onEnd: function() { savePanels(); }
		});
	}


function loggedInUserIdentified(projectId) {
	getPanels(projectId);
	if(globals.gRefreshRate > 0) {
		autoRefresh();
	}
}

/*
 * Remove any text enclosed in brackets ( )
 */
function removeHint(input) {
	var startIdx, endIdx, newString;

	while((startIdx = input.indexOf('(')) != -1) {
		endIdx = input.indexOf(')');
		if(endIdx > startIdx) {
			newString = input.substring(0, startIdx) + input.substring(endIdx + 1);
			input = newString;
		} else {
			input = input.substring(0, startIdx);
		}
	}

	return input;
}

function getPanels(projectId) {

	if(projectId != -1) {
		addHourglass();
	 	$.ajax({
			url: dashboardURL(projectId),
			dataType: 'json',
			cache: false,
			success: function(data) {
				removeHourglass();
				if(handleLogout(data)) {
					globals.gSelector.setViews(data);
					refreshPanels();
				}
			},
			error: function(data) {
				removeHourglass();
				if(handleLogout(data)) {
					if (data.status === 401) {
						$('#status_msg_msg').empty().text("Not Authorised");
					} else {
						$('#status_msg_msg').empty().text("Error: Failed to get dashboard settings");
					}
					openModal('status_msg');
				}
			}
		});
	}

}

// Re-create panels based on the current view list
function refreshPanels() {

	var views, $panels,
		multiLayerMaps = [],
		i,j, idx;

	addHourglass();
	views = globals.gSelector.getViews();

	$panels = $('#panels');
	$panels.empty();	// Remove existing panels

	for(i = 0; i < views.length; i++) {
		if(views[i].state != "deleted") {
			createPanel(i, $panels, views[i].title, views[i].sName, views[i].subject_type);
			setPanelType(views[i].type, i, views[i].timeGroup, views[i].qId, views[i].subject_type);
			getData(views[i]);
		}
	}

	addTriggers();	// Add triggers

	// Override the settings for expanded / shown
	for(i = 0; i < views.length; i++) {
		if(views[i].state !== "deleted") {
			if(views[i].seq === gExpandedPanelSeq && views[i].layerId == "-1") {
				$('#p' + i).find('.pExpand').trigger('click');
			} else if(views[i].state === "minimised") {
				setPanelState(views[i], i, "minimised");
			} else if(views[i].state === "expanded") {
				views[i].state = "shown";
			}
		}
	}
	removeHourglass();
}

// Set the state of the panel based on the view settings
function setPanelState(view, idx, oldState) {
	var $panel = $('#p' + idx);
	$panel.removeClass("shown expanded delete minimised").addClass(view.state);

	switch(view.state) {
	case "shown":
		$panel.find('.pExpand').html('<i class="fas fa-expand"></i>');
		$panel.removeClass('col-12').addClass('col-12 col-md-6 col-lg-3');
		$panel.removeClass('d-none');
		break;
	case "expanded":
		$panel.find('.pExpand').html('<i class="fas fa-compress"></i>');
		$panel.removeClass('col-12 col-md-6 col-lg-3').addClass('col-12');
		$panel.removeClass('d-none');
		break;
	case "minimised":
		$panel.addClass('d-none');
		break;
	}

}

// Add triggers to panel menu items
function addTriggers() {

	$('.pSettings').off().click(function() {
		showSettings($(this));
	});

	$('.pExpand').off().click(function() {
		expandFunction($(this));
	});

	$('.pDel').off().click(function() {
		delPanel($(this));
	});

	$('.slide').off().click(function() {
		slide($(this));
	});

$('.set_date_range').off().click(function() {
		set_date_range($(this));
	});

	$('.clear_date_range').off().click(function() {
		clear_date_range($(this));
	});
}

// Add a new panel on to the end of the current panels
function addNewPanel(type) {

	var views = globals.gSelector.getViews();
	var idx = 0;
	if(views) {
		idx = views.length;
	}

	views[idx] = {id:-1, seq: idx, state: "shown", title:"", pId: idx,
			sId:-1, type:type, region:"None", lang:"", qId:"-1", table:"", groupId:-1,
			groupType:"normal", layerId:"-1"};
	gExpandedPanelSeq = idx;

	var $panels = $('#panels');
	createPanel(idx, $panels, views[idx].title, views[idx].sName, views[idx].subject_type);
	setPanelType(views[idx].type, idx, views[idx].timeGroup, views[idx].qId, views[idx].subject_type);
	addTriggers();
	gNewPanel = true;
	$('#p' + idx).find('.pSettings,.pExpand').trigger('click');
}

// delete a panel
function delPanel($this, idx) {

	var msg,
		views,
		e;

	if(typeof idx === "undefined") {
		idx = $this.attr("value");
	}

	views = globals.gSelector.getViews();
	if(views[idx].state === "expanded") {
		gExpandedPanelSeq = idx;
		$('.col-12.col-md-6.col-lg-4.panel-col').removeClass('d-none');
	}
	views[idx].state = "deleted";

	$('#p' + idx).remove();

	e = jQuery.Event("resized");
	$('.analysis').trigger(e);
	savePanelState(views[idx]);
	if(views[idx].layerId != "-1") {
		refreshPanels();
	}

}

// Create a single panel card
function createPanel(idx, $panels, title, surveyName, subject_type) {

	if(title === "") {
		if(subject_type === "survey") {
			title = surveyName;
		} else if(subject_type === "user") {
			title = localise.set["a_ua"] + ": " + surveyName;
		} else {
			title = localise.set["a_ul"];
		}
	}
	if(!validGeneralName(title)) {
		alert(localise.set["msg_ipt"] + ". " + localise.set["msg_val_gen_nm"]);
	}

	var el = document.createElement('div');
	el.className = 'col-12 col-md-6 col-lg-3 panel-col';
	el.id = 'p' + idx;
	el.innerHTML = `
		<div class="card h-100">
			<div class="card-header panel-header d-flex align-items-center">
				<span class="panel_title me-auto text-truncate">${htmlEncode(title)}</span>
				<div class="panel-actions">
					<button class="panel-btn pSettings" value="${idx}" title="Settings">
						<i class="fas fa-sliders-h"></i></button>
					<button class="panel-btn pExpand" value="${idx}" title="Expand">
						<i class="fas fa-expand"></i></button>
					<button class="panel-btn panel-btn-danger pDel" value="${idx}" title="Remove">
						<i class="fas fa-times"></i></button>
				</div>
			</div>
			<div class="card-body pContent p-0"></div>
		</div>`;
	$panels[0].appendChild(el);
}

//Create a single panel for the passed in view
function setPanelType(type, idx, period, qId, subject_type) {

	var $panelContent = $('#p' + idx).find('.pContent');
	$panelContent.empty();

	var html;

	switch(type) {
	case "map":
		html = `<button class="slide" href="#slideLeft"><i class="fas fa-chevron-left"></i></button>
			<div style="height:100%;width:100%;">
				<div class="r_overview"><div class="r_description"></div></div>
				<div class="analysis map_panel" id="map_panel${idx}"></div>`;
		if(typeof period !== "undefined" && period !== "none") {
			html += `<div class="timecontrols d-none p-2">
				<div class="d-flex gap-2 align-items-center flex-wrap">
					<label>Interval:</label>
					<select name="span" class="form-select form-select-sm w-auto"></select>
					<button class="btn btn-sm btn-primary starttimer">${localise.set["c_start"] || "Start"}</button>
					<span class="slide_date1"></span>&ndash;<span class="slide_date2"></span>
				</div>
				<input type="range" class="form-range slider-range mt-2" min="0" step="1">
			</div>`;
		}
		html += `</div>
			<div class="pSidebar">
				<h3>${localise.set["c_layers"] || "Layers"}</h3>
				<div id="mLayers${idx}"></div>
				<h3>${localise.set["c_data"] || "Data"}</h3>
				<div class="dataOptions" id="mDataOptions${idx}"></div>
				<h3>${localise.set["c_settings"] || "Settings"}</h3>
				<div id="mLayerSettings${idx}"></div>
			</div>`;
		$panelContent.append(html);
		initializeMap(idx);
		break;
	case "table":
		if(subject_type === 'survey') {
			html = `<button class="slide" href="#slideLeft"><i class="fas fa-chevron-left"></i></button>`;
		} else {
			html = '';
		}
		html += `<div class="analysis table_panel" id="table_panel${idx}"></div>
			<div class="pSidebar">`;
		if(typeof qId === "undefined" || qId == -1) {
			html += `<h3>${localise.set["c_tables"] || "Tables"}</h3>
				<div class="phead"></div>`;
		}
		html += `<h3>${localise.set["c_actions"] || "Actions"}</h3>
			<div class="pfoot d-flex flex-wrap gap-1 p-1">
				<button class="btn btn-sm btn-outline-secondary tExport">${localise.set["m_backup"] || "Export"}</button>
				<button class="btn btn-sm btn-outline-secondary tExportMedia">${localise.set["m_backup_media"] || "Export Media"}</button>
				<button class="btn btn-sm btn-outline-secondary tImport">${localise.set["m_import"] || "Import"}</button>
				<button class="btn btn-sm btn-outline-danger tDelete">${localise.set["c_del_data"] || "Delete"}</button>
				<button class="btn btn-sm btn-outline-secondary tRestore">${localise.set["c_res_data"] || "Restore"}</button>
				<button class="btn btn-sm btn-outline-secondary tArchive">${localise.set["c_archive_data"] || "Archive"}</button>
			</div>
		</div>`;
		$panelContent.append(html);
		break;
	case "graph":
		html = `<button class="slide" href="#slideLeft"><i class="fas fa-chevron-left"></i></button>
<div class="analysis graph_panel" id="graph_panel${idx}">
				<div class="r_overview"><div class="r_description"></div></div>
				<div style="position:relative;height:90%;width:100%;">
					<canvas id="chartdiv${idx}"></canvas>
				</div>
			</div>
			<div class="pSidebar">
				<h3>${localise.set["c_options"] || "Options"}</h3>
				<div id="mLayers${idx}"></div>
				<h3>${localise.set["c_data"] || "Data"}</h3>
				<div class="dataOptions" id="mDataOptions${idx}"></div>
			</div>`;
		$panelContent.append(html);
		break;
	case "media":
		html = `<div class="analysis media_panel" id="media_panel${idx}">
			<div class="image_wrap"><img src="img/blank.gif" width="512" height="344" /></div>
			<div class="media_wrap"><div id="media_wrap${idx}"><div class="player"></div></div></div>
			<br clear="all"/>
			<div class="scrollable" id="scrollable${idx}"></div>
		</div>`;
		$panelContent.append(html);
		break;
	default:
		console.log("No type");
		break;
	}

	// Hide footer buttons for non-analysts
	if(!globals.gIsAnalyst) {
		$('.pfoot').hide();
	}

}

// Handle expand / normal size actions on panels
function expandFunction($this) {

	var viewIdx = $this.attr("value"),
		views = globals.gSelector.getViews(),
		oldState,
		i,
		e;

	if($('#p' + viewIdx).hasClass('expanded')) {
		// un-expand selected panel
		oldState = views[viewIdx].state;
		views[viewIdx].state = "shown";
		setPanelState(views[viewIdx], viewIdx, oldState);
		gExpandedPanelSeq = -1;
		$('.panel-col').removeClass('d-none');
	} else {
		// expand selected panel — first un-expand any other
		for(i = 0; i < views.length; i++) {
			if(views[i].state == "expanded") {
				oldState = views[i].state;
				views[i].state = "shown";
				setPanelState(views[i], i, oldState);
				break;
			}
		}

		oldState = views[viewIdx].state;
		views[viewIdx].state = "expanded";
		setPanelState(views[viewIdx], viewIdx, oldState);
		gExpandedPanelSeq = views[viewIdx].seq;
		$('.panel-col').not('#p' + viewIdx).addClass('d-none');
	}

	// Send a resized event to analysis panels
	e = jQuery.Event("resized");
	$('.analysis').trigger(e);

}

/*
 * Save the panels to the database
 */
function savePanels(newPanel) {
	var views = globals.gSelector.getViews(),
		idx,
		i,
		inViews = [],
		saveViews = [],
		viewString;

	// Set the sequence
	idx = 0;
	gExpandedPanelSeq = -1;
	for(i = 0; i < views.length; i++) {
		if(views[i].state != "deleted") {
			views[i].seq = idx;
			if(views[i].state === "expanded") {
				gExpandedPanelSeq= idx;
			}
			idx++;
		}
	}

	if(typeof newPanel === "undefined") {
		inViews = views;
	} else {
		inViews[0] = newPanel;
	}

	// Get a deep copy of the views
	for(i = 0; i < inViews.length; i++) {
		saveViews[i] = copyView(inViews[i]);
	}

	var viewsString = JSON.stringify(saveViews);
	addHourglass();
	$.ajax({
		  type: "POST",
		  cache: false,
		  dataType: 'text',
		  contentType: "application/x-www-form-urlencoded",
		  url: "/surveyKPI/dashboard/",
		  data: { settings: viewsString },
		  success: function(data, status) {
			  removeHourglass();
			  if(handleLogout(data)) {
				  getPanels(globals.gCurrentProject);
			  }
		  }, error: function(data, status) {
			  removeHourglass();
			  if(handleLogout(data)) {
				  alert(localise.set["c_error"] + " : " + data.responseText);
			  }
		  }
	});
}

/*
 * Save the state of a single panel to the database
 */
function savePanelState(view) {

	var saveView = copyView(view);

	var viewString = JSON.stringify(saveView);
	$.ajax({
		  type: "POST",
		  cache: false,
		  dataType: 'text',
		  contentType: "application/x-www-form-urlencoded",
		  url: dashboardStateURL(),
		  data: { state: viewString },
		  success: function(data, status) {
			  	handleLogout(data);
		  }, error: function(data, status) {
			  handleLogout(data);
		  }
	});
}

function slide($elem) {
	var current = $elem.attr("href");
	var e = jQuery.Event("resized");
	var $pContent = $elem.closest('.pContent');
	if(current == "#slideLeft") {
		$elem.html('<i class="fas fa-chevron-right"></i>');
		$elem.attr("href", "#slideRight");
		$pContent.addClass('sidebar-open');
		$pContent.find('.pSidebar').show();
		$pContent.find('.map_panel, .graph_panel, .table_panel, .timecontrols').css('width', '74%').trigger(e);
		$pContent.find('.timecontrols').css('width', '70%');
	} else {
		$elem.html('<i class="fas fa-chevron-left"></i>');
		$elem.attr("href", "#slideLeft");
		$pContent.removeClass('sidebar-open');
		$pContent.find('.pSidebar').hide();
		$pContent.find('.map_panel, .graph_panel, .table_panel, .timecontrols').css('width', '100%').trigger(e);
		$pContent.find('.timecontrols').css('width', '95%');
	}
}

function getFilter() {
	 var qFilter = $('#filter_question option:selected').val();
	 var filterValue = $('#filter_value option:selected').val();
	 var sId  = $('#settings_survey option:selected').val();
	 var language = $('#settings_language option:selected').val();

	 var qInfo = getQuestionInfo(sId, language, qFilter);

	 if((qFilter > 0 || qFilter < -1) && typeof filterValue !== "undefined") {
		 var filterObj = {};
		 filterObj.qId = qFilter;
		 filterObj.qType = qInfo.type;
		 filterObj.qName = qInfo.name;
		 filterObj.value = filterValue;
		 return JSON.stringify(filterObj);
	 } else {
		 return undefined;
	 }
}

function autoRefresh() {
	console.log("refresh every: " + globals.gRefreshRate + " minutes")
	setTimeout(function(){
		console.log("refresh");
		autoRefreshAnalysisData();
		autoRefresh();
		}, 60000 * globals.gRefreshRate);
}

// Export pSettingsModal for use in survey_control.js
window._pSettingsModal = pSettingsModal;

});

// Export so survey_control.js can open the modal
export function showPSettingsModal() {
	if(window._pSettingsModal) {
		window._pSettingsModal.show();
	}
}
