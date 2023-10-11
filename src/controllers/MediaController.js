const { Controller } = require( '../../system/controllers/Controller' );
const { mediaService } = require( './../services/MediaService' );
const { HttpResponse } = require( './../../system/helpers/HttpResponse' );
const autoBind = require( 'auto-bind' );
const multer = require( 'multer' );
const fs = require( 'fs' );
const utils = require( '../../system/helpers/Utility' ),
    config = require( '../../config/config' ).getConfig();
    
class MediaController extends Controller {

    // file upload using multer
    storage = multer.diskStorage( {
        'destination': function( req, file, cb ) {
            const dir = config.UPLOAD_PATH;

            fs.exists( dir, ( exist ) => {
                if ( !exist ) {
                    return fs.mkdir( dir, ( error ) => cb( error, dir ) );
                }
                return cb( null, dir );
            } );
        },
        'filename': function( req, file, cb ) {
            const fileOriginalName = utils.slugify( file.originalname );

            cb( null, `${( new Date() ).getTime() }-${ fileOriginalName}` );
        }
    } );

    fileFilter = ( req, file, cb ) => {
        // reject a file
        if ( file.mimetype === 'image/jpeg' || file.mimetype === 'image/png' || file.mimetype === 'image/gif' ) {
            cb( null, true );
        } else {
            cb( null, false );
        }
    };

    upload = multer( {
        'storage': this.storage,
        'limits': {
            'fileSize': 1024 * 1024 * 5
        },
        'fileFilter': this.fileFilter
    } );

    constructor( service ) {
        super( service );
        autoBind( this );
    }

    async insert( req, res, next ) {
        try {
            const data = req.file;
            
            //await this.service.deleteUnlinkedUserItems( req.user._id.toString() );
            data[ 'uploader_id' ] = req.user._id.toString();

            
            const response = await this.service.insert( data );

            return res.status( 200 ).json( new HttpResponse( response ) );
        } catch ( e ) {
            next( e );
        }
    }


    async insertAttach(req,res,next){
        try {
            const data = req.file;
            
            data[ 'uploader_id' ] = req.user._id.toString();
            data[ 'type' ] = 'attachment';
            
            const response = await this.service.insert( data );

            return response;
        } catch ( e ) {
            next( e );
        }
    }
    
    async delete( req, res, next ) {
        const { id } = req.params;

        try {
            const response = await this.service.delete( id );

            return res.status( 200 ).json( new HttpResponse( response ) );
        } catch ( e ) {
            next( e );
        }
    }

}

module.exports = new MediaController( mediaService );
