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
 * Drawing bar charts
 */

"use strict";

define([
        'jquery',
        'modernizr',
        'localise',
        'globals',
        'd3',
        'localise'],
    function ($, modernizr, lang, globals, d3, localise) {


        return {
            add: add,
            redraw: redraw
        };


        /*
         * Add
         */
        function add(chart, config, data, widthContainer, heightContainer) {

            var barWidth,
                width,
                height,
                format,
                margin;

            if (chart.fn === "percent") {
                format = "%";
            }

            // Allow space for labels if needed
            margin = {top: 40, right: 20, bottom: 60, left: 60};
            width = +widthContainer - margin.left - margin.right;
            height = +heightContainer - margin.top - margin.bottom;

            config.x = d3.scaleBand().rangeRound([0, width]).padding(0.1);
            config.x.domain(data.map(function (d) {
                if (!d.key || d.key === "") {
                    return localise.set["c_undef"];
                } else {
                    return d.key;
                }
            }));
            barWidth = config.x.bandwidth();

            config.y = d3.scaleLinear().rangeRound([height, 0]);
            config.y.domain([0, d3.max(data, function (d) {
                return +d.value;
            })]).nice();

            config.xAxis = d3.axisBottom(config.x);
            config.yAxis = d3.axisLeft(config.y).ticks(10, format);

            config.g = config.svg.append("g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

            config.g.append("g")
                .attr("class", "axis axis--x")
                .attr("transform", "translate(0," + height + ")")
                .call(config.xAxis);

            // Add y-axis label
            config.ylabel = config.svg.append("text")
                .attr("text-anchor", "middle")
                .attr("transform", "translate(" + (margin.left / 3) + "," + (height / 2) + ")rotate(-90)");


            config.g.append("g")
                .attr("class", "axis axis--y")
                .call(config.yAxis);


        }

        /*
         * Update a bar chart
         */
        function redraw(chart, config, data, widthContainer, heightContainer) {

            var barWidth,
                width,
                height,
                margin,
                labelId,
                format = "";

            if (chart.fn === "percent") {
                format = "%";
            }

            // Allow space for labels if needed
            var bottom_margin = chart.chart_type === "wordcloud" ? 0 : 60;
            var left_margin = chart.chart_type === "wordcloud" ? 0 : 60;
            var top_margin = chart.chart_type === "wordcloud" ? 40 : 40;
            var right_margin = chart.chart_type === "wordcloud" ? 0 : 20;

            margin = {top: 40, right: 20, bottom: 60, left: 60};
            width = +widthContainer - margin.left - margin.right;
            height = +heightContainer - margin.top - margin.bottom;

            config.x.domain(data.map(function (d) {
                if (!d.key || d.key === "") {
                    return localise.set["c_undef"];
                } else {
                    return d.key;
                }
            }));
            barWidth = config.x.bandwidth();
            config.y.domain([0, d3.max(data, function (d) {
                return d.value;
            })]);

            // Update axes
            config.svg.select(".axis--y")
                .call(config.yAxis.ticks(5, format));
            config.svg.select(".axis--x")
                .call(config.xAxis)
                .selectAll("text")
                .style("text-anchor", "end")
                .attr("dx", "-.8em")
                .attr("dy", ".15em")
                .attr("transform", "rotate(-45)");


            if (chart.fn === "avgdurn") {
                if (chart.scale === "seconds") {
                    labelId = "d_sec";
                } else if (chart.scale === "minutes") {
                    labelId = "d_min";
                } else {
                    labelId = "d_hour";
                }
            } else {
                labelId = chart.fn;
            }
            config.ylabel.text(localise.set[labelId]);

            var bars = config.g.selectAll(".bar").data(data, function (d) {
                return d.key;
            });

            // Bars being removed
            bars.exit()
                .transition()
                .duration(300)
                .attr("y", config.y(0))
                .attr("height", height - config.y(0))
                .remove();

            // New bars
            bars.enter()
                .append("rect")
                .attr("class", "bar")
                .attr("x", function (d) {
                    if (!d.key || d.key === "") {
                        return config.x(localise.set["c_undef"]);
                    } else {
                        return config.x(d.key);
                    }
                })
                .attr("y", function (d) {
                    return config.y(d.value);
                })
                .attr("width", barWidth)
                .attr("height", function (d) {
                    return height - config.y(d.value);
                });

            // Bars being update
            bars.transition()
                .duration(300)
                .attr("x", function (d) {
                    if (!d.key || d.key === "") {
                        return config.x(localise.set["c_undef"]);
                    } else {
                        return config.x(d.key);
                    }
                })
                .attr("y", function (d) {
                    return config.y(d.value);
                })
                .attr("width", barWidth)
                .attr("height", function (d) {
                    return height - config.y(d.value);
                });

        }


    });