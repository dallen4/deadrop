# deadrop

*deadrop* is an e2e encrypted secret sharing extension that leverages the [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API) to share secrets directly between teammates and collaborators.

## How it Works

Using public key infrastructure patterns, deadrop uses AES (with GCM) and Elliptic Curve (ECDH) cryptographic methods to generate keys and obfuscate payloads, then SHA-256 is used after handoff for verifying data integrity. All key and payload communications remain solely between the two peers ("dropper" and "grabber") over a direct WebRTC connection.

## Usage

### Dropping a Secret

1. Open the deadrop panel from the activity bar
2. Select **Drop** mode
3. Paste or type your secret
4. Hit **Drop** then you'll get a drop ID to share with the recipient

### Grabbing a Secret

1. Open the deadrop panel from the activity bar
2. Select **Grab** mode
3. Enter the drop ID shared with you
4. Hit **Grab** then the secret will be decrypted and displayed directly in the panel

> **Note:** Anonymous drops are subject to a pretty low daily limit. [Sign up for a free account](https://deadrop.io) to get a higher limit.

## Coming Soon

- **Right-click to drop**: select any file in the explorer and drop it directly from the context menu
- **Vaults**: save and sync your secrets across machines without ever exposing them to a server

## More

- Web app: [deadrop.io](https://deadrop.io)
- CLI: `npx deadrop`
- Source: [github.com/dallen4/deadrop](https://github.com/dallen4/deadrop)
