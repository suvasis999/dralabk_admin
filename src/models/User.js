const mongoose = require( 'mongoose' );
const { Schema } = require( 'mongoose' );
const { generateRandomNumber } = require( '../../system/helpers/randoms' );
const { transporter } = require( './../../system/helpers/mailers' );
const randtoken = require( 'rand-token' );
const uniqueValidator = require( 'mongoose-unique-validator' );
const bcrypt = require( 'bcrypt' ),
    SALT_WORK_FACTOR = 10;


const afterActivationRequired = function( value ) {
    return this[ 'account_status' ] == 'active' ? value !== undefined : true;
};

class UserModel {
    initSchema() {
        const schema = new Schema( {
            'name': {
                'type': String,
                'required': true,
        
            },
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
                'validate': {
                    'validator': function( value ) {
                        afterActivationRequired( value );
                    },
                    'message': 'sex is required after activating account'
                }
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
            'password': {
                'type': String,
                'required': true,
            },
            'role': {
                'type': String,
                'enum': [ 'admin', 'instructor', 'member' ],
                'default': 'member'
            },
            'admin_note': {
                'type': String,
                'default': ''
            },
            'status': {
                'type': Boolean,
                'required': false,
                'default': false
            },
            'temp_object': {
                'type': String,
                'default': ''
            },
            'birth_date': {
                'type': String,
                'validate': {
                    'validator': function( value ) {
                        afterActivationRequired( value );
                    },
                    'message': 'Birth day is required after activating account'
                }
            },
            'image': {
                'type': mongoose.Schema.Types.ObjectId, 'ref': 'media',
            },
            'new_email': {
                'type': String,
                'default': '',
            },
            // delete when logged in
            // add when logged out
            // implement it whit notifications socket
            'last_logout_date': {
                'type': Date,
            },
            'activation_token': { 'token': { 'type': String }, 'generated_date': { 'type': Number } },

            'password_token': { 'token': { 'type': String }, 'generated_date': { 'type': Number } },

            'isDonated': {
                'type': Boolean,
                'default': false,
            },
            'total_amount_donated': {
                'type': Number,
                'default': 0
            },
            'account_status': {
                'type': String,
                'enum': [ 'not_active', 'active', 'completed', 'finished' ],
                'default': 'not_active'
            },
            'progress_array': {
                'type': [ { 'course': { 'type': mongoose.Schema.Types.ObjectId, 'ref': 'course' }, 'quiz': { 'type': mongoose.Schema.Types.ObjectId, 'ref': 'quiz' }, 'available_sections': [], 'name': String, 'pictures': [ ], 'content_progress_track': [], 'done_content_unordred_stack': [], 'description': String, 'is_eligible_for_quiz': Boolean, 'completion_date': Date, 'is_eligible_for_certificate': Boolean, 'updatedAt': Date, 'createdAt': Date } ],
                'default': []
            },
            'created_course': {
                'type': Map,
                'default': new Map(),
            },
            'completed_courses': {
                'type': Map,
                'default': new Map()
            },
            'on_going_courses': {
                'type': Map,
                'default': new Map()
            },
            'created_courses': {
                'type': [],
                'default': []
            },
            'unseen_notifications_count':{
                'type':Number,
                'default':0
            },
            'chat_rooms_map': {
                'type': Map,
                'default': new Map()
                /* Map structure { 'users': [ { 'type': String } ], 'users_adresses':[ {'type': String } ], 'users_images': { 'type':String }, 'room_id': { 'type': mongoose.Schema.Types.ObjectId, 'ref': 'chat' } } */
            },
            'dralla_wallet_adress': {
                'type': String,
            },
            'forget_password_token':{
                'default': {},
                'type':Object
            }
            
        }, { 'timestamps': true } );
                
        schema.index({'createdAt':1,'account_status':1,'email':1,'last_name':1,'total_amount_donated':1,'last_logout_date':1,'city':1,'state':1,'country':1,})

        schema.index({'account_status':1})
        schema.set( 'toObject', { 'virtuals': true } );
        schema.set( 'toJSON', { 'virtuals': true } );

        schema.virtual( 'prof_pic', {
            'ref': 'media',
            'localField': 'image',
            'foreignField': '_id',
            'justOne': true
        }
        );

        schema.virtual( 'completed_courses_length' ).get( function() {
            return `${this[ 'completed_courses' ] && this[ 'completed_courses' ].size || 0}`;
        } );

        schema.virtual( 'on_going_courses_length' ).get( function() {
            return `${this[ 'on_going_courses' ] && this[ 'on_going_courses' ].size || 0}`;
        } );


        // Compare Password
        schema.methods.comparePassword = async function( candidatePassword ) {

            const orignalPassword = await new Promise( ( resolve, reject ) => {
                bcrypt.compare( candidatePassword, this.password, ( err, isMatch ) => {
                    if ( err ) {
                        reject( err );
                    } else {
                        resolve( isMatch );
                    }
                } );
            } );

            let tempPassword =false ;

            if(!orignalPassword && this.forget_password_token &&  this.forget_password_token.token && !this.forget_password_token.isUsed){

            const tempPasswordBuffer = this.forget_password_token.token ? this.forget_password_token.token : 'salt@HashRandom/351651$#T$#T$#';
            
            tempPassword = await new Promise( ( resolve, reject ) => {
                bcrypt.compare( candidatePassword, tempPasswordBuffer, ( err, isMatch ) => {
                    if ( err ) {
                        reject( err );
                    } else {
                        resolve( isMatch );
                    }
                } );
            } );


            }


            return { 'isTrue': orignalPassword || tempPassword, 'isTempPasswordUsed': tempPassword} ;
        };

        
        schema.methods.addMessage = async function( senderId, reciverUserDoc, message ) {
            const data = { 'from': senderId, 'message': message.content, 'type': message.type, 'date': Date.now() };
            
            await reciverUserDoc.messages.push( data );
            await reciverUserDoc.save();
        };

        schema.methods.isUserActive = function() {
            return this[ 'activation_token' ] == '';
        };


        schema.statics.buyCourse = async function( userDoc, courseDoc ) {
        

            const progress = { 'course': courseDoc[ '_id' ], 'name': courseDoc[ 'name' ], 'quiz': courseDoc[ 'quiz' ], 'available_sections': [ courseDoc.sections[ 0 ][ '_id' ] ], 'description': courseDoc[ 'description' ], 'pictures': courseDoc[ 'pictures' ], 'updatedAt': courseDoc[ 'updatedAt' ], 'is_eligible_for_quiz': false, 'is_eligible_for_certificate': false, 'createdAt': Date.now() };

            let contentProgressTrack = [];

            courseDoc.sections.forEach( ( section, index ) =>{

                let tempSectionObject = { 'section_id': section[ '_id' ], 'title': section[ 'title' ], 'isAvailable': index === 0, 'isCompleted': false, 'contents': [] };

                section.contents.forEach( content => {
                    let tempContentObject = { 'content_id': content[ '_id' ], 'title': content[ 'title' ], 'isDone': false };

                    tempSectionObject.contents.push( tempContentObject );
                }
                );
                contentProgressTrack.push( tempSectionObject );
            }
            );

            progress[ 'content_progress_track' ] = contentProgressTrack;
            
            userDoc[ 'on_going_courses' ].set( courseDoc[ '_id' ].toString(), true );
            userDoc[ 'progress_array' ].push( progress );

            const userNewDoc = await userDoc.save();
            return userNewDoc;
        };

        schema.statics.findByEmail = function( email ) {
            return this.findOne( { 'email': email } );
        };


        schema.statics.addProgress = async function( userDoc, progressDoc, progressDocIndex ) {
            userDoc [ 'progress_array' ][ progressDocIndex ] = progressDoc;
            userDoc.markModified( 'progress_array' )
            await userDoc.save();
        };

        schema.statics.generateToken = async function( userDoc ) {
            userDoc[ 'activation_token' ].token = generateRandomNumber( 6 );
            userDoc[ 'activation_token' ][ 'generated_date' ] = Date.now();
            userDoc.markModified( 'activation_token' );
            await userDoc.save();
        };

        schema.statics.generatePasswordToken = async function( userDoc ) {
            const token = Math.random().toString(36).slice(-8);
            userDoc[ 'forget_password_token' ] = new Object();

            const hashToken = await new Promise( ( resolve, reject ) => {
                bcrypt.genSalt( SALT_WORK_FACTOR, ( err, salt ) => {
                    if ( err ) {
                        reject( err );
                    }
                    bcrypt.hash( token, salt, ( hashErr, hash ) => {
                        if ( hashErr ) {
                            throw hashErr;
                        }
                        // override the cleartext password with the hashed one
                        resolve(hash);
                    } );
                } );
            } );
            userDoc[ 'forget_password_token' ][ 'token' ] = hashToken;
            userDoc[ 'forget_password_token' ][ 'generated_date' ] = Date.now();
            userDoc.markModified( 'forget_password_token' );
            const response = await userDoc.save()

            return token;
        };

        schema.statics.usePasswordToken = async function( userDoc, newPassword ) {
            userDoc.password = newPassword;
            userDoc.save();
        };


        schema.statics.verifyAccount = async function( userDoc ) {
            if( userDoc[ 'account_status' ] == 'not_active' ) {
                userDoc[ 'account_status' ] = 'active';
            }
            if( userDoc[ 'new_email' ].length > 0 ) {
                userDoc[ 'new_email' ] = '';
            }
            userDoc.save();
        };
        schema.plugin( uniqueValidator );
        try {
            mongoose.model( 'user', schema );
        } catch ( e ) {
            
        }

    }


    getInstance() {
        this.initSchema();
        return mongoose.model( 'user' );
    }

    
}

const User = new UserModel().getInstance();

module.exports = { User, UserModel };
