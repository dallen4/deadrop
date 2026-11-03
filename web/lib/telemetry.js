// The drop id (`/grab?drop=<id>`, or `?id=` on the worker's /drop route)
// is the only capability needed to grab a live drop, so it never goes to
// Sentry or analytics as-is.
const DROP_PARAM = /([?&]drop=)[^&#]*/g;
const API_DROP_ID = /(\/drop\?(?:[^#]*&)?id=)[^&#]*/g;

/**
 * @template {string | undefined} T
 * @param {T} value
 * @returns {T}
 */
export const scrubDropId = (value) =>
  typeof value === 'string'
    ? value
        .replace(DROP_PARAM, '$1[redacted]')
        .replace(API_DROP_ID, '$1[redacted]')
    : value;

/** @param {any} event */
export const scrubSentryEvent = (event) => {
  if (event.request?.url)
    event.request.url = scrubDropId(event.request.url);
  if (event.request?.query_string)
    event.request.query_string = '[redacted]';
  if (event.transaction)
    event.transaction = scrubDropId(event.transaction);

  event.breadcrumbs?.forEach((crumb) => {
    if (crumb.message) crumb.message = scrubDropId(crumb.message);
    if (crumb.data?.url) crumb.data.url = scrubDropId(crumb.data.url);
    if (crumb.data?.from)
      crumb.data.from = scrubDropId(crumb.data.from);
    if (crumb.data?.to) crumb.data.to = scrubDropId(crumb.data.to);
  });

  return event;
};
