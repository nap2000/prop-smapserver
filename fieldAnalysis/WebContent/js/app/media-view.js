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

import { getMedia } from "commonReportFunctions";
import globals from "globals";

export function setMediaSurvey(view) {
	
	var $image_wrap = $("#media_panel" + view.pId + " .image_wrap"),
		$flow_player_wrap = $("#media_panel" + view.pId + " .flow_player_wrap"),
		$scrollable = $('#scrollable' + view.pId),
		mediaItems = view.results,
		mediaType;
	
	if(typeof view.results[0].features === "undefined") {
		$scrollable.append("<h2>Error: No data available for this survey</h2>");
	} else {
		$flow_player_wrap.hide();	
		$image_wrap.show();
	
		$scrollable.empty();	// Empty out media viewer
		$image_wrap.find("img").attr("src", "img/blank.gif");
		
		// Add new media items
		$scrollable.mediaGeneratorSurvey(mediaItems);
		$("#scrollable" + view.pId + " img").off().click(function () {
				media_show_full(view, $(this));
			}).filter(":first").click();
		
		// Add a right click option to export to reports
		$("#scrollable" + view.pId + " img").bind("contextmenu", function(e) {
			$this = $(this);
			var media = $this.attr("full"),
				thumbnail = $this.attr("src");
			
			gReport = {
				imageURL: media, 
				title: "media", 
				thumbnail_url: thumbnail,
				url: media,
				action: "new",
				smap: {
					sId: view.sId
				}
			};
			
			if(thumbnail.indexOf("audio-icon") > -1) {
				mediaType = "audio";
			} else {
				mediaObj = getMedia(media);
				mediaType = mediaObj.type;
				if(mediaType === "image") {
					mediaType = "photo";		// Photo used instead of image in reports as per oembed
				}
			}
			gReport.type = mediaType;
			gReport.smap.data_gen_type = mediaType;
			
			$('#report_title').val(gReport.title);
			$('#reportContainer').dialog("open");
			initialiseReportMap();
			return false;
		});
	}
}

export function setMediaQuestion(view, mediaItems) {
	
	var $image_wrap = $("#media_panel" + view.pId + " .image_wrap"),
		$flow_player_wrap = $("#media_panel" + view.pId + " .flow_player_wrap"),
		$scrollable = $('#scrollable' + view.pId);
		
	
	$flow_player_wrap.hide();	
	$image_wrap.show();

	$scrollable.empty();	// Empty out media viewer
	$image_wrap.find("img").attr("src", "img/blank.gif");
	
	// Add new media items
	$scrollable.append("<h2>Error: Media view is not available for a specific question</h2>" +
			"<h2>Hint: Set question to \"none\"</h2>");

}

function media_show_full(view, $this) {
	
	var $image_wrap = $("#media_panel" + view.pId + " .image_wrap");
	var $media_wrap = $('#media_wrap' + view.pId);
	var style = ' width="512" height="344"';
	
	// see if same thumb is being clicked
	if ($(this).hasClass("active")) { return; }

	var url = $this.attr("full");
	var type = $this.attr("type");
	var source_type = $this.attr("source_type");

	$image_wrap.fadeTo("medium", 0.5);

	if(type == "image") {
		$media_wrap.hide();
		$image_wrap.show();
		var img = new Image();
		img.onload = function() {
			$image_wrap.fadeTo("fast", 1);
			$image_wrap.find("img").attr("src", url);
		};
		img.src = url;	// begin loading the image 
	} else if (type === "audio") {
		$media_wrap.show();
		$image_wrap.hide();

		$media_wrap.empty().append('<audio controls' + style + '><source src="' + url
			+ '" type="' + source_type + '"/>'
			+ 'Your browser does not support this audio type'
			+ '</audio>');
	} else if (type === "video") {
		$media_wrap.show();
		$image_wrap.hide();

		var content = '<video controls'
			+ style
			+ '><source src="' + url
			+ '" type="' + source_type + '">'
			+ 'Your browser does not support this video type'
			+ '</video>';

		$media_wrap.empty().append('<video controls'
			+ style
			+ '><source src="' + url
			+ '" type="' + source_type + '">'
			+ 'Your browser does not support this video type'
			+ '</video>');

	}

	// activate item
	$("#scrollable" + view.pId + " img").removeClass("active");
	$this.addClass("active");

}



