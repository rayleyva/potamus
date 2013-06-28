/** Visualization support */
/*
  TODO:
  money number formatter for point value display
  format numbers in hovers
*/
var LABEL_COLUMN = 6;
var APP_IDS = [
    {id:'aprigocloudlock', desc:'Aprigo Cloudlock'},
    {id:'aprigocloudlock2',desc:'CloudLock 2'},
    {id:'cloudlock2',desc:'Seagate'},
    {id:'cloudlock10',desc:'POC'},
    {id:'cloudlock11',desc:'Motorola'},
    {id:'cloudlock13',desc:'Jabil'},
    //{id:'cloudlock14',desc:'BBVA'},
    {id:'cloudlock15',desc:'Costco'},
    {id:'cloudlock16',desc:'Ahold'},
    {id:'cloudlock21',desc:'Kohls'},
    {id:'cloudlock27',desc:'Palm Beach'},
    {id:'cloudlock31',desc:'AFW Farm 2'},
    {id:'cloudlock35',desc:'New Farm'},
    {id:'cloudlock36',desc:'Fairchild'},
    {id:'cloudlock38',desc:'Yahoo'},
    {id:'cloudlock6',desc:'Sealed Air'}
];
// These variables initialized in costs.html
var app_id, app_events, app_domains, start_ts, end_ts;
if (app_id) {
    APP_IDS = [{id:app_id,desc:''}];
}

var SINGLE = APP_IDS.length == 1;
var charts = {};
var dashboards = {};
var controls = {};
var FORMATTER;

google.load('visualization', '1.0', {packages: ['corechart', 'controls']});
function foreign_object(el) {
    var fo = document.createElementNS("http://www.w3.org/2000/svg", "foreignObject");
    var body = document.createElementNS("http://www.w3.org/1999/xhtml", "BODY");
    $(body).append(el);
    $(fo).append(body);
    return fo;
}

function draw_charts() {
    if (!FORMATTER) {
        FORMATTER = new google.visualization.DateFormat({pattern:'M/d HH:mm'});
    }
    for (var i=0;i < APP_IDS.length;i++) {
        var app_id = APP_IDS[i].id;
        if ($('#chart-' + app_id).length == 0) {
            var table = $('<table/>', {id:'table-'+app_id}).appendTo($('#charts'));
            var row = $('<tr/>').appendTo($('<tbody/>').appendTo(table));
            var charts = $('<td/>').appendTo(row);
            if (SINGLE) {
                $('<div/>', {'class':'dashboard',id:'dashboard-'+app_id}).appendTo(charts)
                    .append($('<div/>', {id:'chart-'+app_id,'class':'chart',name:app_id}).text("Loading..."))
                    .append($('<div/>', {id:'control-'+app_id,'class':'control',name:app_id}));
                var legend = $('<td/>', {id:'legend-'+app_id,'class':'legend'}).appendTo(row).height($(window).innerHeight());
                legend.css('max-height', table.height());
            }
            else {
                $('<div/>', {id:'chart-'+app_id,'class':'chart'})
                    .text("Loading...")
                    .appendTo(charts);
                table.addClass('multiple');
            }
        }
        draw_chart(app_id, APP_IDS[i].desc);
    }
    // Do it again in 10 minutes
    setTimeout(draw_charts, 10*60*1000);
    //setTimeout(draw_charts, 10*1000);
}

function next_label(idx) {
    var quotient = Math.floor(idx / 26);
    if (quotient > 0) {
        return next_label(quotient-1) + String.fromCharCode(65 + (idx % 26));
    }
    return String.fromCharCode(65 + idx);
}

function format_event(e) {
    var info = new Date(e.ts).toTimeString() + ": " + e.name;
    if (e.domain) {
        info += " (" + e.domain + ")";
    }
    if (e.data != '{}') {
        info += ": " + e.data;
    }
    return info;
}
function draw_chart(app_id, desc) {
    // reset is midnight Pacific time
    var get_reset = function(ts) {
        var reset = new Date(ts);
        // Assume local time is Eastern time
        // FIXME
        reset.setHours(3,0,0,0);
        return reset;
    }
    var near_reset = function(ts) {
        // Since pacific time follows DST, check whether the time is within
        // 70 minutes of GMT 08:00
        var reset = get_reset(ts);
        var delta = ts.getTime() - reset.getTime();
        return delta > 0 && delta < 70*60*1000;
    }
    var getItem = function(key, items) {
        for (var i=0;i < items.length;i++) {
            var item = items[i];
            if (item['item'] == key) {
                return item;
            }
        }
        return null;
    }
    var event_spec = "cost-data";
    if (app_events.length) {
        event_spec = "all";
    }
    var domain_spec = "";
    if (app_domains.length) {
        domain_spec = "";
        for (var i=0;i < app_domains.length;i++) {
            domain_spec += "&domain=" + encodeURIComponent(app_domains[i]);
        }
    }

    // Limit data to reduce total data load
    var DAYS = 5;
    var ONE_DAY = 24*60*60*1000;
    var date_spec = 'start=' + encodeURIComponent(start_ts ? start_ts : new Date(new Date().getTime()-DAYS*ONE_DAY).toISOString());
    if (end_ts) {
        date_spec += '&end=' + encodeURIComponent(end_ts);
    }
    var url = "http://cloudlock-potamus.appspot.com/events/"+app_id+"/"+event_spec+"?"+date_spec+domain_spec;
    $.ajax(url, {
        type: 'GET',
        // Use JSONP to facilitate local graph/page testing
        dataType: 'jsonp',
        success: function(data) {
            var CATEGORIES = ["Storage", "Small Ops", "Read Ops", "Write Ops", "Instance Hours"];
            var total_cost = 0;
            var rows = [];
            var prev_data = [0, 0, 0, 0, 0, 0];
            var prev_rate = [0, 0, 0, 0, 0, 0];
            var prev_date = null;
            var ann_index = 0;
            var total_costs = {'min':100000,'max':0};
            var events = {};
            for (var i=0;i < data.length;i++) {
                var row_data = data[i];
                var date = new Date(row_data.ts);
                var ts = date;
                if (row_data.name != "cost-data") {
                    if (rows.length == 0) {
                        continue;
                    }
                    if ((app_events.indexOf("all") != -1 || app_events.indexOf(row_data.name) != -1)
                        && (app_domains.length == 0 || !row_data.domain
                            || app_domains.indexOf(row_data.domain) != -1)) {
                        var name = next_label(ann_index);
                        events[name] = row_data;
                        events[name].row = rows.length;
                        var info = format_event(row_data);
                        var last = rows[rows.length-1]
                        rows.push([ts, last[1], last[2], last[3], last[4], last[5], name, info, last[8]]);
                        total_costs[date] = total_cost;
                        total_costs['min'] = Math.min(total_costs['min'], total_cost);
                        total_costs['max'] = Math.max(total_costs['max'], total_cost);
                        ++ann_index;
                    }
                    else {
                        console.info("Skip data : " + JSON.stringify(row_data));
                    }
                    continue;
                }
                var items = JSON.parse(row_data.data).items;
                var instance_hours = getItem('Frontend Instance Hours', items);
                var stored = getItem('Datastore Stored Data', items);
                var dsw = getItem('Datastore Write Operations', items);
                var dsr = getItem('Datastore Read Operations', items);
                var dss = getItem('Datastore Small Operations', items);
                var instances = getItem('instances', items);
                var cost = getItem('total', items).cost;
                var current;
                var delta_s = prev_date ? (ts.getTime() - prev_date.getTime())/1000. : 1;
                if (!delta_s) {
                    continue;
                }
                if (!instance_hours) {
                    console.warn("Bad data, missing instance hours: ", row_data);
                    continue;
                }

                // Account for quota resets
                if (instance_hours.usage < prev_data[4].usage && near_reset(ts)) {
                    // Average pre- and post-reset measurements
                    var reset = get_reset(ts)
                    var pre = reset.getTime() - prev_date.getTime();
                    var post = ts.getTime() - reset.getTime();
                    var avg = function(x, y) {
                        return (x * pre + y * post) / (pre + post);
                    }
                    current = [ts, avg(prev_rate[0], Math.max(0, stored.cost)),
                                   avg(prev_rate[1], dss.cost),
                                   avg(prev_rate[2], dsr.cost),
                                   avg(prev_rate[3], dsw.cost),
                                   avg(prev_rate[4], instance_hours.cost),
                                   null, null, instances.value];
                    total_cost += cost;
                }
                else {
                    // Represent cost per hour
                    var hours = delta_s / 3600.;
                    current = [ts, (stored.cost - prev_data[0].cost)/hours,
                               (dss.cost - prev_data[1].cost)/hours,
                               (dsr.cost - prev_data[2].cost)/hours,
                               (dsw.cost - prev_data[3].cost)/hours,
                               (instance_hours.cost - prev_data[4].cost)/hours,
                               null, null, instances.value];

                    // Ignore identical data points, which just give us a sawtooth artifact for no good reason 
                    if (total_cost > 0 && !current[1] && !current[2] && !current[3] && !current[4] && !current[5] && delta_s < 60) {
                        //continue;
                    }

                    for (var j=1;j < 6;j++) {
                        if (current[j] < 0) {
                            if (!current[6]) {
                                current[6] = next_label(ann_index);
                                current[7] = "";
                                ++ann_index;
                            }
                            current[7] += current[0].toTimeString() + ":\nUnexpected " + CATEGORIES[j] + " cost drop: $" + (-current[j]).toFixed(2) + "\n";
                            current[j] = 0;
                            events[current[6]] = {ts: ts, name:'cost-drop', row:rows.length};
                        }
                    }
                    total_cost += cost - prev_data[5];
                }
                var step = instances.value == prev_data[6] ? false : [ts, current[1], current[2], current[3], current[4], current[5], null, null, prev_data[6]];
                total_costs[date] = total_cost;
                total_costs['min'] = Math.min(total_costs['min'], total_cost);
                total_costs['max'] = Math.max(total_costs['max'], total_cost);
                prev_data = [stored, dss, dsr, dsw, instance_hours, cost, instances.value];
                prev_rate = [current[1], current[2], current[3], current[4], current[5]]
                prev_date = date;

                // Omit first element, since we don't have a real baseline
                if (i > 0) {
                    // make our own stepped function
                    if (step) {
                        rows.push(step);
                    }
                    rows.push(current);
                }
            }
            //console.info("last date: " + prev_date + ", " + rows.length + " events, spec " + date_spec);
            render(app_id, desc, rows, total_costs, total_cost, events);
        }
    });
}

function render(app_id, desc, rows, total_costs, total_cost, events) {
    var data = new google.visualization.DataTable();
    data.addColumn('datetime', 'Time');
    data.addColumn('number', 'Datastore Stored Data');
    data.addColumn('number', 'Small Operations');
    data.addColumn('number', 'Read Operations');
    data.addColumn('number', 'Write Operations');
    data.addColumn('number', 'Instance Hours');
    data.addColumn({type:'string', role:'annotation'});
    data.addColumn({type:'string', role:'annotationText'});
    data.addColumn('number', 'Instances');
    data.addRows(rows);

    var chart_title = function(amount) {
        var title = 'Total Displayed App ID Cost for "'+app_id+'"' + (desc?' ('+desc+')':'');
        if (amount != undefined) {
            title += ': $' + Math.abs(amount).toFixed(2);
        }
        if (app_events.length && app_events[0] != 'all') {
            title += " (events: " + app_events + ")";
        }
        if (app_domains.length) {
            title += " (domains: " + app_domains + ")";
        }
        return title;
    };
    var update_title = function(chart, range) {
        var start_cost = chart.total_costs[range.min] || chart.total_costs['min'];
        var end_cost = chart.total_costs[range.max] || chart.total_costs['max'];
        chart.range = range;
        chart.setOption('title', chart_title(end_cost - start_cost));
    };
    var update_legend = function(legend, range, events) {
        events = events || legend.data('events');
        legend.empty();
        var ul = $('<ul/>').appendTo(legend).height(legend.height()).text("Displayed times are local time");
        var key;
        var domains = {};
        var domain_count = 0;
        var last_day = undefined;
        for (key in events) {
            var e = events[key];
            var ts = new Date(e.ts);
            if (ts.getDay() != last_day) {
                last_day = ts.getDay();
                var day = new Date(ts);
                day.setHours(0,0,0,0);
                $('<li/>', {'class':'day-separator'}).appendTo(ul).text(ts.toDateString()).data('date', day);
                total_costs[day] = total_costs[ts];
            }
            var li = $('<li/>', {'class':'event', 'name':key, 'row':e.row}).appendTo(ul);
            if (ts < range.min || ts > range.max) {
                li.addClass('hidden');
            }
            var time = ts.toTimeString().replace(/([0-9:]+).*/g, "$1");
            li.append($('<span class="event-label"/>').text(key));
            li.append($('<span class="event-ts"/>').text(time));
            if (e.domain) {
                li.append($('<span class="event-domain"/>').text(e.domain));
                if (!domains[e.domain]) {
                    ++domain_count;
                }
                domains[e.domain] = true;
            }
            li.append($('<span class="event-name"/>').text(e.name));
            if (e.data != '{}') {
                li.attr('title', e.data);
            }
        }
        if (domain_count < 2) {
            ul.find('span.event-domain').remove();
        }
        $('li.event').click(function() {
            var $this = $(this);
            var selection = {row:$this.attr('row'), column:LABEL_COLUMN};
            $('li.selected').removeClass();
            $this.addClass('selected');
            charts[app_id].getChart().setSelection([selection]);
            google.visualization.events.trigger(charts[app_id].getChart(), 'select', null);
        });
        // Automatically set the span on clicks on the day separator
        $('li.day-separator').click(function() {
            $('li.selected').removeClass('selected');
            var $this = $(this);
            var start = $this.data('date');
            var end = new Date(start);
            end.setHours(end.getHours()+24);
            controls[app_id].setState({range:{start:start,end:end}});
            update_title(charts[app_id], {min:start,max:end});
            update_legend($('#legend-' + app_id), {min:start,max:end});
            controls[app_id].draw();
        });
        legend.data('events', events);
    };
    var INSTANCES_COLOR = '#226622';
    var options = {
        title : chart_title(total_cost),
        vAxes: {0: {format:'$#.##/hr'},
                1: {textStyle: {color:INSTANCES_COLOR}}
               },
        hAxis: {},
        legend: { position: 'inside', textStyle: { fontSize: 10 } },
        //colors: ['#e0440e', '#e6693e', '#ec8f6e', '#f3b49f', '#f6c7b6'],
        seriesType: "area",
        allowHtml: true,
        isStacked: true,
        targetAxisIndex:0,
        // Note: series number is the index of domain data, *not* the column number
        // Note: steppedArea requires discrete (rather than continuous) X axis, which ruins the graphs
        // if the time samples aren't consistent.  So use a line instead.
        series: {0:{visibleInLegend:APP_IDS.length==1}, 5:{type:'area',targetAxisIndex:1,visibleInLegend:false,color:INSTANCES_COLOR,areaOpacity:'.1'} },
        displayAnnotations: true
    };
    if (!charts[app_id]) {
        if (!SINGLE) {
            var chart = $('#chart-' + app_id);
            charts[app_id] = new google.visualization.ComboChart(chart[0]);
        }
        else {
            var dash = $('#dashboard-'+app_id);
            dashboards[app_id] = new google.visualization.Dashboard(dash[0]);
            charts[app_id] = new google.visualization.ChartWrapper({
                chartType: 'ComboChart',
                containerId: 'chart-' + app_id,
                options: options,
                displayAnnotations: true,
                view: {
                    columns: [
                        0, 1, 2, 3, 4, 5, 6, 7, 8
                    ]
                }
            });
            controls[app_id] = new google.visualization.ControlWrapper({
                controlType: 'ChartRangeFilter',
                containerId: 'control-' + app_id,
                options: {
                    filterColumnIndex: 0,
                    ui: {
                        chartType: 'AreaChart',
                        chartOptions: {
                            chartArea: {width: '65%'},
                            isStacked: true,
                            hAxis: {baselineColor: 'none'}
                        },
                        chartView: {
                            columns: [0,1,2,3,4,5]
                        },
                        minRangeSize: 60 // one minute
                    }
                },
                state: {range: {start: new Date(0), end: new Date()}}
            });
            dashboards[app_id].bind(controls[app_id], charts[app_id]);
            google.visualization.events.addListener(controls[app_id], 'statechange', function() {
                var range = charts[app_id].getDataTable().getColumnRange(0);
                update_title(charts[app_id], range);
                update_legend($('#legend-' + app_id), range);
            });
        }
    }
    charts[app_id].total_costs = total_costs;
    charts[app_id].data_table = data;
    if (SINGLE) {
        dashboards[app_id].draw(data);
        charts[app_id].setOptions(options);
        var range = charts[app_id].range || charts[app_id].data_table.getColumnRange(0);
        update_title(charts[app_id], range);
        update_legend($('#legend-' + app_id), range, events);
        google.visualization.events.addListener(charts[app_id], 'select', function() {
            var chart = charts[app_id].getChart();
            var selection = chart.getSelection()[0];
            // Selection provides row, column
            if (selection && selection.column == LABEL_COLUMN) {
                var label = charts[app_id].getDataTable().getValue(selection.row, selection.column);
                $('li.selected').removeClass('selected');
                $('li[name=' + label + ']').addClass('selected').scrollintoview();
            }
        });
        google.visualization.events.addListener(controls[app_id], 'click', function() {
            console.info("click on control");
        });
    }
    else {
        charts[app_id].draw(data, options);
        add_zoom(app_id);
    }
}

function add_zoom(app_id) {
    var chart = $('#chart-' + app_id);
    var link = $('#zoom-' + app_id);
    if (link.length == 0) {
        link = $('<a/>', {id:'zoom-'+app_id, 'class':'zoom', style:'position:absolute', href:'/costs/'+app_id + '?event=all'}).text('Zoom').appendTo(document.body);
        chart.append(link);
    }
    link.css({top:0,right:0});
}

google.setOnLoadCallback(draw_charts);
