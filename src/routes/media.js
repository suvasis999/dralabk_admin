'use strict';
const MediaController = require( '../controllers/MediaController' );
const multer = require("multer");



const express = require( 'express' ),
    router = express.Router();
const AuthController = require( '../controllers/AuthController' );
const { HttpResponse } = require('../../system/helpers/HttpResponse');
const fs = require( 'fs' );
const utils = require( '../../system/helpers/Utility' ),
    config = require( '../../config/config' ).getConfig();

router.get( '/:id', AuthController.checkLogin, MediaController.get );
router.post( '/', [ AuthController.checkLogin, MediaController.upload.single( 'photo' ) ], MediaController.insert );
router.delete( '/:id', AuthController.checkLogin, MediaController.delete );

  
  const storage = multer.diskStorage( {
    'destination': function( req, file, cb ) {
        const dir = `${config.UPLOAD_PATH}/attachments/`;

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

  const upload = multer({ storage });
  
  router.post("/attachments", AuthController.checkLogin, AuthController.isActive, upload.single("avatar"), async function(req, res, next) {
    console.log(req.file);
    if (req.file) {
     const response = await MediaController.insertAttach(req,res,next);
     return  res.status( 200 ).json( new HttpResponse( response ) );
    }
    return res.status(400).json({ msg: "PLEASE UPLOAD FILE" });
  });


module.exports = router;

