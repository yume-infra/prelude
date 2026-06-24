# Issue Tracker: GitHub

Issues and PRDs for this repo live in GitHub Issues for
`sayoriqwq/create-yume`. Use the `gh` CLI for issue tracker operations.

## Conventions

- **Create an issue**: `gh issue create --title "..." --body "..."`
- **Read an issue**: `gh issue view <number> --comments`
- **List issues**: `gh issue list --state open --json number,title,body,labels,comments`
- **Comment on an issue**: `gh issue comment <number> --body "..."`
- **Apply a label**: `gh issue edit <number> --add-label "..."`
- **Remove a label**: `gh issue edit <number> --remove-label "..."`
- **Close an issue**: `gh issue close <number> --comment "..."`

Run `gh` commands from this repository so the repo is inferred from
`git remote -v`.

## Skill Contract

When a skill says "publish to the issue tracker", create a GitHub issue.

When a skill says "fetch the relevant ticket", run:

```sh
gh issue view <number> --comments
```
