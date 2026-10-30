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
 * This javascript file handles map initialization and events.
 */

import globals from "globals";
import localise from "localise";
import { addGoogleMapLayers, getGoogleMapApi, getMapboxDefault, getTrailData, htmlEncode } from "common";
import { getEffectiveDateFilter } from "data";
import { addLayer, addSharedMaps, zoomToData } from "./map-functions";
import { regionLabelOptions, regionOptions, selectRegion, showSettings } from "./survey_control";

/*
 * Globals specifically for OpenLayers Use
 */
	
var defaultMapExtent = [-20037508, -20037508, 20037508, 20037508.34];

// OL2 Google layer div is created asynchronously; guard against uninitialized state
if (typeof OpenLayers !== "undefined" && OpenLayers.Layer && OpenLayers.Layer.Google) {
	var _origSetGMapVisibility = OpenLayers.Layer.Google.prototype.setGMapVisibility;
	OpenLayers.Layer.Google.prototype.setGMapVisibility = function(visible) {
		if (!this.div || !this.mapObject) return;
		_origSetGMapVisibility.call(this, visible);
	};
}

$(document).ready(function() {

	$('#featuresMenu').click(function() {
	    //$("#reportItems").dialog("close");
		$("#features").show();
	}); 
});

/**
 * Map Initialization
 */
export function initializeMap(idx){
	
	var $pc, mapOptions,
		isVisible = true,
		map,
		arrayOSM,
		arrayHOT,
		lonlat,
		proj,
		point;
	
	// Make the container visible temporarily in case it has been hidden
	$pc = $('#panel-container');
	if(!$pc.is(':visible')) {
		isVisible = false;
		$pc.show();
	}
	
	// Set options and initialize map
	mapOptions = {
		projection: new OpenLayers.Projection("EPSG:3857"),
		//displayProjection: new OpenLayers.Projection("EPSG:4326"),
		units: "m",
		numZoomLevels: 22,
		maxResolution: 156543.0339,
		maxExtent: new OpenLayers.Bounds(-20037508, -20037508, 20037508, 20037508.34),
		fallThrough: false
	};
	
	map = new OpenLayers.Map("map_panel" + idx, mapOptions);  	
		
	// OSM Tile from mapquest
	arrayOSM = ["//a.tile.openstreetmap.org/${z}/${x}/${y}.png",
                 "//b.tile.openstreetmap.org/${z}/${x}/${y}.png",
                 "//c.tile.openstreetmap.org/${z}/${x}/${y}.png"];
	
	arrayHOT = ["//a.tile.openstreetmap.fr/hot/${z}/${x}/${y}.png",
               "//b.tile.openstreetmap.fr/hot/${z}/${x}/${y}.png",
               "//c.tile.openstreetmap.fr/hot/${z}/${x}/${y}.png"];
	
	  var loadEnd = false;
	  function layerLoadStart(event) {
		  loadEnd = false;
	  }

	  function layerLoadEnd(event) {
		  loadEnd = true;
	  }
	
	// Add layers
	//map.addLayer(new OpenLayers.Layer.OSM("OSM", arrayOSM,{numZoomLevels: 20}));
	map.addLayer(new OpenLayers.Layer.OSM("OSM", arrayOSM, {eventListeners: { "loadstart": layerLoadStart,"loadend": layerLoadEnd}, tileOptions: {crossOriginKeyword: null}}));
	map.addLayer(new OpenLayers.Layer.OSM("HOT", arrayHOT, {eventListeners: { "loadstart": layerLoadStart,"loadend": layerLoadEnd}, tileOptions: {crossOriginKeyword: null}}));
	
	if(typeof google != 'undefined' && typeof google.maps != 'undefined') {
		addGoogleMapLayers(map);
	} else {
		getGoogleMapApi(addGoogleMapLayers, map);
	}
	
	// Add additional maps specified in the shared resources page
	var sharedMaps = globals.gSelector.getSharedMaps();
	if(!sharedMaps) {
		getMapboxDefault(getSharedMaps, map);
	} else {
		addSharedMaps(map, sharedMaps)
	}
	
	
	// Map Controls
	map.addControl(new OpenLayers.Control.Zoom());
	map.addControl(new OpenLayers.Control.Scale());
	map.addControl(new OpenLayers.Control.LayerSwitcher({div: document.getElementById("mLayers" + idx)}));			
	
	// Add a zoom to data button
	$('#mLayers' + idx).append('<button type="button" value="' + idx + '" id="zoom_to_data' + idx + '">' +
		localise.set["c_zoom_data"] +
	    '</button>');
	$('#zoom_to_data' + idx).click(function() {
		zoomToData(globals.gSelector.getMap($(this).val()));
	});

	if (!map.getCenter()) {
		map.zoomToExtent(new OpenLayers.Bounds(defaultMapExtent[0],defaultMapExtent[1],defaultMapExtent[2],defaultMapExtent[3]));
	}
	
	//Replot on resize events
	$('#map_panel' + idx).bind('resized', function() {
		updateMapSize(idx);
	});
	
	// Store the map in the global store
	globals.gSelector.setMap(idx, map);
	
	// Hide the container if it wasn't originally visible
	if(!isVisible) {
		$pc.hide();
	}
	
}

/*
 * Get the shared maps from the server
 */
function getSharedMaps(map) {
	
	var url = '/surveyKPI/shared/maps';
	$.ajax({
		url: url,
		dataType: 'json',
		cache: false,
		success: function(data) {
			globals.gSelector.setSharedMaps(data);
			addSharedMaps(map, data);
		},
		error: function(xhr, textStatus, err) {
			if(xhr.readyState == 0 || xhr.status == 0) {
	              return;  // Not an error
			} else {
				alert("Error: Failed to get list of shared maps: " + err);
			}
		}
	});		

}

/*
 * Update the map size after a resize event
 */
function updateMapSize(idx) {
	// Delay until any CSS width/height transition on the map container has completed
	setTimeout(function() {
		var map = globals.gSelector.getMap(idx);
		if (map) {
			map.updateSize();
		}
	}, 250);
}

// Zoom to maximum extent
function zoomToMax(idx) {
	var map = globals.gSelector.getMap(idx);
	map.zoomToMaxExtent();
}


/*
 * Add a map panel
 */
export function setMap(view, secondaryLayer) {

	
	var i, j,
		views = globals.gSelector.getViews(),
		map = globals.gSelector.getMap(view.pId),
		$dataButtons=$('#mDataOptions' + view.pId),
		$btn,
		selectedButton = -1;
	
	// Add the layer(s) for the selected panel
	if(!secondaryLayer) {

		if(view.results) {
			console.log("setMap: view.pId=" + view.pId + " results length=" + view.results.length + " map=" + (map ? "ok" : "NULL"));
			for(i = 0; i < view.results.length; i++) {
				addLayer(view.results[i], view.pId, view.pId, view, view.title + i + " " + view.pId, map);
			}
		} else {
			console.log("setMap: view " + view.title + " has no results");
		}
		if(view.subject_type === "user") {
			addUserTrail(view);
		}
	}
	
	// Add the layer for any other panels that are displayed on this panel
	if(secondaryLayer) {
		for(i = 0; i < views.length; i++) {

			if(views[i].results) {
				if(view.id !== views[i].id && views[i].state != "deleted"  && views[i].layerId === view.id) {
					addSettingsButton(views[i].title, views[i].pId, view.pId);

					for(j = 0; j < views[i].results.length; j++) {
						addLayer(views[i].results[j], view.pId, views[i].pId, view, views[i].title + j + " " + views[i].pId, map);
					}
				}
			} 
		}
		$('.layerSettings').off().click(function() {	// display the settings dialog
			showSettings($(this));
		});
	}
	
	if(typeof view.bounds != "undefined") {
		map.zoomToExtent(view.bounds);
	}
}

/*
 * Add the trail of the user whose activity is shown on this map
 * The service returns points in EPSG:3857, the same projection as the map
 */
function addUserTrail(view) {
	var df = getEffectiveDateFilter(view, 1),
		start = 0,
		end = moment().add(1, 'days').valueOf();	// The service needs an end date, without one it returns nothing

	if(df.dateRange) {
		start = moment().subtract(1, {"1d": "days", "1w": "weeks", "1m": "months"}[df.dateRange]).valueOf();
	} else {
		if(df.fromDate) {
			start = moment(df.fromDate, "YYYY-MM-DD").valueOf();
		}
		if(df.toDate) {
			end = moment(df.toDate, "YYYY-MM-DD").add(1, 'days').valueOf();	// The to date is inclusive
		}
	}

	getTrailData(globals.gCurrentProject, view.uId, start, end, function(data) {
		var map = globals.gSelector.getMap(view.pId),
			name = localise.set["a_trail"] || "Trail",
			lines = [],
			layer,
			i, j, points;

		if(!map) {
			return;
		}
		layer = map.getLayersBy("trailOf", view.pId);
		for(i = 0; i < layer.length; i++) {
			map.removeLayer(layer[i]);
		}

		for(i = 0; i < data.features.length; i++) {
			points = [];
			for(j = 0; j < data.features[i].points.length; j++) {
				points.push(new OpenLayers.Geometry.Point(data.features[i].points[j].coordinates[0],
					data.features[i].points[j].coordinates[1]));
			}
			if(points.length > 1) {
				lines.push(new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(points)));
			}
		}
		if(lines.length === 0) {
			return;
		}

		layer = new OpenLayers.Layer.Vector(name, {
			style: {strokeColor: "blue", strokeWidth: 3, strokeOpacity: 0.6}
		});
		layer.trailOf = view.pId;
		map.addLayer(layer);
		layer.addFeatures(lines);

		if(view.bounds) {
			view.bounds.extend(layer.getDataExtent());
			map.zoomToExtent(view.bounds);
		}
	}, globals.gTimezone);
}

/*
 * Add a button to access the settings of a secondary layer
 */
function addSettingsButton(title, pIdSecondary, pIdPrimary) {
	var $settingsLayer = $('#mLayerSettings' + pIdPrimary),
		$existingButton = $('button[value="' + pIdSecondary + '"]', $settingsLayer );
	
	if($existingButton.length === 0) { 
		$settingsLayer.append('<button class="layerSettings" value="' + pIdSecondary + '">' + htmlEncode(title) + '</button>');
	}
}

/*
 * Controls in a map panel's sidebar to group the map by region and to create and delete the
 * hexagonal grids of the panel's survey bundle.  A grid covers the area of the map that is showing
 * when it is created.  Changing the group saves the panel with savePanel.
 */
export function addGridControls(idx, savePanel) {

	var views = globals.gSelector.getViews() || [],
		view,
		$grids = $('#mGrids' + idx),
		i;

	for(i = 0; i < views.length; i++) {
		if(views[i].pId == idx) {
			view = views[i];
		}
	}
	if(!view || view.subject_type !== "survey" || !(view.sId > 0) || !(globals.gIsAnalyst || globals.gIsAdministrator)) {
		$grids.prev('.grid_heading').hide();
		$grids.hide();
		return;
	}

	$grids.html('<div class="region_group mb-3">' +
			'<label class="small">' + htmlEncode(localise.set["a_gb"]) + '</label>' +
			'<select class="form-select form-select-sm region_select"></select>' +
			'<div class="region_label_wrap mt-1" style="display:none;">' +
				'<label class="small">' + htmlEncode(localise.set["a_region_label"]) + '</label>' +
				'<select class="form-select form-select-sm region_label_select"></select>' +
			'</div>' +
		'</div>' +
		'<p class="small fw-bold mb-1">' + htmlEncode(localise.set["a_hex_grids"]) + '</p>' +
		'<div class="grid_list mb-2"></div>' +
		'<p class="small">' + htmlEncode(localise.set["a_grid_new"]) + '</p>' +
		'<input type="text" class="form-control form-control-sm mb-1 grid_name" placeholder="' + htmlEncode(localise.set["c_name"]) + '">' +
		'<label class="small">' + htmlEncode(localise.set["a_cell_size"]) + '</label>' +
		'<input type="number" class="form-control form-control-sm mb-1 grid_size" min="10" value="500">' +
		'<button type="button" class="btn btn-sm btn-primary grid_create">' + htmlEncode(localise.set["c_create"]) + '</button>' +
		'<p class="small grid_msg mt-1"></p>');

	// Grouping by region needs a question whose answers are coloured
	if(!view.qId || view.qId == -1) {
		$grids.find('.region_group').hide();
	}

	refreshGridList(view, $grids, savePanel);

	$grids.find('.region_select').on('change', function() {
		var region = $(this).val();
		if(region.indexOf("shape:") === 0) {
			showRegionLabels(view, $grids, "");
		} else {
			$grids.find('.region_label_wrap').hide();
		}
		saveRegion(view, region, savePanel);
	});
	$grids.find('.region_label_select').on('change', function() {
		saveRegion(view, $grids.find('.region_select').val() + ":" + $(this).val(), savePanel);
	});

	$grids.find('.grid_create').on('click', function() {
		var map = globals.gSelector.getMap(idx),
			bounds = map.getExtent().clone().transform(new OpenLayers.Projection("EPSG:900913"), new OpenLayers.Projection("EPSG:4326")),
			grid = {
				sId: view.sId,
				name: $grids.find('.grid_name').val(),
				cellSize: parseInt($grids.find('.grid_size').val(), 10),
				extent: [bounds.left, bounds.bottom, bounds.right, bounds.top]
			};

		$grids.find('.grid_msg').text("");
		$.ajax({
			type: "POST",
			url: "/surveyKPI/regions",
			cache: false,
			data: { grid: JSON.stringify(grid) },
			success: function() {
				$grids.find('.grid_name').val("");
				$grids.find('.grid_msg').text(localise.set["a_grid_made"]);
				refreshGridList(view, $grids, savePanel);
			},
			error: function(xhr) {
				if(xhr.readyState == 0 || xhr.status == 0) {
					return;  // Not an error
				}
				$grids.find('.grid_msg').text(localise.set["c_error"] + ": " + (xhr.responseText || xhr.status));
			}
		});
	});
}

/*
 * Save the panel grouped by a region, the panel is redrawn when it has been saved
 */
function saveRegion(view, region, savePanel) {
	view.region = region;
	view.groupQuestionId = -1;
	savePanel(view);
}

/*
 * Show the questions that can label the polygons of a survey
 */
function showRegionLabels(view, $grids, label) {
	var questions = globals.gSelector.getSurveyQuestions(view.sId, view.lang),
		$label = $grids.find('.region_label_select');

	function show(list) {
		$label.empty().append(regionLabelOptions(list));
		$label.val(label || "");
		$grids.find('.region_label_wrap').show();
	}

	if(questions) {
		show(questions);
	} else {
		$.ajax({
			url: "/surveyKPI/questionList/" + view.sId + "/" + encodeURIComponent(view.lang) + "?exc_read_only=false",
			dataType: 'json',
			cache: false,
			success: show
		});
	}
}

function refreshGridList(view, $grids, savePanel) {

	$.ajax({
		url: "/surveyKPI/regions?sId=" + view.sId,
		dataType: 'json',
		cache: false,
		success: function(data) {
			var $list = $grids.find('.grid_list').empty(),
				$select = $grids.find('.region_select'),
				region = view.region || "";

			$select.empty().append(regionOptions(data));
			selectRegion($select, region);
			if(region.indexOf("shape:") === 0 && $select.val() !== "-1") {
				showRegionLabels(view, $grids, region.split(":")[2]);
			} else {
				$grids.find('.region_label_wrap').hide();
			}

			$.each(data.grids || [], function(j, grid) {
				var $row = $('<div class="d-flex justify-content-between align-items-center small mb-1"></div>');
				$row.append($('<span></span>').text(grid.name + " (" + grid.cell_size + "m)"));
				$row.append($('<button type="button" class="btn btn-sm btn-outline-danger"></button>')
					.text(localise.set["c_del"])
					.on('click', function() {
						var $btn = $(this);
						if(!$btn.data("confirm")) {		// Second click deletes, avoids a confirm dialog
							$btn.data("confirm", true).text(localise.set["c_del"] + "?");
							return;
						}
						$.ajax({
							type: "DELETE",
							url: "/surveyKPI/regions/" + grid.id + "?sId=" + view.sId,
							cache: false,
							success: function() {
								if(view.region === "grid:" + grid.id) {
									saveRegion(view, "-1", savePanel);		// The panel was grouped by the deleted grid
								} else {
									refreshGridList(view, $grids, savePanel);
								}
							},
							error: function(xhr) {
								$grids.find('.grid_msg').text(localise.set["c_error"] + ": " + (xhr.responseText || xhr.status));
							}
						});
					}));
				$list.append($row);
			});
		}
	});
}
