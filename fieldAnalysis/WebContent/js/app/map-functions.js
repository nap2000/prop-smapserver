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
import { addAnchors, getDisplayDescription } from "commonReportFunctions";
import { htmlEncode, translateKey, translateKeyValue } from "common";

var gMapData = {};

var gCurrentBoundsLayer,
	gSelectedBounds;

export function addLayer(data, pId1, pId2, view, title, map) {
	"use strict";
	
	var itemIdx,
		groups = data.features,
		fn = data.fn,
		question = data.question,
		currentDisplayDescription,
		displayElement,
		isPeriod = false,
		$timecontrols,
		$span,
		$start,
		h = [],
		idx = -1,
		i = 0,
		firstDate = new Date(),
		md = {
			endIdx: 1,
			span: 1,
			startIdx: -0.5,
			currentIdx: -0.5,
			step: 1,
			startHour: 0
		};
	
	gMapData[pId1] = md;	// Store the global map data for this map
	
	onFeatureUnselect();
	if(typeof question !== "undefined" && question !== "None") {
		setFeatureValue(data, pId1, pId2, view, title, map);	// Set the question level feature values
	}
	
	if(typeof view.bounds === "undefined") {
		clearFeatures(map);	// Clear all of the existing layers
		view.bounds = new OpenLayers.Bounds();
		view.allLayers = [];
	}

	if(typeof data.interval !== "undefined" && data.interval !== "none") {
		isPeriod = true;
	}
	
	/*
	 * If the map is to show icons rather than values then
	 * Set the external graphic style 
	 */
	var externalGraphic = undefined;
	if(fn === "ocha") {
		externalGraphic = {
				path: "/smapIcons/ocha/",
				feature: "result",
				suffix: "_100px.png"
		};
	}
	
	clearFeatures(map, title, view.allLayers);		// Clear this layer if it exists
	loadFeatures(map, title, data, externalGraphic, view.bounds, view.allLayers, isPeriod, md);
	
	if(view.selectResultsControl) {
		map.removeControl(view.selectResultsControl);
	}
	view.selectResultsControl = new OpenLayers.Control.SelectFeature(view.allLayers,
            {onSelect: onFeatureSelectOL, onUnselect: onFeatureUnselect});
	map.addControl(view.selectResultsControl);
	view.selectResultsControl.activate();
	
	/*
	 * Set the period controls (if this is a time series layer)
	 */
	if(isPeriod) {
		md["endIdx"] = data.maxTimeIdx;
		md["period"] = data.interval;
		md["startDate"] = data.start;
		md["startHour"] = 0;
		if(data.interval === "hour" && typeof data.features[0] !== "undefined") {
			var splitArray = data.features[0].properties.period.split(" ");
			if(splitArray.length > 1) {
				md["startHour"] = parseInt(splitArray[1]);
			}
		} 
		$timecontrols = $('#p' + pId1).find('.timecontrols');
		$span = $timecontrols.find('select');
		$start = $timecontrols.find('.starttimer');
		md["$slider"] = $timecontrols.find(".slider-range");
		md["$slideDate1"] = $timecontrols.find(".slide_date1");
		md["$slideDate2"] = $timecontrols.find(".slide_date2");
		
		for(i = 1; i <= data.maxTimeIdx + 1; i++) {
			h[++idx] = '<option value="';
			h[++idx] = i;
			h[++idx] = '">';
			h[++idx] = i;
			h[++idx] = " ";
			h[++idx] = data.interval;
			if(i > 1) {
				h[++idx] = "s";
			}
			h[++idx] = '</option>';
		}

		$span.empty().append(h.join(''));
		$timecontrols.removeClass('d-none').show();
		$span.change(function() {
			md["span"] = parseInt($(this).val());
	 	 	setTimeFilter(md);
	 	 });
		$start.click(function() {
			var mapData = md;
			startAnimation(mapData);
		});

		md["span"] = 1;
 	 	setTimeFilter(md);

 	 	if(md["endIdx"] > 25) {
 	 		md["interval"] = 5000 / md["endIdx"];
 	 	} else {
 	 		md["interval"] = 200;
 	 	}

		// Initialise native range slider
		md["$slider"].attr({ min: 0, max: md["endIdx"] + 1, step: 1 }).val(0);
		md["$slider"].on('input change', function() {
			var startPos = parseInt($(this).val());
			md["startIdx"] = -0.5 + startPos;
			md["currentIdx"] = md["startIdx"];
			md["span"] = parseInt($span.val());
			setTimeFilter(md);
		});
	}
	
	/*
	 * Set the display description
	 */
	if(document.getElementById('p' + pId1)) {
		// If this layer does not have a description then add one
		
		currentDisplayDescription = document.getElementById('p' + pId1).getElementsByClassName('r_description')[0].innerHTML;
		if(typeof currentDisplayDescription === "undefined" || currentDisplayDescription.length === 0) {
			currentDisplayDescription = "";
		} 
		
		displayElement = document.getElementById('p' + pId1).getElementsByClassName('l' + pId2)[0];
		if(typeof displayElement === "undefined") {
			// Add this layers description to the overall description

			var filterDescription = ' (' + localise.set["a_filter"] + ')';
			if(data.totals) {
				filterDescription = filterDescription.replace('%s1', data.totals.returned_count);
				filterDescription = filterDescription.replace('%s2', data.totals.filtered_count);
			} else {
				filterDescription = "";
			}

			currentDisplayDescription += '<span class="l' + pId2 + '"><p>Layer(' + htmlEncode(title) + '): ' +
			htmlEncode(getDisplayDescription(fn, "map", data.survey, data.question, data.group, data.option, data.qtype,
					data.date_question, data.start, data.end, data.interval, data.units, data.filter)) +
					filterDescription +
			"</p></span>";
			document.getElementById('p' + pId1).getElementsByClassName('r_description')[0].innerHTML =
				currentDisplayDescription;
			data.caption = currentDisplayDescription;	// Save caption in data layer in case it is saved as a report	
		} else {
			// Update this layers description
			displayElement.innerHTML = '<p>Layer(' + htmlEncode(title) + '): ' +
			htmlEncode(getDisplayDescription(fn, "map", data.survey, data.question, data.group, data.option, data.qtype,
					data.date_question, data.start, data.end, data.interval, data.units, data.filter)) +
			"</p>";
			data.caption = displayElement.innerHTML;	// Save caption in data layer in case it is saved as a report
		}

	}
	
}

function setFeatureValue(data, pId1, pId2, view, title, map) {
	
	var groups = data.features,
		fn = data.fn,
		cols = data.cols,
		pareto = [],
		grandTotal = [],
		matrix = [],
		$btnSelect,
		$btnLayerSelect,
		i,j,
		btns;
	
	/*
	 * Sort the data by size and create a matrix of the data
	 */
	for(i = 0; i < cols.length; i++) {
		pareto[i] = i;
		grandTotal[i] = 0.0;
		matrix[i] = [];
		for(j = 0; j < groups.length; j++) {
			grandTotal[i] += groups[j].properties[cols[i]];
			if(typeof groups[j].properties.oname !== "undefined" && fn === "ocha") {
				matrix[i][j] =  groups[j].properties.oname;  // Set the option name as the value
			} else {
				matrix[i][j] = groups[j].properties[cols[i]];
			}
		}
	}
	// Disable pareto sorting - button order should not change as new data arrives
	//pareto.sort(function(a,b) {return grandTotal[b] - grandTotal[a];});
	
	/*
	 *  Option buttons are not required if no aggregating function has been applied to the data
	 */
	$btnLayerSelect = $('#mDataOptions' + pId1 + "_" + pId2);
	if(!$btnLayerSelect.length && typeof fn !== "undefined" && fn !== "none" && fn !== "ocha") {
				
		// Add any data series to the options panel
		$btnSelect = $('#mDataOptions' + pId1);
		
		if($btnSelect.length) {
			j = -1;
			btns = [];
	
			$btnSelect.append('<p>Panel: ' + title + ', Question: ' + data.question + 
					', Function: ' + fn + '</p>');
			$btnSelect.append('<div id="mDataOptions' + pId1 + '_' + pId2 +'"></div>');
			
			$btnLayerSelect = $('#mDataOptions' + pId1 + "_" + pId2);
			
			for(i = 0; i < pareto.length; i++) {		// Add in descending order of series total value
				btns[++j] = '<input type="radio" id="radio';
				btns[++j] = pId1 + '_' + pId2 + '_' + i; 
				btns[++j] = '" name="radio' + pId1 + '_' +  pId2;
				btns[++j] = '" value="' + pareto[i] + '"'; 
				if(i == 0) {
					btns[++j] = ' checked="checked"';
				}
				btns[++j] = '/><label for="radio'+ pId1 + '_' + pId2 + '_' + i + '">';
				btns[++j] = cols[pareto[i]];
				btns[++j] = '</label>';
			}
			
			$btnLayerSelect.append(btns.join(''));
			$btnLayerSelect.find('input').change(function() {
				data.optionIdx = $(this).val();
				data.option = cols[data.optionIdx];
				addLayer(data, pId1, pId2, view, title, map);
			});
		}
	} 
	
	// Set the option index to the selected button
	if($btnLayerSelect.length) {
		data.optionIdx = $btnLayerSelect.find('input[type=radio]:checked').val();
		data.option = cols[data.optionIdx];

	} else if(data.optionIdx) {
		// This is probably a report with no ability to select option, in which case leave set to the optionIdx and option specified in the report data
	
	} else {
		data.optionIdx = pareto[0];		// Default to showing the first item 
		data.option = cols[pareto[0]];
	}

	
	// Get the maximum data value and scale according to that (up to a max of 4 levels)
	var max = -9007199254740992;
	var min = 9007199254740992;
	for(var i = 0; i < data.features.length; i++) {
		if(matrix[data.optionIdx][i] > max){
			max = matrix[data.optionIdx][i];
		}
		if(matrix[data.optionIdx][i] < min){
			min = matrix[data.optionIdx][i];
		}
	}
	
	
	for(var i = 0; i < data.features.length; i++) {
		if(max > min) {
			var diff = max - min;
			var val = 4 * (matrix[data.optionIdx][i] - min) / diff;		// Normalise value to 5 levels
		} else if(matrix[data.optionIdx][i] > 0) {
			val = 4;
		} else {
			val = 0;
		}
		data.features[i].properties.value = Math.round(val);
		data.features[i].properties._ftype = "q";		
		data.features[i].properties.aggregation = fn;
		data.features[i].properties.units = data.units;
		data.features[i].properties.question = data.question;
		data.features[i].properties.selected = data.cols[data.optionIdx];
		data.features[i].properties.result = matrix[data.optionIdx][i];
	}
}

function clearFeatures(map, layerName, allLayers) {

	var num = map.getNumLayers();
	
	if (layerName) {
		
		// Remove the layer from the allLayers array of vectors
		
		if(allLayers) {
			for(var i = 0; i < allLayers.length; i++) {
				if(allLayers[i].name === layerName) {
					allLayers.splice(i,1);
				}
			}
		}
		
		// Remove the layer from the map
		for(var i = num - 1; i >= 0; i--) {
			if(!map.layers[i].isBaseLayer && map.layers[i].name === layerName) {
				map.layers[i].removeAllFeatures();
				map.removeLayer(map.layers[i]);
			}
		}
	} else {
		if(allLayers) {
			allLayers.splice(0, allLayers.length);		// Clear out array of vectors
		}
		
		// Remove layers from the map
		for(var i = num - 1; i >= 0; i--) {
			// Ignore background map vector layers whose name finsihes with a "."
			if(!map.layers[i].isBaseLayer && (map.layers[i].name.lastIndexOf('.') !== map.layers[i].name.length - 1)) {
				map.layers[i].removeAllFeatures();
				map.removeLayer(map.layers[i]);	
			}
		}
	}
}

function loadFeatures(map, key, item, ext_g, bounds, layers, isPeriod, md) {
	
	var features = JSON.stringify(item),
		fn = item.fn;

	var featuresObj = new OpenLayers.Format.GeoJSON({
        	'internalProjection': new OpenLayers.Projection("EPSG:900913"),
        	'externalProjection': new OpenLayers.Projection("EPSG:4326")
		}).read(features);

	var setLabels = false;
	if(item.source === 'user') {
		setLabels = true;
	}

	if(typeof featuresObj === "undefined" || typeof featuresObj === "null" || !featuresObj) {
		console.log("Error: No features were retrieved from the server");
		return;
	}
	
	if(featuresObj.constructor != Array) {
        featuresObj = [featuresObj];
    }

	if(featuresObj.length == 0) {
		return;
	}

	var defaultStyle,
		selectStyle,
		colour_lookup = undefined;
	
	if(ext_g) {		// External graphic
		defaultStyle =  new OpenLayers.Style(
				{
					externalGraphic: ext_g.path + "${" + ext_g.feature + "}" + ext_g.suffix, 
					graphicWidth: 40, graphicHeight: 40, graphicYOffset: -40, 
					graphicOpacity: 1, cursor: "pointer"
				});
		selectStyle =  new OpenLayers.Style(
				{ 
					graphicWidth: 60, graphicHeight: 60, graphicYOffset: -60
				});
	} else {
		
		defaultStyle = new OpenLayers.Style(
			{
				fillColor: "red",
				pointRadius: "${radius}",
				fillOpacity: 0.6,
				strokeWidth: "${width}",
				stokeColor: "${strokeColor}",
				label: "${count}",
				labelXOffset: "${xOffset}",
				labelYOffset: "${yOffset}",
				fontColor: "red",
				fontSize: "${fontSize}"
			}, {
                context: {
                    width: function(feature) {
						if (feature.geometry && feature.geometry.CLASS_NAME ==
							"OpenLayers.Geometry.LineString") {
							return 5;
						}
                        return (feature.cluster) ? 2 : 1;
                    },
					strokeColor: function(feature) {
						if (feature.geometry && feature.geometry.CLASS_NAME ==
							"OpenLayers.Geometry.LineString") {
							return "blue";
						}
						return "black";
					},
                    radius: function(feature) {
                        var pix = 8;
                        if(feature.cluster) {
                            pix = Math.min(feature.attributes.count, 8) + 8;
                            // Set the value to be processed by color lookup rule
                            var newValue = 0;
                            var newLabel = '';
                            for(var i = 0; i < feature.cluster.length; i++) {
                                newValue += feature.cluster[i].attributes.value;
                                if(setLabels) {
                                	if(newLabel.length > 0) {
		                                newLabel += ', ';
	                                }
	                                newLabel +=  feature.cluster[i].attributes._label;
                                }
                            }
                            feature.attributes.value = Math.round(newValue / feature.cluster.length);
                            feature.attributes._label = newLabel;
                        } 
                        return pix;
                    },
                    count: function(feature) {
                    	if(feature.cluster && !feature.attributes._label) {
                    		return feature.attributes.count
	                    } else if(feature.attributes._label) {
                    		return feature.attributes._label
	                    } else {
                    		return "";
	                    }
                    	//return (feature.cluster) ? feature.attributes.count : "";
                    },
	                xOffset: function(feature) {
		                if (feature.attributes._label) {
			                return 20;
		                } else {
			                return 0;
		                }
	                },
	                yOffset: function(feature) {
		                if (feature.attributes._label) {
			                return -10;
		                } else {
			                return 0;
		                }
	                },
	                fontSize: function(feature) {
		                if (feature.attributes._label) {
			                return 16;
		                } else {
			                return 8;
		                }
	                }
                }
			});
		selectStyle = new OpenLayers.Style(
			{
				'fillOpacity': 1.0
			});
	
		colour_lookup = {
			4 : {fillColor: "red"},
			3 : {fillColor: "orange"},
			2 : {fillColor: "yellow"},
			1 : {fillColor: "green"},
			0 : {fillColor: "blue"}
		};

	}
	
	var styleMap = new OpenLayers.StyleMap({
		'default': defaultStyle,
        'select': selectStyle
        });
	
	if(typeof fn !== "undefined" && fn !== "none" && colour_lookup) {
		styleMap.addUniqueValueRules("default", "value", colour_lookup);
	}

	// Compute the bounds 
	if(bounds) {
		var idx = 1;
		for (var i = featuresObj.length - 1; i >= 0 ; i--) {
			if(featuresObj[i].geometry) {
				bounds.extend(featuresObj[i].geometry.getBounds());

				if(setLabels && !featuresObj[i].attributes._label) {
					featuresObj[i].attributes._label = idx++;
				}
			}
		}
	}

	var clusterStrategy = new OpenLayers.Strategy.Cluster({distance: 10, threshold: 2});
	
	// Filter strategy for longitudinal analysis
	md["filter"] = new OpenLayers.Filter.Comparison({
	    type: OpenLayers.Filter.Comparison.BETWEEN,
	    property: "timeIdx",
	    lowerBoundary: md["startIdx"],
	    upperBoundary: md["startIdx"] + md["span"]
	});
	md["filterStrategy"] = new OpenLayers.Strategy.Filter({filter: md["filter"]});
	
	var strategies = [];
	if(isPeriod) {
		strategies.push(md["filterStrategy"]);
	} else {
		strategies.push(clusterStrategy);
	}
	
	var resultsLayer = new OpenLayers.Layer.Vector(key, {
			strategies: strategies,
			styleMap:styleMap
		});

	
	map.addLayer(resultsLayer);		// Add layer to map before adding features or clustering does not work
	resultsLayer.addFeatures(featuresObj);
	layers.push(resultsLayer);
}

//Zoom to the data on a map (check all layers on the map)
export function zoomToData(map) {
	
	var bounds,
		num,
		i, j,
		layer,
		feature;

	if(map) {
		num = map.getNumLayers();
		for(i = num - 1; i >= 0; i--) {
			if(!map.layers[i].isBaseLayer) {
				layer = map.layers[i];
				
				for (j = 0; j < layer.features.length; j++) {
					feature = layer.features[j];
					if(feature.geometry) {
						if(!bounds) {
							bounds = feature.geometry.getBounds();
						} else {
							bounds.extend(feature.geometry.getBounds());
						}
					}
				}

			}
		}
	}
	
	if(bounds != null) {
		map.zoomToExtent(bounds);
	}
}

function getPeriodLabel(index, md) {
	var d = new Date(md["startDate"]),
		v;

	if(md["period"] === "hour") {
		d.setHours(d.getHours() + index + md["startHour"]);
		v = d.getFullYear() + "/" + (d.getMonth() + 1) + "/" + d.getDate() + " " + d.getHours();
	} else if(md["period"] === "day") {
		d.setDate(d.getDate() + index);
		v = d.getFullYear() + "/" + (d.getMonth() + 1) + "/" + d.getDate();
	} else if(md["period"] === "week") {
		d.setDate(d.getDate() + index * 7);
		v = d.getFullYear() + "/" + (d.getMonth() + 1) + "/" + d.getDate();
	} else if(md["period"] === "month") {
		d.setMonth(d.getMonth() + index);
		v = d.getFullYear() + "/" + (d.getMonth() + 1);
	} else if(md["period"] === "year") {
		d.setYear(d.getFullYear() + index);
		v = d.getFullYear();
	}

	return v;
}

function showBounds(map, bounds, max_zoom) {
	
	var boundsGeom,
		boundsFeat,
		width = bounds.getWidth(),
		height = bounds.getHeight(),
		i,
		goUp;
	
	// Extend bounds if it is too small to see
	if(width < 100) {
		bounds.left = bounds.left - (100-width)/2;
		bounds.right = bounds.right + (100-width)/2;
	}
	if(height < 100) {
		bounds.top = bounds.top + (100-height)/2;
		bounds.bottom = bounds.bottom -(100-height)/2;
	}
	
	if(gCurrentBoundsLayer) {
		map.removeLayer(gCurrentBoundsLayer);
	}
	
	boundsGeom = bounds.toGeometry();
	boundsFeat = new OpenLayers.Feature.Vector(boundsGeom, {});
	gCurrentBoundsLayer = new OpenLayers.Layer.Vector("bounds")	
	gCurrentBoundsLayer.addFeatures([boundsFeat]);
	map.addLayer(gCurrentBoundsLayer);	
	map.zoomToExtent(bounds);
	if(typeof max_zoom != "undefined") {
		goUp = map.zoom - max_zoom;
		for(i = 0; i < goUp; i++) {
			map.zoomOut();
		}
	}

	gSelectedBounds = bounds;

	return bounds;
}

/*
 * Return true if the two boundign boxes intersect
 * This function assumes that the dimensions of the first boundingbox have been pre-calculated
 */
function boxesIntersect(selX, selY, selWidth, selHeight, bbox) {
	var bbWidth = bbox[2] - bbox[0],
		bbHeight = bbox[3] - bbox[1],
		bbX = parseFloat(bbox[0]) + (parseFloat(bbWidth)) / 2,
		bbY = parseFloat(bbox[1]) + (parseFloat(bbHeight)) / 2;
	
	return ((Math.abs(bbX - selX) * 2) < (bbWidth + selWidth)) && ((Math.abs(bbY - selY) * 2) < (bbHeight + selHeight));
}

// Respond to a feature being selected
function onFeatureSelectOL(feature) {
	onFeatureUnselect();
	$("#features").featureSelect(feature.data, feature.cluster);
	$("#features").addClass('fp-open');
}

// Remove display of features
function onFeatureUnselect(feature) {
	$("#features").removeClass('fp-open').empty();
}

/*
 * Update the view according to the current time filter window
 */
function setTimeFilter(md) {
        md["filter"].lowerBoundary = md["startIdx"];
        md["filter"].upperBoundary = md["startIdx"] + md["span"];
        md["$slider"].val(Math.max(0, Math.round(md["filter"].lowerBoundary + 0.5)));
        md["$slideDate1"].text(getPeriodLabel(md["filter"].lowerBoundary + 0.5, md));
        md["$slideDate2"].text(getPeriodLabel(md["filter"].upperBoundary + 0.5, md));
        md["filterStrategy"].setFilter(md["filter"]);
};

/*
 * Animate the time history
 */
function startAnimation(md) {
	
	var mapData = md;
	
    if (typeof md["animationTimer"] !== "undefined") {
        stopAnimation(true, md);
    }

    var next = function() {
    	var theMD = mapData;
        if (theMD["currentIdx"] - theMD["step"] + theMD["span"] < theMD["endIdx"]) {
            theMD["filter"].lowerBoundary = theMD["currentIdx"];
            theMD["filter"].upperBoundary = theMD["currentIdx"] + theMD["span"];
            theMD["filterStrategy"].setFilter(theMD["filter"]);
            theMD["currentIdx"] = theMD["currentIdx"] + theMD["step"];
            theMD["$slider"].val(Math.max(0, Math.round(theMD["filter"].lowerBoundary + 0.5)));
            theMD["$slideDate1"].text(getPeriodLabel(theMD["filter"].lowerBoundary + 0.5, theMD));
            theMD["$slideDate2"].text(getPeriodLabel(theMD["filter"].upperBoundary + 0.5, theMD));
        } else {
            stopAnimation(true, theMD);
        }
    };
    md["animationTimer"] = window.setInterval(next, md["interval"]);
}

function stopAnimation(reset, md) {
    window.clearInterval(md["animationTimer"]);
    md["animationTimer"] = null;
    if (reset === true) {
        md["currentIdx"] = -0.5;
        md["startIdx"] = -0.5;
    }
}

/*
 * Add shared maps
 */
export function addSharedMaps(map, sharedMaps) {
	
	var i,
		layerUrl,
		layer;
	
	if(sharedMaps) {
		for(i = 0; i < sharedMaps.length; i++) {
			
			layer = sharedMaps[i];
			
			if(layer.type === "mapbox") {
				layerUrl = "https://api.mapbox.com/styles/v1/" + layer.config.mapid + "/tiles/${z}/${x}/${y}?access_token=" + globals.gMapboxDefault;
				map.addLayer(new OpenLayers.Layer.XYZ(htmlEncode(layer.name),
					    [layerUrl], {
					    sphericalMercator: true,
					    wrapDateLine: true,
					    numZoomLevels: layer.zoom
					}));
			} else if(layer.type === "vector") {
				layerUrl = "/surveyKPI/file/" + layer.config.vectorData + "/organisation";
				var vectorLayer = new OpenLayers.Layer.Vector(layer.name + ".", {
					projection: "EPSG:4326",
		            strategies: [new OpenLayers.Strategy.Fixed()],
		            protocol: new OpenLayers.Protocol.HTTP({
		                url: layerUrl,
		                format: new OpenLayers.Format.GeoJSON()
		            })
		        });
				map.addLayer(vectorLayer);
			}
	
		}
	}
}

/*
 * Generate a slide-in panel with all the properties for a selected item
 */
(function($) {
	$.fn.featureSelect = function(data, clusterData) {

		var total, totalRecs, computedResult,
			aDataItem,
			h = [],
			idx = -1,
			i;

		if (clusterData) {
			aDataItem = clusterData[0].attributes;
		} else {
			aDataItem = data;
		}

		// Determine panel title
		var titleText;
		if (aDataItem._ftype && aDataItem._ftype === "q") {
			titleText = htmlEncode(aDataItem.question || 'Feature');
		} else {
			var pk = aDataItem.prikeys ? aDataItem.prikeys[0] : aDataItem.prikey;
			titleText = pk ? 'Record ' + htmlEncode(pk) : 'Feature';
		}

		// Header
		h[++idx] = '<div class="fp-header">';
		if (clusterData) {
			h[++idx] = '<span class="fp-badge">' + clusterData.length + '</span>';
		}
		h[++idx] = '<span class="fp-title">' + titleText + '</span>';
		h[++idx] = '<button class="fp-close" id="fDel" title="Close"><i class="fa fa-times"></i></button>';
		h[++idx] = '</div>';

		// Scrollable body
		h[++idx] = '<div class="fp-body">';

		if (aDataItem._ftype && aDataItem._ftype === "q") {
			// --- Question-level data ---
			h[++idx] = '<div class="fp-section">Summary</div>';
			if (!clusterData && aDataItem.group_value) {
				h[++idx] = '<div class="fp-row"><span class="fp-key">Location</span><span class="fp-val">' + htmlEncode(aDataItem.group_value) + '</span></div>';
			}
			h[++idx] = '<div class="fp-row"><span class="fp-key">Question</span><span class="fp-val">' + htmlEncode(aDataItem.question) + '</span></div>';
			h[++idx] = '<div class="fp-row"><span class="fp-key">Function</span><span class="fp-val">' + htmlEncode(aDataItem.aggregation) + '</span></div>';
			if (aDataItem.units) {
				h[++idx] = '<div class="fp-row"><span class="fp-key">Units</span><span class="fp-val">' + htmlEncode(aDataItem.units) + '</span></div>';
			}
			if (aDataItem.selected) {
				h[++idx] = '<div class="fp-row"><span class="fp-key">Selected</span><span class="fp-val">' + htmlEncode(aDataItem.selected) + '</span></div>';
			}

			// Compute answer
			var answerHtml;
			if (clusterData) {
				computedResult = 0.0;
				if (aDataItem.aggregation === "percent") {
					total = 0; totalRecs = 0;
					for (i = 0; i < clusterData.length; i++) {
						total += clusterData[i].attributes.result;
						totalRecs++;
					}
					computedResult = totalRecs > 0 ? Math.round(100 * total / totalRecs) / 100 : 0.0;
				} else if (aDataItem.aggregation === "count") {
					computedResult = 0;
					for (i = 0; i < clusterData.length; i++) {
						computedResult += clusterData[i].attributes.result;
					}
				} else {
					computedResult = "";
				}
				answerHtml = addAnchors(htmlEncode(computedResult), true).join(',');
			} else {
				answerHtml = addAnchors(htmlEncode(aDataItem.result), true).join(',');
			}
			h[++idx] = '<div class="fp-row"><span class="fp-key">Answer</span><span class="fp-val fp-answer">' + answerHtml + '</span></div>';

			if (clusterData) {
				h[++idx] = '<div class="fp-section">' + localise.set["a_cm"] + '</div>';
				h[++idx] = '<div class="fp-cluster-scroll">';
				for (i = 0; i < clusterData.length; i++) {
					h[++idx] = '<div class="fp-cluster-card">';
					h[++idx] = '<div class="fp-row"><span class="fp-key">Location</span><span class="fp-val">' + htmlEncode(clusterData[i].attributes.group_value) + '</span></div>';
					h[++idx] = '<div class="fp-row"><span class="fp-key">Answer</span><span class="fp-val">' + addAnchors(htmlEncode(clusterData[i].attributes.result), true).join(',') + '</span></div>';
					h[++idx] = '</div>';
				}
				h[++idx] = '</div>';
			} else if (aDataItem.records) {
				h[++idx] = '<div class="fp-section">' + localise.set["c_data"] + '</div>';
				h[++idx] = '<div class="fp-cluster-scroll">';
				for (i = 0; i < aDataItem.records.length; i++) {
					h[++idx] = '<div class="fp-cluster-card">';
					h[++idx] = '<div class="fp-row"><span class="fp-key">' + localise.set["c_record"] + '</span><span class="fp-val">' + htmlEncode(aDataItem.records[i]) + '</span></div>';
					h[++idx] = '<div class="fp-row"><span class="fp-key">' + localise.set["c_value"] + '</span><span class="fp-val">' + addAnchors(htmlEncode(aDataItem.sourceData[i]), true).join(',') + '</span></div>';
					h[++idx] = '</div>';
				}
				h[++idx] = '</div>';
			}

		} else {
			// --- Survey-level data ---
			var skipKeys = {"prikeys":1,"_task_key":1,"_task_replace":1,"_modified":1,"parkey":1,"_instanceid":1,"instanceid":1};

			if (clusterData) {
				h[++idx] = '<div class="fp-cluster-scroll">';
				for (i = 0; i < clusterData.length; i++) {
					var attrs = clusterData[i].attributes;
					var memberPk = attrs.prikeys ? attrs.prikeys[0] : attrs.prikey;
					h[++idx] = '<div class="fp-cluster-card">';
					h[++idx] = '<div class="fp-section" style="padding-top:0.5rem">Record ' + htmlEncode(memberPk) + '</div>';
					$.each(attrs, function(key, value) {
						if (!skipKeys[key]) {
							value = translateKeyValue(key, value);
							h[++idx] = '<div class="fp-row"><span class="fp-key">' + htmlEncode(translateKey(key)) + '</span><span class="fp-val">' + addAnchors(htmlEncode(value), true).join(',') + '</span></div>';
						}
					});
					h[++idx] = '</div>';
				}
				h[++idx] = '</div>';
			} else {
				$.each(aDataItem, function(key, value) {
					if (!skipKeys[key]) {
						value = translateKeyValue(key, value);
						h[++idx] = '<div class="fp-row"><span class="fp-key">' + htmlEncode(translateKey(key)) + '</span><span class="fp-val">' + addAnchors(htmlEncode(value), true).join(',') + '</span></div>';
					}
				});
			}
		}

		h[++idx] = '</div>'; // end fp-body

		$(this).append(h.join(''));

		// Wire up close button
		$(this).find('#fDel').on('click', function() {
			$("#features").removeClass('fp-open').empty();
		});
	};

})(jQuery);
