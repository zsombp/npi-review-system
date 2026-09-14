// BistroTech landing, script.js, v0.1.0, 2026-09-15
// One script for both languages. Everything the user reads comes from data
// attributes on the form, so the Hungarian and the English page share this file
// and no copy lives in JavaScript. No dependencies, no external requests.
(function () {
  "use strict";

  var form = document.getElementById("demo-form");
  if (!form) return;

  var endpoint = form.getAttribute("data-endpoint");
  var key = form.getAttribute("data-key");
  var source = form.getAttribute("data-source") || "landing";
  var status = document.getElementById("form-status");
  var thanks = document.getElementById("thanks");
  var panel = document.getElementById("form-panel");
  var button = form.querySelector("button[type=submit]");
  var buttonLabel = button ? button.textContent : "";

  function say(text, isError) {
    if (!status) return;
    status.textContent = text || "";
    status.className = "status" + (isError ? " err" : "");
  }

  function value(name) {
    var el = form.elements[name];
    return el && typeof el.value === "string" ? el.value.trim() : "";
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    say("");

    // The browser's own required and type=email checks run first.
    if (typeof form.reportValidity === "function" && !form.reportValidity()) return;

    var payload = {
      name: value("name"),
      restaurant: value("restaurant"),
      email: value("email"),
      phone: value("phone"),
      venues: value("venues"),
      message: value("message"),
      // Honeypot. A real person never sees this field, so anything in it is a bot.
      company_website: value("company_website"),
      source: source
    };

    if (button) {
      button.disabled = true;
      button.textContent = form.getAttribute("data-sending") || buttonLabel;
    }

    fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": key,
        "Authorization": "Bearer " + key
      },
      body: JSON.stringify(payload)
    })
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (body) {
          return { ok: res.ok, status: res.status, body: body };
        });
      })
      .then(function (res) {
        if (res.ok) {
          if (panel) panel.hidden = true;
          if (thanks) {
            thanks.hidden = false;
            thanks.setAttribute("tabindex", "-1");
            thanks.focus();
            thanks.scrollIntoView({ block: "center" });
          }
          return;
        }
        var msg = res.status === 429
          ? form.getAttribute("data-error-rate")
          : form.getAttribute("data-error");
        say(msg, true);
      })
      .catch(function () {
        say(form.getAttribute("data-error"), true);
      })
      .then(function () {
        if (button) {
          button.disabled = false;
          button.textContent = buttonLabel;
        }
      });
  });
})();
