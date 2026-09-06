# Theme Token Audit: Frontend Color & Font Inventory

**Status:** Architectural Source of Truth (Task 1 Complete)  
**Scope:** Frontend theme token inventory covering all 42 `.tsx` files in `src/`  
**Downstream Dependencies:** Task 2 (CSS Properties), Task 4 (Tailwind Integration), Task 8 (Component Migration), Task 11 (Branding UI)  

---

## 1. Executive Summary

This document establishes the authoritative source of truth for semantic color and font tokens across the SmartCookie learning management platform. Prior to this audit, the frontend hardcoded arbitrary Tailwind utility classes directly into component markup with zero CSS custom properties. This caused visual inconsistencies, brand color fragmentation across three competing shades of blue, discordant neutral grays, split status badge palettes (emerald vs. green, rose vs. red), and arbitrary hex overrides.

### Key Audit Metrics
- **Total Files Audited:** 42 files (`src/App.tsx`, `src/features/**/*.tsx`, `src/shared/**/*.tsx`)
- **Total Hardcoded Utility Occurrences Detected:** 3,090 color utility instances
- **Total Accounted Occurrences:** 3,090 (100.0% coverage)
- **Orphaned / Unclassified Occurrences:** 0 (Zero orphaned color classes)
- **Target Semantic Color Token Count:** Exactly 28 tokens across 8 functional groups (within target range of 20–28)
- **Font-Assignment Groups:** 8 fixed groups; all 8 currently inherit the global Inter system default

---

## 2. Semantic Color Token Master Inventory

The 28 semantic tokens below consolidate the ~3,090 hardcoded Tailwind occurrences into a clean, cohesive design system. All subsequent styling tasks must build exclusively against these tokens.

| Semantic Key | Human Label | Group | Proposed Canonical Value | Alpha | Current Hardcoded Values in Use | Hits |
|:---|:---|:---|:---|:---:|:---|---:|
| `nav-bg` | Navigation Bar Background | Navigation/Header | `White (#ffffff)` | No | `#ffffff/80` (bg-white/80) [1], `#ffffff` (bg-white) [1] | 2 |
| `nav-text` | Navigation Item Text | Navigation/Header | `Slate-600 (#475569)` | No | `#64748b` (text-slate-500) [11], `#1e293b` (text-slate-80... | 28 |
| `nav-text-active` | Navigation Item Active Text | Navigation/Header | `Blue-600 (#2563eb)` | No | `#2563eb` (bg-blue-600) [4], `#1e3a8a` (text-blue-900) [1... | 6 |
| `text-heading` | Heading & Title Text | Text/Headings | `Slate-900 (#0f172a)` | No | `#1e293b` (text-slate-800) [121], `#0f172a` (text-slate-9... | 241 |
| `text-body` | Body & Content Text | Text/Headings | `Slate-700 (#334155)` | No | `#334155` (text-slate-700) [139], `#475569` (text-slate-6... | 230 |
| `text-muted` | Muted & Helper Text | Text/Headings | `Slate-500 (#64748b)` | No | `#64748b` (text-slate-500) [229], `#94a3b8` (text-slate-4... | 456 |
| `text-inverse` | Inverse Text (on Dark/Color) | Text/Headings | `White (#ffffff)` | No | `#ffffff` (text-white) [17] | 17 |
| `btn-primary-bg` | Primary Button Background | Buttons | `Blue-600 (#2563eb)` | No | `#2563eb` (bg-blue-600) [64], `#1e293b` (bg-slate-800) [6... | 76 |
| `btn-primary-hover` | Primary Button Hover Background | Buttons | `Blue-700 (#1d4ed8)` | No | `#1d4ed8` (bg-blue-700) [49], `#4338ca` (bg-indigo-700) [... | 54 |
| `btn-primary-text` | Primary Button Text | Buttons | `White (#ffffff)` | No | `#ffffff` (text-white) [79] | 79 |
| `input-border` | Form Control Inactive Border | Forms/Inputs | `Slate-200 (#e2e8f0)` | No | `#e2e8f0` (border-slate-200) [40], `#cbd5e1` (border-slat... | 55 |
| `input-border-focus` | Form Control Focus Border | Forms/Inputs | `Blue-600 (#2563eb)` | No | `#3b82f6` (border-blue-500) [74], `#2563eb` (border-blue-... | 90 |
| `card-bg` | Card & Panel Surface Fill | Cards/Panels | `White (#ffffff)` | No | `#ffffff` (bg-white) [198] | 198 |
| `card-border` | Card & Panel Border Stroke | Cards/Panels | `Slate-200 (#e2e8f0)` | No | `#e2e8f0` (border-slate-200) [171], `#f1f5f9` (border-sla... | 381 |
| `card-header-bg` | Card & Table Header Background | Cards/Panels | `Slate-50 (#f8fafc)` | No | `#f8fafc` (bg-slate-50) [101], `#f8fafc/50` (bg-slate-50/... | 149 |
| `link-primary` | Interactive Hyperlink Text | Links | `Blue-600 (#2563eb)` | No | `#2563eb` (text-blue-600) [118], `#3b82f6` (text-blue-500... | 167 |
| `link-hover` | Interactive Hyperlink Hover Text | Links | `Blue-700 (#1d4ed8)` | No | `#2563eb` (text-blue-600) [10], `#1e40af` (text-blue-800)... | 22 |
| `status-success-bg` | Success Status Background | Status/Feedback | `Emerald-50 (#ecfdf5)` | No | `#ecfdf5` (bg-emerald-50) [31], `#f0fdf4` (bg-green-50) [... | 57 |
| `status-success-text` | Success Status Text & Icon | Status/Feedback | `Emerald-700 (#047857)` | No | `#059669` (text-emerald-600) [27], `#d1fae5` (border-emer... | 112 |
| `status-warning-bg` | Warning Status Background | Status/Feedback | `Amber-50 (#fffbeb)` | No | `#fffbeb` (bg-amber-50) [15], `#fef3c7` (bg-amber-100) [2... | 34 |
| `status-warning-text` | Warning Status Text & Icon | Status/Feedback | `Amber-700 (#b45309)` | No | `#fef3c7` (border-amber-100) [16], `#b45309` (text-amber-... | 64 |
| `status-error-bg` | Error Status Background | Status/Feedback | `Red-50 (#fef2f2)` | No | `#fff1f2` (bg-rose-50) [33], `#fef2f2` (bg-red-50) [26], ... | 83 |
| `status-error-text` | Error Status Text & Icon | Status/Feedback | `Red-600 (#dc2626)` | No | `#e11d48` (text-rose-600) [33], `#ffe4e6` (border-rose-10... | 175 |
| `status-info-bg` | Info Status Background | Status/Feedback | `Blue-50 (#eff6ff)` | No | `#eff6ff` (bg-blue-50) [41], `#eef2ff` (bg-indigo-50) [9]... | 97 |
| `status-info-text` | Info Status Text & Icon | Status/Feedback | `Blue-700 (#1d4ed8)` | No | `#1d4ed8` (text-blue-700) [23], `#dbeafe` (border-blue-10... | 75 |
| `bg-app` | Application Page Canvas Background | Backgrounds | `Slate-50 (#f8fafc)` | No | `#f8fafc` (bg-slate-50) [11], `#020617` (bg-slate-950) [4... | 16 |
| `bg-subtle` | Subtle / Secondary Surface Background | Backgrounds | `Slate-100 (#f1f5f9)` | No | `#f1f5f9` (bg-slate-100) [57], `#e2e8f0` (bg-slate-200) [... | 83 |
| `bg-overlay` | Modal Backdrop Overlay | Backgrounds | `Slate-900 @ 40% (rgba(15, 23, 42, 0.40))` | Yes | `#1e293b` (bg-slate-800) [12], `#0f172a/40` (bg-slate-900... | 43 |

---

## 3. Detailed Token Breakdown & File References

This section documents each token in detail, including its semantic role, hardcoded values currently found in use, proposed canonical value, and exact `file:line` occurrences.

### Group: Navigation/Header

#### `nav-bg` — Navigation Bar Background
- **Group:** Navigation/Header
- **Semantic Role:** Primary navigation bar, mobile menu drawer, and sticky top header background surface.
- **Proposed Canonical Value:** `White (#ffffff)`
- **Alpha / Transparency Applies:** No
- **Total Occurrences:** 2
- **Current Hardcoded Values Found:** `#ffffff/80` (bg-white/80) [1], `#ffffff` (bg-white) [1]
- **File & Line References:**
- `src/shared/components/layout/Navbar.tsx:77, 268`

#### `nav-text` — Navigation Item Text
- **Group:** Navigation/Header
- **Semantic Role:** Default unselected navigation links, header utility controls, and language selectors.
- **Proposed Canonical Value:** `Slate-600 (#475569)`
- **Alpha / Transparency Applies:** No
- **Total Occurrences:** 28
- **Current Hardcoded Values Found:** `#64748b` (text-slate-500) [11], `#1e293b` (text-slate-800) [9], `#475569` (text-slate-600) [2], `#94a3b8` (text-slate-400) [2], `#334155` (text-slate-700) [2], `#020617` (text-slate-950) [1], `#0f172a` (text-slate-900) [1]
- **File & Line References:**
- `src/shared/components/layout/Navbar.tsx:85, 106, 124, 143, 163, 186, 201, 212, 227, 248, 275, 286, 298, 311, 323, 334, 343, 354`

#### `nav-text-active` — Navigation Item Active Text
- **Group:** Navigation/Header
- **Semantic Role:** Currently active / selected navigation item text, active icon tint, and brand logo accent.
- **Proposed Canonical Value:** `Blue-600 (#2563eb)`
- **Alpha / Transparency Applies:** No
- **Total Occurrences:** 6
- **Current Hardcoded Values Found:** `#2563eb` (bg-blue-600) [4], `#1e3a8a` (text-blue-900) [1], `#2563eb` (text-blue-600) [1]
- **File & Line References:**
- `src/shared/components/layout/Navbar.tsx:95, 115, 133, 152, 172`

---

### Group: Text/Headings

#### `text-heading` — Heading & Title Text
- **Group:** Text/Headings
- **Semantic Role:** Primary headings (H1–H6), modal dialog titles, card titles, and high-emphasis display labels.
- **Proposed Canonical Value:** `Slate-900 (#0f172a)`
- **Alpha / Transparency Applies:** No
- **Total Occurrences:** 241
- **Current Hardcoded Values Found:** `#1e293b` (text-slate-800) [121], `#0f172a` (text-slate-900) [110], `#020617` (text-slate-950) [9], `#1e293b` (text-[#1E293B]) [1]
- **File & Line References:**
- `src/features/assignments/components/AssignmentInstanceReport.tsx:180, 237`
- `src/features/assignments/pages/AssignmentManagement.tsx:395, 396, 501, 585, 665, 688, 707, 866, 867, 877, 878, 897, 915`
- `src/features/assignments/pages/ContentManagement.tsx:531, 532, 544, 545, 588, 622, 716, 753, 873, 935, 944, 1067, 1101, 1171, 1198`
- `src/features/auth/pages/AcceptInvitation.tsx:91, 109, 143, 166`
- `src/features/auth/pages/ConfirmEmail.tsx:50, 69, 90`
- `src/features/auth/pages/ForgotPassword.tsx:74, 92, 132, 154`
- `src/features/auth/pages/Login.tsx:217, 233, 258, 284, 317, 342, 363, 383, 422, 443, 455, 460`
- `src/features/auth/pages/ResetPassword.tsx:92, 110, 141, 164`
- `src/features/auth/pages/SetupWizard.tsx:382, 399, 407, 431, 446, 462, 497, 542, 585, 619, 645, 653, 677, 692, 720, 728, 766, 775, 785, 794, 804, 813, 823, 832, 842, 851, 868, 964, 972, 992, 1000, 1026, 1086, 1094, 1120`
- `src/features/catalog/pages/Catalog.tsx:254, 314, 315, 363, 443`
- `src/features/content/components/ScormPlayer.tsx:238, 273`
- `src/features/content/pages/ContentImportWizard.tsx:306, 361, 397, 447, 489, 515, 558, 663, 682, 700, 735, 786, 828, 840, 870`
- `src/features/identity/components/EntraSetupSteps.tsx:161, 180, 199, 218, 251, 261, 264, 267, 270, 273, 280, 293, 318, 333, 349, 393, 424, 461, 520, 541, 558, 586, 591, 596, 601, 606`
- `src/features/lessons/pages/MyLessons.tsx:224, 286, 287, 366`
- `src/features/management/pages/Management.tsx:65, 94, 114, 138, 162, 198, 209`
- `src/features/organization/components/BulkImportWizard.tsx:184, 222, 275, 339, 377, 393, 404`
- `src/features/organization/components/ExpiringGroupsTab.tsx:81, 130`
- `src/features/organization/components/LearningGroupsTab.tsx:375, 446, 471, 500, 517, 541, 626, 674`
- `src/features/organization/components/OrganizationStructureTab.tsx:404, 501, 530, 547, 571, 620, 669, 724`
- `src/features/organization/components/UsersTab.tsx:405, 547, 588, 589, 626, 829, 867, 880, 905, 929, 943, 953`
- `src/features/profiles/components/AccountInformationTab.tsx:166, 184`
- `src/features/profiles/components/NotificationsTab.tsx:147, 200`
- `src/features/profiles/components/PersonalInformationTab.tsx:258, 264, 355`
- `src/features/profiles/components/SecurityTab.tsx:139, 247, 309, 323, 341`
- `src/features/profiles/pages/FieldBuilder.tsx:445, 499, 574, 684, 712, 823, 868, 1086`
- `src/features/profiles/pages/FullProfile.tsx:72, 94, 152, 166`
- `src/features/rbac/pages/RoleManagement.tsx:468, 501, 545, 625, 670, 728, 767, 789, 820, 845`
- `src/features/rbac/pages/Settings.tsx:43, 64, 85, 103`
- `src/shared/components/AppGate.tsx:377, 392, 402, 412`
- `src/shared/components/QuickProfile.tsx:122`
- `src/shared/components/RequiredFieldReminder.tsx:86, 93`
- `src/shared/components/layout/Footer.tsx:37`
- `src/shared/components/layout/LanguageSwitcher.tsx:61, 88`
- `src/shared/components/layout/Shell.tsx:15`

#### `text-body` — Body & Content Text
- **Group:** Text/Headings
- **Semantic Role:** Standard body copy, paragraphs, table cell contents, form descriptions, and list items.
- **Proposed Canonical Value:** `Slate-700 (#334155)`
- **Alpha / Transparency Applies:** No
- **Total Occurrences:** 230
- **Current Hardcoded Values Found:** `#334155` (text-slate-700) [139], `#475569` (text-slate-600) [91]
- **File & Line References:**
- `src/features/assignments/components/AssignmentInstanceReport.tsx:119, 129, 190, 233, 278, 294, 298, 337, 378`
- `src/features/assignments/pages/AssignmentManagement.tsx:671, 743, 752, 772, 781, 801, 811, 921, 942`
- `src/features/assignments/pages/ContentManagement.tsx:610, 676, 727, 744, 753, 773, 795, 802, 809, 891, 903, 948, 972, 1036, 1077, 1129, 1153, 1176, 1206`
- `src/features/auth/pages/AcceptInvitation.tsx:133, 149, 157`
- `src/features/auth/pages/ConfirmEmail.tsx:59, 70, 100`
- `src/features/auth/pages/ForgotPassword.tsx:123`
- `src/features/auth/pages/Login.tsx:249, 265, 311, 332, 377, 394, 412, 472`
- `src/features/auth/pages/ResetPassword.tsx:131, 147, 155`
- `src/features/auth/pages/SetupWizard.tsx:422, 437, 453, 466, 538, 565, 605, 610, 668, 683, 722, 902, 903, 904, 905, 911, 966, 1049, 1143`
- `src/features/catalog/pages/Catalog.tsx:299, 334, 412, 464`
- `src/features/content/components/ScormPlayer.tsx:244, 283, 287, 292, 319, 339`
- `src/features/content/pages/ContentImportWizard.tsx:465, 524, 539, 572, 585, 597, 616, 628, 645, 717, 879, 883, 932`
- `src/features/identity/components/EntraSetupSteps.tsx:238, 250, 256, 275, 276, 309, 324, 339, 355, 366, 399, 401, 405, 413, 456, 484, 528, 569, 583, 621`
- `src/features/lessons/pages/MyLessons.tsx:269, 306, 382`
- `src/features/management/pages/Management.tsx:57, 199, 210`
- `src/features/organization/components/BulkImportWizard.tsx:193, 265, 393, 404`
- `src/features/organization/components/ExpiringGroupsTab.tsx:91, 110, 153`
- `src/features/organization/components/LearningGroupsTab.tsx:381, 410, 446, 501, 524, 563, 584, 600, 630, 643, 675, 688`
- `src/features/organization/components/OrganizationStructureTab.tsx:410, 443, 531, 554, 593, 624, 638, 673, 686, 786, 800, 812`
- `src/features/organization/components/UsersTab.tsx:508, 525, 548, 561, 566, 567, 595, 599, 605, 636, 736, 788, 829, 880, 953`
- `src/features/organization/pages/UserGroupManagement.tsx:35, 49, 62, 75`
- `src/features/profiles/components/NotificationsTab.tsx:204`
- `src/features/profiles/components/PersonalInformationTab.tsx:261, 363`
- `src/features/profiles/components/SecurityTab.tsx:176, 191, 206, 272, 310, 323, 347`
- `src/features/profiles/pages/FieldBuilder.tsx:456, 493, 513, 521, 599, 618, 626, 737, 756, 763, 844, 1003, 1014, 1039, 1057, 1112, 1126`
- `src/features/rbac/pages/RoleManagement.tsx:549, 562, 573, 629, 657, 696, 713, 728, 772, 780, 797, 828, 836, 856`
- `src/features/rbac/pages/Settings.tsx:35`
- `src/shared/components/AppGate.tsx:415`
- `src/shared/components/ProfileFieldInput.tsx:275, 318, 343, 372`
- `src/shared/components/QuickProfile.tsx:132, 136, 143, 152, 161, 175`
- `src/shared/components/RequiredFieldReminder.tsx:92, 112`
- `src/shared/components/layout/LanguageSwitcher.tsx:61, 88`

#### `text-muted` — Muted & Helper Text
- **Group:** Text/Headings
- **Semantic Role:** Secondary labels, timestamps, metadata, helper text, breadcrumbs, and empty-state descriptions.
- **Proposed Canonical Value:** `Slate-500 (#64748b)`
- **Alpha / Transparency Applies:** No
- **Total Occurrences:** 456
- **Current Hardcoded Values Found:** `#64748b` (text-slate-500) [229], `#94a3b8` (text-slate-400) [208], `#cbd5e1` (text-slate-300) [15], `#e2e8f0` (text-slate-200) [4]
- **File & Line References:**
- `src/features/assignments/components/AssignmentInstanceReport.tsx:184, 190, 203, 211, 212, 217, 240, 248, 275, 277, 281, 293, 297, 310, 311, 335, 359`
- `src/features/assignments/pages/AssignmentManagement.tsx:352, 396, 445, 510, 512, 531, 543, 557, 594, 596, 613, 625, 639, 671, 681, 700, 722, 727, 764, 793, 823, 829, 831, 857, 867, 878, 888, 889, 906, 930`
- `src/features/assignments/pages/ContentManagement.tsx:488, 532, 545, 594, 610, 632, 653, 664, 667, 719, 735, 796, 803, 810, 832, 859, 876, 880, 948, 956, 958, 969, 974, 984, 992, 1026, 1041, 1049, 1071, 1077, 1088, 1091, 1109, 1116, 1120, 1176, 1187`
- `src/features/auth/pages/AcceptInvitation.tsx:94, 143, 149, 166`
- `src/features/auth/pages/ConfirmEmail.tsx:51, 94`
- `src/features/auth/pages/ForgotPassword.tsx:77, 132, 154`
- `src/features/auth/pages/Login.tsx:218, 258, 284, 311, 321, 342, 363, 377, 387, 393, 422, 443, 458, 481`
- `src/features/auth/pages/ResetPassword.tsx:95, 141, 147, 164`
- `src/features/auth/pages/SetupWizard.tsx:383, 408, 449, 465, 507, 541, 586, 604, 654, 695, 729, 750, 770, 789, 808, 827, 846, 868, 874, 902, 903, 904, 905, 910, 950, 973, 1001, 1042, 1053, 1095`
- `src/features/catalog/pages/Catalog.tsx:257, 293, 315, 328, 332, 333, 335, 366, 373, 380, 410, 411, 413, 437, 450, 454, 472, 483, 493`
- `src/features/content/components/ScormPlayer.tsx:226, 239, 274, 280, 322, 339, 352, 365, 377`
- `src/features/content/components/ScormPreviewPlayer.tsx:130, 144, 149, 172, 176, 186, 206`
- `src/features/content/pages/ContentImportWizard.tsx:307, 331, 336, 356, 361, 378, 398, 448, 459, 490, 508, 518, 525, 559, 564, 578, 591, 609, 622, 638, 664, 683, 701, 709, 736, 788, 798, 829, 871, 876`
- `src/features/identity/components/EntraSetupSteps.tsx:162, 181, 200, 219, 274, 355, 381, 394, 412, 414, 425, 471, 508, 521, 542, 559, 577, 587, 592, 597, 602, 607, 612, 636`
- `src/features/lessons/pages/MyLessons.tsx:227, 263, 287, 301, 304, 305, 307, 356, 369, 370, 380, 395, 398`
- `src/features/management/pages/Management.tsx:74, 93, 117, 141, 165, 199, 210`
- `src/features/organization/components/BulkImportWizard.tsx:187, 193, 225, 271, 278, 319, 324, 338, 359, 380`
- `src/features/organization/components/ExpiringGroupsTab.tsx:82, 105, 111, 137, 139`
- `src/features/organization/components/LearningGroupsTab.tsx:346, 381, 414, 423, 454, 472, 486, 487, 488, 504, 526, 547, 553, 559, 593, 595, 630, 634, 639, 675, 679, 684`
- `src/features/organization/components/OrganizationStructureTab.tsx:373, 410, 441, 451, 484, 502, 516, 517, 518, 534, 556, 577, 583, 589, 624, 628, 634, 673, 677, 682, 727, 736, 756, 777, 792`
- `src/features/organization/components/UsersTab.tsx:406, 439, 524, 530, 587, 629, 636, 652, 658, 669, 681, 686, 691, 708, 726, 728, 757, 779, 791, 870, 908, 916`
- `src/features/organization/pages/UserGroupManagement.tsx:35, 49, 62, 75`
- `src/features/profiles/components/AccountInformationTab.tsx:78, 96, 103, 109, 115, 121, 135, 141, 147, 153, 167, 180`
- `src/features/profiles/components/NotificationsTab.tsx:127, 135, 148, 209, 213`
- `src/features/profiles/components/PersonalInformationTab.tsx:356, 366, 376`
- `src/features/profiles/components/SecurityTab.tsx:140, 248, 313, 337, 342, 348`
- `src/features/profiles/pages/FieldBuilder.tsx:446, 459, 493, 501, 513, 521, 528, 535, 547, 548, 561, 583, 587, 618, 626, 638, 645, 653, 661, 686, 695, 699, 721, 725, 756, 763, 774, 781, 789, 797, 828, 874, 889, 903, 920, 924, 952, 969, 985, 1000, 1026, 1031, 1087, 1091, 1097`
- `src/features/profiles/pages/FullProfile.tsx:75, 94, 98, 155, 169`
- `src/features/rbac/pages/RoleManagement.tsx:431, 472, 518, 561, 572, 583, 594, 597, 601, 604, 628, 660, 702, 754, 772, 828`
- `src/features/rbac/pages/Settings.tsx:48, 63, 88, 100, 106`
- `src/shared/components/AppGate.tsx:393`
- `src/shared/components/ProfileFieldInput.tsx:195, 354, 374`
- `src/shared/components/QuickProfile.tsx:98, 125, 134, 135, 141, 142, 150, 151, 159, 160, 179, 182`
- `src/shared/components/RequiredFieldReminder.tsx:112`
- `src/shared/components/layout/Footer.tsx:18, 49, 59`
- `src/shared/components/layout/LanguageSwitcher.tsx:67`

#### `text-inverse` — Inverse Text (on Dark/Color)
- **Group:** Text/Headings
- **Semantic Role:** High-contrast light text displayed over primary filled buttons, dark headers, status badges, and avatars.
- **Proposed Canonical Value:** `White (#ffffff)`
- **Alpha / Transparency Applies:** No
- **Total Occurrences:** 17
- **Current Hardcoded Values Found:** `#ffffff` (text-white) [17]
- **File & Line References:**
- `src/features/auth/pages/AcceptInvitation.tsx:88`
- `src/features/auth/pages/ForgotPassword.tsx:71`
- `src/features/auth/pages/Login.tsx:214, 493`
- `src/features/auth/pages/ResetPassword.tsx:89`
- `src/features/auth/pages/SetupWizard.tsx:379`
- `src/features/content/components/ScormPlayer.tsx:362`
- `src/features/content/components/ScormPreviewPlayer.tsx:128, 183`
- `src/features/content/pages/ContentImportWizard.tsx:326, 353, 355, 802, 901`
- `src/features/profiles/components/PersonalInformationTab.tsx:325`
- `src/shared/components/AppGate.tsx:383`
- `src/shared/components/QuickProfile.tsx:115`

---

### Group: Buttons

#### `btn-primary-bg` — Primary Button Background
- **Group:** Buttons
- **Semantic Role:** Solid fill for primary call-to-action buttons, submit buttons, and prominent interactive triggers.
- **Proposed Canonical Value:** `Blue-600 (#2563eb)`
- **Alpha / Transparency Applies:** No
- **Total Occurrences:** 76
- **Current Hardcoded Values Found:** `#2563eb` (bg-blue-600) [64], `#1e293b` (bg-slate-800) [6], `#4f46e5` (bg-indigo-600) [3], `#0f172a` (bg-slate-900) [2], `#334155` (bg-slate-700) [1]
- **File & Line References:**
- `src/features/assignments/pages/AssignmentManagement.tsx:421, 949`
- `src/features/assignments/pages/ContentManagement.tsx:575, 763, 783, 1213`
- `src/features/auth/pages/AcceptInvitation.tsx:88, 174`
- `src/features/auth/pages/ConfirmEmail.tsx:76`
- `src/features/auth/pages/ForgotPassword.tsx:71, 140`
- `src/features/auth/pages/Login.tsx:214, 292, 350, 430, 493`
- `src/features/auth/pages/ResetPassword.tsx:89, 172`
- `src/features/auth/pages/SetupWizard.tsx:379, 478, 574, 627, 701, 756, 932, 1067, 1129`
- `src/features/content/components/ScormPlayer.tsx:251, 309, 350, 356, 377`
- `src/features/content/components/ScormPreviewPlayer.tsx:138, 149, 156, 176, 186, 206`
- `src/features/content/pages/ContentImportWizard.tsx:353, 802, 898, 942`
- `src/features/identity/components/EntraSetupSteps.tsx:230, 298, 374, 500, 629`
- `src/features/lessons/pages/MyLessons.tsx:416`
- `src/features/organization/components/BulkImportWizard.tsx:232, 416, 441`
- `src/features/organization/components/LearningGroupsTab.tsx:611, 658`
- `src/features/organization/components/OrganizationStructureTab.tsx:605, 653`
- `src/features/organization/components/UsersTab.tsx:413, 837, 960`
- `src/features/profiles/components/NotificationsTab.tsx:232`
- `src/features/profiles/components/PersonalInformationTab.tsx:274, 400`
- `src/features/profiles/components/SecurityTab.tsx:224, 290`
- `src/features/profiles/pages/FieldBuilder.tsx:464, 850, 1063, 1133`
- `src/features/profiles/pages/FullProfile.tsx:103, 110`
- `src/features/rbac/pages/RoleManagement.tsx:482, 508, 637, 804, 863`
- `src/shared/components/AppGate.tsx:383, 423`

#### `btn-primary-hover` — Primary Button Hover Background
- **Group:** Buttons
- **Semantic Role:** Interactive hover and pressed fill state for primary call-to-action buttons.
- **Proposed Canonical Value:** `Blue-700 (#1d4ed8)`
- **Alpha / Transparency Applies:** No
- **Total Occurrences:** 54
- **Current Hardcoded Values Found:** `#1d4ed8` (bg-blue-700) [49], `#4338ca` (bg-indigo-700) [3], `#334155` (bg-slate-700) [2]
- **File & Line References:**
- `src/features/assignments/pages/AssignmentManagement.tsx:421, 949`
- `src/features/assignments/pages/ContentManagement.tsx:575, 763, 1213`
- `src/features/auth/pages/AcceptInvitation.tsx:174`
- `src/features/auth/pages/ConfirmEmail.tsx:76`
- `src/features/auth/pages/ForgotPassword.tsx:140`
- `src/features/auth/pages/Login.tsx:292, 350, 430, 493`
- `src/features/auth/pages/ResetPassword.tsx:172`
- `src/features/auth/pages/SetupWizard.tsx:478, 574, 627, 701, 932, 1067, 1129`
- `src/features/content/components/ScormPlayer.tsx:251, 309, 377`
- `src/features/content/components/ScormPreviewPlayer.tsx:156, 206`
- `src/features/content/pages/ContentImportWizard.tsx:898, 942`
- `src/features/identity/components/EntraSetupSteps.tsx:230, 298, 374, 500, 629`
- `src/features/lessons/pages/MyLessons.tsx:416`
- `src/features/organization/components/BulkImportWizard.tsx:232, 416, 441`
- `src/features/organization/components/LearningGroupsTab.tsx:611, 658`
- `src/features/organization/components/OrganizationStructureTab.tsx:605, 653`
- `src/features/organization/components/UsersTab.tsx:413, 837, 960`
- `src/features/profiles/components/PersonalInformationTab.tsx:400`
- `src/features/profiles/components/SecurityTab.tsx:224, 290`
- `src/features/profiles/pages/FieldBuilder.tsx:464, 850, 1063, 1133`
- `src/features/rbac/pages/RoleManagement.tsx:508, 637, 804, 863`

#### `btn-primary-text` — Primary Button Text
- **Group:** Buttons
- **Semantic Role:** High-contrast text and icon glyphs rendered inside primary call-to-action buttons.
- **Proposed Canonical Value:** `White (#ffffff)`
- **Alpha / Transparency Applies:** No
- **Total Occurrences:** 79
- **Current Hardcoded Values Found:** `#ffffff` (text-white) [79]
- **File & Line References:**
- `src/features/assignments/pages/AssignmentManagement.tsx:421, 433, 949`
- `src/features/assignments/pages/ContentManagement.tsx:561, 575, 763, 783, 1015, 1213`
- `src/features/auth/pages/AcceptInvitation.tsx:174`
- `src/features/auth/pages/ConfirmEmail.tsx:76`
- `src/features/auth/pages/ForgotPassword.tsx:140`
- `src/features/auth/pages/Login.tsx:292, 350, 430`
- `src/features/auth/pages/ResetPassword.tsx:172`
- `src/features/auth/pages/SetupWizard.tsx:478, 574, 627, 701, 922, 932, 1032, 1067, 1129`
- `src/features/catalog/pages/Catalog.tsx:390, 503`
- `src/features/content/components/ScormPlayer.tsx:251, 309, 356, 377`
- `src/features/content/components/ScormPreviewPlayer.tsx:143, 156, 176, 206`
- `src/features/content/pages/ContentImportWizard.tsx:314, 336, 413, 847, 898, 916, 942`
- `src/features/identity/components/EntraSetupSteps.tsx:230, 298, 374, 492, 500, 629`
- `src/features/lessons/pages/MyLessons.tsx:416, 431`
- `src/features/organization/components/BulkImportWizard.tsx:232, 413, 441`
- `src/features/organization/components/LearningGroupsTab.tsx:611, 658, 704`
- `src/features/organization/components/OrganizationStructureTab.tsx:605, 653, 701, 819`
- `src/features/organization/components/UsersTab.tsx:413, 837, 887, 960`
- `src/features/profiles/components/PersonalInformationTab.tsx:335, 339, 400`
- `src/features/profiles/components/SecurityTab.tsx:224, 290`
- `src/features/profiles/pages/FieldBuilder.tsx:464, 850, 1063, 1133`
- `src/features/rbac/pages/RoleManagement.tsx:508, 637, 804, 863`
- `src/shared/components/AppGate.tsx:423`
- `src/shared/components/RequiredFieldReminder.tsx:101`

---

### Group: Forms/Inputs

#### `input-border` — Form Control Inactive Border
- **Group:** Forms/Inputs
- **Semantic Role:** Resting border stroke for text inputs, select dropdowns, textareas, checkboxes, and radio buttons.
- **Proposed Canonical Value:** `Slate-200 (#e2e8f0)`
- **Alpha / Transparency Applies:** No
- **Total Occurrences:** 55
- **Current Hardcoded Values Found:** `#e2e8f0` (border-slate-200) [40], `#cbd5e1` (border-slate-300) [11], `#f1f5f9` (border-slate-100) [4]
- **File & Line References:**
- `src/features/assignments/pages/AssignmentManagement.tsx:688, 707, 926`
- `src/features/auth/pages/SetupWizard.tsx:558, 563, 775, 794, 813, 832, 851, 1112, 1118`
- `src/features/catalog/pages/Catalog.tsx:290`
- `src/features/content/pages/ContentImportWizard.tsx:465, 585, 597, 616, 628, 645`
- `src/features/identity/components/EntraSetupSteps.tsx:169, 188, 207, 531, 548`
- `src/features/lessons/pages/MyLessons.tsx:260`
- `src/features/organization/components/BulkImportWizard.tsx:250`
- `src/features/organization/components/ExpiringGroupsTab.tsx:148, 153`
- `src/features/organization/components/LearningGroupsTab.tsx:357, 563, 576, 582, 600, 643, 688`
- `src/features/organization/components/OrganizationStructureTab.tsx:384, 593, 638, 686, 743, 764`
- `src/features/organization/components/UsersTab.tsx:686, 696, 713`
- `src/features/profiles/pages/FieldBuilder.tsx:909, 934, 1008, 1019, 1031, 1044, 1110`
- `src/features/rbac/pages/RoleManagement.tsx:670`

#### `input-border-focus` — Form Control Focus Border
- **Group:** Forms/Inputs
- **Semantic Role:** Focus state border stroke and focus-visible ring for active form inputs, tabs, and selectable items.
- **Proposed Canonical Value:** `Blue-600 (#2563eb)`
- **Alpha / Transparency Applies:** No
- **Total Occurrences:** 90
- **Current Hardcoded Values Found:** `#3b82f6` (border-blue-500) [74], `#2563eb` (border-blue-600) [7], `#6366f1` (border-indigo-500) [4], `#2563eb` (border-l-blue-600) [2], `#3b82f6/30` (border-blue-500/30) [2], `#2563eb` (border-t-blue-600) [1]
- **File & Line References:**
- `src/features/assignments/pages/AssignmentManagement.tsx:688, 707, 733, 897, 915`
- `src/features/assignments/pages/ContentManagement.tsx:868, 1198`
- `src/features/auth/pages/AcceptInvitation.tsx:143, 166`
- `src/features/auth/pages/ForgotPassword.tsx:132`
- `src/features/auth/pages/Login.tsx:258, 284, 342, 422`
- `src/features/auth/pages/ResetPassword.tsx:141, 164`
- `src/features/auth/pages/SetupWizard.tsx:431, 446, 462, 619, 677, 692, 775, 794, 813, 832, 851, 1026`
- `src/features/catalog/pages/Catalog.tsx:299`
- `src/features/content/components/ScormPlayer.tsx:372`
- `src/features/content/components/ScormPreviewPlayer.tsx:201`
- `src/features/content/pages/ContentImportWizard.tsx:465, 501, 572, 585, 597, 616, 628, 645, 675, 693, 717, 780, 802`
- `src/features/identity/components/EntraSetupSteps.tsx:169, 188, 207, 318, 333, 349`
- `src/features/lessons/pages/MyLessons.tsx:269`
- `src/features/management/pages/Management.tsx:198, 209`
- `src/features/organization/components/BulkImportWizard.tsx:249`
- `src/features/organization/components/ExpiringGroupsTab.tsx:153`
- `src/features/organization/components/LearningGroupsTab.tsx:357, 553, 563, 600, 643, 688`
- `src/features/organization/components/OrganizationStructureTab.tsx:384, 583, 593, 638, 686, 742`
- `src/features/organization/pages/UserGroupManagement.tsx:34, 48, 61, 74`
- `src/features/profiles/components/SecurityTab.tsx:184, 199, 214, 280`
- `src/features/profiles/pages/FieldBuilder.tsx:475, 836, 882, 897, 909, 934, 960, 977, 993`
- `src/features/rbac/pages/RoleManagement.tsx:538, 670, 789, 845`
- `src/shared/components/AppGate.tsx:388`
- `src/shared/components/ProfileFieldInput.tsx:195`

---

### Group: Cards/Panels

#### `card-bg` — Card & Panel Surface Fill
- **Group:** Cards/Panels
- **Semantic Role:** Surface fill for content cards, data tables, modal dialogs, popovers, and secondary buttons.
- **Proposed Canonical Value:** `White (#ffffff)`
- **Alpha / Transparency Applies:** No
- **Total Occurrences:** 198
- **Current Hardcoded Values Found:** `#ffffff` (bg-white) [198]
- **File & Line References:**
- `src/features/assignments/components/AssignmentInstanceReport.tsx:175, 211, 222, 378`
- `src/features/assignments/pages/AssignmentManagement.tsx:395, 445, 495, 543, 557, 579, 625, 639, 662, 688, 707, 866, 877, 897, 915`
- `src/features/assignments/pages/ContentManagement.tsx:531, 544, 594, 598, 744, 753, 773, 795, 802, 809, 859, 863, 903, 958, 966, 1034, 1049, 1062, 1097, 1153, 1168, 1198`
- `src/features/auth/pages/AcceptInvitation.tsx:103, 143, 166`
- `src/features/auth/pages/ConfirmEmail.tsx:45`
- `src/features/auth/pages/ForgotPassword.tsx:86, 132`
- `src/features/auth/pages/Login.tsx:225, 258, 284, 342, 391, 422, 463, 472`
- `src/features/auth/pages/ResetPassword.tsx:104, 141, 164`
- `src/features/auth/pages/SetupWizard.tsx:390, 431, 446, 462, 540, 593, 619, 677, 692, 775, 794, 813, 832, 851, 910, 1026, 1143`
- `src/features/catalog/pages/Catalog.tsx:299, 314, 332, 346, 410, 428, 462`
- `src/features/content/components/ScormPlayer.tsx:233, 267, 319, 385`
- `src/features/content/components/ScormPreviewPlayer.tsx:215`
- `src/features/content/pages/ContentImportWizard.tsx:301, 324, 465, 539, 597, 628, 781, 932`
- `src/features/identity/components/EntraSetupSteps.tsx:293, 318, 333, 349, 366, 459, 484, 574, 621`
- `src/features/lessons/pages/MyLessons.tsx:269, 286, 304, 323, 450`
- `src/features/management/pages/Management.tsx:57, 108, 132, 156, 179, 185, 191`
- `src/features/organization/components/BulkImportWizard.tsx:180, 332`
- `src/features/organization/components/ExpiringGroupsTab.tsx:78, 148, 153`
- `src/features/organization/components/LearningGroupsTab.tsx:357, 468, 515, 524, 540, 553, 563, 600, 643, 688`
- `src/features/organization/components/OrganizationStructureTab.tsx:384, 498, 545, 554, 570, 583, 593, 617, 638, 666, 686, 718, 743, 764, 798, 812`
- `src/features/organization/components/UsersTab.tsx:445, 457, 474, 493, 523, 528, 540, 595, 605, 618, 664, 675, 696, 713, 730, 861, 899`
- `src/features/profiles/components/NotificationsTab.tsx:239`
- `src/features/profiles/components/SecurityTab.tsx:133, 241, 347`
- `src/features/profiles/pages/FieldBuilder.tsx:456, 485, 821, 866, 909, 934, 1079`
- `src/features/profiles/pages/FullProfile.tsx:122`
- `src/features/rbac/pages/RoleManagement.tsx:465, 490, 499, 619, 670, 710, 765, 789, 797, 818, 845, 856`
- `src/features/rbac/pages/Settings.tsx:35, 79, 99, 116`
- `src/shared/components/AppGate.tsx:406`
- `src/shared/components/QuickProfile.tsx:94`
- `src/shared/components/layout/Footer.tsx:16`
- `src/shared/components/layout/LanguageSwitcher.tsx:61, 73`
- `src/shared/components/layout/Navbar.tsx:198`

#### `card-border` — Card & Panel Border Stroke
- **Group:** Cards/Panels
- **Semantic Role:** Structural bounding borders, table row dividers, panel separators, and secondary button borders.
- **Proposed Canonical Value:** `Slate-200 (#e2e8f0)`
- **Alpha / Transparency Applies:** No
- **Total Occurrences:** 381
- **Current Hardcoded Values Found:** `#e2e8f0` (border-slate-200) [171], `#f1f5f9` (border-slate-100) [114], `#cbd5e1` (border-slate-300) [18], `#e2e8f0/80` (border-slate-200/80) [15], `#e9eff5` (border-slate-150) [11], `transparent` (border-transparent) [10], `#f8fafc` (border-slate-50) [7], `#e2e8f0/60` (border-slate-200/60) [5], `#93c5fd` (border-blue-300) [5], `#1e293b` (border-slate-800) [5], `#e2e8f0/50` (border-slate-200/50) [4], `#bfdbfe` (border-blue-200) [3], `#e2e8f0` (border-[#E2E8F0]) [3], `#334155` (border-slate-700) [2], `#d5dfe9/50` (border-slate-250/50) [1], `#273548` (border-slate-750) [1], `#afbccb` (border-slate-350) [1], `#a5b4fc` (border-indigo-300) [1], `transparent` (border-l-transparent) [1], `#f1f5f9/50` (border-slate-100/50) [1], `transparent` (border-t-transparent) [1], `#f1f5f9/80` (border-slate-100/80) [1]
- **File & Line References:**
- `src/features/assignments/components/AssignmentInstanceReport.tsx:129, 178, 211, 222, 275, 359, 375, 378`
- `src/features/assignments/pages/AssignmentManagement.tsx:386, 445, 495, 531, 543, 557, 579, 613, 625, 639, 662, 664, 721, 733, 738, 741, 770, 799, 828, 897, 915, 938, 942`
- `src/features/assignments/pages/ContentManagement.tsx:522, 594, 598, 653, 664, 676, 709, 727, 744, 753, 773, 793, 795, 802, 809, 859, 863, 891, 903, 940, 941, 958, 966, 1025, 1034, 1049, 1065, 1093, 1109, 1129, 1150, 1153, 1168, 1170, 1198, 1206`
- `src/features/auth/pages/AcceptInvitation.tsx:103, 106, 143, 166`
- `src/features/auth/pages/ConfirmEmail.tsx:45`
- `src/features/auth/pages/ForgotPassword.tsx:86, 89, 132, 150`
- `src/features/auth/pages/Login.tsx:225, 230, 258, 284, 307, 342, 373, 390, 398, 422, 453, 460, 463, 472`
- `src/features/auth/pages/ResetPassword.tsx:104, 107, 141, 164`
- `src/features/auth/pages/SetupWizard.tsx:390, 396, 431, 446, 462, 494, 538, 540, 593, 603, 608, 619, 642, 677, 692, 717, 763, 860, 910, 942, 950, 961, 989, 1026, 1047, 1083, 1143`
- `src/features/catalog/pages/Catalog.tsx:252, 299, 332, 346, 372, 380, 410, 428, 449, 462, 482, 493`
- `src/features/content/components/ScormPlayer.tsx:244, 267, 280, 296, 319, 350, 352, 377`
- `src/features/content/components/ScormPreviewPlayer.tsx:138, 149, 172, 206`
- `src/features/content/pages/ContentImportWizard.tsx:324, 326, 343, 504, 539, 572, 676, 694, 717, 781, 802, 876, 886, 928, 932`
- `src/features/identity/components/EntraSetupSteps.tsx:238, 250, 251, 318, 333, 349, 366, 381, 399, 411, 421, 459, 484, 508, 574, 577, 621, 636`
- `src/features/lessons/pages/MyLessons.tsx:222, 269, 304, 324, 356, 377, 450`
- `src/features/management/pages/Management.tsx:52, 57, 88, 108, 132, 156, 179, 185, 191, 193, 199, 210`
- `src/features/organization/components/BulkImportWizard.tsx:180, 182, 322, 389`
- `src/features/organization/components/ExpiringGroupsTab.tsx:78, 79, 88, 108, 181`
- `src/features/organization/components/LearningGroupsTab.tsx:339, 410, 446, 454, 468, 469, 485, 499, 515, 524, 540, 541, 553, 671, 673`
- `src/features/organization/components/OrganizationStructureTab.tsx:366, 443, 484, 498, 499, 515, 529, 545, 554, 570, 571, 583, 718, 785, 798, 809, 812`
- `src/features/organization/components/UsersTab.tsx:445, 457, 474, 493, 508, 523, 528, 561, 586, 595, 605, 618, 620, 664, 675, 730, 743, 778, 788, 825, 861, 899, 915, 927, 941`
- `src/features/organization/pages/UserGroupManagement.tsx:27, 35, 49, 62, 75`
- `src/features/profiles/components/AccountInformationTab.tsx:99, 161, 177`
- `src/features/profiles/components/NotificationsTab.tsx:142, 204, 231`
- `src/features/profiles/components/PersonalInformationTab.tsx:313, 320, 363, 396`
- `src/features/profiles/components/SecurityTab.tsx:133, 134, 184, 199, 214, 241, 242, 280, 335, 347`
- `src/features/profiles/pages/FieldBuilder.tsx:439, 456, 475, 485, 489, 681, 682, 686, 821, 836, 844, 866, 882, 897, 924, 960, 977, 993, 999, 1053, 1057, 1079, 1095, 1119, 1126`
- `src/features/profiles/pages/FullProfile.tsx:83, 122`
- `src/features/rbac/pages/RoleManagement.tsx:465, 481, 499, 500, 539, 619, 622, 655, 700, 736, 754, 765, 766, 789, 797, 818, 819, 845, 856`
- `src/features/rbac/pages/Settings.tsx:30, 35, 58, 79, 99, 116`
- `src/shared/components/AppGate.tsx:388, 406`
- `src/shared/components/ProfileFieldInput.tsx:195, 196, 273, 316, 372`
- `src/shared/components/QuickProfile.tsx:94, 104, 110, 169`
- `src/shared/components/layout/Footer.tsx:16, 61`
- `src/shared/components/layout/LanguageSwitcher.tsx:61, 73`
- `src/shared/components/layout/Navbar.tsx:77, 186, 198, 201, 227, 268, 320`

#### `card-header-bg` — Card & Table Header Background
- **Group:** Cards/Panels
- **Semantic Role:** Sub-surface fill for card headers, table thead rows, tab strip rails, and panel section headers.
- **Proposed Canonical Value:** `Slate-50 (#f8fafc)`
- **Alpha / Transparency Applies:** No
- **Total Occurrences:** 149
- **Current Hardcoded Values Found:** `#f8fafc` (bg-slate-50) [101], `#f8fafc/50` (bg-slate-50/50) [35], `#f8fafc/70` (bg-slate-50/70) [5], `#f8fafc/20` (bg-slate-50/20) [4], `#f8fafc/30` (bg-slate-50/30) [2], `#f8fafc/40` (bg-slate-50/40) [1], `#f8fafc/80` (bg-slate-50/80) [1]
- **File & Line References:**
- `src/features/assignments/components/AssignmentInstanceReport.tsx:178, 228, 359, 375, 378`
- `src/features/assignments/pages/AssignmentManagement.tsx:496, 531, 580, 613, 738, 741, 770, 799, 828`
- `src/features/assignments/pages/ContentManagement.tsx:606, 653, 664, 676, 709, 867, 891, 903, 940, 1065, 1097, 1129, 1150, 1153`
- `src/features/auth/pages/Login.tsx:390, 398, 460, 472`
- `src/features/auth/pages/SetupWizard.tsx:465, 538, 558, 597, 603, 763, 950, 1047, 1112, 1143`
- `src/features/catalog/pages/Catalog.tsx:290, 449`
- `src/features/content/components/ScormPlayer.tsx:244, 280`
- `src/features/content/pages/ContentImportWizard.tsx:343, 504, 539, 876, 928, 932`
- `src/features/identity/components/EntraSetupSteps.tsx:169, 188, 207, 238, 250, 366, 381, 399, 421, 484, 508, 531, 548, 577, 621, 636`
- `src/features/lessons/pages/MyLessons.tsx:260`
- `src/features/management/pages/Management.tsx:57, 88`
- `src/features/organization/components/BulkImportWizard.tsx:193, 250, 271, 324, 336, 389`
- `src/features/organization/components/ExpiringGroupsTab.tsx:88, 108`
- `src/features/organization/components/LearningGroupsTab.tsx:339, 410, 485, 499, 524, 576, 671`
- `src/features/organization/components/OrganizationStructureTab.tsx:366, 443, 515, 529, 554, 785, 812`
- `src/features/organization/components/UsersTab.tsx:530, 545, 561, 586, 595, 605, 636, 664, 675, 686, 696, 713, 788, 825, 915`
- `src/features/profiles/components/AccountInformationTab.tsx:99`
- `src/features/profiles/components/NotificationsTab.tsx:195`
- `src/features/profiles/components/PersonalInformationTab.tsx:363`
- `src/features/profiles/components/SecurityTab.tsx:335`
- `src/features/profiles/pages/FieldBuilder.tsx:439, 456, 489, 571, 681, 844, 924, 999, 1057, 1095, 1104, 1126`
- `src/features/profiles/pages/FullProfile.tsx:94`
- `src/features/rbac/pages/RoleManagement.tsx:500, 536, 622, 655, 710, 754, 797, 856`
- `src/features/rbac/pages/Settings.tsx:35, 58, 100`
- `src/shared/components/ProfileFieldInput.tsx:195, 372`
- `src/shared/components/QuickProfile.tsx:175`
- `src/shared/components/layout/Footer.tsx:22`
- `src/shared/components/layout/LanguageSwitcher.tsx:61, 88`
- `src/shared/components/layout/Navbar.tsx:212, 275, 286, 298, 311, 343, 354`

---

### Group: Links

#### `link-primary` — Interactive Hyperlink Text
- **Group:** Links
- **Semantic Role:** Default color for standalone hyperlinks, inline anchor text, and interactive action labels.
- **Proposed Canonical Value:** `Blue-600 (#2563eb)`
- **Alpha / Transparency Applies:** No
- **Total Occurrences:** 167
- **Current Hardcoded Values Found:** `#2563eb` (text-blue-600) [118], `#3b82f6` (text-blue-500) [17], `#4f46e5` (text-indigo-600) [14], `#1e3a8a` (text-blue-900) [6], `#60a5fa` (text-blue-400) [4], `#1d4ed8` (text-blue-700) [3], `#4338ca` (text-indigo-700) [1], `#818cf8` (text-indigo-400) [1], `#9333ea` (text-purple-600) [1], `#6366f1` (text-indigo-500) [1], `#3730a3` (text-indigo-800) [1]
- **File & Line References:**
- `src/features/assignments/components/AssignmentInstanceReport.tsx:181, 202`
- `src/features/assignments/pages/AssignmentManagement.tsx:477, 481, 666, 742, 758, 787, 800, 817, 834, 836, 846, 848, 926`
- `src/features/assignments/pages/ContentManagement.tsx:627, 822, 842, 902, 943, 1037, 1068, 1087, 1142`
- `src/features/auth/pages/AcceptInvitation.tsx:108`
- `src/features/auth/pages/ConfirmEmail.tsx:47, 58`
- `src/features/auth/pages/ForgotPassword.tsx:91, 112`
- `src/features/auth/pages/Login.tsx:232, 272, 316, 382, 399`
- `src/features/auth/pages/ResetPassword.tsx:109`
- `src/features/auth/pages/SetupWizard.tsx:398, 496, 506, 551, 563, 598, 644, 719, 767, 786, 805, 824, 843, 882, 897, 898, 963, 991, 1085, 1118`
- `src/features/catalog/pages/Catalog.tsx:327`
- `src/features/content/components/ScormPlayer.tsx:225, 269, 372`
- `src/features/content/components/ScormPreviewPlayer.tsx:129, 201`
- `src/features/content/pages/ContentImportWizard.tsx:328, 423, 425, 455, 679, 697, 824, 825, 886`
- `src/features/identity/components/EntraSetupSteps.tsx:177, 196, 215, 252, 258, 287, 422, 538, 555, 570, 585, 590, 595, 600, 605`
- `src/features/lessons/pages/MyLessons.tsx:300`
- `src/features/management/pages/Management.tsx:111, 120, 135, 144`
- `src/features/organization/components/BulkImportWizard.tsx:218, 264`
- `src/features/organization/components/ExpiringGroupsTab.tsx:104`
- `src/features/organization/components/LearningGroupsTab.tsx:406, 435, 474, 542, 570, 582, 627, 697`
- `src/features/organization/components/OrganizationStructureTab.tsx:463, 504, 572, 621, 742, 752, 788`
- `src/features/organization/components/UsersTab.tsx:520, 574, 622, 645, 743, 801, 804, 901, 927, 941`
- `src/features/organization/pages/UserGroupManagement.tsx:34, 48, 61, 74`
- `src/features/profiles/components/AccountInformationTab.tsx:77, 162`
- `src/features/profiles/components/NotificationsTab.tsx:113, 115, 134, 143, 223`
- `src/features/profiles/components/PersonalInformationTab.tsx:202`
- `src/features/profiles/components/SecurityTab.tsx:135, 243, 307`
- `src/features/profiles/pages/FieldBuilder.tsx:552, 1008, 1019, 1044, 1110`
- `src/features/profiles/pages/FullProfile.tsx:93, 98, 150`
- `src/features/rbac/pages/RoleManagement.tsx:430, 469, 502, 545, 686, 689, 736`
- `src/features/rbac/pages/Settings.tsx:82, 91`
- `src/shared/components/ProfileFieldInput.tsx:273, 316`
- `src/shared/components/QuickProfile.tsx:99`
- `src/shared/components/layout/LanguageSwitcher.tsx:87, 94`
- `src/shared/components/layout/Navbar.tsx:106, 124, 143, 163, 275, 286, 298, 311, 354`
- `src/shared/components/layout/Shell.tsx:15`

#### `link-hover` — Interactive Hyperlink Hover Text
- **Group:** Links
- **Semantic Role:** Hover and active state color for hyperlinks and interactive text actions.
- **Proposed Canonical Value:** `Blue-700 (#1d4ed8)`
- **Alpha / Transparency Applies:** No
- **Total Occurrences:** 22
- **Current Hardcoded Values Found:** `#2563eb` (text-blue-600) [10], `#1e40af` (text-blue-800) [5], `#4f46e5` (text-indigo-600) [3], `#1d4ed8` (text-blue-700) [2], `#3b82f6` (text-blue-500) [2]
- **File & Line References:**
- `src/features/assignments/pages/AssignmentManagement.tsx:543, 625, 836, 848`
- `src/features/assignments/pages/ContentManagement.tsx:744, 842`
- `src/features/auth/pages/ForgotPassword.tsx:112`
- `src/features/auth/pages/Login.tsx:272`
- `src/features/auth/pages/SetupWizard.tsx:551, 882`
- `src/features/organization/components/OrganizationStructureTab.tsx:463`
- `src/features/organization/components/UsersTab.tsx:574`
- `src/features/profiles/pages/FieldBuilder.tsx:528, 638, 645, 774, 781`
- `src/shared/components/QuickProfile.tsx:175, 179, 182`
- `src/shared/components/layout/Navbar.tsx:186, 212`

---

### Group: Status/Feedback

#### `status-success-bg` — Success Status Background
- **Group:** Status/Feedback
- **Semantic Role:** Light background fill for success alert banners, completed badges, and valid field indications.
- **Proposed Canonical Value:** `Emerald-50 (#ecfdf5)`
- **Alpha / Transparency Applies:** No
- **Total Occurrences:** 57
- **Current Hardcoded Values Found:** `#ecfdf5` (bg-emerald-50) [31], `#f0fdf4` (bg-green-50) [10], `#d1fae5` (bg-emerald-100) [5], `#10b981` (bg-emerald-500) [3], `#059669` (bg-emerald-600) [2], `#047857` (bg-emerald-700) [2], `#f0fdfa` (bg-teal-50) [1], `#ecfdf5/5` (bg-emerald-50/5) [1], `#ecfdf5/20` (bg-emerald-50/20) [1], `#ecfdf5/50` (bg-emerald-50/50) [1]
- **File & Line References:**
- `src/features/assignments/components/AssignmentInstanceReport.tsx:133, 284, 342, 354`
- `src/features/assignments/pages/AssignmentManagement.tsx:377, 433, 528, 610, 840`
- `src/features/assignments/pages/ContentManagement.tsx:513, 675, 688, 725, 890, 916, 1107`
- `src/features/auth/pages/AcceptInvitation.tsx:124`
- `src/features/auth/pages/ConfirmEmail.tsx:65`
- `src/features/auth/pages/ForgotPassword.tsx:104`
- `src/features/auth/pages/ResetPassword.tsx:122`
- `src/features/auth/pages/SetupWizard.tsx:519, 742`
- `src/features/catalog/pages/Catalog.tsx:281`
- `src/features/content/pages/ContentImportWizard.tsx:355, 503, 508, 793, 865, 908`
- `src/features/identity/components/EntraSetupSteps.tsx:433, 464`
- `src/features/lessons/pages/MyLessons.tsx:251, 334, 387, 431`
- `src/features/management/pages/Management.tsx:159`
- `src/features/organization/components/BulkImportWizard.tsx:304, 342, 373`
- `src/features/organization/components/ExpiringGroupsTab.tsx:159`
- `src/features/organization/components/LearningGroupsTab.tsx:362`
- `src/features/organization/components/OrganizationStructureTab.tsx:389`
- `src/features/organization/components/UsersTab.tsx:424, 551`
- `src/features/profiles/components/AccountInformationTab.tsx:126`
- `src/features/profiles/components/NotificationsTab.tsx:173`
- `src/features/profiles/components/PersonalInformationTab.tsx:289`
- `src/features/profiles/components/SecurityTab.tsx:152`
- `src/features/profiles/pages/FieldBuilder.tsx:432`
- `src/features/rbac/pages/RoleManagement.tsx:452`

#### `status-success-text` — Success Status Text & Icon
- **Group:** Status/Feedback
- **Semantic Role:** High-contrast text, icon glyphs, and accent borders for success alerts and positive state badges.
- **Proposed Canonical Value:** `Emerald-700 (#047857)`
- **Alpha / Transparency Applies:** No
- **Total Occurrences:** 112
- **Current Hardcoded Values Found:** `#059669` (text-emerald-600) [27], `#d1fae5` (border-emerald-100) [26], `#047857` (text-emerald-700) [18], `#16a34a` (text-green-600) [9], `#15803d` (text-green-700) [8], `#dcfce7` (border-green-100) [7], `#065f46` (text-emerald-800) [6], `#a7f3d0` (border-emerald-200) [2], `#0f766e` (text-teal-700) [1], `#ccfbf1` (border-teal-100) [1], `#34d399` (text-emerald-400) [1], `#6ee7b7` (border-emerald-300) [1], `#064e3b` (text-emerald-900) [1], `#bbf7d0` (border-green-200) [1], `#052e16` (text-green-950) [1], `#10b981` (text-emerald-500) [1], `#bbf7d0/60` (border-green-200/60) [1]
- **File & Line References:**
- `src/features/assignments/components/AssignmentInstanceReport.tsx:133, 284, 324, 354`
- `src/features/assignments/pages/AssignmentManagement.tsx:377, 528, 610, 771, 840, 842`
- `src/features/assignments/pages/ContentManagement.tsx:513, 675, 688, 725, 890, 916, 1107`
- `src/features/auth/pages/AcceptInvitation.tsx:124, 125`
- `src/features/auth/pages/ConfirmEmail.tsx:65`
- `src/features/auth/pages/ForgotPassword.tsx:104, 106`
- `src/features/auth/pages/Login.tsx:476`
- `src/features/auth/pages/ResetPassword.tsx:122, 123`
- `src/features/auth/pages/SetupWizard.tsx:519, 520, 553, 742, 743, 888`
- `src/features/catalog/pages/Catalog.tsx:281, 356, 468`
- `src/features/content/pages/ContentImportWizard.tsx:503, 508, 793, 865, 908`
- `src/features/identity/components/EntraSetupSteps.tsx:433, 434, 436, 437, 464`
- `src/features/lessons/pages/MyLessons.tsx:251, 334, 403`
- `src/features/management/pages/Management.tsx:159, 168`
- `src/features/organization/components/BulkImportWizard.tsx:304, 305, 307, 310, 342, 373`
- `src/features/organization/components/ExpiringGroupsTab.tsx:109, 159`
- `src/features/organization/components/LearningGroupsTab.tsx:362`
- `src/features/organization/components/OrganizationStructureTab.tsx:389`
- `src/features/organization/components/UsersTab.tsx:424, 425, 551`
- `src/features/profiles/components/AccountInformationTab.tsx:126`
- `src/features/profiles/components/NotificationsTab.tsx:121, 173, 176`
- `src/features/profiles/components/PersonalInformationTab.tsx:268, 289, 292`
- `src/features/profiles/components/SecurityTab.tsx:152, 155`
- `src/features/profiles/pages/FieldBuilder.tsx:432, 433`
- `src/features/rbac/pages/RoleManagement.tsx:452, 453`

#### `status-warning-bg` — Warning Status Background
- **Group:** Status/Feedback
- **Semantic Role:** Light background fill for warning callouts, expiration notices, and caution banners.
- **Proposed Canonical Value:** `Amber-50 (#fffbeb)`
- **Alpha / Transparency Applies:** No
- **Total Occurrences:** 34
- **Current Hardcoded Values Found:** `#fffbeb` (bg-amber-50) [15], `#fef3c7` (bg-amber-100) [2], `#d97706` (bg-amber-600) [2], `#b45309` (bg-amber-700) [2], `#fffbeb/10` (bg-amber-50/10) [2], `#fffbeb/80` (bg-amber-50/80) [1], `#fffbeb/25` (bg-amber-50/25) [1], `#f59e0b/10` (bg-amber-500/10) [1], `#fffbeb/30` (bg-amber-50/30) [1], `#fef3c7/50` (bg-amber-100/50) [1], `#fffbeb/50` (bg-amber-50/50) [1], `#f59e0b` (bg-amber-500) [1], `#020617` (bg-slate-950) [1], `#1e293b` (bg-slate-800) [1], `#fffbeb/55` (bg-amber-50/55) [1], `#fef3c7/85` (bg-amber-100/85) [1]
- **File & Line References:**
- `src/features/assignments/components/AssignmentInstanceReport.tsx:136, 287`
- `src/features/assignments/pages/AssignmentManagement.tsx:505, 589`
- `src/features/assignments/pages/ContentManagement.tsx:644, 728, 1110`
- `src/features/auth/pages/SetupWizard.tsx:528`
- `src/features/content/components/ScormPlayer.tsx:329`
- `src/features/content/components/ScormPreviewPlayer.tsx:198`
- `src/features/content/pages/ContentImportWizard.tsx:405, 413`
- `src/features/organization/components/ExpiringGroupsTab.tsx:125`
- `src/features/organization/components/LearningGroupsTab.tsx:391`
- `src/features/organization/components/OrganizationStructureTab.tsx:423, 425, 429, 475, 666, 701`
- `src/features/organization/components/UsersTab.tsx:556`
- `src/features/profiles/components/AccountInformationTab.tsx:127`
- `src/features/profiles/pages/FieldBuilder.tsx:605, 743`
- `src/features/profiles/pages/FullProfile.tsx:163`
- `src/shared/components/PreviewBanner.tsx:20, 32`
- `src/shared/components/RequiredFieldReminder.tsx:80, 82, 88`

#### `status-warning-text` — Warning Status Text & Icon
- **Group:** Status/Feedback
- **Semantic Role:** High-contrast text, icon glyphs, and accent borders for warning badges and cautionary callouts.
- **Proposed Canonical Value:** `Amber-700 (#b45309)`
- **Alpha / Transparency Applies:** No
- **Total Occurrences:** 64
- **Current Hardcoded Values Found:** `#fef3c7` (border-amber-100) [16], `#b45309` (text-amber-700) [13], `#d97706` (text-amber-600) [8], `#92400e` (text-amber-800) [6], `#fde68a` (border-amber-200) [5], `#f59e0b` (text-amber-500) [4], `#78350f` (text-amber-900) [3], `#fbbf24/90` (text-amber-400/90) [1], `#f59e0b/30` (border-amber-500/30) [1], `#fcd34d` (text-amber-300) [1], `#451a03` (text-amber-950) [1], `#fde68a/60` (border-amber-200/60) [1], `#0f172a` (text-slate-900) [1], `#d97706` (border-amber-600) [1], `#020617` (text-slate-950) [1], `#ffffff` (text-white) [1]
- **File & Line References:**
- `src/features/assignments/components/AssignmentInstanceReport.tsx:136, 287`
- `src/features/assignments/pages/AssignmentManagement.tsx:505, 589`
- `src/features/assignments/pages/ContentManagement.tsx:644, 647, 728, 1110`
- `src/features/auth/pages/Login.tsx:454`
- `src/features/auth/pages/SetupWizard.tsx:528, 529, 530, 533`
- `src/features/content/components/ScormPlayer.tsx:298, 329, 330`
- `src/features/content/components/ScormPreviewPlayer.tsx:190, 198`
- `src/features/content/pages/ContentImportWizard.tsx:405, 406, 408, 409`
- `src/features/organization/components/ExpiringGroupsTab.tsx:125`
- `src/features/organization/components/LearningGroupsTab.tsx:391`
- `src/features/organization/components/OrganizationStructureTab.tsx:423, 425, 429, 475, 666, 668, 670`
- `src/features/organization/components/UsersTab.tsx:556`
- `src/features/profiles/components/AccountInformationTab.tsx:127`
- `src/features/profiles/components/NotificationsTab.tsx:117`
- `src/features/profiles/pages/FieldBuilder.tsx:605, 743`
- `src/features/profiles/pages/FullProfile.tsx:164`
- `src/shared/components/PreviewBanner.tsx:20, 24, 32`
- `src/shared/components/RequiredFieldReminder.tsx:80, 82, 88`

#### `status-error-bg` — Error Status Background
- **Group:** Status/Feedback
- **Semantic Role:** Light background fill for error banners, destructive action dialogs, and validation failure pills.
- **Proposed Canonical Value:** `Red-50 (#fef2f2)`
- **Alpha / Transparency Applies:** No
- **Total Occurrences:** 83
- **Current Hardcoded Values Found:** `#fff1f2` (bg-rose-50) [33], `#fef2f2` (bg-red-50) [26], `#fef2f2/50` (bg-red-50/50) [3], `#fee2e2` (bg-red-100) [3], `#fff1f2/50` (bg-rose-50/50) [3], `#ffe4e6` (bg-rose-100) [3], `#f43f5e` (bg-rose-500) [2], `#f43f5e/10` (bg-rose-500/10) [1], `#fff1f2/20` (bg-rose-50/20) [1], `#fff1f2/5` (bg-rose-50/5) [1], `#fef2f2/10` (bg-red-50/10) [1], `#fff1f2/10` (bg-rose-50/10) [1], `#e11d48` (bg-rose-600) [1], `#be123c` (bg-rose-700) [1], `#fee2e2/60` (bg-red-100/60) [1], `#dc2626` (bg-red-600) [1], `#b91c1c` (bg-red-700) [1]
- **File & Line References:**
- `src/features/assignments/components/AssignmentInstanceReport.tsx:206, 286, 316`
- `src/features/assignments/pages/AssignmentManagement.tsx:366, 557, 639`
- `src/features/assignments/pages/ContentManagement.tsx:502, 687, 915, 999`
- `src/features/auth/pages/AcceptInvitation.tsx:117`
- `src/features/auth/pages/ConfirmEmail.tsx:86`
- `src/features/auth/pages/ForgotPassword.tsx:97`
- `src/features/auth/pages/Login.tsx:241, 324, 404`
- `src/features/auth/pages/ResetPassword.tsx:115`
- `src/features/auth/pages/SetupWizard.tsx:414, 499, 512, 660, 735, 943, 1007, 1101`
- `src/features/catalog/pages/Catalog.tsx:270`
- `src/features/content/components/ScormPlayer.tsx:234`
- `src/features/content/components/ScormPreviewPlayer.tsx:139`
- `src/features/content/pages/ContentImportWizard.tsx:302, 836, 841`
- `src/features/identity/components/EntraSetupSteps.tsx:151, 443, 465`
- `src/features/lessons/pages/MyLessons.tsx:240, 324, 336, 387, 450`
- `src/features/organization/components/BulkImportWizard.tsx:204, 292, 336, 346`
- `src/features/organization/components/ExpiringGroupsTab.tsx:96, 131, 166`
- `src/features/organization/components/LearningGroupsTab.tsx:368, 414, 454, 478`
- `src/features/organization/components/OrganizationStructureTab.tsx:396, 484, 508, 763, 799, 819`
- `src/features/organization/components/UsersTab.tsx:430, 811, 863, 887`
- `src/features/profiles/components/AccountInformationTab.tsx:85`
- `src/features/profiles/components/NotificationsTab.tsx:160`
- `src/features/profiles/components/PersonalInformationTab.tsx:302`
- `src/features/profiles/components/SecurityTab.tsx:165, 260`
- `src/features/profiles/pages/FieldBuilder.tsx:422, 535, 594, 661, 732, 797`
- `src/features/rbac/pages/RoleManagement.tsx:445, 583`
- `src/shared/components/AppGate.tsx:408`
- `src/shared/components/QuickProfile.tsx:187`

#### `status-error-text` — Error Status Text & Icon
- **Group:** Status/Feedback
- **Semantic Role:** High-contrast text, icon glyphs, inline validation errors, and destructive button/badge text.
- **Proposed Canonical Value:** `Red-600 (#dc2626)`
- **Alpha / Transparency Applies:** No
- **Total Occurrences:** 175
- **Current Hardcoded Values Found:** `#e11d48` (text-rose-600) [33], `#ffe4e6` (border-rose-100) [29], `#dc2626` (text-red-600) [23], `#9f1239` (text-rose-800) [18], `#b91c1c` (text-red-700) [17], `#fee2e2` (border-red-100) [16], `#be123c` (text-rose-700) [12], `#fecaca` (border-red-200) [6], `#ef4444` (text-red-500) [5], `#f43f5e` (text-rose-500) [4], `#fecdd3` (border-rose-200) [2], `#881337` (text-rose-900) [2], `#ef4444` (border-red-500) [2], `#fb7185` (text-rose-400) [1], `#f43f5e/20` (border-rose-500/20) [1], `#450a0a` (text-red-950) [1], `#f43f5e` (border-rose-500) [1], `#7f1d1d` (text-red-900) [1], `#ef4444/90` (text-red-500/90) [1]
- **File & Line References:**
- `src/features/assignments/components/AssignmentInstanceReport.tsx:206, 286, 316`
- `src/features/assignments/pages/AssignmentManagement.tsx:366, 557, 639`
- `src/features/assignments/pages/ContentManagement.tsx:502, 687, 773, 915, 999`
- `src/features/auth/pages/AcceptInvitation.tsx:117, 118`
- `src/features/auth/pages/ConfirmEmail.tsx:86, 91`
- `src/features/auth/pages/ForgotPassword.tsx:97, 98`
- `src/features/auth/pages/Login.tsx:241, 242, 324, 325, 404, 405`
- `src/features/auth/pages/ResetPassword.tsx:115, 116`
- `src/features/auth/pages/SetupWizard.tsx:414, 415, 499, 512, 513, 660, 661, 735, 736, 943, 1007, 1008, 1053, 1101, 1102`
- `src/features/catalog/pages/Catalog.tsx:270`
- `src/features/content/components/ScormPlayer.tsx:233, 234`
- `src/features/content/components/ScormPreviewPlayer.tsx:139`
- `src/features/content/pages/ContentImportWizard.tsx:301, 302, 836, 841`
- `src/features/identity/components/EntraSetupSteps.tsx:151, 152, 270, 280, 443, 444, 446, 447, 465`
- `src/features/lessons/pages/MyLessons.tsx:240, 324, 336, 450, 455`
- `src/features/organization/components/BulkImportWizard.tsx:204, 205, 292, 293, 295, 298, 346, 351`
- `src/features/organization/components/ExpiringGroupsTab.tsx:96, 97, 131, 166`
- `src/features/organization/components/LearningGroupsTab.tsx:368, 414, 454, 478, 479, 518`
- `src/features/organization/components/OrganizationStructureTab.tsx:396, 484, 508, 509, 548, 721, 763, 773, 775`
- `src/features/organization/components/UsersTab.tsx:430, 431, 811, 814, 863`
- `src/features/profiles/components/AccountInformationTab.tsx:85, 86, 87, 88`
- `src/features/profiles/components/NotificationsTab.tsx:119, 160, 163`
- `src/features/profiles/components/PersonalInformationTab.tsx:302, 305`
- `src/features/profiles/components/SecurityTab.tsx:165, 168, 260, 263`
- `src/features/profiles/pages/FieldBuilder.tsx:422, 423, 426, 535, 594, 661, 732, 797`
- `src/features/rbac/pages/RoleManagement.tsx:445, 446, 584`
- `src/shared/components/AppGate.tsx:408`
- `src/shared/components/ProfileFieldInput.tsx:196, 346, 362`
- `src/shared/components/QuickProfile.tsx:187, 190`

#### `status-info-bg` — Info Status Background
- **Group:** Status/Feedback
- **Semantic Role:** Light background fill for informational tips, neutral status badges, and help callouts.
- **Proposed Canonical Value:** `Blue-50 (#eff6ff)`
- **Alpha / Transparency Applies:** No
- **Total Occurrences:** 97
- **Current Hardcoded Values Found:** `#eff6ff` (bg-blue-50) [41], `#eef2ff` (bg-indigo-50) [9], `#eff6ff/20` (bg-blue-50/20) [9], `#dbeafe` (bg-blue-100) [8], `#eff6ff/50` (bg-blue-50/50) [6], `#eff6ff/10` (bg-blue-50/10) [5], `#faf5ff` (bg-purple-50) [3], `#3b82f6` (bg-blue-500) [3], `#dbeafe/50` (bg-blue-100/50) [2], `#3b82f6/10` (bg-blue-500/10) [2], `#eef2ff/50` (bg-indigo-50/50) [2], `#eef2ff/40` (bg-indigo-50/40) [2], `#eff6ff/30` (bg-blue-50/30) [1], `#eef2ff/20` (bg-indigo-50/20) [1], `#dbeafe/60` (bg-blue-100/60) [1], `#eef2ff/30` (bg-indigo-50/30) [1], `#e0e7ff` (bg-indigo-100) [1]
- **File & Line References:**
- `src/features/assignments/components/AssignmentInstanceReport.tsx:139, 142, 145, 342, 356, 358`
- `src/features/assignments/pages/AssignmentManagement.tsx:467, 471, 477, 530, 543, 612, 625, 834, 846`
- `src/features/assignments/pages/ContentManagement.tsx:626, 820, 868, 902, 1034, 1141`
- `src/features/auth/pages/AcceptInvitation.tsx:111`
- `src/features/auth/pages/ConfirmEmail.tsx:47`
- `src/features/auth/pages/Login.tsx:235`
- `src/features/auth/pages/SetupWizard.tsx:401, 647, 896, 994, 1088`
- `src/features/catalog/pages/Catalog.tsx:351, 433`
- `src/features/content/components/ScormPlayer.tsx:269, 372`
- `src/features/content/components/ScormPreviewPlayer.tsx:201`
- `src/features/content/pages/ContentImportWizard.tsx:422, 501, 675, 679, 693, 697, 780`
- `src/features/identity/components/EntraSetupSteps.tsx:169, 188, 207, 286`
- `src/features/lessons/pages/MyLessons.tsx:337, 387`
- `src/features/management/pages/Management.tsx:89, 111, 135`
- `src/features/organization/components/BulkImportWizard.tsx:218, 249`
- `src/features/organization/components/ExpiringGroupsTab.tsx:181`
- `src/features/organization/components/LearningGroupsTab.tsx:406, 435, 570, 623, 697`
- `src/features/organization/components/OrganizationStructureTab.tsx:463, 617, 742`
- `src/features/organization/components/UsersTab.tsx:622, 801, 901`
- `src/features/profiles/components/AccountInformationTab.tsx:162`
- `src/features/profiles/components/NotificationsTab.tsx:143`
- `src/features/profiles/components/SecurityTab.tsx:135, 243, 305`
- `src/features/profiles/pages/FieldBuilder.tsx:441, 528, 577, 638, 645, 715, 774, 781, 926, 1082`
- `src/features/profiles/pages/FullProfile.tsx:93, 149`
- `src/features/rbac/pages/RoleManagement.tsx:538, 685, 736`
- `src/features/rbac/pages/Settings.tsx:59, 82`
- `src/shared/components/AppGate.tsx:423`
- `src/shared/components/QuickProfile.tsx:175`
- `src/shared/components/layout/LanguageSwitcher.tsx:87`
- `src/shared/components/layout/Navbar.tsx:275, 286, 298, 311, 354`
- `src/shared/components/layout/Shell.tsx:15`

#### `status-info-text` — Info Status Text & Icon
- **Group:** Status/Feedback
- **Semantic Role:** High-contrast text, icon glyphs, and border accents for informational alerts and badges.
- **Proposed Canonical Value:** `Blue-700 (#1d4ed8)`
- **Alpha / Transparency Applies:** No
- **Total Occurrences:** 75
- **Current Hardcoded Values Found:** `#1d4ed8` (text-blue-700) [23], `#dbeafe` (border-blue-100) [21], `#e0e7ff` (border-indigo-100) [6], `#4338ca` (text-indigo-700) [4], `#1e40af` (text-blue-800) [4], `#bfdbfe` (border-blue-200) [3], `#7e22ce` (text-purple-700) [2], `#f3e8ff` (border-purple-100) [2], `#bfdbfe/60` (border-blue-200/60) [2], `#c7d2fe` (border-indigo-200) [2], `#e0e7ff/30` (border-indigo-100/30) [2], `#93c5fd` (border-blue-300) [1], `#7c3aed` (text-violet-600) [1], `#0284c7` (text-sky-600) [1], `#e0e7ff/60` (border-indigo-100/60) [1]
- **File & Line References:**
- `src/features/assignments/components/AssignmentInstanceReport.tsx:139, 142, 145, 356, 358`
- `src/features/assignments/pages/AssignmentManagement.tsx:467, 469, 471, 474, 530, 612, 834, 846`
- `src/features/assignments/pages/ContentManagement.tsx:626, 820, 902, 1141`
- `src/features/auth/pages/AcceptInvitation.tsx:111`
- `src/features/auth/pages/Login.tsx:235`
- `src/features/auth/pages/SetupWizard.tsx:401, 647, 896, 994, 1088`
- `src/features/catalog/pages/Catalog.tsx:351, 433`
- `src/features/content/pages/ContentImportWizard.tsx:422, 426`
- `src/features/identity/components/EntraSetupSteps.tsx:264, 286, 293`
- `src/features/lessons/pages/MyLessons.tsx:337`
- `src/features/management/pages/Management.tsx:89`
- `src/features/organization/components/BulkImportWizard.tsx:216`
- `src/features/organization/components/ExpiringGroupsTab.tsx:181`
- `src/features/organization/components/LearningGroupsTab.tsx:435, 570, 623, 625, 697`
- `src/features/organization/components/OrganizationStructureTab.tsx:463, 617, 619`
- `src/features/organization/components/UsersTab.tsx:801`
- `src/features/profiles/components/NotificationsTab.tsx:123, 125`
- `src/features/profiles/components/PersonalInformationTab.tsx:254, 325`
- `src/features/profiles/components/SecurityTab.tsx:305, 319`
- `src/features/profiles/pages/FieldBuilder.tsx:441, 577, 715, 926, 1082`
- `src/features/rbac/pages/RoleManagement.tsx:685`
- `src/features/rbac/pages/Settings.tsx:59`

---

### Group: Backgrounds

#### `bg-app` — Application Page Canvas Background
- **Group:** Backgrounds
- **Semantic Role:** Root viewport canvas background behind all views, shells, layouts, and page containers.
- **Proposed Canonical Value:** `Slate-50 (#f8fafc)`
- **Alpha / Transparency Applies:** No
- **Total Occurrences:** 16
- **Current Hardcoded Values Found:** `#f8fafc` (bg-slate-50) [11], `#020617` (bg-slate-950) [4], `#f8fafc` (bg-[#F8FAFC]) [1]
- **File & Line References:**
- `src/features/assignments/pages/AssignmentManagement.tsx:942`
- `src/features/assignments/pages/ContentManagement.tsx:1206`
- `src/features/auth/pages/AcceptInvitation.tsx:84`
- `src/features/auth/pages/ConfirmEmail.tsx:44`
- `src/features/auth/pages/ForgotPassword.tsx:67`
- `src/features/auth/pages/Login.tsx:210`
- `src/features/auth/pages/ResetPassword.tsx:85`
- `src/features/auth/pages/SetupWizard.tsx:375`
- `src/features/content/components/ScormPlayer.tsx:319, 352`
- `src/features/content/components/ScormPreviewPlayer.tsx:128, 137, 170`
- `src/shared/components/AppGate.tsx:377, 402`
- `src/shared/components/layout/Shell.tsx:15`

#### `bg-subtle` — Subtle / Secondary Surface Background
- **Group:** Backgrounds
- **Semantic Role:** Subtle fill for table hover rows, inactive badge fills, progress bar tracks, and segmented controls.
- **Proposed Canonical Value:** `Slate-100 (#f1f5f9)`
- **Alpha / Transparency Applies:** No
- **Total Occurrences:** 83
- **Current Hardcoded Values Found:** `#f1f5f9` (bg-slate-100) [57], `#e2e8f0` (bg-slate-200) [11], `#e9eff5` (bg-slate-150) [6], `#f1f5f9/50` (bg-slate-100/50) [3], `#e2e8f0/70` (bg-slate-200/70) [1], `#e2e8f0/60` (bg-slate-200/60) [1], `#cbd5e1` (bg-slate-300) [1], `#e2e8f0/80` (bg-slate-200/80) [1], `#f1f5f9/30` (bg-slate-100/30) [1], `#f1f5f9/40` (bg-slate-100/40) [1]
- **File & Line References:**
- `src/features/assignments/components/AssignmentInstanceReport.tsx:119, 129, 190, 233, 278, 294, 298, 339`
- `src/features/assignments/pages/AssignmentManagement.tsx:388, 752, 781, 811, 860`
- `src/features/assignments/pages/ContentManagement.tsx:523, 610, 719, 727, 876, 974, 984, 992, 1077, 1109`
- `src/features/auth/pages/ConfirmEmail.tsx:100`
- `src/features/auth/pages/Login.tsx:394`
- `src/features/auth/pages/SetupWizard.tsx:722, 754, 966, 1112`
- `src/features/catalog/pages/Catalog.tsx:304, 380, 493`
- `src/features/content/pages/ContentImportWizard.tsx:356, 508, 788`
- `src/features/lessons/pages/MyLessons.tsx:274, 356, 384`
- `src/features/organization/components/BulkImportWizard.tsx:393, 404, 415`
- `src/features/organization/components/LearningGroupsTab.tsx:446`
- `src/features/organization/components/OrganizationStructureTab.tsx:441`
- `src/features/organization/components/UsersTab.tsx:508, 788, 829, 880, 953`
- `src/features/profiles/components/NotificationsTab.tsx:204, 232`
- `src/features/profiles/components/PersonalInformationTab.tsx:272`
- `src/features/profiles/components/SecurityTab.tsx:337`
- `src/features/profiles/pages/FieldBuilder.tsx:501, 513, 521, 599, 618, 626, 682, 686, 709, 737, 756, 763`
- `src/features/rbac/pages/RoleManagement.tsx:482, 549, 561, 572, 604, 670, 713`
- `src/shared/components/RequiredFieldReminder.tsx:112`
- `src/shared/components/layout/Footer.tsx:61`
- `src/shared/components/layout/LanguageSwitcher.tsx:61`
- `src/shared/components/layout/Navbar.tsx:186, 227, 248, 334`

#### `bg-overlay` — Modal Backdrop Overlay
- **Group:** Backgrounds
- **Semantic Role:** Translucent dark backdrop wash behind modal dialogs, drawer panels, and blocking overlays.
- **Proposed Canonical Value:** `Slate-900 @ 40% (rgba(15, 23, 42, 0.40))`
- **Alpha / Transparency Applies:** Yes
- **Total Occurrences:** 43
- **Current Hardcoded Values Found:** `#1e293b` (bg-slate-800) [12], `#0f172a/40` (bg-slate-900/40) [11], `#0f172a` (bg-slate-900) [10], `#020617` (bg-slate-950) [5], `#020617/40` (bg-slate-950/40) [2], `#0f172a/90` (bg-slate-900/90) [1], `#0f172a/60` (bg-slate-900/60) [1], `#0f172a/10` (bg-slate-900/10) [1]
- **File & Line References:**
- `src/features/assignments/components/AssignmentInstanceReport.tsx:168`
- `src/features/assignments/pages/AssignmentManagement.tsx:658`
- `src/features/assignments/pages/ContentManagement.tsx:561, 783, 1015, 1058, 1164, 1229`
- `src/features/auth/pages/SetupWizard.tsx:922, 1032`
- `src/features/catalog/pages/Catalog.tsx:390, 503`
- `src/features/content/components/ScormPreviewPlayer.tsx:172`
- `src/features/content/pages/ContentImportWizard.tsx:314, 326, 847, 916`
- `src/features/identity/components/EntraSetupSteps.tsx:492`
- `src/features/organization/components/BulkImportWizard.tsx:179`
- `src/features/organization/components/LearningGroupsTab.tsx:704`
- `src/features/organization/components/OrganizationStructureTab.tsx:713`
- `src/features/organization/components/UsersTab.tsx:617, 860, 898`
- `src/features/profiles/components/PersonalInformationTab.tsx:335`
- `src/features/profiles/pages/FieldBuilder.tsx:817, 862, 1075`
- `src/features/rbac/pages/RoleManagement.tsx:764, 817`
- `src/shared/components/RequiredFieldReminder.tsx:101`

---

## 4. Inconsistency Analysis & Proposed Canonical Values

The audit revealed substantial color fragmentation across the frontend. Below are the primary inconsistencies and the proposed standardizations.

### 4.1 Primary Blue & Action Color Fragmentation
- **Findings:** The codebase currently uses multiple competing shades of blue for what should be a unified primary action color:
  - `bg-blue-600` (`#2563eb`) is used in 68 button and primary action elements.
  - `bg-blue-500` (`#3b82f6`) is used interchangeably for primary actions in several dialogs and wizard steps.
  - `bg-indigo-600` (`#4f46e5`) is used in `BulkImportWizard.tsx` and `QuickProfile.tsx` as a secondary accent.
  - `bg-slate-700` / `bg-slate-800` is used for primary buttons in `ScormPlayer.tsx` and `ScormPreviewPlayer.tsx`.
  - Hover states randomly alternate between `hover:bg-blue-700`, `hover:bg-blue-500`, and `hover:bg-blue-800`.
- **Canonical Standardization:**
  - Standardize **Primary Button Background** (`btn-primary-bg`) to **`#2563eb`** (`blue-600`).
  - Standardize **Primary Button Hover** (`btn-primary-hover`) to **`#1d4ed8`** (`blue-700`).
  - Standardize **Primary Button Text** (`btn-primary-text`) to **`#ffffff`** (`white`).
  - Consolidate all miscellaneous `indigo-600` and `slate-700` primary buttons to the canonical `btn-primary-bg` token.

### 4.2 Heading & Dark Neutral Text Inconsistencies
- **Findings:**
  - Major page headers and card titles alternate between `text-slate-900` (`#0f172a`), `text-slate-800` (`#1e293b`), and `text-slate-950` (`#020617`).
  - In `Shell.tsx:15`, an arbitrary bracketed hex class `text-[#1E293B]` is hardcoded on the root shell.
  - Navbar logo title uses `text-blue-900` (`#1e3a8a`).
- **Canonical Standardization:**
  - Standardize **Heading Text** (`text-heading`) to **`#0f172a`** (`slate-900`). This ensures sharp contrast (exceeding WCAG AAA 7:1) across light backgrounds.
  - Remove `text-[#1E293B]` and replace with `text-heading`.

### 4.3 Body & Muted Text Hierarchy
- **Findings:**
  - Body copy is split between `text-slate-700` (`#334155`) (230 occurrences) and `text-slate-600` (`#475569`).
  - Secondary / muted text oscillates between `text-slate-500` (`#64748b`), `text-slate-400` (`#94a3b8`), and `text-slate-300` (`#cbd5e1`). Some table subheadings use `text-slate-400`, which fails WCAG AA minimum contrast ratio (3.0:1 vs. 4.5:1 required).
- **Canonical Standardization:**
  - Standardize **Body Text** (`text-body`) to **`#334155`** (`slate-700`).
  - Standardize **Muted Text** (`text-muted`) to **`#64748b`** (`slate-500`), guaranteeing a 4.6:1 contrast ratio against white surfaces.
  - Deprecate `text-slate-400` for readable text; reserve for decorative inactive glyphs.

### 4.4 Border Stroke Proliferation
- **Findings:**
  - The codebase contains 381 structural card borders and 55 input borders.
  - Card borders oscillate between `border-slate-100` (`#f1f5f9`), `border-slate-200` (`#e2e8f0`), `border-slate-300` (`#cbd5e1`), and arbitrary `border-[#E2E8F0]` (in `Navbar.tsx:77, 268, 320`).
  - Form controls also alternate between `border-slate-200` and `border-slate-300`.
- **Canonical Standardization:**
  - Standardize **Card & Structural Border** (`card-border`) to **`#e2e8f0`** (`slate-200`).
  - Standardize **Form Control Inactive Border** (`input-border`) to **`#e2e8f0`** (`slate-200`).
  - Standardize **Form Control Focus Border** (`input-border-focus`) to **`#2563eb`** (`blue-600`).
  - Remove bracketed hex classes `border-[#E2E8F0]` in `Navbar.tsx`.

### 4.5 Feedback & Status Palette Divergence
- **Findings:**
  - **Success States:** Divided between `emerald` (e.g. `bg-emerald-50 text-emerald-700`) and `green` (e.g. `bg-green-50 text-green-700`).
  - **Error States:** Divided between `red` (e.g. `bg-red-50 text-red-600`) and `rose` (e.g. `bg-rose-50 text-rose-600`).
  - **Warning States:** Mostly `amber` (`bg-amber-50 text-amber-700`), but with occasional `yellow` and `amber-500` banner overrides.
  - **Info States:** Divided between `blue-50/blue-700`, `indigo-50/indigo-700`, and isolated `purple-50/purple-700` badges.
- **Canonical Standardization:**
  - **Success:** Standardize on `status-success-bg` (`#ecfdf5` / `emerald-50`) and `status-success-text` (`#047857` / `emerald-700`).
  - **Warning:** Standardize on `status-warning-bg` (`#fffbeb` / `amber-50`) and `status-warning-text` (`#b45309` / `amber-700`).
  - **Error:** Standardize on `status-error-bg` (`#fef2f2` / `red-50`) and `status-error-text` (`#dc2626` / `red-600`).
  - **Info:** Standardize on `status-info-bg` (`#eff6ff` / `blue-50`) and `status-info-text` (`#1d4ed8` / `blue-700`).

### 4.6 Page Background & Overlay Washes
- **Findings:**
  - Viewport backgrounds alternate between `bg-slate-50` (`#f8fafc`) and hardcoded `bg-[#F8FAFC]` (`Shell.tsx:15`).
  - Modal backdrop overlays inconsistently use `bg-slate-900/40`, `bg-slate-900/50`, `bg-slate-950/40`, and `bg-black/50`.
- **Canonical Standardization:**
  - Standardize **Application Page Canvas Background** (`bg-app`) to **`#f8fafc`** (`slate-50`).
  - Standardize **Modal Backdrop Overlay** (`bg-overlay`) to **`rgba(15, 23, 42, 0.40)`** (`slate-900` at 40% alpha).

---

## 5. Font-Assignment Master Table

Audit of typography definitions across `index.html`, `src/index.css`, `docs/ui-guidelines.md`, and all 42 `.tsx` components confirms that SmartCookie currently utilizes a unified typographic hierarchy centered entirely on the **Inter** typeface family.

| Font Group | Font Family | Inheritance Status | Current Weight & Style Conventions | Notes & Architectural Observations |
|:---|:---|:---:|:---|:---|
| **1. General** | `Inter`, system-ui, sans-serif | Inherits Page Default | Regular (400), Medium (500) | Root font configured via Google Fonts in `index.html` and applied to `body` in `index.css`. All components inherit this by default. |
| **2. Navigation/Header** | `Inter`, system-ui, sans-serif | Inherits Page Default | Semibold (600), Bold (700) | Used in `Navbar.tsx`, mobile menu, and header tabs. Relies on letter-spacing (`tracking-tight`) for brand prominence. |
| **3. Headings** | `Inter`, system-ui, sans-serif | Inherits Page Default | Bold (700), Extrabold (800) | Used across `H1`–`H6`, modal dialog titles, and card headers. Frequently paired with `tracking-tight`. |
| **4. Buttons** | `Inter`, system-ui, sans-serif | Inherits Page Default | Semibold (600), Bold (700) | Action buttons use medium-to-bold weights with uppercase or title-case labels. Consistent letter-spacing throughout. |
| **5. Forms/Inputs** | `Inter`, system-ui, sans-serif | Inherits Page Default | Regular (400), Medium (500) | Text fields, select menus, and labels inherit Inter. Monospace (`font-mono`) is used exclusively for technical secrets, code snippets, and SMTP logs. |
| **6. Cards/Panels** | `Inter`, system-ui, sans-serif | Inherits Page Default | Regular (400), Medium (500) | Card body content, stat summaries, and panel descriptions strictly inherit the root Inter styling. |
| **7. Links** | `Inter`, system-ui, sans-serif | Inherits Page Default | Medium (500), Semibold (600) | Interactive text anchors and navigation breadcrumbs inherit Inter with standard underline or color shift on hover. |
| **8. Status/Feedback** | `Inter`, system-ui, sans-serif | Inherits Page Default | Semibold (600), Bold (700) | Status pills, badge indicators, and alert titles use bold Inter styling; some pills use tiny uppercase text (`text-[10px] font-bold`). |

> **Confirmation:** All 8 font-assignment groups currently inherit the page default font family (`Inter`). Zero components introduce distinct external font families (such as serif or display typefaces). Font variation is achieved strictly through weight, optical size, and letter-tracking scales.

---

## 6. Downstream Implementation Roadmap

This audit provides the foundational dataset required for subsequent Theme & Branding tasks:

1. **Task 2: CSS Custom Properties Definition**
   - Create the core CSS variables corresponding to the 28 tokens in `src/index.css` (e.g. `--color-btn-primary-bg: #2563eb;`, `--color-card-border: #e2e8f0;`).
   - Define standard light theme defaults and alpha channel adapters.

2. **Task 4: Tailwind CSS Theme Extension**
   - Map CSS variables to Tailwind utility classes in `tailwind.config.js` / `@theme` directives.
   - Expose semantic utilities: `bg-primary`, `bg-card`, `text-heading`, `text-body`, `border-border`, etc.

3. **Task 8: Component Token Migration Sweep**
   - Execute batch migration across the 42 `.tsx` files using the exact `file:line` catalog provided in Section 3.
   - Replace hardcoded Tailwind classes (`bg-blue-600`, `text-slate-900`) with semantic token classes.
   - Eradicate hardcoded hex overrides (`border-[#E2E8F0]`, `bg-[#F8FAFC]`).

4. **Task 11: Tenant Branding & Theme Customizer**
   - Expose the 28 semantic tokens to organization settings, allowing administrators to customize brand colors, navigation hues, and logo assets while maintaining WCAG AA contrast compliance.
