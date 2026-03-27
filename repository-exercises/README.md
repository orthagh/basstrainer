# Repository Exercises

Place your Guitar Pro files here (for example `.gp`, `.gpx`, `.gp3`, `.gp4`, `.gp5`).

You can organize files in subfolders. The folder structure is used as the tree in the app Directory view.

Then run:

```bash
npm run exercises:convert
```

This command converts all supported files found in `repository-exercises/` into AlphaTex and writes:

- `src/data/repositoryExercises.generated.ts`
- `src/data/repositoryExercises.generated/`

Commit both your source files in `repository-exercises/` and the generated output for persistence.
