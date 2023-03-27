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
requirejs.config({
    baseUrl: '/js/libs',
    waitSeconds: 0,
    locale: gUserLocale,
    paths: {
        app: '/js/app',
        bootbox: 'bootbox.min',
        lang_location: '/js'
    },
    shim: {
    }
});

require([
    'jquery',
    'app/localise',
    'app/common',
    'bootbox'
], function ($, localise, common, bootbox) {

    var gToken;
    var gSubscribe;
    var gOrgList;

    $(document).ready(function () {

        window.bootbox = bootbox;
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

        $('#email').keyup(function() {
            $('#org_list').hide();
            $('#org_empty').hide();
        });

        // Unsubscribe
        $('#unsubscribeSubmit').click(function (e) {
            e.preventDefault();

            addHourglass();
            $.ajax({
                cache: false,
                url: "/surveyKPI/subscriptions/unsubscribe/" + gToken,
                success: function (data, status) {
                    removeHourglass();
                    alert(localise.set["msg_uns"]);
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
                    alert(localise.set["msg_s2"]);
                }, error: function (data, status) {
                    removeHourglass();
                    alert(data.responseText);
                }
            });
        });

        // Validate email as part of self subscription
        $('#validateEmail').click(function (e) {
            e.preventDefault();

            if (!$('#subscribeForm')[0].checkValidity()) {
                $('#subscribeForm')[0].reportValidity()
            } else {

                var email = $('#email').val();

                addHourglass();
                $.ajax({
                    cache: false,
                    type: "GET",
                    dataType: 'json',
                    url: "/surveyKPI/subscriptions/validateEmail/" + encodeURIComponent(email),
                    success: function (data, status) {
                        removeHourglass();
                        if (data && data.length > 0) {
                            $('#org_list').show();
                            $('#org_empty').hide();
                            updateOrgList(data);
                        } else {
                            $('#org_list').hide();
                            $('#org_empty').show();

                        }
                    }, error: function (data, status) {
                        removeHourglass();
                        alert(data.responseText);
                    }
                });
            }
        });

    });


    /*
     * Update the oganisation list
     */
    function updateOrgList(data) {

        var $selector=$('#org_list'),
            i,
            h = [],
            idx = -1;

        gOrgList = data;

        h[++idx] = '<div class="mt-2">';

        h[++idx] = '<b><div class="row">';

        h[++idx] = '<div class="col-lg-4 col-xs-8">';
        h[++idx] = localise.set["r_o_n"];
        h[++idx] = '</div>';


        h[++idx] = '<div class="col-lg-2 col-xs-4">';
        h[++idx] = '</div>';

        h[++idx] = '</div></b>';        // Header row

        for(i = 0; i < data.length; i++) {

            h[++idx] = '<div class="row">';

            // name
            h[++idx] = '<div class="col-lg-4 col-xs-8">';
            h[++idx] = data[i].name;
            h[++idx] = '</div>';

            // actions
            h[++idx] = '<div class="col-lg-2 col-xs-4">';

            h[++idx] = '<button type="button" value="';
            h[++idx] = i;
            h[++idx] = '" class="btn btn-default btn-sm subscribe_org">';
            h[++idx] = localise.set["c_subscribe"];
            h[++idx] = '</button>';

            h[++idx] = '</div>';            // end actions

            h[++idx] = '</div>';            // end row
        }
        h[++idx] = '</div>';

        $selector.empty().append(h.join(''));


        // Self subscribe
        $('.subscribe_org').click(function (e) {
            e.preventDefault();

            if (! $('#subscribeForm')[0].checkValidity()) {
                $('#subscribeForm')[0].reportValidity()
            } else {

                var email = $('#email').val();
                var oId = gOrgList[$(this).val()].id;

                addHourglass();
                $.ajax({
                    cache: false,
                    type: "POST",
                    url: "/surveyKPI/subscriptions/subscribe",
                    data: {
                        email: email,
                        oId: oId
                    },
                    success: function (data, status) {
                        removeHourglass();
                        alert(localise.set["msg_s1"]);
                    }, error: function (data, status) {
                        removeHourglass();
                        alert(data.responseText);
                    }
                });
            }
        });

    }

});



