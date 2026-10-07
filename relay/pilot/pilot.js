const form = document.getElementById("pilot-form");
const status = document.getElementById("form-status");

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  status.className = "form-status";
  status.textContent = "Submitting your application…";

  const payload = Object.fromEntries(new FormData(form).entries());
  payload.participant_count = Number(payload.participant_count);

  try {
    const response = await fetch("/api/relay-pilot", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "We could not submit the application.");
    form.reset();
    status.className = "form-status success";
    status.textContent = "Thank you. Your application has been received. We will review it and contact you by email.";
  } catch (error) {
    status.className = "form-status error";
    status.textContent = error.message || "We could not submit the application. Please try again later.";
  } finally {
    button.disabled = false;
  }
});
