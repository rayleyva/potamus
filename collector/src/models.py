from google.appengine.ext import db


class Event(db.Model):
    app_id = db.StringProperty(required=True)
    name = db.StringProperty(required=True)
    ts = db.DateTimeProperty(required=True, auto_now_add=True)
    data = db.TextProperty(required=True)
    domain = db.StringProperty(default=None)
    sender = db.StringProperty(default=None)

    def to_dict(self):
        return {
            'app_id':self.app_id,
            'name':self.name,
            'ts':self.ts,
            'data':self.data,
            'domain':self.domain,
            'sender':self.sender,
        }
