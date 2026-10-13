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
    const defaut = cfg.langue === "darija"
      ? "Langue par défaut : darija tunisienne en arabizi."
      : "Langue par défaut : français.";
    const langue = [
      "LANGUE (obligatoire) : réponds toujours dans la langue et le style du dernier message du client.",
      "- Si le client écrit en darija tunisienne avec des lettres latines et des chiffres (arabizi : 3asslema, t9i9a, su2el, 7aja, ch7al, barcha, behi, yaatik essa7a...), réponds en darija tunisienne arabizi, naturelle, avec les mêmes conventions (3, 7, 9, 5, 8, 2). Reste poli et professionnel, sans argot excessif.",
      "- Si le client écrit en français, réponds en français. S'il mélange français et darija, fais pareil.",
      "- Si le client écrit en arabe (alphabet arabe) ou en anglais, réponds dans cette langue.",
      "- Les noms de produits, les prix et les horaires restent exacts, tels qu'ils figurent dans la base.",
      defaut,
    ].join("\n");
    return [
      `Tu es l'agent de messagerie Instagram de l'entreprise « ${cfg.entreprise} ». Tu discutes par DM avec ses clients.`,
      cfg.instructions || "",
      langue,
      [
        "STYLE (obligatoire) : tu écris comme dans une vraie conversation Instagram DM.",
        "- Messages courts : 1 à 3 phrases, jamais de long paragraphe.",
        "- Ton clair, poli et professionnel, mais naturel et chaleureux. Vouvoie le client, sauf s'il te tutoie.",
        "- Pas de listes à puces, pas de titres, pas de Markdown, pas de gras. Texte simple uniquement.",
        "- Un emoji maximum par message, et seulement s'il est utile.",
        "- Va droit au but : réponds à la question posée, puis pose au plus une question de suivi si nécessaire.",
        "- Retiens tout ce que le client a déjà dit (prénom, besoin, choix) et ne le redemande jamais.",
      ].join("\n"),
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
