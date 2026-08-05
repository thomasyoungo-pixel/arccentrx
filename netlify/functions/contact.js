/**
 * Netlify Function: contact form -> Monday.com CRM ("Leads" board)
 *
 * Flow: validate submission -> create a Lead item (name + Email column) ->
 * post the subject + message as an update on that item.
 *
 * Environment variables (Netlify -> Site configuration -> Environment variables):
 *   MONDAY_API_TOKEN  (required)  Monday personal API token
 *   MONDAY_BOARD_ID   (required)  Leads board id (currently 18424288272)
 *
 * Optional column/group overrides (defaults match the current Leads board):
 *   MONDAY_EMAIL_COLUMN_ID    default "lead_email"
 *   MONDAY_SUBJECT_COLUMN_ID  if set, subject is written to this text column
 *   MONDAY_MESSAGE_COLUMN_ID  if set (e.g. a Long Text column), message goes there too
 *   MONDAY_GROUP_ID           if set, item is created in this group (else the board default)
 *
 * The token is read server-side only and is NEVER exposed to the browser.
 */

const MONDAY_API = "https://api.monday.com/v2";

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  const token = process.env.MONDAY_API_TOKEN;
  const boardId = process.env.MONDAY_BOARD_ID;
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

  // Map the form fields into board columns.
  const columnValues = {};
  const emailCol = process.env.MONDAY_EMAIL_COLUMN_ID || "lead_email";
  columnValues[emailCol] = { email: email, text: email };
  if (process.env.MONDAY_SUBJECT_COLUMN_ID && subject) {
    columnValues[process.env.MONDAY_SUBJECT_COLUMN_ID] = subject;
  }
  if (process.env.MONDAY_MESSAGE_COLUMN_ID && message) {
    columnValues[process.env.MONDAY_MESSAGE_COLUMN_ID] = message;
  }

  try {
    // 1) Create the Lead item.
    const createQuery =
      "mutation ($board: ID!, $group: String, $name: String!, $cols: JSON) {" +
      "  create_item (board_id: $board, group_id: $group, item_name: $name, column_values: $cols) { id }" +
      "}";
    const created = await gql(createQuery, {
      board: String(boardId),
      group: process.env.MONDAY_GROUP_ID || null,
      name: name || email,
      cols: JSON.stringify(columnValues)
    }, headers);

    const itemId =
      created && created.data && created.data.create_item && created.data.create_item.id;
    if (!itemId) {
      console.error("Monday create_item failed", JSON.stringify(created));
      return json(502, { error: "Could not save contact" });
    }

    // 2) Post the subject + message as an update on the Lead (best effort).
    const detail =
      "Website contact form submission\n\n" +
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
      // The lead was created either way — don't fail the whole request.
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
