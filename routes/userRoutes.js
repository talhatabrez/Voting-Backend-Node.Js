const express = require('express');
const router = express.Router();
const User = require('../models/user');
const {jwtAuthMiddleware, generateToken} = require('../jwt');

//to add a new user (voter)
router.post('/signup', async(req, res) => {
    try{
        const data = req.body; //body contains the user data
        const adminUser = await User.findOne({role: 'admin'}); //check if there is only one admin
        if(data.role == 'admin' && adminUser){
            return res.status(400).json({error: 'Admin already exists, only one admin must exist..'})
        }

        //checking if adhaar card has only 12 digits..
        if(!/^\d{12}$/.test(data.aadharCardNumber)){
            return res.status(400).json({error: 'Aadhar card must have exactly 12 digits'});
        }

        //checking for existing user with same aadhaar
        const existingUser = await User.findOne({aadharCardNumber : data.aadharCardNumber});
        if(existingUser){
            return res.status(400).json({error: 'Aadhar card already exists'});
        }

        //creating a new user
        const newUser = await User(data);
        const response = await newUser.save();
        console.log('Data is saved');

        const payLoad = {
            id: response.id
        }
        console.log(JSON.stringify(payLoad));
        const token = generateToken(payLoad);
        
        res.status(200).json({ response : response, token: token});
    } catch(err){
        console.log(err);
        return res.status(500).json({error: 'Internal Server Error'});
    }
})

//route for logging in
router.post('/login', async(req, res) => {
    try{
        //taking the aadhaar card number as req
        const {aadharCardNumber, password} = req.body;

        //check if there is anything missing
        if(!aadharCardNumber || !password){
            return res.status(400).json({error: 'Missing Data'});
        }

        //finding the user
        const user = await User.findOne({aadharCardNumber: aadharCardNumber});

        //if it does not exist or any detail doesnt match then return error
        if(!user || !(await user.comparePassword(password))){
            return res.status(400).json({error: 'Data Error or doesnot exist'});
        }

        //to generate the token
        const payLoad = {
            id: user.id
        }
        const token = generateToken(payLoad);

        //response 
        res.json({token});
    } catch(err){
        console.log(err);
        return res.status(500).json({error: 'Internal Server Error'});
    }
})

//route for getting into the profile
router.get('/profile', jwtAuthMiddleware, async(req, res) => {
    try{
        const userData = req.user;
        const userId = userData.id;
        const user = await User.findById(userId);
        res.status(200).json({user});
    }catch(err){
        console.log(err);
        return res.status(500).json({error: 'Internal Server Error'});
    }
})

//route for modifications in the password of the user
router.put('/profile/password', jwtAuthMiddleware, async (req, res) => {
    try {
        const userId = req.user.id; // Extract the id from the token
        const { currentPassword, newPassword } = req.body; // Extract current and new passwords from request body

        // Check if currentPassword and newPassword are present in the request body
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Both currentPassword and newPassword are required' });
        }

        // Find the user by userID
        const user = await User.findById(userId);

        // If user does not exist or password does not match, return error
        if (!user || !(await user.comparePassword(currentPassword))) {
            return res.status(401).json({ error: 'Invalid current password' });
        }

        // Update the user's password
        user.password = newPassword;
        await user.save();

        console.log('password updated');
        res.status(200).json({ message: 'Password updated' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;