const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const QuoteSchema = new Schema({
    _id: {type:Schema.Types.ObjectId, auto:true},
    text: {type:String, required:true},
    author: {type:String, default:'Anonymous'},
    creator: {type:Schema.Types.ObjectId, ref:'User'},
    category: {type:String},
    hashtags: [{type:String}],
    likes: {type:Number, default:0},
    saves: {type:Number, default:0},
    requotes: {type:Number, default:0},
    reactions: {type:Map, of:Number, default:{}},
    createdAt: {type:Date, default:Date.now}
});

const Quote = mongoose.model('Quote', QuoteSchema);
module.exports = Quote;