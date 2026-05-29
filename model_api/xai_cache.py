from __future__ import annotations

from typing import Any

from .schemas import CascadeXaiResultOut


def _is_non_empty_path(value: Any) -> bool:
    return isinstance(value, str) and bool(value.strip())


def stage_has_renderable_overlay(stage: dict[str, Any]) -> bool:
    channel_maps = stage.get("channelMaps") or []
    if channel_maps:
        return any(
            _is_non_empty_path(channel.get("overlayPath"))
            for channel in channel_maps
        )
    return _is_non_empty_path(stage.get("overlayPath"))


def cache_entry_has_image_links(entry: dict[str, Any] | None) -> bool:
    stages = (entry or {}).get("stages") or []
    if not stages:
        return False
    return all(stage_has_renderable_overlay(stage) for stage in stages)


def normalize_xai_document(xai: dict[str, Any] | None) -> dict[str, Any] | None:
    if not xai or not isinstance(xai, dict):
        return None

    normalized = dict(xai)
    cache = dict(normalized.get("cache") or {})

    method = normalized.get("xaiMethod")
    stages = normalized.get("stages")
    if (
        method
        and stages
        and method not in cache
        and cache_entry_has_image_links({"stages": stages})
    ):
        cache[method] = {"stages": stages}

    normalized["cache"] = cache
    normalized["availableViews"] = [
        key for key, entry in cache.items() if cache_entry_has_image_links(entry)
    ]
    return normalized


def get_cached_xai_entry(
    xai: dict[str, Any] | None,
    method: str,
) -> dict[str, Any] | None:
    normalized = normalize_xai_document(xai)
    if not normalized:
        return None

    entry = normalized.get("cache", {}).get(method)
    if isinstance(entry, dict) and cache_entry_has_image_links(entry):
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
        "availableViews": [
            key
            for key, entry in normalized.get("cache", {}).items()
            if cache_entry_has_image_links(entry)
        ],
    }


def merge_xai_result(
    existing_xai: dict[str, Any] | None,
    result: CascadeXaiResultOut,
) -> dict[str, Any]:
    dumped = result.model_dump()
    normalized = normalize_xai_document(existing_xai) or {"cache": {}}
    cache = dict(normalized.get("cache") or {})
    method = dumped["xaiMethod"]
    entry = {"stages": dumped["stages"]}
    if not cache_entry_has_image_links(entry):
        raise ValueError(
            f"XAI result for '{method}' has no overlay image URLs to cache."
        )

    cache[method] = entry

    return {
        "xaiMethod": method,
        "cascadePrediction": dumped.get("cascadePrediction")
        or normalized.get("cascadePrediction"),
        "stages": dumped["stages"],
        "cache": cache,
        "availableViews": [
            key for key, item in cache.items() if cache_entry_has_image_links(item)
        ],
    }


def cascade_result_from_stored(stored: dict[str, Any]) -> CascadeXaiResultOut:
    return CascadeXaiResultOut(
        xaiMethod=stored["xaiMethod"],
        cascadePrediction=stored["cascadePrediction"],
        stages=stored["stages"],
    )
