import os, glob, re
from collections import defaultdict, Counter

COLOR_NAMES = r"(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black|transparent|current)"

pattern = re.compile(
    rf"(?<![\w-])"
    rf"((?:[a-z0-9_-]+:)*)"
    rf"(bg|text|border(?:-[tblrxy])?)-"
    rf"({COLOR_NAMES}|\[#[0-9a-fA-F]+\])"
    rf"(?:-([0-9]+))?"
    rf"((?:/[0-9]+)?)?"
    rf"(?![\w-])"
)

TAILWIND_HEX = {
    "slate-50": "#f8fafc", "slate-100": "#f1f5f9", "slate-150": "#e9eff5", "slate-200": "#e2e8f0",
    "slate-250": "#d5dfe9", "slate-300": "#cbd5e1", "slate-350": "#afbccb", "slate-400": "#94a3b8",
    "slate-500": "#64748b", "slate-600": "#475569", "slate-700": "#334155", "slate-750": "#273548",
    "slate-800": "#1e293b", "slate-900": "#0f172a", "slate-950": "#020617",
    "blue-50": "#eff6ff", "blue-100": "#dbeafe", "blue-200": "#bfdbfe", "blue-300": "#93c5fd",
    "blue-400": "#60a5fa", "blue-500": "#3b82f6", "blue-600": "#2563eb", "blue-700": "#1d4ed8",
    "blue-800": "#1e40af", "blue-900": "#1e3a8a", "blue-950": "#172554",
    "indigo-50": "#eef2ff", "indigo-100": "#e0e7ff", "indigo-200": "#c7d2fe", "indigo-300": "#a5b4fc",
    "indigo-400": "#818cf8", "indigo-500": "#6366f1", "indigo-600": "#4f46e5", "indigo-700": "#4338ca",
    "indigo-800": "#3730a3", "indigo-900": "#312e81",
    "emerald-50": "#ecfdf5", "emerald-100": "#d1fae5", "emerald-200": "#a7f3d0", "emerald-300": "#6ee7b7",
    "emerald-400": "#34d399", "emerald-500": "#10b981", "emerald-600": "#059669", "emerald-700": "#047857",
    "emerald-800": "#065f46", "emerald-900": "#064e3b",
    "green-50": "#f0fdf4", "green-100": "#dcfce7", "green-200": "#bbf7d0", "green-500": "#22c55e",
    "green-600": "#16a34a", "green-700": "#15803d", "green-800": "#166534", "green-950": "#052e16",
    "amber-50": "#fffbeb", "amber-100": "#fef3c7", "amber-200": "#fde68a", "amber-300": "#fcd34d",
    "amber-400": "#fbbf24", "amber-500": "#f59e0b", "amber-600": "#d97706", "amber-700": "#b45309",
    "amber-800": "#92400e", "amber-900": "#78350f", "amber-950": "#451a03",
    "rose-50": "#fff1f2", "rose-100": "#ffe4e6", "rose-200": "#fecdd3", "rose-400": "#fb7185",
    "rose-500": "#f43f5e", "rose-600": "#e11d48", "rose-700": "#be123c", "rose-800": "#9f1239",
    "rose-900": "#881337",
    "red-50": "#fef2f2", "red-100": "#fee2e2", "red-200": "#fecaca", "red-500": "#ef4444",
    "red-600": "#dc2626", "red-700": "#b91c1c", "red-800": "#991b1b", "red-900": "#7f1d1d", "red-950": "#450a0a",
    "purple-50": "#faf5ff", "purple-100": "#f3e8ff", "purple-600": "#9333ea", "purple-700": "#7e22ce",
    "teal-50": "#f0fdfa", "teal-100": "#ccfbf1", "teal-700": "#0f766e",
    "violet-600": "#7c3aed", "sky-600": "#0284c7",
    "white": "#ffffff", "black": "#000000", "transparent": "transparent", "current": "currentColor"
}

files = sorted(glob.glob("src/**/*.tsx", recursive=True))

# 28 Semantic Tokens
TOKENS = [
    # Navigation/Header (4 tokens)
    ("nav-bg", "Navigation Background", "Navigation/Header", "#ffffff", False),
    ("nav-border", "Navigation Border", "Navigation/Header", "#e2e8f0", False),
    ("nav-text", "Navigation Text", "Navigation/Header", "#475569", False),
    ("nav-text-active", "Navigation Text Active", "Navigation/Header", "#2563eb", False),
    
    # Text/Headings (4 tokens)
    ("text-heading", "Heading Text", "Text/Headings", "#0f172a", False),
    ("text-body", "Body Text", "Text/Headings", "#334155", False),
    ("text-muted", "Muted Text", "Text/Headings", "#64748b", False),
    ("text-inverse", "Inverse Text", "Text/Headings", "#ffffff", False),
    
    # Buttons (4 tokens)
    ("btn-primary-bg", "Button Primary Background", "Buttons", "#2563eb", False),
    ("btn-primary-hover", "Button Primary Hover", "Buttons", "#1d4ed8", False),
    ("btn-primary-text", "Button Primary Text", "Buttons", "#ffffff", False),
    ("btn-secondary-border", "Button Secondary Border", "Buttons", "#e2e8f0", False),
    
    # Forms/Inputs (2 tokens)
    ("input-border", "Input Border", "Forms/Inputs", "#e2e8f0", False),
    ("input-border-focus", "Input Focus Border", "Forms/Inputs", "#2563eb", False),
    
    # Cards/Panels (3 tokens)
    ("card-bg", "Card Background", "Cards/Panels", "#ffffff", False),
    ("card-border", "Card Border", "Cards/Panels", "#e2e8f0", False),
    ("card-header-bg", "Card Header Background", "Cards/Panels", "#f8fafc", False),
    
    # Links (2 tokens)
    ("link-primary", "Link Text", "Links", "#2563eb", False),
    ("link-hover", "Link Hover Text", "Links", "#1d4ed8", False),
    
    # Status/Feedback (6 tokens)
    ("status-success-bg", "Status Success Background", "Status/Feedback", "#ecfdf5", False),
    ("status-success-text", "Status Success Text", "Status/Feedback", "#047857", False),
    ("status-warning-bg", "Status Warning Background", "Status/Feedback", "#fffbeb", False),
    ("status-warning-text", "Status Warning Text", "Status/Feedback", "#b45309", False),
    ("status-error-bg", "Status Error Background", "Status/Feedback", "#fef2f2", False),
    ("status-error-text", "Status Error Text", "Status/Feedback", "#dc2626", False),
    
    # Backgrounds (3 tokens)
    ("bg-app", "Application Page Background", "Backgrounds", "#f8fafc", False),
    ("bg-subtle", "Subtle / Secondary Background", "Backgrounds", "#f1f5f9", False),
    ("bg-overlay", "Modal Backdrop Overlay", "Backgrounds", "rgba(15, 23, 42, 0.4)", True),
]

print(f"Total tokens defined: {len(TOKENS)}")
