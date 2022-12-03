# deaddop

*deaddrop* is an e2e enncrypted secret sharing platform that leverages the [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API).

## How it Works

Utilizing public key infrastructure patterns, deaddrop uses AES (with GCM) and Eliptical Curve (ECDH) cryptographic methods to generate keys and obfuscate payloads then SHA-256 is used after handoff for verifying data integrity. All keys are exchanged through peer-to-peer connections over WebRTC allowing all key and payload communications to remain solely between the two peers ("dropper" and "grabber") and are not logged or tracked by any server-side functionality. An opaque drop ID, the dropper's peer ID, and a nonce for the drop session are stored in a redis instance. The dropper's peer ID and nonce are then retrieved for the grabber by sending GET request to the `/api/drop` endpoint.

![deaddrop diagram](assets/deaddrop.jpeg)
