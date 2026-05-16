# Security

This repository contains the public frontend UI and documentation. Core backend services and infrastructure remain private.

## Data handling

- No plaintext passwords are stored in the repository.
- No production secrets are checked in.
- API keys, service-role keys, JWT secrets, sync secrets, and payment secrets must come from environment variables or a secret manager.
- Example env files contain placeholders only.

## Operational controls

- Sensitive files such as `.env`, `.env.local`, uploads, logs, and build outputs should remain untracked.
- Production access should use least-privilege credentials.
- Authentication, payment, and sync integrations should be configured outside the public repo.

## Transparency notes

This public repo should be used to describe:

- product overview
- security posture
- privacy and data-handling principles
- public frontend workflows
- contact path for security issues

## Recommended public disclosures

- what user data is collected
- where data is stored
- how secrets are managed
- whether credentials are encrypted
- how to report a vulnerability
