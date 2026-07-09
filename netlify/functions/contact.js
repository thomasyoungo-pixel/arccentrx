/**
 * Netlify Function: contact form -> Attio CRM
 *
 * Flow: validate submission -> assert (upsert) a Person in Attio by email
 * -> attach a Note with the subject + message.
 *
 * The Attio API key is read from the ATTIO_API_KEY environment variable set in
 * Netlify (Site configuration -> Environment variables). It is NEVER exposed to
 * the browser.
 *
 * Assumes the default Attio "people" object with the standard `name` and
 * `email_addresses` attributes. If your workspace renamed these, adjust the
 * attribute slugs below.
 */

const ATTIO_BASE = "https://api.attio.com/v2";

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  const apiKey = process.env.ATTIO_API_KEY;
  if (!apiKey) {
    console.error("ATTIO_API_KEY is not set");
    return json(500, { error: "ATTIO_API_KEY is not set on this deploy" });
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

  const authHeaders = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json"
  };

  // Split a full name into first/last for Attio's personal-name attribute.
  let firstName = name;
  let lastName = "";
  if (name.indexOf(" ") > -1) {
    const parts = name.split(/\s+/);
    firstName = parts.shift();
    lastName = parts.join(" ");
  }

  try {
    // 1) Assert the person (create or update by matching email_addresses).
    const personValues = {
      email_addresses: [{ email_address: email }]
    };
    if (name) {
      personValues.name = [
        { first_name: firstName, last_name: lastName, full_name: name }
      ];
    }

    const assertRes = await fetch(
      `${ATTIO_BASE}/objects/people/records?matching_attribute=email_addresses`,
      {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({ data: { values: personValues } })
      }
    );

    if (!assertRes.ok) {
      const detail = await assertRes.text();
      console.error("Attio person assert failed", assertRes.status, detail);
      // NOTE: `detail` is surfaced to help debug setup. Once it works, this can
      // be reverted to a generic message so raw API errors aren't exposed.
      return json(502, {
        error: "Attio rejected the contact (status " + assertRes.status + ")",
        detail: String(detail).slice(0, 400)
      });
    }

    const person = await assertRes.json();
    const recordId =
      person && person.data && person.data.id && person.data.id.record_id;

    // 2) Attach a note with the message (best effort — a person was saved either way).
    if (recordId) {
      const noteContent =
        (message || "(no message)") +
        `\n\n— Submitted via the website contact form` +
        (subject ? `\nSubject: ${subject}` : "") +
        `\nEmail: ${email}`;

      const noteRes = await fetch(`${ATTIO_BASE}/notes`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          data: {
            parent_object: "people",
            parent_record_id: recordId,
            title: subject ? `Website contact: ${subject}` : "Website contact form",
            format: "plaintext",
            content: noteContent
          }
        })
      });

      if (!noteRes.ok) {
        const detail = await noteRes.text();
        console.error("Attio note create failed", noteRes.status, detail);
        // Don't fail the whole request — the person record was saved.
      }
    }

    return json(200, { ok: true });
  } catch (err) {
    console.error("Contact function error", err);
    return json(502, {
      error: "Request to Attio failed",
      detail: String((err && err.message) || err).slice(0, 400)
    });
  }
};

function json(statusCode, obj) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(obj)
  };
}
