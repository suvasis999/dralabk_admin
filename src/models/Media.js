const mongoose = require( 'mongoose' );
const { Schema } = require( 'mongoose' );

class MediaModel {

    initSchema() {
        const schema = new Schema( {
            'uploader_id': {
                'type': String
            },
            'originalname': {
                'type': String,
                'required': false,
            },
            'encoding': {
                'type': String,
                'required': false,
            },
            'mimetype': {
                'type': String,
                'required': false,
            },
            'filename': {
                'type': String,
                'required': false,
            },
            'path': {
                'type': String,
                'required': false,
            },
            'type': {
                'type': String,
                'enum': ['image','chat','attachment']
            }
            ,
            'status': {
                'type': String,
                'default': 'unlinked',
                'enum': [ 'linked', 'unlinked' ]
            },
            'size': {
                'type': Number,
                'required': false,
            }
        }, { 'timestamps': true } );

        schema.index(
            { 'status': 1  },
        );

        try {
            mongoose.model( 'media', schema );
        } catch ( e ) {

        }

    }

    getInstance() {
        this.initSchema();
        return mongoose.model( 'media' );
    }
    
}

const Media = new MediaModel().getInstance();

module.exports = { Media, MediaModel };
