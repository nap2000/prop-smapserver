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

        var gChartData;
        var gStatusChart;
        var gStatusConfig;

        function init() {

            gStatusConfig = {
                type: 'pie',
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

            refresh();
        }

        /*
         * Extract the data in chart form
         */
        function refresh() {

            var statusVal,
                assigned;

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

            if(!gStatusConfig) {
                init()
            }

            gChartData = {};
            if(cd.settings.finalStatus && cd.settings.statusQuestion) {
                for (i = 0; i < results.length; i++) {
                    statusVal = results[i][cd.settings.statusQuestion];

                    assigned =  results[i]["assigned"];
                    if(!(statusVal === cd.settings.finalStatus && assigned === "")) {    // Ignore completed tasks that are not assigned

                        if(statusVal === "") {
                            statusVal = localise.set["c_none"];
                        }

                        gChartData[statusVal] = gChartData[statusVal] || 0;
                        gChartData[statusVal]++;
                    }
                }
            }

            console.log(gChartData);
            /*
             * Show the chart
             */
            gStatusConfig.data.labels = [];
            gStatusConfig.data.datasets[0].data = [];
            for (statusVal in gChartData) {
                gStatusConfig.data.labels.push(statusVal);
                gStatusConfig.data.datasets[0].data.push(gChartData[statusVal]);
            }
            gStatusChart.update();

        }
    });