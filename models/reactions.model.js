const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ReactionSchema = new Schema({
    _id: {type:Schema.Types.ObjectId, auto:true},
    quote: {type:Schema.Types.ObjectId, ref:'Quote', required:true},
    user: {type:Schema.Types.ObjectId, ref:'User', required:true},
    type: {type:String, enum:['like', 'inspriring', 'thoughtful', 'realatable', 'eye-opening'], required:true},
    createdAt: {type:Date, default:Date.now}
});

const Reaction = mongoose.model('Reaction', ReactionSchema);
module.exports = Reaction;