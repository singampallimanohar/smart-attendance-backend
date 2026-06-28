const express = require('express');
const Joi = require('joi');
const { loginUser } = require('../controllers/authController');

const router = express.Router();

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required()
});

router.post('/login', async (req, res) => {
  const { error } = loginSchema.validate(req.body);

  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Incorrect email or password'
    });
  }

  return loginUser(req, res);
});

module.exports = router;