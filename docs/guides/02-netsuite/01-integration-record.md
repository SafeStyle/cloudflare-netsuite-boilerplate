# Create the integration record

Turn on the NetSuite features the demo needs and create the integration record that
identifies the demo to NetSuite. The integration record gives you the client ID used
in the next guide.

An integration record tells NetSuite that an outside application is allowed to
connect, which login methods it may use, and which APIs it may call. Every
application that connects to NetSuite needs one.

## 1. Find your account ID

Go to **Setup > Company > Company Information**. The **Account ID** field is near the
bottom of the right-hand column. It is also the number at the start of your NetSuite
web address.

Sandbox account IDs end in `_SB1`, `_SB2` and so on. In web addresses, NetSuite
turns the underscore into a hyphen and the letters into lowercase, so `1234567_SB1`
becomes `1234567-sb1`.

Your account's exact REST address is on the **Company URLs** subtab of the same page.
Oracle advises reading it from there rather than building it by hand.

## 2. Enable the features

Go to **Setup > Company > Enable Features** (on some pages Oracle writes this as
**Setup > Company > Setup Tasks > Enable Features**).

On the **SuiteCloud** subtab:

1. Under **SuiteTalk (Web Services)**, check **REST Web Services**.
2. Under **Manage Authentication**, check **OAuth 2.0**.
3. Accept the SuiteCloud Terms of Service when asked (**I Agree**).

On the **Analytics** subtab, check **SuiteAnalytics Workbook**. Oracle lists it as a
prerequisite for REST web services.

Select **Save**.

Optional: if you will also call RESTlets with OAuth 2.0, check **Client SuiteScript**
and **Server SuiteScript** under SuiteScript as well. REST web services do not need
them.

You do **not** need **Token-based Authentication** (TBA). OAuth 2.0 replaces it.
Oracle has announced that from NetSuite 2027.1 you can no longer create new
integrations that use TBA for SOAP and REST web services and RESTlets, and that
support for existing TBA integrations is expected to end in NetSuite 2028.2.

## 3. Create the integration record

Go to **Setup > Integration > Manage Integrations > New**.

1. **Name**: something recognisable, such as `Cloudflare demo`.
2. **Description**: optional. Say what it is for and who owns it.
3. **State**: **Enabled**.
4. On the **Authentication** subtab:
   - **Token-based Authentication**: leave every box cleared. This integration
     does not use TBA.
   - **OAuth 2.0**:
     - Check **Client Credentials (Machine to Machine) Grant**.
     - Under scope, check **REST Web Services**. Also check **RESTlets** only if you
       will call RESTlets.
     - Leave **Authorization Code Grant** cleared. It is for apps where a person
       signs in, which this demo does not need.
     - Leave **Public Client** cleared. The client credentials grant does not support
       public clients.
     - Leave **NetSuite AI Connector Service** cleared. Checking it requires every
       other box, including the client credentials grant, to be cleared.
   - **User Credentials**: leave cleared.
5. Select **Save**.

Fields such as **Redirect URI** and **Refresh Token Validity** only apply to the
authorization code grant. Leave them alone.

## 4. Copy the client ID now

After the first save, NetSuite shows a **client ID** and a **client secret** once.
When you leave the page they cannot be shown again; if you lose them, you have to
reset them on the integration record.

- **Client ID**: copy it and store it securely, for example in a password manager.
  The demo needs it.
- **Client secret**: the client credentials (M2M) flow does not send it. The app
  proves who it is with a certificate instead, which is covered in the next guide.
  Store it securely anyway, or discard it. Either way, treat it as a password.

## Next

[Set up OAuth 2.0 client credentials (M2M)](02-oauth-2-client-credentials.md).

## Sources

All from Oracle's NetSuite Help Center:

- [Enable the OAuth 2.0 Feature](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_157771482304.html)
- [Prerequisites and Setup for REST Web Services](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/article_5085602973.html)
- [Enabling SuiteTalk Web Services Features](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/article_1114080552.html)
- [Create Integration Records for Applications to Use OAuth 2.0](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_157771733782.html)
- [URLs for Account-Specific Domains](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_1498251763.html)
- [Preparing for TBA End of Support](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_0525020842.html)
