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

define(["jquery","modernizr","localise","globals"],function(a,e,r,d){function t(a,e){var r,d;e.graph.setMargins(80,50,20,80),d=e.graph.addMeasureAxis("y","count"),a.groupDataNames.unshift("date"),r=e.graph.addCategoryAxis("x",["date","group"]),r.addOrderRule("Date"),e.graph.addSeries("group",dimple.plot.line),d.title=localise.set[a.fn]}function i(a,e){a.graph.data=e}return{add:t,redraw:i}});