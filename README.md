# Battle at the Lake

A one-day 2 v 2 best ball match at Geneva National (Lake Geneva, WI), Player Course, Gold tees.

**G (3.8) & Tay Tay (21.2) vs Luke (0.1) & Bob (10.2)**

The site is one page (`index.html`) with a live scoreboard, hole-by-hole score entry, a full scorecard, the rules and the course details. Anyone with the link can follow along live. Only the scorer, who unlocks scoring with a PIN, can enter scores.

## Setup

Live scores are stored in a free Firebase database. Until it's connected, the page still works but saves scores on one phone only.

### 1. Create the Firebase database (about 10 minutes, free, no credit card)

1. Go to [console.firebase.google.com](https://console.firebase.google.com), sign in with a Google account and create a project (any name; Google Analytics can be off).
2. Open **Build → Realtime Database → Create database**. Choose the United States location and start in **locked mode**.
3. On the database's **Rules** tab, replace everything with the contents of `firebase-rules.json`. Change both `CHANGE-ME` to the scorer PIN you want, then **Publish**. Use letters, numbers and dashes only, at least 8 characters (for example `birdie-lake-42`).
4. Open **Build → Authentication → Get started → Sign-in method**, turn on **Anonymous** and save.
5. Open **Project settings** (the gear) → **Your apps** → the web icon `</>`. Register an app (any nickname, no Hosting needed) and copy the `firebaseConfig` values.
6. Put those values in `firebase-config.js`, replacing `null`. Make sure `databaseURL` is included.

The config values are meant to be public. The database rules are what stop anyone without the PIN from writing.

### 2. Turn on GitHub Pages

1. Go to the repo's **Settings → Pages**.
2. Under **Build and deployment**, choose **Deploy from a branch**.
3. Pick the branch with these files and the `/ (root)` folder, then save.

After a minute or so the page is live at `https://jtheisen23.github.io/Battleatthelake/`.

### 3. Share it

- **Everyone following along:** send the plain link. No sign-in needed.
- **The scorer:** send `https://jtheisen23.github.io/Battleatthelake/#pin=YOUR-PIN`. Opening it once unlocks scoring on that phone, and the PIN is removed from the address bar. The scorer can also tap **Keeping score? Enter the scorer PIN** on the page.

The scorer's phone stays unlocked until they tap **Stop scoring on this phone**. If the signal drops on the course, the scorer can keep entering scores; they sync when the phone reconnects, as long as the page stays open.

## Player photos

Photos live in `images/` as `g.jpg`, `taytay.jpg`, `luke.jpg` and `bob.jpg`. If one is missing, the page shows the player's initials.

## Scoring

Two-man best ball with strokes off the low man. Low net wins each hole's points; birdies and eagles count on gross scores. Points on each hole:

- **Low man, 1 pt.** Each team's best net score; the lower one wins.
- **Team total, 1 pt.** Both partners' net scores added together; the lower total wins.
- **Birdie, 1 pt** for each gross birdie by any player (no strokes).
- **Eagle, 2 pts** for each gross eagle or better (no strokes).

The scorer can change these under **Match settings** on the page, and the change reaches everyone:

- Birdies and eagles are gross; they can switch to net.
- A tied low man or team total awards no point; it can switch to splitting it ½–½.
- Handicap allowance is 100%.

Course handicaps are worked out from each index using the Gold tee rating and slope (71.3 / 133, par 72):

| Player  | Index | Course hcp | Strokes (off the low) |
|---------|-------|------------|-----------------------|
| G       | 3.8   | 4          | 5                     |
| Tay Tay | 21.2  | 24         | 25                    |
| Luke    | 0.1   | +1         | 0                     |
| Bob     | 10.2  | 11         | 12                    |

If the club gives you different course handicaps, enter them under **Match settings → Course handicap override**. Write a plus handicap as `+1`.

## Other files

- `artifact/battle-at-the-lake.html` is the earlier claude.ai version of the page. It syncs through claude.ai instead of Firebase.
- Players, indexes, teams and the course card are at the top of the script in `index.html`.
