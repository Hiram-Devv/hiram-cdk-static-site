# hiram-cdk-static-site

Reusable AWS CDK construct to deploy static websites with a complete production-ready architecture.

## What it creates

- **S3** — Private bucket, all public access blocked
- **CloudFront** — Global CDN with HTTPS, OAC, HTTP/2 + HTTP/3, TLS 1.2+
- **Route 53** — Apex + optional www Alias records
- **ACM** — Auto-renewable SSL certificate with DNS validation
- **CloudFront Function** — Optional URL rewriting for i18n / SPAs

## Prerequisites

- Node.js 22+ and AWS CDK CLI (`npm install -g aws-cdk`)
- AWS account bootstrapped: `cdk bootstrap aws://ACCOUNT_ID/us-east-1`
- Target domain already registered in Route 53 (hosted zone exists)

## Usage

Edit `bin/hiram-cdk-static-site.ts` and declare your stack:

\`\`\`typescript
new HiramCdkStaticSiteStack(app, 'MyBlogStack', {
env: { account: '...', region: 'us-east-1' },
site: {
domainName: 'myblog.dev',
siteSubDomain: 'www',
buildPath: '../my-blog/dist',
enableUrlRewrite: true,
},
});
\`\`\`

Then build and deploy:

\`\`\`bash
npm run build
cdk deploy MyBlogStack
\`\`\`

## Configuration options

| Option             | Type    | Required | Description                                                |
| ------------------ | ------- | -------- | ---------------------------------------------------------- |
| `domainName`       | string  | ✅       | The site domain (e.g., 'myblog.dev')                       |
| `hostedZoneDomain` | string  | ❌       | Parent zone if using subdomain. Defaults to `domainName`   |
| `siteSubDomain`    | string  | ❌       | Optional 'www' subdomain                                   |
| `buildPath`        | string  | ✅       | Path to compiled site files                                |
| `destroyOnRemoval` | boolean | ❌       | If true, bucket deletes on stack destroy. Default false    |
| `enableUrlRewrite` | boolean | ❌       | Enable CloudFront Function for URL rewriting. Default true |

## Use cases

- Personal portfolios with i18n (`enableUrlRewrite: true`)
- Marketing landing pages (simple, no rewrites)
- Technical blogs (Astro, Hugo, Jekyll outputs)
- Documentation sites
- SPAs with client-side routing

## Important notes

- Must be deployed in `us-east-1` because CloudFront requires certificates from that region.
- First deploy takes ~10 minutes (mostly CloudFront provisioning).
- Subsequent deploys are fast (only changed resources update).
- The construct does NOT register domains. The hosted zone must exist before deploy.

## License

MIT
