from __future__ import annotations

from typing import Any

from .schemas import CascadeXaiResultOut


def normalize_xai_document(xai: dict[str, Any] | None) -> dict[str, Any] | None:
    if not xai or not isinstance(xai, dict):
        return None

    normalized = dict(xai)
    cache = dict(normalized.get("cache") or {})

    method = normalized.get("xaiMethod")
    stages = normalized.get("stages")
    if method and stages and method not in cache:
        cache[method] = {"stages": stages}

    normalized["cache"] = cache
    normalized["availableViews"] = list(cache.keys())
    return normalized


def get_cached_xai_entry(
    xai: dict[str, Any] | None,
    method: str,
) -> dict[str, Any] | None:
    normalized = normalize_xai_document(xai)
    if not normalized:
        return None

    entry = normalized.get("cache", {}).get(method)
    if isinstance(entry, dict) and entry.get("stages"):
        return entry
    return None


def apply_active_xai_view(
    xai: dict[str, Any] | None,
    method: str,
) -> dict[str, Any] | None:
    normalized = normalize_xai_document(xai)
    entry = get_cached_xai_entry(normalized, method)
    if not entry or not normalized:
        return None

    return {
        **normalized,
        "xaiMethod": method,
        "stages": entry["stages"],
        "availableViews": list(normalized.get("cache", {}).keys()),
    }


def merge_xai_result(
    existing_xai: dict[str, Any] | None,
    result: CascadeXaiResultOut,
) -> dict[str, Any]:
    dumped = result.model_dump()
    normalized = normalize_xai_document(existing_xai) or {"cache": {}}
    cache = dict(normalized.get("cache") or {})
    method = dumped["xaiMethod"]
    cache[method] = {"stages": dumped["stages"]}

    return {
        "xaiMethod": method,
        "cascadePrediction": dumped.get("cascadePrediction")
        or normalized.get("cascadePrediction"),
        "stages": dumped["stages"],
        "cache": cache,
        "availableViews": list(cache.keys()),
    }


def cascade_result_from_stored(stored: dict[str, Any]) -> CascadeXaiResultOut:
    return CascadeXaiResultOut(
        xaiMethod=stored["xaiMethod"],
        cascadePrediction=stored["cascadePrediction"],
        stages=stored["stages"],
    )
