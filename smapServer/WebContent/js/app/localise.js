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

const $ = window.$;

const dtLangFiles = {
	en: "",
	es: "/js/libs/DataTables.i18n/es.json",
	ar: "/js/libs/DataTables.i18n/ar.json",
	fr: "/js/libs/DataTables.i18n/fr.json",
	pt: "/js/libs/DataTables.i18n/pt.json",
	hi: "/js/libs/DataTables.i18n/hi.json"
};

const localeCache = {};
let currentLocale = "en";
const localeCacheBuster = `?_v=${Date.now().toString()}`;

function normalizeLocale(locale) {
	if (!locale) {
		return "en";
	}
	return locale.toLowerCase().replace("_", "-");
}

function localeCandidates(locale) {
	const normalized = normalizeLocale(locale);
	const base = normalized.split("-")[0];
	const candidates = [];

	if (normalized && normalized !== "en") {
		candidates.push(normalized);
	}
	if (base && base !== normalized && base !== "en") {
		candidates.push(base);
	}
	if (!candidates.includes("root")) {
		candidates.push("root");
	}

	return candidates;
}

async function loadLocaleFile(locale) {
	if (localeCache[locale]) {
		return localeCache[locale];
	}

	const src = `/js/nls/${locale}/lang.js${localeCacheBuster}`;
	const module = await import(/* webpackIgnore: true */ src);
	const data = module && module.default ? module.default : module;
	if (!data || typeof data !== "object") {
		throw new Error(`Locale ${locale} not found`);
	}

	localeCache[locale] = data;
	return data;
}

async function initLocale(locale) {
	const candidates = localeCandidates(locale);
	const rootLocale = await loadLocaleFile("root");
	let merged = { ...rootLocale };
	let resolvedLocale = "root";

	for (const candidate of candidates) {
		if (candidate === "root") {
			continue;
		}
		try {
			const data = await loadLocaleFile(candidate);
			merged = { ...merged, ...data };
			resolvedLocale = candidate;
			break;
		} catch (error) {
			// fallback to next candidate
		}
	}

	currentLocale = resolvedLocale;
	window.localise.set = merged;
	return merged;
}

window.localise = {
	setlang: function () {
		$(".lang").each(function() {
			const $this = $(this);
			const code = $this.data("lang");
			if (code) {
				$this.html(window.localise.set[code]);
			}
		});

		$(".lang_tt").each(function() {
			const $this = $(this);
			const code = $this.data("lang_tt");
			if (code) {
				$this.prop("title", window.localise.set[code]);
			}
		});

		$(".lang_ph").each(function() {
			const $this = $(this);
			const code = $this.data("lang_ph");
			if (code) {
				$this.prop("placeholder", window.localise.set[code]);
			}
		});

		if (typeof responsiveMobileMenu === "function") {
			rmmResizeLabels();
		}
	},
	set: {},
	dt: function() {
		return dtLangFiles[currentLocale] || dtLangFiles.en;
	},
	initLocale
};

export default window.localise;
