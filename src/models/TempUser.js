const mongoose = require( 'mongoose' );
const { Schema } = require( 'mongoose' );
const uniqueValidator = require( 'mongoose-unique-validator' );
const bcrypt = require( 'bcrypt' ),
    SALT_WORK_FACTOR = 10;


class UserTempModel {
    initSchema() {
        const schema = new Schema( {
            'name': {
                'type': String,
                'required': true,
        
            },
            'birth_date':{
                'type': String,
                
            }
            ,
            'middle_name': {
                'type': String,
                'required': false,
            },
            'last_name': {
                'type': String,
                'required': true,
            },
            'spirtual_name': {
                'type': String,
                'default': null
            },
            'sex': {
                'type': String,
                'enum': [ 'male', 'female' ],
            },
            'adresse_line_1': {
                'type': String
            },
            'adresse_line_2': {
                'type': String
            },
            'state': {
                'type': String,
            },
            'city': {
                'type': String
            },
            'zip_code': {
                'type': Number
            },
            'country': {
                'type': String
            },
            'phone_number': {
                'type': Number
            },
            'email': {
                'type': String,
                'unique': true,
                'required': true,
            },
            'image': {
                'type': mongoose.Schema.Types.ObjectId, 'ref': 'media',
            },
            'dralla_wallet_adress': {
                'type': String,
            }
            
        }, { 'timestamps': true } );

        schema.methods.delete = async function() {
            const id = this[ '_id' ];
            
            return mongoose.model( 'userTemp' ).findByIdAndDelete( id );
        };

        schema.plugin( uniqueValidator );
        try {
            mongoose.model( 'userTemp', schema );
        } catch ( e ) {
            
        }

    }


    getInstance() {
        this.initSchema();
        return mongoose.model( 'userTemp' );
    }

    
}

const UserTemp = new UserTempModel().getInstance();

module.exports = { UserTemp, UserTempModel };
