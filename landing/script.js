// BistroTech landing, script.js, v0.4.0, 2026-09-17.
// Versioned with the rest of the landing set rather than on its own line.
// One script for both languages. Everything a reader sees comes from the markup or
// from a data attribute, so the Hungarian and the English page share this file and
// no sentence lives in JavaScript. No dependencies, no external requests.
//
// Two jobs: the demo request form, and the price switch.
(function () {
  "use strict";

  // -------------------------------------------------------------------------
  // The price grid
  // -------------------------------------------------------------------------
  // D-006: no price is published until Q-017 and Q-023 are settled, so the page
  // ships with "Ár hamarosan" written into the markup and this block does
  // nothing. When the operator settles the numbers, set data-prices="on" on the
  // section in both index.html files. That is the whole change.
  //
  // The figures are docs/MODULES-PROPOSAL-v0.1.0.md section 5, per location per
  // month, net. They are a proposal and four of the nine cells sit outside the
  // bands PRICING-PROPOSAL derived, which is recorded there and is exactly why
  // they are not on the page yet. Update this object, not the markup.
  var PRICES = {
    currency: { hu: "Ft", en: "HUF" },
    // Per location per month, net of VAT.
    // id is the suffix of the data-band-* attribute that carries the band's label,
    // so the label text stays in the markup and stays translated.
    bands: [
      { id: "1",       plans: { indulo: 20800, elemzo: 29900, teljes: 39000 }, addon: 7900 },
      { id: "2-9",     plans: { indulo: 13800, elemzo: 19900, teljes: 25900 }, addon: 4900 },
      { id: "10plus",  plans: { indulo:  9000, elemzo: 12900, teljes: 16800 }, addon: 2900 }
    ]
  };

  // hu: 20 800 Ft, grouped with a non-breaking space, no decimals, unit after.
  // en: 20,800 HUF, code after the number, because the reader reads the amount first.
  function money(n, lang) {
    var locale = lang === "hu" ? "hu-HU" : "en-GB";
    var body = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(n);
    return body + " " + (lang === "hu" ? PRICES.currency.hu : PRICES.currency.en);
  }

  function showPrices() {
    var section = document.querySelector("[data-prices]");
    if (!section || section.getAttribute("data-prices") !== "on") return;
    var lang = (document.documentElement.lang || "hu").slice(0, 2);
    var first = PRICES.bands[0];
    var rest = PRICES.bands.slice(1);

    Array.prototype.forEach.call(section.querySelectorAll("[data-plan]"), function (slot) {
      var key = slot.getAttribute("data-plan");
      var value = slot.querySelector(".value");
      var band = slot.querySelector(".band");
      if (!value) return;
      var single = first.plans[key];
      if (single == null) return;
      value.textContent = money(single, lang);
      if (band) {
        band.textContent = rest.map(function (b) {
          return slot.getAttribute("data-band-" + b.id) + ": " + money(b.plans[key], lang);
        }).join(" · ");
      }
    });

    var addon = section.querySelector("[data-addon]");
    if (addon) {
      addon.textContent = PRICES.bands.map(function (b) {
        return addon.getAttribute("data-band-" + b.id) + ": " + money(b.addon, lang);
      }).join(" · ");
    }
  }

  // -------------------------------------------------------------------------
  // The demo request form
  // -------------------------------------------------------------------------
  // The contract is supabase/functions/lead/README.md and does not change here:
  // the same endpoint, the same anon key in the two headers, the same field
  // names and limits, the same honeypot, the same 429 answer.
  function wireForm() {
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
        // Honeypot. A person never sees this field, so anything in it is a bot.
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
  }

  showPrices();
  wireForm();
})();
