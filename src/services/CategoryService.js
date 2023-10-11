'use strict';
const { Service } = require( '../../system/services/Service' );
const { Category } = require( '../models/Category' );

class CategoryService extends Service {


    constructor( model ) {
        super( model );
    }


}

const categoryService = new CategoryService( Category );

module.exports = { CategoryService, categoryService };
