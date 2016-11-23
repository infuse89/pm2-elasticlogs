const elasticsearch = require('elasticsearch');

class ElasticLib {
    constructor(host, index){
        this.elasticClient = new elasticsearch.Client({
            host: host || 'http://localhost:9200',
        });
        this.index = index || 'logs';
        this.types = ['logs'];
        this.createIndex();
    }

    createIndex(){
        /**
         * Create index and mapping if index no exist
         */
        return this.elasticClient.indices.exists({index:this.index})
            .then(responseExist => {
                if(responseExist === true)
                    return;
                return this.elasticClient.indices.create({
                    index: this.index
                }).then(() => {
                    return Promise.all(this.types.map(type => {
                        return this.existType(type)
                            .then(response => {
                                if(response === false)
                                    return this.createType(type);
                                return;
                            })
                    }));
                });
            }).catch(error => {
                console.log(error);
            });
    }

    /**
     * Check exist type
     */
    existType (type){
        return this.elasticClient.indices.existsType({index:this.index, type : type});
    }

    /**
     * Create type
     * @param name
     * @returns {*}
     */
    createType(name){
        let body = {
            "_routing" : {
                "required": false
            },
            properties:{
                added  : { "type" : "date" },
            }
        }
        return this.elasticClient.indices.putMapping({index: this.index, type: name, body: body});
    }

    /**
     * Create fields to search
     * @param type
     * @param id
     * @param body
     * @param cb
     */
    add(body, type='logs') {
        body.added = new Date();
        return this.elasticClient.index({
            index: this.index,
            type: type,
            body: body
        });
    }
}

module.exports = ElasticLib;