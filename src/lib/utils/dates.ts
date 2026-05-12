export function isValidDateString(value?: string) {
  if (!value) {
    return false;
  }

  const date = new Date(value);

  return !Number.isNaN(date.getTime());
}

export function isDueDateBeforeIssueDate(issueDate?: string, dueDate?: string) {
  if (!issueDate || !dueDate) {
    return false;
  }

  const issue = new Date(issueDate);
  const due = new Date(dueDate);

  if (Number.isNaN(issue.getTime()) || Number.isNaN(due.getTime())) {
    return false;
  }

  return due < issue;
}