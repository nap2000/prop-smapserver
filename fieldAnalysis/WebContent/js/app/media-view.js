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
import { renderMedia } from "./plugins";

export function setMediaSurvey(view) {

	var $strip = $('#scrollable' + view.pId),
		mediaItems = view.results;

	if (typeof view.results[0].features === "undefined") {
		$strip.html('<div class="mg-empty">No data available for this survey</div>');
		return;
	}

	$strip.empty();
	renderMedia($strip[0], mediaItems);

	var $items = $strip.children();
	if ($items.length === 0) {
		$strip.html('<div class="mg-empty">No media found</div>');
		return;
	}

	var currentIdx = 0;

	function scrollThumbIntoView(idx) {
		var stripEl = $strip[0];
		var thumb = $items[idx];
		var left = thumb.offsetLeft;
		var w = thumb.offsetWidth;
		var sw = stripEl.clientWidth;
		var sl = stripEl.scrollLeft;
		if (left < sl) {
			stripEl.scrollLeft = left - 4;
		} else if (left + w > sl + sw) {
			stripEl.scrollLeft = left + w - sw + 4;
		}
	}

	function showItem(idx) {
		currentIdx = idx;
		$items.removeClass('active');
		$items.eq(idx).addClass('active');
		scrollThumbIntoView(idx);
		$('#mg_counter' + view.pId).text((idx + 1) + '\u2009/\u2009' + $items.length);
		media_show_full(view, $items.eq(idx));

		// Update nav button visibility
		$('#mg_prev' + view.pId).css('visibility', idx > 0 ? 'visible' : 'hidden');
		$('#mg_next' + view.pId).css('visibility', idx < $items.length - 1 ? 'visible' : 'hidden');
	}

	$items.on('click', function() {
		showItem($items.index(this));
	});

	$('#mg_prev' + view.pId).off().on('click', function() {
		if (currentIdx > 0) { showItem(currentIdx - 1); }
	});

	$('#mg_next' + view.pId).off().on('click', function() {
		if (currentIdx < $items.length - 1) { showItem(currentIdx + 1); }
	});

	// Keyboard arrow navigation
	$(document).off('keydown.mg' + view.pId).on('keydown.mg' + view.pId, function(e) {
		if (e.key === 'ArrowLeft' && currentIdx > 0) { showItem(currentIdx - 1); }
		else if (e.key === 'ArrowRight' && currentIdx < $items.length - 1) { showItem(currentIdx + 1); }
	});

	showItem(0);

	// Right-click to export image to report
	$strip.find('img.mg-thumb').bind("contextmenu", function(e) {
		var $this = $(this);
		var media = $this.attr("full"),
			thumbnail = $this.attr("src"),
			mediaType,
			mediaObj;

		if (thumbnail && thumbnail.indexOf("audio-icon") > -1) {
			mediaType = "audio";
		} else {
			mediaObj = getMedia(media);
			mediaType = mediaObj ? mediaObj.type : "photo";
			if (mediaType === "image") { mediaType = "photo"; }
		}

		gReport = {
			imageURL: media,
			title: "media",
			thumbnail_url: thumbnail,
			url: media,
			action: "new",
			type: mediaType,
			smap: { sId: view.sId, data_gen_type: mediaType }
		};

		$('#report_title').val(gReport.title);
		bootstrap.Modal.getOrCreateInstance(document.getElementById('reportContainer')).show();
		initialiseReportMap();
		return false;
	});
}

export function setMediaQuestion(view, mediaItems) {
	var $strip = $('#scrollable' + view.pId);
	$strip.html('<div class="mg-empty">Media view requires question set to "none"</div>');
}

function media_show_full(view, $item) {

	var $img = $('#mg_img' + view.pId);
	var $media = $('#mg_media' + view.pId);
	var url = $item.attr("full");
	var type = $item.attr("type");
	var source_type = $item.attr("source_type");

	if (type === "image") {
		$media.hide();
		$img.css('opacity', 0.4);
		var imgEl = new Image();
		imgEl.onload = function() {
			$img.attr("src", url).css('opacity', 1);
		};
		imgEl.src = url;
		$img.show();
	} else if (type === "audio") {
		$img.hide();
		$media.show().html('<audio controls><source src="' + url +
			'" type="' + source_type + '"/>Your browser does not support this audio type</audio>');
	} else if (type === "video") {
		$img.hide();
		$media.show().html('<video controls><source src="' + url +
			'" type="' + source_type + '">Your browser does not support this video type</video>');
	}
}



