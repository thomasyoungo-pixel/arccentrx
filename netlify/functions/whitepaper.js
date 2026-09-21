/**
 * Netlify Function: white paper download form -> Monday.com CRM board
 *
 * Flow: look up the board's columns, map the form fields into the right ones
 * (by column title / type, so no fragile hard-coded IDs), create an item, then
 * post the full submission as an update on that item. A Monday board automation
 * ("when an item is created, send an email") handles the follow-up email; the
 * front end redirects the visitor to the PDF regardless of the CRM write.
 *
 * It writes to columns named (case-insensitive):
 *   "Email"    -> the email  (also matches any email-type column)
 *   "Company"  -> the company
 *   "Paper"    -> the white paper title (only if such a column exists)
 * Anything without a matching column still lands in the item's Updates.
 *
 * Each resource routes to its own Monday board. The front end sends a short
 * board slug (never a raw board id), which is mapped to an id server-side so
 * the endpoint can only ever write to boards we've whitelisted here.
 *
 * Environment variables (Netlify -> Site configuration -> Environment variables):
 *   MONDAY_API_TOKEN          (required)  Monday personal API token
 *   MONDAY_WHITEPAPER_GROUP_ID (optional) group to create the item in
 *   MONDAY_WP_EMAIL_COLUMN_ID / MONDAY_WP_COMPANY_COLUMN_ID / MONDAY_WP_PAPER_COLUMN_ID
 *                             (optional)  force a specific column id
 *
 * The token is read server-side only and is NEVER exposed to the browser.
 */

const MONDAY_API = "https://api.monday.com/v2";

// Whitelisted boards, keyed by the slug the resource card sends. The first
// entry is the default when a request arrives with no (or an unknown) slug.
const BOARDS = {
  "services-overview": "18431243427",
  "firm-overview": "18431249717",
  "industry-fintech": "18431386732",
  // TODO: point this at a dedicated credit-unions board once created.
  // Temporarily routed to the services board so the flow works end to end.
  "industry-credit-unions": "18431243427"
};
const DEFAULT_BOARD_SLUG = "services-overview";

exports.handler = async function (event) {
  const token = process.env.MONDAY_API_TOKEN;

  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" });
  }
  if (!token) {
    console.error("MONDAY_API_TOKEN is not set");
    return json(500, { error: "Server not configured" });
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch (e) {
    return json(400, { error: "Invalid JSON" });
  }

  // Resolve the target board from the slug (falls back to the default board).
  const boardSlug = (body.board || "").toString().trim();
  const boardId = BOARDS[boardSlug] || BOARDS[DEFAULT_BOARD_SLUG];

  const name = (body.name || "").toString().trim().slice(0, 200);
  const email = (body.email || "").toString().trim().slice(0, 200);
  const company = (body.company || "").toString().trim().slice(0, 300);
  const paper = (body.paper || "").toString().trim().slice(0, 300);
  const source = (body.source || "").toString().trim().slice(0, 200);
  const sourceDetail = (body.sourceDetail || "").toString().trim().slice(0, 400);
  const tag = (body.tag || "").toString().trim().slice(0, 60);
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

    // Only ever write to columns that actually exist on the board, formatted by
    // the column's real type. This board's Email/Company are plain text columns,
    // so a text value (not the email-object format) is what Monday expects.

    // Email -> "Email" column (email-type column preferred, else a text column).
    const emailCol = findCol(cols, { id: process.env.MONDAY_WP_EMAIL_COLUMN_ID, title: "Email", type: "email" });
    if (emailCol && email) {
      columnValues[emailCol.id] = colValue(emailCol.type, email);
    }

    // Requester name -> a text column titled "Requester Name" or "Name"
    // (never the built-in name-type column, which is the item title).
    const reqNameCol = findCol(cols, { title: "Requester Name" }) ||
      cols.find(function (c) { return c.type === "text" && /^name$/i.test(c.title || ""); });
    if (reqNameCol && name) {
      columnValues[reqNameCol.id] = colValue(reqNameCol.type, name);
    }

    // Company -> "Company" column, if one exists.
    const companyCol = findCol(cols, { id: process.env.MONDAY_WP_COMPANY_COLUMN_ID, title: "Company" });
    if (companyCol && company) {
      columnValues[companyCol.id] = colValue(companyCol.type, company);
    }

    // Paper -> "Paper" column if one exists, else the "Request Date" date column
    // gets today's date so the board shows when each request came in.
    const paperCol = findCol(cols, { id: process.env.MONDAY_WP_PAPER_COLUMN_ID, title: "Paper" });
    if (paperCol && paper) {
      columnValues[paperCol.id] = colValue(paperCol.type, paper);
    }

    // Message -> "Message" column, if one exists. Always captured in Updates.
    const messageCol = findCol(cols, { title: "Message" });
    if (messageCol && message) {
      columnValues[messageCol.id] = colValue(messageCol.type, message);
    }
    const dateCol = findCol(cols, { title: "Request Date", type: "date" });
    if (dateCol) {
      columnValues[dateCol.id] = { date: new Date().toISOString().slice(0, 10) };
    }

    // Source -> "Source" column, if one exists (where the lead came from:
    // conference, outreach, ad). Always captured in the Updates note below.
    const sourceCol = findCol(cols, { title: "Source" });
    if (sourceCol && source) {
      columnValues[sourceCol.id] = colValue(sourceCol.type, source);
    }

    // Tag -> "Tags" column, if one exists. Tags need an id, so look the tag up
    // (creating it if new) and apply its id. The industry page sends "Fintech".
    const tagsCol = findCol(cols, { title: "Tags", type: "tags" });
    if (tagsCol && tag) {
      try {
        const tagQuery =
          "mutation ($name: String!, $board: ID) {" +
          "  create_or_get_tag (tag_name: $name, board_id: $board) { id }" +
          "}";
        const tagRes = await gql(tagQuery, { name: tag, board: String(boardId) }, headers);
        const tagId = tagRes && tagRes.data && tagRes.data.create_or_get_tag && tagRes.data.create_or_get_tag.id;
        if (tagId) columnValues[tagsCol.id] = { tag_ids: [Number(tagId)] };
      } catch (e) {
        console.error("create_or_get_tag failed (skipping tag)", e);
      }
    }

    // 1) Create the item.
    const createQuery =
      "mutation ($board: ID!, $group: String, $name: String!, $cols: JSON) {" +
      "  create_item (board_id: $board, group_id: $group, item_name: $name, column_values: $cols, create_labels_if_missing: true) { id }" +
      "}";
    const created = await gql(createQuery, {
      board: String(boardId),
      group: process.env.MONDAY_WHITEPAPER_GROUP_ID || null,
      name: name || email,
      cols: JSON.stringify(columnValues)
    }, headers);

    const itemId =
      created && created.data && created.data.create_item && created.data.create_item.id;
    if (!itemId) {
      console.error("Monday create_item failed", JSON.stringify(created));
      return json(502, { error: "Could not save contact" });
    }

    // 2) Post the full submission as an update on the item (belt-and-suspenders).
    const detail =
      (message ? "Contact request" : "Download request") + "\n\n" +
      "Name: " + (name || "(not given)") + "\n" +
      "Email: " + email +
      (company ? "\nCompany: " + company : "") +
      (paper ? "\nPaper: " + paper : "") +
      (source ? "\nSource: " + source : "") +
      (sourceDetail ? "\nSource detail: " + sourceDetail : "") +
      (message ? "\n\nMessage:\n" + message : "");

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
    console.error("White paper function error", err);
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

// Format a value for Monday according to the column's actual type.
//   email     -> { email, text }
//   long_text -> { text }
//   dropdown  -> { labels: [value] }   (pair with create_labels_if_missing)
//   status    -> { label: value }      (pair with create_labels_if_missing)
//   text/other-> plain string
function colValue(type, value) {
  if (type === "email") return { email: value, text: value };
  if (type === "long_text") return { text: value };
  if (type === "dropdown") return { labels: [value] };
  if (type === "status" || type === "color") return { label: value };
  return value;
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
