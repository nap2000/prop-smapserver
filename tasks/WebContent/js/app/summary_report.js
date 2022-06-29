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
    function ($, modernizr, lang, globals) {

        var gCharts = [];
        
        return {
            getXLSData: getXLSData
        };

        function init(chartView, timingView) {

        }

        /*
         * Get XLS Data from charts
         * If all data is set true then ignore the current charts and generate counts for all questions
         */
        function getXLSData(alldata) {

            var results = globals.gMainTable.rows({
                order: 'current',  // 'current', 'applied', 'index',  'original'
                page: 'all',      // 'all',     'current'
                search: 'applied',     // 'none',    'applied', 'removed'
            }).data();

            var i,
                data,
                chart,
                chartArray = [],
                dataLength = results.count(),
                xlsResponse = [],
                groupIdx;

            if(alldata) {
                // Create an array of dummy charts that will generate the counts
                var columns = gTasks.cache.currentData.schema.columns;
                for (i = 0; i < columns.length; i++) {
                    if (columns[i].chartQuestion) {

                        chart = {
                            title: columns[i].select_name ? columns[i].select_name : columns[i].displayName,
                            tSeries: false,
                            chart_type: "other",
                            fn: getChartFunction(columns[i].type),
                            groups: [{
                                name: columns[i].select_name ? columns[i].select_name  : columns[i].displayName,
                                dataLabel: columns[i].select_name ? columns[i].select_name  : columns[i].displayName,
                                l_id: columns[i].l_id,
                                type: columns[i].type
                            }
                            ]
                        }

                        if (columns[i].type === "select") {
                            chart.groups[0].choiceNames = columns[i].choiceNames;
                            chart.groups[0].choices = columns[i].choices;
                        }

                        groupIdx = $('#srf_group').val();
                        if(groupIdx == i) {
                            continue;   // Don't create a chart of the question grouped by itself
                        }
                        if(groupIdx != -1) {
                            chart.groups.push({
                                name: columns[groupIdx].select_name ? columns[groupIdx].select_name  : columns[groupIdx].displayName,
                                    dataLabel: columns[groupIdx].select_name ? columns[groupIdx].select_name  : columns[groupIdx].displayName,
                                l_id: columns[groupIdx].l_id,
                                type: columns[groupIdx].type
                            });

                            if (columns[groupIdx].type === "select" || columns[groupIdx].type === "select1") {
                                chart.groups[1].choiceNames = columns[groupIdx].choiceNames;
                                chart.groups[1].choices = columns[groupIdx].choices;
                            }
                        }
                        chartArray.push(chart);
                    }
                }
            } else {
                chartArray = gCharts;
            }

            for (i = 0; i < chartArray.length; i++) {

                chart = chartArray[i];
                data = processData(results, chart, dataLength);
                getXlsResponseObject(xlsResponse, chart, data);

            }

            return xlsResponse;
        }


        /*
         * Add a charts data to the xlsResponse object if the data is to be sent to an XLS export
         * The data has to be transformed into a two dimensional array so it can be processed by the Java server
         */
        function getXlsResponseObject(xlsResponse, chart, data) {
            var newData,
                twoDim = [],
                i, j, k,
                add = false;

            if (chart.tSeries) {
                newData = data;
                add = true;

            } else if (chart.chart_type === "wordcloud") {
                // the data for word clouds is in an object
                 add = true;
                 for (var p in data) {
                    if (data.hasOwnProperty(p)) {
                        twoDim.push({
                            key: p,
                            pr: [{
                                key: chart.groups[0].dataLabel,
                                value: data[p]
                            }]
                        });
                     }
                 }

            } else {
                // Rollup the data as per the chart settings

                var add = true;
                var rows = data.length;
                if(chart.fn === "percent" && rows === 0) {
                    return;
                }

                var groupsObject = {};
                // Get the number of entries per row for calculating percentage
                if(chart.fn === "percent") {
                    var groupRows = d3.nest()
                        .key(function (d) {
                            return d[chart.groups[1].name];
                        })
                        .rollup(function (v) {
                            return v.length;
                        })
                        .entries(data);

                    for(i = 0; i < groupRows.length; i++) {
                        groupsObject["x" + groupRows[i].key] = groupRows[i].value;
                    }
                }

                if(chart.groups.length === 1) {
                    if(chart.fn === "count" || chart.fn === "percent") {

                        newData = d3.nest()
                            .key(function (d) {
                                return d[chart.groups[0].name];
                            })
                            .rollup(function (v) {
                                if(chart.fn === "count") {
                                    return v.length;
                                } else {
                                    return v.length * 100 / rows;
                                }
                            })
                            .entries(data);
                    } else {
                        newData = d3.nest()
                            .key(function (d) {
                                return chart.groups[0].name;
                            })
                            .rollup(function (v) {
                               if (chart.fn === "average") {
                                    return d3.mean(v, function (d) {
                                        var val = +d[chart.groups[0].name];
                                        return val;
                                    });
                                } else if(chart.fn === "sum") {
                                    return d3.sum(v, function (d) {
                                       var val = +d[chart.groups[0].name];
                                       return val;
                                    });
                                } else if(chart.fn === "min") {
                                   return d3.min(v, function (d) {
                                       var val = +d[chart.groups[0].name];
                                       return val;
                                   });
                               } else if(chart.fn === "max") {
                                   return d3.max(v, function (d) {
                                       var val = +d[chart.groups[0].name];
                                       return val;
                                   });
                               }
                            })
                            .entries(data);
                    }
                } else {
                    if(chart.fn === "count" || chart.fn === "percent") {

                        newData = d3.nest()
                            .key(function (d) {
                                return d[chart.groups[0].name];
                            })
                            .key(function (d) {
                                return d[chart.groups[1].name];
                            })
                            .rollup(function (v) {
                                return v.length;
                            })
                            .entries(data);

                        if(chart.fn === "percent") {
                            for(i = 0; i < newData.length; i++) {
                                for(j = 0; j < newData[i].values.length; j++) {
                                    if (groupsObject["x" + newData[i].values[j].key] == 0) {
                                        newData[i].values[j].value = 0;
                                    } else {
                                        newData[i].values[j].value = newData[i].values[j].value * 100 / groupsObject["x" + newData[i].values[j].key];
                                    }
                                }
                            }
                        }
                    } else {
                        newData = d3.nest()
                            .key(function (d) {
                                return d[chart.groups[1].name];
                            })
                            .rollup(function (v) {
                               if (chart.fn === "average") {
                                   return d3.mean(v, function (d) {
                                       var val = +d[chart.groups[0].name];
                                       return val;
                                   });
                                } else if(chart.fn === "sum") {
                                    return d3.sum(v, function (d) {
                                        var val = +d[chart.groups[0].name];
                                        return val;
                                    });
                                } else if(chart.fn === "min") {
                                   return d3.min(v, function (d) {
                                       var val = +d[chart.groups[0].name];
                                       return val;
                                   });
                               } else if(chart.fn === "max") {
                                   return d3.max(v, function (d) {
                                       var val = +d[chart.groups[0].name];
                                       return val;
                                   });
                               }
                            })
                            .entries(data);
                    }
                }

                // Get the array of labels
                var labelArray = [];
                for(i = 0; i < chart.groups.length; i++) {
                    labelArray.push(chart.groups[i].dataLabel);
                }

                // Get the array of columns
                var columnArray = [];
                if(chart.groups.length === 2 && (chart.fn === "count" || chart.fn === "percent")) {
                    for(i = 0; i < newData.length; i++) {
                        for(j = 0; j < newData[i].values.length; j++) {
                            var key = newData[i].values[j].key;
                            if(columnArray.indexOf(key) < 0) {
                                columnArray.push(key);
                            }
                        }
                    }
                }

                // Normalise 2 dimensional array
                for(i = 0; i < newData.length; i++) {

                    var item = {
                        key: newData[i].key,
                        pr: []
                    };

                    if(chart.groups.length === 1 || (chart.fn !== "count" && chart.fn !== "percent")) {
                        item.pr.push({
                            key: chart.fn,
                            value: newData[i].value
                        });
                    }
                    if(chart.groups.length === 2) {
                        for(j = 0; j < columnArray.length; j++) {
                            var hasValue = false;
                            for(k = 0; k < newData[i].values.length; k++) {
                                if(newData[i].values[k].key === columnArray[j]) {
                                    item.pr.push({
                                        key: columnArray[j],
                                        value: newData[i].values[k].value
                                    });
                                    hasValue = true;
                                    break;
                                }
                            }
                            if(!hasValue) {
                                item.pr.push({
                                    key: columnArray[j],
                                    value: 0
                                });
                            }

                        }

                    }

                    twoDim.push(item);
                }

            }

            var responseItem = {
                chart_type: chart.chart_type,
                name: chart.title,
                fn: chart.fn,
                labels: labelArray,
                columns: columnArray,
                data: twoDim
            };

            xlsResponse.push(responseItem);

        }

        /*
         * Generate data suitable for charting from the results
         */
        function processData(results, chart, dataLength) {
            var i, j,
                columns = gTasks.cache.currentData.schema.columns,
                datalabel = chart.qlabel ? 'label' : 'name';

            if (!gTasks.cache.surveyConfig.processedData) {
                gTasks.cache.surveyConfig.processedData = {};
            }

            if (chart.groups[0].type === "select" || (chart.groups.length > 1 && chart.groups[1].type === "select")) {
                return processSelectMultipleData(results, chart, dataLength);
            } else {
                if (!gTasks.cache.surveyConfig.processedData[datalabel]) {

                    gTasks.cache.surveyConfig.processedData[datalabel] = [];
                    for (i = 0; i < results.length; i++) {
                        var di = {};
                        di.count = 1;
                        for (j = 0; j < columns.length; j++) {
                            var val = results[i][columns[j].column_name];
                            if(columns[j].l_id > 0) {
                                if(chart.qlabel) {
                                    val = lookupChoiceLabel(columns[j].l_id, val);  // Convert to the default label
                                }
                            }
                            di[columns[j].displayName] = val;
                        }
                        if (!di["Survey Duration"]) {         // Make sure durations have a number
                            di["Survey Duration"] = 0;
                        }
                        di["Survey Duration"] = +di["Survey Duration"];
                        gTasks.cache.surveyConfig.processedData[datalabel].push(di);
                    }
                }
                return gTasks.cache.surveyConfig.processedData[datalabel];
            }
        }


        /*
         * Process the wordcloud data
         */
        function processSelectMultipleData(results, chart, dataLength) {

            var data = [],
                groups,
                i, j,
                selM,
                nonM,
                row,
                choiceValues,
                val,
                selectedValues;

            // Get index of select multiple
            groups = chart.groups;
            if(chart.groups[0].type == "select") {
                selM = chart.groups[0];
                if(chart.groups.length > 0) {
                    nonM = chart.groups[1];
                }
            } else {
                nonM = chart.groups[0];
                selM = chart.groups[1];
            }

            // Get the choice values from the choices which have the question name in them
            var choiceLists = gTasks.cache.currentData.schema.choiceLists;
            for(i = 0; i < choiceLists.length; i++) {
                if(choiceLists[i].l_id == selM.l_id) {
                    choiceValues = choiceLists[i].choices;
                    break;
                }
            }

            for(i = 0; i < results.length; i++) {
                if(results[i][selM.dataLabel]) {
                    selectedValues = results[i][selM.dataLabel].split(" ");

                    for(j = 0; j < selectedValues.length; j++) {
                        // add a row
                        row = {
                            count: 1
                        };

                        if(chart.qlabel) {
                            val = lookupChoiceLabel(selM.l_id, selectedValues[j]);
                        } else {
                            val = selectedValues[j];
                        }

                        row[selM.dataLabel] = val;
                        if(nonM) {
                            row[nonM.dataLabel] = results[i][nonM.dataLabel];
                        }
                        data.push(row);
                    }
                }

            }

            return data;
        }

        /*
         * get the chart function from the question type
         */
        function getChartFunction(type) {
            if(type === "decimal" || type === "int" || type === "duration") {
                // numeric
                return $('#srf_num_fn').val();
            } else {
                return $('#srf_text_fn').val();
            }
        }

    });
