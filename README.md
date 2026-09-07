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
cron and no runner: clone the repo, fill in a `.env` with your 42 credentials,
and it runs. The cache is the server's own memory.

Requests are split by what they cost:

**On the site's own keys.** A whole campus arrives in one paginated call -- a
dozen or so requests, however many students there are -- so rankings, the
trombinoscope, the piscine, find-peers, events, the cluster map and every
dashboard are fetched on demand and held for a few minutes. Configure
`CLIENT_ID2`/`CLIENT_SECRET2` and beyond to widen that budget; `CLIENT_ID1` is
left to next-auth so browsing can never lock anyone out of signing in.

**On your own key, if you connect one.** 42 meters per application, so everyone
browsing on the site's keys shares one paced queue and waits behind each other
at busy moments. A student who registers their own 42 application (intra ->
Settings -> API) and connects it from the sidebar gets a lane of their own:
1200 requests an hour nobody else is drawing from. Their key also fills the
shared cache, so a page they pay to load is free for the next visitor.

The credentials are sealed into an encrypted httpOnly cookie that lasts a
month, so the key is entered once rather than every session -- what is stored
is the credentials, not the two-hour access token, which is what lets the
server mint a fresh token without asking again.

Logtime is the one thing that needs a key. It costs one request per student,
more than an hour of any single budget and more than a page load can wait for,
and the server keeps nothing between requests. Build it from the rankings page
and it is stored in your browser.

**Seeing what is left.** The header shows, on every page, how many requests are
in flight and how much of the hourly budget remains; `/api/quota` returns the
same figures. They are the 42 API's own: it reports
`x-hourly-ratelimit-remaining` on every /v2 response, and it meters per
application -- a fresh token from the same credentials continues the same
budget rather than resetting it. So these are readings, not estimates. A key
that has not been used yet on a given server instance falls back to our own
count, and says so.

### What this costs

Data that has to be accumulated rather than fetched cannot exist without
somewhere to accumulate it. These were built by the retired cron jobs and are
not available: correction OK/KO ratios, the peer relation graph, hours per
workstation on the cluster map, piscine exam grades, and the live exam tracker.
Sorts that depend on them are hidden rather than ranking everyone on zeroes.

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
