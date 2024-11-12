/*
 This file is part of SMAP.

 SMAP is free software: you can redistribute it and/or modify
 it under the terms of the GNU General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.
 uSMAP is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.

 You should have received a copy of the GNU General Public License
 along with SMAP.  If not, see <http://www.gnu.org/licenses/>.

 */

"use strict";

define([
        'jquery',
        'common',
        'modernizr',
        'localise',
        'globals',
        'app/mapOL3',
        'multiselect'],
    function ($, common, modernizr, lang, globals, map) {

        return {
            showEditRecordForm: showEditRecordForm,
            showBulkEditForm: showBulkEditForm,
            addCellMarkup: addCellMarkup,
            addCellMap: addCellMap,
            initialiseDynamicMaps: initialiseDynamicMaps,
            formatConversation: formatConversation
        };

        /*
	     * Refresh any select lists that are dependent on entered values
         */
        function refreshSelectLists(schema, record, changedItemIndex, prefix) {

            var  columns = schema.columns;
            var i;
            var changedItem = columns[changedItemIndex];
            for (i = 0; i < columns.length; i++) {
                var column = columns[i];
                if (column.mgmt) {
                    if (column.type === "select1" || column.type === "select" || column.type === "select_one") {
                        var value = record[column.column_name];
                        getChoiceList(schema, column, i, value, record, changedItem.column_name, prefix);
                    }
                }

            }
        }

        /*
         * Add HTML to show a form to edit a record
         */
        function showEditRecordForm(record, schema, $editForm, $surveyForm, editable, includeMaps) {
            var
                h = [],
                idx = -1,
                m = [],
                cnt = -1,
                i,
                configItem,
                first = true,
                columns = schema.columns,
                prefix = 'er';

            globals.gRecordMaps = [];     // Initialise the list of maps we are going to show
            gTasks.gPriKey = record["prikey"];

            // Clear the update array
            gTasks.gUpdate = [];
            $('.saverecord').prop("disabled", true);

            for (i = 0; i < columns.length; i++) {
                configItem = columns[i];

                if (configItem.mgmt) {

                    h[++idx] = getEditMarkup(configItem, i, first, record, schema, editable, true, prefix);

                } //else {
                // Always add the read only original
                m[++cnt] = getEditMarkup(configItem, i, first, record, schema, false, true, prefix);
                //}
                if (!configItem.readonly) {
                    first = false;
                }
            }

            if($editForm) {
                $editForm.html(h.join(''));
            }
            if($surveyForm) {
                $surveyForm.html(m.join(''));
            }

            // Set up date fields
            $editForm.find('.date').datetimepicker({
                locale: gUserLocale || 'en',
                useCurrent: false,
                showTodayButton: true
            });

            // Set up clicks on conversations
            $('.respond', $surveyForm).on('click', function(e) {
                if(window.gEditable) {
                    window.gMessageIdx = $(this).data("idx");
                    $('#messageForm')[0].reset();
                    $('#messagePopup').modal('show');
                }
            });

            // Set up multi selects
            $('.select', $editForm).multiselect({
                onChange: function(option, checked, select) {

                    var $sel = option.closest('select');
                    var itemIndex = $sel.data("item");
                    var val = '';
                    if ($sel.val()) {
                        val = $sel.val().join(' ');
                    }
                    var config = {
                        itemIndex: itemIndex,
                        value: val
                    };
                    dataChanged(config);
                }
            });

            // Set up the map fields
            if(includeMaps) {
                initialiseDynamicMaps(globals.gRecordMaps);
            }

            // Respond to changes in the data by creating an update object
            $editForm.find('.form-control, select').bind("click propertychange paste change keyup input", function () {
                if(!$(this).hasClass('select')) { // Ignore select multiples
                    var $this = $(this);
                    var config = {
                        itemIndex: $this.data("item"),
                        value: $this.val()
                    };
                    dataChanged(config);
                    refreshSelectLists(schema, record, $this.data("item"), prefix);
                }
            });
            $editForm.find('.date').on("dp.change", function () {
                var $this = $(this).find('input');
                var config = {
                    itemIndex: $this.data("item"),
                    value: $this.val()
                };
                dataChanged(config);
            });
            $('#editRecordForm').on("smap::geopoint", function (event, config) {
                console.log("New geopoint");
                dataChanged(config);
            });

            // Set focus to first editable data item
            $editForm.find('[autofocus]').focus();
        }

        /*
         * Add HTML to allow bulk ediitng
         */
        function showBulkEditForm(record, schema, $editForm) {
            var
                h = [],
                idx = -1,
                m = [],
                cnt = -1,
                i,
                configItem,
                first = true,
                columns = schema.columns,
                prefix = 'be';

            for (i = 0; i < columns.length; i++) {
                configItem = columns[i];

                if (configItem.mgmt) {
                    h[++idx] = '<div class="row bulkquestion">';
                    h[++idx] = '<div class="col-sm-8">';

                    var cloneItem = JSON.parse(JSON.stringify(configItem));
                    if(configItem.type === 'select') {
                        cloneItem.type = 'select1';     // With select multiples the bulk change is to set or clear one value
                    }
                    h[++idx] = getEditMarkup(cloneItem, i, first, record, schema, true, false, prefix);
                    h[++idx] = '</div>';    // Question column
                    h[++idx] = '<div class="col-sm-4">';    // clear
                    if(configItem.type === 'select') {
                        h[++idx] = '<div class="switch">';
                        h[++idx] = '<input type="checkbox" class="selectClear">';
                        h[++idx] = '</div>';
                    }
                    h[++idx] = '</div>';    // clear
                    h[++idx] = '</div>';    // row
                }

                if (!configItem.readonly) {
                    first = false;
                }
            }

            if($editForm) {
                $editForm.html(h.join(''));
            }

            // Set up date fields
            $editForm.find('.date').datetimepicker({
                locale: gUserLocale || 'en',
                useCurrent: false,
                showTodayButton: true
            });


            // Respond to changes in the data by creating an update object
            $editForm.find('.form-control, select').bind("click propertychange paste change keyup input", function () {
                var $this = $(this);
                var config = {
                    itemIndex: $this.data("item"),
                    value: $this.val(),
                    clear: $this.closest(".bulkquestion").find(".selectClear").is(':checked')
                };
                bulkDataChanged(config);
                refreshSelectLists(schema, record, $this.data("item"), prefix);
            });

            // Respond to changes in a clear checkbox
            $editForm.find('.selectClear').bind("change", function () {
                var $this = $(this);
                var $q = $this.closest(".bulkquestion").find(".form-control")
                var config = {
                    itemIndex: $q.data("item"),
                    value: $q.val(),
                    clear: $this.is(':checked')
                };

                bulkDataChanged(config);
                refreshSelectLists(schema, record, $this.data("item"), prefix);
            });

            // Set focus to first editable data item
            $editForm.find('[autofocus]').focus();
        }

        /*
         * Get the markup to edit the record
         */
        function getEditMarkup(configItem, itemIndex, first, record, schema, editable, setvalue, prefix) {

            var h = [],
                idx = -1,
                value;

            if(record && setvalue) {
                var name = configItem.column_name;
                value = record[name];
            }

            // Add form group and label
            h[++idx] = '<div class="form-group row"><label class="col-md-4 control-label">';
            h[++idx] = htmlEncode(configItem.displayName);
            h[++idx] = '</label>';

            // Add Data
            h[++idx] = ' <div class="col-md-8">';

            if(configItem.type === 'geopoint' || configItem.type === 'geoshape' || configItem.type === 'geotrace') {
                h[++idx] = addCellMap(
                    configItem.readonly || !editable,
                    'record_maps_',
                    globals.gRecordMaps,
                    configItem,
                    value,
                    undefined,
                    itemIndex);
            } else if (configItem.readonly || !editable) {		// Read only text
                if(configItem.type === 'conversation') {
                    h[++idx] = addConversationCellMarkup(value, true);
                } else {
                    h[++idx] = addCellMarkup(value);
                }
            } else {
                h[++idx] = addEditableColumnMarkup(configItem, value, itemIndex, first, schema, record, prefix);
            }
            h[++idx] = '</div>';

            // Close form group
            h[++idx] = '</div>';

            return h.join('');
        }

        /*
         * Add the markup for an editable column
         */
        function addEditableColumnMarkup(column, value, itemIndex, first, schema, record, prefix) {
            var h = [],
                idx = -1,
                i,
                sourceColumn;

            // Check for a source column
            if(column.parameters && column.parameters.source) {
                var sourceColumn = getColumn(column.parameters.source, schema.columns);
            }

            if(sourceColumn) {
                h[++idx] = addSourceQuestion(sourceColumn, record, column.parameters.rows);
            }

            if (column.type === "decimal" || column.type === "integer"  || column.type === "int") {
                h[++idx] = ' <input type="number"';
                if(column.type === "integer"  || column.type === "int") {
                    h[++idx] = ' step="1"';
                }
                h[++idx] = ' class="form-control editable" value="';
                h[++idx] = value;
                h[++idx] = '" data-item="';
                h[++idx] = itemIndex;
                if (first) {
                    h[++idx] = '" autofocus/>';
                } else {
                    h[++idx] = '"/>';
                }
            } else if (column.type === "date") {
                h[++idx] = '<div class="input-group date" data-container="body">';
                h[++idx] = '<input type="date" class="form-control editable" data-date-format="YYYY-MM-DD" value="';
                h[++idx] = value;
                h[++idx] = '" data-item="';
                h[++idx] = itemIndex;
                if (first) {
                    h[++idx] = '" autofocus/>';
                } else {
                    h[++idx] = '"/>';
                }
                h[++idx] = '<span class="input-group-addon"><span class="glyphicon glyphicon-calendar"></span></span>';
                h[++idx] = '</div>';
            } else if (column.type === "dateTime") {
                h[++idx] = '<div class="input-group" data-container="body">';
                h[++idx] = '<input type="datetime-local" class="form-control editable" data-date-format="YYYY-MM-DD HH:MM" value="';
                h[++idx] = value;
                h[++idx] = '" data-item="';
                h[++idx] = itemIndex;
                if (first) {
                    h[++idx] = '" autofocus/>';
                } else {
                    h[++idx] = '"/>';
                }
                h[++idx] = '<span class="input-group-addon"><span class="glyphicon glyphicon-calendar"></span></span>';
                h[++idx] = '</div>';
            } else if (column.type === "select1" || column.type === "select" || column.type === "select_one") {
                h[++idx] = ' <select id="select_';
                h[++idx] = prefix + itemIndex;
                h[++idx] = '" class="form-control editable ';
                if (column.type === "select") {
                    h[++idx] = ' select';
                }
                h[++idx] = '" data-item="';
                h[++idx] = itemIndex;
                h[++idx] = '"';
                if (column.type === "select") {
                    h[++idx] = ' multiple="multiple"'
                }
                h[++idx] = '>';

                // Add the empty choice
                /*
                 * Do we need this?
                 * Should it be configurable
                 * Presumably only valid choices should be allowed
                 *
                if (column.type !== "select") {
                    h[++idx] = '<option value=""></option>';
                }
                */

                var choices = getChoiceList(schema, column, itemIndex, value, record, undefined, prefix);
                if (choices) {
                    h[++idx] = getChoicesHTML(column, choices, value, true);
                }
                h[++idx] = '</select>';

            } else {        // Text + Default

                var v = addAnchors(value)[0];
                
                if(v && v.indexOf('<') == 0) {
                    h[++idx] = v;
                } else {
                    if(column.parameters && column.parameters.rows) {
                        h[++idx] = ' <textarea rows=';
                        h[++idx] = column.parameters.rows;
                        h[++idx] = ' class="form-control editable" ';
                        h[++idx] = '" data-item="';
                        h[++idx] = itemIndex;
                        if (first) {
                            h[++idx] = '" autofocus>';
                        } else {
                            h[++idx] = '">';
                        }
                        h[++idx] = value;
                        h[++idx] = '</textarea>';
                    } else {
                        h[++idx] = ' <input type="text"';
                        h[++idx] = '" class="form-control editable" value="';
                        h[++idx] = value;
                        h[++idx] = '" data-item="';
                        h[++idx] = itemIndex;
                        if (first) {
                            h[++idx] = '" autofocus/>';
                        } else {
                            h[++idx] = '"/>';
                        }
                    }
                }

            }

            return h.join('');
        }

        /*
         * Get the choicelist for a select question
         */
        function getChoiceList(schema, col, itemIndex, value, record, changed_column, prefix) {

            // Get the choice list
            var listId = col.l_id;
            var i;
            var choices;

            if (schema && schema.choiceLists && schema.choiceLists.length) {
                for (i = 0; i < schema.choiceLists.length; i++) {
                    if (schema.choiceLists[i].l_id === listId) {
                        choices = schema.choiceLists[i].choices;
                        break;
                    }
                }
            }
            if(choices && choices.length > 0) {

                if (col.appearance && (col.appearance.indexOf('search(') >= 0 || col.appearance.indexOf('lookup_choices(') >= 0)) {
                    // External choices
                    var params = getAppearanceParams(col.appearance);
                    var changeParam1 = false;
                    var changeParam2 = false;
                    var changeExpr = false;
                    var dependentColumn;
                    if (params.length > 0) {
                        // todo consider fixed values
                        var sIdent = globals.gGroupSurveys[globals.gCurrentSurvey];
                        var value_column = choices[0].k;
                        var label_column = choices[0].v;
                        var url = '/lookup/choices/' + sIdent + '/' + params.filename + '/' + value_column + '/' + label_column;
                        if(typeof params.filter !== "undefined") {
                            if(params.filter === 'eval') {
                                if (typeof params.expression !== "undefined") {
                                    // Replace ${question_name} elements with values
                                    const regex = /\$\{.+?\}/g;
                                    const found = params.expression.match(regex);
                                    if(found && found.length > 0) {
                                        for(i = 0; i < found.length; i++) {
                                            var token = found[i];
                                            dependentColumn = token.substring(2, token.length - 1);
                                            var depValue = record[dependentColumn];
                                            depValue = getUpdate(dependentColumn, depValue);  // Replace the value if there has been an update
                                            var type = getQuestionType(schema, dependentColumn);
                                            if(type !== 'int') {
                                                depValue = '\'' + depValue + '\'';
                                            }
                                            params.expression = params.expression.replace(token, depValue);


                                            if (changed_column && dependentColumn === changed_column) {        // Set a flag if this refresh in response to a changed value and this param is wha changed
                                                changeExpr = true;
                                            }
                                        }
                                    }

                                    var encodedExpression = encodeURIComponent(params.expression);
                                    // manually encode some characters that are missed by encodeUriComponent and ned to be encoded
                                    encodedExpression = encodedExpression.replace(/\(/g, "%28");
                                    encodedExpression = encodedExpression.replace(/\)/g, "%29");
                                    url += '?expression=' + encodedExpression;

                                }
                            } else {
                                if (typeof params.filter_column !== "undefined" && typeof params.filter_value !== "undefined") {
                                    // Add first filter
                                    url += '?search_type=' + params.filter;
                                    url += '&q_column=' + params.filter_column;
                                    if (params.filter_value.indexOf('${') == 0) {
                                        dependentColumn = params.filter_value.substring(2, params.filter_value.length - 1);
                                        params.filter_value = record[dependentColumn];

                                        params.filter_value = getUpdate(params.filter_column, params.filter_value);  // Replace the value if there has been an update
                                        if (changed_column && dependentColumn === changed_column) {        // Set a flag if this refresh in response to a changed value and this param is wha changed
                                            changeParam1 = true;
                                        }
                                    }

                                    url += '&q_value=' + params.filter_value;
                                    if (typeof params.second_filter_column !== "undefined"
                                        && typeof params.second_filter_value !== "undefined") {
                                        url += '&f_column=' + params.second_filter_column;
                                        if (params.second_filter_value.indexOf('${') == 0) {
                                            dependentColumn = params.second_filter_value.substring(2, params.second_filter_value.length - 1);
                                            params.second_filter_value = record[dependentColumn];

                                            params.second_filter_value = getUpdate(params.second_filter_column, params.second_filter_value);    // Replace the value if there has been an update
                                            if (changed_column && dependentColumn === changed_column) {        // Set a flag if this refresh in response to a changed value and this param is wha changed
                                                changeParam2 = true;
                                            }
                                        }
                                        url += '&f_value=' + params.second_filter_value;
                                    }
                                }
                            }
                        }

                        if(!changed_column || changeParam1 || changeParam2 || changeExpr) {
                            $.ajax({   // Get the existing report details to edit
                                url: url,
                                cache: false,
                                success: function (data, status) {
                                    var el = '#select_' + prefix + itemIndex;
                                    var selValue = value;
                                    var html = getChoicesHTML(col, data, selValue, false);
                                    $(el).empty().append(html);

                                    // Set up multi selects
                                    if (col.type === 'select') {
                                        $(el).multiselect('rebuild');
                                    }

                                }, error: function (data, status) {
                                    alert("Error: " + data.responseText);
                                }
                            });
                        }
                    } else {
                        alert("invalid search for: " + col.question_name);
                    }
                } else {
                    // Local choices
                    return choices;
                }
            }
        }

        /*
         * Get an updated value
         */
        function getUpdate(col, def) {
            if(gTasks.gUpdate && gTasks.gUpdate.length > 0) {
                var i;
                for(i = 0; i < gTasks.gUpdate.length; i++) {
                    if(gTasks.gUpdate[i].name === col) {
                        return gTasks.gUpdate[i].value;
                    }
                }
            }
            return def;
        }

        /*
         * Add the markup for a map
         */
        function addCellMap(readOnly, idbase, maps, column, currentValue, oldValue, itemIndex) {
            var h = [],
                idx = -1;

            // Make sure values are JSON objects
            if(typeof currentValue === "string") {
                try {
                    currentValue = JSON.parse(currentValue);
                } catch(err) {

                }
            }
            if(typeof oldValue === "string") {
                try {
                    oldValue = JSON.parse(oldValue);
                } catch (err) {

                }
            }

            var config = {
                readOnly: readOnly,
                id: idbase + maps.length,
                currentValue: currentValue,
                oldValue: oldValue
            };

            h[++idx] = '<div id="';
            h[++idx] = config.id;
            h[++idx] = '" data-item="';
            h[++idx] = itemIndex;
            h[++idx] = '" class="small_map">';
            h[++idx] = '<div id="tooltip_';
            h[++idx] = config.id;
            h[++idx] = '"></div>';
            h[++idx] = '</div>';

            maps.push(config);

            return h.join('');
        }

        function getColumn(qname, columns) {
            var i,
                col;
            for(i = 0; i < columns.length; i++) {
                // Hack.  For forms the human name is the question name that has not been modified to act as a database column
                if((columns[i].mgmt && qname === columns[i].name) || (!columns[i].mgmt && qname === columns[i].displayName)) {
                    col = columns[i];
                    break;
                }
            }
            return col;

        }

        function formatConversation(val, inEdit) {
            window.gEditRecord.contacts = {};
            var conv;
            if(val && val.length > 0 && val !== 'undefined' && val[0] === '[') {    // Only convert if the data is a json array, otherwise has already been converted
                try {
                    conv = JSON.parse(val);
                } catch (e) {
                    console.log("Error converting: " + val);
                    console.log(e);
                    // Ignore malformed json
                }

                if (conv && conv.length > 0) {
                    var h = [],
                        idx = -1,
                        j;
                    for (j = conv.length - 1; j >= 0; j--) {
                        var css,
                            justify,
                            respond = "";

                        if(inEdit && conv[j].inbound && (conv[j].channel === 'sms' || conv[j].channel === 'whatsapp')) {
                            respond = 'respond';
                        }
                        if (conv[j].inbound) {
                            css = 'conv-from';
                            justify = 'justify-content-start';
                        } else {
                            css = 'conv-to';
                            justify = 'justify-content-end';
                        }
                        if(conv[j].channel) {
                            css += ' ' + conv[j].channel;
                        } else {
                            css += ' sms';  // Default style
                        }
                        h[++idx] = '<div class="d-flex flex-row ' + justify + ' ' + respond + ' mb-1 message"' + (inEdit ? 'data-idx="' + j + '"' : '') + '>';
                        h[++idx] = '<div class="p-1 border bg-body-tertiary ' + css + '" style="border-radius: 10px;">';

                        if (conv[j].ts) {
                            h[++idx] = '<time datetime="';
                            h[++idx] = conv[j].ts;
                            h[++idx] = '">';
                            h[++idx] = conv[j].ts;
                            h[++idx] = '</time>';
                        }
                        if (conv[j].theirNumber) {
                            h[++idx] = ' <dest>';
                            h[++idx] = conv[j].theirNumber;
                            h[++idx] = '</dest>';
                        }

                        h[++idx] = '<br/>';
                        h[++idx] = htmlEncode(conv[j].msg);

                        h[++idx] = '</div>';
                        h[++idx] = '</div>';

                        if(inEdit) {
                            window.gEditRecord.contacts[conv[j].theirNumber] = {
                                channel: conv[j].channel
                            }
                        } else {
                            break;  // Only do the first entry if not in edit
                        }
                    }
                    return h.join('');
                } else {
                    return "";
                }
            } else {
                return val;
            }
        }

        function addSourceQuestion(column, record, ref_rows) {
            var name = column.mgmt ? column.name : column.column_name;        // Name hack
            var v = addAnchors(record[name])[0];
            var h = [];
            var idx = -1;

            if(v.indexOf('<') == 0) {
                h[++idx] = v;
            } else {
                if(!ref_rows || ref_rows <= 1) {
                    ref_rows = 1;
                }
                h[++idx] = ' <textarea readonly style="overflow-y:scroll;" rows=';
                h[++idx] = ref_rows;
                h[++idx] = ' class="form-control">';
                h[++idx] = v;
                h[++idx] = '</textarea>';
            }

            return h.join('');
        }

        /*
         * User has changed a managed value
         */
        function dataChanged(config) {

            var
                itemIndex = config.itemIndex,
                value = config.value,
                record = gTasks.gSelectedRecord,
                columns = gTasks.cache.currentData.schema.columns,
                currentValue,
                column_name = columns[itemIndex].column_name,
                displayName = columns[itemIndex].displayName,
                i,
                foundExistingUpdate;

            currentValue = record[column_name];
            if (typeof currentValue === "undefined") {
                currentValue = "";
            }
            if(typeof currentValue === "object") {
                currentValue = JSON.stringify(currentValue);
            }
            if(typeof value === "object") {
                value = JSON.stringify(value);
            }

            if (currentValue !== value) {
                // Add new value to array, or update existing
                foundExistingUpdate = false;
                for (i = 0; i < gTasks.gUpdate.length; i++) {
                    if (gTasks.gUpdate[i].name === column_name) {
                        foundExistingUpdate = true;
                        gTasks.gUpdate[i].value = value;
                        break;
                    }
                }

                if (!foundExistingUpdate) {
                    // Add new value
                    gTasks.gUpdate.push({
                        name: column_name,                 // Update name is the column name
                        displayName: displayName,
                        value: value,
                        currentValue: currentValue,
                        itemIndex: itemIndex
                    });
                }

            } else {
                // Delete value from array of updates
                for (i = 0; i < gTasks.gUpdate.length; i++) {
                    if (gTasks.gUpdate[i].name === column_name) {
                        gTasks.gUpdate.splice(i, 1);
                        break;
                    }
                }
            }

            if (gTasks.gUpdate.length > 0) {
                $('.saverecord').prop("disabled", false);
            } else {
                $('.saverecord').prop("disabled", true);
            }

            $('.re_alert').hide();
        }

        /*
         * User has changed a bulk managed value
         */
        function bulkDataChanged(config) {

            var
                itemIndex = config.itemIndex,
                value = config.value,
                clear = config.clear,
                columns = gTasks.cache.currentData.schema.columns,
                column_name = columns[itemIndex].column_name,
                displayName = columns[itemIndex].displayName,
                i,
                foundExistingUpdate;

            if(typeof value === "object") {
                value = JSON.stringify(value);
            }

            // Add new value to array, or update existing
            foundExistingUpdate = false;
            for (i = 0; i < gTasks.gUpdate.length; i++) {
                if (gTasks.gUpdate[i].name === column_name) {
                    foundExistingUpdate = true;
                    gTasks.gUpdate[i].value = value;
                    gTasks.gUpdate[i].clear = clear;
                    break;
                }
            }

            if (!foundExistingUpdate) {
                // Add new value
                gTasks.gUpdate.push({
                    name: column_name,
                    displayName: displayName,
                    value: value,
                    clear: clear,
                    itemIndex: itemIndex
                });
            }


            if (gTasks.gUpdate.length > 0) {
                $('.saverecord').prop("disabled", false);
            } else {
                $('.saveRecord').prop("disabled", true);
            }

            $('.re_alert').hide();
        }

        /*
         * Add markup for a single cell
         */
        function addCellMarkup(input) {
            var v = addAnchors(input)[0],
                h = [],
                idx = -1;
            if(v && v.indexOf('<') == 0) {
                h[++idx] = v;
            } else {
                h[++idx] = ' <textarea readonly style="overflow-y:scroll;" rows=1';
                h[++idx] = ' class="form-control">';
                h[++idx] = v;
                h[++idx] = '</textarea>';
            }
            return h.join('');

        }

        /*
        * Add markup for a conversation
        */
        function addConversationCellMarkup(v, inEdit) {
            var h = [],
                idx = -1;

            h[++idx] = ' <div class="border border-primary">';
            v = v.replace(/&quot;/g, '\"');    // TODO not sure why quotes are escaped here
            h[++idx] = formatConversation(v, inEdit);
            h[++idx] = '</div>';

            return h.join('');

        }

        /*
	     * Initialise maps
	     */
        function initialiseDynamicMaps(maps, mapId) {
            var i;

            for(i = 0; i < maps.length; i++) {
                if(!mapId || mapId === maps[i].id) {
                    map.initDynamicMap(maps[i]);
                }
            }

        }

        /*
         * Support both internal arrays and external
         * Internal
         *    value: k
         *    label: v
         * External
         *    value: value
         *    label: labelInnerText
         */
        function getChoicesHTML(column, choices, value, internal) {
            var i,
                idx = -1,
                h = [],
                vArray,
                v,
                l;

            if (column.type === "select") {
                vArray = value.split(' ');
            } //else {      // Probably not needed.  If ther eis no empty choice why add it here?
                // Add the empty option
                //h[++idx] = '<option value=""></option>';
            //}
            for (i = 0; i < choices.length; i++) {
                if(internal) {
                    v = choices[i].k;
                    l = choices[i].v;
                } else {
                    v = choices[i].value;
                    l = choices[i].labelInnerText;
                }
                h[++idx] = '<option';
                if (column.type === "select") {
                    if (vArray.indexOf(v) > -1) {
                        h[++idx] = ' selected="selected"';
                    }
                } else {
                    if (v === value) {
                        h[++idx] = ' selected="selected"';
                    }
                }
                h[++idx] = ' value="';
                h[++idx] = v;
                h[++idx] = '">';
                h[++idx] = htmlEncode(l);
                h[++idx] = '</option>';
            }
            return h.join('');
        }
    });