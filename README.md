# 🌐 42Insight

Welcome to `42Insight`, the ultimate all-in-one solution for students of 42 Angoulême! 

This website aims to centralize all the essential tools and resources students need, making your journey at 42 easier and more efficient. From rankings to trombinoscope and much more to come, we’ve got you covered.

> [!WARNING]  
> Most of the features are only available for Angoulême and Nice campus

=> Access the website here : [42Insight](https://www.42insight.tech/)

## Features

All of the Old Features from our existing website have been moved to one website such as :

- Rankings (Level, Corrector, ...)
- Trombinoscope
- Exam tracker
- RNCP Simulator
- Pool Rankings
- Find-Peers
- Tree Graph Relation (in reworking for now)

## Tech-Stack

- Frontend: React.js with Next.js, components from ShadCN, design mostly from V0.dev
- Backend: Next.js API routes
- State Management: Zustand (only for RNCP Simulator)
- Tanstack: TanStack Query (React Query)
- Authentication: next-auth (FortyTwo Oauth2Provider)
- Database: Mariadb
- ORM: Prisma
- Caching: Redis (Upstash)
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
