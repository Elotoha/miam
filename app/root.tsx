import {
  Links,
  Meta,
  Scripts,
  ScrollRestoration,
  Outlet,
  useRouteError,
  isRouteErrorResponse,
} from "react-router";
import type { Route } from "./+types/root";
import "./styles/app.css";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#f97316" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Miam" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : "Une erreur est survenue";

  return (
    <div className="min-h-screen flex items-center justify-center bg-orange-50 p-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-orange-600 mb-2">Oups ! 🍽️</h1>
        <p className="text-gray-600">{message}</p>
        <a href="/dashboard" className="mt-4 inline-block rounded-lg bg-orange-500 px-6 py-3 text-white font-medium">
          Retour au tableau de bord
        </a>
      </div>
    </div>
  );
}
