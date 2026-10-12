const form = document.getElementById("pilot-form");
const status = document.getElementById("form-status");
const fallbackError = "We could not submit the application. Please try again later, or contact the studio.";

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
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(payload)
    });
    let result = {};
    try { result = await response.json(); } catch { result = {}; }
    if (!response.ok) throw new Error(typeof result.error === "string" ? result.error : fallbackError);
    form.reset();
    status.className = "form-status success";
    status.textContent = "Thank you. Your application has been received. We will review it and contact you by email.";
  } catch (error) {
    status.className = "form-status error";
    // Network failures surface as TypeError with browser-specific text; show our own message instead.
    status.textContent = error instanceof TypeError ? fallbackError : error.message || fallbackError;
  } finally {
    button.disabled = false;
  }
});
