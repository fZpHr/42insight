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
touched in December 2024, so some of it has aged. Surveyed on 2026-09-08
against the hosts 42 reports in use, one page of recent locations per campus:

| Campus | Workstations | Match | |
| --- | ---: | ---: | --- |
| Nice | 144 | 100% | current |
| Barcelona | 177 | 99% | current |
| Malaga | 207 | 97% | current |
| Lausanne | 181 | 79% | current |
| Khouribga | 300 | 65% | current |
| Abu Dhabi | 112 | 52% | current |
| Lyon | 161 | 42% | adrift |
| Angouleme | 53 | 32% | adrift |
| Benguerir | 150 | 32% | adrift |
| Madrid | 84 | 30% | adrift |
| Amsterdam | 56 | 16% | adrift |
| Lisboa | 148 | 13% | adrift |
| Mulhouse | 1 | 2% | adrift |
| Paris | 811 | 0% | moved |
| Belgium | 89 | 0% | moved |
| Quebec | 179 | 0% | moved |
| Seoul | 69 | 0% | moved |
| Rome | 152 | 0% | moved |
| Heilbronn | 288 | 0% | moved |
| Yerevan | 0 | 0% | empty file |

Paris is the clearest case: its map here is `e1r13p1` and the campus now runs
`f2r10s6`, which is a move rather than a typo. Five further files (campus ids
5, 7, 8, 17, 23) are for campuses the API no longer serves at all.

`lib/forty-two/cluster-plans.ts` therefore samples a map against the hosts in
use before trusting it, and falls back to working the layout out from the host
names below half. Half is the bar because of what the map is for: under it,
most of the people logged in are at machines the map has never heard of and so
appear nowhere, and a schematic that shows everyone beats a room that hides
them.

Where a map does hold up it is exact. Nice and Angouleme were drawn by hand in
this repo before this directory existed, and against those two: 144 of 144
workstations at Nice, 53 of 53 at Angouleme, identical on both sides.

## Other collections looked at

- [nicopasla/better-intra](https://github.com/nicopasla/better-intra) (MIT,
  actively maintained) has campus files for 41 campuses, but only Belgium
  carries an actual seat layout; the rest are `"definitions": {}` with just
  cluster ids and names.
- [femaury/intra_42](https://github.com/femaury/intra_42) has the same format
  for 11 campuses, and is GPL-3.0, which does not sit with this project's MIT.
