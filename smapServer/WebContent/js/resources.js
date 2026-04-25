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

import "./libs/bootstrap.file-input.js";
import localise from "./app/localise.js";
import globals from "./app/globals.js";
import {
	addHourglass,
	downloadFile,
	getBaseName,
	getFilesFromServer,
	getLocations,
	getLoggedInUser,
	handleLogout,
	htmlEncode,
	includeLocation,
	refreshMediaViewManage,
	refreshLocationGroups,
	removeHourglass,
	setupUserProfile,
	uploadFiles
} from "./app/common.js";

const $ = window.$;

let gUserLocale = navigator.language;
if (typeof localStorage !== "undefined") {
	try {
		gUserLocale = localStorage.getItem('user_locale') || navigator.language;
	} catch (error) {
		gUserLocale = navigator.language;
	}
}

window.gUserLocale = gUserLocale;

let gMaps,
	gMapVersion,
	gMapId,
	gTags,          // NFC tags
	gCurrentGroup,
	gIsSurvey;

$(function() {

		// moment loaded via script tag for common.js

		/*
	 	 * Get the parameters
	 	 */
		var params = location.search.substring(location.search.indexOf("?") + 1);
		var pArray = params.split("&");
		var i;
		for (i = 0; i < pArray.length; i++) {
			var param = pArray[i].split("=");
			if ( param[0] === "survey" ) {
				gIsSurvey = true;
			} else if ( param[0] === "survey_name" ) {
				$('.formName').text(decodeURI(': ' + param[1]));
			}
		}

		setCustomResources();			// Apply custom javascript
		setTheme();
		setupUserProfile(true);
		localise.initLocale(gUserLocale).then(function () {
			localise.setlang();		// Localise HTML
			$('#map_name').attr("placeholder", localise.set["sr_m_ph"]);
			$('#map_description').attr("placeholder", localise.set["sr_m_d"]);
			$('#mapid').attr("placeholder", localise.set["sr_m_mb"]);
		});

		// Get the user details
		globals.gCurrentSurvey = undefined;
		getLoggedInUser(gotUser, false, false, undefined, false, false);
		getLocations(loadedLocationData);

		// Set up the tabs
		$('#csvTab a').click(function (e) {
			e.preventDefault();
			window.bsTabShow(this);

			$('.resourcePanel').hide();
			$('#csvPanel').show();

			$('.upload_alert').removeClass('alert-danger').addClass('alert-success').html("");
		});
		$('#mediaTab a').click(function (e) {
			e.preventDefault();
			window.bsTabShow(this);

			$('.resourcePanel').hide();
			$('#mediaPanel').show();

			$('.upload_alert').removeClass('alert-danger').addClass('alert-success').html("");
		});
		$('#mapTab a').click(function (e) {
			e.preventDefault();
			window.bsTabShow(this);

			$('.resourcePanel').hide();
			$('#mapPanel').show();
		});
		$('#locationTab a').click(function (e) {
			e.preventDefault();
			window.bsTabShow(this);

			$('.resourcePanel').hide();
			$('#locationPanel').show();

			$('.upload_file_msg').hide().removeClass('alert-danger').addClass('alert-success').html("");
		});

		/*
         * Set up csv tab
         */
		$('.csv-inputs').bootstrapFileInput();
		$('.upload_alert').hide().removeClass('alert-danger').addClass('alert-success').html("");

		// Open the dialog to select a new survey for upload
		$('#addCsv').click( function(e) {
			$('#uploadAction').val("add");
			$('#resourceUpload')[0].reset();
			$('.notreplace, #fileCsv').show();
			$('#fileMedia').hide();
			$('.upload_alert').removeClass('alert-danger').addClass('alert-success').html("");
			window.bsModalShow('#fileAddPopup');
		});

		// Open the dialog to select a new survey for upload
		$('#addMedia').click( function(e) {
			$('#uploadAction').val("add");
			$('#resourceUpload')[0].reset();
			$('.notreplace, #fileMedia').show();
			$('#fileCsv').hide();
			$('.upload_alert').removeClass('alert-danger').addClass('alert-success').html("");
			window.bsModalShow('#fileAddPopup');
		});

		/*
         * Uploading of media files
         */
		$('#itemName').keydown(function(){
			$('.upload_alert').removeClass('alert-danger').addClass('alert-success').html("");
		});

		// Change function on media file selected
		$('#fileCsv, #fileMedia').change(function(){
			var $this = $(this);
			var itemName = $('#itemName').val();
			var fileName = $this[0].files[0].name;

			$('.upload_alert').hide();

			if(!itemName || itemName.trim().length === 0) {
				$('#itemName').val(getBaseName(fileName));
			}
		});

		// Upload a single media or CSV File
		$('#submitResourceFile').click( function(e) {
			$('#submitResourceFile').prop("disabled", true);  // debounce
			uploadResourceFile();
		});

		/*
         * Set up media tab
         */
		$('.media-inputs').bootstrapFileInput();

		// Respond to file upload
		$('.submitMedia').addClass('disabled');
		$('#submitMedia').click( function() {
			if(!$('#submitMedia').hasClass('disabled')) {
				uploadFiles('/surveyKPI/upload/media', "mediaupload", refreshMediaViewManage);
			}
		});

		// Respond to location upload
		$('.upload_file_msg').hide();
		$('#uploadLocationFiles').click( function() {
			$('.upload_file_msg').hide();
			window.bsModalShow('#fileAddLocations');
		});
		$('#submitLocationFile').click( function(){
			uploadFiles('/surveyKPI/tasks/locations/upload', "locationsUpload", loadedLocationData);
		});

		// Respond to location download
		$('#downloadLocationFiles').click( function() {
			$('.upload_file_msg').hide();
			if(!$('#downloadLocationFiles').hasClass('disabled')) {
				downloadFile('/surveyKPI/tasks/locations/download');
			}
		});

		$('#location_group').change(function() {
			refreshLocationView();
		});
		$('#includeNfc, #includeGeo').change(function() {
			gCurrentGroup = refreshLocationGroups(gTags, false, gCurrentGroup);
			refreshLocationView();
		});

		/*
         * Set up maps tab
         */
		$('#addMap').click(function(){
			edit_map();
			window.bsModalShow('#addMapPopup');
		});

		// Enable the save notifications function
		$('#saveMap').click(function(){saveMap();});

		// Respond to change of map type
		$(".vector_only").hide();
		$('#map_type').change(function(){
			showMapDialogSections($(this));
		});
		getMaps();

		/*
         * Set up SharePoint lists tab
         */
		$('#spListTab a').click(function(e) {
			e.preventDefault();
			window.bsTabShow(this);
			$('.resourcePanel').hide();
			$('#spListPanel').show();
			getSpListMaps();
		});

		$('#addSpList').click(function() {
			edit_sp_list();
			window.bsModalShow('#spListEditPopup');
		});

		$('#saveSpList').click(function() { saveSpList(); });

		/*
         * Set up location tabs
         */
		$('#addNfc').click(function(){
			window.bsModalShow('#addMapPopup');
		});

		$('.vector-data-inputs').bootstrapFileInput();
		$('.vector-style-inputs').bootstrapFileInput();

	});

	/*
	Once we know the user and the current survey get the media files
	 */
	function gotUser() {
		/*
		 * Update menus
		 * Do it here as menus will have been set automatically according to security privileges
		 */
		if(gIsSurvey) {
			$('#mapTab, #locationTab, #spListTab').hide();
			$('#m_monitor, #m_tm, #m_user, #m_settings, #m_logs').hide();
			$('#m_form').show();
			$('#page_title').text(localise.set["sr_sm"]);
		}

		// Get the files
		getFilesFromServer(gIsSurvey ? globals.gCurrentSurvey : 0, refreshMediaViewManage, false);
	}
	function showMapDialogSections(type) {
		if(type === "mapbox") {
			$(".mapbox_only").show();
			$(".vector_only").hide();
		} else {
			$(".vector_only").show();
			$(".mapbox_only").hide();
		}
	}

	/*
     * Open a map for editing or create a new map
     */
	function edit_map(idx) {

		var map,
			title = localise.set["msg_add_map"];

		document.getElementById("map_edit_form").reset();

		if(typeof idx !== "undefined") {
			map = gMaps[idx];

			title = localise.set["msg_edit_map"],

				$('#map_name').val(map.name);
			$('#map_type').val(map.type);
			$('#map_description').val(map.description);

			$('#map_zoom').val(map.config.zoom);
			$('#mapid').val(map.config.mapid);
			$('#vector_data').val(map.config.vectorData);
			$('#style_data').val(map.config.styleData);

			gMapVersion = map.version;
			gMapId = map.id;
		} else {
			gMapVersion = 1;
			gMapId = -1;
		}

		showMapDialogSections($('#map_type').val())
		$('#addMapLabel').html(title);

	}

	/*
     * Save a map
     */
	function saveMap() {

		var map,
			url = "/surveyKPI/shared/maps",
			mapString;

		map = {};
		map.name = $('#map_name').val();
		map.type = $('#map_type').val();
		map.description = $('#map_description').val();
		map.config = {};
		map.config.zoom = $('#map_zoom').val();
		map.config.mapid = $('#mapid').val();
		map.config.vectorData = $('#vector_data').val();
		map.config.styleData = $('#style_data').val();

		map.version = gMapVersion;
		map.id = gMapId;

		mapString = JSON.stringify(map);
		addHourglass();
		$.ajax({
			type: "POST",
			async: false,
			cache: false,
			url: url,
			contentType: "application/x-www-form-urlencoded ",
			data: { map: mapString },
			success: function(data, status) {
				removeHourglass();
				getMaps();
				window.bsModalHide('#addMapPopup');
			},
			error: function(xhr, textStatus, err) {
				removeHourglass();
				if(xhr.readyState == 0 || xhr.status == 0) {
					return;  // Not an error
				} else {
					alert(localise.set["msg_err_save"] + " " + xhr.responseText);	// alerts htmlencode
				}
			}
		});


	}

	/*
     * Get the shared maps from the server
     */
	function getMaps() {

		var url="/surveyKPI/shared/maps/";

		addHourglass();
		$.ajax({
			url: url,
			dataType: 'json',
			cache: false,
			success: function(data) {
				removeHourglass();
				gMaps = data;
				updateMapList(data);
			},
			error: function(xhr, textStatus, err) {
				removeHourglass();
				if(xhr.readyState == 0 || xhr.status == 0) {
					return;  // Not an error
				} else {
					console.log("Error: Failed to get list of maps: " + err);
				}
			}
		});

	}


	/*
     * Update the list of maps
     */
	function updateMapList(data) {

		var $selector=$('#map_list'),
			i,
			h = [],
			idx = -1;

		h[++idx] = '<thead>';
		h[++idx] = '<tr>';
		h[++idx] = '<th>' + localise.set["c_name"], + '</th>';
		h[++idx] = '<th>' + localise.set["c_type"] + '</th>';
		h[++idx] = '<th>' + localise.set["c_desc"] + '</th>';
		h[++idx] = '<th>' + localise.set["c_details"] + '</th>';
		h[++idx] = '<th></th>';
		h[++idx] = '</tr>';
		h[++idx] = '</thead>';
		h[++idx] = '<tbody class="table-striped">';

		for(i = 0; i < data.length; i++) {

			h[++idx] = '<tr>';

			// name
			h[++idx] = '<td>';
			h[++idx] = htmlEncode(data[i].name);
			h[++idx] = '</td>';

			// type
			h[++idx] = '<td>';
			h[++idx] = htmlEncode(data[i].type);
			h[++idx] = '</td>';

			// description
			h[++idx] = '<td>';
			h[++idx] = htmlEncode(data[i].desc);
			h[++idx] = '</td>';

			// details
			h[++idx] = '<td>';

			h[++idx] = htmlEncode(data[i].config.zoom + " levels");
			if(data[i].type === "mapbox" && data[i].config.mapid) {
				h[++idx] = htmlEncode(", Mapbox Id: " + data[i].config.mapid);
			}
			if(data[i].type === "vector" && data[i].config.vectorData) {
				h[++idx] = htmlEncode(", Vector file: " + data[i].config.vectorData);
			}
			if(data[i].type === "vector" && data[i].config.styleData) {
				h[++idx] = htmlEncode(", styled by " + data[i].config.styleData);
			}
			h[++idx] = '</td>';

			// actions
			h[++idx] = '<td>';

			h[++idx] = '<button type="button" data-idx="';
			h[++idx] = i;
			h[++idx] = '" class="btn btn-info mx-2 btn-sm edit_map warning">';
			h[++idx] = '<i class="far fa-edit"></i></button>';

			h[++idx] = '<button type="button" data-idx="';
			h[++idx] = i;
			h[++idx] = '" class="btn btn-danger mx-2 btn-sm rm_map danger">';
			h[++idx] = '<i class="fas fa-trash-alt"></i></button>';

			h[++idx] = '</td>';
			// end actions

			h[++idx] = '</tr>';
		}
		h[++idx] = '</tbody>';

		$selector.empty().append(h.join(''));

		$(".rm_map", $selector).click(function(){
			var idx = $(this).data("idx");
			delete_map(gMaps[idx].id);
		});

		$(".edit_map", $selector).click(function(){
			var idx = $(this).data("idx");
			edit_map(idx);
			window.bsModalShow('#addMapPopup');
		});

	}

	/*
     * Delete a shared map
     */
	function delete_map(id) {

		addHourglass();
		$.ajax({
			type: "DELETE",
			async: false,
			url: "/surveyKPI/shared/maps/" + id,
			success: function(data, status) {
				removeHourglass();
				getMaps();
			},
			error: function(xhr, textStatus, err) {
				removeHourglass();
				if(xhr.readyState == 0 || xhr.status == 0) {
					return;  // Not an error
				} else {
					alert(localise.set["msg_err_del"] + " " + xhr.responseText);	// alerts htmlencode
				}
			}
		});
	}

	/*
     * Show the NFC tags
     */
	function loadedLocationData(tags) {

		gTags = tags;
		gCurrentGroup = refreshLocationGroups(gTags, false, gCurrentGroup);
		refreshLocationView();
	}

	function refreshLocationView() {

		var i,
			survey = globals.model.survey,
			$element,
			h = [],
			idx = -1,
			currentGroup = $('#location_group').val();

		var includeNfc = $('#includeNfc').prop('checked'),
			includeGeo = $('#includeGeo').prop('checked');

		if(gTags) {

			$element = $('#locationList');


			for(i = 0; i < gTags.length; i++){

				if(currentGroup === gTags[i].group) {

					if(includeLocation(includeNfc, includeGeo, gTags[i].uid, gTags[i].lat, gTags[i].lon)) {
						h[++idx] = '<tr>';

						h[++idx] = '<td>';
						h[++idx] = htmlEncode(gTags[i].group);
						h[++idx] = '</td>';

						h[++idx] = '<td>';
						h[++idx] = htmlEncode(gTags[i].uid);
						h[++idx] = '</td>';

						h[++idx] = '<td>';
						h[++idx] = htmlEncode(gTags[i].name);
						h[++idx] = '</td>';

						h[++idx] = '<td>';
						h[++idx] = gTags[i].lat == "0" ? '' : htmlEncode(gTags[i].lat);
						h[++idx] = '</td>';

						h[++idx] = '<td>';
						h[++idx] = gTags[i].lon == "0" ? '' : htmlEncode(gTags[i].lon);
						h[++idx] = '</td>';

						h[++idx] = '</tr>';
					}
				}

			}

			$element.html(h.join(""));
		}
	}

	// -------------------------------------------------------------------------
	// SharePoint list mappings
	// -------------------------------------------------------------------------

	let gSpListMaps = [];
	let gSpListEditId = -1;

	function getSpListMaps() {
		addHourglass();
		$.ajax({
			url: '/surveyKPI/sharepoint/listmaps',
			dataType: 'json',
			cache: false,
			success: function(data) {
				removeHourglass();
				if(handleLogout(data)) {
					gSpListMaps = data;
					updateSpListTable(data);
				}
			},
			error: function(xhr) {
				removeHourglass();
				if(xhr.readyState !== 0 && xhr.status !== 0) {
					console.log("Error getting SharePoint list maps: " + xhr.responseText);
				}
			}
		});
	}

	function updateSpListTable(data) {
		let h = [], idx = -1;
		for(let i = 0; i < data.length; i++) {
			let m = data[i];
			h[++idx] = '<tr>';
			h[++idx] = '<td>' + htmlEncode(m.smap_name) + '</td>';
			h[++idx] = '<td>' + htmlEncode(m.list_title) + '</td>';
			h[++idx] = '<td>' + htmlEncode(String(m.refresh_minutes)) + '</td>';
			h[++idx] = '<td>' + (m.last_sync ? htmlEncode(m.last_sync) : '-') + '</td>';
			h[++idx] = '<td>' + (m.enabled ? '<i class="fas fa-check text-success"></i>' : '') + '</td>';
			h[++idx] = '<td class="text-nowrap">';
			h[++idx] = '<button type="button" data-idx="' + i + '" class="btn btn-info btn-sm mx-1 sp_edit_map"><i class="far fa-edit"></i></button>';
			h[++idx] = '<button type="button" data-idx="' + i + '" class="btn btn-secondary btn-sm mx-1 sp_headers_btn" title="Show fields"><i class="fas fa-list"></i></button>';
			h[++idx] = '<button type="button" data-idx="' + i + '" class="btn btn-primary btn-sm mx-1 sp_sync_map" title="' + localise.set["u_sp_sync_now"] + '"><i class="fas fa-sync-alt"></i></button>';
			h[++idx] = '<button type="button" data-idx="' + i + '" class="btn btn-danger btn-sm mx-1 sp_del_map"><i class="fas fa-trash-alt"></i></button>';
			h[++idx] = '</td>';
			h[++idx] = '</tr>';
		}
		$('#sp_list_body').html(h.join(''));

		$('.sp_edit_map').click(function() {
			edit_sp_list($(this).data('idx'));
			window.bsModalShow('#spListEditPopup');
		});
		$('.sp_sync_map').click(function() {
			sync_sp_list(gSpListMaps[$(this).data('idx')].id);
		});
		$('.sp_del_map').click(function() {
			delete_sp_list(gSpListMaps[$(this).data('idx')].id);
		});
		$('.sp_headers_btn').click(function() {
			show_sp_headers(gSpListMaps[$(this).data('idx')].list_title);
		});
	}

	function show_sp_headers(listTitle) {
		addHourglass();
		$.ajax({
			url: '/surveyKPI/server/sharepoint/lists/' + encodeURIComponent(listTitle) + '/fields',
			dataType: 'json',
			cache: false,
			success: function(data) {
				removeHourglass();
				let h = [], idx = -1;
				(data || []).forEach(function(f) {
					h[++idx] = '<tr><td>' + htmlEncode(f.displayName) + '</td><td><code>' + htmlEncode(f.internalName) + '</code></td></tr>';
				});
				$('#sp_headers_list').html(h.join(''));
				$('#sp_headers_title').text(listTitle);
				window.bsModalShow('#spListHeadersPopup');
			},
			error: function(xhr) {
				removeHourglass();
				console.log("Error loading SharePoint fields: " + xhr.responseText);
			}
		});
	}

	function loadSpListTitles(selectedTitle, callback) {
		$.ajax({
			url: '/surveyKPI/sharepoint/lists',
			type: 'GET',
			dataType: 'json',
			success: function(data) {
				if(handleLogout(data)) {
					let $sel = $('#sp_list_title').empty();
					$sel.append($('<option>').val('').text('-- select --'));
					(data || []).forEach(function(title) {
						$sel.append($('<option>').val(title).text(title));
					});
					if(selectedTitle) $sel.val(selectedTitle);
					if(callback) callback();
				}
			},
			error: function(xhr) {
				if(xhr.readyState !== 0 && xhr.status !== 0 && xhr.status !== 401) {
					console.log("Error loading SharePoint lists: " + xhr.responseText);
				}
				if(callback) callback();
			}
		});
	}

	function edit_sp_list(idx) {
		document.getElementById('spListEditForm').reset();
		let selectedTitle;
		if(typeof idx !== 'undefined') {
			let m = gSpListMaps[idx];
			$('#sp_smap_name').val(m.smap_name);
			$('#sp_refresh_minutes').val(m.refresh_minutes);
			$('#sp_enabled').prop('checked', m.enabled);
			gSpListEditId = m.id;
			selectedTitle = m.list_title;
		} else {
			$('#sp_refresh_minutes').val(60);
			$('#sp_enabled').prop('checked', true);
			gSpListEditId = -1;
		}
		loadSpListTitles(selectedTitle);
	}

	function saveSpList() {
		let m = {
			id: gSpListEditId,
			smap_name: $('#sp_smap_name').val().trim(),
			list_title: $('#sp_list_title').val().trim(),
			refresh_minutes: parseInt($('#sp_refresh_minutes').val(), 10) || 60,
			enabled: $('#sp_enabled').prop('checked')
		};
		if(!m.smap_name || !m.list_title) {
			return;
		}
		if(m.smap_name.includes(' ')) {
			alert('Smap name must not contain spaces');
			return;
		}
		let isNew = gSpListEditId < 0;
		addHourglass();
		$.ajax({
			type: isNew ? 'POST' : 'PUT',
			url: '/surveyKPI/sharepoint/listmaps' + (isNew ? '' : '/' + gSpListEditId),
			contentType: 'application/json',
			data: JSON.stringify(m),
			success: function(data) {
				removeHourglass();
				if(handleLogout(data)) {
					window.bsModalHide('#spListEditPopup');
					getSpListMaps();
				}
			},
			error: function(xhr) {
				removeHourglass();
				alert(localise.set["msg_err_save"] + " " + xhr.responseText);
			}
		});
	}

	function delete_sp_list(id) {
		addHourglass();
		$.ajax({
			type: 'DELETE',
			url: '/surveyKPI/sharepoint/listmaps/' + id,
			success: function() {
				removeHourglass();
				getSpListMaps();
			},
			error: function(xhr) {
				removeHourglass();
				alert(localise.set["msg_err_del"] + " " + xhr.responseText);
			}
		});
	}

	function sync_sp_list(id) {
		$('#sp_sync_msg').hide();
		addHourglass();
		$.ajax({
			type: 'POST',
			url: '/surveyKPI/sharepoint/listmaps/' + id + '/sync',
			success: function(data) {
				removeHourglass();
				var count = '';
				try {
					var result = (typeof data === 'object') ? data : JSON.parse(data);
					count = ' ' + result.count + ' ' + localise.set["c_records"];
				} catch(e) {}
				$('#sp_sync_msg')
					.removeClass('alert-danger').addClass('alert-success')
					.text(localise.set["c_success"] + count)
					.show();
				getSpListMaps();
			},
			error: function(xhr) {
				removeHourglass();
				$('#sp_sync_msg')
					.removeClass('alert-success').addClass('alert-danger')
					.text(xhr.responseText || localise.set["msg_err_sp_sync"])
					.show();
			}
		});
	}

	/*
     * Upload a shared resource file
     */
	function uploadResourceFile() {

		$('.upload_alert').hide();

		if(gIsSurvey) {
			$('#surveyId').val(globals.gCurrentSurvey);
		}

		let f = document.forms.namedItem("resourceUpload");
		let formData = new FormData(f);
		let url;

		let name = $('#itemName').val();

		/*
		 * Validation
		 */
		if(!name || name.trim().length == 0) {		// Name is set
			$('.upload_alert').show().removeClass('alert-success alert-warning').addClass('alert-danger').html(localise.set["msg_val_nm"]);
			$('#submitResourceFile').prop("disabled", false);  // debounce
			return false;
		}

		if(name.indexOf('/') >= 0						// Name includes a slash
				|| name.indexOf('.') >= 0) {			// Name includes a .
			$('.upload_alert').show().removeClass('alert-success alert-warning').addClass('alert-danger').html(localise.set["msg_val_inv_nm"]);
			$('#submitResourceFile').prop("disabled", false);  // debounce
			return false;
		}

		url = '/surveyKPI/upload/media';

		addHourglass();
		$.ajax({
			url: url,
			type: 'POST',
			data: formData,
			dataType: 'json',
			cache: false,
			contentType: false,
			processData:false,
			success: function(data) {
				removeHourglass();
				$('#submitResourceFile').prop("disabled", false);  // debounce
				if(handleLogout(data)) {

					// Check for errors in the form
					if (data && data.status === "error") {
						$('.upload_alert').show().removeClass('alert-success alert-warning').addClass('alert-danger').text(data.message);
					} else {
						var surveyId = 0;
						document.forms.namedItem("resourceUpload").reset();
						if (gIsSurvey) {
							surveyId = globals.gCurrentSurvey;
						}
						getFilesFromServer(surveyId, refreshMediaViewManage, false);
						$('.upload_alert').show().removeClass('alert-danger alert-warning').addClass('alert-success').html(localise.set["t_tl"] + ": " + data.name);
					}
					$('#file').val("");     // Work around ERR_UPLOAD_FILE_CHANGED error
				}

			},
			error: function(xhr, textStatus, err) {
				removeHourglass();
				if(handleLogout(xhr.responseText)) {
					$('#submitResourceFile').prop("disabled", false);  // debounce

					if (xhr.readyState == 0 || xhr.status == 0) {
						return;  // Not an error
					} else {
						$('.upload_alert').show().removeClass('alert-success').addClass('alert-danger').html(localise.set["msg_u_f"] + ": " + htmlEncode(xhr.responseText));
						$('#file').val("");     // Work around ERR_UPLOAD_FILE_CHANGED error
					}
				}
			}
		});
	}
