# WHOIS CHOICE — Production Domain Checker

Production Next.js landing page with SEO configuration.

## Included SEO
- SEO title and description
- Meta keywords
- Canonical URL
- Open Graph metadata
- Twitter/X metadata
- Robots directives
- Dynamic sitemap at `/sitemap.xml`
- Dynamic robots file at `/robots.txt`
- JSON-LD WebApplication structured data
- WHOIS CHOICE favicon
- Google Search Console verification support through `.env.local`

## Site URL
https://www.whoischoice.com

## Google Search Console
Create/verify the property in Google Search Console, copy the HTML verification token, and add:

```env
NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=your-token
```

Then redeploy.

## Run
```bash
npm install
npm run dev
```

- Supplied WHOIS CHOICE logo used in the top header (`/public/whoischoice-logo.png`).


## Domain Registration Enquiry Form

When a searched domain is available, clicking **Register Domain ↗** opens a popup form with:
- Name
- Email
- Contact No.
- Address
- Domain (automatically filled from the available domain result)

The submitted enquiry is emailed to `sumitnagar06@gmail.com`. Configure SMTP credentials in `.env.local` using the variables shown in `.env.example`.

Example:
```env
SMTP_HOST=smtp.yourmailserver.com
SMTP_PORT=587
SMTP_USER=your-smtp-username
SMTP_PASSWORD=your-smtp-password
SMTP_FROM="Whois Choice <your-smtp-username>"
```

For Gmail/Google Workspace SMTP, use an App Password rather than your normal account password when SMTP authentication requires it.
