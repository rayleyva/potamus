#!/usr/bin/env python
from __future__ import with_statement

import sys
import argparse
import re
import os
import os.path
import subprocess
import select
import errno
import fcntl
from collections import deque
try:
    import json
except ImportError:
    import simplejson as json # pyflakes.ignore


try:
    from pygments.console import colorize
except ImportError:
    colorize = lambda color, text: text  # pyflakes.ignore

ALIASES = {
    "acl": "aprigocloudlock",
    "dev1": "cloudlockdev1",
    "dev2": "cloudlockdev2",
    "dev3": "cloudlockdev3",
    "dev4": "cloudlockdev4",
    "cld1": "cloudlockdev1",
    "cld2": "cloudlockdev2",
    "cld3": "cloudlockdev3",
    "cld4": "cloudlockdev4",
    "an1": "aprigoninja1",
    "an2": "aprigoninja2",
    "an3": "aprigoninja3",
    "an4": "aprigoninja4",
    "an5": "aprigoninja5",
    "an6": "aprigoninja6",
    "an7": "aprigoninja7",
    "clp1": "cloudlockprimary1",
    "clp2": "cloudlockprimary2",
    "cl1": "cloudlock1",
    "cl2": "cloudlock2",
    "cl3": "cloudlock3",
    "cl4": "cloudlock4",
    "cl5": "cloudlock5",
    "cl6": "cloudlock6",
    "cl7": "cloudlock7",
    "cl8": "cloudlock8",
    "cl9": "cloudlock9",
    "cl10": "cloudlock10",
    "cl11": "cloudlock11",
    "cl12": "cloudlock12",
    "cl13": "cloudlock13",
    "cl14": "cloudlock14",
    "cl15": "cloudlock15",
    "cl16": "cloudlock16",
    "cl17": "cloudlock17",
    "cl18": "cloudlock18",
    "cl19": "cloudlock19",
    "cl20": "cloudlock20",
    "qa1": "cloudlockqa1",
    "qa2": "cloudlockqa2",
    "qa3": "cloudlockqa3",
    "qa4": "cloudlockqa4",
    "hrd": "cloudlockhrd",
    "ds1": "domainshape1",
    "ds2": "domainshape2",
    "ds3": "domainshape3",
    "ds4": "domainshape4",
    "ds5": "domainshape5",
    "migms": "migration-ms",
    "mighrd": "migration-hrd",
    "db": "cloudlock-dev-db",
}


def make_parser():
    p = argparse.ArgumentParser(description="Upload project to App Engine.")
    p.add_argument("specs", metavar="application:version", nargs="+",
        help="Application and version, separated by a colon. "
          "You may also use application aliases: edit this script "
          "to see what they are.")
    p.add_argument("-o", "--oauth2", default=True, action="store_true",
        help="Use oAuth2 token-based authentication [True]")
    p.add_argument("-p", "--password", default=False,
        dest="oauth2", action="store_false",
        help="Use password authentication [False]")
    p.add_argument("--appcfg", default=None,
        help="Path to appcfg script [bin/appcfg]")
    p.add_argument("--appdir", default=None,
        help="Path to app directory [autodetect]")
    p.add_argument("--backends", default=True, action="store_true",
        help="Upload to both frontend and backends [True]")
    p.add_argument("--no-backends", "--nb", action="store_false", dest="backends",
        help="Upload to frontend only [False]")
    p.add_argument("--courier-stat", default="~/clones/courier-stat",
        help="Path to courier-stat repo [~/clones/courier-stat]")
    p.epilog = "Other command line arguments will be passed through to the appcfg script."
    return p


def is_appdir(dir):
    "A directory is an app directory if it contains an `app.yaml` file"
    return os.path.isfile(os.path.join(dir, "app.yaml"))


def is_hrd(appdir):
    app_yaml = os.path.join(appdir, "app.yaml")
    try:
        import yaml
    except ImportError:
        # make a decent guess
        with open(app_yaml) as f:
            for line in f:
                if "runtime: python27" in line:
                    return True
            return False
    else:
        # we can actually parse the file!
        app = yaml.load(open(app_yaml))
        return app["runtime"] == "python27"


def find_appdir(start):
    "Find the app directory with a breadth-first search"
    dirs = deque([start])
    while dirs:
        dir = dirs.popleft()
        if is_appdir(dir):
            return dir
        dirs.extend(subdirs(dir))
    return None


def subdirs(dir):
    "Returns a generator of subdirectories"
    for file in os.listdir(dir):
        if dir == ".":
            path = file
        else:
            path = os.path.join(dir, file)
        if os.path.isdir(path) and not os.path.islink(path):
            yield path


def make_async(fd):
    """
    Helper function to add the O_NONBLOCK flag to a file descriptor

    http://stackoverflow.com/questions/7729336/how-can-i-print-and-display-subprocess-stdout-and-stderr-output-without-distorti/7730201#7730201
    """
    fcntl.fcntl(fd, fcntl.F_SETFL, fcntl.fcntl(fd, fcntl.F_GETFL) | os.O_NONBLOCK)

def read_async(fd):
    """
    Helper function to read some data from a file descriptor, ignoring EAGAIN errors

    http://stackoverflow.com/questions/7729336/how-can-i-print-and-display-subprocess-stdout-and-stderr-output-without-distorti/7730201#7730201
    """
    try:
        return fd.read()
    except IOError, e:
        if e.errno != errno.EAGAIN:
            raise e
        else:
            return ''

def run(args):
    """
    Stream data from stdout and stderr with subprocess

    http://stackoverflow.com/questions/7729336/how-can-i-print-and-display-subprocess-stdout-and-stderr-output-without-distorti/7730201#7730201
    """
    proc = subprocess.Popen(args, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    make_async(proc.stdout)
    make_async(proc.stderr)
    stdout = str()
    stderr = str()
    retcode = None

    while True:
        # Wait for data to become available 
        try:
            select.select([proc.stdout, proc.stderr], [], [])
        except KeyboardInterrupt:
            if hasattr(proc, "terminate"):
                proc.terminate()
            else: # Python 2.5
                import signal
                os.kill(proc.pid, signal.SIGTERM)
            return (retcode, stdout, stderr)

        # Try reading some data from each
        stdoutPiece = read_async(proc.stdout)
        stderrPiece = read_async(proc.stderr)

        if stdoutPiece:
            print stdoutPiece,
        if stderrPiece:
            print stderrPiece,

        stdout += stdoutPiece
        stderr += stderrPiece
        retcode = proc.poll()

        if retcode != None:
            return (retcode, stdout, stderr)


def pretty_run(to_run):
    if isinstance(to_run, basestring):
        text = to_run
    else:
        text = " ".join(to_run)
    sys.stderr.write(colorize("green", text + "\n"))
    return run(to_run)

SO_START = "--- begin server output ---"
SO_END = "--- end server output ---"
DATE_RE = re.compile("\d\d:\d\d (A|P)M")
ERRCODE_RE = re.compile("Error (\d\d\d):")

def get_errors(stderr):
    errors = []
    for msg in DATE_RE.split(stderr):
        code = output = postscript = None
        m = ERRCODE_RE.search(msg)
        if m:
            code = int(m.group(1))
        so_start_index = msg.find(SO_START)
        so_end_index = msg.find(SO_END)
        if so_start_index > -1 and so_end_index > -1:
            output = msg[so_start_index+len(SO_START):so_end_index].strip()
        if so_end_index > -1:
            postscript = msg[so_end_index+len(SO_END)].strip()

        if code or output or postscript:
            errors.append((code, output, postscript))

    return errors


def main():
    args, extra = make_parser().parse_known_args()
    if args.appdir:
        appdir = os.path.expanduser(args.appdir)
    else:
        appdir = find_appdir(".")
    for spec in args.specs:
        if not ":" in spec:
            sys.stderr.write(colorize("red",
                "Invalid spec %s\nMust provide application and version, "
                "separated by a colon\n" % (spec,)))
            sys.exit(1)
    if not appdir:
        sys.stderr.write(colorize("red", "Could not find app directory\n"))
        sys.exit(2)
    if args.appcfg:
        appcfg = os.path.expanduser(args.appcfg)
    else:
        if os.path.isfile("bin/appcfg"):
            appcfg = "bin/appcfg"
        else:
            appcfg = "appcfg.py"

    courier_stat = None
    if args.courier_stat:
        expanded = os.path.expanduser(args.courier_stat)
        if os.path.exists(expanded):
            courier_stat = find_appdir(expanded)

    for spec in args.specs:
        application, version = spec.split(":", 1)
        if application in ALIASES:
            application = ALIASES[application]

        to_run = [appcfg, "update", "--application=%s" % (application,),
            "--version=%s" % (version,)]

        if args.backends and os.path.isfile(os.path.join(appdir, "backends.yaml")):
            to_run.append("--backends")

        if args.oauth2:
            to_run.append("--oauth2")

        to_run.append(appdir)
        to_run.extend(extra)

        retry = True
        while retry:
            retry = False
            retcode, stdout, stderr = pretty_run(to_run)
            if retcode is None:
                return
            for code, output, postscript in get_errors(stderr):
                if code == 409: # rollback
                    retry = True
                    m = re.search("backend: ([^.]+)\.", output)
                    if m:
                        rollback = [appcfg, "backends", appdir, "rollback", m.group(1),
                            "--application=%s" % (application,)]
                    else:
                        rollback = [appcfg, "rollback", appdir,
                            "--application=%s" % (application,),
                            "--version=%s" % (version,)]
                    if args.oauth2:
                        rollback.append("--oauth2")
                    rollback.extend(extra)
                    pretty_run(rollback)
                if code == 503 and not "Your app can still serve" in postscript:
                    retry = True

        # courier-stat
        if args.backends and courier_stat and is_hrd(appdir):
            to_run = [appcfg, "backends", courier_stat, "update",
                "--application=%s" % (application,)] # backends don't have versions

            if args.oauth2:
                to_run.append("--oauth2")

            to_run.extend(extra)

            retry = True
            while retry:
                retry = False
                retcode, stdout, stderr = pretty_run(to_run)
                for code, output, postscript in get_errors(stderr):
                    if code == 409: # rollback
                        retry = True
                        rollback = [appcfg, "backends", courier_stat, "rollback", "courier-stat",
                            "--application=%s" % (application,)]
                        if args.oauth2:
                            rollback.append("--oauth2")
                        rollback.extend(extra)
                        pretty_run(rollback)
                    if code == 503 and not "Your app can still serve" in postscript:
                        retry = True


if __name__ == "__main__":
    main()
