# Firebase Security Specification

## 1. Data Invariants

1. **Task Ownership and Verification**:
   - A task must be created by a signed-in, email-verified user (`request.auth.token.email_verified == true`).
   - The task's `ownerId` and `ownerEmail` must strictly match the authenticated user's `uid` and `email`.
   - Once set, the `ownerId` and `ownerEmail` of a task are immutable.

2. **Temporal Integrity**:
   - A task's `createdAt` must match `request.time` on creation.
   - A task's `updatedAt` must match `request.time` on any update.

3. **Field Type and Size Safety**:
   - All properties must adhere to their schema types.
   - String fields must have strict size limits to prevent Denial of Wallet and buffer exhaustion (e.g., `title` must be <= 150 characters, `description` must be <= 1000 characters).
   - `status` must be one of `['todo', 'in_progress', 'done']`.
   - `priority` must be one of `['low', 'medium', 'high']`.

4. **Tiered Access Control**:
   - Only the task owner or assignee can edit task fields.
   - Non-owners who are assigned to a task (assignees) can ONLY modify the task's `status` and `updatedAt` fields. They cannot change the `title`, `description`, `priority`, or `dueDate`.
   - Deletion of a task is strictly restricted to the task's creator (`ownerId == request.auth.uid`).

5. **Subcollection Integrity (Comments)**:
   - Comments can only be posted by signed-in, email-verified users.
   - Comment author fields (`authorId`, `authorEmail`) must strictly match the authenticated user.
   - Comments are immutable once created (only creation and deletion are allowed).
   - Users can only delete their own comments.

---

## 2. The "Dirty Dozen" Payloads

Here are 12 malicious payloads designed to breach our security invariants. The Firestore rules must reject all of these.

### Payload 1: Identity Spoofing on Creation
*Attempting to create a task claiming to be another user.*
```json
{
  "title": "Hack Task",
  "status": "todo",
  "priority": "low",
  "ownerId": "some_other_user_id",
  "ownerEmail": "victim@example.com",
  "createdAt": "SERVER_TIMESTAMP",
  "updatedAt": "SERVER_TIMESTAMP"
}
```
*Expected: PERMISSION_DENIED*

### Payload 2: Privilege Escalation (Non-Owner trying to update immutable ownerId)
*Attempting to hijack a task by replacing the owner.*
```json
// Existing task: ownerId = "alice_uid"
// Incoming update:
{
  "title": "Hijacked Task",
  "ownerId": "attacker_uid"
}
```
*Expected: PERMISSION_DENIED*

### Payload 3: Unverified User attempting to write
*A user with an unverified email trying to create a task.*
```json
// request.auth.token.email_verified == false
{
  "title": "Spam Task",
  "ownerId": "attacker_uid",
  "createdAt": "SERVER_TIMESTAMP"
}
```
*Pass Criteria: Rejected because email_verified must be true.*

### Payload 4: Invalid Status Enum Value
*Attempting to set an invalid status.*
```json
{
  "title": "Valid Title",
  "status": "in_review", // Not a whitelisted enum
  "priority": "medium",
  "ownerId": "attacker_uid"
}
```
*Expected: PERMISSION_DENIED*

### Payload 5: Giant String Resource Poisoning
*Attempting to inject a huge title string to inflate DB storage/billing.*
```json
{
  "title": "A".repeat(10000), 
  "status": "todo",
  "priority": "low",
  "ownerId": "attacker_uid"
}
```
*Expected: PERMISSION_DENIED (Size check failure)*

### Payload 6: Spoofed Timestamp Injection
*Attempting to set a custom historical timestamp instead of request.time.*
```json
{
  "title": "Time Spoof",
  "status": "todo",
  "priority": "low",
  "ownerId": "attacker_uid",
  "createdAt": "2020-01-01T00:00:00Z" // Client-defined
}
```
*Expected: PERMISSION_DENIED*

### Payload 7: State Shortcutting by Non-Assignee
*User who is neither owner nor assignee attempting to move a task.*
```json
// Attempting update on a task where ownerId is alice and assigneeId is bob, as attacker Charlie
{
  "status": "done"
}
```
*Expected: PERMISSION_DENIED*

### Payload 8: State Shortcutting by Assignee (Overreaching updates)
*Assignee attempting to modify restricted fields like Title/Description.*
```json
// Task: ownerId = "alice", assigneeId = "bob" (attacker)
// Bob attempts update:
{
  "title": "Bob changed this",
  "status": "in_progress"
}
```
*Expected: PERMISSION_DENIED (Assignees can only change 'status' and 'updatedAt')*

### Payload 9: Anonymous Comment Posting
*Attempting to comment without being authenticated.*
```json
// request.auth == null
{
  "text": "Troll Comment",
  "authorId": "anon",
  "createdAt": "SERVER_TIMESTAMP"
}
```
*Expected: PERMISSION_DENIED*

### Payload 10: Deleting Another User's Task
*Attempting to delete a task created by Alice as Bob.*
```json
// DELETE request from bob on /tasks/alice_task_id
```
*Expected: PERMISSION_DENIED*

### Payload 11: Modifying Comments (Immutability Violation)
*Attempting to update an existing comment.*
```json
// Existing comment: authorId = "alice"
// Alice attempts update text:
{
  "text": "Edited text"
}
```
*Expected: PERMISSION_DENIED*

### Payload 12: Commenting as Another User (Identity Theft)
*Creating a comment claiming to be a high-privilege user.*
```json
{
  "text": "Official approval",
  "authorId": "admin_uid",
  "authorEmail": "admin@resolute-vial-tsx2c.com",
  "createdAt": "SERVER_TIMESTAMP"
}
```
*Expected: PERMISSION_DENIED*

---

## 3. The Test Runner Configuration

The security assertions above will be verified before launching the applet into production using standard unit test configurations.
