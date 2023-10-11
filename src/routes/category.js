'use strict';
const express = require( 'express' ),
    router = express.Router();
const CategoryController = require( '../controllers/CategoryController' );
const AuthController = require( '../controllers/AuthController' );
const { parseSearchParams } = require( '../middlewares/mongooseSearchQueryParsers' );

// Post a new change for user
router.post( '/', AuthController.checkLogin, AuthController.isActive, AuthController.isAdmin, CategoryController.insert );
router.get( '/', AuthController.checkLogin, AuthController.isActive, parseSearchParams, CategoryController.getAll );
router.patch( '/:id', AuthController.checkLogin, AuthController.isActive, AuthController.isAdmin, CategoryController.update );

module.exports = router;
