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

        var gStatusChart;
        var gStatusConfig;
        var gAssignedChart;
        var gAssignedConfig;
        var gAlertChart;
        var gAlertConfig;

        function init() {

            initStatus();
            initAssigned();
            initAlert();
            initialised = true;

            refresh();
        }

        function initStatus() {
            gStatusConfig = {
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

            gStatusChart = new Chart(
                document.getElementById('statusChart'),
                gStatusConfig
            );
        }

        function initAlert() {
            gAlertConfig = {
                type: 'bar',
                responsive: true,
                data: {
                    labels: [],
                    datasets: [{
                        label: localise.set["c_alert"],
                        backgroundColor: 'rgb(0, 255, 0)',
                        borderColor: 'rgb(0, 255, 0)',
                        data: [],
                    }]
                },
                options: {}
            };

            gAlertChart = new Chart(
                document.getElementById('alertChart'),
                gAlertConfig
            );
        }


        function initAssigned() {
            gAssignedConfig = {
                type: 'bar',
                responsive: true,
                data: {
                    labels: [],
                    datasets: [{
                        label: localise.set["t_assigned"],
                        backgroundColor: 'rgb(0, 0, 255)',
                        borderColor: 'rgb(0, 0, 255)',
                        data: [],
                    }]
                },
                options: {}
            };

            gAssignedChart = new Chart(
                document.getElementById('assignedChart'),
                gAssignedConfig
            );
        }

        /*
         * Extract the data in chart form
         */
        function refresh() {

            var statusVal,
                assigned,
                alert;

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

            if(!initialised) {
                init()
            }

            var statusData = {};
            var assignedData = {};
            var alertData = {};
            if(cd.settings.finalStatus && cd.settings.statusQuestion) {
                for (var i = 0; i < results.length; i++) {

                    statusVal = results[i][cd.settings.statusQuestion];
                    assigned =  results[i]["_assigned"];
                    alert =  results[i]["_alert"];

                    if(!(statusVal === cd.settings.finalStatus && assigned === "")) {    // Ignore completed tasks that are not assigned

                        if(statusVal === "") {
                            statusVal = localise.set["c_none"];
                        }
                        if(assigned === "") {
                            assigned = localise.set["t_u"];
                        }

                        statusData[statusVal] = statusData[statusVal] || 0; // Ensure value is numeric
                        statusData[statusVal]++;

                        assignedData[assigned] = assignedData[assigned] || 0; // Ensure value is numeric
                        assignedData[assigned]++;

                        if(!(statusVal === cd.settings.finalStatus)) {      // Ignore completed
                            alertData[alert] = alertData[alert] || 0; // Ensure value is numeric
                            alertData[alert]++;
                        }
                    }
                }
            }

            /*
             * Show the charts
             */
            updateChart(gStatusConfig, statusData, gStatusChart);
            updateChart(gAssignedConfig, assignedData, gAssignedChart);
            updateChart(gAlertConfig, alertData, gAlertChart);

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