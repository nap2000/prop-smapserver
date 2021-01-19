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
* Register for messages from the service worker
*/
function registerForServiceWorkerMessages(callback) {

	if ('serviceWorker' in navigator) {
		navigator.serviceWorker.addEventListener('message', function (event) {
			// event is a MessageEvent object
			if (event.data.type === "401") {
				window.open("/login.html");
			} else if (callback) {
				callback(event.data);
			}
		});
	}
}