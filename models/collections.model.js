const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CollectionSchema = new Schema({
    _id: {type:Schema.Types.ObjectId, auto:true},
    owner: {type:Schema.Types.ObjectId, ref:'User', required:true},
    name: {type:String, required:true},
    description: {type:String, default:''},
    isPrivate: {type:Boolean, default:false},
    quotes: [{type:Schema.Types.ObjectId, ref:'Quote'}],
    createdAt: {type:Date, default:Date.now}
});

const Collection = mongoose.model('Collection', CollectionSchema);
module.exports = Collection;