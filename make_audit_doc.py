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

matches = []
for f in files:
    with open(f) as fp:
        lines = fp.readlines()
        for idx, line in enumerate(lines, 1):
            for m in pattern.finditer(line):
                full = m.group(0)
                prefix = m.group(1)
                util = m.group(2)
                color = m.group(3)
                shade = m.group(4) or ""
                alpha = m.group(5) or ""
                key = f"{color}-{shade}" if shade else color
                matches.append({
                    "file": f,
                    "line": idx,
                    "full": full,
                    "prefix": prefix,
                    "util": util,
                    "color": color,
                    "shade": shade,
                    "key": key,
                    "alpha": alpha,
                    "line_text": line.strip()
                })

def get_hex(m):
    key = m["key"].lower()
    if key.startswith("[#") and key.endswith("]"):
        return key[1:-1].lower()
    return TAILWIND_HEX.get(key, key)

def classify(m):
    file = m["file"]
    line_num = m["line"]
    full = m["full"]
    prefix = m["prefix"]
    util = m["util"]
    color = m["color"]
    shade = m["shade"]
    key = m["key"]
    alpha = m["alpha"]
    lt = m["line_text"].lower()

    # Backdrop overlay with alpha
    if alpha in ("/40", "/50", "/60", "/70", "/80", "/90", "/95") and (util == "bg" and ("slate-900" in key or "slate-950" in key or "black" in key)):
        return "bg-overlay"

    # Shell root background and text
    if key == "[#f8fafc]":
        return "bg-app"
    if key == "[#1e293b]":
        return "text-heading"
    if key.lower() == "[#e2e8f0]":
        return "card-border"

    # Navigation specifics
    is_nav_file = "navbar.tsx" in file.lower()
    in_nav_element = "<nav" in lt or "navbar" in lt or is_nav_file

    if is_nav_file or in_nav_element:
        if util == "bg":
            if "white" in key or key == "white/80":
                if "<nav" in lt or "nav" in lt or "navbar" in lt or "header" in lt:
                    return "nav-bg"
            if "blue" in key and ("active" in lt or "rounded" in lt or "hover" in prefix):
                return "nav-text-active"
        if util.startswith("text"):
            if "blue-600" in key or "blue-700" in key or "blue-900" in key:
                if "active" in lt or "group-hover" in prefix or "font-bold" in lt or "nav" in lt or "logo" in lt:
                    return "nav-text-active"
            if "slate" in key:
                return "nav-text"

    # Status / Feedback: Green / Emerald (Success)
    if "emerald" in key or "green" in key or "teal" in key:
        if util == "bg":
            return "status-success-bg"
        else:
            return "status-success-text"

    # Status / Feedback: Amber / Yellow (Warning)
    if "amber" in key or "yellow" in key or "previewbanner" in file.lower():
        if util == "bg":
            return "status-warning-bg"
        else:
            return "status-warning-text"

    # Status / Feedback: Rose / Red (Error / Destructive)
    if "rose" in key or "red" in key:
        if util == "bg":
            return "status-error-bg"
        else:
            return "status-error-text"

    # Status / Feedback: Info (Blue-50 bg, blue-100/200 border, blue-700/800 text when in banner/alert/badge/pill)
    if ("blue-50" in key or "indigo-50" in key or "purple-50" in key) and util == "bg":
        return "status-info-bg"
    if ("blue-700" in key or "blue-800" in key or "indigo-700" in key or "indigo-800" in key or "purple-700" in key or "violet-600" in key or "sky-600" in key) and util.startswith("text") and not ("hover" in prefix or "<button" in lt or "<a" in lt):
        return "status-info-text"
    if ("blue-100" in key or "indigo-100" in key or "purple-100" in key or "blue-200" in key or "indigo-200" in key or "indigo-300" in key or "blue-300" in key) and util.startswith("border"):
        if "hover:border" in full:
            return "card-border"
        return "status-info-text"

    # Buttons: Primary
    if util == "bg" and ("blue-600" in key or "indigo-600" in key or "blue-500" in key or "blue-700" in key or "slate-700" in key):
        if "hover" in prefix:
            return "btn-primary-hover"
        return "btn-primary-bg"
    if util == "bg" and "hover" in prefix and ("blue-700" in key or "blue-800" in key or "indigo-700" in key or "blue-500" in key):
        return "btn-primary-hover"
    if util == "bg" and ("slate-800" in key or "slate-900" in key) and ("button" in lt or "<button" in lt or "px-" in lt or "rounded" in lt):
        if "scormplayer" in file.lower() or "scormpreviewplayer" in file.lower():
            if "hover:bg-slate-700" in full:
                return "btn-primary-hover"
            return "btn-primary-bg"

    # Border active tabs or focus
    if util.startswith("border") and ("blue-500" in key or "blue-600" in key):
        if "focus:" in prefix or "ring" in lt or "peer" in prefix:
            return "input-border-focus"
        if "selected" in lt or "active" in lt or "border-b" in lt or "border-l" in lt:
            return "input-border-focus"
        return "input-border-focus"

    # Links: Primary & Hover
    if util.startswith("text") and ("blue-600" in key or "indigo-600" in key or "blue-500" in key or "purple-600" in key):
        if "hover" in prefix:
            return "link-hover"
        return "link-primary"
    if util.startswith("text") and "hover" in prefix and ("blue-700" in key or "blue-800" in key or "indigo-700" in key):
        return "link-hover"

    # Forms/Inputs
    if "focus:" in prefix and "border" in util:
        return "input-border-focus"
    if ("<input" in lt or "<select" in lt or "<textarea" in lt or "peer" in prefix) and util.startswith("border"):
        return "input-border"

    # Cards/Panels
    if util == "bg" and ("white" in key or key == "[#ffffff]"):
        return "card-bg"

    if util.startswith("border"):
        if "slate-100" in key or "slate-200" in key or "slate-300" in key or "slate-150" in key or "slate-50" in key or "slate-700" in key or "slate-750" in key or "slate-800" in key or "slate-350" in key or "slate-250" in key:
            if "<input" in lt or "<select" in lt or "<textarea" in lt:
                return "input-border"
            return "card-border"
        if "transparent" in key:
            return "card-border"

    # Card header / Table head background
    if util == "bg" and ("slate-50" in key or "slate-50/50" in full or "slate-50/70" in full or "slate-50/80" in full or "slate-50/30" in full or "slate-50/20" in full or "slate-50/40" in full):
        if "<th" in lt or "thead" in lt or "header" in lt or "border-b" in lt or "<tr" in lt or "rounded-t" in lt:
            return "card-header-bg"
        if "min-h-screen" in lt or "shell-container" in lt or "flex-1" in lt or "page" in lt:
            return "bg-app"
        return "card-header-bg"

    # Backgrounds
    if util == "bg":
        if "slate-50" in key:
            return "bg-app"
        if "slate-100" in key or "slate-200" in key or "slate-300" in key or "slate-150" in key:
            return "bg-subtle"
        if "slate-800" in key or "slate-900" in key or "slate-950" in key:
            if "scormplayer" in file.lower() or "scormpreviewplayer" in file.lower():
                return "bg-app"
            return "bg-overlay"
        if "blue-100" in key or "indigo-100" in key:
            return "status-info-bg"
        if "transparent" in key:
            return "bg-subtle"

    # Text / Headings
    if util.startswith("text"):
        if "white" in key:
            if "<button" in lt or "btn" in lt:
                return "btn-primary-text"
            return "text-inverse"
        if "slate-900" in key or "slate-950" in key or "slate-800" in key:
            return "text-heading"
        if "slate-700" in key or "slate-600" in key:
            return "text-body"
        if "slate-500" in key or "slate-400" in key or "slate-300" in key or "slate-200" in key:
            return "text-muted"
        if "blue" in key or "indigo" in key:
            return "link-primary"
        if "purple" in key:
            return "text-body"

    return "UNCLASSIFIED"

token_defs = {
    "nav-bg": ("Navigation Background", "Navigation/Header", "#ffffff", False),
    "nav-text": ("Navigation Text", "Navigation/Header", "#475569", False),
    "nav-text-active": ("Navigation Text Active", "Navigation/Header", "#2563eb", False),
    
    "text-heading": ("Heading Text", "Text/Headings", "#0f172a", False),
    "text-body": ("Body Text", "Text/Headings", "#334155", False),
    "text-muted": ("Muted Text", "Text/Headings", "#64748b", False),
    "text-inverse": ("Inverse Text", "Text/Headings", "#ffffff", False),
    
    "btn-primary-bg": ("Button Primary Background", "Buttons", "#2563eb", False),
    "btn-primary-hover": ("Button Primary Hover", "Buttons", "#1d4ed8", False),
    "btn-primary-text": ("Button Primary Text", "Buttons", "#ffffff", False),
    
    "input-border": ("Input Border", "Forms/Inputs", "#e2e8f0", False),
    "input-border-focus": ("Input Focus Border", "Forms/Inputs", "#2563eb", False),
    
    "card-bg": ("Card Surface Background", "Cards/Panels", "#ffffff", False),
    "card-border": ("Card Border / Divider", "Cards/Panels", "#e2e8f0", False),
    "card-header-bg": ("Card / Table Header Background", "Cards/Panels", "#f8fafc", False),
    
    "link-primary": ("Link Text", "Links", "#2563eb", False),
    "link-hover": ("Link Hover Text", "Links", "#1d4ed8", False),
    
    "status-success-bg": ("Status Success Background", "Status/Feedback", "#ecfdf5", False),
    "status-success-text": ("Status Success Text", "Status/Feedback", "#047857", False),
    "status-warning-bg": ("Status Warning Background", "Status/Feedback", "#fffbeb", False),
    "status-warning-text": ("Status Warning Text", "Status/Feedback", "#b45309", False),
    "status-error-bg": ("Status Error Background", "Status/Feedback", "#fef2f2", False),
    "status-error-text": ("Status Error Text", "Status/Feedback", "#dc2626", False),
    "status-info-bg": ("Status Info Background", "Status/Feedback", "#eff6ff", False),
    "status-info-text": ("Status Info Text", "Status/Feedback", "#1d4ed8", False),
    
    "bg-app": ("Application Canvas Background", "Backgrounds", "#f8fafc", False),
    "bg-subtle": ("Subtle Surface / Neutral Background", "Backgrounds", "#f1f5f9", False),
    "bg-overlay": ("Modal Backdrop Overlay", "Backgrounds", "rgba(15, 23, 42, 0.4)", True),
}

classified = defaultdict(list)
unclassified = []

for m in matches:
    t = classify(m)
    if t == "UNCLASSIFIED":
        unclassified.append(m)
    else:
        classified[t].append(m)

print(f"Total matches: {len(matches)}")
print(f"Total classified: {len(matches) - len(unclassified)}")
print(f"Unclassified count: {len(unclassified)}")

