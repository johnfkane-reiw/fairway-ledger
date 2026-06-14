const j = (r) => r.json();
const send = (url, method, body) =>
  fetch(url, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  }).then(j);

export const api = {
  getState: () => fetch("/api/state").then(j),

  addGolfer: (name) => send("/api/golfers", "POST", { name }),
  delGolfer: (id) => send(`/api/golfers/${id}`, "DELETE"),

  saveCourse: (course) =>
    course.id
      ? send(`/api/courses/${course.id}`, "PUT", course)
      : send("/api/courses", "POST", course),
  delCourse: (id) => send(`/api/courses/${id}`, "DELETE"),

  addScore: (score) => send("/api/scores", "POST", score),
  delScore: (id) => send(`/api/scores/${id}`, "DELETE"),

  addLeague: (name) => send("/api/leagues", "POST", { name }),
  delLeague: (id) => send(`/api/leagues/${id}`, "DELETE"),
  addMember: (leagueId, golferId) =>
    send(`/api/leagues/${leagueId}/members`, "POST", { golferId }),
  delMember: (leagueId, golferId) =>
    send(`/api/leagues/${leagueId}/members/${golferId}`, "DELETE"),
};
