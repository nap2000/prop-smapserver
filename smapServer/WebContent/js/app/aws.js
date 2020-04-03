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
 * Functions for using aws services
 *
 */

"use strict";

define([
		'jquery',
		'modernizr',
		'app/localise',
		'app/globals'],
	function($, modernizr, lang, globals) {

		return {
			setLanguageSelect: setLanguageSelect
		};

		var translateLanguages = [
			{
				code: "ar",
				trans: true
			},
			{
				code: "en",
				trans: true
			},
			{
				code: "fr",
				trans: true
			},
			{
				code: "hi",
				trans: true
			},
			{
				code: "pt",
				trans: true
			},
			{
				code: "es",
				trans: true
			},
			{
				code: "af",
				trans: true
			},
			{
				code: "sq",
				trans: true
			},
			{
				code: "am",
				trans: true
			},
			{
				code: "az",
				trans: true
			},
			{
				code: "bn",
				trans: true
			},
			{
				code: "bs",
				trans: true
			},
			{
				code: "bg",
				trans: true
			},	{
				code: "zh",
				trans: true
			},
			{
				code: "zh-TW",
				trans: true
			},
			{
				code: "hr",
				trans: true
			},
			{
				code: "cs",
				trans: true
			},
			{
				code: "da",
				trans: true
			},
			{
				code: "fa-AF",
				trans: true
			},
			{
				code: "nl",
				trans: true
			},
			{
				code: "et",
				trans: true
			},
			{
				code: "fi",
				trans: true
			},
			{
				code: "fr-CA",
				trans: true
			},
			{
				code: "ka",
				trans: true
			},
			{
				code: "de",
				trans: true
			},
			{
				code: "el",
				trans: true
			},
			{
				code: "ha",
				trans: true
			},
			{
				code: "he",
				trans: true
			},
			{
				code: "hu",
				trans: true
			},
			{
				code: "id",
				trans: true
			},
			{
				code: "it",
				trans: true
			},
			{
				code: "ja",
				trans: true
			},
			{
				code: "ko",
				trans: true
			},
			{
				code: "lv",
				trans: true
			},
			{
				code: "ms",
				trans: true
			},
			{
				code: "no",
				trans: true
			},
			{
				code: "fa",
				trans: true
			},
			{
				code: "ps",
				trans: true
			},
			{
				code: "pl",
				trans: true
			},
			{
				code: "ro",
				trans: true
			},
			{
				code: "ru",
				trans: true
			},
			{
				code: "sr",
				trans: true
			},
			{
				code: "sk",
				trans: true
			},
			{
				code: "sl",
				trans: true
			},
			{
				code: "so",
				trans: true
			},
			{
				code: "sw",
				trans: true
			},
			{
				code: "sv",
				trans: true
			},
			{
				code: "tl",
				trans: true
			},
			{
				code: "th",
				trans: true
			},
			{
				code: "tr",
				trans: true
			},
			{
				code: "uk",
				trans: true
			},
			{
				code: "ur",
				trans: true
			},
			{
				code: "vi",
				trans: true
			}
		];

		function setLanguageSelect ($elem) {

			alert("hi");
		}
	});