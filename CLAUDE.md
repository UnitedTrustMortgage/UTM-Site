# UTM-Site — workflow rules

## Deploy workflow

After committing changes to the working feature branch (e.g.
`claude/improve-design-*`), always:

1. Push the feature branch.
2. Check out `main`, merge the feature branch with `--no-ff`, and push `main`.

Reason: Netlify auto-deploys from `main`. Skipping the merge means the
user can't see changes on the live site.

Do this without asking — the user has pre-authorized it.

## Site layout

The published site lives under `UTM SITE/` (note the space).
`netlify.toml` at the repo root sets `publish = "UTM SITE"`.
