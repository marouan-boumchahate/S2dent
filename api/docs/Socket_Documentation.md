# S2dent Socket.io Documentation for Flutter Developers

This document explains how to integrate with the S2dent real-time notification system using WebSockets (Socket.io).

## 1. Overview
The S2dent API uses **Socket.io** to push real-time updates to mobile and web clients. Its primary use case is notifying users when their blockchain transactions (like identity issuance or credential creation) are confirmed or failed.

### Reliability Mechanism
The backend includes a **Pending Events** system. If a notification is generated while a user is offline, it is stored in a database and delivered automatically the next time the user connects and authenticates.

---

## 2. Connection Setup

### Endpoint
- **URL:** The same base URL as your API (e.g., `https://api.s2dent.com`)
- **Transport:** `websocket` is preferred.

### Authentication (`join`)
After the socket connects, you **must** authenticate to start receiving messages. The server will not send any user-specific data until this step is completed.

- **Event Name:** `join`
- **Payload:** `accessToken` (String) - The same JWT used for HTTP requests.

**Flow:**
1. Connect to the socket.
2. On `connect` event, emit `join` with the user's JWT.
3. The server validates the token and joins the socket to a private room based on the user's wallet address.

---

## 3. Listening for Events

The main event you need to handle is `notification`.

### Event: `notification`
This event is triggered for blockchain transaction updates.

**Payload Example:**
```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440000",
  "tx_hash": "0xabc...123",
  "status": "verified",
  "message": "Credential CRD_2024052501 has been successfully issued.",
  "created_at": "2024-05-25T10:00:00Z"
}
```

**Field Descriptions:**
- `eventId` (String/UUID): **Required for acknowledgement.**
- `tx_hash` (String): The blockchain transaction hash.
- `status` (String): Either `"verified"` (Success) or `"failed"` (Failure).
- `message` (String): A human-readable message for the user.
- `created_at` (String): ISO timestamp of the event.

---

## 4. Acknowledging Events (`ack_event`)

To prevent the same notification from being sent repeatedly, the client **must** acknowledge receipt of every event containing an `eventId`.

- **Event Name:** `ack_event`
- **Payload:** `eventId` (String)

If you do not acknowledge an event, it will remain in the "Pending" state in the database and will be re-sent the next time you call `join`.

---

## Summary for the Mobile Developer

1. **Room Logic:** You don't need to worry about rooms. The server handles this when you emit `join`.
2. **Persistence:** If the app is closed, notifications are saved. They will burst through as soon as you connect and `join` again.
3. **Mandatory ACK:** Never forget to emit `ack_event` with the `eventId` you just received. Without this, the server thinks you didn't get it.
