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
