
let CACHE_NAME = 'v14';
let ASSIGNMENTS = '/surveyKPI/myassignments';
let WEBFORM = "/webForm";
let USER = "/surveyKPI/user?";
let PROJECT_LIST = "/myProjectList";
let CURRENT_PROJECT = "/currentproject";
let TIMEZONES = "/timezones";

// During the installation phase, you'll usually want to cache static assets.
self.addEventListener('install', function(e) {
	// Once the service worker is installed, go ahead and fetch the resources to make this work offline.
	e.waitUntil(
		caches.open(CACHE_NAME).then(function(cache) {
			return cache.addAll([
				'/',
				'/myWork/index.html',
				'/css/bootstrap.v4.5.min.css',
				'/build/css/theme-smap.css',
				'/build/css/theme-smap.print.css',
				'/build/css/webform.print.css',
				'/build/css/webform.css',
				'/css/fa.v5.15.1.all.min.css',
				'/fonts/OpenSans-Regular-webfont.woff',
				'/fonts/OpenSans-Bold-webfont.woff',
				'/fonts/fontawesome-webfont.woff',
				'/webfonts/fa-solid-900.woff',
				'/webfonts/fa-solid-900.woff2',
				'/webfonts/fa-solid-900.ttf',
				'/build/js/webform-bundle.min.js',
				'/js/libs/modernizr.js',
				'/js/libs/require.js',
				'/js/libs/jquery-2.1.1.js',
				'/js/libs/bootstrap.bundle.v4.5.min.js',
				'/js/app/theme2.js',
				'/js/app/custom.js',
				'/js/app/idbconfig.js',
				'/myWork/js/my_work.js',
				'/images/enketo_bare_150x56.png',
				'/images/smap_logo.png',
				'/images/ajax-loader.gif',
				'/favicon.ico'
			])
		})
	);
});

self.addEventListener('activate', function (event) {
	var cacheKeeplist = [CACHE_NAME];

	event.waitUntil(
		caches.keys().then(function (keyList) {
			return Promise.all(keyList.map(function (key) {
				if (cacheKeeplist.indexOf(key) === -1) {
					return caches.delete(key);
				}
			}));
		})
	);

});

// when the browser fetches a URL…
self.addEventListener('fetch', function(event) {

	if (event.request.url.includes(ASSIGNMENTS)) {
		// response to request for forms and tasks. Cache Update Refresh strategy
		event.respondWith(caches.match(ASSIGNMENTS));
		event.waitUntil(update_assignments(event.request).then(refresh).then(precacheforms));

	} else if (event.request.url.includes(TIMEZONES)) {
		// Cache then if not found network then cache the response
		if(typeof event.request !== "undefined") {
			event.respondWith(
				caches
					.match(getCacheUrl(event.request)) // check if the request has already been cached
					.then(cached => cached || update(event.request)) // otherwise request network
			);
		}

	} else if (event.request.url.includes(WEBFORM)
		|| event.request.url.includes(USER)
		|| event.request.url.includes(CURRENT_PROJECT)
		|| event.request.url.includes(PROJECT_LIST)) {

		// response to a webform/user request.  Network then cache strategy
		event.respondWith(
			fetch(event.request)
				.then(response => {
					if (response.type !== "error" && response.type !== "opaque") {
						cache.put(getCacheUrl(event.request), response.clone());
					}
					return response;
			})
				.catch(() => {
					return caches.match(getCacheUrl(event.request));
				})
		);

	} else {
		// Try cache then network - but do not cache missing files as there will be a lot of them
		event.respondWith(
			caches
				.match(getCacheUrl(event.request)) // check if the request has already been cached
				.then(cached => cached || fetch(event.request)) // otherwise request network
		);
	}


});

function update(request) {
	return fetch(request).then(
		response => {
			if (response.type !== "error" && response.type !== "opaque") {
				cache.put(getCacheUrl(event.request), response.clone());
			}
			return response;
		}
	);
}

function refresh(response) {
	if (response.ok) {
		return response
			.json() // read and parse JSON response
			.then(jsonResponse => {
				self.clients.matchAll().then(clients => {
					clients.forEach(client => {
						// report and send new data to client
						client.postMessage(
							JSON.stringify({
								type: response.url,
								data: jsonResponse
							})
						);
					});
				});
				return jsonResponse; // resolve promise with new data
			});
	} else {
		return response;
	}
}



/*
 * Refresh assignments cache using data from the network
 */
function update_assignments(request) {
	return fetch(request.url).then(
		response => {

			if (response.type !== "error" && response.type !== "opaque") {
				cache.put(ASSIGNMENTS, response.clone());
			}
			return response;
		}

	);
}

function precacheforms(response) {

	if(response && response.forms) {
		for(let i = 0; i < response.forms.length; i++) {
			let url = '/myWork/webForm/' + response.forms[i].ident;
			fetch(url).then(function(response) {
				if (!response.ok || response.type === "error" || response.type === "opaque") {
					// An HTTP error response code (40x, 50x) won't cause the fetch() promise to reject.
					// We need to explicitly throw an exception to trigger the catch() clause.
					throw Error('response status ' + response.status);
				}

				return caches
					.open(CACHE_NAME)
					.then(cache => {
						cache.put(url, response.clone());
						return response;
					});
			})
				.catch(err => {
					console.log(err);
				})
		}
	}
}

/*
 * Remove cache buster from URLs that can be cached
 */
function getCacheUrl(request) {
	let url = request.url;
	if(url.includes(USER) || url.includes(PROJECT_LIST)) {
		let parts = url.split('?');
		url = parts[0];
	}
	return url;
}
