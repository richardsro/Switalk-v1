/**
 * Switalk webchat widget — two-way chat over Supabase Realtime broadcast.
 * Embed: <script src="https://app.switalk.com/widget.js" data-widget-id="YOUR_ID" async></script>
 */
(function () {
  var script = document.currentScript;
  var widgetId = script && script.getAttribute("data-widget-id");
  if (!widgetId) return;

  var origin = new URL(script.src).origin;
  var visitorId = localStorage.getItem("switalk_visitor");
  if (!visitorId) {
    visitorId =
      (window.crypto && crypto.randomUUID && crypto.randomUUID()) ||
      Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem("switalk_visitor", visitorId);
  }

  var BRAND = "#F97316";
  var open = false;

  // --- UI -------------------------------------------------------------
  var bubble = el("button", "position:fixed;bottom:20px;right:20px;width:56px;height:56px;border-radius:50%;border:none;background:" + BRAND + ";color:#fff;font-size:24px;cursor:pointer;z-index:99999;box-shadow:0 4px 12px rgba(0,0,0,.2)");
  bubble.textContent = "💬";

  var panel = el("div", "position:fixed;bottom:88px;right:20px;width:320px;max-width:calc(100vw - 40px);height:420px;background:#fff;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.2);display:none;flex-direction:column;overflow:hidden;z-index:99999;font-family:system-ui,sans-serif");

  var header = el("div", "background:" + BRAND + ";color:#fff;padding:12px 16px;font-weight:600;font-size:14px");
  header.textContent = "Chat with us";

  var log = el("div", "flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px;background:#fafafa");

  var form = el("form", "display:flex;gap:8px;padding:10px;border-top:1px solid #eee;background:#fff");
  var input = el("input", "flex:1;border:1px solid #ddd;border-radius:8px;padding:8px 10px;font-size:14px;outline:none");
  input.placeholder = "Type a message…";
  var sendBtn = el("button", "background:" + BRAND + ";color:#fff;border:none;border-radius:8px;padding:8px 14px;font-size:14px;cursor:pointer");
  sendBtn.type = "submit";
  sendBtn.textContent = "Send";

  form.appendChild(input);
  form.appendChild(sendBtn);
  panel.appendChild(header);
  panel.appendChild(log);
  panel.appendChild(form);
  document.body.appendChild(bubble);
  document.body.appendChild(panel);

  bubble.onclick = function () {
    open = !open;
    panel.style.display = open ? "flex" : "none";
    if (open) input.focus();
  };

  function el(tag, css) {
    var node = document.createElement(tag);
    node.style.cssText = css;
    return node;
  }

  function addMessage(text, mine) {
    var row = el("div", "display:flex;justify-content:" + (mine ? "flex-end" : "flex-start"));
    var msg = el("div",
      "max-width:80%;padding:8px 12px;border-radius:14px;font-size:14px;line-height:1.4;white-space:pre-wrap;word-break:break-word;" +
      (mine
        ? "background:" + BRAND + ";color:#fff;border-bottom-right-radius:4px"
        : "background:#fff;border:1px solid #e5e5e5;color:#222;border-bottom-left-radius:4px"));
    msg.textContent = text;
    row.appendChild(msg);
    log.appendChild(row);
    log.scrollTop = log.scrollHeight;
  }

  function addStatus(text) {
    var note = el("div", "text-align:center;font-size:11px;color:#999");
    note.textContent = text;
    log.appendChild(note);
    log.scrollTop = log.scrollHeight;
  }

  // --- Send -----------------------------------------------------------
  form.onsubmit = function (e) {
    e.preventDefault();
    var text = input.value.trim();
    if (!text) return;
    sendBtn.disabled = true;
    fetch(origin + "/api/webchat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ widgetId: widgetId, visitorId: visitorId, text: text }),
    })
      .then(function (r) {
        if (r.ok) {
          addMessage(text, true);
          input.value = "";
        } else {
          addStatus("Couldn't send — try again");
        }
      })
      .catch(function () {
        addStatus("Couldn't send — try again");
      })
      .finally(function () {
        sendBtn.disabled = false;
      });
  };

  // --- History replay (broadcasts are lost while the widget is closed) --
  fetch(
    origin +
      "/api/webchat/history?widgetId=" +
      encodeURIComponent(widgetId) +
      "&visitorId=" +
      encodeURIComponent(visitorId)
  )
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (history) {
      if (!history || !history.messages) return;
      // The visitor's own messages are "inbound" from the business's
      // perspective, so inbound renders on the visitor's (right) side.
      history.messages.forEach(function (m) {
        addMessage(m.content, m.direction === "inbound");
      });
    })
    .catch(function () { /* history is a nice-to-have; chat still works */ });

  // --- Receive (Supabase Realtime broadcast) ---------------------------
  fetch(origin + "/api/webchat/config?widgetId=" + encodeURIComponent(widgetId))
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (config) {
      if (!config) return;
      if (config.name) header.textContent = config.name;

      var lib = document.createElement("script");
      lib.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js";
      lib.onload = function () {
        var client = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
        client
          .channel("webchat:" + widgetId + ":" + visitorId)
          .on("broadcast", { event: "reply" }, function (msg) {
            if (msg.payload && msg.payload.content) {
              addMessage(msg.payload.content, false);
            }
          })
          .subscribe();
      };
      document.head.appendChild(lib);
    })
    .catch(function () { /* replies degrade gracefully; sending still works */ });
})();
