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

/*
 * The two factor challenge.
 *
 * Apache has already accepted the password by the time this page loads - REMOTE_USER is
 * set, which is how the service below knows whose code to check.  Until a code is
 * accepted the console services refuse every request.
 *
 * Deliberately standalone rather than part of a bundle: it has to work when nothing else
 * on the site will answer.
 */

var DEFAULT_TARGET = '/app/';

/*
 * Only follow "next" if it is a path on this site.  A value starting "//" or containing a
 * scheme would be an open redirect, sending the user somewhere else immediately after they
 * have authenticated.
 */
function safeTarget(next) {
    if (!next) {
        return DEFAULT_TARGET;
    }
    if (next.charAt(0) !== '/' || next.charAt(1) === '/' || next.charAt(1) === '\\') {
        return DEFAULT_TARGET;
    }
    if (next.indexOf('/app/twoFactor.html') === 0) {
        return DEFAULT_TARGET;      // Do not send the user back here
    }
    return next;
}

function getNext() {
    var params = new URLSearchParams(window.location.search);
    return safeTarget(params.get('next'));
}

$(document).ready(function () {

    if (typeof setTheme === 'function') {
        setTheme(true);
    }

    $('#tfChallengeForm').on('submit', function (e) {
        e.preventDefault();

        var code = $('#code').val();
        if (!code) {
            return;
        }

        $('#tfAlert').addClass('d-none').text('');
        $('#tfSubmit').prop('disabled', true);

        $.ajax({
            type: 'POST',
            url: '/surveyKPI/twofactor/verify',
            cache: false,
            contentType: 'application/x-www-form-urlencoded',
            data: {code: code},
            success: function () {
                window.location.href = getNext();
            },
            error: function (xhr, textStatus, err) {
                $('#tfSubmit').prop('disabled', false);
                $('#code').val('').focus();

                if (xhr.status === 401 || (xhr.responseText || '').indexOf('notloggedin') >= 0) {
                    window.location.href = '/inlineLogin.html';     // Session has expired
                    return;
                }
                $('#tfAlert').removeClass('d-none')
                    .text(xhr.responseText || err || 'That code is not correct');
            }
        });
    });
});
