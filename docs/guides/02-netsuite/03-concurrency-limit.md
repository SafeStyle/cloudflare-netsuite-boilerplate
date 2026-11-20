# Allocate a concurrency limit

Understand NetSuite's concurrency limit, why it matters for an app on Cloudflare, and
how to give the demo its own limit so it cannot crowd out your other integrations.

## What concurrency means

Concurrency is the number of requests NetSuite is working on for your account **at the
same moment**. It is not a daily or hourly quota. If your account's limit is 15 and
15 requests are in progress, a 16th request sent at that moment is rejected. Once one
of the 15 finishes, there is room again. Requests that run longer than 15 minutes
time out.

The limit is shared by the whole account. REST web services, SOAP web services and
RESTlets all count toward the same limit. So does every integration: your e-commerce
connector, EDI, data loaders, and this demo.

## Why it matters for an app on Cloudflare

Cloudflare Workers scale automatically. If many people use the demo at once, or a job
fans out into many requests, the Worker can send lots of requests to NetSuite in
parallel. Without a limit of its own, the demo could use up the account's whole
limit, and your other integrations would start getting errors.

Giving the demo its own concurrency limit caps how many requests it can have in
progress at once, and leaves the rest of the account's limit for everything else.

## How your account's limit is set

The account limit comes from your NetSuite service tier, plus **10 for each SuiteCloud
Plus license**:

| Service tier | No licenses | 1 | 2 | 3 | 4 | 5 | 6 |
|--------------|-------------|---|---|---|---|---|---|
| Standard | 5 | 15 | | | | | |
| Premium | 15 | 25 | 35 | 45 | | | |
| Enterprise | 20 | 30 | 40 | 50 | 60 | 70 | 80 |
| Ultimate | 20 | 30 | 40 | 50 | 60 | 70 | 80 |

Ultimate continues in steps of 10, up to 140 with 12 licenses. Oracle gives these as
the base limits for contracts since June 2020; older tiers have their own values.

Sandbox accounts have the same limit as production. Development and partner accounts
are always 5.

## Allocated and unallocated

By default every integration shares one pool: the account limit. On the Integration
Governance page you can give an integration its own **concurrency limit**. Then:

- that integration can have up to that many requests in progress at once, and no more;
- the amount you give it comes out of the shared pool, so every integration
  **without** its own limit shares what is left (the **unallocated** limit);
- the unallocated limit can never drop below 1, so the most you can give one
  integration is the unallocated limit minus one.

Oracle recommends using per-integration limits only when you have a good reason, and
otherwise keeping a single account limit. Protecting production integrations from a
demo is a good reason. For this demo, a limit of 1 or 2 is plenty.

## Set the demo's limit

1. Go to **Setup > Integration > Integration Management > Integration Governance**
   (some Oracle pages write this as **Setup > Integration > Integration Governance**).
2. Under **Concurrency Usage**, check the account limit and the unallocated limit.
3. Under **Concurrency Limits per Integration**, select the demo's integration record
   (the one from the [integration record guide](01-integration-record.md)).
4. On the integration record, enter the limit in **Concurrency Limit**. **MAX
   Concurrency Limit** shows the most you can give it.
5. Select **Save**.

If your service tier changes or SuiteCloud Plus licenses expire, NetSuite resets the
limits and emails the administrator. Check the allocation again after any licensing
change.

## When the limit is reached

NetSuite rejects the extra request. For REST web services it returns HTTP status
**429** with the error code `CONCURRENCY_LIMIT_EXCEEDED` and the message "Concurrent
request limit exceeded. Request blocked."

Oracle's guidance for applications calling NetSuite:

- **Retry**, but wait before the first retry and wait longer before each one after
  that.
- **Do not retry in lockstep.** Add some randomness to the waits so many requests do
  not all retry at the same instant and cause another peak.
- **Give up after a few attempts.** Oracle's example stops after five.
- **Keep parallel requests at or below the limit.** If the demo's limit is 2, the
  Worker should not send more than 2 requests to NetSuite at once.

## Watching usage

- The **Integration Governance** page shows the limits, and the number and ratio of
  total and rejected requests.
- The **Concurrency Monitor** (**Customization > Performance > Concurrency Monitor**)
  is part of the Application Performance Management (APM) SuiteApp. It has
  dashboards for concurrency over time, including **Allocated Limit** and
  **Unallocated Limit** views.

## Sources

All from Oracle's NetSuite Help Center:

- [Concurrency Governance Limits Based on Service Tiers and SuiteCloud Plus Licenses](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/bridgehead_1500275603.html)
- [SuiteCloud Plus Settings](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_N259503.html)
- [Concurrency Limit per Integration](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/bridgehead_156224824287.html)
- [Concurrency Governance and Session Management](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/subsect_1559222360.html)
- [Error Handling in REST Web Services](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_156570709583.html)
- [Retrying Failed Web Services Requests](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/bridgehead_1509974866.html)
- [Best Practices](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/bridgehead_1500276239.html)
- [Concurrency Monitor Overview](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_160309318288.html)
- [Frequently Asked Questions](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_1504769959.html)
- [Sample Scenario](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_1525253248.html)
