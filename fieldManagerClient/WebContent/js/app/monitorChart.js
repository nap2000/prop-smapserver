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

        }

        function initProgressChart() {
            gProgressConfig = {
                type: 'bar',
                data: {
                    labels: [],
                    datasets: [{
                        label: localise.set["c_opened"],
                        backgroundColor: 'rgb(255, 00, 00)',
                        borderColor: 'rgb(255, 00, 00)',
                        data: [],
                    },
                        {
                            label: localise.set["c_closed"],
                            backgroundColor: 'rgb(00, 64, 00)',
                            borderColor: 'rgb(00, 64, 00)',
                            data: [],
                        }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                }
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

            if(!initialised) {
                init()
            }

            /*
             * Show the charts
             */
            updateProgressChart(gProgressConfig, gMonitor.cache.caseProgress, gProgressChart);

        }

        function updateProgressChart(config, data, chart) {
            var i;
            config.data.labels = [];
            config.data.datasets[0].data = [];
            for (i = 0; i < data.length; i++) {
                config.data.labels.push(data[i].day);
                config.data.datasets[0].data.push(data[i].opened);
                config.data.datasets[1].data.push(data[i].closed);
            }
            chart.update();
        }
    });