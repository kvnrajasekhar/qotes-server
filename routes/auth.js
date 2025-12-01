const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

router.post('/login', async(req,res)=>{
    const { username, password } = req.body;
    const user = db.findUserByUsername(username);
    if(!user){
        return res.status(401).json({message:'Invlalid credentials'});
    }

    try{
        const isvalidPassword = await bcrypt.compare(password,user.password);
        if(!isvalidPassword){
            return res.status(401).json({message:'Invalid credentials'});
        }
        const payload = {
            userId : user.id,
            username : user.username
        };
        const JWT_SECRET = process.env.JWT_SECRET;
        const token = jwt.sign(payload,JWT_SECRET,{expiresIn:'1h'});
        //stroe this token in cookie on client side
        res.cookie('token', token, { httpOnly: true, secure: true, maxAge: 3600000 }); // 1 hour expiration
        
        res.json({
            message:'Login successful',
            token: token, // store this in local storage or cookie
            userId: user.id
        })
    } catch(error){
        console.error('Error during login:',error);
        res.status(500).json({message:'Internal server error'});
    }
    
});



router.post('/signup',async(req,res)=>{
    const { username, password } = req.body;
    const existingUser = db.findUserByUsername(username);
    if(existingUser){
        return res.status(409).json({message:'Username already exists'});
    }
    const hashedPassword = await bcrypt.hash(password,10);
    const newUser = {
        id: db.generateUserId(),
        username: username,
        password: hashedPassword
    };
    db.saveUser(newUser);
    res.status(201).json({message:'User registered successfully'});

});

module.exports = router;