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

"use strict";

import localise from './app/localise.js';
import {
    addHourglass,
    removeHourglass
} from './app/common.js';

const $ = window.$;

var gUserLocale = navigator.language;
if (Modernizr.localstorage) {
    gUserLocale = localStorage.getItem('user_locale') || navigator.language;
}
window.gUserLocale = gUserLocale;

localise.initLocale(gUserLocale).then(function () {

    var gToken;
    var gSubscribe;

    $(document).ready(function () {

        var i,
            params,
            pArray = [],
            param = [];


        setCustomSubscriptions();			// Apply custom javascript
        localise.setlang();

        // Get the authentication token if it has been passed in parameters
        params = location.search.substr(location.search.indexOf("?") + 1)
        pArray = params.split("&");
        for (i = 0; i < pArray.length; i++) {
            param = pArray[i].split("=");
            if ( param[0] === "token" ) {
                gToken = param[1];
            } else if ( param[0] === "subscribe" ) {
                gSubscribe = param[1];
            }
        }

        $('.hideme').hide();
        if(gToken && !gSubscribe) {
            $('#heading').text(localise.set["c_unsubscribe"]);
            $('#unsubscribe').show();
        } else if(gToken && gSubscribe) {
            $('#heading').text(localise.set["c_subscribe"]);
            $('#subscribe2').show();
        } else {
            $('#heading').text(localise.set["r_s"]);
            $('#subscribe').show();
        }

        // Unsubscribe
        $('#unsubscribeSubmit').click(function (e) {
            e.preventDefault();

            addHourglass();
            $.ajax({
                cache: false,
                url: "/surveyKPI/subscriptions/unsubscribe/" + gToken,
                success: function (data, status) {
                    removeHourglass();
                    showResult(localise.set["msg_uns"]);
                }, error: function (data, status) {
                    removeHourglass();
                    alert(data.responseText);
                }
            });
        });

        // subscribe with a token
        $('#subscribe2Submit').click(function (e) {
            e.preventDefault();

            addHourglass();
            $.ajax({
                cache: false,
                url: "/surveyKPI/subscriptions/subscribe/" + gToken,
                success: function (data, status) {
                    removeHourglass();
                    showResult(localise.set["msg_s2"]);
                }, error: function (data, status) {
                    removeHourglass();
                    alert(data.responseText);
                }
            });
        });

        /*
         * Ask to re-subscribe.  The server emails the address a confirm link for each
         * organisation it has unsubscribed from.  It says the same whatever the address, so the
         * page does not show anyone which organisations an address belongs to.
         */
        $('#requestSubscribe').click(function (e) {
            e.preventDefault();

            if (!$('#subscribeForm')[0].checkValidity()) {
                $('#subscribeForm')[0].reportValidity()
            } else {

                addHourglass();
                $.ajax({
                    cache: false,
                    type: "POST",
                    url: "/surveyKPI/subscriptions/subscribe",
                    data: {
                        email: $('#email').val()
                    },
                    success: function (data, status) {
                        removeHourglass();
                        showResult(localise.set["msg_s4"]);
                    }, error: function (data, status) {
                        removeHourglass();
                        alert(data.responseText);
                    }
                });
            }
        });

    });


    /*
     * Replace the panel with the outcome so that the action cannot be repeated
     */
    function showResult(msg) {
        $('.hideme').hide();
        $('#result_msg').text(msg);
        $('#result').show();
    }

});


