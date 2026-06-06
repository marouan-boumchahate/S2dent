const faqs = [
  (
    question: "What is S2dent?",
    answer:
        "It's your academic wallet. Every credential your university gives you (degrees, certificates, transcripts, attendance records, all of it) lives here. You own it and you control it.",
  ),
  (
    question: "Why should I trust the credentials in my wallet?",
    answer:
        "Because they're on the blockchain. When your university issues a credential, it gets saved on-chain and signed. That means no one can fake it, edit it, or delete it. Anyone who checks it gets a real answer from the chain.",
  ),
  (
    question: "What's the Decrypt button for?",
    answer:
        "The sensitive stuff in your credential (grades, GPA, scores, personal info) is encrypted. Only you can open it using your private key. We don't store it in plain text anywhere, that's on purpose. Tap Decrypt, enter your key, and it shows up just for you.",
  ),
  (
    question: "What is a private key and why do I need one?",
    answer:
        "Your private key is what proves you're you on the blockchain. In S2dent it's used to decrypt your credential data and to sign QR codes when you want someone to verify a credential. Keep it safe and don't share it with anyone. If you lose it, you lose access to your encrypted data.",
  ),
  (
    question: "How does sharing a credential work?",
    answer:
        "You pick the credential you want to share and generate a QR code from it. The verifier scans it, it checks the blockchain, and they get a result. You're always the one doing it, nothing gets shared on its own.",
  ),
  (
    question: "What is the Signature Schema?",
    answer:
        "It's the structure of the data your institution signed when the credential was issued. It's not sensitive at all, it's public by design. It basically shows that the right person signed the right thing on the right smart contract.",
  ),
  (
    question: "What does it mean when a credential is revoked?",
    answer:
        "It means the institution that issued it cancelled it. They usually include a reason. The credential stays in your wallet so you can still see it, but anyone who tries to verify it will get a revoked result.",
  ),
  (
    question: "What kind of credentials can I have?",
    answer:
        "Degrees, certificates, transcripts, enrollment records, attendance records, and achievements. Whatever your institution has officially issued to you will show up here.",
  ),
  (
    question: "Can I search or filter my credentials?",
    answer:
        "Yeah. You can search by name, filter by status, and sort by date or name. Pretty useful once you have a few credentials in your wallet.",
  ),
  (
    question: "My wallet is empty, is something wrong?",
    answer:
        "Probably not. It just means your institution hasn't issued anything to your account yet. They'll show up on their own once they do.",
  ),
  (
    question: "Who can actually see my credential data?",
    answer:
        "Only you. The encrypted part of your credential can only be read with your private key. Even we can't see it. Verifiers only get what the blockchain confirms, not your actual data.",
  ),
  (
    question: "Does dark mode change anything about my data?",
    answer:
        "Nope, it's just how the app looks. Your credentials, private key, and everything else stay exactly the same.",
  ),
];
