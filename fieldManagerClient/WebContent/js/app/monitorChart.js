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
        return {
            refresh: refresh
        };

        var initialised = false;

        var gProgressChart;
        var gProgressConfig;

        function init() {

            initProgressChart();
            initialised = true;

            refresh();
        }

        function initProgressChart() {
            gProgressConfig = {
                type: 'bar',
                responsive: true,
                data: {
                    labels: [],
                    datasets: [{
                        label: localise.set["c_status"],
                        backgroundColor: 'rgb(255, 99, 132)',
                        borderColor: 'rgb(255, 99, 132)',
                        data: [],
                    }]
                },
                options: {}
            };

            gProgressChart = new Chart(
                document.getElementById('progressChart'),
                gProgressConfig
            );
        }

        /*
         * Extract the data in chart form
         */
        function refresh() {

            if(!gMonitor.cache.caseProgress) {
                // Data not available yet.
                return;
            }

            var progressVal;

            if(!initialised) {
                init()
            }

            var progressData = {};
            if(cd.settings.finalStatus && cd.settings.statusQuestion) {
                for (var i = 0; i < results.length; i++) {

                    progressVal = results[i][cd.settings.statusQuestion];
                    assigned =  results[i]["_assigned"];
                    alert =  results[i]["_alert"];
                    criticality = results[i][cd.settings.criticalityQuestion]

                    if(!(statusVal === cd.settings.finalStatus && assigned === "")) {    // Ignore completed tasks that are not assigned

                        if(statusVal === "") {
                            statusVal = localise.set["c_none"];
                        }
                        if(assigned === "") {
                            assigned = localise.set["t_u"];
                        }
                        if(criticality === "") {
                            criticality = localise.set["c_none"];
                        }

                        statusData[statusVal] = statusData[statusVal] || 0; // Ensure value is numeric
                        statusData[statusVal]++;

                        assignedData[assigned] = assignedData[assigned] || 0; // Ensure value is numeric
                        assignedData[assigned]++;

                        if(!(statusVal === cd.settings.finalStatus)) {      // Ignore completed
                            if(alert && alert.trim().length > 0) {
                                alertData[alert] = alertData[alert] || 0; // Ensure value is numeric
                                alertData[alert]++;
                            }

                            criticalityData[criticality] = criticalityData[criticality] || 0; // Ensure value is numeric
                            criticalityData[criticality]++;
                        }
                    }
                }
            }

            /*
             * Show the charts
             */
            updateChart(gProgressConfig, progressData, gProgressChart);

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