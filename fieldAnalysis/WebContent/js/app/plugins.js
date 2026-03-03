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
 * Generate media data
 */
export function renderMedia(el, data) {
	var html = [],
		th = -1,
		setSize = 4,
		count = setSize,
		i;

	for(i = 0; i < data.length; i++) {
		$.each(data[i].features, function(j, features) {
			$.each(features.properties, function(key, value) {
				var media = getMedia(value);
				if(media) {
					var inSet = count % setSize;
					if(!inSet) {
						if(setSize != count) {
							html[++th] = '</div>';
						}
						html[++th] = '<div>';
					}
					html[++th] = '<img src="' + media.thumbNail + '" full="' + media.url + '" type="' +
							media.type + '" source_type="' + media.source_type + '" alt="' + media.type + '" />';
					++count;
				}
			});
		});
	}

	if(setSize != count) {
		html[++th] = '</div>';
	}

	$(el).html(html.join(''));
}
