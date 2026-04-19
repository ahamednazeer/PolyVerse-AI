"""Helpers for explicit model downloads with progress callbacks."""
from __future__ import annotations

import hashlib
import os
import urllib.request
from pathlib import Path
from typing import Callable

from huggingface_hub import snapshot_download
from tqdm.auto import tqdm

ProgressCallback = Callable[[int, int], None]


def _default_cache_dir() -> str:
    default = os.path.join(os.path.expanduser("~"), ".cache")
    return os.getenv("XDG_CACHE_HOME", default)


def ensure_whisper_model_file(model_name: str, progress_callback: ProgressCallback | None = None) -> str:
    """Download Whisper checkpoint with byte-level progress if missing."""
    import whisper

    if model_name not in whisper._MODELS:
        return model_name

    cache_root = os.path.join(_default_cache_dir(), "whisper")
    os.makedirs(cache_root, exist_ok=True)

    url = whisper._MODELS[model_name]
    expected_sha256 = url.split("/")[-2]
    target_path = os.path.join(cache_root, os.path.basename(url))

    if os.path.isfile(target_path):
        with open(target_path, "rb") as existing_file:
            model_bytes = existing_file.read()
        if hashlib.sha256(model_bytes).hexdigest() == expected_sha256:
            if progress_callback:
                total = len(model_bytes)
                progress_callback(total, total)
            return target_path

    with urllib.request.urlopen(url) as source, open(target_path, "wb") as output:
        total = int(source.info().get("Content-Length", 0))
        downloaded = 0
        chunk_size = 8192

        while True:
            buffer = source.read(chunk_size)
            if not buffer:
                break
            output.write(buffer)
            downloaded += len(buffer)
            if progress_callback and total:
                progress_callback(downloaded, total)

    with open(target_path, "rb") as downloaded_file:
        model_bytes = downloaded_file.read()
    if hashlib.sha256(model_bytes).hexdigest() != expected_sha256:
        raise RuntimeError("Downloaded Whisper model checksum mismatch")

    if progress_callback:
        total = len(model_bytes)
        progress_callback(total, total)

    return target_path


class ProgressTqdm(tqdm):
    """tqdm subclass that forwards byte progress to a callback."""

    progress_callback: ProgressCallback | None = None

    def update(self, n=1):
        displayed = super().update(n)
        callback = getattr(self.__class__, "progress_callback", None)
        if callback and self.total:
            callback(int(self.n), int(self.total))
        return displayed


def ensure_hf_snapshot(model_id: str, progress_callback: ProgressCallback | None = None) -> str:
    """Download a Hugging Face repo snapshot with progress if needed."""
    ProgressTqdm.progress_callback = progress_callback
    try:
        local_path = snapshot_download(
            repo_id=model_id,
            resume_download=True,
            tqdm_class=ProgressTqdm,
        )
        if progress_callback:
            total = 100
            progress_callback(total, total)
        return local_path
    finally:
        ProgressTqdm.progress_callback = None
