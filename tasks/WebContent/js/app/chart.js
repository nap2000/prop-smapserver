/*
 This file is part of SMAP.

 SMAP is free software: you can redistribute it and/or modify
 it under the terms of the GNU General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.
 uSMAP is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.

 You should have received a copy of the GNU General Public License
 along with SMAP.  If not, see <http://www.gnu.org/licenses/>.

 */

/*
 * Chart functions
 * Uses: https://www.chartjs.org/
 */

"use strict";

define([
        'jquery',
        'modernizr',
        'localise',
        'globals'],
    function ($, modernizr, localise, globals) {

        var charts = [];

        return {
            add: add,
            replace: replace,
            refresh: refresh,
            clear: clear
        };

        function add(settings) {

            if(!gTasks.cache.currentData) {
                // Data not available yet.
                return;
            }

            var item = {
                source: {
                    subject: settings.subject
                },
                config: updateConfigFromSettings({
                    type: settings.chart_type,
                    responsive: true,
                    data: {
                        labels: [],
                        datasets:[{
                            label: settings.label,
                            backgroundColor: settings.color,
                            borderColor: 'rgb(0, 0, 0)',
                            data: [],
                        }]
                    },
                    options: {}
                }, settings)
            };

            // Set the data key
            var cd = gTasks.cache.currentData.case;
            if(settings.subject === 'status') {
                item.source.key = cd.settings.statusQuestion;
            } else  if(settings.subject === 'assigned') {
                item.source.key = "_assigned";
            } else  if(settings.subject === 'alert') {
                item.source.key = "_alert";
            } else  if(settings.subject === 'criticality') {
                item.source.key = cd.settings.criticalityQuestion;
            }

            // create the canvas element
            var label = settings.label;
            var index = charts.length;
            var card = `<div class="col-sm-12 col-md-6 col-lg-3">
                                    <div class="card">
                                        <div class="card-header d-flex chart-header">
                                            <span class="mr-auto">${label}</span>
                                            <i class="fa fa-cog" data-idx="${index}"></i>
                                        </div>
                                        <div class="card-body">
                                            <canvas id="chart${index}"></canvas>
                                        </div>
                                    </div>
                                </div>`;
            $('#chartcontent').append(card);

            // Associate the canvas element with the chart
            item.chart = new Chart(
                document.getElementById('chart' + charts.length),
                item.config
            );
            charts.push(item);
        }

        function replace(settings, index) {
            charts[index].config = updateConfigFromSettings(charts[index].config, settings);
            charts[index].chart.update();
        }

        function updateConfigFromSettings(config, settings) {
            config.type = settings.chart_type;
            config.data.datasets[0].backgroundColor = settings.color;

            if(config.type === 'col') {
                config.type = 'bar';
                config.options.indexAxis = 'y';
            }

            return config;
        }

        /*
         * Clear existing charts
         */
       function clear() {
           for(var chartIdx = 0; chartIdx < charts.length; chartIdx++) {
               charts[chartIdx].chart.destroy();
           }
           charts = [];
           $('#chartcontent').empty();
        }

        /*
         * Extract the data in chart form
         */
        function refresh() {


            if(!gTasks.cache.currentData) {
                // Data not available yet.
                return;
            }

            var cd = gTasks.cache.currentData.case;
            var results = globals.gMainTable.rows({
                order: 'current',  // 'current', 'applied', 'index',  'original'
                page: 'all',      // 'all',     'current'
                search: 'applied',     // 'none',    'applied', 'removed'
            }).data();

            if(cd.settings.finalStatus && cd.settings.statusQuestion) {
                for(var chartIdx = 0; chartIdx < charts.length; chartIdx++) {

                    var key = charts[chartIdx].source.key;
                    var chartData = {};

                    for (var i = 0; i < results.length; i++) {

                        var val = results[i][key];

                        // ignore records without an alert when getting alert chart data
                        if (key === '_alert' && val.trim().length === 0) {
                            continue;
                        } else if (val === "") {
                            val = localise.set["c_none"];
                        }

                        chartData[val] = chartData[val] || 0; // Ensure value is numeric
                        chartData[val]++;

                    }
                    updateChart(charts[chartIdx].config, chartData, charts[chartIdx].chart);
                }
            }

        }

        function updateChart(config, data, chart) {
            var keys = Object.keys(data).sort();

            config.data.labels = [];
            config.data.datasets[0].data = [];
            for (var i = 0; i < keys.length; i++) {
                var key = keys[i];
                config.data.labels.push(key);
                config.data.datasets[0].data.push(data[key]);
            }
            chart.update();
        }
    });