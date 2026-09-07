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

**In your own browser.** Logtime costs one request per student, which is more
than an hour of the site's budget and more than any page load can wait for --
and the server keeps nothing between requests, so there would be nowhere to put
it. A student who wants the logtime sorts registers their own 42 application
(intra -> Settings -> API), spends a few minutes of their own quota once from
the rankings page, and the index is stored in their browser.

`/api/quota` reports the rate-limit headers the 42 API answered with, for staff
and admins.

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
