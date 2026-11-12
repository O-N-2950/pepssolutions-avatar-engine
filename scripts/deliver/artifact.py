#!/usr/bin/env python3
"""Seal and verify a bounded, deterministic release archive using only stdlib.

The caller supplies an explicit, reviewed runtime staging directory. This tool
does not fetch Git, run qualification gates, upload, extract, or deploy anything.
Errors deliberately contain stable codes, never source content or Git stderr.
"""

from __future__ import annotations

import argparse
import gzip
import hashlib
import io
import json
import os
from pathlib import Path
import re
import stat
import subprocess
import sys
import tarfile
import zlib
from dataclasses import dataclass
from typing import BinaryIO, Iterable

CHUNK_BYTES = 1024 * 1024
MAX_FILE_BYTES = 64 * 1024 * 1024
MAX_TOTAL_BYTES = 256 * 1024 * 1024
MAX_ARCHIVE_BYTES = 512 * 1024 * 1024
MAX_FILES = 10_000
MAX_MANIFEST_BYTES = 4 * 1024 * 1024
MAX_PATH_BYTES = 255
MAX_TAR_PADDING = 10_240
RESERVED = frozenset({"RELEASE_SHA", "RELEASE.json", "MANIFEST.sha256"})
SHA_RE = re.compile(r"[0-9a-f]{40}\Z")
DIGEST_RE = re.compile(r"[0-9a-f]{64}\Z")
PRIVATE_KEY_RE = re.compile(
    rb"-----BEGIN (?:[A-Z0-9]+ )*PRIVATE KEY-----|PuTTY-User-Key-File-[0-9]+:"
)
TOKEN_RE = re.compile(
    rb"\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|"
    rb"(?:sk|rk)_live_[A-Za-z0-9]{16,}|AKIA[0-9A-Z]{16})\b"
)


class ArtifactError(Exception):
    """A fixed, non-sensitive diagnostic code."""

    def __init__(self, code: str):
        super().__init__(code)
        self.code = code


class SafeArgumentParser(argparse.ArgumentParser):
    def error(self, message: str) -> None:
        # argparse normally echoes unknown argument values, which may be secrets.
        raise ArtifactError("INVALID_ARGUMENTS")


@dataclass(frozen=True)
class GitIdentity:
    root: Path
    sha: str
    tree: str


def _fail(code: str) -> None:
    raise ArtifactError(code)


def _full_sha(value: str, code: str = "INVALID_SHA") -> str:
    if not isinstance(value, str) or SHA_RE.fullmatch(value) is None:
        _fail(code)
    return value


def _full_digest(value: str) -> str:
    if not isinstance(value, str) or DIGEST_RE.fullmatch(value) is None:
        _fail("INVALID_DIGEST")
    return value


def _absolute(path: str | Path) -> Path:
    return Path(os.path.abspath(os.fspath(path)))


def _is_inside(path: Path, directory: Path) -> bool:
    return path == directory or directory in path.parents


def _git(repo: Path, *args: str, error: str = "GIT_COMMAND_FAILED") -> str:
    environment = {k: v for k, v in os.environ.items() if not k.startswith("GIT_")}
    environment.update({"LC_ALL": "C", "GIT_OPTIONAL_LOCKS": "0", "GIT_NO_REPLACE_OBJECTS": "1"})
    completed = subprocess.run(
        ["git", "-c", "core.fsmonitor=false", "-C", str(repo), *args],
        env=environment,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL,
        check=False,
        timeout=60,
    )
    if completed.returncode != 0:
        _fail(error)
    try:
        return completed.stdout.decode("utf-8", errors="strict").rstrip("\n")
    except UnicodeError:
        _fail("GIT_OUTPUT_INVALID")


def inspect_git(repo: str | Path) -> GitIdentity:
    """Check local Git state; origin/dev must have been freshly fetched by caller."""
    candidate = _absolute(repo).resolve(strict=True)
    if not candidate.is_dir():
        _fail("REPOSITORY_NOT_DIRECTORY")
    root = Path(_git(candidate, "rev-parse", "--show-toplevel")).resolve(strict=True)
    branch = _git(root, "symbolic-ref", "--quiet", "--short", "HEAD", error="BRANCH_MUST_BE_DEV")
    if branch != "dev":
        _fail("BRANCH_MUST_BE_DEV")
    tracked = _git(root, "ls-files", "-v", "-z")
    if any(record and (record[0].islower() or record[0] == "S") for record in tracked.split("\0")):
        # assume-unchanged and skip-worktree can hide a changed source file from
        # status. A release checkout must expose every tracked runtime file.
        _fail("HIDDEN_INDEX_STATE")
    dirty = _git(root, "status", "--porcelain=v1", "--untracked-files=all", "--ignore-submodules=none")
    if dirty:
        _fail("GIT_TREE_DIRTY")
    sha = _full_sha(_git(root, "rev-parse", "--verify", "HEAD^{commit}"))
    tree = _full_sha(_git(root, "rev-parse", "--verify", "HEAD^{tree}"), "INVALID_TREE_SHA")
    remote_sha = _git(
        root,
        "rev-parse",
        "--verify",
        "refs/remotes/origin/dev^{commit}",
        error="ORIGIN_DEV_MISSING",
    )
    if remote_sha != sha:
        _fail("ORIGIN_DEV_MISMATCH")
    return GitIdentity(root, sha, tree)


def _safe_path(name: str) -> str:
    if (
        not isinstance(name, str)
        or not name
        or name.startswith("/")
        or "\\" in name
        or ":" in name
        or any(ord(character) < 32 or ord(character) == 127 for character in name)
    ):
        _fail("UNSAFE_PATH")
    try:
        length = len(name.encode("utf-8", errors="strict"))
    except UnicodeError:
        _fail("UNSAFE_PATH")
    if length > MAX_PATH_BYTES:
        _fail("PATH_TOO_LONG")
    components = name.split("/")
    if any(component in ("", ".", "..") for component in components):
        _fail("UNSAFE_PATH")
    for component in components:
        lower = component.lower()
        if (
            lower in {".git", ".npmrc", ".pypirc", ".netrc", ".ssh", ".aws", ".docker", ".envrc"}
            or lower == ".env"
            or lower.startswith(".env.")
            or lower.endswith(".env")
            or lower == "credentials"
            or lower.startswith("credentials.")
            or lower in {"id_rsa", "id_dsa", "id_ecdsa", "id_ed25519"}
            or lower.endswith((".pem", ".key", ".p12", ".pfx", ".keystore"))
        ):
            _fail("SENSITIVE_PATH")
    return name


def _fingerprint(info: os.stat_result) -> tuple[int, ...]:
    return (info.st_dev, info.st_ino, info.st_mode, info.st_size, info.st_mtime_ns, info.st_ctime_ns)


def _regular(info: os.stat_result) -> None:
    if stat.S_ISLNK(info.st_mode):
        _fail("SYMLINK_FORBIDDEN")
    if not stat.S_ISREG(info.st_mode):
        _fail("NON_REGULAR_FILE")
    if info.st_size > MAX_FILE_BYTES:
        _fail("FILE_TOO_LARGE")


def _collect_files(source: str | Path) -> tuple[Path, dict[str, tuple[Path, os.stat_result]]]:
    root = _absolute(source)
    if root.resolve(strict=True) != root or root.is_symlink():
        _fail("SYMLINK_FORBIDDEN")
    if not root.is_dir():
        _fail("SOURCE_NOT_DIRECTORY")
    files: dict[str, tuple[Path, os.stat_result]] = {}
    pending = [(root, "")]
    entries_seen = 0
    total_bytes = 0
    while pending:
        directory, prefix = pending.pop()
        with os.scandir(directory) as iterator:
            entries = sorted(iterator, key=lambda entry: entry.name)
        for entry in entries:
            entries_seen += 1
            if entries_seen > MAX_FILES * 4:
                _fail("TOO_MANY_ENTRIES")
            name = _safe_path(prefix + entry.name)
            if name in RESERVED:
                _fail("RESERVED_METADATA_NAME")
            info = entry.stat(follow_symlinks=False)
            if stat.S_ISLNK(info.st_mode):
                _fail("SYMLINK_FORBIDDEN")
            if stat.S_ISDIR(info.st_mode):
                pending.append((Path(entry.path), name + "/"))
                continue
            _regular(info)
            total_bytes += info.st_size
            if total_bytes > MAX_TOTAL_BYTES:
                _fail("PAYLOAD_TOO_LARGE")
            files[name] = (Path(entry.path), info)
            if len(files) + len(RESERVED) > MAX_FILES:
                _fail("TOO_MANY_FILES")
    if not files:
        _fail("EMPTY_SOURCE")
    return root, files


class _ContentScanner:
    def __init__(self) -> None:
        self.tail = b""

    def feed(self, chunk: bytes) -> None:
        sample = self.tail + chunk
        if PRIVATE_KEY_RE.search(sample) or TOKEN_RE.search(sample):
            _fail("SENSITIVE_CONTENT")
        self.tail = sample[-512:]


class _HashingReader:
    def __init__(self, stream: BinaryIO) -> None:
        self.stream = stream
        self.hasher = hashlib.sha256()
        self.scanner = _ContentScanner()
        self.count = 0

    def read(self, size: int = CHUNK_BYTES) -> bytes:
        data = self.stream.read(min(CHUNK_BYTES, size if size >= 0 else CHUNK_BYTES))
        self.scanner.feed(data)
        self.hasher.update(data)
        self.count += len(data)
        return data


def _open_regular(path: Path) -> BinaryIO:
    flags = os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0) | getattr(os, "O_NONBLOCK", 0)
    descriptor = os.open(path, flags)
    try:
        _regular(os.fstat(descriptor))
        return os.fdopen(descriptor, "rb")
    except BaseException:
        os.close(descriptor)
        raise


def _tar_info(name: str, size: int, executable: bool = False) -> tarfile.TarInfo:
    result = tarfile.TarInfo(name)
    result.size = size
    result.mode = 0o755 if executable else 0o644
    result.uid = result.gid = result.mtime = 0
    result.uname = result.gname = ""
    result.type = tarfile.REGTYPE
    return result


def _add_bytes(archive: tarfile.TarFile, name: str, value: bytes) -> str:
    archive.addfile(_tar_info(name, len(value)), io.BytesIO(value))
    return hashlib.sha256(value).hexdigest()


def _hash_file(path: Path, maximum: int) -> str:
    with _open_archive(path) as stream:
        return _hash_stream(stream, maximum)


def _open_archive(path: Path) -> BinaryIO:
    flags = os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0) | getattr(os, "O_NONBLOCK", 0)
    descriptor = os.open(path, flags)
    try:
        info = os.fstat(descriptor)
        if not stat.S_ISREG(info.st_mode):
            _fail("NON_REGULAR_FILE")
        if info.st_size > MAX_ARCHIVE_BYTES:
            _fail("ARCHIVE_TOO_LARGE")
        return os.fdopen(descriptor, "rb")
    except BaseException:
        os.close(descriptor)
        raise


def _hash_stream(stream: BinaryIO, maximum: int) -> str:
    total = 0
    hasher = hashlib.sha256()
    while data := stream.read(CHUNK_BYTES):
        total += len(data)
        if total > maximum:
            _fail("ARCHIVE_TOO_LARGE")
        hasher.update(data)
    return hasher.hexdigest()


def _metadata(identity: GitIdentity) -> bytes:
    return (
        json.dumps(
            {"schema_version": 1, "source_branch": "dev", "source_sha": identity.sha, "source_tree": identity.tree},
            sort_keys=True,
            indent=2,
        ) + "\n"
    ).encode("utf-8")


def _manifest(digests: dict[str, str]) -> bytes:
    return "".join(f"{digests[name]}  {name}\n" for name in sorted(digests)).encode("utf-8")


def seal(
    repo: str | Path,
    source: str | Path,
    output: str | Path,
    *,
    expected_identity: GitIdentity | None = None,
) -> dict[str, str | int]:
    identity = inspect_git(repo)
    if expected_identity is not None and identity != expected_identity:
        _fail("GIT_IDENTITY_CHANGED")
    source_root, files = _collect_files(source)
    requested_output = _absolute(output)
    output_path = requested_output.resolve(strict=False)
    if _is_inside(output_path, identity.root) or _is_inside(output_path, source_root):
        _fail("OUTPUT_MUST_BE_EXTERNAL")
    if os.path.lexists(requested_output) or os.path.lexists(output_path):
        _fail("OUTPUT_EXISTS")
    if not output_path.parent.is_dir():
        _fail("OUTPUT_DIRECTORY_MISSING")
    owned_inode: tuple[int, int] | None = None
    try:
        flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL | getattr(os, "O_NOFOLLOW", 0)
        descriptor = os.open(output_path, flags, 0o600)
        info = os.fstat(descriptor)
        owned_inode = (info.st_dev, info.st_ino)
        digests: dict[str, str] = {}
        with os.fdopen(descriptor, "wb") as raw:
            with gzip.GzipFile(filename="", fileobj=raw, mode="wb", compresslevel=9, mtime=0) as compressed:
                with tarfile.open(
                    fileobj=compressed,
                    mode="w|",
                    format=tarfile.USTAR_FORMAT,
                    encoding="utf-8",
                    errors="strict",
                    copybufsize=CHUNK_BYTES,
                ) as archive:
                    for name in sorted(files):
                        path, expected = files[name]
                        with _open_regular(path) as stream:
                            if _fingerprint(os.fstat(stream.fileno())) != _fingerprint(expected):
                                _fail("SOURCE_CHANGED")
                            reader = _HashingReader(stream)
                            archive.addfile(_tar_info(name, expected.st_size, bool(expected.st_mode & 0o111)), reader)
                            if reader.count != expected.st_size:
                                _fail("SOURCE_CHANGED")
                            if _fingerprint(os.fstat(stream.fileno())) != _fingerprint(expected):
                                _fail("SOURCE_CHANGED")
                            digests[name] = reader.hasher.hexdigest()
                    digests["RELEASE_SHA"] = _add_bytes(archive, "RELEASE_SHA", (identity.sha + "\n").encode("ascii"))
                    digests["RELEASE.json"] = _add_bytes(archive, "RELEASE.json", _metadata(identity))
                    manifest = _manifest(digests)
                    if len(manifest) > MAX_MANIFEST_BYTES:
                        _fail("MANIFEST_TOO_LARGE")
                    manifest_digest = _add_bytes(archive, "MANIFEST.sha256", manifest)
            raw.flush()
            os.fsync(raw.fileno())
        _, current_files = _collect_files(source_root)
        if set(current_files) != set(files) or any(
            _fingerprint(current_files[name][1]) != _fingerprint(files[name][1]) for name in files
        ):
            _fail("SOURCE_CHANGED")
        if inspect_git(identity.root) != identity:
            _fail("GIT_IDENTITY_CHANGED")
        archive_digest = _hash_file(output_path, MAX_ARCHIVE_BYTES)
        result = verify(output_path, identity.sha, archive_digest, manifest_digest)
        if inspect_git(identity.root) != identity:
            _fail("GIT_IDENTITY_CHANGED")
        return result
    except BaseException:
        if owned_inode is not None:
            try:
                current = output_path.lstat()
                if (current.st_dev, current.st_ino) == owned_inode:
                    output_path.unlink()
            except FileNotFoundError:
                pass
        raise


def _read_exact(stream: BinaryIO, size: int) -> bytes:
    # Called only for a header or a bounded chunk; never for a whole payload.
    data = bytearray()
    while len(data) < size:
        piece = stream.read(size - len(data))
        if not piece:
            _fail("TRUNCATED_ARCHIVE")
        data.extend(piece)
    return bytes(data)


def _octal(value: bytes) -> int:
    number = value.strip(b"\0 ")
    if not number:
        return 0
    if re.fullmatch(rb"[0-7]+", number) is None:
        _fail("INVALID_TAR_HEADER")
    return int(number, 8)


def _cstring(value: bytes) -> str:
    first, separator, remainder = value.partition(b"\0")
    if separator and any(remainder):
        _fail("INVALID_TAR_HEADER")
    try:
        return first.decode("utf-8", errors="strict")
    except UnicodeError:
        _fail("INVALID_TAR_HEADER")


def _parse_header(header: bytes) -> tuple[str, int]:
    if len(header) != 512 or header[257:263] != b"ustar\0" or header[263:265] != b"00":
        _fail("UNSUPPORTED_TAR_FORMAT")
    checksum = sum(header[:148]) + (8 * 32) + sum(header[156:])
    if _octal(header[148:156]) != checksum:
        _fail("INVALID_TAR_CHECKSUM")
    if header[156:157] != b"0" or any(header[157:257]):
        _fail("NON_REGULAR_ARCHIVE_MEMBER")
    if (
        _octal(header[100:108]) not in (0o644, 0o755)
        or _octal(header[108:116]) != 0
        or _octal(header[116:124]) != 0
        or _octal(header[136:148]) != 0
        or any(header[265:329])
        or _octal(header[329:337]) != 0
        or _octal(header[337:345]) != 0
        or any(header[500:512])
    ):
        _fail("NON_CANONICAL_TAR_METADATA")
    name = _cstring(header[:100])
    prefix = _cstring(header[345:500])
    if prefix:
        name = prefix + "/" + name
    return _safe_path(name), _octal(header[124:136])


def _unique_object(pairs: list[tuple[str, object]]) -> dict[str, object]:
    result: dict[str, object] = {}
    for key, value in pairs:
        if key in result:
            _fail("DUPLICATE_METADATA_KEY")
        result[key] = value
    return result


def verify(
    archive: str | Path,
    expected_sha: str,
    archive_sha256: str,
    manifest_sha256: str,
) -> dict[str, str | int]:
    expected_sha = _full_sha(expected_sha)
    archive_sha256 = _full_digest(archive_sha256)
    manifest_sha256 = _full_digest(manifest_sha256)
    path = _absolute(archive)
    if path.is_symlink() or path.resolve(strict=True) != path:
        _fail("SYMLINK_FORBIDDEN")
    # Hash and parse the same open regular file. Reopening by path after the
    # digest check would allow replacing the archive between the two reads.
    with _open_archive(path) as raw:
        before = _fingerprint(os.fstat(raw.fileno()))
        if _fingerprint(path.lstat()) != before:
            _fail("ARCHIVE_CHANGED")
        if _hash_stream(raw, MAX_ARCHIVE_BYTES) != archive_sha256:
            _fail("ARCHIVE_DIGEST_MISMATCH")
        if _fingerprint(os.fstat(raw.fileno())) != before:
            _fail("ARCHIVE_CHANGED")
        raw.seek(0)
        result = _verify_contents(raw, expected_sha, archive_sha256, manifest_sha256)
        if _fingerprint(os.fstat(raw.fileno())) != before or _fingerprint(path.lstat()) != before:
            _fail("ARCHIVE_CHANGED")
        return result


def _verify_contents(
    raw: BinaryIO,
    expected_sha: str,
    archive_sha256: str,
    manifest_sha256: str,
) -> dict[str, str | int]:
    digests: dict[str, str] = {}
    metadata: dict[str, bytes] = {}
    total_bytes = 0
    try:
        with gzip.GzipFile(fileobj=raw, mode="rb") as compressed:
            while True:
                header = _read_exact(compressed, 512)
                if header == bytes(512):
                    if _read_exact(compressed, 512) != bytes(512):
                        _fail("INVALID_TAR_END")
                    trailing = compressed.read(MAX_TAR_PADDING + 1)
                    if len(trailing) > MAX_TAR_PADDING or any(trailing):
                        _fail("UNEXPECTED_TRAILING_DATA")
                    if compressed.read(1):
                        _fail("UNEXPECTED_TRAILING_DATA")
                    break
                name, size = _parse_header(header)
                if name in digests:
                    _fail("DUPLICATE_ARCHIVE_MEMBER")
                if len(digests) + 1 > MAX_FILES:
                    _fail("TOO_MANY_FILES")
                if size > MAX_FILE_BYTES:
                    _fail("FILE_TOO_LARGE")
                if name == "MANIFEST.sha256" and size > MAX_MANIFEST_BYTES:
                    _fail("MANIFEST_TOO_LARGE")
                if name == "RELEASE.json" and size > 4096:
                    _fail("RELEASE_METADATA_TOO_LARGE")
                if name == "RELEASE_SHA" and size != 41:
                    _fail("RELEASE_SHA_MISMATCH")
                total_bytes += size
                if total_bytes > MAX_TOTAL_BYTES:
                    _fail("PAYLOAD_TOO_LARGE")
                hasher = hashlib.sha256()
                scanner = _ContentScanner()
                captured = bytearray()
                remaining = size
                while remaining:
                    piece = _read_exact(compressed, min(CHUNK_BYTES, remaining))
                    hasher.update(piece)
                    scanner.feed(piece)
                    if name in RESERVED:
                        captured.extend(piece)
                    remaining -= len(piece)
                padding = (-size) % 512
                if padding and any(_read_exact(compressed, padding)):
                    _fail("NONZERO_TAR_PADDING")
                digests[name] = hasher.hexdigest()
                if name in RESERVED:
                    metadata[name] = bytes(captured)
    except (gzip.BadGzipFile, EOFError, tarfile.TarError, UnicodeError, zlib.error):
        _fail("INVALID_ARCHIVE")
    if not RESERVED.issubset(metadata):
        _fail("REQUIRED_METADATA_MISSING")
    if digests.pop("MANIFEST.sha256") != manifest_sha256:
        _fail("MANIFEST_DIGEST_MISMATCH")
    try:
        manifest_text = metadata["MANIFEST.sha256"].decode("utf-8", errors="strict")
    except UnicodeError:
        _fail("INVALID_MANIFEST")
    declared: dict[str, str] = {}
    if not manifest_text.endswith("\n"):
        _fail("INVALID_MANIFEST")
    for line in manifest_text.splitlines():
        if len(line) < 67 or line[64:66] != "  " or DIGEST_RE.fullmatch(line[:64]) is None:
            _fail("INVALID_MANIFEST")
        name = _safe_path(line[66:])
        if name == "MANIFEST.sha256" or name in declared:
            _fail("INVALID_MANIFEST")
        declared[name] = line[:64]
    if set(declared) != set(digests):
        _fail("MANIFEST_FILES_MISMATCH")
    if any(declared[name] != digests[name] for name in digests):
        _fail("FILE_DIGEST_MISMATCH")
    if metadata["MANIFEST.sha256"] != _manifest(declared):
        _fail("NON_CANONICAL_MANIFEST")
    if metadata["RELEASE_SHA"] != (expected_sha + "\n").encode("ascii"):
        _fail("RELEASE_SHA_MISMATCH")
    try:
        release = json.loads(metadata["RELEASE.json"], object_pairs_hook=_unique_object)
    except (ValueError, UnicodeError, RecursionError):
        _fail("INVALID_RELEASE_METADATA")
    if (
        not isinstance(release, dict)
        or set(release) != {"schema_version", "source_branch", "source_sha", "source_tree"}
        or type(release.get("schema_version")) is not int
        or release.get("schema_version") != 1
        or release.get("source_branch") != "dev"
        or release.get("source_sha") != expected_sha
    ):
        _fail("RELEASE_METADATA_MISMATCH")
    tree = _full_sha(release.get("source_tree"), "INVALID_TREE_SHA")
    return {
        "sha": expected_sha,
        "tree": tree,
        "archive_sha256": archive_sha256,
        "manifest_sha256": manifest_sha256,
        "file_count": len(digests),
        "payload_file_count": len(digests) - 2,
    }


def copy_allowlist(repo: Path, staging: Path, relative_paths: Iterable[str]) -> None:
    """Copy only explicitly selected regular files/directories into private staging."""
    for relative in relative_paths:
        relative = _safe_path(relative)
        source = repo / relative
        if source.is_symlink() or source.resolve(strict=True) != source:
            _fail("SYMLINK_FORBIDDEN")
        if source.is_dir():
            _, items = _collect_files(source)
            selected = [(relative + "/" + name, item[0]) for name, item in items.items()]
        else:
            _regular(source.lstat())
            selected = [(relative, source)]
        for name, selected_source in selected:
            _safe_path(name)
            destination = staging / name
            destination.parent.mkdir(parents=True, exist_ok=True)
            with _open_regular(selected_source) as incoming, destination.open("xb") as outgoing:
                source_info = os.fstat(incoming.fileno())
                before = _fingerprint(source_info)
                scanner = _ContentScanner()
                while piece := incoming.read(CHUNK_BYTES):
                    scanner.feed(piece)
                    outgoing.write(piece)
                if _fingerprint(os.fstat(incoming.fileno())) != before or _fingerprint(selected_source.lstat()) != before:
                    _fail("SOURCE_CHANGED")
            destination.chmod(0o755 if source_info.st_mode & 0o111 else 0o644)


def guarded_main(operation) -> int:
    try:
        result = operation()
        if result is not None:
            print(json.dumps(result, sort_keys=True))
        return 0
    except ArtifactError as error:
        print("artifact: " + error.code, file=sys.stderr)
        return 2
    except (OSError, ValueError, subprocess.SubprocessError, tarfile.TarError, EOFError, zlib.error):
        print("artifact: IO_OR_FORMAT_ERROR", file=sys.stderr)
        return 2
    except KeyboardInterrupt:
        print("artifact: INTERRUPTED", file=sys.stderr)
        return 130
    except Exception:
        # Even an unexpected implementation failure must not echo file contents,
        # process output, user-supplied arguments, or a traceback to release logs.
        print("artifact: INTERNAL_ERROR", file=sys.stderr)
        return 2


def main(argv: list[str] | None = None) -> int:
    def operation():
        parser = SafeArgumentParser(description=__doc__)
        commands = parser.add_subparsers(dest="command", required=True, parser_class=SafeArgumentParser)
        prepare = commands.add_parser("seal", help="Seal an explicit runtime staging directory")
        prepare.add_argument("--repo", default=".")
        prepare.add_argument("--source", required=True)
        prepare.add_argument("--output", required=True)
        check = commands.add_parser("verify", help="Verify all bytes and members without extraction")
        check.add_argument("--archive", required=True)
        check.add_argument("--expected-sha", required=True)
        check.add_argument("--archive-sha256", required=True)
        check.add_argument("--manifest-sha256", required=True)
        args = parser.parse_args(argv)
        if args.command == "seal":
            return seal(args.repo, args.source, args.output)
        return verify(args.archive, args.expected_sha, args.archive_sha256, args.manifest_sha256)

    return guarded_main(operation)


if __name__ == "__main__":
    raise SystemExit(main())
