
let CACHE_NAME = 'v141';

// Web service requests
let ASSIGNMENTS = '/surveyKPI/myassignments?';
let WEBFORM = "/app/myWork/webForm";
let USER = "/surveyKPI/user?";
let SURVEYS = "/surveyKPI/surveys?";

let ORG_CSS = "/custom/css/org/custom.css";
let SERVER_CSS = "/custom/css/custom.css";
let PROJECT_LIST = "/myProjectList";
let TIMEZONES = "/timezones";
let BANNER = " settings/bannerLogo";
let WEBFORM_BANNER = "media/organisation";
let TRANSLATION = "translation-combined.json";
let organisationId = 0;

let databaseName = "smap_pwa";
let databaseVersion = 2;
let latestRequestStore = "requests";
let logon = false;      // Flag to prevent attempt to relogon multiple times

// During the installation phase, you'll usually want to cache static assets.
self.addEventListener('install', function(e) {
	// Once the service worker is installed, go ahead and fetch the resources to make this work offline.
	self.skipWaiting();

	e.waitUntil(
		caches.open(CACHE_NAME).then(function(cache) {
			return cache.addAll([
				'/app/myWork/index.html',
				'/app/myWork/done.html',
				'/app/myWork/js/my_work.js',
				'/app/myWork/js/libs/jquery.js',
				'/manifest.json',
				'/css/bootstrap.v4.5.min.css',
				'/css/fa.v5.15.1.all.min.css',
				'/build/css/theme-smap.css',
				'/build/css/theme-grid.css',
				'/build/css/theme-smap.print.css',
				'/build/css/webform.print.css',
				'/build/css/grid-print.css',
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
				'/js/libs/jquery-3.5.1.min.js',
				'/js/libs/bootstrap.bundle.v4.5.min.js',
				'/js/libs/bootbox.5.1.1.min.js',
				'/js/libs/bootbox.5.1.1.locales.min.js',
				'/js/app/custom.js',
				'/js/app/idbconfig.js',
				'/js/app/pwacommon.js',
				'/js/app/theme2.js',
				'/images/enketo_bare_150x56.png',
				'/images/smap_logo.png',
				'/favicon.ico',
				'/build/locales/en/translation-combined.json'
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

	} else if (event.request.url.includes(ASSIGNMENTS)) {   // response to request for forms and tasks. Cache Update Refresh strategy

		event.respondWith(caches.match(ASSIGNMENTS).then(cached => cached || new Response()));
		//event.waitUntil(update_assignments(event.request).then(refresh).then(precacheforms));
		event.waitUntil(update_assignments(event.request).then(refresh));       // disable precaching due to server load

	} else if (event.request.url.includes(TIMEZONES)) {     // Cache first strategy

		event.respondWith(
			caches
				.match(getCacheUrl(event.request)) // check if the request has already been cached
				.then(cached => cached || update(event.request)) // otherwise request network
		);

	} else if (event.request.url.includes(WEBFORM)
			|| event.request.url.includes(ORG_CSS)
			|| event.request.url.includes(SERVER_CSS)
			|| event.request.url.includes(BANNER)
			|| event.request.url.includes(WEBFORM_BANNER)
			|| event.request.url.includes(TRANSLATION)) {       // Files Network then cache strategy

		event.respondWith(
			getOrganisationId().then(
				() => {
					let recordId = getRecordId(event.request.url);
					if(recordId === "org_css") {
						let url = ORG_CSS.replace("org", organisationId);
						return filesNetworkThenCache(event, new Request(url));
					} else {
						return filesNetworkThenCache(event, event.request);
					}
				}
			)
		);

	} else if (event.request.url.includes(USER)         // Web services network then cache strategy
		|| event.request.url.includes(PROJECT_LIST)
		|| event.request.url.includes(SURVEYS)) {

		let recordId = getRecordId(event.request.url);

		event.respondWith(
			fetch(event.request)
				.then(response => {

					if(response.status == 401) {  // force re-logon
						authResponse();
						return response;
					} else if (response.status == 200) {
						logon = false;
						let responseData = response.clone().json().then(data => {
							setRecord(latestRequestStore, data, recordId);
							if(recordId === "user" && data && data.o_id) {
								organisationId = data.o_id;
							}
						});
						return response;

					} else {
						logon = false;
						return getRecord(latestRequestStore, recordId).then(storedResponse => {
							return storedResponse;
						});

					}
				}).catch(function(err){
					return getRecord(latestRequestStore, recordId).then(storedResponse => {
						return storedResponse;
					});
			})
		);

	} else {
		// Try cache then network - but do not cache missing files as there will be a lot of them
		event.respondWith(
			caches
				.match(getCacheUrl(event.request)) // check if the request has already been cached
				.then(cached => cached || fetch(event.request).then(response => {
						if (response.status === 401) {
							authResponse();
							return response;
						} else {
							logon = false;
							return response;
						}
					}).catch(function(err) {
						console.log("Failed to fetch uncached request: " + event.request.url);
						return err;
					})
				)
		);
	}


}, {passive: true});

function filesNetworkThenCache(event, request) {
	return fetch(request)
		.then(response => {

			if (response.status == 401) {  // force re-logon
				authResponse();
				return response;
			} else if (response.status == 200) {
				logon = false;
				return caches
					.open(CACHE_NAME)
					.then(cache => {
						cache.put(getCacheUrl(request), response.clone());
						return response;
					})
			} else {
				logon = false;
				return caches.match(getCacheUrl(request))
					.then(cached => cached || response); // Return whatever is in cache
			}
		}).catch(() => {
			logon = false;
			return caches.match(getCacheUrl(request))
				.then(cached => cached) // Return whatever is in cache
		});
}

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

function authResponse() {
	if(!logon) {
		logon = true;
		self.clients.matchAll({
			includeUncontrolled: true,
			type: 'window',
		})
			.then((clients) => {
				let msg = {
					type: "401"
				};
				if (clients.length > 0) {
					let idx = 0;
					for(let i = 0; i < clients.length; i++) {
						if(clients[i].visibilityState === "visible") {
							idx = i;
							break;
						}
					}
					clients[idx].postMessage(msg);
				}
			});
	}
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
							{
								type: response.url,
								data: jsonResponse
							}
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
					reject(e);
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
				resolve(upgradeDb);
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
					reject(new Response());
				};

				request.onsuccess = function (e) {
					try {
						resolve(new Response(JSON.stringify(request.result), {
							headers: {"Content-Type": "application/json"}
						}));
					} catch (err) {
						console.log(err);
					}
				};
			});
		} else {
			reject(new Response());
		}
	});
};

/*
 * Get the organisation id from idb
 */
function getOrganisationId() {
	return new Promise((resolve, reject) => {

		if(organisationId) {
			resolve();
		} else if(typeof self.indexedDB !== 'undefined') {
			open().then((db) => {
				let transaction = db.transaction([latestRequestStore], "readonly");
				let objectStore = transaction.objectStore(latestRequestStore);
				let request = objectStore.get("user");

				request.onerror = function (e) {
					resolve();
				};

				request.onsuccess = function (e) {
					try {
						if(request && request.result && request.result.o_id) {
							organisationId = request.result.o_id;
						}
					} catch (err) {
						console.log(err);
					}
					resolve();
				};
			}).catch(function(err){
				resolve();
			});
		} else {
			resolve();
		}
	});
};

function getRecordId(url) {
	if(url.includes(USER)) {
		return "user";
	} else if(url.includes(PROJECT_LIST)) {
		return "project_list";
	} else if(url.includes(SURVEYS)) {
		return "surveys";
	} else if(url.includes(WEBFORM)) {
		return "webform";
	} else if(url.includes(ORG_CSS)) {
		return "org_css";
	} else if(url.includes(SERVER_CSS)) {
		return "server_css";
	} else {
		return "unknown";
	}
}
