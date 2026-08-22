# Upgrading EngineeringSpec

CLI packages, generated guidance and the GitHub Action are independent identities. Upgrade them deliberately.

The repository-local CLI already identifies as `0.1.0-rc.16`. The exact `npx` example below becomes externally installable only after the separate RC16 publication ceremony.

1. Read the release notes and choose the exact CLI version and immutable Action SHA.
2. Run `doctor --strict` to identify drift.
3. Preview managed changes:

   ```sh
   npx --yes @engineeringspec/cli@0.1.0-rc.16 adopt . \
     --spec docs/engineering-specs/change.engineering-spec.md \
     --merge --upgrade --dry-run
   ```

4. Apply without `--dry-run`, inspect every changed file and submit the upgrade separately from lifecycle closure or implementation.
5. Run `doctor`, `status` and the strict base-pinned `check` again.

If `adopt --upgrade` skips a structured file, it could not prove the file was safely managed. Review and update that file manually; do not use `--force` merely to silence drift.
