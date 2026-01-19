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
 * Purpose: Manage the panels that display graphs, maps etc of results data
 */

"use strict";

import bootbox from "../../../smapServer/WebContent/js/libs/bootbox.min";
import "../../../smapServer/WebContent/js/app/localise";
import "../../../smapServer/WebContent/js/app/globals";
import "../../../smapServer/WebContent/js/app/common";
import "../../../smapServer/WebContent/js/libs/wb/plugins/slimscroll/jquery.slimscroll";
import "../../../smapServer/WebContent/js/libs/bootstrap-colorpicker.min";
import "../../../smapServer/WebContent/js/libs/bootstrap-datetimepicker-4.17.47";
import "../../../smapServer/WebContent/js/libs/jquery-qrcode-0.14.0.min";

const moment = window.moment;
const localise = window.localise;
const globals = window.globals;

var gUserLocale = navigator.language;
if (typeof localStorage !== "undefined") {
	try {
		gUserLocale = localStorage.getItem('user_locale') || navigator.language;
	} catch (error) {
		gUserLocale = navigator.language;
	}
}
window.gUserLocale = gUserLocale;
window.bootbox = bootbox;

localise.initLocale(gUserLocale).then(function () {
	window.moment = window.moment || moment;

	import(/* webpackMode: "eager" */ "./usermanagement_main");
});
