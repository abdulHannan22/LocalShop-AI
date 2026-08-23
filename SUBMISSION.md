# LocalShop AI — Buildathon Submission Pack

## Project title

**LocalShop AI — Conversational Product Discovery and Confirmation-Gated Checkout**

## Track

**Track 1: AI Growth & Agentic Commerce**

## Project objectives — What does it solve?

Small online merchants lose potential customers because product catalogues are
difficult to search and customers often need personalised help before buying.
Customers may know their budget and use case but not the exact product name.
Traditional keyword search performs poorly for requests such as “wireless
headphones under ₹2,000 for online classes with a clear microphone.”

LocalShop AI converts natural-language shopping requirements into structured
preferences, searches a merchant-controlled catalogue, ranks suitable products
and explains every recommendation. After the customer selects a product, the
system requests explicit confirmation and only then creates a Razorpay test
Payment Link. Every important decision is recorded in an audit trail.

The project aims to:

1. Reduce the time customers spend searching large catalogues.
2. Help small merchants offer personalised guidance without a full sales team.
3. Improve checkout intent through relevant and budget-aware recommendations.
4. Prevent unsafe AI actions by keeping prices, stock and payments under
   deterministic backend control.
5. Make all money actions explainable, bounded, confirmation-gated and auditable.

## One-line pitch

LocalShop AI helps small merchants convert “I need something like this” into an
explainable product recommendation and a safe, confirmed Razorpay checkout.

## Target users

- Small D2C merchants.
- WhatsApp and social-commerce sellers.
- Local electronics and lifestyle stores.
- Customers who need guided product discovery.

## How the solution works

1. The customer describes their need in natural language.
2. Gemini returns a JSON-structured intent containing category, budget, use case
   and desired features.
3. Server-side code ranks real catalogue items and removes unavailable products.
4. The interface shows three recommendations with match reasons.
5. The customer selects a product and explicitly confirms checkout.
6. The backend validates the server-side product and amount.
7. Razorpay creates a test Payment Link.
8. Signed webhook events and agent actions are recorded in the audit store.

## GitHub link

**Pending repository publication:** replace this line with the GitHub repository
URL after the connected GitHub account creates the repository.

## Live application

https://localshop-ai.loyal-bell-2663.chatgpt.site

## Five-minute pitch video link

**Pending recording/upload:** replace this line with the public or unlisted video
URL after recording the script below.

## Five-minute pitch script

### 0:00–0:35 — Problem

“Hello, I am Abdulhannan, and this is LocalShop AI, built for Razorpay's AI
Growth and Agentic Commerce track. Small online merchants lose sales because
customers often describe a need rather than a product name. A customer may ask
for wireless headphones under two thousand rupees for online classes, but a
normal search box cannot understand the full context. The customer leaves or
the merchant must manually answer every question.”

### 0:35–1:05 — Solution

“LocalShop AI is a conversational sales agent. It understands the customer’s
budget, category, use case and important features. It then searches only the
merchant’s real catalogue, ranks suitable products and explains why each one
matches. Most importantly, it cannot create a payment action until the customer
selects and explicitly confirms a product.”

### 1:05–2:20 — Product demonstration

“I will enter: wireless headphones under two thousand rupees for online
classes. The backend sends this request to Gemini using a structured JSON
schema. The result contains the budget, headphones category, online-classes use
case and microphone requirement. Normal TypeScript code then ranks the
catalogue. Here we can see the three recommendations, their real prices, stock
and match reasons. I will select NovaSound Flex. The interface now clearly says
that confirmation is required. Only after I press confirm does the backend
prepare a Razorpay test Payment Link. If no Razorpay keys are configured, the
project uses a clearly labelled safe simulation instead of pretending a payment
was created.”

### 2:20–3:20 — Architecture and AI boundaries

“The most important technical decision is separating AI understanding from
business execution. Gemini extracts structured intent, but it never controls
prices, inventory or payment amounts. The server validates products, calculates
the amount and enforces the confirmation gate. This prevents hallucinated
products or incorrect money actions. The application also has a deterministic
fallback, so it can continue operating if the AI service is unavailable.”

### 3:20–4:20 — Safety and technical challenges

“Payments require stronger reliability than a normal chatbot. Razorpay webhook
signatures are verified using HMAC-SHA256 over the original raw request body.
Duplicate webhook deliveries are detected through the Razorpay event ID. Every
intent extraction, catalogue query, inventory check and checkout action is
written to an audit trail. External service failures are reported honestly and
never converted into false success states.”

### 4:20–5:00 — Impact and conclusion

“LocalShop AI can help small merchants provide personalised product guidance
without hiring a large sales team. Success can be measured through product
discovery time, recommendation acceptance, checkout-link creation and simulated
revenue. My next steps are merchant catalogue upload, multilingual conversations
and controlled upselling. LocalShop AI demonstrates how AI can improve commerce
while keeping every money action explainable, bounded and gated. Thank you.”

## Video recording plan

| Time | Screen/visual |
|---|---|
| 0:00–0:35 | Title slide and problem statement |
| 0:35–1:05 | Architecture overview |
| 1:05–2:20 | Live application demo |
| 2:20–3:20 | Code/architecture diagram |
| 3:20–4:20 | Audit trail, webhook and safety explanation |
| 4:20–5:00 | Impact metrics and closing slide |

## Build challenges and technical obstacles

### 1. Converting vague requests into reliable data

**Challenge:** Customer requests are unstructured. Allowing an LLM to return
free-form text makes it difficult to use safely in backend logic.

**Solution:** Gemini is constrained by a JSON Schema containing budget,
category, use case, features and explanation. The response is validated at
runtime. Invalid responses automatically fall back to deterministic extraction.

### 2. Preventing hallucinated products and incorrect prices

**Challenge:** An LLM can invent a product, price or stock quantity.

**Solution:** The LLM never receives authority to create catalogue facts.
Ranking is performed by deterministic TypeScript code against server-controlled
products. The checkout endpoint loads the product and amount again by ID.

### 3. Safely connecting AI recommendations to payments

**Challenge:** A conversational agent must not trigger a money action merely
because it predicts that the customer wants to buy.

**Solution:** Checkout is a separate server endpoint requiring an explicit
`confirmed: true` value. The interface makes selection and confirmation two
separate actions. Razorpay is used only in test mode.

### 4. Handling missing credentials and external API failure

**Challenge:** Evaluators and contributors should be able to run the project
without sharing private Gemini or Razorpay credentials.

**Solution:** The repository contains no secrets. Gemini has a deterministic
fallback, and checkout uses a clearly labelled simulation when Razorpay test
keys are absent. An invalid configured integration returns an error instead of
silently switching modes.

### 5. Webhook security, duplicates and event order

**Challenge:** Payment webhooks may be forged, duplicated or arrive out of
order.

**Solution:** The endpoint computes an HMAC-SHA256 signature using the unparsed
request body and compares it with `X-Razorpay-Signature`. The unique
`x-razorpay-event-id` is stored to identify duplicate deliveries. Event
processing does not assume chronological delivery.

### 6. Maintaining an explainable audit trail

**Challenge:** Agentic commerce requires merchants and reviewers to understand
why the system recommended or executed an action.

**Solution:** Intent extraction, ranking, inventory checks, confirmation,
checkout creation and webhook processing generate named audit events stored in
Cloudflare D1 when available.

## Evaluation metrics

- Recommendation acceptance rate.
- Average product-discovery time.
- Checkout-link creation rate.
- Budget violation count.
- Out-of-stock recommendation count.
- Unconfirmed checkout attempt count.
- Webhook signature rejection count.
- Duplicate webhook suppression count.

Do not invent final numbers. Run user tests and replace this section with actual
measured results before submission.
