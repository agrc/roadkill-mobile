import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from '@remix-run/react';
import { useEffect } from 'react';
import * as gtag from '~/utils/gtags.client';
import styles from './tailwind.css';

export function meta() {
  return [{ title: 'Utah Roadkill Reporter' }];
}

export function links() {
  return [{ rel: 'stylesheet', href: styles }];
}

const gaTrackingId = 'G-P135E0DCLT';

export default function App() {
  useEffect(() => {
    gtag.pageview(location.pathname, gaTrackingId);
  }, []);

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="p-10 font-sans text-gray-700">
        {process.env.NODE_ENV === 'development' ? null : (
          <>
            <script
              async
              src={`https://www.googletagmanager.com/gtag/js?id=${gaTrackingId}`}
            />
            <script
              async
              id="gtag-init"
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());

                  gtag('config', '${gaTrackingId}', {
                    page_path: window.location.pathname,
                  });
                `,
              }}
            />
          </>
        )}
        <Outlet />
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}
