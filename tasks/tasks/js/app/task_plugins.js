/*
 This file is part of SMAP.

 SMAP is free software: you can redistribute it and/or modify
 it under the terms of the GNU General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 SMAP is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.

 You should have received a copy of the GNU General Public License
 along with SMAP.  If not, see <http://www.gnu.org/licenses/>.

 */

function addSelectCheckBox(o,e,t){var n=[],a=-1;return n[++a]="<td><input type=",n[++a]=o?'"radio"':'"checkbox"',n[++a]='name="taskgroup"',n[++a]=' class="taskgroup" value="',n[++a]=e,n[++a]='"',t&&(n[++a]=" checked"),n[++a]="></td>",n.join("")}function addPie(o,e){return o=o||0,e=e||1,'<td><span class="pie">'+o+"/"+e+"</span></td>"}window.log=function(){log.history=log.history||[],log.history.push(arguments),arguments.callee=arguments.callee.caller,this.console&&console.log(Array.prototype.slice.call(arguments))},function(o){function e(){}for(var t,n="assert,count,debug,dir,dirxml,error,exception,group,groupCollapsed,groupEnd,info,log,markTimeline,profile,profileEnd,time,timeEnd,trace,warn".split(",");t=n.pop();)o[t]=o[t]||e}(window.console=window.console||{}),function(o){o.fn.generateTaskGroupTable=function(e){var t={rowClass:"",colClass:"ui-widget-content",fields:[],nodataString:"No records found.",data:{}};return this.each(function(){e&&o.extend(t,e);var n,a,r=[],l=-1,i=o(this);for(n=0;n<t.data.length;n++)a=t.data[n],r[++l]="<tr>",r[++l]=addSelectCheckBox(!0,a.tg_id,0==n),0==n&&(globals.gCurrentTaskGroup=a.tg_id),r[++l]="<td>",r[++l]=a.name,r[++l]="</td>",r[++l]=addPie(a.completeTasks,a.totalTasks),r[++l]="<td>",r[++l]=a.totalTasks-a.completeTasks,r[++l]="</td>",r[++l]="</tr>";i.append(r.join(""))})}}(jQuery);