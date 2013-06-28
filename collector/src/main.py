from datetime import datetime
import logging
from flask import Flask, request, render_template, Response
import json
import iso8601
from google.appengine.api import files
from models import Event

app = Flask(__name__)

BUCKET_NAME = "potamus"


@app.route('/')
def index():
    return "Potamus"


# GS not in use
@app.route('/events')
def list_events():
    path = "/gs/{bucket}".format(bucket=BUCKET_NAME)
    gs_files = files.listdir(path, max_keys=50)
    return render_template("list_events.html", files=gs_files)


# GS not in use
def write_to_cloud_storage(name):
    fname = "/gs/{bucket}/{event}/{datetime}".format(bucket=BUCKET_NAME,
        event=name, datetime=datetime.utcnow().isoformat())
    writable_fname = files.gs.create(fname, mime_type="text/plain",
        acl="public_read")
    with files.open(writable_fname, 'a') as f:
        f.write(request.data)
    files.finalize(writable_fname)
    return str(writable_fname)


@app.route('/events/<app_id>/<name>', methods=["GET", "POST"])
def event_request(app_id, name):

    app_id = canonical_app_id(app_id)

    if request.method == "GET":
        domains = request.args.getlist("domain") or []
        events = event_query(app_id, name, start_ts=request.args.get("start", None), end_ts=request.args.get("end", None))
        events = [e.to_dict() for e in events.fetch(request.args.get("limit", 5000)) if not domains or not e.domain or e.domain in domains]
        json_data = json.dumps(events, default=lambda(obj): obj.isoformat() if hasattr(obj, 'isoformat') else obj)
        callback = request.args.get('callback')
        if callback:
            return Response("{callback}({data});".format(callback=callback, data=json_data), mimetype='application/javascript')
        return Response(json_data, mimetype='application/json')

    if request.method == "POST":
        json_data = request.data
        data = json.loads(json_data)
        ts = request.args.get('ts')
        domain = request.args.get('domain') or data.get('domain', None)
        sender = request.args.get('sender') or data.get('sender', "")
        ip = request.remote_addr if not request.headers.getlist("X-Forwarded-For") else request.headers.getlist("X-Forwarded-For")[0]
        log_event_ds(app_id, name, data=json_data, ts=ts, domain=domain, sender=sender + ":" + ip if sender else ip)
        return "OK"


@app.route('/costs/costs.js', methods=['GET'])
def graph_costs_js():
    return Response(render_template('costs.js'), mimetype='application/javascript')


@app.route('/costs/<app_id>', methods=["GET"])
def graph_app_costs(app_id):
    events = request.args.getlist("event") or []
    domains = request.args.getlist("domain") or []
    return render_template('costs.html', app_id=app_id,
                           events=json.dumps(events),
                           domains=json.dumps(domains),
                           start_ts=request.args.get("start", ""),
                           end_ts=request.args.get("end", ""))


@app.route('/costs', methods=["GET"])
def graph_costs():
    events = request.args.get("event") or []
    domains = request.args.get("domains") or []
    return render_template('costs.html', app_id='',
                           events=json.dumps(events),
                           domains=json.dumps(domains),
                           start_ts=request.args.get("start", ""),
                           end_ts=request.args.get("end", ""))


def canonical_app_id(app_id):
    if app_id.find("s~") == 0:
        app_id = app_id[2:]
    return app_id


def log_event_ds(app_id, name, data=None, ts=None, domain=None, sender=None):
    if data is None:
        data = dict()

    if ts:
        ts = iso8601.parse_date(ts, default_timezone=None)
    else:
        ts = datetime.now()

    event = Event(app_id=app_id, name=name, ts=ts, data=data, domain=domain, sender=sender)
    event.put()
    return event


def event_query(app_id='all', name='all', start_ts=None, end_ts=None):
    query = Event.all()
    if app_id != 'all':
        query = query.filter('app_id', app_id)
    if name != 'all':
        query = query.filter('name', name)
    if start_ts:
        query = query.filter('ts >=', start_ts if isinstance(start_ts, datetime) else iso8601.parse_date(start_ts))
    if end_ts:
        query = query.filter('ts <=', end_ts if isinstance(end_ts, datetime) else iso8601.parse_date(end_ts))

    return query.order('ts')


