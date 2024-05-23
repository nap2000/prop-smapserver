
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
 * Set page themes
 */
function setTheme(background) {
    if (typeof(localStorage) !== "undefined") {
        var navbarColor = localStorage.getItem("navbar_color");
        var navbarTextColor = localStorage.getItem("navbar_text_color");
        var navbarLight = LightenDarkenColor(navbarColor, 20);
        if (navbarColor && navbarTextColor) {

            /*
             * Set styles without using inline css
             */
            if (background) {
                var $color = $('body');
            } else {
                var $color = $('nav.navbar-smap, .navbar-collapse, .bg-navbar-smap,  .navbar-smap .navbar-toggler, .navbar-smap .navbar-brand, .navbar-smap .navbar-nav .nav-link , .navbar-smap .nav > li > a:focus');
                var $light = $('.nav-link a:hover, .bg-navbar-smap .nav > li > a:hover, ul.nav-second-level, .canvas-menu.mini-navbar .nav-second-level');
            }

            if ($color) {
                if (!navbarColor || navbarColor == "undefined") {
                    navbarColor = $color.css("background-color");
                }
                $color.removeClass("navbar-light bg-light");
                $color.css("background-color", navbarColor);
                $color.css("color", navbarTextColor);
            }

            if ($light) {
                $light.css("background-color", navbarLight);
                $light.css("color", navbarTextColor);
            }
        }
    }
}

function setLogo() {
    if (typeof(localStorage) !== "undefined") {
        try {
            let mainLogo = localStorage.getItem("main_logo");
            if (typeof mainLogo !== 'undefined' && mainLogo !== "undefined" && mainLogo) {
                let img = document.getElementById('main_logo');
                console.log("Logo: " + mainLogo);
                if(img) {
                    img.setAttribute("src", mainLogo);
                }
            }
            let orgName = localStorage.getItem("org_name");
            if (typeof orgName !== 'undefined' && orgName !== "undefined" && orgName) {
                let org = document.getElementById('org_name');
                if(org) {
                    org.textContent = orgName;
                }
            }
        } catch (e) {
            console.log(e.toString());
        }
    }
}
// From https://css-tricks.com/snippets/javascript/lighten-darken-color/
function LightenDarkenColor(col, amt) {

    if(!col) {
        col = '#CCC';
    }
    var usePound = false;

    if (col[0] == "#") {
        col = col.slice(1);
        usePound = true;
    }

    var num = parseInt(col,16);

    var r = (num >> 16) + amt;

    if (r > 255) r = 255;
    else if  (r < 0) r = 0;

    var b = ((num >> 8) & 0x00FF) + amt;

    if (b > 255) b = 255;
    else if  (b < 0) b = 0;

    var g = (num & 0x0000FF) + amt;

    if (g > 255) g = 255;
    else if (g < 0) g = 0;

    return (usePound?"#":"") + (g | (b << 8) | (r << 16)).toString(16);

}

