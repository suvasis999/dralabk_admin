const mongoose = require( 'mongoose' );
const { Schema } = require( 'mongoose' );

class NotificationModel {

    initSchema() {
        const schema = new Schema( {
            'to': {'type': mongoose.Schema.Types.ObjectId, 'ref': 'user'},
            'isSeen': { 'type': Boolean, 'default':true },
            'title': { 'type': String },
            'body': {'type':String},
            'link': {'type':String}
        }, { 'timestamps': true } );

        schema.index(
            {'createdAt':1, 'to':1 }
        )
        schema.index(
            { 'to':1 }, 
        );

        try {
            mongoose.model( 'notification', schema );
        } catch ( e ) {
            
        }

      
    }


    getInstance() {
        this.initSchema();
        return mongoose.model( 'notification' );
    }
    
    
}

const Notification = new NotificationModel().getInstance();

module.exports = { Notification, NotificationModel };



