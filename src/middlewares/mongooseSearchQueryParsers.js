
// good idea for an open source.

const parseSearchParams = ( req, res, next ) => {

    const queryCopy = { ...req.query };
        
    const sortField = queryCopy.orderBy || '';
    const sortOrder = queryCopy.sort || '';

    const page = queryCopy.page || '';
    const itemsPerPageCount = queryCopy.count || '';

    delete queryCopy.sort;
    delete queryCopy.orderBy;
    delete queryCopy.count;
    delete queryCopy.page;
    delete queryCopy.dummy;
    const requestSearchParamsKeys = Object.keys( queryCopy || {} );

    const searchParams = [];

    for( const key of requestSearchParamsKeys ) {
        const searchParamObject = {};

        searchParamObject[ key ] = queryCopy[key];
        searchParams.push( searchParamObject ) ;

    }

    const mongooseParsedQueries = {};

    mongooseParsedQueries.skip = {};
    mongooseParsedQueries.limit = {};
    mongooseParsedQueries.pagination = {};
    mongooseParsedQueries.and = {};
    mongooseParsedQueries.or = {};
    mongooseParsedQueries.params = {};
    mongooseParsedQueries.sortBy = {};

    if( sortField && sortOrder ) {

        mongooseParsedQueries.sortBy = {};
        mongooseParsedQueries.sortBy [ sortField ] = sortOrder;

    }

    if( itemsPerPageCount && page ) {
        mongooseParsedQueries.pagination = { 'skip': Number( itemsPerPageCount ) * ( Number( page ) - 1 ), 'limit': itemsPerPageCount };
    }
    if( requestSearchParamsKeys.length > 0 ) {
        mongooseParsedQueries.params = searchParams;
        mongooseParsedQueries.and = { '$and': searchParams };
        mongooseParsedQueries.or = { '$or': searchParams };

    }


    req.mongooseParsedQueries = mongooseParsedQueries;

    next( );

};


module.exports = { parseSearchParams };
