(() => {
  const API_URL = "https://api.anthropic.com/v1/messages";
  const $ = (id) => document.getElementById(id);
  const chat = $("chat"), notfound = $("notfound"), messagesEl = $("messages");
  const form = $("form"), input = $("input"), sendBtn = $("send");

  let cfg, base = "", history = [], busy = false;

  const clientName = new URLSearchParams(location.search).get("client");

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src; s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  async function init() {
    if (!clientName || !/^[a-z0-9_-]+$/i.test(clientName)) return showNotFound();
    try {
      await loadScript(`clients/${clientName}/config.js`);
      const res = await fetch(`clients/${clientName}/base.md`);
      if (!res.ok) throw new Error("base.md");
      base = await res.text();
      cfg = window.CLIENT_CONFIG;
      if (!cfg) throw new Error("config");
    } catch { return showNotFound(); }

    document.title = cfg.compteInstagram;
    $("account").textContent = cfg.compteInstagram;
    $("avatar").textContent = cfg.initiales;
    chat.hidden = false;
    $("reset").addEventListener("click", start);
    start();
  }

  function showNotFound() { notfound.hidden = false; }

  function start() {
    history = [];
    busy = false;
    messagesEl.innerHTML = "";
    if (cfg.messageAccueil) addMessage("agent", cfg.messageAccueil);
    updateSend();
    input.focus();
  }

  function addMessage(role, text) {
    const el = document.createElement("div");
    el.className = `msg ${role}`;
    el.textContent = text;
    messagesEl.appendChild(el);
    scrollDown();
    return el;
  }

  function scrollDown() { messagesEl.scrollTop = messagesEl.scrollHeight; }

  function showTyping() {
    const el = document.createElement("div");
    el.className = "typing";
    el.innerHTML = "<i></i><i></i><i></i>";
    messagesEl.appendChild(el);
    scrollDown();
    return el;
  }

  function systemPrompt() {
    const langue = cfg.langue === "darija"
      ? "Réponds en darija tunisienne écrite en caractères latins (arabizi), sauf si le client écrit dans une autre langue."
      : "Réponds en français, sauf si le client écrit clairement dans une autre langue.";
    return [
      `Tu es l'agent de messagerie Instagram de l'entreprise « ${cfg.entreprise} ». Tu discutes par DM avec ses clients.`,
      cfg.instructions || "",
      langue,
      "Garde le contexte de toute la conversation (prénom, besoin, réponses précédentes). Réponses courtes, naturelles, adaptées à la messagerie Instagram.",
      "RÈGLE ABSOLUE : réponds uniquement à partir de la BASE DE CONNAISSANCES ci-dessous. N'invente jamais un prix, un horaire, un produit ou une politique. Si l'information n'y figure pas, dis que tu vas vérifier et propose de passer par un contact humain.",
      "=== BASE DE CONNAISSANCES ===",
      base,
      "=== FIN DE LA BASE ===",
    ].join("\n\n");
  }

  function errorMessage(status, type) {
    if (status === 401 || status === 403) return "Clé API invalide ou non autorisée.";
    if (status === 429 || type === "rate_limit_error") return "Quota ou limite de requêtes dépassé. Réessaie dans un instant.";
    if (status === 402 || /credit|billing/i.test(type || "")) return "Crédit API insuffisant.";
    if (status >= 500) return "Service momentanément indisponible. Réessaie.";
    return "Une erreur est survenue. Réessaie.";
  }

  async function send(text) {
    busy = true; updateSend();
    addMessage("user", text);
    history.push({ role: "user", content: text });
    const typing = showTyping();
    const started = Date.now();

    try {
      let res;
      try {
        res = await fetch(API_URL, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-api-key": ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
            "anthropic-dangerous-direct-browser-access": "true",
          },
          body: JSON.stringify({
            model: cfg.modele || "claude-haiku-5-5",
            max_tokens: 600,
            system: systemPrompt(),
            messages: history,
          }),
        });
      } catch {
        throw new Error("Problème de connexion. Vérifie ton réseau.");
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(errorMessage(res.status, data?.error?.type));
      const reply = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("").trim();
      if (!reply) throw new Error("Réponse vide. Réessaie.");

      const wait = 600 - (Date.now() - started);
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      typing.remove();
      history.push({ role: "assistant", content: reply });
      addMessage("agent", reply);
    } catch (e) {
      typing.remove();
      history.pop(); // le message n'a pas abouti : on le retire du contexte
      addMessage("error", e.message);
    } finally {
      busy = false; updateSend(); input.focus();
    }
  }

  function updateSend() { sendBtn.disabled = busy || !input.value.trim(); }

  function autosize() {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 96) + "px";
  }

  input.addEventListener("input", () => { autosize(); updateSend(); });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); }
  });
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text || busy) return;
    input.value = ""; autosize(); updateSend();
    send(text);
  });

  init();
})();
