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

    // Replace with your MySQL insert query

    return res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        name,
        email,
        password: hashedPassword
      }
    });

  } catch (err) {
    console.error(err);

    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;