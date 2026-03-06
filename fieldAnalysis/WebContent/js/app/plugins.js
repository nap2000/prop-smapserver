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

/*
 * Generate media thumbnail strip items
 */
export function renderMedia(el, data) {
	var html = [], th = -1, i;

	for (i = 0; i < data.length; i++) {
		$.each(data[i].features, function(j, feature) {
			$.each(feature.properties, function(key, value) {
				var media = getMedia(value);
				if (media) {
					if (media.type === 'image') {
						html[++th] = '<img class="mg-thumb" src="' + media.thumbNail +
							'" full="' + media.url +
							'" type="image" source_type="' + media.source_type + '" alt="photo" />';
					} else if (media.type === 'audio') {
						html[++th] = '<div class="mg-thumb mg-audio-item" full="' + media.url +
							'" type="audio" source_type="' + media.source_type + '">' +
							'<i class="fa fa-music"></i></div>';
					} else if (media.type === 'video') {
						html[++th] = '<div class="mg-thumb mg-video-item" full="' + media.url +
							'" type="video" source_type="' + media.source_type + '">' +
							'<i class="fa fa-film"></i></div>';
					}
				}
			});
		});
	}

	$(el).html(html.join(''));
}
