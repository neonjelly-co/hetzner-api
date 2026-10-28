# Contributing

## Setup

```bash
bun install
bun run check
```

`bun run check` typechecks, tests, builds, validates the package metadata, and
installs the packed tarball in a temporary consumer project.

## Commit style

Use [Conventional Commits](https://www.conventionalcommits.org/). Release Please opens release PRs from `feat` / `fix` / etc.

## Publishing

Publishing is intentionally not automated yet. The release workflow only
maintains versions, tags, changelog entries, and GitHub releases.

Before the first publication:

1. Run `bun run check`.
2. Inspect `bun run pack:dry`.
3. Publish `0.1.0` manually with an account that owns `@neonjelly`.
