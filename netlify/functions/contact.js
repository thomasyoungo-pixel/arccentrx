/**
 * Netlify Function: contact form -> Monday.com CRM ("Leads" board)
 *
 * Flow: look up the board's columns, map the form fields into the right ones
 * (by column title / type, so no fragile hard-coded IDs), create a Lead item,
 * then post the full submission as an update on that item.
 *
 * It writes to columns named (case-insensitive):
 *   "Email"    -> the email  (also matches any email-type column)
 *   "Message"  -> the message
 *   "Subject"  -> the subject (only if such a column exists)
 * Anything without a matching column still lands in the item's Updates.
 *
 * Environment variables (Netlify -> Site configuration -> Environment variables):
 *   MONDAY_API_TOKEN  (required)  Monday personal API token
 *   MONDAY_BOARD_ID   (required)  Leads board id
 *   MONDAY_GROUP_ID   (optional)  group to create the item in (else board default)
 *   MONDAY_EMAIL_COLUMN_ID / MONDAY_MESSAGE_COLUMN_ID / MONDAY_SUBJECT_COLUMN_ID
 *                     (optional)  force a specific column id instead of matching by title
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

  try {
    // Resolve the board's columns so we can map by title/type instead of raw IDs.
    let cols = [];
    try {
      cols = await getColumns(boardId, headers);
    } catch (e) {
      console.error("getColumns failed (falling back to defaults)", e);
    }

    const columnValues = {};

    // Email -> "Email" column (or any email-type column); defaults to lead_email.
    const emailCol = findCol(cols, { id: process.env.MONDAY_EMAIL_COLUMN_ID, title: "Email", type: "email" });
    const emailColId = (emailCol && emailCol.id) || process.env.MONDAY_EMAIL_COLUMN_ID || "lead_email";
    columnValues[emailColId] = { email: email, text: email };

    // Message -> "Message" column, if one exists.
    const msgCol = findCol(cols, { id: process.env.MONDAY_MESSAGE_COLUMN_ID, title: "Message" });
    if (msgCol && message) {
      columnValues[msgCol.id] = colTextValue(msgCol.type, message);
    }

    // Subject -> "Subject" column, if one exists.
    const subjCol = findCol(cols, { id: process.env.MONDAY_SUBJECT_COLUMN_ID, title: "Subject" });
    if (subjCol && subject) {
      columnValues[subjCol.id] = colTextValue(subjCol.type, subject);
    }

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

    // 2) Post the full submission as an update on the Lead (belt-and-suspenders).
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

async function getColumns(boardId, headers) {
  const q = "query ($b: [ID!]) { boards (ids: $b) { columns { id title type } } }";
  const data = await gql(q, { b: [String(boardId)] }, headers);
  return (data && data.data && data.data.boards && data.data.boards[0] && data.data.boards[0].columns) || [];
}

// Find a column by explicit id, then by title (case-insensitive), then by type.
function findCol(cols, opts) {
  if (opts.id) {
    const byId = cols.find(function (c) { return c.id === opts.id; });
    if (byId) return byId;
  }
  if (opts.title) {
    const byTitle = cols.find(function (c) { return c.title && c.title.toLowerCase() === opts.title.toLowerCase(); });
    if (byTitle) return byTitle;
  }
  if (opts.type) {
    const byType = cols.find(function (c) { return c.type === opts.type; });
    if (byType) return byType;
  }
  return null;
}

// Long Text columns take { text: "..." }; plain Text columns take a string.
function colTextValue(type, text) {
  return type === "long_text" ? { text: text } : text;
}

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
