import unittest
import main
import json
import os


class TestEventsFunction(unittest.TestCase):

    def setUp(self):
        os.environ['APPLICATION_ID'] = 'cloudlock-potamus'
        datastore_file = '/dev/null'
        from google.appengine.api import apiproxy_stub_map, datastore_file_stub
        apiproxy_stub_map.apiproxy = apiproxy_stub_map.APIProxyStubMap()
        stub = datastore_file_stub.DatastoreFileStub('cloudlock-potamus', datastore_file, '/')
        apiproxy_stub_map.apiproxy.RegisterStub('datastore_v3', stub)

    def test_timestamped_events(self):
        timestamp = main.get_timestamp()
        data = json.dumps({'test-type': 'test-data', 'creation-time': timestamp})
        app_id = 'test-application'
        event = main.create_event_ds(app_id, 'test-event', data)
        self.assertEqual(event.name, 'test-event')
        self.assertEqual(event.ts, timestamp)
        self.assertEqual(event.data,  data)

    def test_automatic_timestamp(self):
        timestamp = main.get_timestamp()
        app_id = 'test-application'
        data = json.dumps({'test-type': 'test-data'})
        event = main.create_event_ds(app_id, 'test-event', data)
        self.assertEqual(event.name, 'test-event')
        self.assertAlmostEqual(event.ts,  timestamp)
        self.assertEqual(event.data,  data)

    def test_query_all(self):
        main.query_event('all')

    def test_query_event_type(self):
        main.query_event('test-event')

    def test_query_start(self):
        pass

    def test_query_end(self):
        pass

    def test_query_ts_range(self):
        pass

    def test_limit(self):
        query = main.query_event('all', limit=10)
        self.assertEqual(len(query), 10)




if __name__ == '__main__':
    unittest.main()
