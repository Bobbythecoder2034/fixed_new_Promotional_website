document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("form[action='/submissions']");
  if (!form) return;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const body = Object.fromEntries(fd.entries());
    try {
      const res = await fetch("/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      alert("Submission saved! ID: " + data.submission.id);
      form.reset();
    } catch (err) {
      alert("Error: " + err.message);
    }
  });
});
