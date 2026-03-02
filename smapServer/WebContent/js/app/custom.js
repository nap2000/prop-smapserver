
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
 * Custom java script function(s) 
 * Overridden for each custom implementation
 */

function setCustomApi() {
}

function setCustomReports() {
}

function setCustomUserTrail() {
}

function setCustomAssignments() {
}

function setCustomTemplateMgmt() {
}

function setCustomUserMgmt() {
}

function setCustomResources() {
}

function setCustomNotifications() {
}

function setCustomDashboard() {
}

function setCustomReview() {
}

function setCustomAudit() {
}

function setCustomMonitor() {
}

function setCustomManage() {
}

function setCustomChanges() {
}

function setCustomRegister() {
}

function setCustomUserForgottonPasswords() {
}

function setCustomSubscriptions() {
    var elem1 = document.getElementById("navbar-brand");

    // Add branding for subscriptions
    if(elem1) {
       elem1.innerHTML = "<img src='/images/logo.png'><span class='thick'>SMAP</span> Server";
    }

}

function setCustomEdit() {
}

function getFilterHelp() {
    return "https://www.smap.com.au/docs/admin-rbac.html#filter-groups";
}

function setCustomWebForms() {
}

function setCustomLogs() {
}

function setCustomLinkages() {
}

function setCustomSubs() {
}

function setCustomBilling() {
}

function setCustomMainLogo() {
    var elem1 = document.getElementsByClassName("main_logo");
    if(elem1 && elem1.length > 0) {
        elem1[0].setAttribute("src", "/images/cropped-blog1.jpg");
    }
}

function getBsElement(target) {
    if(!target) {
        return null;
    }
    if(typeof target === "string") {
        return document.querySelector(target);
    }
    if(target.jquery) {
        return target.length > 0 ? target[0] : null;
    }
    return target;
}

function bsModalShow(target, options) {
    var elem = getBsElement(target);
    if(elem && window.bootstrap && window.bootstrap.Modal) {
        var modal;
        if(options) {
            modal = window.bootstrap.Modal.getInstance(elem);
            if(modal) {
                modal.dispose();
            }
            modal = new window.bootstrap.Modal(elem, options);
        } else {
            modal = window.bootstrap.Modal.getOrCreateInstance(elem);
        }
        modal.show();
    }
}

function bsModalHide(target) {
    var elem = getBsElement(target);
    if(elem && window.bootstrap && window.bootstrap.Modal) {
        window.bootstrap.Modal.getOrCreateInstance(elem).hide();
    }
}

function bsTabShow(target) {
    var elem = getBsElement(target);
    if(elem && window.bootstrap && window.bootstrap.Tab) {
        window.bootstrap.Tab.getOrCreateInstance(elem).show();
    }
}

function bsDropdownToggle(target) {
    var elem = getBsElement(target);
    if(elem && window.bootstrap && window.bootstrap.Dropdown) {
        window.bootstrap.Dropdown.getOrCreateInstance(elem).toggle();
    }
}

function bsInitTooltips(selector) {
    if(!(window.bootstrap && window.bootstrap.Tooltip)) {
        return;
    }
    document.querySelectorAll(selector).forEach(function(elem) {
        window.bootstrap.Tooltip.getOrCreateInstance(elem);
    });
}

function bsTooltipSet(target, title) {
    var elem = getBsElement(target);
    if(!(elem && window.bootstrap && window.bootstrap.Tooltip)) {
        return;
    }
    elem.setAttribute("title", title);
    var tt = window.bootstrap.Tooltip.getOrCreateInstance(elem);
    tt.setContent({".tooltip-inner": title});
}

function bsTooltipSetAndShow(target, title) {
    var elem = getBsElement(target);
    if(!(elem && window.bootstrap && window.bootstrap.Tooltip)) {
        return;
    }
    bsTooltipSet(elem, title);
    window.bootstrap.Tooltip.getOrCreateInstance(elem).show();
}
