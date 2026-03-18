FRAMEWORK_PRIORITY: list[tuple[str, list[str]]] = [
    (
        "inversion",
        [
            "what could go wrong",
            "risks",
            "failure",
            "devil's advocate",
            "worst case",
            "pre-mortem",
            "red team",
            "blind spots",
        ],
    ),
    (
        "second_order",
        [
            "what happens if",
            "consequences",
            "ripple",
            "downstream",
            "long-term",
            "knock-on",
            "side effects",
            "chain reaction",
        ],
    ),
    (
        "mece",
        [
            "break down",
            "categorize",
            "organize",
            "structure",
            "comprehensive",
            "all the options",
            "nothing missing",
            "overlap",
        ],
    ),
    (
        "first_principles",
        [
            "stuck",
            "from scratch",
            "fundamental",
            "why does this",
            "ground up",
            "rethink",
            "core",
        ],
    ),
]

FRAMEWORK_LABELS: dict[str, str] = {
    "socratic": "Socratic Method",
    "first_principles": "First Principles",
    "mece": "MECE",
    "second_order": "Second-Order Thinking",
    "inversion": "Inversion / Pre-mortem",
}


def detect_framework(message: str) -> str:
    message_lower = message.lower()
    for framework, keywords in FRAMEWORK_PRIORITY:
        if any(kw in message_lower for kw in keywords):
            return framework
    return "socratic"
