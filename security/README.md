# One-time HTTPS trust

Copy this folder to the second PC. Install `explorers-local-ca.crt` into **Current User > Trusted Root Certification Authorities** by double-clicking the certificate, or run `Trust-Explorers-Certificate.ps1` and approve Windows' certificate prompt.

Then open **https://172.31.98.222:8788**. The planner opens directly without a password or account.

Never bypass a browser warning. Never share any private key from `.secrets`. This folder contains only the public certificate and a trust helper.
