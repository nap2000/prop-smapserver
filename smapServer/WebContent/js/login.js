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
require.config({
    baseUrl: 'js/libs',
    waitSeconds: 0,
    locale: gUserLocale,
    paths: {
        app: '../app',
        lang_location: '..'
    },
    shim: {
        'app/common': ['jquery']
    }
});

require([
        'jquery',
        'app/common'],
    function($, localise) {

        $(document).ready(function() {
            var msg = "";
            var search = window.location.search;
            if (search.indexOf("?error") === 0) {
                msg = "Invalid username and/or password";
            } else if (search == "?loggedout") {
                msg = "Successfully logged out";
            } else if (search == "?banned") {
                msg = "Temporarily banned due to too many login attempts";
            }
            $("#msg").html(msg).show().removeClass('d-none');

            /*
             * Enable self registration
             */
            if(isSelfRegistrationServer()) {
                $('#signup').show().removeClass('d-none');
            } else {
                $('#signup').hide();
            }
        });

    });





