# Arji Tracker – MLA / MP Grievance Tracker

A simple web app for MLA and MP offices to register citizen petitions (arjis), route them to the right department, and track them until they are resolved. Built with **React (Vite)** and **Firebase** (Authentication, Firestore, Hosting).

This is the Phase 1 build of the *Grievance Redressal & Constituency Complaint Management Platform*: the **Elected Representative (MLA/MP) portal**.

## The flow

1. **Register.** Staff enter a walk-in, phone, or Praja Darbar petition. The department is **auto-suggested** from the complaint text, and a ticket number is generated (for example `MCH-00042`).
2. **Acknowledge.** Print the acknowledgment slip, or send it to the citizen on **WhatsApp** with one click.
3. **Work it.** Assign the complaint to a team member, note which officer it was forwarded to (Tahsildar, SI, MPDO …), and move it **Pending → Under Review → Resolved**. Every change is saved to an **append-only history** (audit trail).
4. **Escalate.** Open complaints older than the office's SLA (default 7 days) are flagged **Overdue** on the dashboard.
5. **Track.** Citizens open `/track` and enter their ticket number and mobile number to see the status and any note the office chose to share. No login is needed.

## Roles

| Role | Who | Can do |
|---|---|---|
| **Super Admin** | Platform owner | Create offices and invite each office's Admin. See all offices with their counts, and open any office. Change any role. |
| **Admin** | MLA / MP | Full control of their own office: invite managers and employees, change their roles, remove them, edit office settings (name, SLA days), and see all complaints. |
| **Manager** | PA / office manager | See every complaint in the office, assign complaints to team members, update status, invite employees. |
| **Employee** | Office staff | Register complaints. See and update **only** complaints they registered or that are assigned to them. Cannot re-assign. |

These rules are enforced on the server by `firestore.rules`, not only hidden in the UI.

**Data isolation:** each MLA/MP office's data lives under `offices/{CODE}`. Users of one office can never read another office's data. An MLA office and an MP office are fully separate.

**Citizen privacy:** the public tracking record (`tracking/{TICKET}_{PHONE}`) holds only the status, department, and dates. It never holds the name or complaint text, and it can only be fetched with the exact ticket number and phone number. It cannot be listed or searched. Only the last 4 digits of Aadhaar are stored.

## Setup (one time)

### 1. Create the Firebase project
1. Go to <https://console.firebase.google.com> and create a project.
2. **Build → Authentication → Get started → Email/Password → Enable.**
3. **Build → Firestore Database → Create database** (production mode, region `asia-south1` (Mumbai)).
4. **Project settings → General → Your apps → Web (`</>`)**. Register the app and copy the config values.

### 2. Configure and run locally
```bash
npm install
cp .env.example .env      # paste the Firebase config values into .env
npm run dev               # http://localhost:5173
```

### 3. Deploy the security rules and the app
```bash
npm install -g firebase-tools
firebase login
firebase use --add        # pick your project
npm run deploy            # builds, then deploys hosting + firestore rules
```

### 4. Create the first Super Admin
1. Open the app and **Create account** with your email. You will see "No invite yet".
2. Expand *"Setting up the platform for the first time?"* and copy your **UID**.
3. In the Firebase console, open **Firestore**. Create the collection `users`, add a document whose **Document ID** is your UID, and give it these fields (all strings):
   - `name`: your name
   - `email`: your email (lowercase)
   - `role`: `superadmin`
4. Reload the app. You now see **All offices**.

### 5. Onboard an MLA / MP office
1. As Super Admin, click **+ New office**. Enter the code (ticket prefix, e.g. `MCH`), the name, the constituency, and the **Admin's email**.
2. The MLA/MP opens the app, chooses **Create account** with that email, and joins as Admin.
3. The Admin opens **Office** and invites Managers and Employees by email. Each invited person creates an account with that email and joins with the invited role.

## Try the demo (no Firebase project needed)

```bash
npm run demo              # emulators + demo data + app on http://localhost:5173
```

Log in with any of these accounts (password `demo123`): `super@demo.com`, `admin@demo.com`, `manager@demo.com`, `employee@demo.com`. To try citizen tracking, open `/track` and enter ticket `MCH-00001` with mobile `9876543210`.

## Local development with emulators (no real Firebase project needed)

```bash
npm run emulators         # terminal 1: Auth + Firestore emulators
npm run dev:emulators     # terminal 2: app connected to the emulators
```

To make a Super Admin in the emulator, create the `users/{uid}` document the same way through the Emulator UI, or use the REST API.

## Tests

```bash
npm run test:rules        # runs firestore.rules against the emulator (needs Java)
```

These tests cover every role: who can invite whom, role changes, employee visibility, assignment, office isolation, the append-only history, and public tracking.

## Project structure

```
firestore.rules            security rules (roles, office isolation, public tracking)
tests/rules.test.js        security-rule tests
src/
  firebase.js              Firebase init (+ emulator switch)
  lib/api.js               all Firestore reads/writes
  lib/roles.js             role names and UI permissions
  lib/constants.js         departments (+ auto-suggest keywords), statuses, sources
  context/                 auth/profile/office + live complaints
  pages/
    Login, Setup           sign in / create account / join via invite
    Dashboard              counts, overdue, by-department
    Complaints             search, filter, CSV export
    NewComplaint           registration form
    ComplaintDetail        acknowledgment, update/assign, history
    Office                 team, invites, roles, settings
    SuperAdmin             all offices, create office
    Track                  public citizen status page
```

## Data model (Firestore)

| Path | Contents |
|---|---|
| `users/{uid}` | name, email, role, officeId |
| `invites/{email}` | officeId, role, invitedBy |
| `offices/{CODE}` | name, type (MLA/MP), constituency, slaDays |
| `offices/{CODE}/meta/counter` | next ticket number |
| `offices/{CODE}/complaints/{id}` | ticketNo, citizen details, department, status, priority, source, forwardedTo, assignedTo, createdBy … |
| `offices/{CODE}/complaints/{id}/history/{id}` | append-only audit trail |
| `tracking/{TICKET}_{PHONE}` | public status only |

## Notes and next steps

- Edit the department list and auto-suggest keywords in `src/lib/constants.js`.
- For stronger account security, turn on email verification and require `email_verified` in the rules.
- Not in Phase 1: the Government portal (CM Office, Collector, SP), automatic SLA escalation notifications (these need Cloud Functions on the Blaze plan), SMS, and scheme-beneficiary analytics.
