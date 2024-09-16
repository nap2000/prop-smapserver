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

var gUserLocale = navigator.language;
if (Modernizr.localstorage) {
    gUserLocale = localStorage.getItem('user_locale') || navigator.language;
}

"use strict";

$(document).ready(function() {

    let count = 0;      // The number of timea the user has previously tried to logon
    if (typeof(localStorage) !== "undefined") {

        setTheme(true);
        setLogo();

        count = localStorage.getItem("login_count");
        let loginStart = localStorage.getItem("login_start");   // seconds
        let loginTime = Date.now() / 1000;

        /*
         * Handle initialisation of variables
         */
        if (!count) {
            count = 0;
        } else {
            count = parseInt(count);
        }
        if (!loginStart) {
            loginStart = loginTime;
            localStorage.setItem("login_start", loginStart);
        } else {
            loginStart = parseInt(loginStart);
        }

        /*
         * Handle reset if more than 60 seconds has elapsed since last logon
         */
        if ((loginTime - loginStart) > 60) {
            count = 0;   // reset
        }

        /*
         * Save latest values of login count variables
         */
        if (count === 0) {
            localStorage.setItem("login_start", loginTime);
        }

        /*
         * Record this logon attempt
         */
        localStorage.setItem("login_count", count + 1);

        /*
         * Put up message saying the user may need to reset their password
         */
        if(count > 0) {
            $('#logon_alert').removeClass('d-none').show().text("The username or password you entered is incorrect");
        } else {
            $('#logon_alert').addClass('d-none');
        }
    }

});






