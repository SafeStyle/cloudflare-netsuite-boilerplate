# Cloudflare account sign up process

Create a Cloudflare account, secure it, and set up Cloudflare Zero Trust so you can
deploy this demo. Running the demo on your own computer does not need any of this;
deploying it does. Plan on about 15 minutes.

## What you need

- An email address you can receive mail at. For a shared or business account, use an
  alias or distribution list rather than a personal inbox. Cloudflare uses it for
  billing, usage notifications and account recovery.
- A phone with an authenticator app, or a hardware security key, for two-factor
  authentication.
- A payment card. Zero Trust asks for payment details during setup even on the Free
  plan. You are not charged on the Free plan.

You do **not** need a domain name. The demo can run on a free `workers.dev` address.

## 1. Create the account

1. Go to [dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up).
2. Enter your **Email** and a **Password**.
3. Select **Create Account**.

The account is named `<your email>'s Account` by default. You can rename it later.

## 2. Verify your email address

Cloudflare sends a verification email as soon as the account is created. Open it and
follow the link. Do this before anything else: two-factor authentication cannot be
turned on until the address is verified.

## 3. Turn on two-factor authentication

Cloudflare recommends two-factor authentication (2FA) for every account, and Zero
Trust setup expects it.

1. In the dashboard, open the **My Profile** menu and select **My Profile**.
2. Select **Authentication**.
3. Under **Two-Factor Authentication**, select **Set up**.
4. Add at least one method:
   - **Mobile App Authentication**: an authenticator app on your phone.
   - **Security Key Authentication**: a hardware key.
   - **Email Authentication**: a code sent to your email.
5. Save the backup codes Cloudflare shows you somewhere safe, such as a password manager.

Set up at least two different methods so losing one device does not lock you out.

If you signed up with Google or Apple, your account has no Cloudflare password yet.
Set one through the password reset process before turning on 2FA.

## 4. Find your workers.dev subdomain

Every account gets a `workers.dev` subdomain. Deployed Workers are reachable at
`<worker-name>.<your-subdomain>.workers.dev`.

1. In the dashboard, open **Workers & Pages**.
2. Find **Your subdomain**. Select **Change** next to it if you want a different name.

Subdomain names can be up to 63 characters: letters, numbers and dashes, with no dash
at the start or end.

The Workers Free plan allows 100,000 requests a day, which is plenty for this demo.

## 5. Set up Cloudflare Zero Trust

This demo refuses every request that has not been signed in through Cloudflare Zero
Trust, so a deployed copy cannot be used until this is done.

1. In the dashboard, select **Zero Trust**.
2. On the onboarding screen, choose a **team name**. It is a unique internal
   identifier; your organisation's name is the usual choice. It becomes your team
   domain: `<team-name>.cloudflareaccess.com`. Write it down, because the demo needs it.
3. Choose a subscription plan. **Free** is enough for this demo.
4. Enter payment details. Cloudflare requires this step on the Free plan too, but does
   not charge you.

To look up your team name later, go to **Zero Trust** > **Settings**.

Cloudflare adds the Cloudflare identity provider as the default login method. You can
add a one-time PIN or a third-party identity provider later.

## 6. Connect Wrangler on your computer

Wrangler is Cloudflare's command-line tool. It is installed with the project (see the
README), so there is nothing extra to download. From the project folder, run:

```bash
npx wrangler login
```

A browser window opens. Sign in and approve access. Then confirm it worked:

```bash
npx wrangler whoami
```

It prints the email address of the Cloudflare account Wrangler is using.

## Sources

- [Create a Cloudflare account](https://developers.cloudflare.com/fundamentals/account/create-account/)
- [Two-factor authentication](https://developers.cloudflare.com/fundamentals/user-profiles/2fa/)
- [workers.dev](https://developers.cloudflare.com/workers/configuration/routing/workers-dev/)
- [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/)
- [Cloudflare Zero Trust: get started](https://developers.cloudflare.com/cloudflare-one/setup/)
- [Wrangler general commands](https://developers.cloudflare.com/workers/wrangler/commands/general/)
