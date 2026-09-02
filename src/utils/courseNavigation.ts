// Small cross-page signal for "the Employee Dashboard's course card was
// clicked — Learning Paths should scroll to and highlight this course once it
// loads." App.tsx's routing is plain local state (no URL router/query params),
// so sessionStorage is the simplest way to pass this one piece of intent
// across the section switch without adding a whole router just for this.
const KEY = 'vidya-pending-course-scroll';

export function requestCourseScroll(courseId: string): void {
  try {
    sessionStorage.setItem(KEY, courseId);
  } catch {
    // Private browsing etc. — the click still navigates via onNavigate, it just
    // won't auto-scroll/highlight once there. Not worth failing the click over.
  }
}

/** Reads and clears the pending course id, if any — consume-once so it doesn't re-trigger on a later unrelated visit. */
export function consumePendingCourseScroll(): string | null {
  try {
    const id = sessionStorage.getItem(KEY);
    if (id) sessionStorage.removeItem(KEY);
    return id;
  } catch {
    return null;
  }
}
