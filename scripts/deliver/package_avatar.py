#!/usr/bin/env python3
"""Build and seal Avatar's reviewed runtime files; no upload or deployment."""

import subprocess
import tempfile
from pathlib import Path

from artifact import ArtifactError, SafeArgumentParser, copy_allowlist, guarded_main, inspect_git, seal


def package():
    parser = SafeArgumentParser(description=__doc__)
    parser.add_argument("--repo", default=".")
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    identity = inspect_git(args.repo)
    # Arguments are passed directly, without a shell. Detailed install/build
    # qualification logs are captured separately by the release operator.
    for command in (
        ["npm", "ci", "--prefix", "packages/demo-app", "--ignore-scripts"],
        ["npm", "--prefix", "packages/demo-app", "run", "build"],
    ):
        result = subprocess.run(
            command,
            cwd=identity.root,
            stdin=subprocess.DEVNULL,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            check=False,
            timeout=600,
        )
        if result.returncode:
            raise ArtifactError("AVATAR_INSTALL_OR_BUILD_FAILED")
    if inspect_git(identity.root) != identity:
        raise ArtifactError("GIT_IDENTITY_CHANGED")
    with tempfile.TemporaryDirectory(prefix="neo-avatar-release-") as temporary:
        staging = Path(temporary)
        copy_allowlist(identity.root, staging, ["scripts/serve.mjs", "packages/demo-app/dist"])
        if not (staging / "packages/demo-app/dist/index.html").is_file():
            raise ArtifactError("AVATAR_ENTRYPOINT_MISSING")
        return seal(identity.root, staging, args.output, expected_identity=identity)


if __name__ == "__main__":
    raise SystemExit(guarded_main(package))
