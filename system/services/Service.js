'use strict';
const mongoose = require( 'mongoose' );
const autoBind = require( 'auto-bind' );
const { HttpResponse } = require( '../helpers/HttpResponse' );

class Service {

    
    constructor( model ) {
        this.model = model;
        autoBind( this );
    }

    async getAll( query ) {

        let { skip, limit, sortBy, projection } = query;

        skip = skip ? Number( skip ) : 0;
        limit = limit ? Number( limit ) : 0;
        sortBy = sortBy ? sortBy : { 'createdAt': -1 };
        projection = projection ? projection : {};


        delete query.projection;
        delete query.skip;
        delete query.limit;
        delete query.sortBy;


        if ( query._id ) {
            try {
                query._id = new mongoose.mongo.ObjectId( query._id );
            } catch ( error ) {
                throw new Error( 'Not able to generate mongoose id with content' );
            }
        }

        try {
            const items = await this.model
                    .find( query, projection )
                    .sort( sortBy )
                    .skip( skip )
                    .limit( limit ),
                total = await this.model.countDocuments( query );

            return { 'items': items, 'totalCount': total };
        } catch ( errors ) {
            throw errors;
        }
    }


    async get( id, query = {} ) {
        try {
            let { projection, search } = query;

            search = search ? search : {};

            projection = projection ? projection : {};
            const item = await this.model.findById( { '_id': id, ...search }, projection );

            if ( !item ) {
                const error = new Error( 'Item not found' );

                error.statusCode = 404;
                throw error;
            }

            return item;
        } catch ( errors ) {
            throw errors;
        }
    }

    async getBy( query = {} ) {
        try {
            let { projection, search } = query;

            search = query ? search : {};
            projection = projection ? projection : {};

            const item = await this.model.findOne( { ...search }, projection );

            if ( !item ) {
                const error = new Error( 'Item not found' );

                error.statusCode = 404;
                throw error;
            }

            return item;
        } catch ( errors ) {
            throw errors;
        }
    }


    async insert( data ) {
        try {
            const item = await this.model.create( data );

            if ( item ) {
                return item;
            }
            throw new Error( 'Something wrong happened' );
            
        } catch ( error ) {
            throw error;
        }
    }

    async update( id, data ) {
        try {
            const item = await this.model.findByIdAndUpdate( id, data, { 'new': true, 'runValidators': true, 'context': 'query' } );

            return item ;
        } catch ( errors ) {
            throw errors;
        }
    }

    async updateArray( id, arrayFieldName, itemToAdd, customUpdate = null ) {
        try {
            const subDocElement = {};

            subDocElement[ arrayFieldName ] = itemToAdd;
            let update = { '$push': subDocElement };

            update = {
                ...update, ...( customUpdate != null && { ...customUpdate } )
            };

            const item = await this.model.findByIdAndUpdate(
                mongoose.Types.ObjectId( id ),
                update,
                { 'new': true, 'upsert': true }

            );
                
            return item;
        } catch ( errors ) {
            throw errors;
        }
    }
    
    async delete( id ) {
        try {
            const item = await this.model.findByIdAndDelete( id );

            if ( !item ) {
                const error = new Error( 'Item not found' );

                error.statusCode = 404;
                throw error;
            } else {
                return new HttpResponse( item, { 'deleted': true } );
            }
        } catch ( errors ) {
            throw errors;
        }
    }
}

module.exports = { Service };
