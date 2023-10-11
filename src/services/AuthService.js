'use strict';
const autoBind = require( 'auto-bind' );
const { HttpResponse } = require( '../../system/helpers/HttpResponse' );
const mongoose = require( 'mongoose' );
const { Auth } = require( '../models/Auth' );
const { userService } = require( '../services/UserService' );
const { LoginStats } = require( '../models/Login' );

class AuthService {

    constructor( model, userServiceDependency ) {
        this.model = model;
        this.userService = userServiceDependency;
        autoBind( this );
    }

    /**
     *
     * @param email: String
     * @param password: String
     * @returns {Promise<any>}
     */
    async login( email, password ) {
        const user = await this.userService.findByEmail( email, true );

        if ( !user ) {
            // User not found
            const error = new Error( 'Invalid Email' );

            error.statusCode = 422;
            throw error;
        } else {
            // Process Login
            try {
                // Check Password
                const passwordCheck = await user.comparePassword( password );

                const passwordMatched  = passwordCheck.isTrue;

                if ( !passwordMatched ) {
                    const error = new Error( 'Invalid Password' );

                    error.statusCode = 422;
                    throw error;
                }
                const token = await this.model.generateToken( user );

                await this.model.create( { token, 'user': new mongoose.mongo.ObjectId( user._id ) } );
                const tokenData = await this.model.findOne( { 'token': token } ).populate({
                    path: 'user',
                    // Get friends of friends - populate the 'friends' array for every friend
                    populate: { 
                        select: { 'filename': 1},
                        path: 'prof_pic', }
                });

                if(passwordCheck.isTempPasswordUsed){
                    user['forget_password_token'].isUsed = true;
                }

                user.status = true;
                user.markModified('status');
                user.markModified('forget_password_token');
                user.save();
                LoginStats.create( { 'random_field': true } );
                return new HttpResponse( tokenData );
            } catch ( e ) {
                throw e;
            }

        }
    }

    async register( data ) {
        try {
            let dataBuffer = {};
            let props = ["name","middle_name","last_name","email", "password" ];

            for(const prop of props) {
                dataBuffer[prop] = data[prop];
            } 

            return await this.userService.insert( dataBuffer );
        } catch ( error ) {
            throw error;
        }
    }

    async changePassword( id, data ) {
        try {
            const updatedPassword = await this.userService.updatePassword( id, data );

            return new HttpResponse( updatedPassword );
        } catch ( error ) {
            throw error;
        }
    }

    async logout( token ) {
        try {
            const user = await this.model.decodeToken( token );
            const userFromDb = await this.userService.findById( user._id, false );

            userFromDb.status = false;
            userFromDb.save();
            await this.model.deleteOne( { token } );

            return new HttpResponse( { 'logout': true } );
        } catch ( error ) {
            throw error;
        }
    }

    async getToken( token ) {

        try{

            const tokenInDB = await this.model.countDocuments( { token } );

            return tokenInDB;
        }catch( error ) {

        }

    }
    async checkLogin( token ) {
        try {
            // Check if the token is in the Database
            const tokenInDB = await this.model.countDocuments( { token } );

            if ( !tokenInDB ) {
                const error = new Error( 'Invalid Token' );

                error.statusCode = 401;
                throw error;
            }
            // Check the token is a valid JWT
            const user = await this.model.decodeToken( token );

            if ( !user ) {
                const error = new Error( 'Invalid Token' );

                error.statusCode = 401;
                throw error;
            }
            // Check the Extracted user is active in DB
            const userFromDb = await this.userService.get( user._id );


            if ( userFromDb ) {
                return userFromDb;
            }
            const error = new Error( 'Invalid Token' );

            error.statusCode = 401;
            throw error;
            
        } catch ( e ) {
            const error = new Error( 'Invalid Token' );

            error.statusCode = 401;
            throw error;
        }
    }

}

const authService = new AuthService( Auth, userService );

module.exports = { AuthService, authService };
