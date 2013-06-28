from main import app
import gviz_api

dummy_data = [
    ["12:00", 1.65, 9.38,   5.22, None, None, 2],
    ["13:00", 1.65, 9.38,   5.02, "Scan Start", "Scan start details", 7],
    ["13:05", 1.65, 8.18,   4.82, "A", "start admin@testcloudlockdev3.com", 8],
    ["13:06", 1.65, 9.08,   5.22, "B", "start bob@testcloudlockdev3.com", 15],
    ["13:07", 1.65, 9.38,  5.22, "C", "start alice@testcloudlockdev3.com", 14],
    ["13:10", 1.36, 16.91, 10.29, None, None, 14],
    ["13:11", 1.36, 17.91, 10.29, "A", "end admin@testcloudlockdev3.com", 14],
    ["13:12", 1.36, 16.0,  10.29, "B", "end bob@testcloudlockdev3.com", 14],
    ["13:15", 1.36, 14.91,  8.29, None, None, 12],
    ["13:20", 1.36, 6.91,   6.29, None, None, 10],
    ["14:00", 1.39, 11.10,  6.15, "Scan End", "Scan end details", 9],
    ["14:10", 1.36, 7.91,   6.29, None, None, 5],
    ["15:00", 1.35, 11.20,  5.99, None, None, 5],
    ["15:20", 1.39, 11.10,  6.15, None, None, 5],
    ["15:30", 1.39, 11.10,  6.15, None, None, 4],
    ["15:32", 1.39, 11.10,  6.15, "C", "end alice@testcloudlockdev3.com", 4],
    ["16:00", 1.57, 11.67,  5.87, None, None, 3],
    ["17:00", 1.39, 11.10,  6.15, None, None, 2],
    ["18:00", 1.36, 6.91,   6.29, None, None, 2]
]


data_desc = [
    ('month', 'string', 'Month'),
    ('small_ops', 'number', 'Small Operations'),
    ('write_ops', 'number', 'Write Operations'),
    ('read_ops', 'number', 'Read Operations'),
    #({'type':'string', 'role':'annotation'}),
    #({'type':'string', 'role':'annotationText'}),
    ('ann', 'string', 'Annotation'),
    ('annT', 'string', 'AnnotationText'),
    ('instance', 'number', 'Instances'),
]


@app.route('/magna')
def magna():
    data_table = gviz_api.DataTable(data_desc, dummy_data)
    data_json = data_table.ToJSon()
    return data_json
