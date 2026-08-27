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

import globals from './app/globals.js';
import localise from './app/localise.js';
import './libs/bootbox-bootstrap-bridge.js';
import {
    addHourglass,
    getCms,
    getGroupKeys,
    getGroupStatusQuestions,
    getGroupSurveys,
    getLoggedInUser,
    handleLogout,
    htmlEncode,
    removeHourglass,
    setInLocalStorage,
    setupUserProfile
} from './app/common.js';

const $ = window.$;
const bootbox = window.bootbox;

var gUserLocale = navigator.language;
if (Modernizr.localstorage) {
    gUserLocale = localStorage.getItem('user_locale') || navigator.language;
}
window.gUserLocale = gUserLocale;

localise.initLocale(gUserLocale).then(function() {

        var gCurrentCmsIndex;
        var gPanel;

        window.gTasks = {
            cache: {
                groupSurveys: {}
            }
        }

        $(document).ready(function() {

            setCustomChanges();
            setTheme();
            setupUserProfile();
            localise.setlang();		// Localise HTML

            // Get the user details
            getLoggedInUser(currentSurveyDone, false, true, undefined, false, false);

            $('#create_cm_alert').click(function () {
                openCmsDialog(false, -1);
            });

            /*
              * Save a case management setting details
              */
            $('#alertSave').click(function(){
                saveCaseManagementAlert();
            });

            $('#saveSettings').click(function(){
                saveSettings();
            });

            $('#saveKeys').click(function(){
                saveKeys();
            });

            $('#cms_fs').keydown(function(){
                $('.save_alert').hide();
            })
            $('#cms_sq, #cms_cq').change(function(){
                $('.save_alert').hide();
            })

            // Set up the tabs
            $('#keysTab a').click(function (e) {
                e.preventDefault();
                panelChange($(this), 'keys');
            });
            $('#settingsTab a').click(function (e) {
                e.preventDefault();
                panelChange($(this), 'settings');
            });
            $('#alertsTab a').click(function (e) {
                e.preventDefault();
                panelChange($(this), 'alerts');
            });
            $('#dhis2Tab a').click(function (e) {
                e.preventDefault();
                panelChange($(this), 'dhis2');
                getDhis2Exports();
            });

            $('#addDhis2Export').click(function () {
                edit_dhis2_export();
                window.bsModalShow('#dhis2ExportPopup');
            });
            $('#dh_exp_add_item').click(function () {
                addDhis2ItemRow();
            });
            $('#dh_exp_dataset').change(function () {
                /*
                 * The rows are mapped to elements of the data set being left, so they are
                 * cleared rather than carried across.  Without this they would be kept as
                 * codes belonging to a data set that is no longer chosen
                 */
                $('#dh_exp_items_body tr').each(function () {
                    $(this).data('de', '').data('coc', '');
                });
                loadDhis2DataElements($(this).val());
            });
            $('#dh_exp_refresh_ds').click(function () {
                refreshDhis2DataSets();
            });
            $('#dh_exp_save').click(function () {
                saveDhis2Export(null);
            });
            $('#dh_exp_dryrun').click(function () {
                saveDhis2Export('dryrun');
            });
            $('#dh_exp_send').click(function () {
                // This writes into the client's reporting system, so it is asked once
                bootbox.confirm(localise.set['u_dh_send_confirm'], function (decision) {
                    if(decision) {
                        saveDhis2Export('send');
                    }
                });
            });
        });

        function currentSurveyDone() {
            getGroupStatusQuestions($('#cms_sq, #cms_cq'), globals.gCurrentSurvey, true);
            getGroupKeys($('#key'), $('#key_policy'), globals.gCurrentSurvey);
            getGroupSurveys(globals.gCurrentSurvey, groupSurveysDone);
        }

        function groupSurveysDone() {
            getCms(updateCmsData);
        }

        /*
         * Respond to a panel being changed
         */
        function panelChange($this, name) {
            gPanel = name;

            $('.save_alert').hide();
            window.bsTabShow($this);

            $(".cmtab").hide();
            $('#' + name + 'Panel').removeClass('d-none').show();
            setInLocalStorage("currentTabcases", '#' + name + 'Tab a');
        }

        /*
          * Update the case management settings table and other case management data
          */
        function updateCmsData() {

            var $tab = $('#cms_table'),
                i, cmAlert,
                alertList = globals.gCmSettings.alerts,
                settings = globals.gCmSettings.settings,
                h = [],
                idx = -1;

            /*
             * Update settings
             */
            $('#cms_bn').val(settings.name);
            $('#cms_bd').val(settings.description);
            $('#cms_fs').val(settings.finalStatus);
            $('#cms_sq').val(settings.statusQuestion);      // The list of questions should have been set by now but it is not guaranteed
            $('#cms_cq').val(settings.criticalityQuestion);

            /*
             * Update alerts table
             */
            h[++idx] = '<div class="table-responsive">';
            h[++idx] = '<table class="table table-striped">';
            h[++idx] = '<thead>';
            h[++idx] = '<tr>';
            h[++idx] = '<th scope="col">';
            h[++idx] = localise.set["c_id"];	// Id
            h[++idx] = '</th>';
            h[++idx] = '<th scope="col">';
            h[++idx] = localise.set["c_name"];	// Name
            h[++idx] = '</th>';
            h[++idx] = '<th scope="col">';
            h[++idx] = localise.set["cm_alert_a"];	// Period
            h[++idx] = '</th>';
            h[++idx] = '<th scope="col">';
            h[++idx] = localise.set["c_action"];
            h[++idx] = '</th>';
            h[++idx] = '</tr>';
            h[++idx] = '</thead>';
            h[++idx] = '<tbody>';


            for (i = 0; i < alertList.length; i++) {
                cmAlert = alertList[i];

                h[++idx] = '<tr>';
                h[++idx] = '<td>';
                h[++idx] = htmlEncode(cmAlert.id);
                h[++idx] = '</td>';
                h[++idx] = '<td>';
                h[++idx] = htmlEncode(cmAlert.name);
                h[++idx] = '</td>';
                h[++idx] = '<td>';
                h[++idx] = htmlEncode(cmAlert.period);
                h[++idx] = '</td>';

                h[++idx] = '<td>';
                h[++idx] = '<div class="d-flex">';
                h[++idx] = '<button type="button" data-idx="';
                h[++idx] = i;
                h[++idx] = '" class="btn btn-sm rm_cms btn-danger me-2">';
                h[++idx] = '<i class="fas fa-trash-alt"></i></button>';

                h[++idx] = '<button type="button" data-idx="';
                h[++idx] = i;
                h[++idx] = '" class="btn-sm cms_edit btn-info" value="';
                h[++idx] = i;
                h[++idx] = '">';
                h[++idx] = '<i class="far fa-edit"></i></button>';
                h[++idx] = '</div>';
                h[++idx] = '</td>';

                h[++idx] = '</tr>';
            }

            h[++idx] = '</tbody>';
            h[++idx] = '</table>';
            h[++idx] = '</div>';        // responsive

            $tab.empty().append(h.join(''));

            if((!settings.finalStatus || !settings.statusQuestion
                    || settings.finalStatus == '' || settings.statusQuestion == '') && alertList.length > 0) {
                $('.msg_alert').show().removeClass('alert-success').addClass('alert-danger').text(localise.set["cm_areq"]);
            } else {
                $('.msg_alert').hide();
            }
            $('.cms_edit', $tab).click(function () {
                openCmsDialog(true, $(this).val());
            });

            $(".rm_cms", $tab).click(function(){
                var idx = $(this).data("idx");
                deleteCms(idx);
            });

        }

        /*
         * Save a new or updated case management setting
         */
        function saveSettings() {
            var settings = {};

            settings.name = $('#cms_bn').val();
            settings.description = $('#cms_bd').val();
            settings.statusQuestion = $('#cms_sq').val();
            settings.finalStatus = $('#cms_fs').val();
            settings.criticalityQuestion = $('#cms_cq').val();

            $('.org_alert').hide();
            addHourglass();
            $.ajax({
                type: "POST",
                contentType: "application/x-www-form-urlencoded",
                cache: false,
                url: "/surveyKPI/cases/settings/" + globals.gCmSettings.group_survey_ident,
                data: { settings: JSON.stringify(settings) },
                success: function(data, status) {
                    removeHourglass();
                    if(handleLogout(data)) {
                        $('.save_alert').show().removeClass('d-none alert-danger').addClass('alert-success').html(localise.set["msg_upd"]);
                        getCms(updateCmsData);
                    }
                },
                error: function(xhr, textStatus, err) {
                    removeHourglass();

                    if(xhr.readyState == 0 || xhr.status == 0) {
                        return;  // Not an error
                    } else {
                        var msg = htmlEncode(xhr.responseText);
                        if (!msg) {
                            msg = localise.set["c_error"];
                        }
                        $('.save_alert').show().removeClass('d-none alert-success').addClass('alert-danger').html(msg);
                    }
                }
            });
        }

        /*
   * Save a new or updated case managment setting
   */
        function saveKeys() {
            var keys = {};

            keys.key = $('#key').val();
            keys.key_policy = $('#key_policy').val();

            $('.org_alert').hide();
            addHourglass();
            $.ajax({
                type: "POST",
                contentType: "application/x-www-form-urlencoded",
                cache: false,
                url: "/surveyKPI/cases/keys/" + globals.gCmSettings.group_survey_ident,
                data: { keys: JSON.stringify(keys) },
                success: function(data, status) {
                    removeHourglass();

                    $('.save_alert').show().removeClass('d-none alert-danger').addClass('alert-success').html(localise.set["msg_upd"]);
                    getCms(updateCmsData);
                },
                error: function(xhr, textStatus, err) {
                    removeHourglass();

                    if(xhr.readyState == 0 || xhr.status == 0) {
                        return;  // Not an error
                    } else {
                        var msg = htmlEncode(xhr.responseText);
                        if (!msg) {
                            msg = localise.set["c_error"];
                        }
                        $('.save_alert').show().removeClass('d-none alert-success').addClass('alert-danger').html(msg);
                    }
                }
            });
        }

        /*
         * Save a new or updated case management setting
         */
        function saveCaseManagementAlert() {
            var cmsAlert = {};

            if(gCurrentCmsIndex === -1) {
                cmsAlert.id = -1;
            } else {
                cmsAlert.id = globals.gCmSettings.alerts[gCurrentCmsIndex].id;
            }

            var periodCount = $('#cms_period').val();
            cmsAlert.name = $('#cms_name').val();
            cmsAlert.period = periodCount + ' ' + $('#period_list_sel').val();
            cmsAlert.filter = $('#cms_filter').val();
            if(gTasks.cache.groupSurveys[globals.gCurrentSurvey][0]) {
                cmsAlert.group_survey_ident = gTasks.cache.groupSurveys[globals.gCurrentSurvey][0].groupSurveyIdent;
            }

            if(!cmsAlert.name || cmsAlert.name.trim().length === 0) {
                alert(localise.set["msg_val_nm"]);
                $('#cms_name').focus();
                return;
            }

            if(!periodCount || periodCount.trim().length === 0 || periodCount < 1) {
                alert(localise.set["msg_val_period"]);
                $('#cms_period').focus();
                return;
            }

            var alertString = JSON.stringify(cmsAlert);

            addHourglass();
            $.ajax({
                type: "POST",
                contentType: "application/x-www-form-urlencoded",
                cache: false,
                url: "/surveyKPI/cases/settings/alert",
                data: { alert: alertString },
                success: function(data, status) {
                    removeHourglass();
                    if(handleLogout(data)) {
                        getCms(updateCmsData);
                        window.bsModalHide('#create_cms_popup');
                    }
                },
                error: function(xhr, textStatus, err) {
                    removeHourglass();

                    if(xhr.readyState == 0 || xhr.status == 0) {
                        return;  // Not an error
                    } else {
                        var msg = xhr.responseText;
                        if (msg) {
                            if (msg.indexOf("cms_unique_name") > 0) {
                                msg = localise.set["cm_dcms"];
                            }
                        } else {
                            msg = localise.set["c_error"];
                        }
                        alert(msg);
                    }
                }
            });
        }

        /*
          * Delete the case management alert
          */
        function deleteCms (cmsIdx) {

            var cmAlert = {id: globals.gCmSettings.alerts[cmsIdx].id};

            bootbox.confirm(localise.set["msg_del_cms"] +  ' ' + htmlEncode(globals.gCmSettings.alerts[cmsIdx].name), function(decision) {
                if (decision === true) {
                    addHourglass();
                    $.ajax({
                        type: "DELETE",
                        contentType: "application/x-www-form-urlencoded",
                        url: "/surveyKPI/cases/settings/alert",
                        data: { alert: JSON.stringify(cmAlert) },
                        success: function(data, status) {
                            removeHourglass();
                            if(handleLogout(data)) {
                                getCms(updateCmsData);
                            }
                        }, error: function(data, status) {
                            removeHourglass();
                            if(data && data.responseText) {
                                alert(data.responseText);
                            } else {
                                alert(localise.set["msg_err_del"]);
                            }
                        }
                    });
                }
            });
        }

        /*
          * Show the case management dialog
          */
        function openCmsDialog(existing, cmsIndex) {
            gCurrentCmsIndex = cmsIndex;
            document.forms.namedItem("cmsForm").reset();
            if(cmsIndex >= 0) {
                var cmsAlert = globals.gCmSettings.alerts[gCurrentCmsIndex];
                $('#cms_name').val(cmsAlert.name)
                if ((cmsAlert.period)) {
                    var periodArray = cmsAlert.period.split(" ");
                    if (periodArray.length > 1) {
                        $('#cms_period').val(periodArray[0]);
                        $('#period_list_sel').val(periodArray[1]);
                    }
                }
                $('#cms_filter').val(cmsAlert.filter)
            }
            window.bsModalShow('#create_cms_popup');
        }

        // -------------------------------------------------------------------------
        // DHIS2 export
        // -------------------------------------------------------------------------

        var gDhis2Exports = [];
        var gDhis2EditId = -1;
        var gDhis2Elements = [];        // Data elements of the chosen data set

        function bundleIdent() {
            return globals.gCmSettings ? globals.gCmSettings.group_survey_ident : undefined;
        }

        function getDhis2Exports() {
            var ident = bundleIdent();
            if(!ident) {
                return;
            }
            addHourglass();
            $.ajax({
                url: '/surveyKPI/dhis2/exports/' + encodeURIComponent(ident),
                dataType: 'json',
                cache: false,
                success: function (data) {
                    removeHourglass();
                    if(handleLogout(data)) {
                        gDhis2Exports = data || [];
                        updateDhis2ExportTable();
                    }
                },
                error: function (xhr) {
                    removeHourglass();
                    if(xhr.readyState !== 0 && xhr.status !== 0) {
                        console.log('Error getting DHIS2 exports: ' + xhr.responseText);
                    }
                }
            });
        }

        function updateDhis2ExportTable() {
            var h = [], idx = -1;
            for(var i = 0; i < gDhis2Exports.length; i++) {
                var e = gDhis2Exports[i];
                h[++idx] = '<tr>';
                h[++idx] = '<td>' + htmlEncode(e.dataset_name || e.dataset_uid) + '</td>';
                h[++idx] = '<td>' + htmlEncode(e.period_type || '') + '</td>';
                h[++idx] = '<td>' + (e.items ? e.items.length : 0) + '</td>';
                h[++idx] = '<td>' + (e.enabled ? '<i class="fas fa-check text-success"></i>' : '') +
                    (e.auto_export ? ' <i class="fas fa-clock text-primary" title="' +
                        htmlEncode(localise.set['u_dh_auto']) + '"></i>' : '') + '</td>';
                h[++idx] = '<td class="text-nowrap">';
                h[++idx] = '<button type="button" data-idx="' + i + '" class="btn btn-info btn-sm mx-1 dh_exp_edit"><i class="far fa-edit"></i></button>';
                h[++idx] = '<button type="button" data-idx="' + i + '" class="btn btn-danger btn-sm mx-1 dh_exp_del"><i class="fas fa-trash-alt"></i></button>';
                h[++idx] = '</td></tr>';
                // The last result matters as much as the mapping, so show it under the row
                if(e.last_export_result) {
                    h[++idx] = '<tr><td colspan="5" class="text-muted small">' +
                        htmlEncode(e.last_export) + ' &nbsp; ' + htmlEncode(e.last_export_result) + '</td></tr>';
                }
            }
            $('#dhis2_export_body').html(h.join(''));

            $('.dh_exp_edit').click(function () {
                edit_dhis2_export($(this).data('idx'));
                window.bsModalShow('#dhis2ExportPopup');
            });
            $('.dh_exp_del').click(function () {
                delete_dhis2_export(gDhis2Exports[$(this).data('idx')].id);
            });
        }

        /*
         * The bundle's questions, by name.  The export binds on the question name, not its id,
         * so the name is what goes in the select
         */
        function loadDhis2Questions(periodSel, ouSel, done) {
            $.ajax({
                url: '/surveyKPI/questionList/' + globals.gCurrentSurvey + '/none/group',
                dataType: 'json',
                cache: false,
                success: function (data) {
                    if(handleLogout(data)) {
                        var opts = ['<option value=""></option>'];
                        var numeric = ['<option value=""></option>'];
                        (data || []).forEach(function (q) {
                            var o = '<option value="' + htmlEncode(q.name) + '">' + htmlEncode(q.name) + '</option>';
                            opts.push(o);
                            numeric.push(o);
                        });
                        $('#dh_exp_period_q').html(opts.join('')).val(periodSel || '');
                        $('#dh_exp_ou_q').html(opts.join('')).val(ouSel || '');
                        gDhis2Questions = opts.join('');
                        if(typeof done === 'function') { done(); }
                    }
                },
                error: function (xhr) {
                    console.log('Error getting bundle questions: ' + xhr.responseText);
                    if(typeof done === 'function') { done(); }
                }
            });
        }
        var gDhis2Questions = '<option value=""></option>';

        function loadDhis2DataSets(selected, done) {
            $.ajax({
                url: '/surveyKPI/dhis2/metadata/dataset',
                dataType: 'json',
                cache: false,
                success: function (data) {
                    if(handleLogout(data)) {
                        var h = ['<option value=""></option>'];
                        (data || []).forEach(function (d) {
                            h.push('<option value="' + htmlEncode(d.uid) + '">' + htmlEncode(d.name) + '</option>');
                        });
                        $('#dh_exp_dataset').html(h.join('')).val(selected || '');

                        /*
                         * The data elements have to be in hand before the mapping rows are
                         * built, because a row renders its data element as a choice from that
                         * list.  Built too early the row has nothing to select from and the
                         * stored mapping is lost
                         */
                        if(selected) {
                            loadDhis2DataElements(selected, done);
                        } else if(typeof done === 'function') {
                            done();
                        }
                    }
                },
                error: function (xhr) {
                    showDhis2EditMsg(xhr.responseText || localise.set['c_error'], true);
                    if(typeof done === 'function') { done(); }
                }
            });
        }

        /*
         * Read the list again from DHIS2.  Configuration time data, so it is refreshed when
         * asked for rather than on a schedule
         */
        function refreshDhis2DataSets() {
            addHourglass();
            $.ajax({
                type: 'POST',
                url: '/surveyKPI/dhis2/metadata/dataset/refresh',
                success: function () {
                    removeHourglass();
                    loadDhis2DataSets($('#dh_exp_dataset').val());
                },
                error: function (xhr) {
                    removeHourglass();
                    showDhis2EditMsg(xhr.responseText || localise.set['c_error'], true);
                }
            });
        }

        /*
         * The data elements of the chosen data set, with their category option combos, so a
         * mapping is a choice from a list rather than a code typed from memory
         */
        function loadDhis2DataElements(uid, done) {
            gDhis2Elements = [];
            if(!uid) {
                if(typeof done === 'function') { done(); }
                return;
            }
            addHourglass();
            $.ajax({
                url: '/surveyKPI/dhis2/metadata/dataset/' + encodeURIComponent(uid),
                dataType: 'json',
                cache: false,
                success: function (d) {
                    removeHourglass();
                    (d.dataSetElements || []).forEach(function (dse) {
                        var de = dse.dataElement || {};
                        var cc = de.categoryCombo || {};
                        gDhis2Elements.push({
                            code: de.code,
                            name: de.name,
                            cocs: (cc.categoryOptionCombos || []).map(function (c) {
                                return { code: c.code, name: c.name };
                            })
                        });
                    });
                    // The period type comes from the data set, so it cannot be set wrongly
                    if(d.periodType) {
                        $('#dh_exp_period_type').val(d.periodType);
                    }
                    refreshDhis2ItemSelects();
                    if(typeof done === 'function') { done(); }
                },
                error: function (xhr) {
                    removeHourglass();
                    showDhis2EditMsg(xhr.responseText || localise.set['c_error'], true);
                    if(typeof done === 'function') { done(); }
                }
            });
        }

        /*
         * A stored mapping that is not in the list is kept as an option of its own rather than
         * dropped
         *
         * Otherwise a code the data set no longer lists, or one rendered before the list had
         * arrived, would show as blank and then be discarded by collectDhis2Export on the next
         * save.  Losing a mapping silently is far worse than showing a code with no name
         */
        function dhis2ElementOptions(selected) {
            var h = ['<option value=""></option>'];
            var found = false;
            gDhis2Elements.forEach(function (e) {
                if(!e.code) { return; }   // Cannot be mapped, the export sends codes
                if(e.code === selected) { found = true; }
                h.push('<option value="' + htmlEncode(e.code) + '"' +
                    (e.code === selected ? ' selected' : '') + '>' + htmlEncode(e.name) + '</option>');
            });
            if(selected && !found) {
                h.push('<option value="' + htmlEncode(selected) + '" selected>' +
                    htmlEncode(selected) + '</option>');
            }
            return h.join('');
        }

        function dhis2CocOptions(deCode, selected) {
            var h = ['<option value=""></option>'];
            var found = false;
            var el = gDhis2Elements.find(function (e) { return e.code === deCode; });
            if(el) {
                el.cocs.forEach(function (c) {
                    if(!c.code || c.code === 'default') { return; }  // default needs no combo
                    if(c.code === selected) { found = true; }
                    h.push('<option value="' + htmlEncode(c.code) + '"' +
                        (c.code === selected ? ' selected' : '') + '>' + htmlEncode(c.name) + '</option>');
                });
            }
            if(selected && !found) {
                h.push('<option value="' + htmlEncode(selected) + '" selected>' +
                    htmlEncode(selected) + '</option>');
            }
            return h.join('');
        }

        /*
         * Re-render the selects against the list, keeping what each row is mapped to
         *
         * The row remembers its mapping rather than the select being asked for it, because a
         * select rendered before the list arrived reports an empty value even though the row
         * was created from a stored mapping
         */
        function refreshDhis2ItemSelects() {
            $('#dh_exp_items_body tr').each(function () {
                var $row = $(this);
                var de = $row.find('.dh_item_de').val() || $row.data('de') || '';
                var coc = $row.find('.dh_item_coc').val() || $row.data('coc') || '';
                $row.find('.dh_item_de').html(dhis2ElementOptions(de));
                $row.find('.dh_item_coc').html(dhis2CocOptions(de, coc));
                $row.data('de', de).data('coc', coc);
            });
        }

        function addDhis2ItemRow(item) {
            item = item || {};
            var aggs = [
                ['sum', localise.set['u_dh_agg_sum']],
                ['count', localise.set['u_dh_agg_count']],
                ['one', localise.set['u_dh_agg_one']]
            ];
            var aggOpts = aggs.map(function (a) {
                return '<option value="' + a[0] + '"' +
                    (a[0] === item.aggregation ? ' selected' : '') + '>' + htmlEncode(a[1]) + '</option>';
            }).join('');

            var h = '<tr>' +
                '<td><select class="form-select form-select-sm dh_item_q">' + gDhis2Questions + '</select></td>' +
                '<td><select class="form-select form-select-sm dh_item_agg">' + aggOpts + '</select></td>' +
                '<td><select class="form-select form-select-sm dh_item_de">' + dhis2ElementOptions(item.data_element) + '</select></td>' +
                '<td><select class="form-select form-select-sm dh_item_coc">' + dhis2CocOptions(item.data_element, item.category_option_combo) + '</select></td>' +
                '<td><button type="button" class="btn btn-danger btn-sm dh_item_del"><i class="fas fa-trash-alt"></i></button></td>' +
                '</tr>';
            var $row = $(h).appendTo('#dh_exp_items_body');
            $row.data('de', item.data_element || '').data('coc', item.category_option_combo || '');
            $row.find('.dh_item_q').val(item.question_name || '');
            $row.find('.dh_item_del').click(function () { $row.remove(); });
            $row.find('.dh_item_de').change(function () {
                $row.data('de', $(this).val()).data('coc', '');
                $row.find('.dh_item_coc').html(dhis2CocOptions($(this).val(), ''));
            });
            $row.find('.dh_item_coc').change(function () {
                $row.data('coc', $(this).val());
            });
        }

        function edit_dhis2_export(idx) {
            $('#dh_exp_edit_msg').hide();
            $('#dh_exp_result').empty();
            $('#dh_exp_items_body').empty();
            gDhis2Elements = [];

            var e = (typeof idx !== 'undefined') ? gDhis2Exports[idx] : null;
            gDhis2EditId = e ? e.id : -1;

            $('#dh_exp_period_type').val(e ? (e.period_type || 'Monthly') : 'Monthly');
            $('#dh_exp_enabled').prop('checked', e ? e.enabled : true);
            $('#dh_exp_auto').prop('checked', e ? e.auto_export : false);
            $('#dh_exp_schedule').val(e && e.schedule_minutes ? e.schedule_minutes : 1440);
            $('#dh_exp_periods_back').val(e && typeof e.periods_back === 'number' ? e.periods_back : 1);

            loadDhis2Questions(e ? e.period_question : '', e ? e.orgunit_question : '', function () {
                loadDhis2DataSets(e ? e.dataset_uid : '', function () {
                    if(e && e.items) {
                        e.items.forEach(function (item) { addDhis2ItemRow(item); });
                    } else {
                        addDhis2ItemRow();
                    }
                });
            });
        }

        function collectDhis2Export() {
            var items = [];
            $('#dh_exp_items_body tr').each(function () {
                var $r = $(this);
                var de = $r.find('.dh_item_de').val();
                if(!de) { return; }     // A row with no data element is not a mapping
                items.push({
                    question_name: $r.find('.dh_item_q').val(),
                    aggregation: $r.find('.dh_item_agg').val(),
                    data_element: de,
                    category_option_combo: $r.find('.dh_item_coc').val()
                });
            });

            return {
                id: gDhis2EditId,
                dataset_uid: $('#dh_exp_dataset').val(),
                dataset_name: $('#dh_exp_dataset option:selected').text(),
                period_type: $('#dh_exp_period_type').val(),
                period_question: $('#dh_exp_period_q').val(),
                orgunit_question: $('#dh_exp_ou_q').val(),
                enabled: $('#dh_exp_enabled').prop('checked'),
                auto_export: $('#dh_exp_auto').prop('checked'),
                schedule_minutes: parseInt($('#dh_exp_schedule').val(), 10) || 1440,
                periods_back: parseInt($('#dh_exp_periods_back').val(), 10) || 0,
                items: items
            };
        }

        /*
         * Saving and a dry run are one action, because a dry run has to test what is on screen
         * rather than what was stored the last time
         */
        /*
         * Saving, a dry run and a send are one action, because both of the latter have to act on
         * what is on screen rather than on what was stored the last time
         */
        function saveDhis2Export(thenRun) {
            var ident = bundleIdent();
            if(!ident) { return; }

            var e = collectDhis2Export();
            addHourglass();
            $.ajax({
                type: 'PUT',
                url: '/surveyKPI/dhis2/exports/' + encodeURIComponent(ident),
                contentType: 'application/json',
                data: JSON.stringify(e),
                success: function (saved) {
                    removeHourglass();
                    if(handleLogout(saved)) {
                        var obj = (typeof saved === 'object') ? saved : JSON.parse(saved);
                        gDhis2EditId = obj.id;
                        getDhis2Exports();
                        if(thenRun) {
                            runDhis2Export(obj.id, thenRun === 'send');
                        } else {
                            window.bsModalHide('#dhis2ExportPopup');
                        }
                    }
                },
                error: function (xhr) {
                    removeHourglass();
                    showDhis2EditMsg(localise.set['msg_err_save'] + ' ' + xhr.responseText, true);
                }
            });
        }

        function runDhis2Export(id, commit) {
            $('#dh_exp_result').empty();
            addHourglass();
            $.ajax({
                type: 'POST',
                url: '/surveyKPI/dhis2/exports/id/' + id + '/run' + (commit ? '?commit=true' : ''),
                dataType: 'json',
                success: function (s) {
                    removeHourglass();
                    showDhis2Summary(s);
                    getDhis2Exports();
                },
                error: function (xhr) {
                    removeHourglass();
                    showDhis2EditMsg(xhr.responseText || localise.set['c_error'], true);
                }
            });
        }

        /*
         * The per value conflicts are the useful part of a rejection, so they are listed rather
         * than summarised as a count
         */
        function showDhis2Summary(s) {
            var $out = $('#dh_exp_result').empty();
            var cls = s.success ? 'alert-success' : 'alert-danger';

            /*
             * Say plainly whether it worked.  Counts alone read as a result rather than as a
             * failure, so a rejected send looked like a report of nothing much happening
             */
            var txt = (s.dry_run ? localise.set['u_dh_dry_run'] + ': ' : '') +
                (s.success ? localise.set['c_success'] : localise.set['c_error']) + ': ' +
                s.sent + ' ' + localise.set['c_records'] +
                ', imported ' + s.imported + ', updated ' + s.updated + ', ignored ' + s.ignored;
            if(s.deleted) {
                txt += ', ' + localise.set['c_deleted'].toLowerCase() + ' ' + s.deleted;
            }
            $('<div class="alert ' + cls + '">').text(txt).appendTo($out);

            (s.conflicts || []).forEach(function (c) {
                $('<div class="alert alert-warning py-1 small">').text(c).appendTo($out);
            });
        }

        function delete_dhis2_export(id) {
            addHourglass();
            $.ajax({
                type: 'DELETE',
                url: '/surveyKPI/dhis2/exports/id/' + id,
                success: function () {
                    removeHourglass();
                    getDhis2Exports();
                },
                error: function (xhr) {
                    removeHourglass();
                    alert(localise.set['msg_err_del'] + ' ' + xhr.responseText);
                }
            });
        }

        function showDhis2EditMsg(text, isError) {
            $('#dh_exp_edit_msg')
                .removeClass('alert-success alert-danger')
                .addClass(isError ? 'alert-danger' : 'alert-success')
                .text(text)
                .show();
        }
});
