// Local stand-in for the Stripe API during Playwright tests (the server side of checkout).
// Records every request so tests can check exactly what the site sent.
// Mailchimp and Netlify Forms are called from the browser, so the tests mock those with
// page routes instead (see tests/helpers.ts).
import { createServer } from "node:http";

const PORT = Number(process.env.MOCK_PORT || 3299);
const SITE = process.env.MOCK_SITE || "http://localhost:3200";
const state = { requests: [], lastSession: null };

function send(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(body === undefined ? "" : JSON.stringify(body));
}

/** Parses Stripe's form encoding (line_items[0][price_data][unit_amount]=2900) into a flat map. */
function parseForm(text) {
  return Object.fromEntries(new URLSearchParams(text));
}

createServer(async (req, res) => {
  let body = "";
  for await (const chunk of req) body += chunk;
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const record = { method: req.method, path: url.pathname, body, headers: req.headers };
  if (!url.pathname.startsWith("/__")) state.requests.push(record);

  // Test controls
  if (url.pathname === "/__control" && req.method === "POST") {
    Object.assign(state, JSON.parse(body || "{}"));
    if (state.reset) Object.assign(state, { requests: [], reset: false });
    return send(res, 200, { ok: true });
  }
  if (url.pathname === "/__requests") return send(res, 200, state.requests);

  // Stripe
  if (url.pathname === "/v1/checkout/sessions" && req.method === "POST") {
    const form = parseForm(body);
    const lines = [];
    for (let i = 0; form[`line_items[${i}][quantity]`]; i++) {
      lines.push({
        name: form[`line_items[${i}][price_data][product_data][name]`],
        quantity: Number(form[`line_items[${i}][quantity]`]),
        unit: Number(form[`line_items[${i}][price_data][unit_amount]`]),
      });
    }
    const id = `cs_test_mock${Date.now()}`;
    state.lastSession = { id, lines, form };
    return send(res, 200, {
      id,
      object: "checkout.session",
      url: `${SITE}/add-ons/success?session_id=${id}`,
      livemode: false,
    });
  }
  if (url.pathname.startsWith("/v1/checkout/sessions/") && req.method === "GET") {
    const s = state.lastSession;
    if (!s) return send(res, 404, { error: { message: "No such session" } });
    const total = s.lines.reduce((sum, l) => sum + l.unit * l.quantity, 0);
    return send(res, 200, {
      id: s.id,
      object: "checkout.session",
      payment_status: "paid",
      amount_total: total,
      line_items: {
        object: "list",
        data: s.lines.map((l) => ({ description: l.name, quantity: l.quantity, amount_total: l.unit * l.quantity })),
      },
    });
  }

  send(res, 404, { error: "not mocked" });
}).listen(PORT, () => console.log(`mock server on ${PORT}`));
