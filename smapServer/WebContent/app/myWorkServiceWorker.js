
let CACHE_NAME = 'v24';
let ASSIGNMENTS = '/surveyKPI/myassignments';
let WEBFORM = "/app/myWork/webForm";
let USER = "/surveyKPI/user?";
let ORG_CSS = "/custom/css/org/custom.css";
let PROJECT_LIST = "/myProjectList";
let TIMEZONES = "/timezones";
let organisationId = 0;

let databaseName = "smap_pwa";
let databaseVersion = 2;
let latestRequestStore = "requests";

// During the installation phase, you'll usually want to cache static assets.
self.addEventListener('install', function(e) {
	// Once the service worker is installed, go ahead and fetch the resources to make this work offline.
	e.waitUntil(
		caches.open(CACHE_NAME).then(function(cache) {
			return cache.addAll([
				'/app/myWork/index.html',
				'/css/bootstrap.v4.5.min.css',
				'/css/fa.v5.15.1.all.min.css',
				'/build/css/theme-smap.css',
				'/build/css/theme-smap.print.css',
				'/build/css/webform.print.css',
				'/build/css/webform.css',
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
				'/js/app/custom.js',
				'/js/app/idbconfig.js',
				'/js/app/pwacommon.js',
				'/app/myWork/js/my_work.js',
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


self.addEventListener('fetch', function(event) {

	if(event.request.url.includes('@')) {   // do not use service worker

		return false;

	} else if(event.request.url.includes(ORG_CSS)) {
		if(organisationId) {
			let url = ORG_CSS;
			url = url.replace("org", organisationId);
			var myRequest = new Request(url);

			event.respondWith(
				caches
					.match(getCacheUrl(myRequest)) // check if the request has already been cached
					.then(cached => cached || fetch(myRequest)) // otherwise request network
			);
		}
	} else if (event.request.url.includes(ASSIGNMENTS)) {
		// response to request for forms and tasks. Cache Update Refresh strategy
		event.respondWith(caches.match(ASSIGNMENTS));
		event.waitUntil(update_assignments(event.request).then(refresh).then(precacheforms));

	} else if (event.request.url.includes(TIMEZONES)) {
		// Cache then if not found network then cache the response
		event.respondWith(
			caches
				.match(getCacheUrl(event.request)) // check if the request has already been cached
				.then(cached => cached || update(event.request)) // otherwise request network
		);

	} else if (event.request.url.includes(WEBFORM)) {

		// response to a webform request.  Network then cache strategy
		event.respondWith(
			fetch(event.request)
				.then(response => {
					if (response.status == 401) {  // force re-logon
						try {
							self.clients.matchAll({
								includeUncontrolled: true,
								type: 'window',
							})
								.then((clients) => {
									let msg = {
										type: "401"
									}
									if (clients.length > 0) {
										clients[0].postMessage(msg);
									}
								});
						} catch {
							return caches.match(getCacheUrl(event.request))
								.then(cached => cached || response) // Return whatever is in cache
						}
					} else if (response.status == 200) {

						return caches
							.open(CACHE_NAME)
							.then(cache => {
								cache.put(getCacheUrl(event.request), response.clone());
								return response;
							})
					} else {
						return caches.match(getCacheUrl(event.request))
							.then(cached => cached || response) // Return whatever is in cache
					}
				}).catch(() => {
				return caches.match(getCacheUrl(event.request))
					.then(cached => cached || response) // Return whatever is in cache
			})
		);
	} else if (event.request.url.includes(USER)
		|| event.request.url.includes(PROJECT_LIST)) {

		// response to a XHR request.  Network then cache strategy
		event.respondWith(
			fetch(event.request)
				.then(response => {
					let recordId = getRecordId(event.request.url);
					if(response.status == 401) {  // force re-logon
						try {
							self.clients.matchAll({
								includeUncontrolled: true,
								type: 'window',
							})
								.then((clients) => {
									let msg = {
										type: "401"
									}
									if (clients.length > 0) {
										clients[0].postMessage(msg);
									}
								});
						} catch {
							return getRecord(latestRequestStore, recordId).then(storedResponse => {
								return storedResponse;
							});
						}
					} else if (response.status == 200) {

						let responseData = response.clone().json().then(data => {
							setRecord(latestRequestStore, data, recordId);
							if(recordId === "user") {
								organisationId = data.o_id;
							}
						});
						return response;

					} else {
						return getRecord(latestRequestStore, recordId).then(storedResponse => {
							return storedResponse;
						});

					}
				}).catch(() => {
					//return new Response().error();
			})
		);

	} else {
		// Try cache then network - but do not cache missing files as there will be a lot of them
		event.respondWith(
			caches
				.match(getCacheUrl(event.request)) // check if the request has already been cached
				.then(cached => cached || fetch(event.request).then(response => {
						if (response.status === 401) {
							self.clients.matchAll({
								includeUncontrolled: false,
								type: 'window',
							})
								.then((clients) => {
									let msg = {
										type: "401"
									}
									if(clients.length > 0) {
										clients[0].postMessage(msg);
									}
								})
						} else {
							return response;
						}
					}
				))
		);
	}


}, {passive: true});

function update(request) {
	return fetch(request).then(
		response => {
			if (response.status == 200) {
				return caches
					.open(CACHE_NAME)
					.then(cache => {
						cache.put(getCacheUrl(request), response.clone());
						return response;
					})
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

			if (response.status == 200) {
				return caches
					.open(CACHE_NAME)
					.then(cache => {
						cache.put(ASSIGNMENTS, response.clone());
						return response;
					});
			}
			return response;
		}

	);
}

function precacheforms(response) {

	if(response && response.forms) {
		for(let i = 0; i < response.forms.length; i++) {
			let url = '/app/myWork/webForm/' + response.forms[i].ident;
			fetch(new Request(url, {credentials: 'same-origin'})).then(function(response) {
				if (response.status == 200) {
					return caches
						.open(CACHE_NAME)
						.then(cache => {
							cache.put(url, response.clone());
							return response;
						});
				}
				return response;
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


/*
 * indexdb ----------------------------------------------------
 */
/**
 * Initialize indexdDb
 * @return {[type]} promise boolean or rejection with Error
 */
function open() {
	return new Promise((resolve, reject) => {

		if(typeof self.indexedDB !== 'undefined') {
			var request = self.indexedDB.open(databaseName, databaseVersion);

			request.onerror = function (e) {
				console.log('Error', e.target.error.message);
				reject(e);
			};

			request.onblocked = function (e) {
				console.log('Error', e.target.error.message);
				reject(e);
			};

			request.onsuccess = function (e) {
				let openDb = e.target.result;

				openDb.onerror = function (e) {
					// Generic error handler for all errors targeted at this database's
					// requests!
					console.error("Database error: " + e.target.errorCode);
				};

				resolve(openDb);
			};

			request.onupgradeneeded = function(e) {
				let upgradeDb = e.target.result;
				let oldVersion = upgradeDb.oldVersion || 0;

				switch (oldVersion) {
					case 0:
					case 1:
						if (!upgradeDb.objectStoreNames.contains(latestRequestStore)) {
							upgradeDb.createObjectStore(latestRequestStore);
						}
				}
			};

		} else {
			reject("indexeddb not supported");
		}

	});
};

/*
 * Set a record
 */
function setRecord(store, record, id) {
	return new Promise((resolve, reject) => {
		if(typeof self.indexedDB !== 'undefined') {
			open().then((db) => {
				let transaction = db.transaction([store], "readwrite");
				transaction.onerror = function (event) {
					console.log("Error: failed to add record ");
				};

				let objectStore = transaction.objectStore(store);
				let request = objectStore.put(record, id);
				request.onsuccess = function (e) {
					resolve();
				};
				request.onerror = function (e) {
					console.log('Error', e.target.error.name);
					reject();
				};
				db.close()
			});
		} else {
			reject("indexeddb not supported");
		}
	});
};

/*
 * Get a record
 */
function getRecord(store, id) {
	return new Promise((resolve, reject) => {
		if(typeof self.indexedDB !== 'undefined') {
			open().then((db) => {
				let transaction = db.transaction([store], "readonly");
				let objectStore = transaction.objectStore(store);
				let request = objectStore.get(id);

				request.onerror = function (e) {
					reject(new Response().error());
				};

				request.onsuccess = function (e) {
					resolve(new Response(request.result));
				};
			});
		} else {
			reject(new Response().error());
		}
	});
};

function getRecordId(url) {
	if(url.includes(USER)) {
		return "user";
	} else if(url.includes(PROJECT_LIST)) {
		return "project_list";
	}
}