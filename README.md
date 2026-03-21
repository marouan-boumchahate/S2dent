# S2dent

## So, what is this project?

S2dent is a system we built to manage academic records and credentials using blockchain technology. The basic idea is simple instead of storing student data in one place that can be hacked, edited, or lost, we spread it across a blockchain network where nobody can secretly change anything.

We built this because the current systems used by most universities have real problems. Data can be tampered with, servers can go down, and it is way too easy to fake a diploma. We wanted to fix that.

---

## Why blockchain?

Okay, so you might be wondering why not just use a regular database?

The problem with regular databases is that someone always controls them. That one person or team can edit the data, lose it, or get hacked. Blockchain removes that risk. Once something is written to the blockchain, it stays there. Nobody can quietly go in and change a grade or create a fake degree.

That is the core idea behind S2dent.

---

## What does the system actually do?

Here is what you can do with S2dent depending on who you are:

**If you are a student:**
- You issue your own digital academic identity
- You can view all your credentials in the mobile app
- You can generate a QR code to share your credentials with anyone an employer, another university, whoever needs it

**If you are a university:**
- You use the web dashboard to issue official credentials to students
- You can also revoke a credential if something goes wrong
- YOu can also issue professors identities

**If you are a verifier (employer, institution, etc.):**
- You just scan the QR code
- The system checks the blockchain and tells you instantly if the credential is real
- No phone calls, no emails, no waiting

---

## How does it all work together?

The flow is pretty straightforward:

1. University issues a credential → it gets stored on the blockchain
2. Student opens the app, generates a QR code for that credential
3. Verifier scans the QR code → blockchain confirms if it is real or not

No middleman. No paperwork. Just a scan and an answer.

---

## What did we build it with?

We used a mix of technologies across different parts of the project:

**Mobile app** (for students and verifiers) → Flutter

**Web dashboard** (for universities) → React.js

**Backend** (the server that connects everything) → Node.js + Express.js, with Ethers.js for talking to the blockchain

**Blockchain** → Ethereum network

**Smart contracts** (the programs that run on the blockchain) → written in Solidity

---

## How is the code organized?

We split the project into four main folders:

- `api` — backend logic and services
- `app` — the mobile app
- `blockchain` — smart contracts and blockchain setup
- `web` — the university dashboard

---

## How do I run it?

You will need:

- Node.js
- Flutter SDK
- The Ethereum development environment (Hardhat)

For each part of the project, just install the dependencies, set up the environment variables, and connect to the blockchain network. Nothing too unusual if you have worked with these tools before.

---

## A bit more about smart contracts

Smart contracts are basically programs that live on the blockchain and run automatically. No one needs to manually approve anything the contract handles it.

In S2dent, the smart contracts take care of:

- Issuing credentials
- Managing identities
- Verifying whether something is valid

Because they are on the blockchain, they cannot be secretly changed after deployment. What you write is what runs, every time.

---

## Is it secure?

We put a lot of thought into security. Here is what protects the data:

- Every identity uses cryptographic keys you are the only one who holds your key
- Blockchain records cannot be edited or deleted after they are written
- There is no central server that someone can attack or shut down
- Students control with who can share their own records

---

## Honest limitations

We want to be upfront this project is not perfect, and there are real challenges:

- **Scalability** —> as more users join, the system slows down. Public blockchains were not really designed for this kind of load
- **Speed** —> blockchain transactions are slower than regular databases
- **Privacy** —> public blockchains are visible to everyone, which is tricky for sensitive student data
- **Fees** —> every Ethereum transaction costs money (gas fees), which adds up
- **Regulations** —> there are no clear global rules yet for using blockchain in education, so it gets complicated legally [Source]([https://your-url.com](https://pdf.sciencedirectassets.com/778493/1-s2.0-S2096720923X00050/1-s2.0-S2096720923000404/main.pdf?X-Amz-Security-Token=IQoJb3JpZ2luX2VjEIb%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaCXVzLWVhc3QtMSJGMEQCIAg8UKStLWERCpUt7%2F3Wh7PYMtQW7kK2L8Rfa33jkyArAiA7LwIRapAkDZyS5QOyXvc9ZHDIxtYsV1sw%2F8FBnqnPtiqzBQhOEAUaDDA1OTAwMzU0Njg2NSIMAzXD1cTFi1eQSBOvKpAFOGRLZIxiw6j6z1BEjDnd8EiEWEuChmnLjZcm8g2jxQy%2BQaGhKDD0Q7v5%2BHLHLqDWxQVOnz4wL67hQY8cbAemAl%2FzDWYmi4gX7xUyxUtCL%2Fcz9%2F%2BOqnZbTK%2BYsBot91JAenwYxkgjwBee180P%2FudssDNs%2FGYQjPBvVI48S5u3eVwVEM2AU4exxjxh4%2FiE2ikLQS2f0b324syPjcZSYMJS7cgKHKHUijHCKbrK%2Fc%2B4OKzn%2Bvxy3Jft3YOihEd4fW3aN6lPqAYeXa4mQ5YB4llhgkKMqWxZf9mPC%2FtUI3KzI2u3U4yXvoF6Q4FvdcggesDVTn%2BV4ONWSjyFI4mLyOU%2Bjh%2BrnJVTLeY0MKpvQ1IUdN%2FG84L7nJCWj9Muj90nFAzkta812OJTPzfjnM5EmcoZ43mhV5i2g7sK8%2BSiYIOW%2FxfWbmATIgmePPrXdR9AHqnIojdDcRaRvsjasET3zcRJX7tRM5u2HsO4NP6dWON677RQVl21H4alOrZEhj1HYUK8MZmJuWRvtQxWte1URaYPFUQtousl2B3Br70FdaY62AouJozH4Utw0JmppMrDRm2SHSfayVWJ2KI7MXJpLBq838POJdDrpZiTpRmWmFBhpRilO89EreIcQQ0ud9uF70FhIzEcoRAZFwGTyMZlUemYqTm%2FhpKxAyUoesX4M2vv3gLSifTubN%2BOfWl9LUf%2FjVfia%2FAOzNqxvhgfqbZ96vrWeDK6aiS7D6HdRypfdRZ34ySsgyDpzbjGuDXIIRktxoYAsZuxgB81Y9TgXNTw%2B4ALIoFTy1XeYXCT%2FqDC3GeYQuLbTG6m3QzMMKRom2UaA29UqDSXRvK145vLFZo%2BpFIp1MBT46%2FFdxQzuMCXZyKk8Ksw37X6zQY6sgH%2BIRaiRT7xgitn9HXhRhXnJxYHcz5fXY5gcBaCikNMglRFEUWbIHl1qO99OClq%2B1JE2vuD6fP5icaFJVQQnyxl00EXp6r1z7OM3GJSU8wVoEHTTrmSWvnRnttY5Kae40JZMl1jXOubLzFuT%2FfhQFwv9wHTxIs17m5bid7DMfafk3yeF5uYQgVhjG50MMy0KbCKdQgn%2FScZlTQJi%2BcBMY0BdiBGl79uuiaflvagDUclpZCF&X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Date=20260321T142138Z&X-Amz-SignedHeaders=host&X-Amz-Expires=300&X-Amz-Credential=ASIAQ3PHCVTYW2JEUKEB%2F20260321%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Signature=14ca3e4c886de81e0477d1e8989fe396749db55e42b59d1b2d1437735c4e7329&hash=630251d291b32132cdcb390019f5cf1fc7b882f8fbbf6a52efb4f32b25018d7e&host=68042c943591013ac2b2430a89b270f6af2c76d8dfd086a07176afe7c76c2c61&pii=S2096720923000404&tid=spdf-407b24f2-c957-456e-a8e2-b15dcb47c728&sid=a4ff911f797256422068b5a7a5452f60a47cgxrqb&type=client&tsoh=d3d3LnNjaWVuY2VkaXJlY3QuY29t&rh=d3d3LnNjaWVuY2VkaXJlY3QuY29t&ua=14165f0b04055b0406&rr=9dfd9aaa5ec60c29&cc=tr))

---

## What comes next?

The next step we are thinking about is running a **private blockchain network**. That would make the whole thing faster, cheaper, and more private because only trusted participants would have access. It would solve most of the limitations we mentioned above.

---

## The team

- **Marouan Boumchahate** (APIs and Blockchain)
- **Ousama Jamal Eddin** (Mobile Application)
- **Osama Alchati** (Web Application)
