/**
 * Netlify Function: contact form -> Monday.com CRM
 *
 * Flow: validate submission -> create an item on a Monday board (named after the
 * person) -> post the full details (email, subject, message) as an update on
 * that item. Using an "update" means we don't need to know the board's column
 * IDs to capture everything; map into real columns later if you want (see the
 * optional MONDAY_EMAIL_COLUMN_ID below).
 *
 * Environment variables (Netlify -> Site configuration -> Environment variables):
 *   MONDAY_API_TOKEN        (required) Monday token: Monday -> your avatar ->
 *                           Administration/Developers -> My access tokens.
 *   MONDAY_BOARD_ID         (required) numeric ID of the board new contacts land on
 *                           (it's in the board URL: /boards/1234567890).
 *   MONDAY_GROUP_ID         (optional) group/section ID within that board.
 *   MONDAY_EMAIL_COLUMN_ID  (optional) an Email column's ID to store the email in a
 *                           structured field in addition to the update.
 *
 * The token is read server-side only and is NEVER exposed to the browser.
 */

const MONDAY_API = "https://api.monday.com/v2";

exports.handler = async function (event) {
  const token = process.env.MONDAY_API_TOKEN;
  const boardId = process.env.MONDAY_BOARD_ID;

  // --- TEMP diagnostic: GET /.netlify/functions/contact?columns=1 returns the
  //     board's column IDs/titles/types + groups so we can map the form fields.
  //     Remove this block once the mapping is wired in. ---
  if (event.httpMethod === "GET") {
    if (!token || !boardId) return json(500, { error: "Server not configured" });
    if (event.queryStringParameters && "columns" in event.queryStringParameters) {
      try {
        const q = "query ($b: [ID!]) { boards (ids: $b) { id name columns { id title type } groups { id title } } }";
        const data = await gql(q, { b: [String(boardId)] }, {
          "Content-Type": "application/json",
          Authorization: token,
          "API-Version": "2023-10"
        });
        return json(200, data.data || data);
      } catch (e) {
        return json(502, { error: String((e && e.message) || e) });
      }
    }
    return json(405, { error: "Method not allowed" });
  }

  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  if (!token || !boardId) {
    console.error("MONDAY_API_TOKEN or MONDAY_BOARD_ID is not set");
    return json(500, { error: "Server not configured" });
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch (e) {
    return json(400, { error: "Invalid JSON" });
  }

  const name = (body.name || "").toString().trim().slice(0, 200);
  const email = (body.email || "").toString().trim().slice(0, 200);
  const subject = (body.subject || "").toString().trim().slice(0, 300);
  const message = (body.message || "").toString().trim().slice(0, 5000);

  // Honeypot (in case the browser check is bypassed): silently accept and drop.
  if (body.company_website) {
    return json(200, { ok: true });
  }

  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return json(400, { error: "A valid email is required" });
  }

  const headers = {
    "Content-Type": "application/json",
    Authorization: token,
    "API-Version": "2023-10"
  };

  // Optional: also write the email into a real Email column if its ID is provided.
  const columnValues = {};
  if (process.env.MONDAY_EMAIL_COLUMN_ID) {
    columnValues[process.env.MONDAY_EMAIL_COLUMN_ID] = { email: email, text: email };
  }

  try {
    // 1) Create the contact as a board item.
    const createQuery =
      "mutation ($board: ID!, $group: String, $name: String!, $cols: JSON) {" +
      "  create_item (board_id: $board, group_id: $group, item_name: $name, column_values: $cols) { id }" +
      "}";
    const createVars = {
      board: String(boardId),
      group: process.env.MONDAY_GROUP_ID || null,
      name: name || email,
      cols: JSON.stringify(columnValues)
    };

    const created = await gql(createQuery, createVars, headers);
    const itemId =
      created && created.data && created.data.create_item && created.data.create_item.id;

    if (!itemId) {
      console.error("Monday create_item failed", JSON.stringify(created));
      return json(502, { error: "Could not save contact" });
    }

    // 2) Post the details as an update on the item (best effort).
    const detail =
      "New website contact form submission\n\n" +
      "Name: " + (name || "(not given)") + "\n" +
      "Email: " + email +
      (subject ? "\nSubject: " + subject : "") +
      "\n\n" + (message || "(no message)");

    const updateQuery =
      "mutation ($item: ID!, $bodyText: String!) {" +
      "  create_update (item_id: $item, body: $bodyText) { id }" +
      "}";
    const updated = await gql(updateQuery, { item: String(itemId), bodyText: detail }, headers);
    if (updated && updated.errors) {
      console.error("Monday create_update failed", JSON.stringify(updated.errors));
      // The item was created either way — don't fail the whole request.
    }

    return json(200, { ok: true });
  } catch (err) {
    console.error("Contact function error", err);
    return json(502, { error: "Could not save contact" });
  }
};

async function gql(query, variables, headers) {
  const res = await fetch(MONDAY_API, {
    method: "POST",
    headers: headers,
    body: JSON.stringify({ query: query, variables: variables })
  });
  const data = await res.json().catch(function () { return {}; });
  if (!res.ok) {
    throw new Error("Monday HTTP " + res.status + " " + JSON.stringify(data));
  }
  if (data.errors) {
    // GraphQL-level errors come back with HTTP 200 — surface them to the caller.
    console.error("Monday GraphQL errors", JSON.stringify(data.errors));
  }
  return data;
}

function json(statusCode, obj) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(obj)
  };
}
