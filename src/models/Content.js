const mongoose = require( 'mongoose' );
const { Schema } = require( 'mongoose' );
const uniqueValidator = require( 'mongoose-unique-validator' );

class ContentModel {

    initSchema() {
        // database schema
        
        try {
            mongoose.model( 'content', schema );
        } catch ( e ) {
            
        }

    }


    getInstance() {
        this.initSchema();
        return mongoose.model( 'content' );
    }

    
}

const Content = new ContentModel().getInstance();

module.exports = { Content };
