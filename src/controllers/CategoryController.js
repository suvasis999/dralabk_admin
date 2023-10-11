const { Controller } = require( '../../system/controllers/Controller' );
const { categoryService } = require( '../services/CategoryService' );
const { HttpResponse } = require( '../../system/helpers/HttpResponse' );
const autoBind = require( 'auto-bind' );

class ChangeController extends Controller {

    constructor( service ) {
        super( service );
        autoBind( this );
    }

    async getAll( req, res, next ) {
        let query = {};
        if(req.mongooseParsedQueries.pagination && req.mongooseParsedQueries.sortBy){
            query = { ...req.mongooseParsedQueries.pagination,'sortBy': { ...req.mongooseParsedQueries.sortBy } } ;

        }

        try {
            const response = await this.service.getAll( query || {} );

            return res.status( 200 ).json( new HttpResponse( response.items.length > 0 ? response.items : [], {'totalCount': response.totalCount || 0 }) );
        }catch( error ) {
            throw error;
        }

    }
}

module.exports = new ChangeController( categoryService ) ;
