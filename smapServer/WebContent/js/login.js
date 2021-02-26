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

    }
});

require([
        'jquery',
        'app/localise'],
    function($, localise) {

        $(document).ready(function() {
            localise.setlang();		// Localise HTML

            $('.login_success, .login_failure').hide();

            $('#login_retry').click(function(){
                login();
            });

            $('#login_continue').click(function() {
                window.location.href = document.referrer;
            });

            login();


        });

        function login() {
            $.ajax({
                cache: false,
                url: "/authenticate/login.txt",
                success: function (data, status) {
                    if(data === 'loggedin') {
                        $('.login_failure').hide();
                        $('.login_success').show();
                        window.location.href = document.referrer;
                    } else {
                        $('.login_failure').show();
                        $('.login_success').hide();
                    }

                }, error: function (data, status) {
                    $('.login_failure').show();
                    $('.login_success').hide();

                }
            });
        }

    });





