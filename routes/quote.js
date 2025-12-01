const express = require('express');
const Quote = require('../models/quote');
const router = express.Router();

router.post('/quotes',async(req,res)=>{
    const {quote,author,category,hashtags,taggedUsers} = req.body;
    if(!quote){
        return res.status(400).json({error:'Quote is required'});
    }
    
    const quoteData = {text:quote, author:author || 'Anonymous',category,hashtags,taggedUsers};
    const newQuote =  new Quote(quoteData);
    const savedQuote = await newQuote.save();

    return res.status(201).json({message:'Quote created successfully',data:savedQuote});
});

module.exports = router;