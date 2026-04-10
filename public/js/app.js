const roleRoutes = {
  student: "/student.html",
  staff: "/staff.html",
  guard: "/guard.html",
  warden: "/admin.html",
  chief: "/admin.html"
};

function byId(id) {
  return document.getElementById(id);
}

function showMessage(text, isError = false) {
  const message = byId("message");
  if (!message) return;
  message.textContent = text;
  message.style.color = isError ? "var(--danger)" : "var(--accent-strong)";
}

function getDashboardHref(role) {
  return roleRoutes[role] || "/login.html";
}

function requireAuthForRolePage() {
  const pageRole = document.body.dataset.rolePage;
  if (!pageRole) return;

  const { role } = storage.getAuth();
  const page = document.body.dataset.page;
  const allowed = (pageRole === "admin" && ["warden", "chief"].includes(role)) || pageRole === role;
  if (!allowed) window.location.href = "/login.html";

  if (page === "admin-users" && role !== "chief") {
    window.location.href = "/admin.html";
  }
}

function redirectHomeIfAuthenticated() {
  if (!document.body.classList.contains("landing-page")) return;
  const { role } = storage.getAuth();
  if (role) {
    const homeLink = document.querySelector(".btn.btn-primary");
    if (homeLink) {
      homeLink.textContent = "Open dashboard";
      homeLink.href = getDashboardHref(role);
    }
  }
}

function formatDate(value) {
  return new Date(value).toLocaleString();
}

function pillClass(status) {
  if (status === "Completed" || status === "Approved") return "pill success";
  if (status === "Rejected") return "pill danger";
  if (status === "Pending") return "pill warning";
  return "pill";
}

function renderEmpty(container, label) {
  container.innerHTML = `<div class="empty-state">${label}</div>`;
}

function renderStats(containerId, stats) {
  const container = byId(containerId);
  if (!container) return;

  container.innerHTML = stats
    .map(
      (item) => `
        <${item.href ? "a" : "article"} class="glass stat-card${item.href ? " stat-link" : ""}" ${item.href ? `href="${item.href}"` : ""}>
          <p class="eyebrow">${item.label}</p>
          <h3>${item.title}</h3>
          <span class="stat-value">${item.value}</span>
        </${item.href ? "a" : "article"}>
      `
    )
    .join("");
}

function complaintCard(complaint, role, staffDirectory = []) {
  const overdueBadge = complaint.isOverdue ? `<span class="pill danger">Overdue</span>` : "";
  const assigneeOptions = staffDirectory
    .map(
      (staff) =>
        `<option value="${staff._id}" ${complaint.assignedTo?._id === staff._id ? "selected" : ""}>${staff.name} (${staff.room || "No zone"})</option>`
    )
    .join("");

  let actions = "";

  if (["staff", "warden", "chief"].includes(role)) {
    const statuses = ["Assigned", "In Progress", "Completed", "Rejected"]
      .map((status) => `<option value="${status}" ${complaint.status === status ? "selected" : ""}>${status}</option>`)
      .join("");

    actions += `
      <div class="card-actions">
        <select data-complaint-status="${complaint._id}">${statuses}</select>
        <button class="btn btn-secondary" type="button" data-save-complaint="${complaint._id}">Save status</button>
      </div>
    `;
  }

  if (role === "warden") {
    actions += `
      <div class="card-actions">
        <select data-assign-input="${complaint._id}">
          <option value="">Choose staff</option>
          ${assigneeOptions}
        </select>
        <button class="btn btn-secondary" type="button" data-assign-complaint="${complaint._id}">Assign</button>
      </div>
    `;
  }

  if (role === "chief") {
    actions += `
      <div class="card-actions">
        <button class="btn btn-secondary" type="button" data-chief-reset="${complaint._id}">Clear assignee</button>
      </div>
    `;
  }

  return `
    <article class="card">
      <div class="card-header">
        <strong>${complaint.category}</strong>
        <div class="status-row">
          <span class="${pillClass(complaint.status)}">${complaint.status}</span>
          ${overdueBadge}
        </div>
      </div>
      <div class="card-meta">
        <span class="muted">Student: ${complaint.studentId?.name || "Student"}</span>
        <span class="muted">Room: ${complaint.studentId?.room || "N/A"}</span>
        <span class="muted">Assigned to: ${complaint.assignedTo?.name || "Unassigned"}</span>
        <span class="muted">Created: ${formatDate(complaint.createdAt)}</span>
      </div>
      <p>${complaint.issue}</p>
      ${actions}
    </article>
  `;
}

function leaveCard(leave, role) {
  const approver = leave.approvedBy?.name ? `Approved by: ${leave.approvedBy.name}` : "Awaiting guard decision";
  const actions =
    role === "guard"
      ? `
        <div class="card-actions">
          <button class="btn btn-primary" type="button" data-leave-action="${leave._id}" data-status="Approved">Approve</button>
          <button class="btn btn-secondary" type="button" data-leave-action="${leave._id}" data-status="Rejected">Reject</button>
        </div>
      `
      : "";

  return `
    <article class="card">
      <div class="card-header">
        <strong>${leave.studentId?.name || "Student leave"}</strong>
        <span class="${pillClass(leave.status)}">${leave.status}</span>
      </div>
      <div class="card-meta">
        <span class="muted">Room: ${leave.studentId?.room || "N/A"}</span>
        <span class="muted">From: ${formatDate(leave.fromDate)}</span>
        <span class="muted">To: ${formatDate(leave.toDate)}</span>
        <span class="muted">${approver}</span>
      </div>
      <p>${leave.reason}</p>
      ${actions}
    </article>
  `;
}

function userCard(user, canDelete = false) {
  return `
    <article class="card">
      <div class="card-header">
        <strong>${user.name}</strong>
        <span class="role-chip">${user.role}</span>
      </div>
      <div class="card-meta">
        <span class="muted">${user.email}</span>
        <span class="muted">Location: ${user.room || "Not set"}</span>
      </div>
      ${canDelete ? `<div class="card-actions"><button class="btn btn-secondary" type="button" data-delete-user="${user._id}">Delete profile</button></div>` : ""}
    </article>
  `;
}

async function loadStudentDashboard() {
  const [complaints, leaves] = await Promise.all([api("/api/complaints"), api("/api/leaves")]);

  renderStats("student-stats", [
    { label: "Complaints", title: "Total submitted", value: complaints.length, href: "/complaints.html" },
    { label: "Open", title: "Active complaints", value: complaints.filter((item) => item.status !== "Completed").length, href: "/complaints.html" },
    { label: "Leaves", title: "Leave requests", value: leaves.length, href: "/leaves.html" },
    { label: "Approved", title: "Approved leaves", value: leaves.filter((item) => item.status === "Approved").length, href: "/leaves.html" }
  ]);

  const complaintCount = byId("complaints-count");
  const leaveCount = byId("leaves-count");

  if (complaintCount) {
    complaintCount.textContent = `${complaints.length} total`;
  }

  if (leaveCount) {
    leaveCount.textContent = `${leaves.length} total`;
  }
}

async function loadStudentComplaintsPage() {
  const complaints = await api("/api/complaints");
  const complaintsList = byId("complaints-list");

  complaintsList.innerHTML = complaints.length ? complaints.map((item) => complaintCard(item, "student")).join("") : "";

  if (!complaints.length) {
    renderEmpty(complaintsList, "No complaints yet.");
  }
}

async function loadStudentLeavesPage() {
  const leaves = await api("/api/leaves");
  const leavesList = byId("leaves-list");

  leavesList.innerHTML = leaves.length ? leaves.map((item) => leaveCard(item, "student")).join("") : "";

  if (!leaves.length) {
    renderEmpty(leavesList, "No leave requests yet.");
  }
}

async function loadAdminDashboardSummary(role) {
  const [complaints, leaves, users] = await Promise.all([
    api("/api/complaints"),
    api("/api/leaves"),
    role === "chief" ? api("/api/users/directory/overview") : Promise.resolve([])
  ]);

  renderAdminStats(complaints, leaves, users, role);

  const complaintsCount = byId("admin-complaints-count");
  const leavesCount = byId("admin-leaves-count");

  if (complaintsCount) {
    complaintsCount.textContent = `${complaints.length} total`;
  }

  if (leavesCount) {
    leavesCount.textContent = `${leaves.length} total`;
  }

  return { complaints, leaves, users };
}

async function loadStaffDashboardSummary() {
  const complaints = await api("/api/complaints");

  renderStats("staff-stats", [
    { label: "Assigned", title: "Total assigned", value: complaints.length, href: "/staff-complaints.html" },
    { label: "In progress", title: "Active work", value: complaints.filter((item) => item.status === "In Progress").length, href: "/staff-complaints.html" },
    { label: "Completed", title: "Resolved", value: complaints.filter((item) => item.status === "Completed").length, href: "/staff-complaints.html" },
    { label: "Pending", title: "Needs movement", value: complaints.filter((item) => item.status === "Assigned").length, href: "/staff-complaints.html" }
  ]);

  const complaintsCount = byId("staff-complaints-count");
  if (complaintsCount) {
    complaintsCount.textContent = `${complaints.length} total`;
  }
}

async function loadComplaintsForRole(role, staffDirectory = []) {
  const complaints = await api("/api/complaints");
  const complaintsList = byId("complaints-list");

  complaintsList.innerHTML = complaints.length
    ? complaints.map((item) => complaintCard(item, role, staffDirectory)).join("")
    : "";

  if (!complaints.length) renderEmpty(complaintsList, "No complaints available.");

  if (role === "staff") {
    renderStats("staff-stats", [
      { label: "Assigned", title: "Total assigned", value: complaints.length },
      { label: "In progress", title: "Active work", value: complaints.filter((item) => item.status === "In Progress").length },
      { label: "Completed", title: "Resolved", value: complaints.filter((item) => item.status === "Completed").length },
      { label: "Pending", title: "Needs movement", value: complaints.filter((item) => item.status === "Assigned").length }
    ]);
  }

  return complaints;
}

async function loadLeavesForRole(role) {
  const leaves = await api("/api/leaves");
  const leavesList = byId("leaves-list");

  if (leavesList) {
    leavesList.innerHTML = leaves.length ? leaves.map((item) => leaveCard(item, role)).join("") : "";
    if (!leaves.length) renderEmpty(leavesList, "No leave requests available.");
  }

  if (role === "guard") {
    renderStats("guard-stats", [
      { label: "Leaves", title: "Total requests", value: leaves.length },
      { label: "Pending", title: "Waiting on you", value: leaves.filter((item) => item.status === "Pending").length },
      { label: "Approved", title: "Approved", value: leaves.filter((item) => item.status === "Approved").length },
      { label: "Rejected", title: "Rejected", value: leaves.filter((item) => item.status === "Rejected").length }
    ]);
  }

  return leaves;
}

async function loadGuardDashboardSummary() {
  const leaves = await api("/api/leaves");

  renderStats("guard-stats", [
    { label: "Leaves", title: "Total requests", value: leaves.length, href: "/guard-leaves.html" },
    { label: "Pending", title: "Waiting on you", value: leaves.filter((item) => item.status === "Pending").length, href: "/guard-leaves.html" },
    { label: "Approved", title: "Approved", value: leaves.filter((item) => item.status === "Approved").length, href: "/guard-leaves.html" },
    { label: "Rejected", title: "Rejected", value: leaves.filter((item) => item.status === "Rejected").length, href: "/guard-leaves.html" }
  ]);

  const leavesCount = byId("guard-leaves-count");
  if (leavesCount) {
    leavesCount.textContent = `${leaves.length} total`;
  }
}

async function loadStaffDirectory() {
  const container = byId("staff-directory");
  if (!container) return [];

  const users = await api("/api/users/directory/staff");
  container.classList.add("compact-list");
  container.innerHTML = users.length ? users.map((user) => userCard(user)).join("") : "";
  if (!users.length) renderEmpty(container, "No staff accounts available.");
  return users;
}

async function loadDirectoryOverview() {
  const container = byId("directory-overview");
  if (!container) return [];

  const users = await api("/api/users/directory/overview");
  container.innerHTML = users.length ? users.map((user) => userCard(user, true)).join("") : "";
  if (!users.length) renderEmpty(container, "No users found.");
  return users;
}

function initializeUserDeleteActions(onRefresh) {
  document.addEventListener("click", async (event) => {
    const userId = event.target.dataset.deleteUser;
    if (!userId) return;

    try {
      await api(`/api/users/${userId}`, { method: "DELETE" });
      showMessage("User deleted successfully.");
      if (onRefresh) await onRefresh();
    } catch (error) {
      showMessage(error.message, true);
    }
  });
}

async function initializeLogin() {
  const form = byId("login-form");
  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const payload = Object.fromEntries(new FormData(form).entries());
      const result = await api("/api/auth/login", { method: "POST", body: JSON.stringify(payload) });
      storage.setAuth(result);
      window.location.href = getDashboardHref(result.role);
    } catch (error) {
      showMessage(error.message, true);
    }
  });
}

async function initializeSignup() {
  const form = byId("signup-form");
  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const payload = Object.fromEntries(new FormData(form).entries());
      const result = await api("/api/auth/signup", { method: "POST", body: JSON.stringify(payload) });
      storage.setAuth(result);
      window.location.href = getDashboardHref(result.role);
    } catch (error) {
      showMessage(error.message, true);
    }
  });
}

function initializeLogout() {
  const button = byId("logout-btn");
  if (!button) return;

  button.addEventListener("click", () => {
    storage.clearAuth();
    window.location.href = "/login.html";
  });
}

function initializeComplaintForm(onSuccess) {
  const complaintForm = byId("complaint-form");
  if (complaintForm) {
    complaintForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      try {
        const payload = Object.fromEntries(new FormData(complaintForm).entries());
        await api("/api/complaints", { method: "POST", body: JSON.stringify(payload) });
        complaintForm.reset();
        showMessage("Complaint submitted.");
        if (onSuccess) await onSuccess();
      } catch (error) {
        showMessage(error.message, true);
      }
    });
  }
}

function initializeLeaveForm(onSuccess) {
  const leaveForm = byId("leave-form");
  if (leaveForm) {
    leaveForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      try {
        const payload = Object.fromEntries(new FormData(leaveForm).entries());
        await api("/api/leaves", { method: "POST", body: JSON.stringify(payload) });
        leaveForm.reset();
        showMessage("Leave request submitted.");
        if (onSuccess) await onSuccess();
      } catch (error) {
        showMessage(error.message, true);
      }
    });
  }
}

function initializeComplaintActions(role, getStaffDirectory) {
  document.addEventListener("click", async (event) => {
    const saveStatusId = event.target.dataset.saveComplaint;
    const assignId = event.target.dataset.assignComplaint;
    const resetId = event.target.dataset.chiefReset;

    if (!saveStatusId && !assignId && !resetId) return;

    try {
      if (saveStatusId) {
        const select = document.querySelector(`[data-complaint-status="${saveStatusId}"]`);
        await api(`/api/complaints/${saveStatusId}/status`, {
          method: "PUT",
          body: JSON.stringify({ status: select.value })
        });
      }

      if (assignId) {
        const select = document.querySelector(`[data-assign-input="${assignId}"]`);
        if (!select.value) {
          throw new Error("Choose a staff member before assigning");
        }

        await api(`/api/complaints/${assignId}/assign`, {
          method: "PUT",
          body: JSON.stringify({ assignedTo: select.value })
        });
      }

      if (resetId) {
        await api(`/api/complaints/${resetId}/override`, {
          method: "PUT",
          body: JSON.stringify({ assignedTo: null, status: "Pending" })
        });
      }

      showMessage("Complaint updated.");
      await loadComplaintsForRole(role, getStaffDirectory ? getStaffDirectory() : []);
    } catch (error) {
      showMessage(error.message, true);
    }
  });
}

function initializeLeaveActions() {
  document.addEventListener("click", async (event) => {
    const leaveId = event.target.dataset.leaveAction;
    const status = event.target.dataset.status;
    if (!leaveId || !status) return;

    try {
      await api(`/api/leaves/${leaveId}`, { method: "PUT", body: JSON.stringify({ status }) });
      showMessage(`Leave ${status.toLowerCase()}.`);
      await loadLeavesForRole("guard");
    } catch (error) {
      showMessage(error.message, true);
    }
  });
}

async function initializeAdminUserForm(onRefresh) {
  const form = byId("user-create-form");
  const panel = byId("user-create-panel");
  const directoryPanel = byId("directory-overview-panel");
  const { role } = storage.getAuth();

  if (panel && role !== "chief") panel.style.display = "none";
  if (directoryPanel && role !== "chief") directoryPanel.style.display = "none";
  if (!form || role !== "chief") return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const payload = Object.fromEntries(new FormData(form).entries());
      await api("/api/users/create", { method: "POST", body: JSON.stringify(payload) });
      form.reset();
      showMessage("User created successfully.");
      if (onRefresh) await onRefresh();
    } catch (error) {
      showMessage(error.message, true);
    }
  });
}

async function initializeProfilePage() {
  const form = byId("profile-form");
  if (!form) return;

  try {
    const profile = await api("/api/users/profile");
    form.elements.name.value = profile.name || "";
    form.elements.room.value = profile.room || "";
    byId("profile-heading").textContent = `Manage profile for ${profile.role}`;
    byId("back-link").href = getDashboardHref(profile.role);
  } catch (error) {
    showMessage(error.message, true);
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const payload = Object.fromEntries(new FormData(form).entries());
      const result = await api("/api/users/profile", { method: "PUT", body: JSON.stringify(payload) });
      localStorage.setItem("name", result.user.name);
      showMessage("Profile updated.");
    } catch (error) {
      showMessage(error.message, true);
    }
  });
}

function renderAdminStats(complaints, leaves, users, role) {
  renderStats("admin-stats", [
    { label: "Complaints", title: "Total visible", value: complaints.length, href: "/admin-complaints.html" },
    { label: "Pending", title: "Unresolved complaints", value: complaints.filter((item) => item.status !== "Completed").length, href: "/admin-complaints.html" },
    { label: "Overdue", title: "Service delays", value: complaints.filter((item) => item.isOverdue).length, href: "/admin-complaints.html" },
    { label: role === "chief" ? "Users" : "Leaves", title: role === "chief" ? "Known users" : "Visible leaves", value: role === "chief" ? users.length : leaves.length, href: role === "chief" ? "/admin-users.html" : "/admin-leaves.html" }
  ]);
}

async function initializeDashboard() {
  const rolePage = document.body.dataset.rolePage;
  const page = document.body.dataset.page;
  const auth = storage.getAuth();
  if (!rolePage) return;

  const title = byId("dashboard-title");
  if (title && auth.name) title.textContent = `${auth.name}'s workspace`;

  if (rolePage === "student" && (!page || page === "student-dashboard")) {
    await loadStudentDashboard();
  }

  if (rolePage === "student" && page === "student-complaints") {
    await loadStudentComplaintsPage();
    initializeComplaintForm(loadStudentComplaintsPage);
  }

  if (rolePage === "student" && page === "student-leaves") {
    await loadStudentLeavesPage();
    initializeLeaveForm(loadStudentLeavesPage);
  }

  if (rolePage === "staff" && (!page || page === "staff-dashboard")) {
    await loadStaffDashboardSummary();
  }

  if (rolePage === "staff" && page === "staff-complaints") {
    await loadComplaintsForRole("staff");
    initializeComplaintActions("staff");
  }

  if (rolePage === "guard" && (!page || page === "guard-dashboard")) {
    await loadGuardDashboardSummary();
  }

  if (rolePage === "guard" && page === "guard-leaves") {
    await loadLeavesForRole("guard");
    initializeLeaveActions();
  }

  if (rolePage === "admin") {
    let staffDirectory = [];
    const usersLink = byId("admin-users-link");

    if (usersLink && auth.role !== "chief") {
      usersLink.style.display = "none";
    }

    const refreshAdmin = async () => {
      staffDirectory = await loadStaffDirectory();
      if (page === "admin-complaints") {
        await loadComplaintsForRole(auth.role, staffDirectory);
      } else if (page === "admin-leaves") {
        await loadLeavesForRole(auth.role);
      } else if (page === "admin-users") {
        await loadDirectoryOverview();
      } else {
        await loadAdminDashboardSummary(auth.role);
      }
    };

    await refreshAdmin();
    if (page === "admin-complaints") {
      initializeComplaintActions(auth.role, () => staffDirectory);
    }

    if (page === "admin-users") {
      initializeUserDeleteActions(refreshAdmin);
      await initializeAdminUserForm(refreshAdmin);
    }

    if (page !== "admin-complaints" && page !== "admin-leaves" && page !== "admin-users") {
      initializeUserDeleteActions(refreshAdmin);
      await initializeAdminUserForm(refreshAdmin);
    }
  }
}

requireAuthForRolePage();
redirectHomeIfAuthenticated();
initializeLogin();
initializeSignup();
initializeLogout();
initializeProfilePage();
initializeDashboard().catch((error) => showMessage(error.message, true));
