const express = require('express');
const Joi = require('joi');
const bcrypt = require('bcrypt');

const router = express.Router();

const registerSchema = Joi.object({
  name: Joi.string().min(3).max(100).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required()
});

router.post('/', async (req, res) => {
  try {
    const { error } = registerSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid input'
      });
    }

   

    const { name, email, password } = req.body;

    const hashedPassword = await bcrypt.hash(password, 12);

    // Check if email already exists
    db.query(
      "SELECT id FROM students WHERE email = ?",
      [email],
      async (err, results) => {

        if (err) {
          console.error(err);
          return res.status(500).json({
            success: false,
            message: "Database error"
          });
        }

        if (results.length > 0) {
          return res.status(400).json({
            success: false,
            message: "Email already registered"
          });
        }

        db.query(
          "INSERT INTO students (name, email, password) VALUES (?, ?, ?)",
          [name, email, hashedPassword],
          (err, result) => {

            if (err) {
              console.error(err);
              return res.status(500).json({
                success: false,
                message: "Registration failed"
              });
            }

            return res.status(201).json({
              success: true,
              message: "Registration successful"
            });
          }
        );
      }
    );
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;