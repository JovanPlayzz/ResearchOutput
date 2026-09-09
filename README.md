# Homeroom — a student portal

A school portal for **admins, teachers, and students** in one place: sections and subjects, a weekly timetable, classwork with grading by quarter, announcements that can't get buried, a shared calendar, and personal to-do lists. Built for a research project on integrating the scattered tools a school usually uses (group chats, classroom apps, paper calendars) into a single portal.

The look is deliberately "school": manila folder tabs, ruled notebook paper, a red margin line, rubber-stamp labels, and a light/dark theme (paper by day, desk lamp at night).

## Run it

You need [Node.js](https://nodejs.org) 20 or newer.

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. The first start creates a local SQLite database in `data/` and fills it with a demo school so there's something to look at.

**Demo accounts** (password for all: `password123`)

| Role    | Email                 | Notes                                   |
| ------- | --------------------- | --------------------------------------- |
| Admin   | admin@lakeside.edu    |                                         |
| Teacher | reyes@lakeside.edu    | Science; teaches 12-CORE and 11-STEM A  |
| Teacher | cruz@lakeside.edu     | Mathematics; adviser of 12-CORE         |
| Student | maya@lakeside.edu     | 12-CORE                                 |
| Student | tomas@lakeside.edu    | Signed up but not filed in a section yet |

School code for new sign-ups: `LAKE26`.

To wipe everything and get the demo data back: stop the server, run `npm run db:reset`, start it again. If you change the schema, the app sets an old database aside automatically and starts fresh.

For a production build: `npm run build` then `npm start`.

## How the school is modelled

- A **section** (like `12-CORE`) is a homeroom group. Students belong to exactly one section and stay together; teachers rotate through sections. Each section can have an **adviser**.
- A **class** is one subject taught to one section by one teacher, e.g. "General Biology 2 · 12-CORE". Everyone in the section is automatically in the class. There are no class codes.
- Each class has **timetable slots** (day, start, end, room). The portal refuses a slot that clashes with the section's or the teacher's existing slots, so timetables stay consistent.
- Classwork belongs to a **quarter** (1–4). Grades roll up per quarter, per semester (Q1+Q2, Q3+Q4), and overall.
- Announcements and calendar events target the **whole school**, **one section**, or **one class**. Announcements can carry an image (a poster, a photo of a memo).
- The calendar legend doubles as a filter: click a kind to hide it from the month.
- Subjects belong to a **semester** (quarters 1–2 or 3–4), so 2nd-semester subjects, teachers, and timetables can differ. The quarter picker in the sidebar defaults to the school's current quarter and every page follows it.
- Announcement authors and admins see **Read by 24 of 30** and who has not read it yet.
- **Forgot password:** an admin resets the account from the People pages and hands over a one-time temporary password; the user must choose a new one at sign-in.
- **School-year rollover** (School settings): archives every subject with its grades, resets to Quarter 1, and has students pick their section again.
- The sidebar can be dragged wider or narrower and collapsed to an icon rail (the round button on its edge, or Ctrl+B). Nested pages show a breadcrumb trail back up the folders.

## Who does what

**Admin** owns the structure.

- Creates the school and gets the school code. Sets the current quarter.
- Creates **sections**, names advisers, files students into sections (or moves them), and can pick up section folders and drop them into any order.
- Sees teachers grouped by **department**, opens any teacher to see their subjects and weekly timetable, opens any section to see its students, subjects, and timetable.
- Posts school-wide or per-section announcements and events. Can edit any class's details and timetable.

**Teacher** owns the teaching.

- Creates a class for a section, sets its timetable slots and colour, shares materials.
- Posts classwork (assignments, quizzes, projects, activities, exams) with points, quarter, due date, and late policy.
- Grades submissions with a score and feedback; has a gradebook per class per quarter.
- Posts to their class streams and, if they're an adviser, to their homeroom section.
- Has a weekly schedule page and a private to-do list.

**Student** just learns.

- Signs up with the school code, then picks their section. That's the whole setup.
- Sees every subject their section takes, the weekly timetable, today's classes on the dashboard, and work due soon.
- Turns in work as text, a link, and/or a file; can unsubmit until it's graded.
- Sees grades and feedback per subject and per quarter, with semester and overall averages.
- Reads announcements from the school, their section, and their teachers; unread count in the sidebar.
- Has a private to-do list.

## How it's built

- **Next.js 16** (App Router) with React Server Components for reads and Server Actions for every mutation. No separate API layer.
- **SQLite** via **Drizzle ORM** and `better-sqlite3`. The schema is in `src/db/schema.ts`; migrations in `drizzle/` run automatically at startup.
- **Auth** is a plain session cookie: passwords are hashed with Node's built-in `scrypt`, sessions live in the `sessions` table. No third-party service.
- **Tailwind CSS 4** with a custom paper/ink palette defined as CSS variables in `src/app/globals.css`. Dark mode is a `data-theme` attribute stored in a cookie.
- Uploaded files go to `uploads/` (outside `public/`) and are served through an access-checked route at `/api/files/[id]`.
- **Phones** get the same pages, laid out for a thumb: the sidebar becomes a drawer behind the menu button, the timetable shows one day at a time (tap a day or swipe sideways), wide grade tables keep their first column pinned while you scroll, and folders on the People page are picked up with a short hold before dragging so the page can still scroll normally.

```
src/
  app/
    (auth)/         sign in, register, onboarding (create school / join with code / pick section)
    (portal)/       dashboard, announcements, calendar, schedule, classes, classwork,
                    gradebook, grades, to-do, settings, admin (settings, people, sections, teachers)
    api/files/      attachment downloads
  actions/          server actions, one file per area
  components/       ui/ (buttons, fields, paper, folders) · shell/ (sidebar) · portal/ (cards, forms, timetable, folder grid)
  db/               schema, connection, demo seed (builds a conflict-free timetable)
  lib/              auth, queries, schedule helpers, utils
```

## Share it from your PC (free)

The portal can run on your own computer and still have a fixed web address, using [Tailscale Funnel](https://tailscale.com/kb/1223/funnel). It costs nothing and needs no domain. The site is only up while your PC is on and the command below is running.

1. Install Tailscale and sign in with a free personal account: `winget install tailscale.tailscale`, then open Tailscale from the Start menu.
2. Name this PC so the address reads well: `tailscale set --hostname homeroom`
3. Run `npm run share`. It builds the site if needed, starts the server, opens the tunnel, and prints your address, for example `https://homeroom.tail1234.ts.net`.
4. The first time, Tailscale prints a link to switch Funnel on for your account. Click it, approve, and run `npm run share` again.
5. Keep the PC awake: Settings → System → Power → set "Sleep" to Never while plugged in.

Press Ctrl+C in that window to stop sharing.

## Handy scripts

| Command               | What it does                                   |
| --------------------- | ---------------------------------------------- |
| `npm run dev`         | Start the development server                   |
| `npm run build`       | Production build                               |
| `npm start`           | Serve the production build                     |
| `npm run share`       | Serve it and publish a fixed public address    |
| `npm run lint`        | ESLint                                         |
| `npm run db:reset`    | Delete the database (re-seeded on next start)  |
| `npm run db:studio`   | Browse the database in Drizzle Studio          |
| `npm run db:generate` | Generate a migration after editing the schema  |
