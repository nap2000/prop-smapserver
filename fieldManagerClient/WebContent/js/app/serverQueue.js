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
 * Server Queue Dashboard
 * Polls /api/v1/queues/submissions and /api/v1/queues/s3upload every 30 seconds
 * and renders status cards, a snapshot bar chart, a rolling line chart, and
 * a collapsible per-worker detail table.
 */

"use strict";

import $ from "jquery";

const QUEUES = [
    { id: "submissions", label: "Submissions", url: "/surveyKPI/api/queues/submissions" },
    { id: "s3upload",    label: "S3 Storage",  url: "/surveyKPI/api/queues/s3upload"    },
    { id: "message",     label: "Messages",    url: "/surveyKPI/api/queues/message"     }
];

const POLL_MS    = 30000;   // 30 seconds
const MAX_POINTS = 20;      // 20 × 30 s = 10 minutes of history

const PALETTE = {
    submissions: { bar: "rgba(54,162,235,0.85)",  line: "rgb(54,162,235)",  err: "rgb(255,99,132)"  },
    s3upload:    { bar: "rgba(75,192,192,0.85)",   line: "rgb(75,192,192)",  err: "rgb(255,159,64)"  },
    message:     { bar: "rgba(153,102,255,0.85)",  line: "rgb(153,102,255)", err: "rgb(255,99,132)"  }
};

let gInitialised   = false;
let gPollTimer     = null;
let gSnapshotChart = null;
let gTrendChart    = null;
let gHistory       = {};   // { queueId: [{time, processed_rpm, error_rpm}] }
let gLatest        = {};   // { queueId: queueData | null }

export default { startPolling, stopPolling, refresh };

// ─── Public ──────────────────────────────────────────────────────────────────

function startPolling() {
    if (!gInitialised) { _init(); }
    refresh();
    if (!gPollTimer) {
        gPollTimer = setInterval(refresh, POLL_MS);
    }
}

function stopPolling() {
    if (gPollTimer) {
        clearInterval(gPollTimer);
        gPollTimer = null;
    }
}

function refresh() {
    let pending = QUEUES.length;
    QUEUES.forEach(function(q) {
        $.ajax({ url: q.url, cache: false, dataType: "json" })
            .done(function(data) {
                gLatest[q.id] = data;
                _addHistory(q.id, data);
            })
            .fail(function() {
                gLatest[q.id] = null;
            })
            .always(function() {
                pending--;
                if (pending === 0) { _render(); }
            });
    });
}

// ─── Init ─────────────────────────────────────────────────────────────────────

function _init() {
    QUEUES.forEach(function(q) { gHistory[q.id] = []; });
    _initSnapshotChart();
    _initTrendChart();
    $('#sq-workers-toggle').on('click', function() {
        $('#sq-workers-body').toggleClass('d-none');
        $('#sq-workers-chevron').toggleClass('fa-chevron-down fa-chevron-up');
    });
    gInitialised = true;
}

function _initSnapshotChart() {
    var ctx = document.getElementById('sq-snapshot-chart');
    if (!ctx) { return; }
    gSnapshotChart = new Chart(ctx, {
        type: 'bar',
        data: { labels: ['Backlog', 'New / min', 'Done / min', 'Errors / min'], datasets: [] },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'top' } },
            scales: {
                x: { grid: { color: 'rgba(0,0,0,0.06)' } },
                y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: 'rgba(0,0,0,0.06)' } }
            }
        }
    });
}

function _initTrendChart() {
    var ctx = document.getElementById('sq-trend-chart');
    if (!ctx) { return; }
    gTrendChart = new Chart(ctx, {
        type: 'line',
        data: { labels: [], datasets: [] },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'top' } },
            elements: { point: { radius: 2 }, line: { tension: 0.3 } },
            scales: {
                y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: 'rgba(0,0,0,0.06)' } }
            }
        }
    });
}

// ─── History ──────────────────────────────────────────────────────────────────

function _addHistory(queueId, data) {
    var h = gHistory[queueId];
    var now = new Date();
    h.push({
        time:          now.getHours().toString().padStart(2,'0') + ':' +
                       now.getMinutes().toString().padStart(2,'0') + ':' +
                       now.getSeconds().toString().padStart(2,'0'),
        processed_rpm: data.processed_rpm || 0,
        error_rpm:     data.error_rpm     || 0
    });
    if (h.length > MAX_POINTS) { h.shift(); }
}

// ─── Render ───────────────────────────────────────────────────────────────────

function _render() {
    _renderCards();
    _updateSnapshotChart();
    _updateTrendChart();
    _renderWorkerTables();
}

function _queueStatus(data) {
    if (!data || !data.workers || data.workers.length === 0) { return 'dead'; }
    if (data.error_rpm > 0) { return 'warn'; }
    return 'live';
}

function _renderCards() {
    var h = [];
    QUEUES.forEach(function(q) {
        var data   = gLatest[q.id];
        var status = _queueStatus(data);
        var badge  = status === 'live'  ? 'bg-success' :
                     status === 'warn'  ? 'bg-warning text-dark' : 'bg-danger';
        var label  = status === 'live'  ? 'Live' :
                     status === 'warn'  ? 'Errors' : 'Dead';
        var dot    = status === 'live'  ? '#28a745' :
                     status === 'warn'  ? '#ffc107' : '#dc3545';
        var nWorkers = data && data.workers ? data.workers.length : 0;

        h.push('<div class="col-sm-6 col-xl-3">');
        h.push('<div class="card shadow-sm h-100 sq-queue-card" data-queue="' + q.id + '" style="cursor:pointer;border-left:4px solid ' + dot + '">');
        h.push('<div class="card-body pb-2">');
        h.push('<div class="d-flex justify-content-between align-items-center mb-3">');
        h.push('<h6 class="mb-0 fw-bold text-uppercase" style="letter-spacing:.04em">' + q.label + '</h6>');
        h.push('<span class="badge ' + badge + '">' + label + '</span>');
        h.push('</div>');
        h.push('<div class="row row-cols-2 g-2 text-center">');
        h.push(_metricCell(data ? data.length : '–',          'Backlog',   ''));
        h.push(_metricCell(data ? data.new_rpm : '–',         'New / min', ''));
        h.push(_metricCell(data ? data.processed_rpm : '–',   'Done / min','text-success'));
        h.push(_metricCell(data ? data.error_rpm : '–',       'Errors / min', data && data.error_rpm > 0 ? 'text-danger' : ''));
        h.push('</div>');
        h.push('<div class="mt-2 text-muted small"><i class="fas fa-server me-1"></i>' + nWorkers + ' worker' + (nWorkers !== 1 ? 's' : '') + ' active</div>');
        h.push('</div></div></div>');
    });
    $('#sq-cards').html(h.join(''));

    // Click card → open worker detail and scroll
    $('.sq-queue-card').on('click', function() {
        var qId = $(this).data('queue');
        $('#sq-workers-body').removeClass('d-none');
        $('#sq-workers-chevron').removeClass('fa-chevron-down').addClass('fa-chevron-up');
        var $target = $('#sq-worker-' + qId);
        if ($target.length) {
            $('html,body').animate({ scrollTop: $target.offset().top - 80 }, 250);
        }
    });
}

function _metricCell(value, caption, extraClass) {
    return '<div class="col">' +
               '<div class="fs-4 fw-bold ' + extraClass + '">' + value + '</div>' +
               '<div class="text-muted" style="font-size:.75rem">' + caption + '</div>' +
           '</div>';
}

function _updateSnapshotChart() {
    if (!gSnapshotChart) { return; }
    gSnapshotChart.data.datasets = QUEUES.map(function(q) {
        var d = gLatest[q.id];
        return {
            label:           q.label,
            backgroundColor: PALETTE[q.id].bar,
            borderColor:     PALETTE[q.id].bar,
            data:            d ? [d.length, d.new_rpm, d.processed_rpm, d.error_rpm] : [0, 0, 0, 0]
        };
    });
    gSnapshotChart.update();
}

function _updateTrendChart() {
    if (!gTrendChart) { return; }

    var ref = QUEUES.find(function(q) { return gHistory[q.id].length > 0; });
    if (!ref) { return; }
    var labels = gHistory[ref.id].map(function(p) { return p.time; });

    var datasets = [];
    QUEUES.forEach(function(q) {
        var h = gHistory[q.id];
        datasets.push({
            label:           q.label + ' Done / min',
            borderColor:     PALETTE[q.id].line,
            backgroundColor: 'transparent',
            data:            h.map(function(p) { return p.processed_rpm; })
        });
        datasets.push({
            label:           q.label + ' Errors / min',
            borderColor:     PALETTE[q.id].err,
            backgroundColor: 'transparent',
            borderDash:      [5, 3],
            data:            h.map(function(p) { return p.error_rpm; })
        });
    });

    gTrendChart.data.labels   = labels;
    gTrendChart.data.datasets = datasets;
    gTrendChart.update();
}

function _renderWorkerTables() {
    var h = [];
    QUEUES.forEach(function(q) {
        var data    = gLatest[q.id];
        var workers = data && data.workers ? data.workers : [];

        h.push('<div id="sq-worker-' + q.id + '" class="mb-4">');
        h.push('<h6 class="fw-bold mb-2 text-uppercase" style="letter-spacing:.04em"><i class="fas fa-server me-1"></i>' + q.label + ' Workers</h6>');

        if (workers.length === 0) {
            h.push('<div class="alert alert-danger py-2"><i class="fas fa-exclamation-triangle me-1"></i>No active workers detected</div>');
        } else {
            h.push('<div class="table-responsive">');
            h.push('<table class="table table-sm table-striped table-bordered mb-0">');
            h.push('<thead class="table-dark"><tr>');
            ['Host', 'PID', 'Type', 'Queue', 'Started', 'Last Heartbeat', 'Done / min', 'Errors / min'].forEach(function(col) {
                h.push('<th>' + col + '</th>');
            });
            h.push('</tr></thead><tbody>');
            workers.forEach(function(w) {
                var rowClass = w.error_rpm > 0 ? ' class="table-danger"' : '';
                h.push('<tr' + rowClass + '>');
                h.push('<td>' + w.hostname + '</td>');
                h.push('<td>' + w.pid + '</td>');
                h.push('<td><span class="badge bg-secondary">' + w.subscriber_type + '</span></td>');
                h.push('<td><code>' + w.queue_name + '</code></td>');
                h.push('<td class="text-muted small">' + w.started_time + '</td>');
                h.push('<td class="text-muted small">' + w.heartbeat + '</td>');
                h.push('<td class="fw-bold text-success">' + w.processed_rpm + '</td>');
                h.push('<td class="' + (w.error_rpm > 0 ? 'fw-bold text-danger' : '') + '">' + w.error_rpm + '</td>');
                h.push('</tr>');
            });
            h.push('</tbody></table></div>');
        }
        h.push('</div>');
    });
    $('#sq-workers-body').html(h.join(''));
}
