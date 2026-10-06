const formatLiteralValue = (value) => {
  if (typeof value === "string") return `"${value}"`;
  return String(value);
};

const formatIssueMessage = (issue, field) => {
  if (issue.code === "invalid_type" && /received undefined$/.test(issue.message)) {
    return `"${field}" is required`;
  }

  if (issue.code === "invalid_value" && Array.isArray(issue.values) && issue.values.length === 1) {
    return `"${field}" must be ${formatLiteralValue(issue.values[0])}`;
  }

  return issue.message;
};

const formatValidationError = (error, fieldNameOverride) => {
  return error.issues.map((issue) => {
    const field = fieldNameOverride || issue.path.join(".");

    return {
      field,
      message: formatIssueMessage(issue, field),
    };
  });
};

module.exports = formatValidationError;
