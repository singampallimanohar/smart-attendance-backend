const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../config/db");

const loginUser = async (req, res) => {
  try {

    const { email, password } = req.body;

    // Check admin table
    const [users] = await db.query(
      "SELECT * FROM admins WHERE username = ?",
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Incorrect email or password"
      });
    }

    const user = users[0];

    // Compare password
    const match = await bcrypt.compare(
      password,
      user.password
    );

    if (!match) {
      return res.status(401).json({
        success:false,
        message:"Invalid Password"
      });
    }


    const token = jwt.sign(
      {
        id:user.id,
        username:user.username
      },
      process.env.JWT_SECRET || "secretkey",
      {
        expiresIn:"24h"
      }
    );


    return res.json({
      success:true,
      message:"Login successful",
      token
    });


  } catch(error){

    console.log(error);

    return res.status(500).json({
      success:false,
      message:"Server error"
    });

  }
};


module.exports = {
  loginUser
};