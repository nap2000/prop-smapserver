/*
 * This file hopefully will allow recovery of a serviceworker enabled version of the client has to be reversed out and replaced
 * by a version without service worker
 * In the service worker version of the app the code should be commented out
 * Also this file should not be added to the cache
 */

/*
 * commented out in service worker version of smap
navigator.serviceWorker.getRegistrations().then( function(registrations) {
	for(let registration of registrations) {
		registration.unregister();
	}
});
*/
