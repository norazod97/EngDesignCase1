# COROB Weld Cell — Operator HMI Concept

A responsive, browser-based sign-in mockup for a multi-robot gas metal arc welding (GMAW) cell. The post-login view currently contains only a personalized welcome and sign-out; additional operator content can be defined later.

## Run locally

Install the Node.js dependencies with `npm install`, start the Vite development server with `npm run dev`, and open the local URL it prints. Run `npm run build` to create the production site in `dist/` or `npm run preview` to preview that build.

## Demo credentials

| Operator ID | Password | Welcome name |
| --- | --- | --- |
| `operator1` | `WeldDemo123` | Operator One |
| `operator2` | `WeldDemo456` | Operator Two |

Successful sign-in is remembered in this browser until sign-out. The demo credentials and check are in the client-side JavaScript, so this is **not secure authentication** and must not be used to protect real systems or data. The interface does not connect to or control robot equipment.

## GitHub Pages

The workflow in `.github/workflows/deploy-pages.yml` builds the React/Vite app and publishes `dist/` to GitHub Pages on each push to `main` and on manual workflow dispatch. Vite uses the GitHub project-page base path in Actions builds.

For `norazod97/EngDesignCase1`, the expected project URL is <https://norazod97.github.io/EngDesignCase1/> after the workflow completes. Availability for a private repository depends on the GitHub account’s current Pages plan and repository settings.
