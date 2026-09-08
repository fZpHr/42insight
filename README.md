# 🌐 42Insight

Welcome to `42Insight`, the ultimate all-in-one solution for students of 42 Angoulême/Nice! 

This website aims to centralize all the essential tools and resources students need, making your journey at 42 easier and more efficient. From rankings to trombinoscope and much more to come, we’ve got you covered.

> [!WARNING]  
> Most of the features are only available for Angoulême and Nice campus

=> Access the website here : [42Insight](https://42insight.vercel.app/)

## Features

All of the Old Features from our existing website have been moved to one website such as :

- Rankings (Level, Corrector, ...)
- Trombinoscope
- Exam tracker
- RNCP Simulator
- Pool Rankings
- Find-Peers
- Tree Graph Relation (in reworking for now)

## Where the data comes from

Everything is read live from the 42 API. There is no database, no Redis, no
cron and no runner: clone the repo, fill in a `.env`, and it runs.

One key, doing both jobs.

There used to be a second, site-owned 42 application just for signing people
in, separate from the one a visitor registers for data. Everyone needed the
second key anyway to see anything, so the first bought nothing but an extra
step -- and a secret of mine to keep alive on top of it.

**Your key signs you in and fetches the data.** Register an application on the
intra (Settings → API → Register a new app, set to Public) and connect it on
the landing page. Signing in works by asking 42 who owns that application: its
credentials are exchanged for a token, `GET /v2/apps?filter[uid]=` on that
token names the owner, and a profile lookup on that login builds the session.
42 only lists public applications there, so a private one won't resolve --
the page says so if that happens. The same credentials are also sealed into an
encrypted httpOnly cookie that lasts a month, so the key is entered once, not
every session — what is stored is the credentials, not the two-hour access
token, which is what lets the server mint a fresh one without asking again.

What one visitor fetches is cached in the server's memory for a few minutes, so
a page you pay to load is free for the next reader.

**Seeing what is left.** The header shows, on every page, how many requests are
in flight and how much of your hourly budget remains. The figures are the 42
API's own: it reports `x-hourly-ratelimit-remaining` on every /v2 response, and
meters per application — a fresh token from the same credentials continues the
same budget rather than resetting it. So these are readings, not estimates.
`/api/quota` returns the same thing.

### What this costs

Data that has to be accumulated rather than fetched cannot exist without
somewhere to accumulate it. These were built by the retired cron jobs and are
not available: correction OK/KO ratios, the peer relation graph, hours per
workstation on the cluster map, piscine exam grades, and the live exam tracker.
Sorts that depend on them are hidden rather than ranking everyone on zeroes.

Logtime is the exception, because it is worth the trouble: it costs one request
per student, so it is built from the rankings page with your key and stored in
your browser.

## Tech-Stack

- Frontend: React.js with Next.js, components from ShadCN, design mostly from V0.dev
- Backend: Next.js API routes
- State Management: Zustand (only for RNCP Simulator)
- Tanstack: TanStack Query (React Query)
- Authentication: next-auth (FortyTwo Oauth2Provider)
- Data: the 42 API, read live; no database, no external store
- Deployment: Vercel

## Contributions

We welcome contributions from everyone ! So if you want something missing or fix some bugs : 

1. [Fork](https://github.com/fZpHr/42insight/fork) the repository
2. Clone the forked repository and cd into it:
```bash
git clone <your repo> my-42insight-fork
cd my-42insight-fork
```
2. Create a new branch; for example:
```bash
git checkout -b feature/your-feature-name
# Or
git checkout -b fix/that-one-bug
```
3. Commit your changes:
```bash
git commit -m "A descriptive commit message here"
```
4. Push to your branch:
```bash
git push origin feature/your-feature-name
```
5. Open a pull request describing your changes

## Creators

- [Zeph](https://github.com/fZpHr)
- [Haletran](https://github.com/Haletran)

Feel free to reach out to us for any questions or suggestions!

## License

This project is licensed under the [MIT License](LICENSE). Feel free to use, modify, and distribute it as needed.
