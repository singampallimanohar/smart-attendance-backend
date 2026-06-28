const express = require("express");
const router = express.Router();

const privacyPolicy = `
Smart Attendance System Privacy Policy

We collect:
- Name
- Email
- Face Images
- Attendance Records

Purpose:
Authentication and attendance management.

Your data is stored securely.
`;

const termsOfService = `
Smart Attendance System Terms of Service

By using this application you agree:

- Use the application responsibly.
- Do not misuse the system.
- Administrators may suspend accounts violating the rules.
`;

router.get("/privacy-policy", (req, res) => {
    res.type("text/plain").send(privacyPolicy);
});

router.get("/terms", (req, res) => {
    res.type("text/plain").send(termsOfService);
});

module.exports = router;