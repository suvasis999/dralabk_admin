const autoBind = require( 'auto-bind' );
const { HttpError } = require('../../system/helpers/HttpError');
const { HttpResponse } = require( '../../system/helpers/HttpResponse' );
const { authService } = require( '../services/AuthService' );
const { userService } = require('../services/UserService');

const bcrypt = require( 'bcrypt' ),
    SALT_WORK_FACTOR = 10;

class AuthController {

    constructor( service ) {
        this.service = service;
        autoBind( this );
    }
    async getToken( req, res, next ) {
        try {
            const response = this.service.getToken();

            return res.status( 200 ).json( new HttpResponse( response ) );
            
        } catch( e ) {
            next( e );
        }
    }
    async login( req, res, next ) {
        try {
            const response = await this.service.login( req.body.email, req.body.password );
            
            await res.status( response.statusCode ).cookie( 'token', response.data.token, { httpOnly: true } ).json( response );
        } catch ( e ) {
            next( e );
        }
    }

    async register( req, res, next ) {
        try {
            let registeredUserData;
            const salt = await bcrypt.genSalt( SALT_WORK_FACTOR);

            const password =  await new Promise( (resolve,reject ) => {
                
                bcrypt.hash( req.body[ 'password'], salt, async( hashErr, hashBuffer ) => {
                if ( hashErr ) {
                     reject( hashErr );
                }
                resolve(hashBuffer)
                })
    
            
            });

            req.body[ 'password'] = password;
            registeredUserData = await this.service.register( req.body );



            await res.status( 200 ).json( registeredUserData );
        } catch ( e ) {
            next( e );
        }
    }


    async changePassword( req, res, next ) {
        try {
            const id = req.user._id;
            const oldPassword = req.body.oldPassword;
            const newPassword = req.body.newPassword;
            const userDoc = await userService.model.findById(req.user._id.toString())
            const salt = await bcrypt.genSalt( SALT_WORK_FACTOR)
            const hashedOldPassword = await bcrypt.hash( oldPassword, salt);

            const isSameOriginalPassword = !oldPassword ? false : await new Promise( ( resolve, reject ) => {
                bcrypt.compare( oldPassword, userDoc.password, ( err, isMatch ) => {
                    if ( err ) {
                        reject( err );
                    } else {
                        resolve( isMatch );
                    }
                } );
            } );

            let isSameTempassword = false;
            if(!isSameOriginalPassword && userDoc.forget_password_token){
            isSameTempassword = !oldPassword ? false : await new Promise( ( resolve, reject ) => {
                bcrypt.compare( oldPassword, userDoc.forget_password_token.token, ( err, isMatch ) => {
                    if ( err ) {
                        reject( err );
                    } else {
                        resolve( isMatch );
                    }
                } );
            } );
        }

            if(isSameOriginalPassword || isSameTempassword ){
                if(!(newPassword && newPassword.length >= 6) ){
                    const error = new HttpError('New password must be stronger');
                    
                    error.statusCode = 422;
                    throw error;
                }
                
                    await bcrypt.hash( newPassword, salt, async( hashErr, hashBuffer ) => {
                        if ( hashErr ) {
                            return next( hashErr );
                        }

                
                    const data = { 'password': hashBuffer, 'forget_password_token': null },
                    response = await this.service.changePassword( id, data );
                    
                    res.status( response.statusCode ).json( response );
                    }
                    )
            
            
            }else{
                const error = new HttpError('Wrong password');
                error.statusCode = 422;
                throw error;
            }
           
            


        } catch ( e ) {
                next( e );
        }
    }

    async logout( req, res, next ) {
        try {
            const response = await this.service.logout( req.token );

            await res.status( response.statusCode ).json( response );
        } catch ( e ) {
            next( e );
        }
    }

    async checkLogin( req, res, next ) {
        try {
            //const token = this.extractToken( req );
            const token = req.cookies.token;

            req.user = await this.service.checkLogin( token );
            req.authorized = true;
            req.token = token;
            next();
        } catch ( e ) {
            next( e );
        }
    }
    async isActive(req,res,next){
        try{
            if(req.user.new_email != '' || req.user.account_status != 'finished' ){
                const error = new HttpError('Forbidden');
                error.statusCode = 403;
                throw error
            }
            next();
        }catch(error){
            next(error);
        }
    }
    async isAdmin( req, res, next ) {
        try {
            // const token = this.extractToken( req );
            const token = req.cookies.token;

            req.user = await this.service.checkLogin( token );
            if( req.user.role != 'admin' ) {
                const error = new Error( 'Forbidden' );

                error.statusCode = 403;
                throw error;
            }
            next();
        } catch ( e ) {
            next( e );
        }
    }
    async isInstructor( req, res, next ) {
        try {
            const token = req.cookies.token;

            req.user = await this.service.checkLogin( token );
            if( req.user.role != 'instructor' && req.user.role != 'admin' ) {
                const error = new Error( 'Unauthorized' );

                error.statusCode = 401;
                throw error;
            }
            next();
        } catch ( e ) {
            next( e );
        }
    }


    extractToken( req ) {
        if ( req.headers.authorization && req.headers.authorization.split( ' ' )[ 0 ] === 'Bearer' ) {
            return req.headers.authorization.split( ' ' )[ 1 ];
        } else if ( req.query && req.query.token ) {
            return req.query.token;
        }
        return null;
    }


}

module.exports = new AuthController( authService );
