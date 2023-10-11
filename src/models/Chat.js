const mongoose = require( 'mongoose' );
const { Schema } = require( 'mongoose' );

class ChatModel {

    initSchema() {
        const schema = new Schema( {
            'users': [ { 'user_id': { 'type': String }, 'unseen_messages_count': { 'type': Number }, 'user_name': { 'type': String }, 'profile_pic': { 'type': String }, 'adresse': {'type':String} } ],
            'last_message': { 'content': { 'type': String }, 'Date': { 'type': Date, 'default': Date.now()}, 'sender': String },
            'map_key': {'type': String, 'unique': true }
        }, { 'timestamps': true } );

        schema.index(
            { 'map_key':1 }, 
        );


        try {
            mongoose.model( 'chat', schema );
        } catch ( e ) {

        }


    }


    getInstance() {
        this.initSchema();
        return mongoose.model( 'chat' );
    }

    
}

const Chat = new ChatModel().getInstance();


module.exports = { Chat, ChatModel };
