'use strict';
const AUthController = require( '../controllers/AuthController' );
const express = require( 'express' ),
    router = express.Router();

router.post( '/login', AUthController.login );
router.get( '/logout', AUthController.checkLogin, AUthController.logout );
router.post( '/register', AUthController.register );
router.get( '/', AUthController.getToken );
router.patch( '/changePassword', AUthController.checkLogin, AUthController.changePassword );
module.exports = router;
