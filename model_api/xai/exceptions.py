"""XAI exception types (standalone module to avoid circular imports)."""


class UnsupportedStageError(ValueError):
    pass


class InvalidXaiMethodError(ValueError):
    pass


class InvalidTargetLayerError(ValueError):
    pass


class ExplanationGenerationError(RuntimeError):
    pass
