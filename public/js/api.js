const storage = {
  getAuth() {
    return {
      userId: localStorage.getItem("userId"),
      role: localStorage.getItem("role"),
      name: localStorage.getItem("name")
    };
  },
  setAuth({ userId, role, name }) {
    localStorage.setItem("userId", userId);
    localStorage.setItem("role", role);
    if (name) localStorage.setItem("name", name);
  },
  clearAuth() {
    localStorage.removeItem("userId");
    localStorage.removeItem("role");
    localStorage.removeItem("name");
  }
};

async function api(path, options = {}) {
  const auth = storage.getAuth();
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (auth.userId) headers["x-user-id"] = auth.userId;

  const response = await fetch(path, { ...options, headers });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }

  return data;
}
