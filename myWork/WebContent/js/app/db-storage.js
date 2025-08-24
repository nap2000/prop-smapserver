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
"use strict";

/*
 *  This file provides access to the same database used by webforms.  The db creation code is duplicated for this reason.
 */
define([],
    function() {

        /*
		 * Variables for indexedDB Storage
		 */
        let databaseVersion = window.idbConfig.version;
        let databaseName = "webform";

        let dbPromise;  // Promise that returns the database

        let mediaStoreName = "media";
        let logStoreName = "logs";
        let lastSavedStoreName = 'lastSavedRecords';

        let recordStoreName = 'records';
        let assignmentIdx = 'assignment';
        let assignmentIdxPath = 'assignment.assignment_id';

        var idbSupported = typeof window.indexedDB !== 'undefined';

        return {
            isSupported: isSupported,
            open: open,

            addRecord: addRecord,
            getRecords: getRecords,
            getHistory: getHistory,
            deleteRecords: deleteRecords,

            getTask: getTask
        };


        /**
         * Return true if indexedDB is supported
         * No need to check for support of local storage this is checked by "store"
         * @return {Boolean}
         */
        function isSupported() {
            return idbSupported;
        }

        /**
         * Open the database
         */
        function open() {

            dbPromise = new Promise(function(resolve, reject) {
                var request = window.indexedDB.open(databaseName, databaseVersion);

                request.onupgradeneeded = function(event) {
                    var upgradeDb = event.target.result;
                    var oldVersion = upgradeDb.oldVersion || 0;

                    if (!upgradeDb.objectStoreNames.contains(mediaStoreName)) {
                        upgradeDb.createObjectStore(mediaStoreName);
                    }

                    if (!upgradeDb.objectStoreNames.contains(recordStoreName)) {
                        let recordStore = upgradeDb.createObjectStore(recordStoreName, {
                            keyPath: 'id',
                            autoIncrement: true
                        });
                        createIndex(assignmentIdx, assignmentIdxPath, {unique: false});
                    }

                    if (!upgradeDb.objectStoreNames.contains(logStoreName)) {
                        upgradeDb.createObjectStore(logStoreName);
                    }

                    if (!upgradeDb.objectStoreNames.contains(lastSavedStoreName)) {
                        upgradeDb.createObjectStore(lastSavedStoreName, {
                            keyPath: '_surveyId',
                            autoIncrement: false,
                        });
                    }

                };

                request.onsuccess = function (event) {
                    var openDb = event.target.result;

                    openDb.onerror = function (event) {
                        // Generic error handler for all errors targeted at this database's
                        // requests!
                        console.error("Database error: " + event.target.errorCode);
                    };

                    resolve(openDb);
                };

                request.onerror = function (e) {
                    console.log('Error', e.target.error.name);
                    alert('Error opening idb: ' + e.target.error.name);
                    reject(e);
                };


            });

            return dbPromise;
        }

        /*
         * Add a record
         */
        function addRecord(record) {

            return new Promise(function(resolve, reject) {
                console.log("add a record: ");

                dbPromise.then(function (db) {
                    var transaction = db.transaction([recordStoreName], "readwrite");
                    transaction.onerror = function (event) {
                        alert("Error: failed to add record ");
                    };

                    var objectStore = transaction.objectStore(recordStoreName);
                    var request = objectStore.add(record);
                    request.onsuccess = function (event) {
                        resolve();
                    };
                    request.onerror = function (event) {
                        console.log('Error', e.target.error.name);
                        reject();
                    };
                });
            });

        }

        /*
		 * Get a specific task from the records sore identified by he assignment id
		 */
        function getTask(assignment_id) {

            return new Promise(function(resolve, reject) {
                console.log("Get task with assignment id: " + assignment_id);

                dbPromise.then(function (db) {
                    var transaction = db.transaction([recordStoreName], "readonly");
                    transaction.onerror = function (event) {
                        alert("Error: failed to get record ");
                    };

                    var objectStore = transaction.objectStore(recordStoreName);
                    var idx = objectStore.index(assignmentIdx);
                    var request = idx.get(assignment_id);
                    request.onsuccess = function (event) {
                        resolve(request.result);
                    };
                    request.onerror = function (event) {
                        console.log('Error', e.target.error.name);
                        reject();
                    };
                });

            });
        }

        /*
         * Get all the records from the records database
         */
        function getRecords() {

            return new Promise(function(resolve, reject) {
                console.log("Get records ");

                dbPromise.then(function (db) {
                    var transaction = db.transaction([recordStoreName], "readonly");
                    transaction.onerror = function (event) {
                        alert("Error: failed to get record ");
                    };

                    var objectStore = transaction.objectStore(recordStoreName);
                    var request = objectStore.getAll();
                    request.onsuccess = function (event) {
                        resolve(request.result);
                    };
                    request.onerror = function (event) {
                        console.log('Error', e.target.error.name);
                        reject();
                    };
                });

            });
        }

        /*
         * Delete all the records from the records database
         */
        function deleteRecords() {

            console.log("xxxxxxxxxxxxx: deleteRecords");
            return new Promise(function(resolve, reject) {
                console.log("Delete records ");

                dbPromise.then(function (db) {
                    var transaction = db.transaction([recordStoreName], "readwrite");
                    transaction.onerror = function (event) {
                        alert("Error: failed to get record ");
                    };

                    var objectStore = transaction.objectStore(recordStoreName);
                    var request = objectStore.clear();
                    request.onsuccess = function (event) {
                        resolve(request.result);
                    };
                    request.onerror = function (event) {
                        console.log('Error', e.target.error.name);
                        reject();
                    };
                });

            });

        }

        /*
		 * Obtains blob for specified file
		 *
        function retrieveFile(dirname, file) {

            return new Promise(function(resolve, reject) {

                var updatedFile = {
                    fileName: file.fileName
                };

                fileStore.getFile(file.fileName, dirname).then(function(objectUrl){
                    updatedFile.blob = fileStore.dataURLtoBlob(objectUrl);
                    updatedFile.size = updatedFile.blob.size;
                    resolve(updatedFile);
                });


            });

        }

         */

        // From: http://stackoverflow.com/questions/6850276/how-to-convert-dataurl-to-file-object-in-javascript
        /*
        function dataURLtoBlob(dataurl) {
            var arr = dataurl.split(',');
            var mime;
            var bstr;
            var n;
            var u8arr;

            if(arr.length > 1) {
                mime = arr[0].match(/:(.*?);/)[1];
                bstr = atob(arr[1]);
                n = bstr.length;
                u8arr = new Uint8Array(n);
                while (n--) {
                    u8arr[n] = bstr.charCodeAt(n);
                }
                return new Blob([u8arr], {type: mime});
            } else {
                return new Blob();
            }
        }
         */

        /*
		 * Local functions
		 * May be called from a location that has not intialised fileStore (ie fileManager)
		 *
        function getFileFromIdb(key) {
            return new Promise(function(resolve, reject) {
                if (!db) {
                    fileStore.init().then(function () {
                        resolve(completeGetFileRequest(key));
                    });
                } else {
         8/           resolve(completeGetFileRequest(key));
                }
            });
        }

        function completeGetFileRequest(key) {
            return new Promise(function(resolve, reject) {
                var transaction = db.transaction([mediaStoreName], "readonly");
                var objectStore = transaction.objectStore(mediaStoreName);
                var request = objectStore.get(key);

                request.onerror = function(event) {
                    reject("Error getting file");
                };

                request.onsuccess = function (event) {
                    resolve(request.result);
                };
            });
        }

        /*
         * Get the history of webform submissions
         */
        function getHistory() {

            return new Promise(function(resolve, reject) {
                console.log("Get history");

                dbPromise.then(function (db) {
                    var transaction = db.transaction([logStoreName], "readonly");
                    transaction.onerror = function (event) {
                        alert("Error: failed to get history");
                    };

                    var objectStore = transaction.objectStore(logStoreName);
                    var request = objectStore.getAll();
                    request.onsuccess = function (event) {
                        resolve(request.result.reverse());
                    };
                    request.onerror = function (event) {
                        console.log('Error', e.target.error.name);
                        reject();
                    };
                });

            });
        }
    });




