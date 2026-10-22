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

import "./libs/bootbox-bootstrap-bridge.js";
import localise from "./app/localise.js";
import { addHourglass, removeHourglass, getSelfRegistration } from "./app/common";

const $ = window.$;

var gUserLocale = navigator.language;
if (typeof localStorage !== "undefined") {
    try {
        gUserLocale = localStorage.getItem('user_locale') || navigator.language;
    } catch (error) {
        gUserLocale = navigator.language;
    }
}
window.gUserLocale = gUserLocale;

/*
 * Self registration is only permitted where the server administrator allows it. The server
 * rejects the POST anyway, this stops a form being presented that can never be submitted
 */
var gSiteKey;       // Turnstile site key, set when the server requires the challenge
var gCfToken;       // Token from a passed challenge

getSelfRegistration().then(function (reg) {
    if(!reg.enabled) {
        window.location.replace('/');
        return;
    }
    gSiteKey = reg.turnstileSiteKey;
    return localise.initLocale(gUserLocale).then(setupRegisterPage);
});

/*
 * Show the Turnstile challenge, the server will not register anyone without a passed one
 */
function setupTurnstile() {
    if(!gSiteKey) {
        return;
    }
    window.smapRegisterTurnstile = function () {
        window.turnstile.render('#turnstile', {
            sitekey: gSiteKey,
            callback: function (token) {
                gCfToken = token;
                validateForm();
            },
            'expired-callback': function () {
                gCfToken = undefined;
                validateForm();
            }
        });
    };
    var script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=smapRegisterTurnstile';
    script.async = true;
    document.head.appendChild(script);
}

/*
 * A token can only be used once, so get a new one after a failed attempt
 */
function resetTurnstile() {
    if(gSiteKey && window.turnstile) {
        gCfToken = undefined;
        window.turnstile.reset('#turnstile');
        validateForm();
    }
}

function setupRegisterPage() {
    setCustomRegister();			// Apply custom javascript
    localise.setlang();
    setupTurnstile();

    // Use input/change (not keyup) so autofill, autocomplete and mouse-paste also re-validate
    $('#registerForm input').on('input change', function () {
        validateForm();
    });

    // Validate once at load in case fields are pre-filled by the browser
    validateForm();

    $('#registerSubmit').click(function (e) {
        e.preventDefault();


        var email = $('#admin_email').val(),
            reg = {
                email: email,
                org_name: $('#org_name').val(),
                admin_name: $('#admin_name').val(),
                website: $('#website').val()
            },
            regString;

        regString = JSON.stringify(reg);


        addHourglass();
        $.ajax({
            type: "POST",
            cache: false,
            url: "/surveyKPI/register",
            data: {registrationDetails: regString, cfToken: gCfToken},
            success: function (data, status) {
                removeHourglass();
                var msg = localise.set["msg_reg"];
                msg = msg.replace('%s1', email);
                bootbox.alert(msg);
                $('#registerForm')[0].reset();
                resetTurnstile();
            }, error: function (data, status) {
                removeHourglass();
                resetTurnstile();
                bootbox.alert("Error: " + data.responseText);
            }
        });
    });


}

/*
 * Enable or disable the submit button based on the validity of the form
 */
function validateForm() {
    var status = true,
        hasAccepted = $('#accept_tc').is(":checked"),
        org_name = $('#org_name').val(),
        admin_name = $('#admin_name').val(),
        admin_email = $('#admin_email').val();

    if (!hasAccepted) {
        status = false;
    } else if (!org_name || org_name.trim().length === 0) {
        status = false;
    } else if (!admin_name || admin_name.trim().length === 0) {
        status = false;
    } else if (!admin_email || admin_email.trim().length === 0) {
        status = false;
    } else if (gSiteKey && !gCfToken) {
        status = false;
    }

    if (status) {
        $('#registerSubmit').prop("disabled", false);
    } else {
        $('#registerSubmit').prop("disabled", true);
    }

}


