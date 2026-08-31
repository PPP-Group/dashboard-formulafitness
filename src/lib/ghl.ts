/**
 * Deep links back into GoHighLevel.
 *
 * The dashboard answers "how many"; GHL is where you answer "who, and what did
 * they say". Every contact surfaced in a drill-down links straight to its GHL
 * record so the trip from a number to the conversation is one click.
 *
 * The location id is not a secret — it is in the address bar of every GHL page
 * the team already has open — but it is configurable so this repo is not
 * pinned to one subaccount.
 */
const APP_ORIGIN =
  process.env.NEXT_PUBLIC_GHL_APP_ORIGIN ?? "https://app.formulafitness.co";

const LOCATION_ID =
  process.env.NEXT_PUBLIC_GHL_LOCATION_ID ?? "pyBwacgonEauKuE1akJb";

export function ghlContactUrl(contactId: string): string {
  return `${APP_ORIGIN}/v2/location/${LOCATION_ID}/contacts/detail/${contactId}`;
}

/**
 * The conversation view rather than the contact record. GHL routes both from
 * the contact id, and the conversation tab is the more useful landing spot when
 * the question was "what did this message get back".
 */
export function ghlConversationUrl(contactId: string): string {
  return `${APP_ORIGIN}/v2/location/${LOCATION_ID}/conversations/conversations/${contactId}`;
}
