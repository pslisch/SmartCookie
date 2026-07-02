# Event Index

This index catalogs custom events, webhooks, state broadcasts, and message payloads utilized in SmartCookie.

---

## 🔔 Event Registry Schema

Every documented event should eventually include:
- **Event Identifier**: Code-level topic name.
- **Producer**: Component or service emitting the message.
- **Consumer**: Components or services tracking the message.
- **Payload**: Standard structure of the serializable arguments.

---

## 🟢 Event Hub (v1.0.0)

There is **no global event bus** active in the v1.0.0 foundation. Component synchronization is managed via React prop drilling.
