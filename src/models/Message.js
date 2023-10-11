const mongoose = require( 'mongoose' );
const { Schema } = require( 'mongoose' );

class MessagesModel {

    initSchema() {
        const schema = new Schema( {
            'message': { 'type': String },
            'room_id': {'type': mongoose.Schema.Types.ObjectId, 'ref': 'chat', 'required':true },
            'sender_id': {'type': String, 'required':true},
            'attachments': [ ],
            'message_type': { 'type': String },
            'isSeen': {'type': Boolean, 'default':false},
        }, { 'timestamps': true } );

        schema.index(
            {'createdAt':1}
        )
        
        schema.index(
            { 'room_id':1,'senderId':1 ,'isSeen': 1 }, 
        );

        schema.set( 'toObject', { 'virtuals': true } );
        schema.set( 'toJSON', { 'virtuals': true } );


        try {
            mongoose.model( 'message', schema );
        } catch ( e ) {
            
        }

      
    }


    getInstance() {
        this.initSchema();
        return mongoose.model( 'message' );
    }
    
    
}

const Message = new MessagesModel().getInstance();

module.exports = { Message, MessagesModel };



