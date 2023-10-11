'use strict';
const express = require( 'express' ),
    router = express.Router();
const QuizController = require( '../controllers/QuizController' );
const AuthController = require( '../controllers/AuthController' );

router.get( '/:id', AuthController.checkLogin, AuthController.isActive, QuizController.get );
router.patch( '/:id', AuthController.checkLogin, AuthController.isActive, QuizController.update );
module.exports = router;
