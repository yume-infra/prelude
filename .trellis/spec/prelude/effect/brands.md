# Effect Brands

> Branded boundary values for CLI generation concepts.

---

## Contracts

- Use branded values when identical primitive shapes carry different meanings.
- Boundary constructors and decoders belong near `apps/cli/src/brand/` and schema boundaries.
- Preserve brands across internal boundaries once a value has been validated.
- Do not scatter unchecked casts through business logic.
- Current branded candidates include project names, target directories, template paths, command names, and package names.

## Use When

- Adding a path-like, name-like, package-like, or command-like concept.
- Accepting external values from CLI args, JSON specs, template registry declarations, or generated package manifests.
- Reviewing string casts in planner, template, command, or workspace package code.

## Refactor Signals

- Two strings can be accidentally swapped and still typecheck.
- A cast bypasses the same validation that the CLI boundary already owns.
- A validated value is downgraded to a primitive before crossing internal service boundaries.

