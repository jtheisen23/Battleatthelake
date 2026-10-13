# Battle at the Lake

A one-day 2 v 2 best ball match at Geneva National (Lake Geneva, WI), Player Course, Gold tees.

**G (3.8) & Tay Tay (21.2) vs Luke (0.1) & Bob (10.2)**

The site is a single static page (`index.html`). It has a live scoreboard, hole-by-hole score entry, a full scorecard, the rules and the course details.

## Add the player photos

Upload one photo per player into the `images/` folder, named exactly:

| Player  | File               |
|---------|--------------------|
| G       | `images/g.jpg`     |
| Tay Tay | `images/taytay.jpg`|
| Luke    | `images/luke.jpg`  |
| Bob     | `images/bob.jpg`   |

`.jpeg`, `.png` and `.webp` work too. On GitHub, open the `images` folder, choose **Add file → Upload files** and drag the photos in. Until a photo is there, the page shows the player's initials.

## Put it online (GitHub Pages)

1. Go to the repo's **Settings → Pages**.
2. Under **Build and deployment**, choose **Deploy from a branch**.
3. Pick the branch with these files and the `/ (root)` folder, then save.

After a minute or so the page is live at `https://jtheisen23.github.io/Battleatthelake/`.

## Scoring

Two-man best ball with strokes off the low man. Every point is based on net scores. Points on each hole:

- **Low man, 1 pt.** Each team's best net score; the lower one wins.
- **Team total, 1 pt.** Both partners' net scores added together; the lower total wins.
- **Birdie, 1 pt** for each net birdie by any player.
- **Eagle, 2 pts** for each net eagle or better.

These defaults can be changed under **Match settings** on the page:

- Birdies and eagles are net; you can switch them to natural (gross) only.
- A tied low man or team total awards no point; you can switch to splitting it ½–½.
- Handicap allowance is 100%.

Course handicaps are worked out from each index using the Gold tee rating and slope (71.3 / 133, par 72):

| Player  | Index | Course hcp | Strokes (off the low) |
|---------|-------|------------|-----------------------|
| G       | 3.8   | 4          | 5                     |
| Tay Tay | 21.2  | 24         | 25                    |
| Luke    | 0.1   | +1         | 0                     |
| Bob     | 10.2  | 11         | 12                    |

If the club gives you different course handicaps, enter them under **Match settings → Course handicap override**. Write a plus handicap as `+1`.

## Live scoring

The live version of the page is published on claude.ai, where scores sync across every phone that has it open. Its source is `artifact/battle-at-the-lake.html`, and it uses the same photos from `images/`.

The GitHub Pages copy (`index.html`) saves scores in the scorer's browser instead. Its **Share scores** button sends a link that carries every score entered so far.

## Editing the match

Players, indexes, teams and the course card are at the top of `assets/app.js`.
