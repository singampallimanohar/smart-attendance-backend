const bcrypt = require("bcrypt");

const hashedPassword = await bcrypt.hash(password, 10);

await db.query(
  "INSERT INTO students(name,email,password) VALUES(?,?,?)",
  [name,email,hashedPassword]
);
const jwt = require('jsonwebtoken');

// Replace this with MySQL query
const users = [
  {
    id: 1,
    email: 'admin@gmail.com',
    password:
      '$2b$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7m2VxRcbk6VwBEm90LkAMPm'
  }
];

const loginUser = async (req, res) => {
  try {

    const { email, password } = req.body;

    const user = users.find(u => u.email === email);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect email or password'
      });
    }

    const bcrypt = require("bcrypt");

    const match = await bcrypt.compare(
        password,
        user.password
    );

    if(!match){
      return res.status(401).json({
          success:false,
          message:"Invalid Password"
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email
      },
      process.env.JWT_SECRET || 'secretkey',
      {
        expiresIn: '24h'
      }
    );

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token
    });

  } catch (err) {

    console.error(err);

    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = {
  loginUser
};