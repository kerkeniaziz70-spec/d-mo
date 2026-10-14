(() => {
  const API_URL = "https://api.anthropic.com/v1/messages";
  const $ = (id) => document.getElementById(id);
  const messagesEl = $("messages");
  const form = $("form"), input = $("input"), sendBtn = $("send");

  const DEFAULTS = {
    provider: "gemini", key: "", model: "claude-haiku-5-5", gkey: "", gmodel: "gemini-2.5-flash",
    handle: "napoli.tunis", subname: "Pizzeria Napoli", photo: "", verified: true,
    clock: "auto", company: "Pizzeria Napoli",
    welcome: "Bonjour 👋 Bienvenue chez Pizzeria Napoli ! Que puis-je faire pour vous ?",
    instr: `Tu es l'assistant Instagram de Pizzeria Napoli, pizzeria à Tunis (La Marsa).
Ton rôle : répondre aux questions, prendre les commandes à emporter ou en livraison et les réservations.
Ton : chaleureux, professionnel, phrases courtes, quelques emojis maximum.
Contact humain : +216 71 000 000.`,
    base: `## Menu
- Margherita : 12 DT
- Reine (jambon, champignons) : 15 DT
- Quatre fromages : 18 DT
- Thon et olives : 16 DT
- Tiramisu : 7 DT
- Boissons (soda, eau) : 3 DT

## Livraison
- 5 DT, offerte dès 40 DT. Délai : 30 à 45 minutes. Zones : La Marsa, Gammarth, Carthage.

## Horaires
- Tous les jours de 11h30 à 23h00. Fermé le lundi midi.

## Réservation
- Table possible pour 2 à 10 personnes, par message ou par téléphone.

## Paiement
- Espèces ou carte à la livraison.`,
  };
  const STORE = "demo-settings";
  let S = { ...DEFAULTS }, history = [], busy = false, clockTimer;
  try { Object.assign(S, JSON.parse(localStorage.getItem(STORE) || "{}")); } catch {}

  // Mode démo : config + clé + expiration transportées dans le lien (#d=...), gardées le temps de l'onglet seulement.
  const DEMO_KEY = "demo-link";
  const enc = (o) => btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const dec = (t) => JSON.parse(decodeURIComponent(escape(atob(t.replace(/-/g, "+").replace(/_/g, "/")))));
  function loadDemo() {
    try {
      const m = location.hash.match(/^#d=(.+)$/);
      let raw;
      if (m) { raw = m[1]; sessionStorage.setItem(DEMO_KEY, raw); window.history.replaceState(null, "", location.pathname + location.search); }
      else raw = sessionStorage.getItem(DEMO_KEY);
      const d = raw && dec(raw);
      return d && d.exp ? d : null;
    } catch { return null; }
  }
  const demo = loadDemo();
  if (demo) { S = { ...DEFAULTS, ...demo.cfg }; document.body.classList.add("demo"); }
  function save() { if (demo) return; try { localStorage.setItem(STORE, JSON.stringify(S)); } catch {} }
  function endDemo() { document.body.innerHTML = '<div class="ended">Démo terminée</div>'; }
  const demoExpired = () => demo && Date.now() > demo.exp;

  const FIELDS = { provider: "s-provider", key: "s-key", model: "s-model", gkey: "s-gkey", gmodel: "s-gmodel", handle: "s-handle", subname: "s-subname", clock: "s-clock", company: "s-company", welcome: "s-welcome", instr: "s-instr", base: "s-base" };

  function applyHeader() {
    $("account").textContent = S.handle;
    $("subname").textContent = S.subname;
    $("verified").style.display = S.verified ? "" : "none";
    const av = $("avatar");
    if (S.photo) { av.textContent = ""; av.style.backgroundImage = `url(${S.photo})`; av.classList.add("photo"); }
    else { av.style.backgroundImage = ""; av.classList.remove("photo"); av.textContent = (S.handle || "?").replace(/[^a-z0-9]/gi, "").slice(0, 2); }
    clearInterval(clockTimer);
    const clock = $("clock");
    const tick = () => { clock.textContent = new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }); };
    if ((S.clock || "").trim().toLowerCase() === "auto") { tick(); clockTimer = setInterval(tick, 10000); }
    else clock.textContent = S.clock || "23:45";
  }

  function showProvider() {
    document.querySelectorAll("[data-prov]").forEach((d) => { d.hidden = d.dataset.prov !== S.provider; });
  }

  function initPanel() {
    for (const [k, id] of Object.entries(FIELDS)) {
      const el = $(id); el.value = S[k];
      el.addEventListener("input", () => { S[k] = el.value; save(); applyHeader(); showProvider(); });
    }
    showProvider();
    const ver = $("s-verified"); ver.checked = S.verified;
    ver.addEventListener("change", () => { S.verified = ver.checked; save(); applyHeader(); });
    $("s-photo-btn").addEventListener("click", () => $("s-photo").click());
    $("s-photo").addEventListener("change", (e) => {
      const f = e.target.files[0]; if (!f) return;
      const img = new Image();
      img.onload = () => {
        const c = document.createElement("canvas"); c.width = c.height = 128;
        const m = Math.min(img.width, img.height);
        c.getContext("2d").drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, 128, 128);
        S.photo = c.toDataURL("image/jpeg", .85); save(); applyHeader();
      };
      img.src = URL.createObjectURL(f);
    });
    $("s-apply").addEventListener("click", start);
    $("s-link").addEventListener("click", async () => {
      const cfg = { ...S };
      delete cfg[S.provider === "gemini" ? "key" : "gkey"]; // ne pas envoyer la clé de l'autre fournisseur
      const mins = Math.max(1, parseInt($("s-mins").value, 10) || 30);
      const url = location.href.split("#")[0] + "#d=" + enc({ cfg, exp: Date.now() + mins * 60000 });
      const b = $("s-link"), label = b.textContent;
      try { await navigator.clipboard.writeText(url); b.textContent = `Lien copié (valable ${mins} min)`; }
      catch { prompt("Copie ce lien :", url); }
      setTimeout(() => { b.textContent = label; }, 3000);
    });
    $("s-wipe").addEventListener("click", () => {
      const b = $("s-wipe");
      if (!b.dataset.sure) {
        b.dataset.sure = "1"; b.textContent = "Confirmer : tout effacer (clé API incluse)";
        setTimeout(() => { delete b.dataset.sure; b.textContent = "Tout effacer (valeurs par défaut)"; }, 4000);
        return;
      }
      try { localStorage.removeItem(STORE); } catch {}
      location.reload();
    });
    $("gear").addEventListener("click", () => { const p = $("panel"); p.hidden = !p.hidden; });
  }

  function init() {
    if (demoExpired()) return endDemo();
    if (demo) setInterval(() => { if (demoExpired()) endDemo(); }, 10000);
    initPanel();
    applyHeader();
    $("reset").addEventListener("click", start);
    start();
  }

  function start() {
    history = [];
    busy = false;
    messagesEl.innerHTML = "";
    if (S.welcome) addMessage("agent", S.welcome);
    updateSend();
    input.focus();
  }

  function setStatus(label) {
    const old = messagesEl.querySelector(".status");
    if (old) old.remove();
    if (!label) return;
    const el = document.createElement("div");
    el.className = "status";
    el.textContent = label;
    messagesEl.appendChild(el);
    scrollDown();
  }

  function addMessage(role, text) {
    if (role !== "user") setStatus("");
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
    const defaut = "Langue par défaut : français.";
    const langue = [
      "LANGUE (obligatoire) : réponds toujours dans la langue et le style du dernier message du client.",
      "- Si le client écrit en darija tunisienne avec des lettres latines et des chiffres (arabizi : 3asslema, t9i9a, su2el, 7aja, ch7al, barcha, behi, yaatik essa7a...), réponds en darija tunisienne arabizi, naturelle, avec les mêmes conventions (3, 7, 9, 5, 8, 2). Reste poli et professionnel, sans argot excessif.",
      "- Si le client écrit en français, réponds en français. S'il mélange français et darija, fais pareil.",
      "- Si le client écrit en arabe (alphabet arabe) ou en anglais, réponds dans cette langue.",
      "- Les noms de produits, les prix et les horaires restent exacts, tels qu'ils figurent dans la base.",
      defaut,
    ].join("\n");
    return [
      `Tu es l'agent de messagerie Instagram de l'entreprise « ${S.company} ». Tu discutes par DM avec ses clients.`,
      S.instr || "",
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
      S.base,
      "=== FIN DE LA BASE ===",
    ].join("\n\n");
  }

  function errorMessage(status, type) {
    if (status === 401 || status === 403) return "Clé API invalide ou non autorisée.";
    if (status === 429 || type === "rate_limit_error" || type === "RESOURCE_EXHAUSTED") return "Quota ou limite de requêtes dépassé. Réessaie dans un instant.";
    if (status === 402 || /credit|billing/i.test(type || "")) return "Crédit API insuffisant.";
    if (status >= 500) return "Service momentanément indisponible. Réessaie.";
    return "Une erreur est survenue. Réessaie.";
  }

  async function send(text) {
    if (demoExpired()) return endDemo();
    busy = true; updateSend();
    addMessage("user", text);
    setStatus("Envoyé");
    history.push({ role: "user", content: text });
    const typing = showTyping();
    const started = Date.now();

    try {
      const gem = S.provider === "gemini";
      const key = (gem ? S.gkey : S.key).trim();
      if (!key) throw new Error(`Ajoute ta clé API ${gem ? "Gemini" : "Claude"} dans les réglages (⚙️).`);
      let res;
      try {
        res = gem
          ? await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${S.gmodel}:generateContent`, {
              method: "POST",
              headers: { "content-type": "application/json", "x-goog-api-key": key },
              body: JSON.stringify({
                systemInstruction: { parts: [{ text: systemPrompt() }] },
                contents: history.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
                generationConfig: { maxOutputTokens: 600 },
              }),
            })
          : await fetch(API_URL, {
              method: "POST",
              headers: {
                "content-type": "application/json",
                "x-api-key": key,
                "anthropic-version": "2023-06-01",
                "anthropic-dangerous-direct-browser-access": "true",
              },
              body: JSON.stringify({ model: S.model, max_tokens: 600, system: systemPrompt(), messages: history }),
            });
      } catch {
        throw new Error("Problème de connexion. Vérifie ton réseau.");
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(errorMessage(res.status, data?.error?.type));
      const reply = gem
        ? (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("").trim()
        : (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("").trim();
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

// Mobile: colle le téléphone à la zone réellement visible (clavier ouvert), quel que soit le modèle
if (window.visualViewport) {
  const vv = window.visualViewport, phone = document.querySelector('.phone');
  const fit = () => {
    if (window.innerWidth > 480) { phone.style.height = phone.style.top = ''; return; }
    phone.style.height = vv.height + 'px';
    phone.style.top = vv.offsetTop + 'px';
  };
  vv.addEventListener('resize', fit);
  vv.addEventListener('scroll', fit);
  window.addEventListener('scroll', () => { if (window.innerWidth <= 480) window.scrollTo(0, 0); });
  fit();
}
