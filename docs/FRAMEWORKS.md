# Mental Models & Thinking Frameworks

Reference document for the thought-partner chatbot's reasoning toolkit.

## 1. Socratic Method (Always Active)

The base layer of every conversation. The chatbot never just answers — it always probes.

**Six question types:**
- Clarifying: "What exactly do you mean by...?"
- Assumption-probing: "What are you assuming when you say...?"
- Evidence-probing: "What evidence supports that?"
- Perspective-exploring: "How would [stakeholder] see this differently?"
- Implication-exploring: "If that's true, what follows?"
- Meta-questions: "Why is this question important to you?"

**Detection:** Always active. Every response includes at least one probing question.

## 2. First Principles Thinking

Break complex problems down to their most fundamental truths, then reconstruct solutions from scratch.

**Process:**
1. Identify the problem clearly
2. List all current assumptions
3. Challenge each assumption — is it truly fundamental?
4. Identify the irreducible base truths
5. Reconstruct a solution from those truths alone

**Detection keywords:** "stuck", "from scratch", "fundamental", "why does this work", "basic", "ground up", "rethink", "core"

**Graph mapping:** Creates a tree: Problem → Assumptions → Fundamental Truths → Reconstructed Solutions

## 3. MECE (Mutually Exclusive, Collectively Exhaustive)

Ensure problem breakdowns have no overlaps and no gaps.

**Process:**
1. Define the problem scope
2. Break into categories
3. Verify mutual exclusivity: no item fits in two categories
4. Verify collective exhaustiveness: every relevant item has a category
5. Recurse: apply MECE within each category if needed

**Detection keywords:** "break down", "categorize", "organize", "structure", "comprehensive", "all the options", "nothing missing", "overlap"

**Graph mapping:** Creates strict hierarchy (issue tree) — each node at a level is a MECE category.

## 4. Second-Order Thinking

Trace the consequences of consequences. Don't just ask "what happens?" — ask "and then what?"

**Process:**
1. Identify the decision or action
2. Map first-order effects (immediate, obvious)
3. For each first-order effect, ask "and then what?" → second-order effects
4. Repeat for third-order if relevant
5. Identify which effects are desirable/undesirable
6. Look for feedback loops and unintended consequences

**Detection keywords:** "what happens if", "consequences", "ripple effect", "downstream", "long-term", "knock-on", "side effects", "chain reaction"

**Graph mapping:** Directed acyclic graph — Decision → First-order effects → Second-order effects → Third-order effects

## 5. Inversion / Pre-mortem

Instead of asking "how do I succeed?", ask "how could this fail?" — then avoid those failure modes.

**Process (Inversion):**
1. Define the desired outcome
2. Invert: "What would guarantee failure?"
3. List all failure modes
4. For each failure mode, define the preventive action
5. Build your plan around avoiding failure

**Process (Pre-mortem):**
1. Imagine it's 6 months from now and the project failed spectacularly
2. Write the "failure story" — what went wrong?
3. Identify the top 3-5 failure causes
4. For each, define early warning signs and mitigation strategies

**Detection keywords:** "what could go wrong", "risks", "failure", "devil's advocate", "worst case", "pre-mortem", "red team", "blind spots"

**Graph mapping:** Goal → Failure Modes → Preventive Actions; or Timeline → Failure Events → Root Causes → Mitigations

## Framework Selection Logic

```python
FRAMEWORK_PRIORITY = [
    ("inversion", ["what could go wrong", "risks", "failure", "devil's advocate", "worst case", "pre-mortem"]),
    ("second_order", ["what happens if", "consequences", "ripple", "downstream", "long-term", "knock-on"]),
    ("mece", ["break down", "categorize", "organize", "structure", "comprehensive", "all the options"]),
    ("first_principles", ["stuck", "from scratch", "fundamental", "why does this", "ground up", "rethink"]),
]

def detect_framework(message: str) -> str:
    message_lower = message.lower()
    for framework, keywords in FRAMEWORK_PRIORITY:
        if any(kw in message_lower for kw in keywords):
            return framework
    return "socratic"  # Default
```
