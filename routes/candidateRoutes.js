const express = require('express');
const router = express.Router();
const User = require('../models/user');
const {jwtAuthMiddleware, generateToken} = require('../jwt');
const Candidate = require('../models/candidate');

//checking if the role of the data is 'admin'
const checkAdminRole = async(userID) => {
    try{
        const user = await User.findById(userID);
        if(user.role == 'admin'){
            return true;
        }
    }catch(err){
        return false;
    }
}

//route to make changes and is restricted only to 'admin'
router.post('/', jwtAuthMiddleware, async(req, res) => {
    try{
        if(!(await checkAdminRole(req.user.id))){
            return res.status(403).json({error: 'You do not have admin role'});
        }
        const data = req.body //taking the data from req
        const newCandidate = new Candidate(data); //creating new user with mongoose model

        const response = await newCandidate.save(); //saving the data
        console.log('Data Saved');
        res.status(200).json({response: response});
    } catch(err){
        console.log(err);
        res.status(500).json({error: 'Internal Server Error'});
    }
})

//route to create a new candidate
router.put('/:candidateID', jwtAuthMiddleware, async(req, res) => {
    try{
        if(!checkAdminRole(req.user.id)) return res.status(403).json({error: 'You do not have admin role'});

        const candidateID = req.params.candidateID; //take input from the urls
        const updatedCandidateData = req.body; //for updating the data

        const response = await Candidate.findByIdAndUpdate(candidateID, updatedCandidateData, {
            new: true, //returns new updated data
            runValidators: true, //runs mongoose validation
        })

        if(!response){
            return res.status(400).json({error: 'Candidate not found'});
        }

        console.log('Candidate Data Updated');
        return res.status(200).json(response);
    } catch(err){
        console.log(err);
        res.status(500).json({error: 'Internal Server Error'});
    }
})

//route to delete a candidate from the list
router.delete('/:candidateID', jwtAuthMiddleware, async(req, res) => {
    try{
        if(!checkAdminRole(req.user.id)) return res.status(403).json({error: 'You do not have admin role'});
        
        const candidateID = req.params.candidateID; //taking the input id from url
        const response = await Candidate.findByIdAndDelete(candidateID);

        if(!response){
            return res.status(400).json({error: 'Candidate not found'});
        }

        console.log('Candidate Data Deleted');
        return res.status(200).json(response);
    }catch(err){
        console.log(err);
        res.status(500).json({error: 'Internal Server Error'});
    }
})

//route to vote for a candidate
router.get('/vote/:candidateID', jwtAuthMiddleware, async(req, res) => {
    candidateID = req.params.candidateID;
    userId = req.user.id;
    try{

        //base cases: - candidate not found - user not found - admin is trying to vote
        const candidate = await Candidate.findById(candidateID);
        if(!candidate){
            return res.status(404).json({message: 'Candidate not found'});
        }

        const user = await User.findById(userId);
        if(!user){
            return res.status(404).json({message: 'User not found'});
        }

        if(user.role == 'admin'){
            return res.status(404).json({message: 'Admin not allowed'});
        }

        candidate.votes.push({user: userId});
        candidate.voteCount++;
        await candidate.save();

        user.isVoted = true;
        await user.save();

        return res.status(200).json({message: 'Voted succesfully'});
    }catch(err){
        console.log(err);
        res.status(500).json({error: 'Internal Server Error'});
    }
})

// //route to get the no.of votes
// router.get('/vote/count', async (req, res) => {
//     try{
//         // Find all candidates and sort them by voteCount in descending order
//         const candidate = await Candidate.find().sort({voteCount: 'desc'});

//         // Map the candidates to only return their name and voteCount
//         const voteRecord = candidate.map((data)=>{
//             return {
//                 party: data.party,
//                 count: data.voteCount
//             }
//         });

//         return res.status(200).json(voteRecord);
//     }catch(err){
//         console.log(err);
//         res.status(500).json({error: 'Internal Server Error'});
//     }
// });


//route to get list of all candidates with their party name
router.get('/', async(req, res) => {
    try{
        const candidates = await Candidate.find({}, 'name_party_id');
        res.status(200).json(candidates);
    }catch(err){
        console.log(err);
        res.status(500).json({error: 'Internal Server Error'});
    }
})

module.exports = router;
