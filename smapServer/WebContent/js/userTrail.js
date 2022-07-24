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
 * Entry point for user trail page
 */

var gUserLocale = navigator.language;
if (Modernizr.localstorage) {
	gUserLocale = localStorage.getItem('user_locale') || navigator.language;
}

requirejs.config({
	baseUrl: '/js/libs',
	locale: gUserLocale,
	waitSeconds: 0,
	paths: {
		app: '../app',
		i18n: 'i18n',
		modernizr: 'modernizr',
		lang_location: '..'
	},
	shim: {
		'app/common': ['jquery'],
		'bootstrap-datetimepicker.min': ['moment']
	}
});


require([
	'jquery',
	'app/common',
	'app/localise',
	'app/globals',
	'moment',
	'bootstrap-datetimepicker.min'

], function($, common, localise, globals, moment) {

	var gOverlayHasFeature;
	var gTrailData;
	var gSurveys = [];
	var gTrailSource;
	var gSurveyLocations;
	var gSurveyLocationLayer;
	var gSurveyLocationSource;
	var gTrailLayer;
	var gHighlight;
	var featureOverlay;
	var overlaySource;
	var gMap;
	var point = null;
	var line = null;
	var gAllUsers = false;
	var gTime = {
		start: Infinity,
		stop: -Infinity,
		duration: 0
	};

// Style for survey locations
	var iconStyle = new ol.style.Style({
		image: new ol.style.Icon(/** @type {olx.style.IconOptions} */ ({
			anchor: [0.5, 0.5],
			anchorXUnits: 'fraction',
			anchorYUnits: 'fraction',
			height: 36,
			width: 36,
			opacity: 0.75,
			src: 'images/survey.png'
		}))
	});

// Style for selected points
	var imageStyle = new ol.style.Circle({
		radius: 5,
		fill: null,
		stroke: new ol.style.Stroke({
			color: 'rgba(255,0,0,0.9)',
			width: 1
		})
	});

// Style for line to selected points
	var strokeStyle = new ol.style.Stroke({
		color: 'rgba(255,0,0,0.9)',
		width: 3
	});

//Style for user trail
	var trailStyle = new ol.style.Style({
		stroke: new ol.style.Stroke({
			color: 'rgba(20,20,237,0.8)',
			width: 3
		})
	});

	$(document).ready(function() {

		setCustomUserTrail();			// Apply custom javascript
		setTheme();
		setupUserProfile(true);
		localise.setlang();
		$('.date').prop("title", localise.set["c_lt"]);

		$('#max_point_separation').val(200);		// Default value

		// Set up the start and end dates with date picker
		$('#startDate').datetimepicker({
			locale: gUserLocale || 'en',
			useCurrent: false
		}).data("DateTimePicker").date(moment());

		$('#endDate').datetimepicker({
			locale: gUserLocale || 'en',
			useCurrent: false
		}).data("DateTimePicker").date(moment());

		// Set base layers
		var osm = new ol.layer.Tile({source: new ol.source.OSM()});
		//var osmVisible = new ol.dom.Input(document.getElementById('osmVisible'));
		//osmVisible.bindTo('checked', base, 'osmVisible');

		// Source and Layer objects for gps points
		gTrailSource = new ol.source.Vector({
		});

		gTrailLayer = new ol.layer.Vector ({
			source: gTrailSource
		});

		// Source and Layer objects for survey locations
		gSurveyLocationSource = new ol.source.Vector({
			features: gSurveys
		});

		gSurveyLocationLayer = new ol.layer.Vector ({
			source: gSurveyLocationSource,
			style: iconStyle
		});

		getLoggedInUser(getUserList, false, true, undefined, false, true);

		// Add responses to changing parameters
		$('#project_name').change(function() {
			globals.gCurrentProject = $('#project_name option:selected').val();

			saveCurrentProject(globals.gCurrentProject,
				globals.gCurrentSurvey,
				globals.gCurrentTaskGroup);

			getUserList();
		});

		$('#user_list,#max_point_separation').change(function() {
			getData();
		});

		// Add responses to changing parameters
		$('#startDate,#endDate').on("dp.change", function(e) {
			getData();
		});

		$('#exportMenu').click(function(e) {
			e.preventDefault();
			$('#all_users').prop('checked', gAllUsers);
			$('#trail_export_popup').modal("show");
		});

		$('#trail_export_save').click(function(e) {
			var startDate = $('#startDate').data("DateTimePicker").date().startOf('day'),
				endDate = $('#endDate').data("DateTimePicker").date().endOf('day');	// Get end of displayed date

			var startUtc = moment.utc(startDate),
				endUtc = moment.utc(endDate);

			/*
			 * Validate
			 */
			var mps = $('#max_point_separation').val();
			if(!mps || mps < 0) {
				alert(localise.set["ut_mps_err"]);
				return false;
			}
			gAllUsers = $('#all_users').prop('checked');

			var reportObj = {
				report_name: 'locations_' + (gAllUsers ? $('#project_name option:selected').text() : $('#user_list option:selected').text()),
				report_type: $('#report_type option:selected').val(),
				pId: (gAllUsers ? globals.gCurrentProject : 0),
				params: {
					userId: (gAllUsers ? 0 : $('#user_list option:selected').val()),
					startDate: startUtc.valueOf(),
					endDate: endUtc.valueOf(),
					mps: mps
				}
			}

			var tzString = globals.gTimezone ? "?tz=" + encodeURIComponent(globals.gTimezone) : "";

			addHourglass();
			$.ajax({
				type: "POST",
				cache: false,
				dataType: 'text',
				contentType: "application/json",
				url: "/surveyKPI/background_report" + tzString,
				data: { report: JSON.stringify(reportObj) },
				success: function(data, status) {
					removeHourglass();
					$('#info').html(localise.set["msg_ds_s_r"]);
					setTimeout(function () {
						$('#info').html("");
					},2000);
				}, error: function(xhr, textStatus, err) {
					removeHourglass();
					if(xhr.readyState == 0 || xhr.status == 0) {
						return;  // Not an error
					} else {
						$('#info').html(localise.set["msg_err_save"] + xhr.responseText);
					}

				}
			});
		});

		// Add the map
		gMap = new ol.Map({
			target: 'map',
			layers: [osm, gTrailLayer, gSurveyLocationLayer],
			view: new ol.View(
				{
					center: ol.proj.transform([0.0, 0.0], 'EPSG:4326', 'EPSG:3857'),
					zoom: 1
				}
			)
		});

		// Overlay to highlight time of slider
		overlaySource = new ol.source.Vector({});
		featureOverlay = new ol.layer.Vector({
			map: gMap,
			source: overlaySource,
			style: new ol.style.Style({
				image: new ol.style.Circle({
					radius: 5,
					fill: new ol.style.Fill({
						color: 'rgba(255,0,0,0.9)'
					}),
					stroke: null
				})
			})
		});

		$(gMap.getViewport()).on('click', function(evt) {

			var coordinate = gMap.getEventCoordinate(evt.originalEvent);
			displaySnap(coordinate);

		});

		gMap.on('postcompose', function(evt) {
			var vectorContext = evt.vectorContext;
			if (point !== null) {
				vectorContext.setStyle(imageStyle);
				vectorContext.drawPointGeometry(point);
			}
			if (line !== null) {
				vectorContext.setFillStrokeStyle(null, strokeStyle);
				vectorContext.drawLineStringGeometry(line);
			}
		});

		// Enable tooltips
		$('[data-toggle="tooltip"]').tooltip();

		// Enable the time slider
		$('#time').on('input', function(event) {

			point = null;		// Clear any selected points
			line = null;

			var value = parseInt($(this).val(), 10) / 100;
			var m = gTime.start + (gTime.duration * value);
			gTrailSource.forEachFeature(function(feature) {
				var geometry = /** @type {ol.geom.LineString} */ (feature.getGeometry());
				var coordinate = geometry.getCoordinateAtM(m, false);
				if(coordinate != null) {

					if (gHighlight === undefined) {
						gHighlight = new ol.Feature(new ol.geom.Point(coordinate));
					} else {
						gHighlight.getGeometry().setCoordinates(coordinate);
					}
					if (!gOverlayHasFeature) {
						featureOverlay.getSource().addFeature(gHighlight);
						gOverlayHasFeature = true;
					}
				}
			});
			gMap.render();

			var date = new Date(m);	// Using Measure coordinate to store unix date
			document.getElementById('info').innerHTML = date;

		});

		$('#refreshMenu').on('click', function(e) {
			e.preventDefault();
			getData();
		});

	});

	function getUserList() {

		addHourglass();
		$.ajax({
			url: "/surveyKPI/userList/" + globals.gCurrentProject,
			cache: false,
			dataType: 'json',
			success: function(data) {
				removeHourglass();
				updateUserList(data);
				getData();

			},
			error: function(xhr, textStatus, err) {
				removeHourglass();
				if(xhr.readyState == 0 || xhr.status == 0) {
					return;  // Not an error
				} else {
					alert("Error: Failed to get user list: " + err);
				}
			}
		});
	}

	function updateUserList(users, addAll) {

		var $userSelect = $('.user_list'),
			i,
			h = [],
			idx = -1,
			updateCurrentProject;

		if(addAll) {
			h[++idx] = '<option value="0">All</option>';
			updateCurrentProject = false;
		}
		for(i = 0; i < users.length; i++) {
			h[++idx] = '<option value="';
			h[++idx] = users[i].id;
			h[++idx] = '">';
			h[++idx] = users[i].name;
			h[++idx] = '</option>';
		}
		$userSelect.empty().append(h.join(''));
	}

	function getData() {

		var startDate = $('#startDate').data("DateTimePicker").date().startOf('day'),
			endDate = $('#endDate').data("DateTimePicker").date().endOf('day'),	// Get end of displayed date
			mps = $('#max_point_separation').val();

		var startUtc = moment.utc(startDate),
			endUtc = moment.utc(endDate);

		getTrailData(globals.gCurrentProject, $('#user_list option:selected').val(), startUtc.valueOf(), endUtc.valueOf(), showUserTrail, globals.gTimezone, mps);


	}


	function showUserTrail(data) {
		var i,
			j,
			k = 0,
			lineFeature,
			coords = [];

		gTrailData = data;
		gTrailSource.clear();

		// Add points
		for(i = 0; i < gTrailData.features.length; i++) {
			var feature = gTrailData.features[i];
			coords = [];
			for (j = 0; j < feature.points.length; j++) {
				feature.points[j].coordinates.push(feature.points[j].rawTime);	// Add attributes to Measure coordinate
				coords.push(feature.points[j].coordinates);
			}
			if (coords.length > 0) {
				var geometry = new ol.geom.LineString(coords, 'XYM');
				var lineFeature = new ol.Feature({
					geometry: geometry
				});
				lineFeature.setStyle(trailStyle);
				gTrailSource.addFeature(lineFeature);

				gTime.start = Math.min(gTime.start, geometry.getFirstCoordinate()[2]);
				gTime.stop = Math.max(gTime.stop, geometry.getLastCoordinate()[2]);
				gTime.duration = gTime.stop - gTime.start;
			}


		}

		gMap.getView().fit(gTrailSource.getExtent(), gMap.getSize());

		gMap.render();
	}

// Show data for closes features
	var displaySnap = function(coordinate) {

		// Clear the slider
		var overlays = featureOverlay.getSource().getFeatures(),
			i;
		if(overlays) {
			for (i = 0; i < overlays.length; i++) {
				featureOverlay.getSource().removeFeature(overlays[i]);
			}
		}
		gOverlayHasFeature = false;

		var closestFeature = gTrailSource.getClosestFeatureToCoordinate(coordinate);
		var info = document.getElementById('info');

		if (closestFeature === null) {
			point = null;
			line = null;
			info.innerHTML = '&nbsp;';
		} else {
			var geometry = closestFeature.getGeometry();
			var closestPoint = geometry.getClosestPoint(coordinate);
			if (point === null) {
				point = new ol.geom.Point(closestPoint);
			} else {
				point.setCoordinates(closestPoint);
			}

			var date = new Date(closestPoint[2]);	// Using Z coordinate to store unix date
			info.innerHTML = date;
			var coordinates = [coordinate, [closestPoint[0], closestPoint[1]]];
			if (line === null) {
				line = new ol.geom.LineString(coordinates);
			} else {
				line.setCoordinates(coordinates);
			}
		}
		gMap.render();
	};
});


