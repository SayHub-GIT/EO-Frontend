# EO Frontend — local setup and dependency recovery

This project uses **npm** and a committed `package-lock.json`. Use Node.js 22 and npm 10 (matching GitHub CI).

## Start locally (Windows PowerShell)

```powershell
git pull origin main
npm ci
npm run dev
```

If you pulled changes but kept an old `node_modules`, the `predev` hook now checks that `chart.js/auto` exists at the pinned version and repairs missing dependencies with `npm ci`. On a repair it also clears the stale `.next` cache. The same preflight runs for `npm run dev:lan` and `npm run build`.

If package installation is blocked (for example by an offline registry or locked files), stop all Next.js servers and run:

```powershell
npm ci
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npm run dev
```

Validate the chart dependency with `node -e "console.log(require.resolve('chart.js/auto'))"`. A successful command prints the local package path. Do not commit `node_modules` or remove `package-lock.json`.

The Cloudflare build script performs `npm ci` before bundling the Worker, so deployment always uses the committed application dependency tree.

---

This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/basic-features/font-optimization) to automatically optimize and load Inter, a custom Google Font.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.
