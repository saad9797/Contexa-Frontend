# Contexa — Frontend

A React interface for turning database, storage and repository ingestion into usable context for AI coding assistants.

**[Live product](https://www.contexa.tech/) · [Backend repository](https://github.com/saad9797/Contexa-Backend) · [Developer portfolio](https://www.syedsaads.dev/)**

## Repository scope

This is a **public development snapshot** of Contexa's ingestion console. The live product has evolved beyond this snapshot; the repository should not be treated as a complete copy of the deployed SaaS.

The interface supports:

- Starting ingestion runs.
- Browsing previous runs and inspecting their details.
- Viewing generated Claude context.
- Configuring the API base URL and authentication scheme.

## Stack and structure

React 18, Vite and JavaScript. Material UI and Emotion are declared dependencies; the ingestion console also uses custom styles and inline SVG.

- `src/App.jsx` — application entry component.
- `src/components/ExampleComponent.jsx` — ingestion console, request handling and settings.
- `vite.config.js` — development/build configuration.

## Run locally

Install a Node.js version supported by the declared Vite version, then:

```bash
git clone https://github.com/saad9797/Contexa-Frontend.git
cd Contexa-Frontend
npm install
npm run dev
```

Create a local `.env` file with the backend's base URL:

```dotenv
VITE_API_BASE_URL=http://localhost:8000
```

The console defaults to `http://localhost:8000` and provides a settings panel to override it.

Start a compatible backend using the [backend setup instructions](https://github.com/saad9797/Contexa-Backend#readme). Configure the API token in the console settings. DRF token authentication uses **Token**; use **Bearer** only with a backend configured for JWT.

Client-side environment variables are part of the browser bundle. Keep database passwords, service-role keys and other server credentials on the backend.

## API contract used by the console

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/api/ingestion/run/` | Start ingestion |
| GET | `/api/ingestion/` | List ingestion runs |
| GET | `/api/ingestion/<id>/` | Retrieve run details |
| GET | `/api/ingestion/<id>/claude-context/` | Retrieve generated context |

Available routes depend on the backend version. Pair this snapshot with a backend that implements the required endpoints.

## Build

```bash
npm run build
npm run preview
```

The preview command serves the production build locally. This repository's package scripts do not currently define an automated test or lint command.

## Engineering focus

This project demonstrates API-driven React interfaces, asynchronous request states, configurable backend integration and presentation of infrastructure context. For the current product experience, visit [contexa.tech](https://www.contexa.tech/).
