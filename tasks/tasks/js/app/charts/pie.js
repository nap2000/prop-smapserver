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

define(["jquery","modernizr","localise","globals"],function(a,e,g,r){function t(a,e){var g,r;e.graph.setMargins(80,50,20,80),"count"===a.fn?(g=e.graph.addMeasureAxis("p","count"),r=e.graph.addSeries(a.groupDataNames[0],dimple.plot.pie)):"duration"===a.groups[0].type?(g=e.graph.addMeasureAxis("p","Survey Duration"),r=e.graph.addSeries(a.groupDataNames[1],dimple.plot.pie)):(g=e.graph.addMeasureAxis("p",a.groupDataNames[0]),r=e.graph.addSeries(a.groupDataNames[1],dimple.plot.pie)),"average"===a.fn?r.aggregate=dimple.aggregateMethod.avg:"max"===a.fn?r.aggregate=dimple.aggregateMethod.max:"min"===a.fn?r.aggregate=dimple.aggregateMethod.min:"sum"===a.fn&&(r.aggregate=dimple.aggregateMethod.sum),g.title=a.dataLabels.join(" / ")+" ("+a.fn+")"}function d(a,e){a.graph.data=e}return{add:t,redraw:d}});