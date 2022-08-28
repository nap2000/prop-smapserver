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

define(["jquery","modernizr","localise","globals","localise"],function(a,e,r,g,t){function d(a,e){var r,g,d;e.graph.setMargins(120,50,20,50),r="count"===a.fn?e.graph.addMeasureAxis("x","count"):"duration"===a.groups[0].type?e.graph.addMeasureAxis("x","Survey Duration"):e.graph.addMeasureAxis("x",a.groupDataNames[0]),a.tSeries?(a.groupDataNames.unshift("date"),g=e.graph.addCategoryAxis("y",["date","group"]),g.addOrderRule("Date"),e.graph.addSeries("group",dimple.plot.bar)):"count"===a.fn?1===a.groupDataNames.length?(g=e.graph.addCategoryAxis("y",a.groupDataNames[0]),d=e.graph.addSeries(null,dimple.plot.bar)):(g=e.graph.addCategoryAxis("y",a.groupDataNames),d=e.graph.addSeries(a.groupDataNames[1],dimple.plot.bar)):1===a.groupDataNames.length?(g=e.graph.addCategoryAxis("y",a.fn),d=e.graph.addSeries(null,dimple.plot.bar)):(g=e.graph.addCategoryAxis("y",a.groupDataNames[1]),d=e.graph.addSeries(a.groupDataNames[1],dimple.plot.bar)),"average"===a.fn?d.aggregate=dimple.aggregateMethod.avg:"max"===a.fn?d.aggregate=dimple.aggregateMethod.max:"min"===a.fn?d.aggregate=dimple.aggregateMethod.min:"sum"===a.fn&&(d.aggregate=dimple.aggregateMethod.sum),g.title=a.dataLabels.join(" / "),r.title=t.set[a.fn]}function p(a,e){a.graph.data=e}return{add:d,redraw:p}});