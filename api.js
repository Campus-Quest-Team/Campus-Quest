require('express');
require('mongodb');

exports.setApp = function(app, client)
{
    var token = require('./createJWT.js');
    app.post('/api/addcard', async (req, res, next) =>
    {
        // incoming: Card, UserId
        // outgoing: error
        
        const { userId, card, jwtToken } = req.body;

        try
        {
            if(token.isExpired(jwtToken))
            {
                var r = {error:'The JWT is no longer valid', jwtToken:''};
                res.status(200).json(r);
                return;
            }
        }
        catch(e)
        {
            console.log(e.message);
        }

        const newCard = {Card:card, UserId:userId};
        var error = '';

        try
        {
            //database name we're using
            const db = client.db('COP4331Cards');
            const result = db.collection('Cards').insertOne(newCard);
        }
        catch(e)
        {
            error = e.toString();
        }

        var refreshedToken = null;
        try
        {
            refreshedToken = token.refresh(jwtToken);
        }
        catch(e)
        {
            console.log(e.message);
        }

        var ret = { error: error, jwtToken: refreshedToken};
        res.status(200).json(ret);
    });

    app.post('/api/login', async (req, res, next) =>
    {
        // incoming: login, password
        // outgoing: id, firstName, lastName, error

        var error = '';

        const { login, password } = req.body;

        //name of DB we're using
        const db = client.db('COP4331Cards');
        const results = await db.collection('Users').find({Login:login, Password:password}).toArray();

        var id = -1;
        var fn = ''; //firstname
        var ln = ''; //lastname

        if(results.length > 0)
        {
            id = results[0].insertedId;
            fn = results[0].FirstName;
            ln = results[0].LastName;

            try
            {
                const token = require("./createJWT.js");
                ret = token.createToken(fn, ln, id);
            }
            catch(e)
            {
                ret = {error:e.message};
            }
        }
        else
        {
            ret = {error:"Login/Password incorrect"};
        }

        //var ret = { id:id, firstName:fn, lastName:ln, error:'' };
        res.status(200).json(ret);
    });

    app.post('/api/searchcards', async (req, res, next) =>
    {
        // incoming: userId, search, jwtToken
        // outgoing: results[], error

        var error = '';

        const { userId, search, jwtToken } = req.body;

        try
        {
            if(token.isExpired(jwtToken))
            {
                var r = {error:'The JWT is no longer valid', jwtToken: ''};
                res.status(200).json(r);
                return;
            }
        }
        catch(e)
        {
            console.log(e.message);
        }

        var _search = search.trim();

        //database name we're using
        const db = client.db('COP4331Cards');
        const results = await db.collection('Cards').find({"Card":{$regex:_search+'.*',$options:'i'}}).toArray();

        var _ret = [];

        for( var i=0; i < results.length; i++)
        {
            _ret.push(results[i].Card);
        }

        var refreshedToken = null;
        try
        {
            refreshedToken = token.refresh(jwtToken);
        }
        catch(e)
        {
            console.log(e.message);
        }

        var ret = { results:_ret, error:error, jwtToken: refreshedToken };
        res.status(200).json(ret);
    });

    app.post('/api/register', async (req, res, next) =>
    {
        // incoming: login, password, firstName, lastName
        // outgoing: id, firstName, lastName, error

        var error = '';

        const { login, password, firstName, lastName } = req.body;

        const db = client.db('COP4331Cards');

        // Check if user already exists
        const existingUser = await db.collection('Users').find({Login:login}).toArray();

        if(existingUser.length > 0)
        {
            var ret = { id:-1, firstName:'', lastName:'', error:'User already exists' };
            res.status(200).json(ret);
            return;
        }

        try
        {
            // Insert new user
            const newUser = {
                Login: login,
                Password: password,
                FirstName: firstName,
                LastName: lastName
            };

            const result = await db.collection('Users').insertOne(newUser);
            const id = result.insertedId;

            var ret = { userId:id, firstName:firstName, lastName:lastName, error:'' };
            res.status(200).json(ret);
        }
        catch(e)
        {
            var ret = { id:-1, firstName:'', lastName:'', error:e.toString() };
            res.status(200).json(ret);
        }
    });
}