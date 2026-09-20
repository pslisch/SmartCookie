# User & Learning Group Multi-Select Pickers — Verification Evidence

**Execution Timestamp:** 2026-09-20T09:31:16.000Z  
**Target Environment:** Local Dev Server (`http://localhost:3000`) & Production Build Container  
**Auditor:** AI Assistant  
**Target Scope:** `UserMultiSelect.tsx`, `GroupMultiSelect.tsx`, and localization entries in `common.json`  

---

## STEP 1: API Endpoint Verification (Real Company Context)

### 1A: User Retrieval Endpoint
- **Endpoint:** `GET /api/users`
- **Authenticated Session:** `admin` (`userId: "9363c660-5ae3-4494-83da-b50e21e05a68"`, `companyId: "730917be-9701-4af6-aef6-c78afb730d2b"`, `isSuperuser: true`)
- **HTTP Status:** `200 OK`
- **Total Users Returned:** 3

```json
[
  {
    "id": "3aa57f8d-5267-47f6-807b-952ee85e592c",
    "username": "test_assigned_learner2_1789290139522",
    "email": "learner2_1789290139522@example.com",
    "status": "ACTIVE"
  },
  {
    "id": "9363c660-5ae3-4494-83da-b50e21e05a68",
    "username": "admin",
    "email": null,
    "status": "ACTIVE"
  },
  {
    "id": "f605a0be-eaef-4250-aff9-fd5105c60f1b",
    "username": "test_assigned_learner1_1789290139375",
    "email": "learner1_1789290139375@example.com",
    "status": "ACTIVE"
  }
]
```

### 1B: Learning Group Retrieval Endpoint
- **Endpoint:** `GET /api/learning-groups`
- **Authenticated Session:** `admin` (`userId: "9363c660-5ae3-4494-83da-b50e21e05a68"`, `companyId: "730917be-9701-4af6-aef6-c78afb730d2b"`, `isSuperuser: true`)
- **HTTP Status:** `200 OK`
- **Total Groups Returned:** 3

```json
[
  {
    "id": "6ee2ab64-da4d-4418-acc4-5bd086039579",
    "name": "New Hires Cohort 2026",
    "memberCount": 0
  },
  {
    "id": "d790f2af-d518-4989-b905-59660637375d",
    "name": "Engineering Core",
    "memberCount": 2
  },
  {
    "id": "da856719-0d10-4289-884d-aa3c0bb98547",
    "name": "Sales & Account Executives",
    "memberCount": 1
  }
]
```

---

## STEP 2: UserMultiSelect Component Functional Verification

### 2A: Initial Render (Company Admin Session)
- **Component ID:** `user-picker`
- **Initial Selected Count:** 0 (`selectedUserIds: []`)
- **Rendered Available Header:** `"3 available"`
- **Rendered Rows (Count = 3):**
  1. `test_assigned_learner2_1789290139522 (learner2_1789290139522@example.com)` (ID: `3aa57f8d-5267-47f6-807b-952ee85e592c`)
  2. `admin` (ID: `9363c660-5ae3-4494-83da-b50e21e05a68`)
  3. `test_assigned_learner1_1789290139375 (learner1_1789290139375@example.com)` (ID: `f605a0be-eaef-4250-aff9-fd5105c60f1b`)

### 2B: Search Filtering
- **Query 1:** `"learner1"`
  - **Count Before Filter:** 3
  - **Count After Filter:** 1
  - **Matching Badge Text:** `"1 matching"`
  - **Rendered Item:** `test_assigned_learner1_1789290139375 (learner1_1789290139375@example.com)`
- **Query 2:** `"nonexistent_xyz"`
  - **Count After Filter:** 0
  - **Rendered Empty State Text:** `"No users match \"nonexistent_xyz\""`
- **Clear Query:**
  - **Action:** Clear search input
  - **Restored Available Rows Count:** 3

### 2C: Selection State & `onChange` Propagation
- **Action:** Click row for `test_assigned_learner1_1789290139375` (ID: `f605a0be-eaef-4250-aff9-fd5105c60f1b`)
  - **`onChange` Emitted Array:** `["f605a0be-eaef-4250-aff9-fd5105c60f1b"]`
  - **Selected Count Header:** `"1 user selected"`
  - **Rendered Chip Container Count:** 1
  - **Rendered Chip Label:** `"test_assigned_learner1_1789290139375"`
- **Action:** Click chip remove "X" button
  - **`onChange` Emitted Array:** `[]`
  - **Chip Container Present:** `false` (cleaned up)
- **Action:** Click `"Select all matching"`
  - **`onChange` Emitted Array:**
    ```json
    [
      "3aa57f8d-5267-47f6-807b-952ee85e592c",
      "9363c660-5ae3-4494-83da-b50e21e05a68",
      "f605a0be-eaef-4250-aff9-fd5105c60f1b"
    ]
    ```
- **Action:** Click `"Clear all"`
  - **`onChange` Emitted Array:** `[]`

---

## STEP 3: GroupMultiSelect Component Functional Verification

### 3A: Initial Render (Company Admin Session)
- **Component ID:** `group-picker`
- **Initial Selected Count:** 0 (`selectedGroupIds: []`)
- **Rendered Available Header:** `"3 available"`
- **Rendered Rows (Count = 3):**
  1. `New Hires Cohort 2026` — `0 members` (ID: `6ee2ab64-da4d-4418-acc4-5bd086039579`)
  2. `Engineering Core` — `2 members` (ID: `d790f2af-d518-4989-b905-59660637375d`)
  3. `Sales & Account Executives` — `1 member` (ID: `da856719-0d10-4289-884d-aa3c0bb98547`)

### 3B: Search Filtering
- **Query 1:** `"Sales"`
  - **Count Before Filter:** 3
  - **Count After Filter:** 1
  - **Matching Badge Text:** `"1 matching"`
  - **Rendered Item:** `Sales & Account Executives` (1 member)
- **Query 2:** `"nonexistent_xyz"`
  - **Count After Filter:** 0
  - **Rendered Empty State Text:** `"No learning groups match \"nonexistent_xyz\""`
- **Clear Query:**
  - **Action:** Clear search input
  - **Restored Available Groups Count:** 3

### 3C: Selection State & `onChange` Propagation
- **Action:** Click row for `Engineering Core` (ID: `d790f2af-d518-4989-b905-59660637375d`)
  - **`onChange` Emitted Array:** `["d790f2af-d518-4989-b905-59660637375d"]`
  - **Selected Count Header:** `"1 group selected"`
  - **Rendered Chip Container Count:** 1
  - **Rendered Chip Label:** `"Engineering Core"`
- **Action:** Click chip remove "X" button
  - **`onChange` Emitted Array:** `[]`
  - **Chip Container Present:** `false` (cleaned up)

---

## STEP 4: 403 Forbidden Permission Paths

### 4A: User Without `organization:view` Accessing `UserMultiSelect`
- **Session:** User `learner2` (`userId: "3aa57f8d-5267-47f6-807b-952ee85e592c"`, standard learner role without `organization:view`)
- **API Request:** `GET /api/users`
- **HTTP Response Status:** `403 Forbidden`
- **API Response Body:**
  ```json
  {
    "error": "Forbidden: Missing required permission \"organization:view\"."
  }
  ```
- **Component Rendered Output:**
  - **Element ID:** `#user-picker-forbidden-forbidden`
  - **Alert Role:** `role="alert"`
  - **Rendered Icon:** `Lock`
  - **Rendered Alert Text:**  
    `"Viewing and targeting specific users requires organization-view permission."`
  - **Search Input Element Present:** `false` (hidden)
  - **Results List Element Present:** `false` (hidden)

### 4B: User Without `organization:view` Accessing `GroupMultiSelect`
- **Session:** User `learner2` (`userId: "3aa57f8d-5267-47f6-807b-952ee85e592c"`, standard learner role without `organization:view`)
- **API Request:** `GET /api/learning-groups`
- **HTTP Response Status:** `403 Forbidden`
- **API Response Body:**
  ```json
  {
    "error": "Forbidden: Missing required permission \"organization:view\"."
  }
  ```
- **Component Rendered Output:**
  - **Element ID:** `#group-picker-forbidden-forbidden`
  - **Alert Role:** `role="alert"`
  - **Rendered Icon:** `Lock`
  - **Rendered Alert Text:**  
    `"Viewing and targeting learning groups requires organization-view permission."`
  - **Search Input Element Present:** `false` (hidden)
  - **Results List Element Present:** `false` (hidden)

---

## STEP 5: Build & Type-Safety Verification
- **Linter Check:** `npm run lint` (`tsc --noEmit`) -> `0 errors`
- **Vite Production Compilation:** `npm run build` -> `Succeeded in 6.74s` (clean bundle generated in `dist/`)
