const EVALUATION_LABEL_FIELD_NAMES = new Set([
  "groundtruth",
  "evaluationlabel",
]);

export function isEvaluationLabelFieldName(fieldName: string): boolean {
  return EVALUATION_LABEL_FIELD_NAMES.has(fieldName.toLowerCase().replace(/[^a-z0-9]+/g, ""));
}

/**
 * Removes evaluation-only labels from values that can enter operational storage.
 * Legacy JSON rows may contain these fields, so boundary enforcement happens on
 * read as well as write until the durable migration removes the old records.
 */
export function stripEvaluationLabels<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripEvaluationLabels(item)) as T;
  }

  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !isEvaluationLabelFieldName(key))
      .map(([key, nestedValue]) => [key, stripEvaluationLabels(nestedValue)]),
  ) as T;
}
