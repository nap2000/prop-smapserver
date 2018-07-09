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

        (function () {
            var myConnector = tableau.makeConnector();

            myConnector.getSchema = function (schemaCallback) {
                var cols = [{
                    id: "id",
                    dataType: tableau.dataTypeEnum.string
                }, {
                    id: "mag",
                    alias: "magnitude",
                    dataType: tableau.dataTypeEnum.float
                }, {
                    id: "title",
                    alias: "title",
                    dataType: tableau.dataTypeEnum.string
                }, {
                    id: "location",
                    dataType: tableau.dataTypeEnum.geometry
                }];

                var tableSchema = {
                    id: "earthquakeFeed",
                    alias: "Earthquakes with magnitude greater than 4.5 in the last seven days",
                    columns: cols
                };

                schemaCallback([tableSchema]);
            };

            myConnector.getData = function (table, doneCallback) {
                $.getJSON("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_week.geojson", function(resp) {
                    var feat = resp.features,
                        tableData = [];

                    // Iterate over the JSON object
                    for (var i = 0, len = feat.length; i < len; i++) {
                        tableData.push({
                            "id": feat[i].id,
                            "mag": feat[i].properties.mag,
                            "title": feat[i].properties.title,
                            "location": feat[i].geometry
                        });
                    }

                    table.appendRows(tableData);
                    doneCallback();
                });
            };

            tableau.registerConnector(myConnector);
        })();

        $('#submitButton').click(function () {
            tableau.connectionName = "USGS Earthquake Feed";
            tableau.submit();
        });
	});
