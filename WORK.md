The work focused on:

- UI/UX improvements
- Backend security
- Authentication and authorization
- Application validation
- Response storage and identification
- Duplicate-submission prevention
- Transaction-safe application limits
- Admin functionality
- Cache consistency
- Performance improvements
- React/Next.js runtime and hydration fixes
- Data integrity

---

## 1. Department Selection UI

Redesigned the department selection interface with a cleaner card-based layout.

### Improvements

- Rounded department cards
- Consistent borders and spacing
- Hover effects
- Clear selected state
- Clear already-submitted state
- Subtle shadows
- Better visual hierarchy
- Selection state is easier to understand

Already-submitted departments are visually muted with a grey background and reduced opacity.

---

## 2. Duplicate Toast Notification Fix

Fixed duplicate toast notifications caused by triggering a side effect such as `toast.error()` inside a React state updater.

### Improvement

State updater logic now remains focused on calculating state, while toast notifications are triggered outside the updater.

### Result

- No duplicate notifications in React Strict Mode
- Cleaner React state handling
- Better adherence to React best practices

---

## 3. Footer UI

Improved the footer styling.

### Added

- Top border
- White background
- Better spacing
- Consistent max-width layout
- Improved vertical separation from the main content

---

## 4. Authentication-Required UI

Redesigned the authentication-required section into a proper centered card.

### Improvements

- Centered layout
- Card presentation
- Better typography
- Improved spacing
- Consistent visual design

---

## 5. Recruitment Notice Popup

Redesigned the recruitment notice popup from a plain bordered element into a proper modal.

### Added

- Full-screen backdrop
- Dark translucent overlay
- Backdrop blur
- Centered modal
- Rounded corners
- Border and shadow
- Separate header/body/footer sections
- Improved typography
- Spaced message list
- Styled bullet points
- Styled `Got it` button
- Hover and active states
- Responsive width

The popup remains data-driven through `PopupData`.

---

## 6. Questionnaire Response Storage Redesign

One of the major backend improvements was changing questionnaire response storage.

### Previous format

Responses were effectively stored using question text as the object key:

```js
{
  "Question text": "Answer"
}
```

### New format

Responses are stored as structured objects:

```js
{
  id: "department-q1",
  question: "Question text",
  answer: "Answer"
}
```

Example:

```js
Questions: [
  {
    id: "department-q1",
    question: "Question 1",
    answer: "Answer 1",
  },
  {
    id: "department-q2",
    question: "Question 2",
    answer: "Answer 2",
  },
];
```

### Benefits

- Explicit response identification
- Question text is no longer the identifier
- Easier processing
- Easier export
- Better future migration support
- Less dependence on exact question wording
- Cleaner backend data model

The existing questionnaire definitions did not need to be rewritten completely; conversion is performed when creating the submission payload.

---

## 7. Backend Validation of Questionnaire Responses

The submission API now validates that `Questions` is an array.

Each response must contain:

```text
id
question
answer
```

and each value must be a string.

Invalid structures are rejected with HTTP `400`.

This prevents malformed questionnaire data from being stored through direct API requests.

---

## 8. Department Validation

The submission API now validates that:

- `Department` exists
- `Department` is a string

Malformed submissions are rejected server-side.

---

## 9. Registration Number Validation

Registration number validation was strengthened on the server.

The required pattern is:

```text
2 digits + 3 uppercase letters + 4 digits
```

Example:

```text
25BCE5612
```

This means validation cannot be bypassed simply by skipping the frontend.

---

## 10. Phone Number Validation

The backend now validates phone numbers as exactly 10 digits.

Missing or invalid phone numbers are rejected server-side.

---

## 11. Better Auth as the Source of User Identity

The submission API now gets the authenticated user from Better Auth.

Conceptually:

```js
const session = await auth.api.getSession(...);
const user = session.user;
const userEmail = user.email;
```

The stored application email therefore comes from the authenticated session.

The client no longer needs to send the email as part of the submission payload.

### Result

```text
Client form
    ↓
Authenticated session
    ↓
Backend
    ↓
Verified user identity
    ↓
Application record
```

This prevents unnecessary trust in client-controlled identity fields.

---

## 12. Authentication Requirement for Submission

The submission API rejects unauthenticated requests.

Unauthenticated requests receive:

```text
401 Authentication required
```

This prevents anonymous direct API submissions.

---

## 13. Server-Side Submission Deadline

The submission API performs the deadline check on the server.

This prevents users from bypassing a frontend-only deadline by directly calling the API.

For testing, the deadline was temporarily moved to a future date.

### Recommended future improvement

Move the deadline to an environment variable or centralized configuration instead of hard-coding it in the route.

---

## 14. Maximum Two Applications

The backend enforces the rule that a user can submit at most two unique applications.

It checks:

- Duplicate department submission
- Maximum application count

The frontend is therefore not the authority for enforcing this rule.

---

## 15. Race Condition Fix for Application Limits

The original application-limit logic followed a read-then-write pattern:

```text
Read applications
      ↓
Check count
      ↓
Create application
```

This could fail under concurrent requests.

For example:

```text
Request A → sees 1
Request B → sees 1
Request A → creates
Request B → creates
```

Both could pass the check.

### New solution

Application creation now uses a Firestore transaction.

A per-user document is maintained at:

```text
applicationLimits/{userId}
```

The transaction:

1. Reads the user's limit record.
2. Checks whether the department application already exists.
3. Checks the current application count.
4. Creates the application.
5. Increments the count.
6. Commits the operation atomically.

### Result

The two-application limit is enforced at the database transaction level.

---

## 16. Deterministic Application IDs

Application documents now use a deterministic document ID derived from:

```text
userId + Department
```

The combined value is encoded using Base64 URL-safe encoding.

### Benefit

The same user/department combination maps to the same application document, making duplicate submissions harder to create.

This is stronger than relying exclusively on Firestore's random IDs from `collection.add()`.

---

## 17. `applicationLimits` Collection

A new Firestore collection is used:

```text
applicationLimits
```

with documents:

```text
applicationLimits/{userId}
```

These records maintain the user's application count and support transaction-safe limit enforcement.

---

## 18. Legacy Direct Submission Path Removed

The old direct Firestore submission path in:

```text
lib/actions/form.action.js
```

was removed because it provided a second way to write applications.

### Previous architecture

```text
Form
 ├── secure API
 └── legacy direct database path
```

### New architecture

```text
Form
  ↓
/api/submit-form
  ↓
Authentication
  ↓
Validation
  ↓
Firestore transaction
```

This ensures that all normal application submissions use the same security and validation rules.

---

## 19. Admin Applicant API Security

The admin applicant API now verifies:

1. User authentication
2. User admin role

Unauthenticated users receive:

```text
401 Authentication required
```

Authenticated non-admin users receive:

```text
403 Admin access required
```

Applicant data is only returned after the server-side authorization check.

---

## 20. Admin Shortlist API Security

The shortlist update endpoint was secured with server-side authentication and admin-role validation.

Only authenticated administrators can update an applicant's shortlist status.

This prevents bypassing a frontend-only admin check by calling the endpoint directly.

---

## 21. Admin Page Server-Side Authorization

The admin page now checks authentication and role on the server before loading applicant data.

### Previous flow

```text
Request
  ↓
Fetch all applicants
  ↓
Client checks admin role
```

### New flow

```text
Request
  ↓
Server checks session
  ↓
Server checks admin role
  ↓
Fetch applicants
```

This prevents sensitive applicant data from being fetched before authorization.

---

## 22. Submission Cache Consistency

`SubmissionsProvider` previously returned immediately when `sessionStorage` contained cached department data.

That could leave stale application state in the browser.

### New behavior

The cache is still used for fast initial UI state, but the provider continues to request the current server state.

The flow is now:

```text
sessionStorage
      ↓
Fast initial state
      ↓
API request
      ↓
Current server state
      ↓
React state + refreshed cache
```

The application-status request also uses:

```js
cache: "no-store";
```

### Benefits

- Faster perceived loading
- More accurate state
- Reduced stale-cache problems
- Better consistency across refreshes and tabs

---

## 23. Department Lookup Normalization

The questionnaire lookup used during submission was changed to use the same department normalization logic used elsewhere in the form.

Instead of relying only on exact string equality:

```js
item.department === department;
```

the lookup now compares normalized values.

Conceptually:

```js
normalizeDeptName(item.department) === normalizeDeptName(department);
```

### Benefit

Small formatting differences in department names no longer cause the questionnaire lookup to fail and produce an empty response array.

---

## 24. Gender Data-Loss Bug Fixed

The form collected Gender but the submission payload did not previously include it.

This caused silent data loss.

### Fixed payload

```js
const basicDetails = {
  Name: values.Name,
  RegistrationNumber: values.RegistrationNumber,
  Phone: values.Phone,
  Gender: values.Gender,
  "Year of Study": values["Year of Study"],
};
```

Gender was also added to the validation schema as a required field.

### Result

The value entered by the applicant now reaches the backend and can be stored with the application.

---

## 25. Admin Questionnaire Viewer Compatibility

The admin response viewer originally expected question responses in pair format:

```js
[question, answer];
```

The new response format is:

```js
{
  (id, question, answer);
}
```

The viewer was updated to support both formats.

### Benefit

- New submissions display correctly.
- Older stored records remain compatible.
- Internal response IDs are available without breaking the UI.

---

## 26. CSV Export Improvement

The admin CSV export was updated for the new structured response format.

Instead of producing separate internal fields such as:

```text
id
question
answer
```

the export converts each response into a readable entry:

```text
Question 1: Answer 1
Question 2: Answer 2
```

Older response formats remain supported.

### Result

CSV exports are easier for administrators to read and do not unnecessarily expose response IDs as separate CSV values.

---

## 27. Artificial Performance Loops Removed

Unnecessary high-iteration loops were removed.

### Form

A `validateFormEntropy` computation performed approximately 200,000 iterations without providing meaningful validation or security.

It was removed.

### Admin

An `evaluatePermissionSignature` computation performed approximately 80,000 iterations without providing useful authorization.

It was removed.

### Benefits

- Lower CPU usage
- Less unnecessary work
- Better responsiveness
- Cleaner code
- Real validation replaces artificial computation

---

## 28. Sign-In Hydration Error Fixed

A hydration/HTML issue was identified in:

```text
app/auth/signin/page.jsx
```

The problem was invalid heading nesting caused by putting an `<h1>` inside a `CardTitle` component that already renders a heading element.

Conceptually:

```html
<h3>
  <h1>Recruitment 2026</h1>
</h3>
```

### Fix

The text was passed directly to `CardTitle` while applying the desired styling through its props.

### Result

- Valid heading structure
- Reduced hydration mismatch risk
- Cleaner semantic HTML

---

## 29. Maximum Update Depth Error Fixed

A React error was identified in:

```text
app/page.jsx
```

The problematic effect depended on a changing object:

```js
useEffect(() => {
  setLastActivityTimestamp(Date.now());
}, [cursorCoordinates]);
```

When the object reference changed on every render, the effect could trigger a state update repeatedly.

### Fix

The effect dependency was changed to track the actual coordinate values instead of the changing object reference.

### Result

- Prevents repeated effect execution
- Prevents maximum-update-depth errors
- Reduces unnecessary re-renders

---

## 30. Dynamic `data-metrics` Hydration Issue Identified

A separate hydration mismatch was identified in:

```text
app/page.jsx
```

The Next.js error showed different server and client values for:

```text
data-metrics
```

The values differed slightly because the metric was being calculated dynamically during rendering.

### Cause

Non-deterministic render-time values can cause:

```text
Server HTML ≠ Client HTML
```

### Correct approach

Changing values should be calculated after hydration through client-side state/effects when necessary, rather than producing different values during server and client rendering.

---

## 31. Better Auth Account Data Preserved

Better Auth `account` records were intentionally left untouched during application testing.

These records contain authentication information required for users to log in.

Application testing should use:

- A fresh test account, or
- Application-specific data reset

rather than deleting authentication records.

---

# Testing Checklist

Use a fresh test account to verify the application-limit changes.

### Application submission

- [ ] Submit Department 1 → succeeds
- [ ] Submit Department 1 again → rejected as duplicate
- [ ] Submit Department 2 → succeeds
- [ ] Submit Department 3 → rejected because the maximum is 2
- [ ] Verify `formData`
- [ ] Verify `applicationLimits/{userId}` shows `count: 2`

### Admin

- [ ] Admin can open the admin page
- [ ] Normal user cannot access admin data
- [ ] Applicant list loads
- [ ] Applicant responses display correctly
- [ ] New structured responses display correctly
- [ ] CSV export displays readable question/answer pairs
- [ ] Shortlisting still works

### UI

- [ ] Department selection states look correct
- [ ] Submitted departments appear disabled/muted
- [ ] Popup displays correctly
- [ ] Footer displays correctly
- [ ] Authentication-required state displays correctly

### React / Next.js

- [ ] Sign-in page has no hydration error
- [ ] Home page has no maximum-update-depth error
- [ ] Home page has no `data-metrics` hydration mismatch
- [ ] No duplicate toast notifications

---

# Interview Talking Points

## Backend security

> I moved authorization checks to the server so admin APIs cannot be protected only by frontend role checks.

## Response storage

> I changed questionnaire responses from question-text keys to structured objects with explicit IDs, separating response identification from presentation text.

## Concurrency

> The original application limit used a read-then-write pattern that was vulnerable to concurrent submissions. I replaced it with a Firestore transaction and a per-user application counter.

## Identity

> The backend now derives applicant identity from the authenticated Better Auth session instead of trusting client-provided email information.

## Validation

> Important validation was added to the backend so direct API requests cannot bypass frontend validation.

## Performance

> I removed artificial high-iteration computations that consumed CPU without providing meaningful validation or security.

## Data integrity

> I found that Gender was collected by the form but was missing from the submission payload, causing silent data loss. I fixed both the validation and payload.

## UI/UX

> I improved the department-selection states, recruitment popup, authentication state, footer, spacing, and visual hierarchy.

## Architecture

> I removed the legacy direct Firestore submission path so applications have one authenticated, validated, transaction-safe submission flow.

---

# Remaining Recommended Improvements

These were identified as useful future improvements but were not counted as completed changes:

1. Move the hard-coded submission deadline into an environment variable.
2. Consider permanent explicit question IDs in the questionnaire definitions.
3. Backfill `applicationLimits` for users with legacy applications if existing production data must be preserved.
4. Run a complete production build and resolve any remaining build/lint/type issues.
5. Lock down Firestore client rules if direct client-side Firestore access is not required.
6. Remove remaining unused imports and components.
7. Replace remaining index-based React keys where stable IDs are available.
8. Optimize any remaining expensive admin-table filtering.
9. Review all render-time uses of `Math.random()`, `Date.now()`, or other non-deterministic values that could cause hydration mismatches.

---

# Final Status

The completed work substantially improved the portal across four main areas:

### UI/UX

Cleaner department cards, popup, footer, authentication state, spacing, and visual feedback.

### Security

Server-side authentication, admin authorization, server-side validation, and authenticated user identity.

### Data integrity

Structured questionnaire responses, explicit response IDs, Gender persistence, duplicate prevention, and transaction-safe application limits.

### Performance and reliability

Removal of artificial computation, improved cache behavior, reduced unnecessary React effects, and fixes for hydration/runtime errors.

The most important architectural change is that application submission is now a **server-authoritative, authenticated, validated, transaction-safe operation** rather than relying on frontend behavior alone.
