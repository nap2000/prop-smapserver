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
 * Purpose: Show a completion message to a use that has finished a survey
 */
import "jquery";
import localise from "localise";

var gUserLocale = navigator.language;
if (Modernizr.localstorage) {
	gUserLocale = localStorage.getItem('user_locale') || navigator.language;
}

const $ = window.$;

$(document).ready(function() {

		localise.setlang();		// Localise HTML

		$('.sent').show();

		$('#goback').click(function(e){
			e.preventDefault();
			if(window.history.length > 2) {
				window.history.go(-2);
			} else {
				window.close();
			}
		})

	});
