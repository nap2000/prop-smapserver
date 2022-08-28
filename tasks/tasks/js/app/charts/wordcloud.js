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

requirejs.config({baseUrl:"js/libs",locale:gUserLocale,waitSeconds:0,paths:{app:"../app"},shim:{d3cloud2:["d3v3"]}}),define(["jquery","modernizr","localise","globals","d3v3","d3cloud2"],function(t,e,r,n,a){function o(t,e,r,n,o){function l(t){e.svg.append("g").attr("transform","translate("+[c>>1,u>>1]+")").selectAll("text").data(t).enter().append("text").style("font-size",function(t){return m(t.value)+"px"}).style("font-family","Impact").style("fill",function(t,e){return f(e)}).attr("text-anchor","middle").attr("transform",function(t){return"translate("+[t.x,t.y]+")rotate("+t.rotate+")"}).text(function(t){return t.key})}var c,u,i,s="wordcloud"===t.chart_type?0:60,d="wordcloud"===t.chart_type?0:60;i={top:(t.chart_type,40),right:"wordcloud"===t.chart_type?0:20,bottom:s,left:d},c=+n-i.left-i.right,u=+o-i.top-i.bottom;var f=a.scale.category20(),p=a.entries(r),m=a.scale.linear().domain([0,a.max(p,function(t){return t.value})]).range([6,40]);a.layout.cloud().size([c,u]).timeInterval(20).words(p).fontSize(function(t){return m(+t.value)}).text(function(t){return t.key}).rotate(function(){return 30*~~(2*Math.random())}).font("Impact").on("end",l).start()}function l(t,e,r,n,o,l){var c=(a.scale.category20(),a.entries(n));a.scale.linear().domain([0,a.max(c,function(t){return t.value})]).range([6,40]);a.layout.cloud().stop().words(c).start()}return{add:o,redraw:l}});