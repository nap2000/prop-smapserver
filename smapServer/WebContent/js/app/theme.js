
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
function setTheme() {
    var navbarColor = localStorage.getItem("navbar_color");
    var navbarTextColor = localStorage.getItem("navbar_text_color");
    var navbarLight = LightenDarkenColor(navbarColor, 20);
    if (navbarColor && navbarTextColor) {

        /*
         * Set styles without using inline css
         */
        var $color = $('nav.navbar-smap, .navbar-collapse, .bg-navbar-smap,  .navbar-smap .navbar-toggler, .navbar-smap .navbar-brand, .navbar-smap .navbar-nav .nav-link , .navbar-smap .nav > li > a:focus');
        var $light = $('.nav-link a:hover, .bg-navbar-smap .nav > li > a:hover, ul.nav-second-level, .canvas-menu.mini-navbar .nav-second-level');

        $color.removeClass("navbar-light bg-light");
        $color.css("background-color", navbarColor);
        //$color.css("background", navbarColor);
        $color.css("color", navbarTextColor);

        $light.css("background-color", navbarLight);
        //$light.css("background", navbarLight);
        $light.css("color", navbarTextColor);

        /* Remove for CSP
        style.innerHTML = 'nav.navbar-smap, .bg-navbar-smap,  .navbar-smap .navbar-toggler, .navbar-smap .navbar-brand, .navbar-smap .navbar-nav .nav-link , .navbar-smap .nav > li > a:focus '
            + '{ background-color: ' + navbarColor + '; background: ' + navbarColor + ' !important; color: ' + navbarTextColor +'!important}'
            + ' nav.navbar-smap .nav > li > a:hover,, .bg-navbar-smap .nav > li > a:hover, ul.nav-second-level, .canvas-menu.mini-navbar .nav-second-level '
            + '{ background-color: ' + navbarLight + '; background: ' + navbarLight + ' !important; color: ' + navbarTextColor +'!important}';

        head.appendChild(style);

         */
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

