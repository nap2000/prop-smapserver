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

/*
 * Globals specifically for OpenLayers Use
 */
	
var defaultMapExtent = [-20037508, -20037508, 20037508, 20037508.34];

$(document).ready(function() {

	$('#featuresMenu').click(function() {
	    //$("#reportItems").dialog("close");
		$("#features").show();
	}); 
});

/**
 * Map Initialization
 */
function initializeMap(idx){
	
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
	arrayOSM = ["https://otile1-s.mqcdn.com/tiles/1.0.0/osm/${z}/${x}/${y}.jpg",
                 "https://otile2-s.mqcdn.com/tiles/1.0.0/osm/${z}/${x}/${y}.jpg",
                 "https://otile3-s.mqcdn.com/tiles/1.0.0/osm/${z}/${x}/${y}.jpg",
                 "https://otile4-s.mqcdn.com/tiles/1.0.0/osm/${z}/${x}/${y}.jpg"];
	
	arrayHOT = ["http://a.tile.openstreetmap.fr/hot/${z}/${x}/${y}.png",
               "http://b.tile.openstreetmap.fr/hot/${z}/${x}/${y}.png",
               "http://c.tile.openstreetmap.fr/hot/${z}/${x}/${y}.png"];
	
	  loadEnd = false;
	  function layerLoadStart(event) {
		  loadEnd = false;
	  }

	  function layerLoadEnd(event) {
		  loadEnd = true;
	  }
	
	// Add layers
	//map.addLayer(new OpenLayers.Layer.OSM("OSM", arrayOSM,{numZoomLevels: 20}));
	map.addLayer(new OpenLayers.Layer.OSM());
	map.addLayer(new OpenLayers.Layer.OSM("HOT", arrayHOT, {eventListeners: { "loadstart": layerLoadStart,"loadend": layerLoadEnd}, tileOptions: {crossOriginKeyword: null}}));
	
	if(typeof google != 'undefined' && typeof google.maps != 'undefined') {
		addGoogleMapLayers(map);
	} else {
		getGoogleMapApi(addGoogleMapLayers, map);
	}
	
	// Add additional maps specified in the shared resources page
	var sharedMaps = globals.gSelector.getSharedMaps();
	if(!sharedMaps) {
		getServerSettings(getSharedMaps, map);
	} else {
		addSharedMaps(map, sharedMaps)
	}
	
	
	// Map Controls
	map.addControl(new OpenLayers.Control.Zoom());
	map.addControl(new OpenLayers.Control.Scale());
	map.addControl(new OpenLayers.Control.LayerSwitcher({div: document.getElementById("mLayers" + idx)}));			
	
	// Add a zoom to data button
	$('#mLayers' + idx).append('<button type="button" value="' + idx + '" id="zoom_to_data' + idx + '">Zoom to data</button>');
	$('#zoom_to_data' + idx).button().click(function() {
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
	var map = globals.gSelector.getMap(idx);
	map.updateSize();
}

// Zoom to maximum extent
function zoomToMax(idx) {
	var map = globals.gSelector.getMap(idx);
	map.zoomToMaxExtent();
}


/*
 * Add a map panel
 */
function setMap(view, secondaryLayer) {
	
	var i, j,
		views = globals.gSelector.getViews(),
		map = globals.gSelector.getMap(view.pId),
		$dataButtons=$('#mDataOptions' + view.pId),
		$btn,
		selectedButton = -1;
	
	
	// If this is a "refresh" then clear any existing buttons
	// But first get the currently selected button so it can be preserved	TODO - Tricky with multiple layers each of which can have a selected button
	//$btn = $dataButtons.find('label.ui-state-active').next();
	//if($btn.length) {
	//	selectedButton=$btn.val();
	//}
	
	//$dataButtons.empty();
	
	// Add the layer(s) for the selected panel
	if(!secondaryLayer) {
		
		if(view.results) {
			for(i = 0; i < view.results.length; i++) {
				addLayer(view.results[i], view.pId, view.pId, view, view.title + i + " " + view.pId, map);
			}
		} else {
			console.log("Selected View: "+ view.title + " does not have results");
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
		$('.layerSettings').button().off().click(function() {	// display the settings dialog
			showSettings($(this));
		});
	}
	
	if(typeof view.bounds != "undefined") {
		map.zoomToExtent(view.bounds);
	}
}


/*
 * Add a button to access the settings of a secondary layer
 */
function addSettingsButton(title, pIdSecondary, pIdPrimary) {
	var $settingsLayer = $('#mLayerSettings' + pIdPrimary),
		$existingButton = $('button[value="' + pIdSecondary + '"]', $settingsLayer );
	
	if($existingButton.length === 0) { 
		$settingsLayer.append('<button class="layerSettings" value="' + pIdSecondary + '">' + title + '</button>');
	}
}



