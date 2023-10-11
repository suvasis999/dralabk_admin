const mongoose = require( 'mongoose' );
const { Schema } = require( 'mongoose' );

class ChangeModel {

    initSchema() {

        const schema = new Schema( {
            'object_id': String,
            'owner_id': { 'type': Schema.Types.ObjectId, 'ref': 'user' },
            'old_values': {},
            'new_values': {},
            'object_type': { 'type': String }
        }, { 'timestamps': true } );

        schema.set( 'toObject', { 'virtuals': true } );
        schema.set( 'toJSON', { 'virtuals': true } );

        schema.index({'object_id':1})
        schema.virtual( 'author', {
            'ref': 'user',
            'localField': 'owner_id',
            'foreignField': '_id',
            'justOne': true
        }
        );
        
        schema.methods.delete = async function() {
            const id = this[ '_id' ];
            
            return mongoose.model( 'course' ).findByIdAndDelete( id );
        };
        
        try {
            mongoose.model( 'change', schema );
        } catch ( e ) {

        }


    }

    

    getInstance() {
        this.initSchema();
        return mongoose.model( 'change' );
    }

    
}

const Change = new ChangeModel().getInstance();

module.exports = { Change, ChangeModel };
