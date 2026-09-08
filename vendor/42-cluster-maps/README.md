# 42 cluster maps

Seat-by-seat layouts for 25 campuses, taken verbatim from
[pvarry/intra42](https://github.com/pvarry/intra42) at
`app/src/main/res/raw/cluster_map_campus_<id>.json`, vendored on 2026-09-08
from the state of that repository at its last push (2024-12-06).

Licensed under Apache 2.0 (see LICENSE). The JSON files are unmodified; only
their names changed, from `cluster_map_campus_<id>.json` to `campus_<id>.json`.
`campus_0.json` was dropped: campus 0 does not exist on the 42 API.

## Why these are here rather than fetched

42 does publish this data, at `/v2/clusters`, and that endpoint answers 403 to
an application holding the `public` scope. `public` is the only scope
`client_credentials` will grant, so no key a student registers can reach it.
Vendoring keeps the site free of a runtime dependency on someone else's
repository, which is the same reason it has no database and no cron.

## Trust, but check

The data is crowd-sourced through that app's contribution flow and was last
touched in December 2024, so some of it has aged. Paris is the clear case: its
map here is `e1r13p1` and the campus now runs `f2r10s6`, which is a move, not a
typo -- not one live host matches.

`lib/forty-two/cluster-plans.ts` therefore checks a map against the hosts 42
reports as being in use before trusting it, and falls back to working the
layout out from the host names when it does not hold up.

Where it does hold up it is exact. Nice and Angouleme were drawn by hand in
this repo before this directory existed, and against those two: 144 of 144
workstations at Nice, 53 of 53 at Angouleme, identical on both sides.
