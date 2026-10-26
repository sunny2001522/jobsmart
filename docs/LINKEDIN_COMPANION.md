# JobSmart LinkedIn Companion

This is a Chrome Extension Manifest V3 integration. It keeps LinkedIn login in
the user's own browser session; JobSmart never receives the LinkedIn password
or session cookie.

## Install locally

1. Run JobSmart locally with `npm run dev`.
2. Open `chrome://extensions`, enable Developer mode, and choose **Load
   unpacked**.
3. Select `integrations/linkedin-companion`.
4. Open the extension popup, confirm the JobSmart URL, and enable sync.
5. Visit one LinkedIn profile page and one public job page. The extension will
   send page context to `/api/linkedin/ingest`, where it is stored in Turso.

## Autopilot boundary

The extension can continuously read, parse, score, tailor, and fill a job
application. It must stop before the final external **Submit application**
action. That last click remains an explicit confirmation because it sends a
job application as the user and can create a binding professional commitment.

LinkedIn's official APIs do not generally grant arbitrary job-application
automation access. This companion uses the user's logged-in browser page and
should be used only in accordance with LinkedIn's terms and the user's own
account permissions.
