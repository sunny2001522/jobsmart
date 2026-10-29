# JobSmart LinkedIn Companion

The Companion is an optional Chrome extension for filling supported fields in
the user's own LinkedIn Easy Apply page. JobSmart does not use LinkedIn OAuth,
does not receive the LinkedIn password or session cookie, and does not click
Next or Submit. The user reviews the page and submits the application.

## Install and pair

1. Sign in to JobSmart and open **Settings → LinkedIn Companion**.
2. Load `integrations/linkedin-companion` in Chrome from
   `chrome://extensions` using **Developer mode → Load unpacked**.
3. In the extension popup, enter the JobSmart origin. Production origins must
   use HTTPS; local development may use `http://localhost:3004`.
4. Generate a pairing code in JobSmart, paste it into the popup, and pair.
   Codes expire after five minutes and can be used once. Chrome asks for access
   to the JobSmart origin. The extension stores its revocable bearer token in
   Chrome's local extension storage; revoke it in JobSmart if the browser or
   extension is no longer trusted.

## Page sync and permissions

Pairing enables the fill helper, but page sync is a separate setting and is off
by default. In JobSmart, enable profile sync and/or job-page sync only if you
want content from those pages saved to your account. When enabled, the extension
reads pages you visit on LinkedIn and sends page text and available JSON-LD to
JobSmart. It does not run a background crawler or sync on a timer. The extension
does not read LinkedIn pages outside its declared profile and jobs URL patterns.

## Prepare and fill an application

1. Search jobs in JobSmart, or add a listing to the tracker. Search results are
   leads: confirm the company, role, and current listing before relying on them.
2. Open a lead, review or paste the full job description, choose a source resume,
   then generate the tailored resume and cover-letter drafts.
3. Review the generated facts, edit both drafts as needed, and save them in
   JobSmart. The application is not ready for the extension until these saved
   drafts exist.
4. Check the explicit consent box to create a fill task, then open the LinkedIn
   job page. Tasks are user-scoped and expire after two hours.
5. Open Easy Apply and choose **Fill current form** in the Companion panel. It
   matches supported name, email, phone, LinkedIn URL, cover-letter, and resume
   upload fields. It may not recognize a field when LinkedIn changes its page.

The extension never advances the form or submits it. Inspect all fields and
attachments, finish any unsupported questions yourself, and submit in LinkedIn.
Only mark an application as **Applied** in JobSmart after you have submitted it.

PDF attachment depends on LinkedIn's current form implementation and may fail.
If the extension reports that no resume was attached, attach the PDF manually.
LinkedIn DOM changes can also make field detection incomplete; the panel reports
that case and leaves the form available for manual entry.

## Job-search service configuration

Job discovery uses Google Custom Search, filtered to the selected public job
sites. It is not the LinkedIn API and cannot guarantee that a listing is current,
complete, or accepting applications. Set either supported pair of environment
variables on the JobSmart server:

- `GOOGLE_SEARCH_API_KEY` (or `GOOGLE_API_KEY`)
- `GOOGLE_SEARCH_ENGINE_ID` (or `GOOGLE_CSE_ID`)

Without both credentials, JobSmart returns a configuration error and does not
create demo listings. Google Custom Search quotas and the configured search
engine's site coverage apply.

## Scheduled searches

Manual search works from the application. Background hourly/daily searches need
the app deployed to Vercel with `CRON_SECRET` configured. `vercel.json` calls
`/api/automation/cron` hourly; the endpoint accepts only a matching bearer
secret and processes users whose saved search is enabled and due. The hourly
cron checks daily schedules too, so execution can occur up to about an hour
after the displayed due time. The Vercel project plan must support an hourly
cron. Local development does not run this scheduler.

Scheduled searches only add leads to the JobSmart candidate list. They do not
approve a resume, create a LinkedIn fill task, or apply for a job.
