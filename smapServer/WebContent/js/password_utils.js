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



$(document).ready(function() {

	/*
      * Handle show password
      * From https://bigprogrammer.medium.com/login-page-with-password-eye-icon-html-css-javascript-13b6e643d5e7
      */
	const passwordField = document.getElementById("password");
	const togglePasswordSpan = document.querySelector(".password-toggle-icon");
	const togglePasswordIcon = togglePasswordSpan ? togglePasswordSpan.querySelector("i") : null;

	function togglePasswordVisibility() {
		if (passwordField.type === "password") {
			passwordField.type = "text";
			togglePasswordIcon.classList.remove("fa-eye");
			togglePasswordIcon.classList.add("fa-eye-slash");
			togglePasswordSpan.setAttribute("aria-label", "Hide password");
		} else {
			passwordField.type = "password";
			togglePasswordIcon.classList.remove("fa-eye-slash");
			togglePasswordIcon.classList.add("fa-eye");
			togglePasswordSpan.setAttribute("aria-label", "Show password");
		}
	}

	if (togglePasswordSpan) {
		togglePasswordSpan.addEventListener("click", togglePasswordVisibility);
		togglePasswordSpan.addEventListener("keydown", function(e) {
			if (e.key === " " || e.key === "Enter") {
				e.preventDefault();
				togglePasswordVisibility();
			}
		});
	}

});



