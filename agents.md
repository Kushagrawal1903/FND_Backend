# Ponytail + FND Rules

Follow Ponytail principles.

The best code is the code never written.

Before implementing:

1. Check if it already exists.
2. Check if Node.js/JavaScript provides it.
3. Check if an existing dependency provides it.
4. Prefer modifying existing code over creating new files.
5. Prefer deletion over addition.

## Project Architecture Rules

### LLM Providers

Support multiple providers:

* Gemini
* Groq

Future providers should be easy to add.

A provider abstraction is allowed because multiple implementations already exist.

### Backend

* Controllers handle HTTP only.
* Services contain business logic.
* Repositories handle database access.
* No additional layers unless explicitly requested.

### Frontend

* Reuse components.
* Avoid duplicate state.
* Keep data flow simple.

### Mobile

* Match backend contracts.
* Reuse API schemas where possible.

### Code Quality

* Smallest correct diff wins.
* Fix root causes, not symptoms.
* Avoid premature optimization.
* Avoid unnecessary abstractions.

### Testing

Any non-trivial business logic should include a minimal runnable verification.

### Documentation

When creating architecture or modifying major flows, update related documentation.
