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

$(document).ready(function(){var a,e;a=String(document.location),e=a.indexOf("&mesg"),e>0&&(a=a.substring(0,e)),$("#media_btn_add").button().click(function(){$("#media_keys").val($(this).val()),$("#original_url").val(a),$("#add_media").dialog("open")}),$(".media_btn_add").click(function(){$("#media_keys").val($(this).val()),$("#original_url").val(a),$("#add_media").dialog("open")}),$(".media_btn_rem").click(function(){var a,e,i,o,d=String($(this).val()),t=[];addHourglass(),t=d.split(":"),t.length>1?(a=t[0],e=t[1],i=t.length>2?t[2]:-1,t.length>3&&(o=t[3]),$.ajax({type:"POST",url:"/surveyKPI/survey/"+a+"/remove_media",cache:!1,data:{qId:e,oId:i,text_id:o},success:function(a,e){removeHourglass(),window.location.reload(!0)},error:function(a,e){removeHourglass(),alert("Failed to delete media")}})):console.log("Error in removing media "+d)}),$("#add_media").dialog({autoOpen:!1,closeOnEscape:!0,draggable:!0,modal:!0,width:600,show:"drop",buttons:[{text:"Cancel",click:function(){$(this).dialog("close")}},{text:"Submit",click:function(){addHourglass(),document.add_media_form.submit(),$(this).dialog("close")}}]})});