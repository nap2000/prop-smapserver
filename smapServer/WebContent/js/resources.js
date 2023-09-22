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
var gUserLocale = navigator.language;
if (Modernizr.localstorage) {
	gUserLocale = localStorage.getItem('user_locale') || navigator.language;
}

requirejs.config({
	baseUrl: '/js/libs',
	waitSeconds: 0,
	locale: gUserLocale,
	paths: {
		app: '../app',
		lang_location: '..',
		moment: '../../../../js/libs/moment-with-locales.2.24.0',
	},
	shim: {
		'app/common': ['jquery']
	}
});

require([
	'jquery',
	'app/common',
	'app/globals',
	'app/localise',
	'bootstrapfileinput',
	'moment'
], function($, common, globals, localise, bsfi, moment) {

	let gMaps,
		gMapVersion,
		gMapId,
		gTags,          // NFC tags
		gCurrentGroup,
		gIsSurvey;

	$(document).ready(function() {

		window.moment = moment;		// Make moment global for use by common.js

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
		localise.setlang();		// Localise HTML
		$('#map_name').attr("placeholder", localise.set["sr_m_ph"]);
		$('#map_description').attr("placeholder", localise.set["sr_m_d"]);
		$('#mapid').attr("placeholder", localise.set["sr_m_mb"]);

		// Get the user details
		globals.gIsAdministrator = false;
		globals.gCurrentSurvey = undefined;
		getLoggedInUser(gotUser, false, false, undefined, false, false);
		getLocations(loadedLocationData);

		// Set up the tabs
		$('#csvTab a').click(function (e) {
			e.preventDefault();
			$(this).tab('show');

			$('.resourcePanel').hide();
			$('#csvPanel').show();

			$('.upload_alert').removeClass('alert-danger').addClass('alert-success').html("");
		});
		$('#mediaTab a').click(function (e) {
			e.preventDefault();
			$(this).tab('show');

			$('.resourcePanel').hide();
			$('#mediaPanel').show();

			$('.upload_alert').removeClass('alert-danger').addClass('alert-success').html("");
		});
		$('#mapTab a').click(function (e) {
			e.preventDefault();
			$(this).tab('show');

			$('.resourcePanel').hide();
			$('#mapPanel').show();
		});
		$('#locationTab a').click(function (e) {
			e.preventDefault();
			$(this).tab('show');

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
			$('#fileAddPopup').modal('show');
		});

		// Open the dialog to select a new survey for upload
		$('#addMedia').click( function(e) {
			$('#uploadAction').val("add");
			$('#resourceUpload')[0].reset();
			$('.notreplace, #fileMedia').show();
			$('#fileCsv').hide();
			$('.upload_alert').removeClass('alert-danger').addClass('alert-success').html("");
			$('#fileAddPopup').modal('show');
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
			$('#fileAddLocations').modal('show');
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
			$('#addMapPopup').modal("show");
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
         * Set up location tabs
         */
		$('#addNfc').click(function(){
			$('#addMapPopup').modal("show");
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
			$('#mapTab, #locationTab').hide();
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
			contentType: "application/json",
			data: { map: mapString },
			success: function(data, status) {
				removeHourglass();
				getMaps();
				$('#addMapPopup').modal("hide");
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
			$('#addMapPopup').modal("show");
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
		if(!name || name.trim().length == 0) {		// Name ia set
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

				// Check for errors in the form
				if(data && data.status === "error") {
					$('.upload_alert').show().removeClass('alert-success alert-warning').addClass('alert-danger').text(data.message);
				} else {
					var surveyId = 0;
					document.forms.namedItem("resourceUpload").reset();
					if(gIsSurvey) {
						surveyId = globals.gCurrentSurvey;
					}
					getFilesFromServer(surveyId, refreshMediaViewManage, false);
					$('.upload_alert').show().removeClass('alert-danger alert-warning').addClass('alert-success').html(localise.set["t_tl"] + ": " + data.name);
				}
				$('#file').val("");     // Work around ERR_UPLOAD_FILE_CHANGED error

			},
			error: function(xhr, textStatus, err) {
				removeHourglass();
				$('#submitResourceFile').prop("disabled", false);  // debounce

				if(xhr.readyState == 0 || xhr.status == 0) {
					return;  // Not an error
				} else {
					$('.upload_alert').show().removeClass('alert-success').addClass('alert-danger').html(localise.set["msg_u_f"] + ": " + htmlEncode(xhr.responseText));
					$('#file').val("");     // Work around ERR_UPLOAD_FILE_CHANGED error
				}
			}
		});
	}

});

