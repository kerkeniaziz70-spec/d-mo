// Configuration du client. Copie ce dossier, renomme-le, puis remplis les champs.
window.CLIENT_CONFIG = {
  // Nom de l'entreprise (utilisé dans les instructions de l'agent)
  entreprise: "Boutique Exemple",

  // Nom du compte Instagram affiché dans l'en-tête du chat
  compteInstagram: "boutique.exemple",

  // Initiales affichées dans l'avatar rond (1 à 2 lettres)
  initiales: "BE",

  // Premier message de l'agent, affiché à l'ouverture de la démo
  messageAccueil: "Bonjour 👋 Bienvenue chez Boutique Exemple ! Comment puis-je vous aider ?",

  // Langue par défaut : "fr" ou "darija". L'agent s'adapte de toute façon à la langue du client (français, arabizi, arabe, anglais).
  langue: "fr",

  // Instructions de l'agent : rôle, ton, horaires, consignes particulières
  instructions: `
Tu es l'assistant Instagram de Boutique Exemple.
Ton rôle : accueillir les clients, répondre à leurs questions et les aider à commander.
Ton : chaleureux, professionnel, phrases courtes, quelques emojis maximum.
Contact humain : contact@boutique-exemple.com ou +216 00 000 000.
`,

  // Modèle Claude utilisé
  modele: "claude-haiku-5-5",
};
