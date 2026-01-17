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

/*
 * Functions for using aws services
 *
 */

"use strict";

var gLanguages;

import $ from "jquery";
import localise from "./localise";
import globals from "./globals";

export default {
	setLanguageSelect: setLanguageSelect
};

		function setLanguageSelect ($elem, type, callback) {

			if(gLanguages) {
					updateSelection($elem, type, callback);
			} else {
					getLanguages($elem, type, callback);
			}
		}

		function updateSelection($elem, type, callback) {
			var h = [],
				idx = -1,
				i;

			for(i = 0; i < gLanguages.length; i++) {
				if(gLanguages[i][type]) {
					h[++idx] = '<option value="';
					h[++idx] = gLanguages[i].code;
					h[++idx] = '">';
					h[++idx] = htmlEncode(gLanguages[i].name);
					h[++idx] = '</option>';
				}
			}
			$elem.empty().html(h.join(''));
			if(typeof callback === "function") {
				callback();
			}
		}

		function getLanguages($elem, type, callback) {
			addHourglass();
			$.ajax({
				url: "/surveyKPI/language_codes",
				dataType: 'json',
				cache: false,
				success: function(data) {
					removeHourglass();
					var $e = $elem;
					var t = type;
					var cb = callback;
					gLanguages = data;
					updateSelection($e, t, cb);
				},
				error: function(xhr, textStatus, err) {
					removeHourglass();
					if(xhr.readyState == 0 || xhr.status == 0) {
						return;  // Not an error
					} else {
						alert(localise.set["c_error"] + ": " + err);
					}
				}
			});
		}
