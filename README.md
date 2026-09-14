# safe-artificial-intelligence-lab
Safe Artificial Intelligence Lab at Purdue University Northwest

Static website (HTML, CSS, vanilla JavaScript) hosted on GitHub Pages. No build step or dependencies.

## Preview locally

```sh
python3 -m http.server 8000
```

Then open <http://localhost:8000/>. (Opening the HTML files directly with `file://` will not load the
projects, publications, and people data.)

## Updating content

Most content lives in JSON files; the pages render them automatically.

| File | What it controls |
| --- | --- |
| `data/people.json` | Director profile and future member groups (empty groups are hidden) |
| `data/projects.json` | Project cards (title, image, description, research directions, paper/code links) |
| `data/publications.json` | Publications (title, authors, venue, year, paper/code/project/dataset links) |

- Research direction ids: `development`, `safety`, `society`.
- Entries with `"sample": true` are placeholders and show a **Sample** badge. Delete them when adding real entries.
- Use `null` for links that don't exist; they are not shown.
- Put images in `assets/images/` (resize large photos first) and reference them with relative paths.

## Deploy

Settings → Pages → *Deploy from a branch* → `main` / `(root)`.
