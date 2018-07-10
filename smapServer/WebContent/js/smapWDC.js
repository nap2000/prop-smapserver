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

along with SMAP.  If not, see <http://www.gnu.org/licenses/>.

*/

	$(document).ready(function() {

        var url = "http://localhost/api/v1/data/s83_2988?geojson=yes";
        $.ajax({
            url: url,
            dataType: 'json',
            username: "neil",
            password: "neil",
            beforeSend: function (xhr) {
                xhr.setRequestHeader ("Authorization", "Basic " + btoa("neil" + ":" + "neil"));
            },
            success: function(data) {

                $('#logger').append("completed test service\n");

            }
        });



        (function () {
            var myConnector = tableau.makeConnector();


            myConnector.getSchema = function (schemaCallback) {
                var cols = [{
                    id: "id",
                    dataType: tableau.dataTypeEnum.string
                }, {
                    id: "name",
                    alias: "Name",
                    dataType: tableau.dataTypeEnum.string
                }, {
                    id: "location",
                    dataType: tableau.dataTypeEnum.geometry
                }];

                var tableSchema = {
                    id: "geopoint",
                    alias: "Some data",
                    columns: cols
                };

                schemaCallback([tableSchema]);
            };

            myConnector.getData = function (table, doneCallback) {

                function reqListener () {
                    console.log(this.responseText);
                    doneCallback();
                }

                var oReq = new XMLHttpRequest();
                oReq.addEventListener("load", reqListener);
                oReq.setRequestHeader("Authorization", "Basic " + btoa("neil" + ":" + "neil"));
                oReq.open("GET", "http://localhost/api/v1/data/s83_2988?geojson=yes");
                oReq.send();

                return;
                $.ajax({
                    url: 'http://localhost/api/v1/data/s83_2988?geojson=yes',
                    dataType: 'json',
                    username: "neil",
                    password: "neil",
                    beforeSend: function (xhr) {
                        xhr.setRequestHeader ("Authorization", "Basic " + btoa("neil" + ":" + "neil"));
                    },
                    success: function(data) {

                        var feat = data.features,
                            tableData = [];

                        // Iterate over the JSON object
                        for (var i = 0, len = feat.length; i < len; i++) {
                            tableData.push({
                                "id": feat[i].id,
                                "name": feat[i].properties.name,
                                "location": feat[i].geometry
                            });
                        }

                        table.appendRows(tableData);
                        doneCallback();

                    },
                    error: function(data) {
                        $('#logger').append("Error requesting data: " + data + "\n");
                    }
                });


            };

            tableau.registerConnector(myConnector);
        })();

        $('#submitButton').click(function () {
            tableau.connectionName = "Smap Data";
            tableau.submit();
        });
	});
