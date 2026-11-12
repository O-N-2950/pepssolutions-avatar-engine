"""Behavioral release-artifact tests; local Git remotes only, no network."""

import gzip
import hashlib
import io
import json
import os
from pathlib import Path
import subprocess
import sys
import tarfile
import tempfile
import unittest
from unittest.mock import patch

import artifact


class ArtifactTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="neo-artifact-test-")
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.repo = self.root / "repo"
        self.repo.mkdir()
        self.origin = self.root / "origin.git"
        self.run_git(self.root, "init", "--bare", str(self.origin))
        self.run_git(self.repo, "init", "-b", "dev")
        self.run_git(self.repo, "config", "user.email", "delivery-test@example.invalid")
        self.run_git(self.repo, "config", "user.name", "Delivery Test")
        self.run_git(self.repo, "config", "commit.gpgsign", "false")
        (self.repo / "application.txt").write_text("reviewed application source\n", encoding="utf-8")
        self.run_git(self.repo, "add", "application.txt")
        self.run_git(self.repo, "commit", "-m", "Initial local fixture")
        self.run_git(self.repo, "remote", "add", "origin", str(self.origin))
        self.run_git(self.repo, "push", "--set-upstream", "origin", "dev")
        self.sha = self.run_git(self.repo, "rev-parse", "HEAD").strip()
        self.source = self.root / "staging"
        self.source.mkdir()
        (self.source / "assets").mkdir()
        (self.source / "index.html").write_text("<!doctype html><title>Release</title>\n", encoding="utf-8")
        (self.source / "assets/app.js").write_text("document.title = 'Ready';\n", encoding="utf-8")
        self.archive = self.root / "release.tar.gz"

    def run_git(self, directory, *args):
        environment = {key: value for key, value in os.environ.items() if not key.startswith("GIT_")}
        environment.update({"GIT_CONFIG_NOSYSTEM": "1", "GIT_CONFIG_GLOBAL": os.devnull})
        result = subprocess.run(
            ["git", "-c", "core.hooksPath=/dev/null", "-C", str(directory), *args],
            env=environment,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=True,
            timeout=15,
        )
        return result.stdout.decode("utf-8")

    def prepare(self):
        return artifact.seal(self.repo, self.source, self.archive)

    def assert_rejected(self, code, operation):
        with self.assertRaises(artifact.ArtifactError) as caught:
            operation()
        self.assertEqual(code, caught.exception.code)

    def read_members(self, archive=None):
        with tarfile.open(archive or self.archive, "r:gz") as archive_file:
            return [(member, archive_file.extractfile(member).read()) for member in archive_file.getmembers()]

    def write_members(self, members, name="changed.tar.gz"):
        output = self.root / name
        with output.open("wb") as raw, gzip.GzipFile(filename="", fileobj=raw, mode="wb", mtime=0) as compressed:
            with tarfile.open(fileobj=compressed, mode="w|", format=tarfile.USTAR_FORMAT) as archive_file:
                for member, data in members:
                    member.size = len(data)
                    archive_file.addfile(member, io.BytesIO(data))
        return output

    def verify_changed(self, path, metadata, **overrides):
        values = {
            "expected_sha": self.sha,
            "archive_sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
            "manifest_sha256": metadata["manifest_sha256"],
        }
        values.update(overrides)
        return artifact.verify(path, **values)

    def test_round_trip_and_manifest_lists_every_payload_file(self):
        metadata = self.prepare()
        verified = artifact.verify(
            self.archive, self.sha, metadata["archive_sha256"], metadata["manifest_sha256"]
        )
        self.assertEqual(metadata, verified)
        self.assertEqual(metadata["file_count"], 4)
        self.assertEqual(metadata["payload_file_count"], 2)
        members = {member.name: data for member, data in self.read_members()}
        self.assertEqual(set(members), {"index.html", "assets/app.js", *artifact.RESERVED})
        self.assertEqual(members["RELEASE_SHA"], (self.sha + "\n").encode())
        release = json.loads(members["RELEASE.json"])
        self.assertEqual(release["source_tree"], self.run_git(self.repo, "rev-parse", "HEAD^{tree}").strip())
        for path, content in members.items():
            if path != "MANIFEST.sha256":
                line = hashlib.sha256(content).hexdigest() + "  " + path + "\n"
                self.assertIn(line.encode(), members["MANIFEST.sha256"])

    def test_seal_is_deterministic_across_output_names_and_mtimes(self):
        first = self.prepare()
        os.utime(self.source / "index.html", (100, 100))
        second_path = self.root / "second-release.tar.gz"
        second = artifact.seal(self.repo, self.source, second_path)
        self.assertEqual(first, second)
        self.assertEqual(self.archive.read_bytes(), second_path.read_bytes())
        self.assertEqual(self.archive.read_bytes()[4:8], bytes(4))

    def test_modified_tracked_file_blocks_seal(self):
        (self.repo / "application.txt").write_text("uncommitted\n")
        self.assert_rejected("GIT_TREE_DIRTY", self.prepare)
        self.assertFalse(self.archive.exists())

    def test_untracked_file_blocks_seal(self):
        (self.repo / "untracked.txt").write_text("unreviewed\n")
        self.assert_rejected("GIT_TREE_DIRTY", self.prepare)

    def test_assume_unchanged_and_skip_worktree_cannot_hide_modified_source(self):
        self.run_git(self.repo, "update-index", "--assume-unchanged", "application.txt")
        (self.repo / "application.txt").write_text("hidden source change\n")
        self.assert_rejected("HIDDEN_INDEX_STATE", self.prepare)
        self.run_git(self.repo, "update-index", "--no-assume-unchanged", "application.txt")
        self.run_git(self.repo, "update-index", "--skip-worktree", "application.txt")
        self.assert_rejected("HIDDEN_INDEX_STATE", self.prepare)

    def test_unpushed_head_blocks_seal(self):
        (self.repo / "application.txt").write_text("new commit\n")
        self.run_git(self.repo, "commit", "-am", "Not pushed")
        self.assert_rejected("ORIGIN_DEV_MISMATCH", self.prepare)

    def test_missing_origin_dev_blocks_seal(self):
        self.run_git(self.repo, "update-ref", "-d", "refs/remotes/origin/dev")
        self.assert_rejected("ORIGIN_DEV_MISSING", self.prepare)

    def test_prepared_staging_cannot_be_relabeled_after_clean_git_advance(self):
        prepared_identity = artifact.inspect_git(self.repo)
        (self.repo / "application.txt").write_text("new source after runtime staging\n")
        self.run_git(self.repo, "commit", "-am", "Advance after preparation")
        self.run_git(self.repo, "push", "origin", "dev")
        self.assert_rejected(
            "GIT_IDENTITY_CHANGED",
            lambda: artifact.seal(self.repo, self.source, self.archive, expected_identity=prepared_identity),
        )
        self.assertFalse(self.archive.exists())

    def test_wrong_branch_and_detached_head_block_seal(self):
        self.run_git(self.repo, "switch", "-c", "main")
        self.assert_rejected("BRANCH_MUST_BE_DEV", self.prepare)
        self.run_git(self.repo, "checkout", "--detach", self.sha)
        self.assert_rejected("BRANCH_MUST_BE_DEV", self.prepare)

    def test_output_must_not_be_in_repository_or_staging(self):
        for output in (self.repo / "release.tar.gz", self.source / "release.tar.gz"):
            with self.subTest(output=output.name):
                self.assert_rejected(
                    "OUTPUT_MUST_BE_EXTERNAL", lambda: artifact.seal(self.repo, self.source, output)
                )
                self.assertFalse(output.exists())

    def test_existing_output_is_never_overwritten(self):
        self.archive.write_bytes(b"previous release")
        self.assert_rejected("OUTPUT_EXISTS", self.prepare)
        self.assertEqual(self.archive.read_bytes(), b"previous release")

    def test_source_symlink_and_fifo_are_rejected_without_reading(self):
        link = self.source / "linked.txt"
        link.symlink_to(self.repo / "application.txt")
        self.assert_rejected("SYMLINK_FORBIDDEN", self.prepare)
        link.unlink()
        os.mkfifo(link)
        self.assert_rejected("NON_REGULAR_FILE", self.prepare)

    def test_sensitive_paths_and_private_key_content_are_rejected(self):
        for name in (".env", ".env.example", ".npmrc", "credentials.json", "private.key"):
            with self.subTest(name=name):
                target = self.source / name
                target.write_text("fixture\n")
                self.assert_rejected("SENSITIVE_PATH", self.prepare)
                target.unlink()
        (self.source / "innocent.txt").write_text("-----BEGIN PRIVATE KEY-----\nfixture only\n")
        self.assert_rejected("SENSITIVE_CONTENT", self.prepare)
        self.assertFalse(self.archive.exists(), "failed archives must be removed")

    def test_generated_metadata_cannot_be_supplied_by_staging(self):
        (self.source / "RELEASE_SHA").write_text(self.sha)
        self.assert_rejected("RESERVED_METADATA_NAME", self.prepare)

    def test_archive_digest_mismatch_is_rejected(self):
        metadata = self.prepare()
        self.assert_rejected(
            "ARCHIVE_DIGEST_MISMATCH",
            lambda: artifact.verify(self.archive, self.sha, "0" * 64, metadata["manifest_sha256"]),
        )

    def test_wrong_expected_sha_is_rejected(self):
        metadata = self.prepare()
        self.assert_rejected(
            "RELEASE_SHA_MISMATCH",
            lambda: self.verify_changed(self.archive, metadata, expected_sha="a" * 40),
        )

    def test_payload_tamper_is_detected_even_with_recomputed_archive_digest(self):
        metadata = self.prepare()
        members = self.read_members()
        members = [(member, b"tampered" if member.name == "index.html" else data) for member, data in members]
        changed = self.write_members(members)
        self.assert_rejected("FILE_DIGEST_MISMATCH", lambda: self.verify_changed(changed, metadata))

    def test_unmanifested_file_is_rejected(self):
        metadata = self.prepare()
        members = self.read_members()
        members.append((artifact._tar_info("unmanifested.txt", 4), b"data"))
        changed = self.write_members(members)
        self.assert_rejected("MANIFEST_FILES_MISMATCH", lambda: self.verify_changed(changed, metadata))

    def test_missing_manifest_entry_is_rejected_even_with_recomputed_manifest_digest(self):
        metadata = self.prepare()
        members = self.read_members()
        changed_manifest = None
        for index, (member, data) in enumerate(members):
            if member.name == "MANIFEST.sha256":
                changed_manifest = b"".join(line for line in data.splitlines(keepends=True) if not line.endswith(b"  index.html\n"))
                members[index] = (member, changed_manifest)
        self.assertIsNotNone(changed_manifest)
        changed = self.write_members(members)
        self.assert_rejected(
            "MANIFEST_FILES_MISMATCH",
            lambda: self.verify_changed(changed, metadata, manifest_sha256=hashlib.sha256(changed_manifest).hexdigest()),
        )

    def test_duplicate_member_is_rejected(self):
        metadata = self.prepare()
        members = self.read_members()
        members.append(members[0])
        changed = self.write_members(members)
        self.assert_rejected("DUPLICATE_ARCHIVE_MEMBER", lambda: self.verify_changed(changed, metadata))

    def test_archive_traversal_and_absolute_paths_are_rejected(self):
        metadata = self.prepare()
        for index, name in enumerate(("../outside.txt", "/absolute.txt", "a/../../outside.txt", "a\\outside.txt")):
            with self.subTest(name=name):
                members = self.read_members()
                members.insert(0, (artifact._tar_info(name, 4), b"data"))
                changed = self.write_members(members, f"unsafe-{index}.tar.gz")
                self.assert_rejected("UNSAFE_PATH", lambda: self.verify_changed(changed, metadata))
        self.assertFalse((self.root / "outside.txt").exists())

    def test_archive_links_are_rejected(self):
        metadata = self.prepare()
        for index, kind in enumerate((tarfile.SYMTYPE, tarfile.LNKTYPE)):
            with self.subTest(kind=kind):
                member = artifact._tar_info("link.txt", 0)
                member.type = kind
                member.linkname = "index.html"
                changed = self.write_members([(member, b""), *self.read_members()], f"link-{index}.tar.gz")
                self.assert_rejected("NON_REGULAR_ARCHIVE_MEMBER", lambda: self.verify_changed(changed, metadata))

    def test_nonzero_trailing_data_is_rejected(self):
        metadata = self.prepare()
        changed = self.root / "trailing.tar.gz"
        uncompressed = gzip.decompress(self.archive.read_bytes()) + b"unlisted content"
        changed.write_bytes(gzip.compress(uncompressed, mtime=0))
        self.assert_rejected("UNEXPECTED_TRAILING_DATA", lambda: self.verify_changed(changed, metadata))

    def test_archive_replacement_between_hash_and_parse_is_rejected(self):
        metadata = self.prepare()
        members = self.read_members()
        members[0][0].mode = 0o755
        replacement = self.write_members(members, "replacement.tar.gz")
        real_hash = artifact._hash_stream

        def replace_after_hash(stream, maximum):
            digest = real_hash(stream, maximum)
            os.replace(replacement, self.archive)
            return digest

        with patch.object(artifact, "_hash_stream", replace_after_hash):
            self.assert_rejected(
                "ARCHIVE_CHANGED",
                lambda: artifact.verify(self.archive, self.sha, metadata["archive_sha256"], metadata["manifest_sha256"]),
            )

    def test_in_place_archive_change_between_hash_and_parse_is_rejected(self):
        metadata = self.prepare()
        members = self.read_members()
        members[0][0].mode = 0o755
        replacement = self.write_members(members, "replacement.tar.gz").read_bytes()
        real_hash = artifact._hash_stream

        def change_after_hash(stream, maximum):
            digest = real_hash(stream, maximum)
            self.archive.write_bytes(replacement)
            return digest

        with patch.object(artifact, "_hash_stream", change_after_hash):
            self.assert_rejected(
                "ARCHIVE_CHANGED",
                lambda: artifact.verify(self.archive, self.sha, metadata["archive_sha256"], metadata["manifest_sha256"]),
            )

    def test_archive_fifo_is_rejected_without_blocking(self):
        os.mkfifo(self.archive)
        result = subprocess.run(
            [sys.executable, str(Path(artifact.__file__).resolve()), "verify", "--archive", str(self.archive),
             "--expected-sha", self.sha, "--archive-sha256", "0" * 64, "--manifest-sha256", "0" * 64],
            capture_output=True, text=True, check=False, timeout=5,
        )
        self.assertEqual(result.returncode, 2)
        self.assertEqual(result.stderr, "artifact: NON_REGULAR_FILE\n")

    def test_invalid_deflate_returns_a_fixed_error(self):
        # Valid gzip header, invalid DEFLATE block type (3), empty trailer.
        malformed = b"\x1f\x8b\x08\x00\x00\x00\x00\x00\x02\xff\x06" + bytes(8)
        self.archive.write_bytes(malformed)
        self.assert_rejected(
            "INVALID_ARCHIVE",
            lambda: artifact.verify(self.archive, self.sha, hashlib.sha256(malformed).hexdigest(), "0" * 64),
        )

    def test_oversized_member_is_rejected_before_reading_its_body(self):
        member = artifact._tar_info("huge.bin", artifact.MAX_FILE_BYTES + 1)
        uncompressed = member.tobuf(format=tarfile.USTAR_FORMAT) + bytes(1024)
        self.archive.write_bytes(gzip.compress(uncompressed, mtime=0))
        self.assert_rejected(
            "FILE_TOO_LARGE",
            lambda: artifact.verify(
                self.archive, self.sha, hashlib.sha256(self.archive.read_bytes()).hexdigest(), "0" * 64
            ),
        )

    def test_cli_round_trip_and_non_sensitive_error(self):
        script = Path(artifact.__file__).resolve()
        result = subprocess.run(
            [sys.executable, str(script), "seal", "--repo", str(self.repo), "--source", str(self.source), "--output", str(self.archive)],
            capture_output=True, text=True, check=False, timeout=30,
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        metadata = json.loads(result.stdout)
        checked = subprocess.run(
            [sys.executable, str(script), "verify", "--archive", str(self.archive), "--expected-sha", self.sha,
             "--archive-sha256", metadata["archive_sha256"], "--manifest-sha256", metadata["manifest_sha256"]],
            capture_output=True, text=True, check=False, timeout=30,
        )
        self.assertEqual(checked.returncode, 0, checked.stderr)
        self.assertEqual(json.loads(checked.stdout), metadata)
        failed = subprocess.run(
            [sys.executable, str(script), "--opaque-test-sentinel"],
            capture_output=True, text=True, check=False, timeout=30,
        )
        self.assertEqual(failed.returncode, 2)
        self.assertNotIn("opaque-test-sentinel", failed.stdout + failed.stderr)
        self.assertNotIn("Traceback", failed.stderr)


if __name__ == "__main__":
    unittest.main()
