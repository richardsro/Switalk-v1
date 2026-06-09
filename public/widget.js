/**
 * Switalk webchat widget (MVP).
 * Embed: <script src="https://app.switalk.com/widget.js" data-widget-id="YOUR_ID" async></script>
 */
(function () {
  var script = document.currentScript;
  var widgetId = script && script.getAttribute("data-widget-id");
  if (!widgetId) return;

  var origin = new URL(script.src).origin;
  var visitorId = localStorage.getItem("switalk_visitor");
  if (!visitorId) {
    visitorId = Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem("switalk_visitor", visitorId);
  }

  var open = false;
  var bubble = document.createElement("button");
  bubble.textContent = "💬";
  bubble.style.cssText =
    "position:fixed;bottom:20px;right:20px;width:56px;height:56px;border-radius:50%;border:none;background:#4f46e5;color:#fff;font-size:24px;cursor:pointer;z-index:99999;box-shadow:0 4px 12px rgba(0,0,0,.2)";

  var panel = document.createElement("div");
  panel.style.cssText =
    "position:fixed;bottom:88px;right:20px;width:300px;background:#fff;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.2);padding:12px;display:none;z-index:99999;font-family:system-ui,sans-serif";
  panel.innerHTML =
    '<p style="margin:0 0 8px;font-weight:600;font-size:14px">Send us a message</p>' +
    '<textarea rows="3" style="width:100%;box-sizing:border-box;border:1px solid #ddd;border-radius:8px;padding:8px;font-size:14px;resize:none"></textarea>' +
    '<button style="margin-top:8px;width:100%;background:#4f46e5;color:#fff;border:none;border-radius:8px;padding:8px;font-size:14px;cursor:pointer">Send</button>' +
    '<p data-status style="margin:6px 0 0;font-size:12px;color:#888"></p>';

  var textarea = panel.querySelector("textarea");
  var send = panel.querySelector("button");
  var status = panel.querySelector("[data-status]");

  bubble.onclick = function () {
    open = !open;
    panel.style.display = open ? "block" : "none";
  };

  send.onclick = function () {
    var text = textarea.value.trim();
    if (!text) return;
    send.disabled = true;
    fetch(origin + "/api/webchat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ widgetId: widgetId, visitorId: visitorId, text: text }),
    })
      .then(function (r) {
        status.textContent = r.ok ? "Sent! We'll reply soon." : "Failed — try again.";
        if (r.ok) textarea.value = "";
      })
      .catch(function () {
        status.textContent = "Failed — try again.";
      })
      .finally(function () {
        send.disabled = false;
      });
  };

  document.body.appendChild(bubble);
  document.body.appendChild(panel);
})();
