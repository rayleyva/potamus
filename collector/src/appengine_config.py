# Appstats settings
# Set your timezone
appstats_TZOFFSET = 5*3600
# Enable interactive console (/_ah/stats/shell)
appstats_SHELL_OK = True
# How much stack is captured for each RPC call
appstats_MAX_STACK = 20
# Restrict to specific requests based on CGI/WSGI env
appstats_FILTER_LIST = [{'PATH_INFO': '/appstats-nowhere'}]


def webapp_add_wsgi_middleware(app):
    # Enable RPC (datastore and API) profiling via appstats (/_ah/stats)
    from google.appengine.ext.appstats import recording
    app = recording.appstats_wsgi_middleware(app)

    return app

