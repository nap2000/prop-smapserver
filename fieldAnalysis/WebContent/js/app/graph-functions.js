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

import { getDisplayDescription } from "commonReportFunctions";

var CHART_COLORS = [
	'rgba(54, 162, 235, 0.8)',
	'rgba(255, 99, 132, 0.8)',
	'rgba(75, 192, 192, 0.8)',
	'rgba(255, 159, 64, 0.8)',
	'rgba(153, 102, 255, 0.8)',
	'rgba(255, 205, 86, 0.8)',
	'rgba(201, 203, 207, 0.8)',
	'rgba(255, 99, 71, 0.8)',
	'rgba(0, 200, 83, 0.8)',
	'rgba(33, 150, 243, 0.8)'
];

export function setGraph(data, chart, optionSelElement, pId, chartType) {

	var isVisible = true,
		$chartdiv,
		$pc,
		groups,
		fn,
		cols,
		pareto = [],
		grandTotal = [],
		matrix = [],
		i, j,
		$btnSelect,
		btns = [],
		id_name,
	    series = [],
    	matrix2 = [],
    	ticks = [],
    	val,
    	disp_desc,
    	isTimeSeries = false,
    	seriesObj = {},
    	ticksObj = {},
    	cMatrix = [],
    	idx = 0,
    	grpIdx,
    	seriesIdx = 0,
    	label,
    	maxTimeIdx = 0,
    	markerOptionIdx;

	groups = data.features;
	fn = data.fn;
	cols = data.cols;
	if(typeof data.interval !== "undefined") {
		isTimeSeries = true;
	}

	// Destroy existing Chart.js instance before redrawing
	var existingCanvas = document.getElementById(chart);
	if(existingCanvas && existingCanvas._chart) {
		existingCanvas._chart.destroy();
		existingCanvas._chart = null;
	}

	/*
	 * Sort the data by size and create a matrix of the data
	 */
	seriesIdx = 0;
	if(isTimeSeries) {
		var groupName = "none";
		for(i = 0; i < cols.length; i++) {
			pareto[i] = i;

			for(j = 0; j < groups.length; j++) {
				if(typeof groups[j].properties.group_name !== "undefined") {
					groupName = groups[j].properties.group_name;
				}
				if(typeof seriesObj[groupName] === "undefined") {
					seriesObj[groupName] = [];
				}
				cMatrix = seriesObj[groupName];
				if(typeof cMatrix[i] === "undefined") {
					cMatrix[i] = [];
				}
				cMatrix[i].push([groups[j].properties.timeIdx+1, groups[j].properties[cols[i]]]);
				if(typeof groups[j].properties.period !== "undefined") {
					ticksObj[groups[j].properties.timeIdx] = groups[j].properties.period;
				}
			}
		}

		// Generate the ticks array
		var maxTimeIdx = data.maxTimeIdx;
		for(i = 0; i <= maxTimeIdx; i++) {
			if(typeof ticksObj[i] !== "undefined") {
				ticks.push(ticksObj[i]);
			} else {
				ticks.push(" ");
			}
		}

	} else {
		for(i = 0; i < cols.length; i++) {
			pareto[i] = i;
			grandTotal[i] = 0.0;
			matrix[i] = [];
			for(j = 0; j < groups.length; j++) {
				grandTotal[i] += groups[j].properties[cols[i]];
				matrix[i][j] = groups[j].properties[cols[i]];
				if(typeof groups[j].properties.group_label === "undefined") {
					ticks[j] = "";
				} else {
					ticks[j] = groups[j].properties.group_label;
				}
			}
		}
		pareto.sort(function(a,b) {return grandTotal[b] - grandTotal[a];});
		pareto = pareto.slice(0, 30);	// Max length of bar chart is 30
	}

	/*
	 * Add buttons to select the options to include in the graph
	 */
	if(typeof optionSelElement != "undefined") {
		$btnSelect = $('#' + optionSelElement);
		if(typeof data.optionIdx === "undefined") {

			j = -1;
			if(cols) {
				id_name = "btnsel" + pId +"_";
				for(i = 0; i < pareto.length; i++) {
					btns[++j] = '<input type="checkbox" id="';
					btns[++j] = id_name + i;
					btns[++j] = '" name="';
					btns[++j] = id_name;
					btns[++j] = '" value="';
					btns[++j] = pareto[i] + '"';

					if(!isTimeSeries) {
						if(grandTotal[pareto[i]] !== 0) {
							btns[++j] = ' checked="checked"';
						}
					} else {
						btns[++j] = ' checked="checked"';
					}
					btns[++j] = '/><label for="';
					btns[++j] = id_name + i;
					btns[++j] = '">' + cols[pareto[i]];
					btns[++j] =	 '</label><br/>';
				}
				$btnSelect.empty().append(btns.join(''));

				$btnSelect.find('input').change(function() {
					data.optionIdx = $(this).val();
					setGraph(data, chart, optionSelElement, pId);
				});
			}
		}
	}

	// Remove rows from the matrix that have not been selected by the user
	if(isTimeSeries) {
		idx = 0;
		grpIdx = 0;
		var g;
		for(g in seriesObj) {
			cMatrix = seriesObj[g];

			if(typeof optionSelElement != "undefined") {
				$btnSelect.find(':checked').each(function(index,value) {
					val = $(this).val();
					matrix2[idx] = seriesObj[g][val];
					if(g === "none") {
						label = cols[val];
					} else {
						label = g + " : " + cols[val];
					}
					series[idx++] = { label: label };
				});
			} else {
				for(i = 0; i < cMatrix.length; i++) {
					matrix2[i] = cMatrix[i];
					if(g === "none") {
						label = cols[i];
					} else {
						label = g + " : " + cols[i];
					}
					series[i] = { label: label };
				}
			}
			grpIdx++;
		}

	} else {
		if(typeof optionSelElement != "undefined") {
			$btnSelect.find(':checked').each(function(index,value) {
				val = $(this).val();
				matrix2[index] = matrix[val];
				series[index] = {label: cols[val]};
			});
		} else {
			for(i = 0; i < matrix.length; i++) {
				matrix2[i] = matrix[pareto[i]];
				series[i] = {label: cols[pareto[i]]};
			}
		}
	}

	console.log("Graph description");
	console.log(data);
	disp_desc = getDisplayDescription(fn, "graph", data.survey, data.question, data.group, undefined, data.qtype,
			data.date_question, data.start, data.end, data.interval, data.units, data.filter);
	$('#p' + pId).find('.r_description').text(disp_desc);
	data.caption = disp_desc;

	if(matrix2 && matrix2.length > 0) {
		if(isTimeSeries) {
			ts_graph(ticks, matrix2, series, chart, data, pId);
		} else if(chartType === 'pie') {
			pie_graph(ticks, matrix2, series, chart, data, pId);
		} else {
			bar_graph(ticks, matrix2, series, chart, data, pId);
		}
	} else {
		$('#graph_panel' + pId + ' canvas').closest('.graph_panel').find('h3').html("No data available");
	}

}

/*
 * Show the bar graph using Chart.js
 */
function bar_graph(ticks, matrix2, series, chart, data, pId) {
	var yaxislabel;

	// Truncate tick labels
	for(var i = 0; i < ticks.length; i++) {
		if(ticks[i] && ticks[i].length > 32) {
			ticks[i] = ticks[i].substring(0, 32);
		}
	}

	if(data.units) {
		yaxislabel = data.fn + " (" + data.units + ")";
	} else {
		yaxislabel = data.fn;
	}

	// matrix2 rows are series; columns are data points per tick
	// Chart.js expects datasets each with data array matching labels
	var canvas = document.getElementById(chart);
	if(!canvas) return;
	if(canvas._chart) { canvas._chart.destroy(); }

	canvas._chart = new Chart(canvas, {
		type: 'bar',
		data: {
			labels: ticks,
			datasets: matrix2.map(function(d, i) {
				var color = CHART_COLORS[i % CHART_COLORS.length];
				return {
					label: series[i] ? series[i].label : '',
					data: d,
					backgroundColor: color,
					borderColor: color.replace('0.8', '1'),
					borderWidth: 1
				};
			})
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			plugins: {
				legend: { display: false },
				tooltip: { mode: 'index', intersect: false }
			},
			scales: {
				x: {
					title: { display: !!data.group, text: data.group || '' },
					ticks: { maxRotation: 30 }
				},
				y: {
					title: { display: true, text: yaxislabel },
					beginAtZero: true
				}
			}
		}
	});

}


/*
 * Show a pie chart using Chart.js
 * Two layouts:
 *  - select1 question: cols = options (e.g. A/B/C/D), one feature row → slice per column
 *  - grouped question: multiple feature rows, one col → slice per group
 */
function pie_graph(ticks, matrix2, series, chart, data, pId) {
	var canvas = document.getElementById(chart);
	if(!canvas) return;
	if(canvas._chart) { canvas._chart.destroy(); }

	var labels, values, i;

	if(ticks.length <= 1 && matrix2.length > 1) {
		// select1 case: each column (option) is a slice
		labels = matrix2.map(function(_, i) { return series[i] ? series[i].label : String(i); });
		values = matrix2.map(function(d) { return +(d[0]) || 0; });
	} else {
		// grouped case: each feature row (group) is a slice
		var groups = data.features;
		var col = (data.cols && data.cols.length > 0) ? data.cols[0] : 'count';
		labels = [];
		values = [];
		for(i = 0; i < groups.length; i++) {
			labels.push(groups[i].properties.group_label || String(i));
			values.push(+(groups[i].properties[col]) || 0);
		}
	}

	var colors = labels.map(function(_, i) { return CHART_COLORS[i % CHART_COLORS.length]; });

	canvas._chart = new Chart(canvas, {
		type: 'pie',
		data: {
			labels: labels,
			datasets: [{
				data: values,
				backgroundColor: colors,
				borderColor: colors.map(function(c) { return c.replace('0.8', '1'); }),
				borderWidth: 1
			}]
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			plugins: {
				legend: { display: true, position: 'right' }
			}
		}
	});
}


/*
 * Show the time series using Chart.js
 */
function ts_graph(ticks, matrix2, series, chart, data, pId) {

	// Truncate tick labels
	for(var i = 0; i < ticks.length; i++) {
		if(ticks[i] && ticks[i].length > 32) {
			ticks[i] = ticks[i].substring(0, 32);
		}
	}

	var canvas = document.getElementById(chart);
	if(!canvas) return;
	if(canvas._chart) { canvas._chart.destroy(); }

	// matrix2 rows: each row is a series; values are [timeIdx, value] pairs
	canvas._chart = new Chart(canvas, {
		type: 'line',
		data: {
			labels: ticks,
			datasets: matrix2.map(function(d, i) {
				var color = CHART_COLORS[i % CHART_COLORS.length];
				return {
					label: series[i] ? series[i].label : '',
					data: d ? d.map(function(pt) { return pt[1]; }) : [],
					tension: 0.3,
					fill: false,
					borderColor: color.replace('0.8', '1'),
					backgroundColor: color,
					pointBackgroundColor: color.replace('0.8', '1')
				};
			})
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			plugins: {
				legend: { display: false },
				tooltip: { mode: 'index', intersect: false }
			},
			scales: {
				x: {
					title: { display: !!data.interval, text: data.interval || '' },
					ticks: { maxRotation: 30 }
				},
				y: {
					title: { display: true, text: data.fn || '' },
					beginAtZero: true
				}
			}
		}
	});

}
